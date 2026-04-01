import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, API_URL } from '../services/apiClient';
import { fetchLabels, type Label } from '../services/labelsService';
import Amount from '../components/Amount';

// Utility function for handling Ctrl+click to open in new tab
const handleCtrlClick = (e: React.MouseEvent, url: string) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        window.open(url, '_blank');
    } else {
        // Normal navigation
        window.location.href = url;
    }
};

interface LabelLink {
    id: string;
    name: string;
    isManual: boolean;
    isArchived: boolean;
}

interface Transfer {
    id: string;
    amount: string;
    date: string;
    fromAccountId: string | null;
    fromAccountNumber: string | null;
    fromAccountName: string | null;
    toAccountId: string | null;
    toAccountNumber: string | null;
    toAccountName: string | null;
    reference: string;
    csvSource: string;
    transactionId: string | null;
    isInternal: boolean;
    labelIds: string[];
    labelNames: string[];
    labelLinks: LabelLink[];
}

/**
 * T019/T022 [US2]: Transfer detail page.
 * - Shows full transfer information
 * - Shows assigned labels (manual and automatic)
 * - T022: Allows adding labels manually (with duplicate prevention — T026)
 * - Allows removing manually assigned labels
 */
const TransferDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedLabelId, setSelectedLabelId] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [removingLabelId, setRemovingLabelId] = useState<string | null>(null);
    const [archivingLabelId, setArchivingLabelId] = useState<string | null>(null);

    // Quick-create label modal
    const [showCreateLabel, setShowCreateLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [creatingLabel, setCreatingLabel] = useState(false);
    const [createLabelError, setCreateLabelError] = useState<string | null>(null);

    const loadTransfer = useCallback(async () => {
        if (!accessToken || !id) return;
        try {
            const data = await apiGet<Transfer>(`/api/transfers/${id}`, accessToken);
            setTransfer(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transfer');
        }
    }, [id, accessToken]);

    const loadData = useCallback(async () => {
        if (!accessToken || !id) return;
        setLoading(true);
        setError(null);
        try {
            const [transferData, labelsData] = await Promise.all([
                apiGet<Transfer>(`/api/transfers/${id}`, accessToken),
                fetchLabels(accessToken),
            ]);
            setTransfer(transferData);
            setAllLabels(labelsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transfer');
        } finally {
            setLoading(false);
        }
    }, [id, accessToken]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleAssignLabel = async () => {
        if (!accessToken || !id || !selectedLabelId) return;

        // T026: Check for duplicate (already assigned)
        if (transfer?.labelLinks.some((l) => l.id === selectedLabelId)) {
            setAssignError('This label is already assigned to this transfer.');
            return;
        }

        setAssigning(true);
        setAssignError(null);
        try {
            const response = await fetch(`${API_URL}/api/transfers/${id}/labels/${selectedLabelId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                const err = (await response.json()) as { detail?: string };
                setAssignError(err.detail ?? 'Failed to assign label');
                return;
            }

            setSelectedLabelId('');
            await loadTransfer();
        } catch (err) {
            setAssignError(err instanceof Error ? err.message : 'Failed to assign label');
        } finally {
            setAssigning(false);
        }
    };

    const handleRemoveLabel = async (labelId: string) => {
        if (!accessToken || !id) return;
        setRemovingLabelId(labelId);
        try {
            const response = await fetch(`${API_URL}/api/transfers/${id}/labels/${labelId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                setError('Failed to remove label');
                return;
            }

            await loadTransfer();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove label');
        } finally {
            setRemovingLabelId(null);
        }
    };

    const handleCreateLabel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !newLabelName.trim()) return;
        setCreatingLabel(true);
        setCreateLabelError(null);
        try {
            const response = await fetch(`${API_URL}/api/labels`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    name: newLabelName.trim(),
                    parentLabelId: null,
                    linkedBankAccountIds: [],
                    linkedRegexes: [],
                    maxValue: null,
                    maxPercentage: null,
                }),
            });
            if (!response.ok) {
                const err = (await response.json()) as { detail?: string };
                throw new Error(err.detail ?? 'Failed to create label');
            }
            const created = (await response.json()) as { id: string; name: string };
            // Refresh label list and auto-select the new label
            const labelsData = await fetchLabels(accessToken);
            setAllLabels(labelsData);
            setSelectedLabelId(created.id);
            setNewLabelName('');
            setShowCreateLabel(false);
        } catch (err) {
            setCreateLabelError(err instanceof Error ? err.message : 'Failed to create label');
        } finally {
            setCreatingLabel(false);
        }
    };

    const handleArchiveLabel = async (labelLinkId: string) => {
        if (!accessToken) return;
        
        setArchivingLabelId(labelLinkId);
        try {
            const response = await fetch(`${API_URL}/api/label-transfer-links/${labelLinkId}/archive`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            
            if (!response.ok) {
                const err = (await response.json()) as { detail?: string };
                throw new Error(err.detail ?? 'Failed to archive label');
            }
            
            // Refresh transfer data to show updated state
            await loadTransfer();
        } catch (err) {
            console.error('Failed to archive label:', err);
        } finally {
            setArchivingLabelId(null);
        }
    };

    const handleUnarchiveLabel = async (labelLinkId: string) => {
        if (!accessToken) return;
        
        setArchivingLabelId(labelLinkId);
        try {
            const response = await fetch(`${API_URL}/api/label-transfer-links/${labelLinkId}/unarchive`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            
            if (!response.ok) {
                const err = (await response.json()) as { detail?: string };
                throw new Error(err.detail ?? 'Failed to unarchive label');
            }
            
            // Refresh transfer data to show updated state
            await loadTransfer();
        } catch (err) {
            console.error('Failed to unarchive label:', err);
        } finally {
            setArchivingLabelId(null);
        }
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12" role="status">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
                <span className="text-gray-600">Loading transfer...</span>
            </div>
        );
    }

    if (error || !transfer) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm" role="alert">
                    {error ?? 'Transfer not found.'}
                </div>
                <button
                    onClick={() => navigate('/transfers')}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    ← Back to Transfers
                </button>
            </div>
        );
    }

    // Labels available to add (exclude already-assigned ones)
    const assignedLabelIds = new Set(transfer.labelLinks.map((l) => l.id));
    const availableLabels = allLabels.filter((l) => !assignedLabelIds.has(l.id));

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-3">
                    <button
                        onClick={() => navigate('/transfers')}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                        ← Transfers
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Transfer Detail</h1>
                        <p className="text-sm text-gray-500 mt-1 font-mono">{formatDate(transfer.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount</p>
                        <Amount amount={transfer.amount} className="text-2xl" />
                    </div>
                </div>

                {/* Transfer details grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</p>
                        {transfer.fromAccountId ? (
                            <button
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        window.open(`/accounts/${transfer.fromAccountId ?? ''}`, '_blank');
                                    } else {
                                        navigate(`/accounts/${transfer.fromAccountId ?? ''}`);
                                    }
                                }}
                                className="text-left hover:text-blue-600"
                            >
                                <p className="text-sm font-medium hover:underline">
                                    {transfer.fromAccountName ?? '—'}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                    {transfer.fromAccountNumber ?? '—'}
                                </p>
                            </button>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-gray-800">
                                    {transfer.fromAccountName ?? '—'}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                    {transfer.fromAccountNumber ?? '—'}
                                </p>
                            </>
                        )}
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">To</p>
                        {transfer.toAccountId ? (
                            <button
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        window.open(`/accounts/${transfer.toAccountId ?? ''}`, '_blank');
                                    } else {
                                        navigate(`/accounts/${transfer.toAccountId ?? ''}`);
                                    }
                                }}
                                className="text-left hover:text-blue-600"
                            >
                                <p className="text-sm font-medium hover:underline">
                                    {transfer.toAccountName ?? '—'}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                    {transfer.toAccountNumber ?? '—'}
                                </p>
                            </button>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-gray-800">
                                    {transfer.toAccountName ?? '—'}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                    {transfer.toAccountNumber ?? '—'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reference</p>
                        <p className="text-sm text-gray-800">{transfer.reference || '—'}</p>
                    </div>

                    {transfer.transactionId && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transaction ID</p>
                            <p className="text-sm text-gray-700 font-mono">{transfer.transactionId}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                        <p className="text-sm text-gray-800">
                            {transfer.isInternal ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                                    Internal transfer
                                </span>
                            ) : (
                                'External'
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Labels ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Labels</h2>

                {/* Assigned labels */}
                {transfer.labelLinks.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-4">No labels assigned yet.</p>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {transfer.labelLinks.map((link) => (
                            <div
                                key={link.id}
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                    link.isArchived
                                        ? 'bg-gray-100 text-gray-600 line-through'
                                        : link.isManual
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}
                            >
                                <button
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                            e.preventDefault();
                                            window.open(`/labels/${link.id}`, '_blank');
                                        } else {
                                            navigate(`/labels/${link.id}`);
                                        }
                                    }}
                                    className="hover:underline"
                                    title="View label"
                                >
                                    {link.isArchived ? '📦 ' : link.isManual ? '🖊 ' : '⚙ '}
                                    {link.name}
                                </button>
                                {link.isManual && (
                                    <button
                                        onClick={() => void handleRemoveLabel(link.id)}
                                        disabled={removingLabelId === link.id}
                                        aria-label={`Remove label ${link.name}`}
                                        className="ml-1 opacity-60 hover:opacity-100 font-bold text-lg leading-none"
                                    >
                                        {removingLabelId === link.id ? '…' : '×'}
                                    </button>
                                )}
                                {!link.isManual && (
                                    <button
                                        onClick={() => link.isArchived 
                                            ? void handleUnarchiveLabel(link.id)
                                            : void handleArchiveLabel(link.id)
                                        }
                                        disabled={archivingLabelId === link.id}
                                        aria-label={link.isArchived 
                                            ? `Unarchive label ${link.name}`
                                            : `Archive label ${link.name}`
                                        }
                                        className="ml-1 opacity-60 hover:opacity-100 font-bold text-lg leading-none"
                                        title={link.isArchived 
                                            ? 'Unarchive this label to allow re-assignment'
                                            : 'Archive this label to prevent re-assignment'
                                        }
                                    >
                                        {archivingLabelId === link.id ? '…' : link.isArchived ? '↩' : '📦'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* T022: Add label form */}
                <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Add label manually:</p>
                    {assignError && (
                        <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
                            {assignError}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <select
                            value={selectedLabelId}
                            onChange={(e) => {
                                setSelectedLabelId(e.target.value);
                                setAssignError(null);
                            }}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Select label to add"
                        >
                            <option value="">— Select a label —</option>
                            {availableLabels.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                    {l.parentLabelName ? ` (${l.parentLabelName})` : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => void handleAssignLabel()}
                            disabled={!selectedLabelId || assigning}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {assigning ? 'Adding…' : 'Add'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowCreateLabel((v) => !v); setCreateLabelError(null); }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                            title="Create a new label"
                        >
                            + New
                        </button>
                    </div>

                    {/* Quick-create label inline form */}
                    {showCreateLabel && (
                        <form
                            onSubmit={(e) => void handleCreateLabel(e)}
                            className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2"
                        >
                            <p className="text-xs font-medium text-gray-600">Quick-create a new label:</p>
                            {createLabelError && (
                                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{createLabelError}</p>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newLabelName}
                                    onChange={(e) => setNewLabelName(e.target.value)}
                                    required
                                    placeholder="Label name…"
                                    autoFocus
                                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="New label name"
                                />
                                <button
                                    type="submit"
                                    disabled={creatingLabel || !newLabelName.trim()}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors"
                                >
                                    {creatingLabel ? 'Creating…' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateLabel(false); setNewLabelName(''); setCreateLabelError(null); }}
                                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">You can add bank accounts and regex patterns on the label detail page later.</p>
                        </form>
                    )}

                    {availableLabels.length === 0 && transfer.labelLinks.length > 0 && !showCreateLabel && (
                        <p className="mt-2 text-xs text-gray-500">All available labels have been assigned.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransferDetailPage;

