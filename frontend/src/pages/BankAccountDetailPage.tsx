import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchBankAccount,
    fetchBankAccountTransfers,
    updateBankAccount,
} from '../services/bankAccountsService';
import type { BankAccount, BankAccountTransfer } from '../services/bankAccountsService';
import { useAuth } from '../contexts/AuthContext';
import Amount from '../components/Amount';

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
const BankAccountDetailPage: React.FC<Props> = ({ bankAccountId, onBack }) => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [account, setAccount] = useState<BankAccount | null>(null);
    const [transfers, setTransfers] = useState<BankAccountTransfer[]>([]);
    const [mode, setMode] = useState<ViewMode>('view');
    const [loading, setLoading] = useState(true);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [submitting, setSubmitting] = useState(false);
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
            const updated = await updateBankAccount(bankAccountId, editName.trim(), accessToken, account.accountNumber);
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
                    <div className="text-right shrink-0">
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


            {/* ── Transaction history ───────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
                </div>
                <div>
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
                                        // t.amount may already be negative; strip the sign first,
                                        // then reapply based on from/to perspective.
                                        const absAmount = t.amount.replace(/^-/, '');
                                        const signedAmount = isOutgoing
                                            ? `-${absAmount}`
                                            : absAmount;
                                        return (
                                            <tr
                                                key={t.id}
                                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/transfers/${t.id}`)}
                                            >
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

