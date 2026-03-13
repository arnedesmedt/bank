import React, { useEffect, useState } from 'react';
import { fetchBankAccount, updateBankAccount } from '../services/bankAccountsService';
import { useAuth } from '../contexts/AuthContext';

interface Props {
    bankAccountId: string;
    onComplete: (message: string) => void;
    onCancel: () => void;
}

/**
 * T013: Bank account edit page.
 * FR-007: Allows users to change the account name.
 */
const BankAccountEditPage: React.FC<Props> = ({ bankAccountId, onComplete, onCancel }) => {
    const { accessToken } = useAuth();
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState<string | null>(null);
    const [isInternal, setIsInternal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;

        fetchBankAccount(bankAccountId, accessToken)
            .then((account) => {
                setAccountName(account.accountName ?? '');
                setAccountNumber(account.accountNumber);
                setIsInternal(account.isInternal);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load bank account.');
                setLoading(false);
            });
    }, [bankAccountId, accessToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        setSubmitting(true);
        setError(null);

        try {
            await updateBankAccount(bankAccountId, accountName, accessToken);
            onComplete('Bank account updated successfully.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update bank account');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">Edit Bank Account</h2>
                    {isInternal && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            Internal ✓
                        </span>
                    )}
                </div>
                {accountNumber !== null && (
                    <p className="mt-1 text-sm text-gray-500 font-mono">{accountNumber}</p>
                )}
            </div>

            {error !== null && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name
                    </label>
                    <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        required
                        placeholder="e.g. My Savings Account"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        data-testid="account-name-input"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded transition duration-200"
                        data-testid="save-bank-account-button"
                    >
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded transition duration-200"
                        data-testid="cancel-bank-account-button"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BankAccountEditPage;

