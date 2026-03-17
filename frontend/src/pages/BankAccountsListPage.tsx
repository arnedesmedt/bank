import React, { useCallback, useEffect, useState } from 'react';
import { fetchBankAccounts, createBankAccount } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';
import EmptyOrErrorState from '../components/EmptyOrErrorState';
import { useAuth } from '../contexts/AuthContext';
import BankAccountDetailPage from './BankAccountDetailPage';
import Amount from '../components/Amount';

type PageView = 'list' | 'detail' | 'add';

/**
 * T023/T027/T029 [US3]: Bank account list page with clickable rows leading to detail/edit page.
 * Add button opens an inline add form. Empty and error states clearly shown.
 */
const BankAccountsListPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [view, setView] = useState<PageView>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Add form state
    const [addName, setAddName] = useState('');
    const [addNumber, setAddNumber] = useState('');
    const [addError, setAddError] = useState<string | null>(null);
    const [addSubmitting, setAddSubmitting] = useState(false);

    const loadAccounts = useCallback(() => {
        if (!accessToken) return;
        setLoading(true);
        fetchBankAccounts(accessToken)
            .then((data) => {
                setAccounts(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load bank accounts.');
                setLoading(false);
            });
    }, [accessToken]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleRowClick = (id: string) => {
        setSelectedId(id);
        setView('detail');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedId(null);
    };


    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        if (!addName.trim()) {
            setAddError('Account name is required.');
            return;
        }
        setAddSubmitting(true);
        setAddError(null);
        try {
            await createBankAccount(
                { accountName: addName.trim(), accountNumber: addNumber.trim() || null },
                accessToken,
            );
            setView('list');
            setAddName('');
            setAddNumber('');
            loadAccounts();
            showSuccess('Bank account added successfully.');
        } catch (err) {
            setAddError(err instanceof Error ? err.message : 'Failed to create bank account.');
        } finally {
            setAddSubmitting(false);
        }
    };

    // ── Detail view ────────────────────────────────────────────────────────────
    if (view === 'detail' && selectedId) {
        return (
            <BankAccountDetailPage
                bankAccountId={selectedId}
                onBack={handleBackToList}
            />
        );
    }

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Add form ───────────────────────────────────────────────────── */}
            {view === 'add' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Bank Account</h2>
                    {addError && (
                        <div
                            className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm"
                            role="alert"
                        >
                            {addError}
                        </div>
                    )}
                    <form
                        onSubmit={(e) => void handleAddSubmit(e)}
                        className="space-y-4"
                        aria-label="Add bank account form"
                    >
                        <div>
                            <label
                                htmlFor="add-account-name"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Account Name <span aria-hidden="true" className="text-red-500">*</span>
                            </label>
                            <input
                                id="add-account-name"
                                type="text"
                                value={addName}
                                onChange={(e) => setAddName(e.target.value)}
                                required
                                maxLength={255}
                                placeholder="e.g. My Savings Account"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="add-account-name-input"
                                aria-required="true"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="add-account-number"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Account Number{' '}
                                <span className="text-gray-400 text-xs">(optional, Belgian IBAN)</span>
                            </label>
                            <input
                                id="add-account-number"
                                type="text"
                                value={addNumber}
                                onChange={(e) => setAddNumber(e.target.value)}
                                placeholder="e.g. BE68 5390 0754 7034"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="add-account-number-input"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={addSubmitting}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="add-account-submit-button"
                            >
                                {addSubmitting ? 'Adding…' : 'Add Account'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setView('list');
                                    setAddError(null);
                                    setAddName('');
                                    setAddNumber('');
                                }}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                                data-testid="cancel-add-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── List ──────────────────────────────────────────────────────── */}
            {view === 'list' && (
                <div className="bg-white rounded-lg shadow-md">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-800">Bank Accounts</h1>
                        <button
                            onClick={() => setView('add')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                            data-testid="add-bank-account-button"
                        >
                            + Add Account
                        </button>
                    </div>

                    {successMessage && (
                        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm" role="status">
                            {successMessage}
                        </div>
                    )}

                    <div>
                        {error !== undefined ? (
                            <EmptyOrErrorState error={error} />
                        ) : accounts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-sm mb-4">No bank accounts found.</p>
                                <button
                                    onClick={() => setView('add')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    data-testid="empty-add-bank-account-button"
                                >
                                    Add your first account
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table
                                    className="min-w-full divide-y divide-gray-200"
                                    aria-label="Bank accounts list"
                                >
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Account Name
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Account Number
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Status
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Balance
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accounts.map((account) => (
                                            <tr
                                                key={account.id}
                                                className={`hover:bg-blue-50 cursor-pointer transition-colors duration-100 ${account.isInternal ? 'bg-blue-50/40' : ''}`}
                                                onClick={() => handleRowClick(account.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleRowClick(account.id);
                                                    }
                                                }}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`View details for ${account.accountName ?? 'account'}`}
                                                data-testid={`bank-account-row-${account.id}`}
                                            >
                                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {account.accountName ?? '—'}
                                                        {account.isInternal && (
                                                            <span
                                                                title="Internal account"
                                                                className="text-green-600 font-bold"
                                                                data-testid="internal-indicator"
                                                            >
                                                                ✓
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                                    {account.accountNumber ?? '—'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {account.isInternal ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            Yes ✓
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                            No
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-right">
                                                    <Amount amount={account.totalBalance} showSign={false} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankAccountsListPage;

