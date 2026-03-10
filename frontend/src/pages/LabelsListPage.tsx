import React, { useEffect, useState } from 'react';
import { fetchLabels } from '../services/labelsService';
import type { Label } from '../services/labelsService';
import LabelRow from '../components/LabelRow';
import EmptyOrErrorState from '../components/EmptyOrErrorState';
import { useAuth } from '../contexts/AuthContext';

const LabelsListPage: React.FC = () => {
    const { accessToken } = useAuth();
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!accessToken) return;

        fetchLabels(accessToken)
            .then((data) => {
                setLabels(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load labels.');
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
                <h1 className="text-xl font-semibold text-gray-900">Labels</h1>
            </div>

            <div className="px-6 py-4">
                {error !== undefined ? (
                    <EmptyOrErrorState error={error} />
                ) : labels.length === 0 ? (
                    <EmptyOrErrorState emptyMessage="No labels found." />
                ) : (
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Parent Label
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Linked Accounts
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Regexes
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {labels.map((label) => (
                                <LabelRow key={label.id} label={label} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default LabelsListPage;


