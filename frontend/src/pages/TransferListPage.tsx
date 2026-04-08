import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [showImportModal, setShowImportModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [filters, setFilters] = usePersistedFilters();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [internalAccounts, setInternalAccounts] = useState<BankAccount[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);

    // Create a wrapper function that updates filters and URL
    const handleFiltersChange = (newFilters: typeof filters) => {
        setFilters(newFilters);
        
        // Update URL to reflect current filters
        const params = new URLSearchParams();
        
        if (newFilters.search) params.set('search', newFilters.search);
        if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
        if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);
        if (newFilters.labelIds.length > 0) {
            newFilters.labelIds.forEach(id => params.append('labelIds[]', id));
        }
        if (newFilters.accountIds.length > 0) {
            newFilters.accountIds.forEach(id => params.append('accountIds[]', id));
        }
        if (newFilters.excludeInternal) {
            params.set('excludeInternal', 'true');
        }
        
        const queryString = params.toString();
        const newPath = queryString ? `?${queryString}` : '';
        navigate(newPath, { replace: true });
    };

    // Apply URL parameters to filters (but only if they exist, otherwise keep persisted filters)
    useEffect(() => {
        const urlFilters: Partial<typeof filters> = {};
        let hasUrlFilters = false;

        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const search = searchParams.get('search');
        const labelIds = searchParams.getAll('labelIds[]');
        const accountIds = searchParams.getAll('accountIds[]');
        const excludeInternal = searchParams.get('excludeInternal');

        if (dateFrom) { urlFilters.dateFrom = dateFrom; hasUrlFilters = true; }
        if (dateTo) { urlFilters.dateTo = dateTo; hasUrlFilters = true; }
        if (search) { urlFilters.search = search; hasUrlFilters = true; }
        if (labelIds.length > 0) { urlFilters.labelIds = labelIds; hasUrlFilters = true; }
        if (accountIds.length > 0) { urlFilters.accountIds = accountIds; hasUrlFilters = true; }
        if (excludeInternal === 'true') { urlFilters.excludeInternal = true; hasUrlFilters = true; }

        // If URL parameters are present, replace all filters (don't merge with existing)
        if (hasUrlFilters) {
            const newFilters = {
                search: urlFilters.search || '',
                dateFrom: urlFilters.dateFrom || '',
                dateTo: urlFilters.dateTo || '',
                labelIds: urlFilters.labelIds || [],
                accountIds: urlFilters.accountIds || [],
                amountMin: filters.amountMin,  // Preserve existing amount filters
                amountMax: filters.amountMax,  // Preserve existing amount filters
                amountOperator: filters.amountOperator,  // Preserve existing amount filters
                excludeInternal: urlFilters.excludeInternal ?? false
            };
            
            setFilters(newFilters);
        }
    }, [searchParams]); // Remove setFilters from dependencies to prevent loops

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
                onFiltersChange={handleFiltersChange}
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
