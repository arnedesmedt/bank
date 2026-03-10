import React from 'react';
import type { Label } from '../services/labelsService';

interface LabelRowProps {
    label: Label;
}

const LabelRow: React.FC<LabelRowProps> = ({ label }) => (
    <tr className="hover:bg-gray-50 border-b border-gray-200">
        <td className="px-4 py-3 text-sm text-gray-900">{label.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
            {label.parentLabelName !== null ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {label.parentLabelName}
                </span>
            ) : (
                <span className="text-gray-300">—</span>
            )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 text-right">
            {label.linkedBankAccountIds.length}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 text-right">
            {label.linkedRegexes.length}
        </td>
    </tr>
);

export default LabelRow;


