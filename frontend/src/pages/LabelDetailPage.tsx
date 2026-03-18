import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchLabel,
    fetchLabelTransfers,
    updateLabel,
    deleteLabel,
    type Label,
    type LabelTransfer,
} from '../services/labelsService';
import { fetchLabels } from '../services/labelsService';
import { fetchBankAccounts } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';
import Amount from '../components/Amount';
import { ActionBar } from '../components/ActionBar';
import type { TransferFilters } from '../components/ActionBar';

const EMPTY_FILTERS: TransferFilters = { search: '', dateFrom: '', dateTo: '', labelIds: [] };

/**
 * T018/T021 [US2]: Label detail page.
 * - Shows label info, linked bank accounts, regex patterns
 * - Lists all transfers linked to this label
 * - Edit label inline
 * - Delete label with confirmation (T027: transfers are NOT deleted)
 */
const LabelDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [label, setLabel] = useState<Label | null>(null);
    const [transfers, setTransfers] = useState<LabelTransfer[]>([]);
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transferFilters, setTransferFilters] = useState<TransferFilters>(EMPTY_FILTERS);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editParentLabelId, setEditParentLabelId] = useState('');
    const [editLinkedBankAccountIds, setEditLinkedBankAccountIds] = useState<string[]>([]);
    const [editLinkedRegexes, setEditLinkedRegexes] = useState<string[]>([]);
    const [editRegexInput, setEditRegexInput] = useState('');
    const [editMaxValue, setEditMaxValue] = useState('');
    const [editMaxPercentage, setEditMaxPercentage] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Delete state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const loadData = useCallback(async () => {
        if (!accessToken || !id) return;
        setLoading(true);
        setError(null);
        try {
            const [labelData, transfersData, labelsData, bankAccountsData] = await Promise.all([
                fetchLabel(id, accessToken),
                fetchLabelTransfers(id, accessToken).catch(() => [] as LabelTransfer[]),
                fetchLabels(accessToken),
                fetchBankAccounts(accessToken),
            ]);
            setLabel(labelData);
            setTransfers(transfersData);
            setAllLabels(labelsData);
            setBankAccounts(bankAccountsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load label');
        } finally {
            setLoading(false);
        }
    }, [id, accessToken]);

    const loadFilteredTransfers = useCallback(async (f: TransferFilters) => {
        if (!accessToken || !id) return;
        setLoadingTransfers(true);
        try {
            const data = await fetchLabelTransfers(id, accessToken, {
                search: f.search || undefined,
                dateFrom: f.dateFrom || undefined,
                dateTo: f.dateTo || undefined,
            });
            setTransfers(data);
        } catch {
            // keep previous results on error
        } finally {
            setLoadingTransfers(false);
        }
    }, [id, accessToken]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Reload transfers whenever filters change (loadData handles the initial unfiltered load)
    useEffect(() => {
        void loadFilteredTransfers(transferFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transferFilters]);

    const openEdit = () => {
        if (!label) return;
        setEditName(label.name);
        setEditParentLabelId(label.parentLabelId ?? '');
        setEditLinkedBankAccountIds(label.linkedBankAccountIds);
        setEditLinkedRegexes(label.linkedRegexes);
        setEditRegexInput('');
        setEditMaxValue(label.maxValue ?? '');
        setEditMaxPercentage(label.maxPercentage ?? '');
        setFormError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setFormError(null);
    };

    const addRegex = () => {
        const trimmed = editRegexInput.trim();
        if (trimmed && !editLinkedRegexes.includes(trimmed)) {
            setEditLinkedRegexes((prev) => [...prev, trimmed]);
            setEditRegexInput('');
        }
    };

    const removeRegex = (regex: string) => {
        setEditLinkedRegexes((prev) => prev.filter((r) => r !== regex));
    };

    const toggleBankAccount = (baId: string) => {
        setEditLinkedBankAccountIds((prev) =>
            prev.includes(baId) ? prev.filter((x) => x !== baId) : [...prev, baId],
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !id || !editName.trim()) {
            setFormError('Label name is required.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const updated = await updateLabel(
                id,
                {
                    name: editName.trim(),
                    parentLabelId: editParentLabelId || null,
                    linkedBankAccountIds: editLinkedBankAccountIds,
                    linkedRegexes: editLinkedRegexes,
                    maxValue: editMaxValue || null,
                    maxPercentage: editMaxPercentage || null,
                },
                accessToken,
            );
            setLabel(updated);
            setIsEditing(false);
            void loadData(); // Reload all (which also resets transfers to unfiltered)
            if (transferFilters.search || transferFilters.dateFrom || transferFilters.dateTo) {
                void loadFilteredTransfers(transferFilters);
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save label');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!accessToken || !id) return;
        setDeleting(true);
        try {
            await deleteLabel(id, accessToken);
            navigate('/labels');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete label');
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

    const getBankAccountName = (baId: string) => {
        const ba = bankAccounts.find((b) => b.id === baId);
        return ba ? `${ba.accountName ?? '—'} (${ba.accountNumber ?? '—'})` : baId;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12" role="status">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
                <span className="text-gray-600">Loading label...</span>
            </div>
        );
    }

    if (error || !label) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm" role="alert">
                    {error ?? 'Label not found.'}
                </div>
                <button
                    onClick={() => navigate('/labels')}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    ← Back to Labels
                </button>
            </div>
        );
    }

    const parentOptions = allLabels.filter((l) => l.id !== id);

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-1">
                    <button
                        onClick={() => navigate('/labels')}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                        ← Labels
                    </button>
                </div>

                {!isEditing ? (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">{label.name}</h1>
                                {label.parentLabelName && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Child of{' '}
                                        <button
                                            onClick={() => navigate(`/labels/${label.parentLabelId ?? ''}`)}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {label.parentLabelName}
                                        </button>
                                    </p>
                                )}
                                {(label.maxValue ?? label.maxPercentage) && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {label.maxValue && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                                max €{label.maxValue}
                                            </span>
                                        )}
                                        {label.maxPercentage && (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                max {label.maxPercentage}%
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={openEdit}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Linked bank accounts */}
                        {label.linkedBankAccountIds.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    Linked Bank Accounts
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {label.linkedBankAccountIds.map((baId) => (
                                        <span
                                            key={baId}
                                            className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                                        >
                                            🏦 {getBankAccountName(baId)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regex patterns */}
                        {label.linkedRegexes.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    Auto-match Patterns
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {label.linkedRegexes.map((regex) => (
                                        <span
                                            key={regex}
                                            className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono"
                                        >
                                            {regex}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* ── Edit form ──────────────────────────────────────── */
                    <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">Edit Label</h2>
                        {formError && (
                            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm" role="alert">
                                {formError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Parent Label (optional)
                            </label>
                            <select
                                value={editParentLabelId}
                                onChange={(e) => setEditParentLabelId(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">— No parent —</option>
                                {parentOptions.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {bankAccounts.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Linked Bank Accounts
                                </label>
                                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                                    {bankAccounts.map((ba) => (
                                        <label key={ba.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editLinkedBankAccountIds.includes(ba.id)}
                                                onChange={() => toggleBankAccount(ba.id)}
                                            />
                                            <span>
                                                {ba.accountName}{' '}
                                                <span className="text-gray-500">({ba.accountNumber})</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Regex Patterns
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={editRegexInput}
                                    onChange={(e) => setEditRegexInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addRegex();
                                        }
                                    }}
                                    placeholder="/NETFLIX/i"
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={addRegex}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-3 rounded text-sm"
                                >
                                    Add
                                </button>
                            </div>
                            {editLinkedRegexes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {editLinkedRegexes.map((regex) => (
                                        <span
                                            key={regex}
                                            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                        >
                                            <code>{regex}</code>
                                            <button
                                                type="button"
                                                onClick={() => removeRegex(regex)}
                                                className="text-red-500 hover:text-red-700 font-bold"
                                                aria-label={`Remove regex ${regex}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Value (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editMaxValue}
                                    onChange={(e) => setEditMaxValue(e.target.value)}
                                    placeholder="e.g. 200.00"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Percentage (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editMaxPercentage}
                                    onChange={(e) => setEditMaxPercentage(e.target.value)}
                                    placeholder="e.g. 10.00"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors"
                            >
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* ── Linked Transfers ────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Linked Transfers{' '}
                            <span className="text-gray-400 text-sm font-normal">({transfers.length})</span>
                        </h2>
                        {transfers.length > 0 && (() => {
                            const amounts = transfers.map((t) => parseFloat(t.amount));
                            const totalIn  = amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0);
                            const totalOut = amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0);
                            const net = totalIn + totalOut;
                            const fmtNet = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${Math.abs(n).toFixed(2)}`;
                            return (
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-green-600 font-medium">In: +{totalIn.toFixed(2)}</span>
                                    <span className="text-red-600 font-medium">Out: −{Math.abs(totalOut).toFixed(2)}</span>
                                    <span className={`font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        Net: {fmtNet(net)}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Action bar: search + date range */}
                <ActionBar
                    filters={transferFilters}
                    onFiltersChange={setTransferFilters}
                />

                <div>
                    {loadingTransfers ? (
                        <div className="flex items-center gap-2 px-6 py-4 text-gray-500 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                            Loading transfers…
                        </div>
                    ) : transfers.length === 0 ? (
                        <p className="px-6 py-8 text-center text-gray-500 text-sm">
                            {transferFilters.search || transferFilters.dateFrom || transferFilters.dateTo
                                ? 'No transfers match the current filters.'
                                : 'No transfers linked to this label yet.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Linked transfers">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From → To</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {transfers.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => navigate(`/transfers/${t.id}`)}
                                        >
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                {formatDate(t.date)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                                                {t.reference || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 text-xs">
                                                <span>{t.fromAccountName ?? t.fromAccountNumber ?? '—'}</span>
                                                <span className="mx-1 text-gray-400">→</span>
                                                <span>{t.toAccountName ?? t.toAccountNumber ?? '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Amount amount={t.amount} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Delete confirmation dialog ──────────────────────────────── */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-label-title"
                >
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 id="delete-label-title" className="text-lg font-semibold text-gray-800 mb-2">
                            Delete Label
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                            Are you sure you want to delete <strong>{label.name}</strong>?
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            The label will be removed from all linked transfers, but the transfers themselves
                            will not be deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => void handleDelete()}
                                disabled={deleting}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors"
                            >
                                {deleting ? 'Deleting…' : 'Delete Label'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors"
                                autoFocus
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabelDetailPage;

