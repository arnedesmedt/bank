import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchLabels, createLabel, type Label } from '../services/labelsService';
import { fetchBankAccounts } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';

type PageView = 'list' | 'create';

const LabelsListPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [labels, setLabels] = useState<Label[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [view, setView] = useState<PageView>('list');

    // Create form state
    const [formName, setFormName] = useState('');
    const [formParentLabelId, setFormParentLabelId] = useState('');
    const [formLinkedBankAccountIds, setFormLinkedBankAccountIds] = useState<string[]>([]);
    const [formLinkedRegexes, setFormLinkedRegexes] = useState<string[]>([]);
    const [formRegexInput, setFormRegexInput] = useState('');
    const [formMaxValue, setFormMaxValue] = useState('');
    const [formMaxPercentage, setFormMaxPercentage] = useState('');
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const [labelsData, bankAccountsData] = await Promise.all([
                fetchLabels(accessToken),
                fetchBankAccounts(accessToken),
            ]);
            setLabels(labelsData);
            setBankAccounts(bankAccountsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load labels');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const resetForm = () => {
        setFormName('');
        setFormParentLabelId('');
        setFormLinkedBankAccountIds([]);
        setFormLinkedRegexes([]);
        setFormRegexInput('');
        setFormMaxValue('');
        setFormMaxPercentage('');
        setFormError(null);
    };

    const openCreate = () => {
        resetForm();
        setView('create');
    };

    const cancelCreate = () => {
        setView('list');
        resetForm();
    };

    const addRegex = () => {
        const trimmed = formRegexInput.trim();
        if (trimmed && !formLinkedRegexes.includes(trimmed)) {
            setFormLinkedRegexes((prev) => [...prev, trimmed]);
            setFormRegexInput('');
        }
    };

    const removeRegex = (regex: string) => {
        setFormLinkedRegexes((prev) => prev.filter((r) => r !== regex));
    };

    const toggleBankAccount = (id: string) => {
        setFormLinkedBankAccountIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        if (!formName.trim()) {
            setFormError('Label name is required.');
            return;
        }
        setFormSubmitting(true);
        setFormError(null);
        try {
            await createLabel(
                {
                    name: formName.trim(),
                    parentLabelId: formParentLabelId || null,
                    linkedBankAccountIds: formLinkedBankAccountIds,
                    linkedRegexes: formLinkedRegexes,
                    maxValue: formMaxValue || null,
                    maxPercentage: formMaxPercentage || null,
                },
                accessToken,
            );
            setView('list');
            resetForm();
            void loadData();
            showSuccess('Label created successfully.');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to create label');
        } finally {
            setFormSubmitting(false);
        }
    };

    const getBankAccountName = (id: string) => {
        const ba = bankAccounts.find((b) => b.id === id);
        return ba ? `${ba.accountName ?? '—'} (${ba.accountNumber ?? '—'})` : id;
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Create form ────────────────────────────────────────────────── */}
            {view === 'create' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Label</h2>
                    {formError && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm" role="alert">
                            {formError}
                        </div>
                    )}
                    <form onSubmit={(e) => void handleCreateSubmit(e)} className="space-y-4" aria-label="Create label form">
                        {/* Name */}
                        <div>
                            <label htmlFor="create-label-name" className="block text-sm font-medium text-gray-700 mb-1">
                                Name <span className="text-red-500" aria-hidden="true">*</span>
                            </label>
                            <input
                                id="create-label-name"
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                required
                                maxLength={255}
                                placeholder="e.g. Groceries"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="label-name-input"
                            />
                        </div>

                        {/* Parent Label */}
                        <div>
                            <label htmlFor="create-parent-label" className="block text-sm font-medium text-gray-700 mb-1">
                                Parent Label <span className="text-gray-400 text-xs">(optional)</span>
                            </label>
                            <select
                                id="create-parent-label"
                                value={formParentLabelId}
                                onChange={(e) => setFormParentLabelId(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">— No parent —</option>
                                {labels.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.name}{l.parentLabelName ? ` (child of ${l.parentLabelName})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Linked Bank Accounts */}
                        {bankAccounts.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Linked Bank Accounts
                                </label>
                                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                                    {bankAccounts.map((ba) => (
                                        <label key={ba.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formLinkedBankAccountIds.includes(ba.id)}
                                                onChange={() => toggleBankAccount(ba.id)}
                                            />
                                            <span>
                                                {ba.accountName}{' '}
                                                <span className="text-gray-500">({ba.accountNumber})</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regex Patterns */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Regex Patterns <span className="text-gray-400 text-xs">(auto-labeling)</span>
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={formRegexInput}
                                    onChange={(e) => setFormRegexInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRegex(); } }}
                                    placeholder="/NETFLIX/i"
                                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <button
                                    type="button"
                                    onClick={addRegex}
                                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {formLinkedRegexes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formLinkedRegexes.map((regex) => (
                                        <span key={regex} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                            <code>{regex}</code>
                                            <button
                                                type="button"
                                                onClick={() => removeRegex(regex)}
                                                className="text-red-500 hover:text-red-700 font-bold"
                                                aria-label={`Remove regex ${regex}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Budget Limits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="create-max-value" className="block text-sm font-medium text-gray-700 mb-1">
                                    Max Value (€)
                                </label>
                                <input
                                    id="create-max-value"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formMaxValue}
                                    onChange={(e) => setFormMaxValue(e.target.value)}
                                    placeholder="e.g. 200.00"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                            <div>
                                <label htmlFor="create-max-percentage" className="block text-sm font-medium text-gray-700 mb-1">
                                    Max Percentage (%)
                                </label>
                                <input
                                    id="create-max-percentage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formMaxPercentage}
                                    onChange={(e) => setFormMaxPercentage(e.target.value)}
                                    placeholder="e.g. 10.00"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={formSubmitting}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                data-testid="submit-label-button"
                            >
                                {formSubmitting ? 'Creating…' : 'Create Label'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelCreate}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-800">Labels</h1>
                        <button
                            onClick={openCreate}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                            data-testid="create-label-button"
                        >
                            + Create Label
                        </button>
                    </div>

                    {/* Messages */}
                    {successMessage && (
                        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm" role="status">
                            {successMessage}
                        </div>
                    )}
                    {error && (
                        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    <div>
                        {labels.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-sm mb-4">No labels yet.</p>
                                <button
                                    onClick={openCreate}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    Create your first label
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200" aria-label="Labels list">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Parent
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Linked Accounts
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Regex Patterns
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Budget
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {labels.map((label) => (
                                            <tr
                                                key={label.id}
                                                className="hover:bg-blue-50 cursor-pointer transition-colors duration-100"
                                                onClick={() => navigate(`/labels/${label.id}`)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        navigate(`/labels/${label.id}`);
                                                    }
                                                }}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`View label ${label.name}`}
                                                data-testid={`label-row-${label.id}`}
                                            >
                                                {/* Name */}
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {label.name}
                                                </td>

                                                {/* Parent */}
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {label.parentLabelName ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {label.parentLabelName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Linked Accounts */}
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {label.linkedBankAccountIds.length === 0 ? (
                                                        <span className="text-gray-400">—</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {label.linkedBankAccountIds.map((id) => (
                                                                <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                    {getBankAccountName(id)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Regex Patterns */}
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {label.linkedRegexes.length === 0 ? (
                                                        <span className="text-gray-400">—</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {label.linkedRegexes.map((regex) => (
                                                                <span key={regex} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 font-mono">
                                                                    {regex}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Budget */}
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {!label.maxValue && !label.maxPercentage ? (
                                                        <span className="text-gray-400">—</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {label.maxValue && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                    max €{label.maxValue}
                                                                </span>
                                                            )}
                                                            {label.maxPercentage && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                    max {label.maxPercentage}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
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

export default LabelsListPage;
