import React, { useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransferFilters {
    search: string;
    dateFrom: string;
    dateTo: string;
    labelIds: string[];
    accountIds: string[];
    amountMin: string;
    amountMax: string;
    amountOperator: 'eq' | 'lt' | 'gt' | 'lte' | 'gte';
    excludeInternal: boolean;
}

export interface LabelOption {
    id: string;
    name: string;
}

export interface AccountOption {
    id: string;
    name: string;
}

export interface BulkAction {
    action: 'apply_label' | 'remove_label' | 'mark_refund' | 'remove_refund';
    labelId?: string;
    parentTransferId?: string;
}

interface ActionBarProps {
    /** Arbitrary children (e.g. import button) placed on the right */
    children?: React.ReactNode;
    className?: string;

    // ── Filter props ─────────────────────────────────────────────────────────
    /** When provided, enables the search/date/label filter UI */
    filters?: TransferFilters;
    onFiltersChange?: (filters: TransferFilters) => void;
    availableLabels?: LabelOption[];
    availableAccounts?: AccountOption[];

    // ── Bulk action props ────────────────────────────────────────────────────
    /** Number of currently selected transfers */
    selectedCount?: number;
    onBulkAction?: (action: BulkAction) => void;
}

const DEBOUNCE_MS = 300;

/**
 * ActionBar — a horizontal toolbar placed below the TopBar.
 *
 * Features:
 * - Search input (debounced full-text)
 * - Date range picker (from / to)
 * - Multi-label filter dropdown
 * - Bulk action controls (when selectedCount > 0)
 * - Custom children (e.g. Import CSV button)
 *
 * All filter controls are hidden when no `filters` prop is provided.
 * The bar itself is hidden when it has nothing to render (no children, no filters).
 */
export function ActionBar({
    children,
    className = '',
    filters,
    onFiltersChange,
    availableLabels = [],
    availableAccounts = [],
    selectedCount = 0,
    onBulkAction,
}: ActionBarProps) {
    const hasFilters   = filters !== undefined && onFiltersChange !== undefined;
    const hasBulkActions = selectedCount > 0 && onBulkAction !== undefined;
    const hasContent   = children || hasFilters || hasBulkActions;

    // ── Local search state (debounced) ────────────────────────────────────────
    const [localSearch, setLocalSearch] = useState(filters?.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external filter changes back to local state
    useEffect(() => {
        setLocalSearch(filters?.search ?? '');
    }, [filters?.search]);

    const handleSearchChange = useCallback(
        (value: string) => {
            setLocalSearch(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                if (filters && onFiltersChange) {
                    onFiltersChange({ ...filters, search: value });
                }
            }, DEBOUNCE_MS);
        },
        [filters, onFiltersChange],
    );

    const [labelMenuOpen, setLabelMenuOpen] = useState(false);
    const [labelSearch, setLabelSearch] = useState('');
    const labelMenuRef = useRef<HTMLDivElement | null>(null);

    // Filter labels based on search term
    const filteredLabels = availableLabels.filter(label =>
        label.name.toLowerCase().includes(labelSearch.toLowerCase())
    );

    // Helper function to safely parse date strings
    const safeParseDate = (dateString: string): Date | null => {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) {
                setLabelMenuOpen(false);
                // Clear search when closing the dropdown
                setLabelSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleLabel = useCallback(
        (labelId: string) => {
            if (!filters || !onFiltersChange) return;
            const newIds = filters.labelIds.includes(labelId)
                ? filters.labelIds.filter((id) => id !== labelId)
                : [...filters.labelIds, labelId];
            onFiltersChange({ ...filters, labelIds: newIds });
        },
        [filters, onFiltersChange],
    );

    // ── Account dropdown ──────────────────────────────────────────────────────
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
                setAccountMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleAccount = useCallback(
        (accountId: string) => {
            if (!filters || !onFiltersChange) return;
            const current = filters.accountIds ?? [];
            const newIds = current.includes(accountId)
                ? current.filter((id) => id !== accountId)
                : [...current, accountId];
            onFiltersChange({ ...filters, accountIds: newIds });
        },
        [filters, onFiltersChange],
    );

    // ── Bulk action state ─────────────────────────────────────────────────────
    const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
    const [bulkLabelId, setBulkLabelId]   = useState('');
    const bulkMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
                setBulkMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!hasContent) return null;

    return (
        <div
            className={`flex flex-wrap items-center gap-2 px-3 py-3 bg-white border-b border-gray-200 shadow-sm ${className}`}
            role="toolbar"
            aria-label="Page actions"
        >
            {/* ── Filter controls ─────────────────────────────────────────── */}
            {hasFilters && (
                <>
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Search transfers…"
                            value={localSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label="Search transfers"
                        />
                    </div>

                    {/* Date from */}
                    <div className="relative">
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <DatePicker
                            selected={filters.dateFrom ? safeParseDate(filters.dateFrom) : null}
                            onChange={(date: Date | null) => {
                                const formatted = date
                                    ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
                                    : '';
                                onFiltersChange!({ ...filters, dateFrom: formatted });
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="From date"
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-36"
                            aria-label="Date from"
                            calendarStartDay={1}
                            showWeekNumbers
                            showYearDropdown
                            scrollableYearDropdown
                            dropdownMode="select"
                        />
                    </div>
                    <span className="text-gray-400 text-xs">–</span>
                    {/* Date to */}
                    <div className="relative">
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <DatePicker
                            selected={filters.dateTo ? safeParseDate(filters.dateTo) : null}
                            onChange={(date: Date | null) => {
                                const formatted = date
                                    ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
                                    : '';
                                onFiltersChange!({ ...filters, dateTo: formatted });
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="To date"
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-36"
                            aria-label="Date to"
                            calendarStartDay={1}
                            showWeekNumbers
                            showYearDropdown
                            scrollableYearDropdown
                            dropdownMode="select"
                        />
                    </div>

                    {/* Amount filter */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filters.amountOperator}
                            onChange={(e) => {
                                const value = e.target.value as TransferFilters['amountOperator'];
                                onFiltersChange!({ ...filters, amountOperator: value });
                            }}
                            className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 px-2 py-1.5"
                            aria-label="Amount operator"
                        >
                            <option value="eq">=</option>
                            <option value="lt">&lt;</option>
                            <option value="gt">&gt;</option>
                            <option value="lte">&le;</option>
                            <option value="gte">&ge;</option>
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={filters.amountMin}
                            onChange={(e) => {
                                onFiltersChange!({ ...filters, amountMin: e.target.value });
                            }}
                            className="text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 px-2 py-1.5 w-24"
                            aria-label="Amount value"
                        />
                    </div>

                    {/* Exclude internal transfers filter */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="excludeInternal"
                            checked={filters.excludeInternal}
                            onChange={(e) => {
                                onFiltersChange!({ ...filters, excludeInternal: e.target.checked });
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-400"
                        />
                        <label htmlFor="excludeInternal" className="text-sm text-gray-700 cursor-pointer">
                            Exclude internal transfers
                        </label>
                    </div>

                    {/* Label filter dropdown */}
                    {availableLabels.length > 0 && (
                        <div className="relative" ref={labelMenuRef}>
                            <button
                                type="button"
                                onClick={() => setLabelMenuOpen((o) => !o)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                aria-expanded={labelMenuOpen}
                                aria-haspopup="listbox"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Labels
                                {filters.labelIds.length > 0 && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-blue-600 text-white">
                                        {filters.labelIds.length}
                                    </span>
                                )}
                            </button>

                            {labelMenuOpen && (
                                <div
                                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-30"
                                    role="listbox"
                                    aria-label="Filter by label"
                                    aria-multiselectable="true"
                                >
                                    {/* Search input for labels */}
                                    <div className="p-2 border-b border-gray-100">
                                        <div className="relative">
                                            <svg
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                                aria-hidden="true"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                                            </svg>
                                            <input
                                                type="search"
                                                placeholder="Search labels…"
                                                value={labelSearch}
                                                onChange={(e) => setLabelSearch(e.target.value)}
                                                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                aria-label="Search labels"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Labels list */}
                                    <div className="max-h-48 overflow-y-auto">
                                        {/* Selected labels section */}
                                        {filters.labelIds.length > 0 && (
                                            <>
                                                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                                                    Selected Labels ({filters.labelIds.length})
                                                </div>
                                                {filters.labelIds.map((labelId) => {
                                                    const label = availableLabels.find(l => l.id === labelId);
                                                    if (!label) return null;
                                                    return (
                                                        <button
                                                            key={labelId}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={true}
                                                            onClick={(e) => {
                                                                if (e.ctrlKey || e.metaKey) {
                                                                    // Ctrl+click opens label details in new tab
                                                                    e.preventDefault();
                                                                    window.open(`/labels/${labelId}`, '_blank');
                                                                } else {
                                                                    // Normal click removes the label
                                                                    toggleLabel(labelId);
                                                                }
                                                            }}
                                                            onContextMenu={(e) => {
                                                                // Right-click also opens in new tab
                                                                e.preventDefault();
                                                                window.open(`/labels/${labelId}`, '_blank');
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 bg-blue-50 text-blue-700 border-b border-gray-100"
                                                            title={`${label.name} (Ctrl+click to view, click to remove)`}
                                                        >
                                                            <span className="w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center bg-blue-600 border-blue-600">
                                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </span>
                                                            <span className="flex-1">{label.name}</span>
                                                            <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    );
                                                })}
                                                {!labelSearch && (
                                                    <div className="px-3 py-2 text-xs text-gray-400 text-center border-b border-gray-100">
                                                        ──
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Available labels */}
                                        <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                                            Filter by Label
                                        </div>
                                        
                                        {/* No Labels option */}
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={filters.labelIds.includes('no-labels')}
                                            onClick={() => {
                                                // Toggle "no-labels" filter
                                                if (filters.labelIds.includes('no-labels')) {
                                                    // Remove no-labels filter
                                                    onFiltersChange!({ 
                                                        ...filters, 
                                                        labelIds: filters.labelIds.filter(id => id !== 'no-labels') 
                                                    });
                                                } else {
                                                    // Set only no-labels filter (clear other labels)
                                                    onFiltersChange!({ 
                                                        ...filters, 
                                                        labelIds: ['no-labels'] 
                                                    });
                                                }
                                            }}
                                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                                                filters.labelIds.includes('no-labels') ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                            <span className="flex-1">No Labels</span>
                                            {filters.labelIds.includes('no-labels') && (
                                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                        
                                        {filteredLabels.length > 0 && (
                                            <div className="px-3 py-2 text-xs text-gray-400 text-center border-b border-gray-100">
                                                ──
                                            </div>
                                        )}
                                        
                                        {filteredLabels.length > 0 ? (
                                            filteredLabels.map((label) => {
                                                // Skip if already in selected section
                                                if (filters.labelIds.includes(label.id)) return null;
                                                
                                                return (
                                                    <button
                                                        key={label.id}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={false}
                                                        onClick={(e) => {
                                                            if (e.ctrlKey || e.metaKey) {
                                                                // Ctrl+click opens label details in new tab
                                                                e.preventDefault();
                                                                window.open(`/labels/${label.id}`, '_blank');
                                                            } else {
                                                                // Normal click selects the label
                                                                toggleLabel(label.id);
                                                            }
                                                        }}
                                                        onContextMenu={(e) => {
                                                            // Right-click also opens in new tab
                                                            e.preventDefault();
                                                            window.open(`/labels/${label.id}`, '_blank');
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                                        title={`${label.name} (Ctrl+click to view, click to select)`}
                                                    >
                                                        <span className="w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center border-gray-300">
                                                        </span>
                                                        {label.name}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                                {labelSearch ? 'No labels found' : 'No labels available'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Account filter dropdown */}
                    {availableAccounts.length > 0 && (
                        <div className="relative" ref={accountMenuRef}>
                            <button
                                type="button"
                                onClick={() => setAccountMenuOpen((o) => !o)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                aria-expanded={accountMenuOpen}
                                aria-haspopup="listbox"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-4 9 4M3 6v14a1 1 0 001 1h5v-5h4v5h5a1 1 0 001-1V6M3 6h18" />
                                </svg>
                                Account
                                {(filters.accountIds ?? []).length > 0 && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-blue-600 text-white">
                                        {(filters.accountIds ?? []).length}
                                    </span>
                                )}
                            </button>

                            {accountMenuOpen && (
                                <div
                                    className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-64 overflow-y-auto"
                                    role="listbox"
                                    aria-label="Filter by account"
                                    aria-multiselectable="true"
                                >
                                    {availableAccounts.map((account) => (
                                        <button
                                            key={account.id}
                                            type="button"
                                            role="option"
                                            aria-selected={(filters.accountIds ?? []).includes(account.id)}
                                            onClick={() => toggleAccount(account.id)}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                                (filters.accountIds ?? []).includes(account.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                            }`}
                                        >
                                            <span
                                                className={`w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center ${
                                                    (filters.accountIds ?? []).includes(account.id)
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {(filters.accountIds ?? []).includes(account.id) && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </span>
                                            {account.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Clear filters */}
                    {(filters.search !== '' || filters.dateFrom !== '' || filters.dateTo !== '' || filters.labelIds.length > 0 || (filters.accountIds ?? []).length > 0) && (
                        <button
                            type="button"
                            onClick={() => {
                                setLocalSearch('');
                                onFiltersChange!({ search: '', dateFrom: '', dateTo: '', labelIds: [], accountIds: [], amountMin: '', amountMax: '', amountOperator: 'eq' as const });
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
                            aria-label="Clear all filters"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear
                        </button>
                    )}
                </>
            )}

            {/* ── Bulk action controls ────────────────────────────────────── */}
            {hasBulkActions && (
                <div className="relative ml-2" ref={bulkMenuRef}>
                    <button
                        type="button"
                        onClick={() => setBulkMenuOpen((o) => !o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        aria-expanded={bulkMenuOpen}
                        aria-haspopup="menu"
                    >
                        Bulk actions ({selectedCount})
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {bulkMenuOpen && (
                        <div
                            className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-30"
                            role="menu"
                        >
                            {/* Apply label */}
                            {availableLabels.length > 0 && (
                                <div className="p-2 border-b border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Apply label</p>
                                    <div className="flex gap-1">
                                        <select
                                            value={bulkLabelId}
                                            onChange={(e) => setBulkLabelId(e.target.value)}
                                            className="flex-1 text-xs border border-gray-300 rounded px-1 py-1"
                                            aria-label="Select label to apply"
                                        >
                                            <option value="">Select label…</option>
                                            {availableLabels.map((l) => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            disabled={!bulkLabelId}
                                            onClick={() => {
                                                if (bulkLabelId) {
                                                    onBulkAction!({ action: 'apply_label', labelId: bulkLabelId });
                                                    setBulkMenuOpen(false);
                                                }
                                            }}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Remove label */}
                            {availableLabels.length > 0 && (
                                <div className="p-2 border-b border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Remove label</p>
                                    <div className="flex gap-1">
                                        <select
                                            value={bulkLabelId}
                                            onChange={(e) => setBulkLabelId(e.target.value)}
                                            className="flex-1 text-xs border border-gray-300 rounded px-1 py-1"
                                            aria-label="Select label to remove"
                                        >
                                            <option value="">Select label…</option>
                                            {availableLabels.map((l) => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            disabled={!bulkLabelId}
                                            onClick={() => {
                                                if (bulkLabelId) {
                                                    onBulkAction!({ action: 'remove_label', labelId: bulkLabelId });
                                                    setBulkMenuOpen(false);
                                                }
                                            }}
                                            className="px-2 py-1 text-xs bg-orange-500 text-white rounded disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Spacer + children ───────────────────────────────────────── */}
            {(hasFilters || hasBulkActions) && children && (
                <div className="flex-1" />
            )}
            {children}
        </div>
    );
}
