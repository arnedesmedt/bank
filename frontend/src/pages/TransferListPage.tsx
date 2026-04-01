import React, { useEffect, useState } from 'react';
import { fetchBankAccounts } from '../services/bankAccountsService';
import type { BankAccount } from '../services/bankAccountsService';
import type { Label } from '../services/labelsService';
import type { BulkAction, AccountOption } from '../components/ActionBar';
import { useNotifications } from '../components/NotificationProvider';
import { useAuth } from '../contexts/AuthContext';
import { ActionBar } from '../components/ActionBar';
import { TransferList } from '../components/TransferList';
import { TransferImport, type ImportResult } from '../components/TransferImport';
import { fetchLabels } from '../services/labelsService';
import { usePersistedFilters } from '../hooks/usePersistedFilters';

/**
 * TransferListPage — wraps TransferList with an ActionBar with full filter support.
 * - Search, date range, label filter
 * - CSV import button
 * - Multi-select + bulk actions
 */

const TransferListPage: React.FC = () => {
    const { addNotification } = useNotifications();
    const { accessToken } = useAuth();
    const [showImportModal, setShowImportModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [filters, setFilters] = usePersistedFilters();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [internalAccounts, setInternalAccounts] = useState<BankAccount[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);

    // Fetch internal accounts
    useEffect(() => {
        if (!accessToken) return;
        fetchBankAccounts(accessToken)
            .then((accounts) => setInternalAccounts(accounts.filter((a) => a.isInternal)))
            .catch(() => setInternalAccounts([]));
    }, [accessToken]);

    // Fetch labels
    useEffect(() => {
        if (!accessToken) return;
        fetchLabels(accessToken)
            .then(setLabels)
            .catch(() => setLabels([]));
    }, [accessToken]);

    const accountOptions: AccountOption[] = internalAccounts.map((a) => ({
        id: a.id,
        name: a.accountName ?? a.accountNumber ?? a.id,
    }));

    const labelOptions = labels.map((l) => ({ id: l.id, name: l.name }));

    const handleBulkAction = (_action: BulkAction) => {
        // Bulk action is handled inside TransferList; here we just refresh if needed
        setRefreshKey((k) => k + 1);
    };

    return (
        <div className="space-y-0">
            {/* Action bar with filters + import button */}
            <ActionBar
                filters={filters}
                onFiltersChange={setFilters}
                availableLabels={labelOptions}
                availableAccounts={accountOptions}
                selectedCount={selectedIds.length}
                onBulkAction={handleBulkAction}
            >
                <button
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-haspopup="dialog"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import CSV
                </button>
            </ActionBar>
            
            {/* Transfer list */}
            <div className="mt-4 px-0">
                <TransferList
                    hideImportPanel
                    externalRefreshKey={refreshKey}
                    filters={filters}
                    availableLabels={labelOptions}
                    selectedIds={selectedIds}
                    onSelectedIdsChange={setSelectedIds}
                    onBulkAction={handleBulkAction}
                />
            </div>
            
            {/* CSV import modal */}
            {showImportModal && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="import-modal-title"
                >
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <div>
                                <h2 id="import-modal-title" className="text-lg font-bold text-gray-800">
                                    Import Transfers
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Upload a Belfius CSV file</p>
                            </div>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none focus:outline-none"
                                aria-label="Close import modal"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <TransferImport
                                compact
                                onImportComplete={(result: ImportResult) => {
                                    setShowImportModal(false);
                                    setRefreshKey((k) => k + 1);

                                    // Build a skip-reason breakdown string
                                    const skipParts: string[] = [];
                                    if (result.skippedDuplicates > 0)
                                        skipParts.push(`${result.skippedDuplicates} duplicate${result.skippedDuplicates !== 1 ? 's' : ''}`);
                                    if (result.skippedReversedInternal > 0)
                                        skipParts.push(`${result.skippedReversedInternal} reversed internal`);
                                    if (result.skippedInvalidData > 0)
                                        skipParts.push(`${result.skippedInvalidData} invalid row${result.skippedInvalidData !== 1 ? 's' : ''}`);

                                    const skipSummary = skipParts.length > 0
                                        ? ` Skipped: ${skipParts.join(', ')}.`
                                        : '';

                                    if (result.errors.length > 0) {
                                        addNotification({
                                            type: 'warning',
                                            message: `Import finished: ${result.imported} imported.${skipSummary} ${result.errors.length} error(s): ${result.errors.join(' | ')}`,
                                            autoClose: false,
                                        });
                                    } else if (result.imported > 0) {
                                        addNotification({
                                            type: 'success',
                                            message: `Import complete! ${result.imported} transfer${result.imported !== 1 ? 's' : ''} imported.${skipSummary}`,
                                        });
                                    } else {
                                        addNotification({
                                            type: 'info',
                                            message: `Import finished: no new transfers.${skipSummary || ' Nothing to import.'}`,
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransferListPage;
