import React, { useCallback, useEffect, useState } from 'react';
import {
    fetchBankAccount,
    fetchBankAccountTransfers,
    updateBankAccount,
    deleteBankAccount,
} from '../services/bankAccountsService';
import type { BankAccount, BankAccountTransfer } from '../services/bankAccountsService';
import { useAuth } from '../contexts/AuthContext';
import Amount from '../components/Amount';

interface Props {
    bankAccountId: string;
    onBack: () => void;
    onDeleted: () => void;
}

type ViewMode = 'view' | 'edit';

/**
 * T024/T025/T026/T027/T029 [US3]: Combined bank account detail/edit page.
 * View mode shows account info, balance, and transfer history.
 * Edit mode allows changing the account name.
 * Delete with confirmation dialog.
 */
const BankAccountDetailPage: React.FC<Props> = ({ bankAccountId, onBack, onDeleted }) => {
    const { accessToken } = useAuth();
    const [account, setAccount] = useState<BankAccount | null>(null);
    const [transfers, setTransfers] = useState<BankAccountTransfer[]>([]);
    const [mode, setMode] = useState<ViewMode>('view');
    const [loading, setLoading] = useState(true);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state for edit mode
    const [editName, setEditName] = useState('');

    const loadAccount = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBankAccount(bankAccountId, accessToken);
            setAccount(data);
            setEditName(data.accountName ?? '');
        } catch {
            setError('Failed to load bank account.');
        } finally {
            setLoading(false);
        }
    }, [bankAccountId, accessToken]);

    const loadTransfers = useCallback(async () => {
        if (!accessToken) return;
        setLoadingTransfers(true);
        try {
            const data = await fetchBankAccountTransfers(bankAccountId, accessToken);
            setTransfers(data);
        } catch {
            // Non-critical — don't block page on transfer load failure
            setTransfers([]);
        } finally {
            setLoadingTransfers(false);
        }
    }, [bankAccountId, accessToken]);

    useEffect(() => {
        void loadAccount();
        void loadTransfers();
    }, [loadAccount, loadTransfers]);

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
            const updated = await updateBankAccount(bankAccountId, editName.trim(), accessToken);
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

    const handleDelete = async () => {
        if (!accessToken) return;
        setDeleting(true);
        setError(null);
        try {
            await deleteBankAccount(bankAccountId, accessToken);
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete bank account.');
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    const handleCancelEdit = () => {
        setMode('view');
        setFormError(null);
        if (account) setEditName(account.accountName ?? '');
    };

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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Account info */}
                    <div>
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
                    </div>

                    {/* Balance */}
                    <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Balance</p>
                        <Amount
                            amount={account.totalBalance}
                            className="text-2xl"
                        />
                    </div>
                </div>

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
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                data-testid="delete-account-button"
                            >
                                Delete
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

            {/* ── Delete confirmation dialog ─────────────────────────────────── */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-dialog-title"
                >
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3
                            id="delete-dialog-title"
                            className="text-lg font-semibold text-gray-800 mb-2"
                        >
                            Delete Bank Account
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete{' '}
                            <strong>{account.accountName ?? 'this account'}</strong>? This action
                            cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => void handleDelete()}
                                disabled={deleting}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                data-testid="confirm-delete-button"
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                                data-testid="cancel-delete-button"
                                autoFocus
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Transaction history ───────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
                </div>
                <div className="p-6">
                    {loadingTransfers ? (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                            Loading transactions…
                        </div>
                    ) : transfers.length === 0 ? (
                        <p className="text-sm text-gray-500">No transactions found for this account.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Transaction history">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Date
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Reference
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Counterparty
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {transfers.map((t) => {
                                        const isOutgoing =
                                            t.fromAccountNumber === account.accountNumber;
                                        const counterparty = isOutgoing
                                            ? (t.toAccountName ?? t.toAccountNumber ?? '—')
                                            : (t.fromAccountName ?? t.fromAccountNumber ?? '—');
                                        const signedAmount = isOutgoing
                                            ? `-${t.amount}`
                                            : t.amount;
                                        return (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    {formatDate(t.date)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                                                    {t.reference || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                                    {counterparty}
                                                </td>
                                                <td className="px-4 py-3 text-right">
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
            </div>
        </div>
    );
};

export default BankAccountDetailPage;

