import React from 'react';
import type { BankAccount } from '../services/bankAccountsService';

interface BankAccountRowProps {
    account: BankAccount;
    onEdit?: (id: string) => void;
}

/**
 * T012: Bank account table row with internal status indicator and edit button.
 */
const BankAccountRow: React.FC<BankAccountRowProps> = ({ account, onEdit }) => (
    <tr className={`hover:bg-gray-50 border-b border-gray-200 ${account.isInternal ? 'bg-blue-50' : ''}`}>
        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
            <div className="flex items-center gap-2">
                {account.accountName ?? '—'}
                {account.isInternal && (
                    <span title="Internal account" className="text-green-600 font-bold" data-testid="internal-indicator">
                        ✓
                    </span>
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
        <td className="px-6 py-4 text-sm text-gray-500 text-right">{account.linkedLabelIds.length}</td>
        <td className="px-6 py-4 text-sm text-right">
            {onEdit != null && (
                <button
                    onClick={() => onEdit(account.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    data-testid={`edit-bank-account-${account.id}`}
                >
                    Edit
                </button>
            )}
        </td>
    </tr>
);

export default BankAccountRow;
