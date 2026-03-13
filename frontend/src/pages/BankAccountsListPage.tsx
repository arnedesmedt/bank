import React, { useCallback, useEffect, useState } from 'react';
import { fetchBankAccounts } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';
import EmptyOrErrorState from '../components/EmptyOrErrorState';
import { useAuth } from '../contexts/AuthContext';
import BankAccountEditPage from '../pages/BankAccountEditPage';

/**
 * T011: Bank accounts list page with transfer-table styling, action column,
 * and internal status indicator. T012: Edit button leads to edit page.
 */
const BankAccountsListPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    const handleEditComplete = (message: string) => {
        setEditingId(null);
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
        loadAccounts();
    };

    if (editingId !== null) {
        return (
            <BankAccountEditPage
                bankAccountId={editingId}
                onComplete={handleEditComplete}
                onCancel={() => setEditingId(null)}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800">Bank Accounts</h1>
            </div>

            {successMessage && (
                <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm">
                    {successMessage}
                </div>
            )}

            <div className="px-6 py-4">
                {error !== undefined ? (
                    <EmptyOrErrorState error={error} />
                ) : accounts.length === 0 ? (
                    <EmptyOrErrorState emptyMessage="No bank accounts found." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Internal
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Balance
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {accounts.map((account) => (
                                    <tr
                                        key={account.id}
                                        className={`hover:bg-gray-50 ${account.isInternal ? 'bg-blue-50' : ''}`}
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
                                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">
                                            {parseFloat(account.totalBalance).toFixed(2)} €
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <button
                                                onClick={() => setEditingId(account.id)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                data-testid={`edit-bank-account-${account.id}`}
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BankAccountsListPage;

