import React, { useCallback, useEffect, useState } from 'react';
import {
    fetchBankAccount,
    fetchBankAccountTransfers,
    updateBankAccount,
} from '../services/bankAccountsService';
import type { BankAccount, BankAccountTransfer } from '../services/bankAccountsService';
import { fetchLabels } from '../services/labelsService';
import type { Label } from '../services/labelsService';
import { useAuth } from '../contexts/AuthContext';
import Amount from '../components/Amount';
import { ActionBar } from '../components/ActionBar';
import type { TransferFilters, LabelOption, BulkAction } from '../components/ActionBar';
import { useNavigate } from 'react-router-dom';
import { bulkAction } from '../services/transfersService';
import { MultiSelect } from '../components/MultiSelect';

interface Props {
    bankAccountId: string;
    onBack: () => void;
    onDeleted?: () => void; // kept for API compatibility but not used (T029)
}

type ViewMode = 'view' | 'edit';

/**
 * T024/T025/T026/T027/T029 [US3]: Combined bank account detail/edit page.
 * View mode shows account info, balance, and transfer history.
 * Edit mode allows changing the account name.
 * T029: Delete is intentionally disabled (bank account deletion is not allowed).
 */
const EMPTY_FILTERS: TransferFilters = { search: '', dateFrom: '', dateTo: '', labelIds: [], accountIds: [], amountMin: '', amountMax: '', amountOperator: 'eq', excludeInternal: false };

const BankAccountDetailPage: React.FC<Props> = ({ bankAccountId, onBack }) => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [account, setAccount] = useState<BankAccount | null>(null);
    const [transfers, setTransfers] = useState<BankAccountTransfer[]>([]);
    const [availableLabels, setAvailableLabels] = useState<LabelOption[]>([]);
    const [filters, setFilters] = useState<TransferFilters>(EMPTY_FILTERS);
    const [selectedTransferIds, setSelectedTransferIds] = useState<string[]>([]);
    
    // Refund linking state
    const [linkRefundParentId, setLinkRefundParentId] = useState<string | null>(null);
    const [linkRefundSelected, setLinkRefundSelected] = useState<string[]>([]);
    
    const [mode, setMode] = useState<ViewMode>('view');
    const [loading, setLoading] = useState(true);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state for edit mode
    const [editName, setEditName] = useState('');
    const [editIsInternal, setEditIsInternal] = useState(false);
    const [editLinkedLabelIds, setEditLinkedLabelIds] = useState<string[]>([]);

    const loadAccount = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBankAccount(bankAccountId, accessToken);
            setAccount(data);
            setEditName(data.accountName ?? '');
            setEditIsInternal(data.isInternal);
            setEditLinkedLabelIds(data.linkedLabelIds ?? []);
        } catch {
            setError('Failed to load bank account.');
        } finally {
            setLoading(false);
        }
    }, [bankAccountId, accessToken]);

    const loadTransfers = useCallback(async (activeFilters: TransferFilters = EMPTY_FILTERS) => {
        if (!accessToken) return;
        setLoadingTransfers(true);
        try {
            const data = await fetchBankAccountTransfers(bankAccountId, accessToken, {
                search: activeFilters.search || undefined,
                dateFrom: activeFilters.dateFrom || undefined,
                dateTo: activeFilters.dateTo || undefined,
                labelIds: activeFilters.labelIds.length > 0 ? activeFilters.labelIds : undefined,
                amountMin: activeFilters.amountMin || undefined,
                amountMax: activeFilters.amountMax || undefined,
                amountOperator: activeFilters.amountOperator || undefined,
            });
            setTransfers(data);
        } catch {
            setTransfers([]);
        } finally {
            setLoadingTransfers(false);
        }
    }, [bankAccountId, accessToken]);

    const loadLabels = useCallback(async () => {
        if (!accessToken) return;
        try {
            const data = await fetchLabels(accessToken);
            setAvailableLabels(data.map((l: Label) => ({ id: l.id, name: l.name })));
        } catch {
            setAvailableLabels([]);
        }
    }, [accessToken]);

    useEffect(() => {
        void loadAccount();
        void loadTransfers(EMPTY_FILTERS);
        void loadLabels();
    }, [loadAccount, loadLabels]);

    // Reload transfers whenever filters change
    useEffect(() => {
        void loadTransfers(filters);
    }, [filters, loadTransfers]);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !account) return;

        if (!editName.trim()) {
            setFormError('Account name is required.');
            return;
        }

        setSubmitting(true);
        setFormError(null);
        try {
            const updated = await updateBankAccount(bankAccountId, editName.trim(), accessToken, account.accountNumber, editIsInternal, editLinkedLabelIds);
            setAccount(updated);
            setMode('view');
            setSuccessMessage('Bank account updated successfully.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to update bank account.');
        } finally {
            setSubmitting(false);
        }
    };


    const handleCancelEdit = () => {
        setMode('view');
        setFormError(null);
        if (account) {
            setEditName(account.accountName ?? '');
            setEditIsInternal(account.isInternal);
            setEditLinkedLabelIds(account.linkedLabelIds ?? []);
        }
    };

    const handleBulkAction = useCallback(async (action: BulkAction) => {
        if (!accessToken) return;
        
        // Handle refund linking mode
        if (action.action === 'mark_refund' && selectedTransferIds.length === 1) {
            // Start refund linking mode with the selected transfer as parent
            setLinkRefundParentId(selectedTransferIds[0]);
            setSelectedTransferIds([]);
            return;
        }
        
        try {
            // Import the bulkAction function from transfersService
            const { bulkAction } = await import('../services/transfersService');
            
            const request = {
                action: action.action,
                transferIds: selectedTransferIds,
                labelId: action.labelId,
                parentTransferId: action.parentTransferId,
            };
            
            await bulkAction(request, accessToken);
            
            // Reload transfers after bulk action
            await loadTransfers(filters);
            
            // Clear selection
            setSelectedTransferIds([]);
            
            // Show success message
            setSuccessMessage('Bulk action completed successfully.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bulk action failed');
        }
    }, [accessToken, selectedTransferIds, filters, loadTransfers]);

    // Refund linking helper functions
    const linkRefundParent = linkRefundParentId
        ? (transfers.find((t) => t.id === linkRefundParentId) ?? null)
        : null;

    const alreadyChildrenOfParent = new Set((linkRefundParent?.childRefunds ?? []).map((c) => c.id));

    const parentAmount = parseFloat(linkRefundParent?.amount ?? '0');
    const linkRefundSum = linkRefundSelected.reduce((sum, id) => {
        const t = transfers.find((x) => x.id === id);
        return sum + (t ? parseFloat(t.amount) : 0);
    }, 0);
    const linkRefundNewAmount = parentAmount + linkRefundSum;

    const toggleRefundSelection = (id: string) =>
        setLinkRefundSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const cancelLinkRefund = () => {
        setLinkRefundParentId(null);
        setLinkRefundSelected([]);
    };

    const handleConfirmLinkRefunds = useCallback(async () => {
        if (!accessToken || !linkRefundParentId || linkRefundSelected.length === 0) return;
        
        try {
            await bulkAction({
                action: 'mark_refund',
                transferIds: linkRefundSelected,
                parentTransferId: linkRefundParentId,
            }, accessToken);
            
            setLinkRefundParentId(null);
            setLinkRefundSelected([]);
            setSelectedTransferIds([]);
            
            // Reload transfers after linking refunds
            await loadTransfers(filters);
            
            setSuccessMessage('Refunds linked successfully.');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to link refunds');
        }
    }, [accessToken, linkRefundParentId, linkRefundSelected, filters, loadTransfers]);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (error && !account) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div
                    className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm"
                    role="alert"
                >
                    {error}
                </div>
                <button
                    onClick={onBack}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    ← Back to list
                </button>
            </div>
        );
    }

    if (!account) return null;


    return (
        <div className="space-y-6">
            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <h2
                        className="text-2xl font-bold text-gray-800"
                        data-testid="account-detail-name"
                    >
                        {account.accountName ?? '—'}
                    </h2>
                    {account.isInternal && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Internal ✓
                        </span>
                    )}
                </div>
                {account.accountNumber && (
                    <p className="mt-1 text-sm text-gray-500 font-mono">
                        {account.accountNumber}
                    </p>
                )}

                {/* Messages */}
                {successMessage && (
                    <div
                        className="mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm"
                        role="status"
                    >
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div
                        className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2">
                    {mode === 'view' && (
                        <>
                            <button
                                onClick={() => setMode('edit')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="edit-account-button"
                            >
                                Edit
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Edit form ─────────────────────────────────────────────────── */}
            {mode === 'edit' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Account</h3>
                    {formError && (
                        <div
                            className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm"
                            role="alert"
                        >
                            {formError}
                        </div>
                    )}
                    <form
                        onSubmit={(e) => void handleEditSubmit(e)}
                        className="space-y-4"
                        aria-label="Edit bank account form"
                    >
                        <div>
                            <label
                                htmlFor="edit-account-name"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Account Name <span aria-hidden="true" className="text-red-500">*</span>
                            </label>
                            <input
                                id="edit-account-name"
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                maxLength={255}
                                placeholder="e.g. My Savings Account"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="account-name-input"
                                aria-required="true"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editIsInternal}
                                    onChange={(e) => setEditIsInternal(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span>Mark as internal account (own account)</span>
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                Internal accounts are used for transfers between your own accounts and are excluded from some analytics.
                            </p>
                        </div>
                        {availableLabels.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Linked Labels (optional)
                                </label>
                                <MultiSelect
                                    placeholder="Select labels…"
                                    options={availableLabels}
                                    selectedIds={editLinkedLabelIds}
                                    onChange={setEditLinkedLabelIds}
                                    searchPlaceholder="Search labels…"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Transfers involving this account will be auto-labeled with the selected labels.
                                </p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="save-account-button"
                            >
                                {submitting ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                                data-testid="cancel-edit-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}


            {/* ── Transaction history ───────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
                    {transfers.length > 0 && (() => {
                        const signedAmounts = transfers.map((t) => {
                            const isOutgoing = t.fromAccountNumber === account.accountNumber;
                            const abs = Math.abs(parseFloat(t.amount));
                            return isOutgoing ? -abs : abs;
                        });
                        const totalIn  = signedAmounts.filter((a) => a > 0).reduce((s, a) => s + a, 0);
                        const totalOut = signedAmounts.filter((a) => a < 0).reduce((s, a) => s + a, 0);
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

                {/* Action bar with filters */}
                <ActionBar
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableLabels={availableLabels}
                    selectedCount={selectedTransferIds.length}
                    onBulkAction={handleBulkAction}
                />

                {/* Bulk action menu */}
                {selectedTransferIds.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                            {selectedTransferIds.length} transfer{selectedTransferIds.length !== 1 ? 's' : ''} selected
                        </span>
                        
                        {selectedTransferIds.length === 1 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLinkRefundParentId(selectedTransferIds[0] ?? null);
                                    setLinkRefundSelected([]);
                                }}
                                className="text-xs bg-white/20 hover:bg-white/30 rounded px-3 py-1 flex items-center gap-1"
                                aria-label="Link refund transfers"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Link Refunds
                            </button>
                        )}

                        {selectedTransferIds.some((id) => transfers.find((t) => t.id === id)?.parentTransferId) && (
                            <button
                                type="button"
                                onClick={() => {
                                    const selectedTransfers = selectedTransferIds.map(id => transfers.find(t => t.id === id)).filter(Boolean);
                                    const parentIds = selectedTransfers.map(t => t?.parentTransferId).filter(Boolean);
                                    if (parentIds.length > 0) {
                                        setLinkRefundParentId(parentIds[0] ?? null);
                                        setLinkRefundSelected(selectedTransferIds);
                                    }
                                }}
                                className="text-xs bg-white/20 hover:bg-white/30 rounded px-3 py-1 flex items-center gap-1"
                                aria-label="Unlink refund transfers"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Unlink Refunds
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setSelectedTransferIds([])}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            Clear selection
                        </button>
                    </div>
                )}

                <div>
                    {loadingTransfers ? (
                        <div className="flex items-center gap-2 px-6 py-4 text-gray-500 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                            Loading transactions…
                        </div>
                    ) : transfers.length === 0 ? (
                        <p className="px-6 py-8 text-center text-sm text-gray-500">
                            {filters.search || filters.dateFrom || filters.dateTo || filters.labelIds.length > 0
                                ? 'No transactions match the current filters.'
                                : 'No transactions found for this account.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Transaction history">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 w-8">
                                            <input
                                                type="checkbox"
                                                checked={selectedTransferIds.length === transfers.length && transfers.length > 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTransferIds(transfers.map(t => t.id));
                                                    } else {
                                                        setSelectedTransferIds([]);
                                                    }
                                                }}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                aria-label="Select all transfers"
                                            />
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counterparty</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labels</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {transfers.map((t) => {
                                        const isOutgoing = t.fromAccountNumber === account.accountNumber;
                                        const counterparty = isOutgoing
                                            ? (t.toAccountName ?? t.toAccountNumber ?? "â")
                                            : (t.fromAccountName ?? t.fromAccountNumber ?? "â");
                                        const absAmount = t.amount.replace(/^-/, "");
                                        const signedAmount = isOutgoing ? `-${absAmount}` : absAmount;
                                        
                                        // Refund linking state
                                        const isLinking = linkRefundParentId !== null;
                                        const isThisParent = t.id === linkRefundParentId;
                                        const isAlreadyChild = alreadyChildrenOfParent.has(t.id);
                                        const isSelectedAsRefund = linkRefundSelected.includes(t.id);

                                        // Row visual class
                                        let rowClass = "transition-colors ";
                                        if (isLinking) {
                                            if (isThisParent) {
                                                rowClass += "bg-blue-50 ring-2 ring-inset ring-blue-400 cursor-default";
                                            } else if (isAlreadyChild) {
                                                rowClass += "bg-indigo-50 opacity-60 cursor-default";
                                            } else if (isSelectedAsRefund) {
                                                rowClass += "bg-amber-50 cursor-pointer hover:bg-amber-100";
                                            } else {
                                                rowClass += `cursor-pointer hover:bg-green-50 ${t.isInternal ? "bg-gray-50" : ""}`;
                                            }
                                        } else {
                                            // Child transfers get indigo left border highlight
                                            const childHighlight = t.parentTransferId ? 'border-l-4 border-indigo-200' : '';
                                            rowClass += `cursor-pointer hover:bg-blue-50 ${t.isInternal ? "bg-gray-50" : ""} ${selectedTransferIds.includes(t.id) ? "bg-blue-50" : ""} ${childHighlight}`;
                                        }
                                        
                                        const handleRowClick = (e: React.MouseEvent) => {
                                            if (isLinking) {
                                                if (isThisParent || isAlreadyChild) return;
                                                toggleRefundSelection(t.id);
                                            } else {
                                                if (e.ctrlKey || e.metaKey) {
                                                    e.preventDefault();
                                                    window.open("/transfers/" + t.id, "_blank");
                                                } else {
                                                    navigate("/transfers/" + t.id);
                                                }
                                            }
                                        };
                                        
                                        return (
                                            <tr
                                                key={t.id}
                                                className={rowClass}
                                                onClick={handleRowClick}
                                            >
                                                <td className="px-4 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                                                    {isLinking ? (
                                                        isThisParent ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">P</span>
                                                        ) : isAlreadyChild ? (
                                                            <input type="checkbox" checked disabled className="h-4 w-4 text-indigo-400 rounded border-gray-300 opacity-50" />
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelectedAsRefund}
                                                                onChange={() => toggleRefundSelection(t.id)}
                                                                className="h-4 w-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400"
                                                                aria-label={`Select as refund: ${t.id}`}
                                                            />
                                                        )
                                                    ) : (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTransferIds.includes(t.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedTransferIds(prev => [...prev, t.id]);
                                                                } else {
                                                                    setSelectedTransferIds(prev => prev.filter(id => id !== t.id));
                                                                }
                                                            }}
                                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                            aria-label={`Select transfer ${t.id}`}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {formatDate(t.date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                                    <div className="flex items-center gap-2">
                                                        <span>{t.reference || ""}</span>
                                                        {t.parentTransferId && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">Refund</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {counterparty}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(t.labelLinks ?? []).filter((link) => !link.isArchived).map((link) => (
                                                            <button
                                                                key={link.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.ctrlKey || e.metaKey) {
                                                                        e.preventDefault();
                                                                        window.open("/labels/" + link.id, "_blank");
                                                                    } else {
                                                                        navigate("/labels/" + link.id);
                                                                    }
                                                                }}
                                                                title={link.isManual ? "Manually assigned" : "Auto-assigned"}
                                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity ${
                                                                    link.isManual ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                                                                }`}
                                                            >
                                                                {link.isManual ? '🖊 ' : '⚙ '}{link.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-right cursor-pointer"
                                                    onClick={(e) => {
                                                        if (e.ctrlKey || e.metaKey) {
                                                            e.preventDefault();
                                                            window.open("/transfers/" + t.id, "_blank");
                                                        } else {
                                                            navigate("/transfers/" + t.id);
                                                        }
                                                    }}
                                                >
                                                    <Amount amount={signedAmount} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                {/* Refund linking confirmation UI */}
                {linkRefundParentId && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-indigo-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40">
                        <span className="text-sm font-medium">
                            {linkRefundSelected.length} refund{linkRefundSelected.length !== 1 ? 's' : ''} selected
                        </span>
                        {linkRefundSelected.length > 0 && (
                            <>
                                <span className="text-xs text-indigo-200">
                                    New total: <Amount amount={linkRefundNewAmount.toFixed(2)} />
                                </span>
                                <button
                                    onClick={handleConfirmLinkRefunds}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                                >
                                    Confirm
                                </button>
                            </>
                        )}
                        <button
                            onClick={cancelLinkRefund}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-800 text-white text-xs font-medium rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BankAccountDetailPage;

