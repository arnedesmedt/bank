import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Label {
  id: string;
  name: string;
  parentLabelId: string | null;
  parentLabelName: string | null;
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

  const [labels, setLabels] = useState<Label[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [formName, setFormName] = useState('');
  const [formParentLabelId, setFormParentLabelId] = useState<string>('');
  const [formLinkedBankAccountIds, setFormLinkedBankAccountIds] = useState<string[]>([]);
  const [formLinkedRegexes, setFormLinkedRegexes] = useState<string[]>([]);
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
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }),
        fetch(`${API_URL}/api/bank-accounts`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }),
      ]);

      if (!labelsRes.ok) throw new Error('Failed to load labels');
      if (!bankAccountsRes.ok) throw new Error('Failed to load bank accounts');

      const labelsData = (await labelsRes.json()) as Label[];
      const bankAccountsData = (await bankAccountsRes.json()) as BankAccount[];

      setLabels(labelsData);
      setBankAccounts(bankAccountsData);
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
    setFormRegexInput('');
    setFormMaxValue('');
    setFormMaxPercentage('');
    setEditingLabel(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (label: Label) => {
    setEditingLabel(label);
    setFormName(label.name);
    setFormParentLabelId(label.parentLabelId ?? '');
    setFormLinkedBankAccountIds(label.linkedBankAccountIds);
    setFormLinkedRegexes(label.linkedRegexes);
    setFormRegexInput('');
    setFormMaxValue(label.maxValue ?? '');
    setFormMaxPercentage(label.maxPercentage ?? '');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

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
    if (formLinkedBankAccountIds.includes(bankAccountId)) {
      setFormLinkedBankAccountIds(formLinkedBankAccountIds.filter((id) => id !== bankAccountId));
    } else {
      setFormLinkedBankAccountIds([...formLinkedBankAccountIds, bankAccountId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setFormSubmitting(true);
    setError(null);

    const payload = {
      name: formName,
      parentLabelId: formParentLabelId !== '' ? formParentLabelId : null,
      linkedBankAccountIds: formLinkedBankAccountIds,
      linkedRegexes: formLinkedRegexes,
      maxValue: formMaxValue !== '' ? formMaxValue : null,
      maxPercentage: formMaxPercentage !== '' ? formMaxPercentage : null,
    };

    try {
      const url =
        editingLabel != null
          ? `${API_URL}/api/labels/${editingLabel.id}`
          : `${API_URL}/api/labels`;
      const method = editingLabel != null ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { detail?: string };
        throw new Error(errorData.detail ?? 'Failed to save label');
      }

      setSuccessMessage(
        editingLabel != null ? 'Label updated successfully.' : 'Label created successfully.',
      );
      setTimeout(() => setSuccessMessage(null), 3000);

      closeForm();
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (label: Label) => {
    if (!accessToken) return;
    if (!window.confirm(`Delete label "${label.name}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/labels/${label.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete label');
      }

      setSuccessMessage(`Label "${label.name}" deleted.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getBankAccountName = (id: string): string => {
    const account = bankAccounts.find((ba) => ba.id === id);
    return account != null ? `${account.accountName} (${account.accountNumber})` : id;
  };

  // Parent label options (exclude self when editing)
  const parentLabelOptions = labels.filter((l) => editingLabel == null || l.id !== editingLabel.id);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6" data-testid="label-manager-loading">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading labels...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md" data-testid="label-manager">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Labels</h2>
        <button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
          data-testid="create-label-button"
        >
          + Create Label
        </button>
      </div>

      {/* Messages */}
      {error != null && (
        <div
          className="mx-6 mt-4 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm"
          data-testid="error-message"
        >
          {error}
        </div>
      )}
      {successMessage != null && (
        <div
          className="mx-6 mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm"
          data-testid="success-message"
        >
          {successMessage}
        </div>
      )}

      {/* Create/Edit Form */}
      {isFormOpen && (
        <div
          className="mx-6 mt-4 border border-blue-200 rounded-lg p-4 bg-blue-50"
          data-testid="label-form"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingLabel != null ? `Edit Label: ${editingLabel.name}` : 'Create New Label'}
          </h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="label-name-input"
              />
            </div>

            {/* Parent Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Label (optional)
              </label>
              <select
                value={formParentLabelId}
                onChange={(e) => setFormParentLabelId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="parent-label-select"
              >
                <option value="">— No parent —</option>
                {parentLabelOptions.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                    {label.parentLabelName != null ? ` (child of ${label.parentLabelName})` : ''}
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
                <div
                  className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white"
                  data-testid="bank-account-checkboxes"
                >
                  {bankAccounts.map((ba) => (
                    <label key={ba.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formLinkedBankAccountIds.includes(ba.id)}
                        onChange={() => toggleBankAccount(ba.id)}
                        data-testid={`bank-account-checkbox-${ba.id}`}
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
                Regex Patterns (auto-labeling)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formRegexInput}
                  onChange={(e) => setFormRegexInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRegex();
                    }
                  }}
                  placeholder="/NETFLIX/i"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="regex-input"
                />
                <button
                  type="button"
                  onClick={addRegex}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-3 rounded text-sm transition duration-200"
                  data-testid="add-regex-button"
                >
                  Add
                </button>
              </div>
              {formLinkedRegexes.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="regex-list">
                  {formLinkedRegexes.map((regex) => (
                    <span
                      key={regex}
                      className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                    >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Value (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMaxValue}
                  onChange={(e) => setFormMaxValue(e.target.value)}
                  placeholder="e.g. 200.00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="max-value-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formMaxPercentage}
                  onChange={(e) => setFormMaxPercentage(e.target.value)}
                  placeholder="e.g. 10.00"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="max-percentage-input"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition duration-200"
                data-testid="submit-label-button"
              >
                {formSubmitting ? 'Saving...' : editingLabel != null ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded transition duration-200"
                data-testid="cancel-label-button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Labels List */}
      <div className="p-6">
        {labels.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No labels yet. Create your first label to start auto-labeling transfers.
          </p>
        ) : (
          <div className="space-y-2" data-testid="labels-list">
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-start justify-between border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition duration-150"
                data-testid={`label-item-${label.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{label.name}</span>
                    {label.parentLabelName != null && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        child of {label.parentLabelName}
                      </span>
                    )}
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
                  </div>

                  {label.linkedBankAccountIds.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {label.linkedBankAccountIds.map((id) => (
                        <span
                          key={id}
                          className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                        >
                          🏦 {getBankAccountName(id)}
                        </span>
                      ))}
                    </div>
                  )}

                  {label.linkedRegexes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {label.linkedRegexes.map((regex) => (
                        <span
                          key={regex}
                          className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono"
                        >
                          {regex}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(label)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    data-testid={`edit-label-${label.id}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(label)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                    data-testid={`delete-label-${label.id}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { LabelManager };

