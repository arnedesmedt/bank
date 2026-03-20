import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TransferImport } from './TransferImport';
import Amount from './Amount';
import { fetchTransfers, bulkAction } from '../services/transfersService';
import type { Transfer, BulkActionRequest } from '../services/transfersService';
import type { TransferFilters, BulkAction, LabelOption } from './ActionBar';
const PAGE_SIZE = 30;
interface TransferListProps {
    hideImportPanel?: boolean;
    externalRefreshKey?: number;
    /** If set, filters are applied to the API call */
    filters?: TransferFilters;
    /** Available labels for bulk action controls */
    availableLabels?: LabelOption[];
    /** Controlled selected IDs (for parent lifting) */
    selectedIds?: string[];
    onSelectedIdsChange?: (ids: string[]) => void;
    /** When selectedCount > 0, parent can trigger bulk actions */
    onBulkAction?: (action: BulkAction) => void;
}
export function TransferList({
    hideImportPanel = false,
    externalRefreshKey = 0,
    filters,
    availableLabels = [],
    selectedIds: externalSelectedIds,
    onSelectedIdsChange,
    onBulkAction,
}: TransferListProps) {
    const { accessToken } = useAuth();
    const navigate = useNavigate();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // ── Selection state ───────────────────────────────────────────────────────
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
    const selectedIds = externalSelectedIds ?? internalSelectedIds;
    const setSelectedIds = useCallback(
        (ids: string[]) => {
            setInternalSelectedIds(ids);
            onSelectedIdsChange?.(ids);
        },
        [onSelectedIdsChange],
    );
    // ── Collapsed refund rows ─────────────────────────────────────────────────
    const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
    // Sentinel element observed at the bottom of the list
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const isFetchingRef = useRef(false);
    const fetchPage = useCallback(
        async (pageNum: number, replace: boolean) => {
            if (!accessToken) return;
            isFetchingRef.current = true;
            if (replace) {
                setInitialLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);
            try {
                const data = await fetchTransfers(
                    {
                        page: pageNum,
                        search: filters?.search,
                        dateFrom: filters?.dateFrom,
                        dateTo: filters?.dateTo,
                        labelIds: filters?.labelIds,
                        accountIds: filters?.accountIds,
                    },
                    accessToken,
                );
                if (replace) {
                    setTransfers(data);
                    setSelectedIds([]); // clear selection on reload
                } else {
                    setTransfers((prev) => [...prev, ...data]);
                }
                setHasMore(data.length >= PAGE_SIZE);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error occurred');
            } finally {
                setInitialLoading(false);
                setLoadingMore(false);
                isFetchingRef.current = false;
            }
        },
        [accessToken, filters, setSelectedIds],
    );
    // Reset and reload when filters or refresh key changes
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        void fetchPage(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalRefreshKey, accessToken, filters?.search, filters?.dateFrom, filters?.dateTo, JSON.stringify(filters?.labelIds), JSON.stringify(filters?.accountIds)]);
    // Load next pages when page increments
    useEffect(() => {
        if (page === 1) return;
        void fetchPage(page, false);
    }, [page, fetchPage]);
    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetchingRef.current && hasMore) {
                    setPage((prev) => prev + 1);
                }
            },
            { rootMargin: '200px' },
        );
        const el = sentinelRef.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [hasMore, initialLoading]);
    const handleImportComplete = useCallback(() => {
        setPage(1);
        setHasMore(true);
        void fetchPage(1, true);
    }, [fetchPage]);
    // ── Selection helpers ────────────────────────────────────────────────────
    const toggleSelect = useCallback(
        (id: string) => {
            setSelectedIds(
                selectedIds.includes(id)
                    ? selectedIds.filter((x) => x !== id)
                    : [...selectedIds, id],
            );
        },
        [selectedIds, setSelectedIds],
    );
    const allVisibleIds = transfers.map((t) => t.id);
    const allSelected   = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));
    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : allVisibleIds);
    };
    // ── Bulk action handler ──────────────────────────────────────────────────
    const handleBulkAction = useCallback(
        async (action: BulkAction) => {
            if (!accessToken || selectedIds.length === 0) return;
            const request: BulkActionRequest = {
                action: action.action,
                transferIds: selectedIds,
                labelId: action.labelId,
                parentTransferId: action.parentTransferId,
            };
            try {
                await bulkAction(request, accessToken);
                setSelectedIds([]);
                void fetchPage(1, true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Bulk action failed');
            }
            onBulkAction?.(action);
        },
        [accessToken, selectedIds, fetchPage, setSelectedIds, onBulkAction],
    );
    // ── Refund collapsing ────────────────────────────────────────────────────
    const toggleCollapse = (parentId: string) => {
        setCollapsedParents((prev) => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else next.add(parentId);
            return next;
        });
    };
    // Build a map: parentId → childRefund transfers
    const childrenByParent = new Map<string, Transfer[]>();
    const rootTransfers: Transfer[] = [];
    for (const t of transfers) {
        if (t.parentTransferId) {
            const arr = childrenByParent.get(t.parentTransferId) ?? [];
            arr.push(t);
            childrenByParent.set(t.parentTransferId, arr);
        } else {
            rootTransfers.push(t);
        }
    }
    // ── Totals ───────────────────────────────────────────────────────────────
    const totalIn  = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) > 0 ? parseFloat(t.amount) : 0), 0);
    const totalOut = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) < 0 ? parseFloat(t.amount) : 0), 0);
    const net      = totalIn + totalOut;
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    const formatAmount = (n: number) => {
        const abs  = Math.abs(n).toFixed(2);
        const sign = n < 0 ? '−' : n > 0 ? '+' : '';
        return `${sign}${abs}`;
    };
    if (initialLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
                    <span className="text-gray-600">Loading transfers…</span>
                </div>
            </div>
        );
    }
    if (error && transfers.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="bg-red-50 border border-red-200 rounded p-4">
                    <p className="text-red-800">Error: {error}</p>
                    <button onClick={() => void fetchPage(1, true)} className="mt-2 text-sm text-blue-600 hover:underline">
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    const renderRow = (transfer: Transfer, isChild = false) => (
        <tr
            key={transfer.id}
            className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                transfer.isInternal ? 'bg-gray-50' : ''
            } ${isChild ? 'border-l-4 border-indigo-200' : ''}`}
            onClick={() => navigate(`/transfers/${transfer.id}`)}
        >
            {/* Select checkbox */}
            <td className="px-3 py-4 w-8" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={selectedIds.includes(transfer.id)}
                    onChange={() => toggleSelect(transfer.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    aria-label={`Select transfer ${transfer.id}`}
                />
            </td>
            {/* Collapse toggle for parent (if has children) */}
            <td className="px-1 py-4 w-6">
                {childrenByParent.has(transfer.id) && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(transfer.id); }}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={collapsedParents.has(transfer.id) ? 'Expand refunds' : 'Collapse refunds'}
                    >
                        <svg className={`w-4 h-4 transition-transform ${collapsedParents.has(transfer.id) ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
                {isChild && <span className="text-indigo-400 text-xs ml-1">↳</span>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(transfer.date)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Amount amount={transfer.amount} />
            </td>
            <td className="px-6 py-4 text-sm text-gray-900">
                {transfer.fromAccountId ? (
                    <Link
                        to={`/accounts/${transfer.fromAccountId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group hover:text-blue-600"
                        aria-label={`View account: ${transfer.fromAccountName ?? transfer.fromAccountNumber ?? 'Unknown'}`}
                    >
                        <div className="font-medium group-hover:underline">{transfer.fromAccountName}</div>
                        <div className="text-gray-500 text-xs">{transfer.fromAccountNumber}</div>
                    </Link>
                ) : (
                    <>
                        <div className="font-medium">{transfer.fromAccountName}</div>
                        <div className="text-gray-500 text-xs">{transfer.fromAccountNumber}</div>
                    </>
                )}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900">
                {transfer.toAccountId ? (
                    <Link
                        to={`/accounts/${transfer.toAccountId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group hover:text-blue-600"
                        aria-label={`View account: ${transfer.toAccountName ?? transfer.toAccountNumber ?? 'Unknown'}`}
                    >
                        <div className="font-medium group-hover:underline">{transfer.toAccountName}</div>
                        <div className="text-gray-500 text-xs">{transfer.toAccountNumber}</div>
                    </Link>
                ) : (
                    <>
                        <div className="font-medium">{transfer.toAccountName}</div>
                        <div className="text-gray-500 text-xs">{transfer.toAccountNumber}</div>
                    </>
                )}
            </td>
            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {transfer.reference}
            </td>
            <td className="px-6 py-4 text-sm">
                <div className="flex flex-wrap gap-1">
                    {transfer.isInternal && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                            Internal
                        </span>
                    )}
                    {transfer.parentTransferId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            Refund
                        </span>
                    )}
                    {(transfer.labelLinks ?? []).map((link) => (
                        <button
                            key={link.id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/labels/${link.id}`); }}
                            title={link.isManual ? 'Manually assigned' : 'Auto-assigned'}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity ${
                                link.isManual ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                            {link.isManual ? '🖊 ' : '⚙ '}{link.name}
                        </button>
                    ))}
                    {(!transfer.labelLinks || transfer.labelLinks.length === 0) &&
                        transfer.labelNames.map((label, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {label}
                            </span>
                        ))}
                </div>
            </td>
        </tr>
    );
    const renderTree = () => {
        const rows: React.ReactNode[] = [];
        for (const parent of rootTransfers) {
            rows.push(renderRow(parent, false));
            const children = childrenByParent.get(parent.id) ?? [];
            if (children.length > 0 && !collapsedParents.has(parent.id)) {
                for (const child of children) {
                    rows.push(renderRow(child, true));
                }
            }
        }
        return rows;
    };
    return (
        <>
            {!hideImportPanel && <TransferImport onImportComplete={handleImportComplete} />}
            <div className="bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="text-2xl font-bold text-gray-800">Transfers</h2>
                    {/* Totals summary */}
                    {transfers.length > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-600 font-medium">In: +{totalIn.toFixed(2)}</span>
                            <span className="text-red-600 font-medium">Out: {totalOut.toFixed(2)}</span>
                            <span className={`font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                Net: {formatAmount(net)}
                            </span>
                        </div>
                    )}
                </div>
                {transfers.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        {filters?.search || filters?.dateFrom || filters?.dateTo || (filters?.labelIds?.length ?? 0) > 0 || (filters?.accountIds?.length ?? 0) > 0
                            ? 'No transfers match the current filters.'
                            : 'No transfers found. Use the Import button to import a CSV file.'}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 w-8">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={toggleSelectAll}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                aria-label="Select all transfers"
                                            />
                                        </th>
                                        <th className="px-1 py-3 w-6" />
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labels</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {renderTree()}
                                </tbody>
                            </table>
                        </div>
                        {/* Inline error */}
                        {error && (
                            <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-800 text-sm flex items-center justify-between">
                                <span>Failed to load more transfers.</span>
                                <button onClick={() => void fetchPage(page, false)} className="underline">Retry</button>
                            </div>
                        )}
                        {/* Sentinel + loading indicator */}
                        <div ref={sentinelRef} className="px-6 py-4 flex items-center justify-center min-h-[56px]">
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                                    Loading more…
                                </div>
                            )}
                            {!hasMore && !loadingMore && transfers.length > 0 && (
                                <p className="text-xs text-gray-400">All {transfers.length} transfers loaded</p>
                            )}
                        </div>
                    </>
                )}
            </div>
            {/* Bulk action panel (when selection active) */}
            {selectedIds.length > 0 && onBulkAction && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-indigo-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40">
                    <span className="text-sm font-medium">{selectedIds.length} selected</span>
                    {availableLabels.length > 0 && (
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    void handleBulkAction({ action: 'apply_label', labelId: e.target.value });
                                    e.target.value = '';
                                }
                            }}
                            className="text-xs text-gray-900 rounded px-2 py-1"
                            defaultValue=""
                            aria-label="Apply label to selected"
                        >
                            <option value="">Apply label…</option>
                            {availableLabels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleBulkAction({ action: 'remove_refund' })}
                        className="text-xs bg-white/20 hover:bg-white/30 rounded px-3 py-1"
                    >
                        Remove refund link
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="text-xs text-white/70 hover:text-white"
                        aria-label="Clear selection"
                    >
                        ✕
                    </button>
                </div>
            )}
        </>
    );
}
