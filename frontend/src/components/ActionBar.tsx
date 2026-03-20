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

    // ── Label dropdown ────────────────────────────────────────────────────────
    const [labelMenuOpen, setLabelMenuOpen] = useState(false);
    const labelMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) {
                setLabelMenuOpen(false);
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
                            selected={filters.dateFrom ? new Date(filters.dateFrom) : null}
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
                            selected={filters.dateTo ? new Date(filters.dateTo) : null}
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
                                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-64 overflow-y-auto"
                                    role="listbox"
                                    aria-label="Filter by label"
                                    aria-multiselectable="true"
                                >
                                    {availableLabels.map((label) => (
                                        <button
                                            key={label.id}
                                            type="button"
                                            role="option"
                                            aria-selected={filters.labelIds.includes(label.id)}
                                            onClick={() => toggleLabel(label.id)}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                                filters.labelIds.includes(label.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                            }`}
                                        >
                                            <span
                                                className={`w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center ${
                                                    filters.labelIds.includes(label.id)
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {filters.labelIds.includes(label.id) && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </span>
                                            {label.name}
                                        </button>
                                    ))}
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
                                onFiltersChange!({ search: '', dateFrom: '', dateTo: '', labelIds: [], accountIds: [] });
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

                            {/* Remove refund link */}
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onBulkAction!({ action: 'remove_refund' });
                                    setBulkMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                Remove refund link
                            </button>
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
