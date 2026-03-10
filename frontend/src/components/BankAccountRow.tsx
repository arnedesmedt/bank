import React from 'react';
import { BankAccount } from '../services/bankAccountsService';

interface BankAccountRowProps {
    account: BankAccount;
}

const BankAccountRow: React.FC<BankAccountRowProps> = ({ account }) => (
    <tr className="hover:bg-gray-50 border-b border-gray-200">
        <td className="px-4 py-3 text-sm text-gray-900">{account.accountName}</td>
        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{account.accountNumber}</td>
        <td className="px-4 py-3 text-sm text-gray-500 text-right">{account.linkedLabelIds.length}</td>
    </tr>
);

export default BankAccountRow;
