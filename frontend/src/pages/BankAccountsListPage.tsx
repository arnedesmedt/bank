import React, { useEffect, useState } from 'react';
import { fetchBankAccounts } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';
import BankAccountRow from '../components/BankAccountRow';
import EmptyOrErrorState from '../components/EmptyOrErrorState';
import { useAuth } from '../contexts/AuthContext';

const BankAccountsListPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!accessToken) return;

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-xl font-semibold text-gray-900">Bank Accounts</h1>
            </div>

            <div className="px-6 py-4">
                {error !== undefined ? (
                    <EmptyOrErrorState error={error} />
                ) : accounts.length === 0 ? (
                    <EmptyOrErrorState emptyMessage="No bank accounts found." />
                ) : (
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Account Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Account Number
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Labels
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => (
                                <BankAccountRow key={account.id} account={account} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default BankAccountsListPage;

