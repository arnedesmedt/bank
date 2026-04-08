import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBankAccounts, createBankAccount } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';
import EmptyOrErrorState from '../components/EmptyOrErrorState';
import { useAuth } from '../contexts/AuthContext';
import BankAccountDetailPage from './BankAccountDetailPage';
import Amount from '../components/Amount';

/**
 * T023/T027/T029 [US3]: Bank account list page with clickable rows leading to detail/edit page.
 * Add button opens an inline add form. Empty and error states clearly shown.
 */
const BankAccountsListPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [search, setSearch] = useState('');

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
        navigate(`/accounts/${id}`);
    };

    const handleBackToList = () => {
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

    // ── Derived filtered list ──────────────────────────────────────────────
    const filteredAccounts = search.trim() === ''
        ? accounts
        : accounts.filter((a) =>
            (a.accountName ?? '').toLowerCase().includes(search.trim().toLowerCase()),
          );


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
            {/* ── List ──────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-800">Bank Accounts</h1>

|                </div>
                    {/* ── Action bar ────────────────────────────────────────── */}
                    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by account name…"
                                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                aria-label="Search bank accounts"
                                data-testid="bank-account-search-input"
                            />
                        </div>
                        {search && (
                            <span className="text-xs text-gray-500">
                                {filteredAccounts.length} of {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                            </span>
                        )}
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
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    Add your first account
                                </button>
                            </div>
                        ) : filteredAccounts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-sm">No accounts match &ldquo;{search}&rdquo;.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table
                                    className="min-w-full divide-y divide-gray-200"
                                    aria-label="Bank accounts list"
                                >
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAccounts.map((account) => (
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
                                                            <span title="Internal account" className="text-green-600 font-bold" data-testid="internal-indicator">✓</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{account.accountNumber ?? '—'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {account.isInternal ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Yes ✓</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">No</span>
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
            )
        </div>
    );
};

export default BankAccountsListPage;

