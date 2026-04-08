import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Label {
  id: string;
  name: string;
  parentLabelId: string | null;
  parentLabelName: string | null;
  childLabelIds: string[];
  linkedBankAccountIds: string[];
  linkedRegexes: string[];
  maxValue: string | null;
  maxPercentage: string | null;
}

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

function LabelManager() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [labels, setLabels] = useState<Label[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formParentLabelId, setFormParentLabelId] = useState<string>('');
  const [formLinkedBankAccountIds, setFormLinkedBankAccountIds] = useState<string[]>([]);
  const [formLinkedRegexes, setFormLinkedRegexes] = useState<string[]>([]);
  const [formChildLabelIds, setFormChildLabelIds] = useState<string[]>([]);
  const [formRegexInput, setFormRegexInput] = useState('');
  const [formMaxValue, setFormMaxValue] = useState('');
  const [formMaxPercentage, setFormMaxPercentage] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (accessToken) {
      void loadData();
    }
  }, [accessToken]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [labelsRes, bankAccountsRes] = await Promise.all([
        fetch(`${API_URL}/api/labels`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        }),
        fetch(`${API_URL}/api/bank-accounts`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        }),
      ]);
      if (!labelsRes.ok) throw new Error('Failed to load labels');
      if (!bankAccountsRes.ok) throw new Error('Failed to load bank accounts');
      setLabels((await labelsRes.json()) as Label[]);
      setBankAccounts((await bankAccountsRes.json()) as BankAccount[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormParentLabelId('');
    setFormLinkedBankAccountIds([]);
    setFormLinkedRegexes([]);
    setFormChildLabelIds([]);
    setFormRegexInput('');
    setFormMaxValue('');
    setFormMaxPercentage('');
  };

  const openCreateForm = () => { resetForm(); setIsFormOpen(true); };
  const closeForm = () => { setIsFormOpen(false); resetForm(); };

  const addRegex = () => {
    const trimmed = formRegexInput.trim();
    if (trimmed && !formLinkedRegexes.includes(trimmed)) {
      setFormLinkedRegexes([...formLinkedRegexes, trimmed]);
      setFormRegexInput('');
    }
  };

  const removeRegex = (regex: string) => {
    setFormLinkedRegexes(formLinkedRegexes.filter((r) => r !== regex));
  };

  const toggleBankAccount = (bankAccountId: string) => {
    setFormLinkedBankAccountIds((prev) =>
      prev.includes(bankAccountId) ? prev.filter((id) => id !== bankAccountId) : [...prev, bankAccountId],
    );
  };

  const toggleChildLabel = (childLabelId: string) => {
    setFormChildLabelIds((prev) =>
      prev.includes(childLabelId) ? prev.filter((id) => id !== childLabelId) : [...prev, childLabelId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setFormSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/labels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: formName,
          parentLabelId: formParentLabelId !== '' ? formParentLabelId : null,
          linkedBankAccountIds: formLinkedBankAccountIds,
          linkedRegexes: formLinkedRegexes,
          childLabelIds: formChildLabelIds,
          maxValue: formMaxValue !== '' ? formMaxValue : null,
          maxPercentage: formMaxPercentage !== '' ? formMaxPercentage : null,
        }),
      });
      if (!response.ok) {
        const errorData = (await response.json()) as { detail?: string };
        throw new Error(errorData.detail ?? 'Failed to create label');
      }
      setSuccessMessage('Label created successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      closeForm();
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getBankAccountName = (id: string): string => {
    const account = bankAccounts.find((ba) => ba.id === id);
    return account != null ? `${account.accountName} (${account.accountNumber})` : id;
  };

  const getChildLabelNames = (childLabelIds: string[]): string[] =>
    childLabelIds
      .map((id) => labels.find((l) => l.id === id)?.name)
      .filter((name): name is string => name !== undefined);

  // ── Derived filtered list ──────────────────────────────────────────────
  const filteredLabels = search.trim() === ''
    ? labels
    : labels.filter((l) => l.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6" data-testid="label-manager-loading">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span className="text-gray-600">Loading labels...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="label-manager">
      {/* ── Create form ─────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New Label</h2>
          {error != null && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" data-testid="label-form">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g. Groceries"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                data-testid="label-name-input"
              />
            </div>

            {/* Parent Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Label (optional)</label>
              <select
                value={formParentLabelId}
                onChange={(e) => setFormParentLabelId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                data-testid="parent-label-select"
              >
                <option value="">— No parent —</option>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}{label.parentLabelName != null ? ` (child of ${label.parentLabelName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Child Labels */}
            {labels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child Labels (optional)</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white" data-testid="child-label-checkboxes">
                  {labels.filter((label) => label.id !== formParentLabelId || formParentLabelId === '').map((label) => (
                    <label key={label.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChildLabelIds.includes(label.id)}
                        onChange={() => toggleChildLabel(label.id)}
                        data-testid={`child-label-checkbox-${label.id}`}
                      />
                      <span>{label.name}{label.parentLabelName != null ? ` (child of ${label.parentLabelName})` : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Bank Accounts */}
            {bankAccounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Bank Accounts</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white" data-testid="bank-account-checkboxes">
                  {bankAccounts.map((ba) => (
                    <label key={ba.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formLinkedBankAccountIds.includes(ba.id)}
                        onChange={() => toggleBankAccount(ba.id)}
                        data-testid={`bank-account-checkbox-${ba.id}`}
                      />
                      <span>{ba.accountName} <span className="text-gray-500">({ba.accountNumber})</span></span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Regex Patterns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regex Patterns (auto-labeling)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formRegexInput}
                  onChange={(e) => setFormRegexInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRegex(); } }}
                  placeholder="/NETFLIX/i"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  data-testid="regex-input"
                />
                <button type="button" onClick={addRegex} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-3 rounded-md text-sm" data-testid="add-regex-button">
                  Add
                </button>
              </div>
              {formLinkedRegexes.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="regex-list">
                  {formLinkedRegexes.map((regex) => (
                    <span key={regex} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      <code>{regex}</code>
                      <button type="button" onClick={() => removeRegex(regex)} className="text-red-500 hover:text-red-700 font-bold" aria-label={`Remove regex ${regex}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Value (€)</label>
                <input type="number" step="0.01" min="0" value={formMaxValue} onChange={(e) => setFormMaxValue(e.target.value)} placeholder="e.g. 200.00" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" data-testid="max-value-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Percentage (%)</label>
                <input type="number" step="0.01" min="0" max="100" value={formMaxPercentage} onChange={(e) => setFormMaxPercentage(e.target.value)} placeholder="e.g. 10.00" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" data-testid="max-percentage-input" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400" data-testid="submit-label-button">
                {formSubmitting ? 'Creating…' : 'Create Label'}
              </button>
              <button type="button" onClick={closeForm} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400" data-testid="cancel-label-button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Labels</h1>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="create-label-button"
          >
            + Create Label
          </button>
        </div>

        {/* ── Action bar ──────────────────────────────────────────────── */}
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
              placeholder="Search by label name…"
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              aria-label="Search labels"
              data-testid="label-search-input"
            />
          </div>
          {search && (
            <span className="text-xs text-gray-500">
              {filteredLabels.length} of {labels.length} label{labels.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {successMessage != null && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm" role="status" data-testid="success-message">
            {successMessage}
          </div>
        )}
        {!isFormOpen && error != null && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm" role="alert" data-testid="error-message">
            {error}
          </div>
        )}

        <div>
          {labels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm mb-4">No labels yet. Create your first label to start auto-labeling transfers.</p>
              <button onClick={openCreateForm} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                Create first label
              </button>
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No labels match &ldquo;{search}&rdquo;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" aria-label="Labels list">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Accounts</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patterns</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLabels.map((label) => (
                    <tr
                      key={label.id}
                      className="hover:bg-blue-50 cursor-pointer transition-colors duration-100"
                      onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                              e.preventDefault();
                              window.open(`/labels/${label.id}`, '_blank');
                          } else {
                              navigate(`/labels/${label.id}`);
                          }
                      }}
                      onKeyDown={(e) => { 
                          if (e.key === 'Enter' || e.key === ' ') { 
                              if (e.ctrlKey || e.metaKey) {
                                  e.preventDefault();
                                  window.open(`/labels/${label.id}`, '_blank');
                              } else {
                                  e.preventDefault(); 
                                  navigate(`/labels/${label.id}`);
                              }
                          } 
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${label.name}`}
                      data-testid={`label-item-${label.id}`}
                    >
                      {/* Name */}
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{label.name}</div>
                        {label.parentLabelName != null && (
                          <div className="mt-0.5">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              child of {label.parentLabelName}
                            </span>
                          </div>
                        )}
                        {label.childLabelIds.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {getChildLabelNames(label.childLabelIds).map((childName) => (
                              <span key={childName} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                ↳ {childName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Linked bank accounts */}
                      <td className="px-6 py-4 text-sm">
                        {label.linkedBankAccountIds.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {label.linkedBankAccountIds.map((id) => (
                              <span key={id} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                🏦 {getBankAccountName(id)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Regex patterns */}
                      <td className="px-6 py-4 text-sm">
                        {label.linkedRegexes.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {label.linkedRegexes.map((regex) => (
                              <span key={regex} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                                {regex}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Budget */}
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {label.maxValue != null && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                              max €{label.maxValue}
                            </span>
                          )}
                          {label.maxPercentage != null && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              max {label.maxPercentage}%
                            </span>
                          )}
                          {label.maxValue == null && label.maxPercentage == null && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { LabelManager };

