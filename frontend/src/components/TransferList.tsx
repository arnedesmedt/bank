import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TransferImport } from './TransferImport';
import Amount from './Amount';
import { fetchTransfers, bulkAction } from '../services/transfersService';
import type { Transfer, BulkActionRequest } from '../services/transfersService';
import type { TransferFilters, BulkAction, LabelOption } from './ActionBar';

const PAGE_SIZE = 30;

// Utility function for handling Ctrl+click to open in new tab
const handleCtrlClick = (e: React.MouseEvent, url: string) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        window.open(url, '_blank');
    } else {
        // Normal navigation
        window.location.href = url;
    }
};

interface TransferListProps {
    hideImportPanel?: boolean;
    externalRefreshKey?: number;
    filters?: TransferFilters;
    availableLabels?: LabelOption[];
    selectedIds?: string[];
    onSelectedIdsChange?: (ids: string[]) => void;
    onBulkAction?: (action: BulkAction) => void;
}

// ── TransferList ──────────────────────────────────────────────────────────────

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

    // ── Normal selection state ─────────────────────────────────────────────────
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
    const selectedIds = externalSelectedIds ?? internalSelectedIds;
    const setSelectedIds = useCallback(
        (ids: string[]) => {
            setInternalSelectedIds(ids);
            onSelectedIdsChange?.(ids);
        },
        [onSelectedIdsChange],
    );

    // ── Inline refund-linking mode ────────────────────────────────────────────
    // When linkRefundParentId is set the page is in "refund-linking mode":
    // clicking any eligible row toggles it as a refund candidate.
    const [linkRefundParentId, setLinkRefundParentId] = useState<string | null>(null);
    const [linkRefundSelected, setLinkRefundSelected] = useState<string[]>([]);

    const linkRefundParent = linkRefundParentId
        ? (transfers.find((t) => t.id === linkRefundParentId) ?? null)
        : null;

    const alreadyChildrenOfParent = new Set(linkRefundParent?.childRefundIds ?? []);

    const parentAmount = parseFloat(linkRefundParent?.amount ?? '0');
    const linkRefundSum = linkRefundSelected.reduce((sum, id) => {
        const t = transfers.find((x) => x.id === id);
        return sum + (t ? parseFloat(t.amount) : 0);
    }, 0);
    const linkRefundNewAmount = parentAmount + linkRefundSum;

    const toggleRefundSelection = (id: string) =>
        setLinkRefundSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const cancelLinkRefund = () => {
        setLinkRefundParentId(null);
        setLinkRefundSelected([]);
    };

    // ── Collapsed refund rows ─────────────────────────────────────────────────
    const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

    // Auto-collapse any parent that has children (only adds, never removes from set
    // so user can explicitly expand without it snapping back on scroll).
    useEffect(() => {
        setCollapsedParents((prev) => {
            let changed = false;
            const next = new Set(prev);
            for (const t of transfers) {
                if ((t.childRefundIds?.length ?? 0) > 0 && !next.has(t.id)) {
                    next.add(t.id);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [transfers]);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const isFetchingRef = useRef(false);

    const fetchPage = useCallback(
        async (pageNum: number, replace: boolean) => {
            if (!accessToken) return;
            isFetchingRef.current = true;
            if (replace) {
                setInitialLoading(true);
                setCollapsedParents(new Set()); // reset collapse state on full reload
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
                        amountMin: filters?.amountMin,
                        amountMax: filters?.amountMax,
                        amountOperator: filters?.amountOperator,
                    },
                    accessToken,
                );
                if (replace) {
                    setTransfers(data);
                    setSelectedIds([]);
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

    // Reloads all pages that are currently in memory so users don't lose their scroll
    // position after a refund confirm (which would otherwise only reload page 1).
    const reloadAllLoadedPages = useCallback(async () => {
        if (!accessToken) return;
        isFetchingRef.current = true;
        setInitialLoading(true);
        setCollapsedParents(new Set());
        setError(null);
        try {
            const allTransfers: Transfer[] = [];
            for (let p = 1; p <= page; p++) {
                const data = await fetchTransfers(
                    {
                        page: p,
                        search: filters?.search,
                        dateFrom: filters?.dateFrom,
                        dateTo: filters?.dateTo,
                        labelIds: filters?.labelIds,
                        accountIds: filters?.accountIds,
                        amountMin: filters?.amountMin,
                        amountMax: filters?.amountMax,
                        amountOperator: filters?.amountOperator,
                    },
                    accessToken,
                );
                allTransfers.push(...data);
                if (data.length < PAGE_SIZE) break;
            }
            setTransfers(allTransfers);
            setSelectedIds([]);
            setHasMore(allTransfers.length >= page * PAGE_SIZE);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setInitialLoading(false);
            isFetchingRef.current = false;
        }
    }, [accessToken, filters, page, setSelectedIds]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        void fetchPage(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalRefreshKey, accessToken, filters?.search, filters?.dateFrom, filters?.dateTo, JSON.stringify(filters?.labelIds), JSON.stringify(filters?.accountIds)]);

    useEffect(() => {
        if (page === 1) return;
        void fetchPage(page, false);
    }, [page, fetchPage]);

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

    // ── Normal selection helpers ───────────────────────────────────────────────
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
    const toggleSelectAll = () => setSelectedIds(allSelected ? [] : allVisibleIds);

    // ── Bulk action handler ────────────────────────────────────────────────────
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

    // ── Confirm refund linking ─────────────────────────────────────────────────
    const handleConfirmLinkRefunds = useCallback(async () => {
        if (!accessToken || !linkRefundParentId || linkRefundSelected.length === 0) return;
        const request: BulkActionRequest = {
            action: 'mark_refund',
            transferIds: linkRefundSelected,
            parentTransferId: linkRefundParentId,
        };
        try {
            await bulkAction(request, accessToken);
            setLinkRefundParentId(null);
            setLinkRefundSelected([]);
            setSelectedIds([]);
            // Reload ALL loaded pages so transfers around the refund period stay visible
            void reloadAllLoadedPages();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to link refunds');
        }
    }, [accessToken, linkRefundParentId, linkRefundSelected, reloadAllLoadedPages, setSelectedIds]);

    // ── Refund collapsing ──────────────────────────────────────────────────────
    const toggleCollapse = (parentId: string) => {
        setCollapsedParents((prev) => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else next.add(parentId);
            return next;
        });
    };

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

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalIn  = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) > 0 ? parseFloat(t.amount) : 0), 0);
    const totalOut = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) < 0 ? parseFloat(t.amount) : 0), 0);
    const net      = totalIn + totalOut;

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

    // ── Row renderer ───────────────────────────────────────────────────────────
    const renderRow = (transfer: Transfer, isChild = false) => {
        const isLinking          = linkRefundParentId !== null;
        const isThisParent       = transfer.id === linkRefundParentId;
        const isAlreadyChild     = alreadyChildrenOfParent.has(transfer.id);
        const isSelectedAsRefund = linkRefundSelected.includes(transfer.id);
        const isLinkedElsewhere  = !isThisParent && !isAlreadyChild && !!transfer.parentTransferId;

        const hasRefundChildren = childrenByParent.has(transfer.id);
        const isCollapsedParent = hasRefundChildren && collapsedParents.has(transfer.id);

        // Row visual class
        let rowClass = 'transition-colors ';
        if (isLinking) {
            if (isThisParent) {
                rowClass += 'bg-blue-50 ring-2 ring-inset ring-blue-400 cursor-default';
            } else if (isAlreadyChild) {
                rowClass += 'bg-indigo-50 opacity-60 cursor-default';
            } else if (isSelectedAsRefund) {
                rowClass += 'bg-amber-50 cursor-pointer hover:bg-amber-100';
            } else {
                rowClass += `cursor-pointer hover:bg-green-50 ${transfer.isInternal ? 'bg-gray-50' : ''}`;
            }
        } else {
            // Collapsed parents with refunds get a subtle amber-left-border highlight
            const parentHighlight = isCollapsedParent ? 'border-l-4 border-amber-400 bg-amber-50/30' : '';
            rowClass += `cursor-pointer hover:bg-blue-50 ${transfer.isInternal ? 'bg-gray-50' : ''} ${isChild ? 'border-l-4 border-indigo-200' : ''} ${parentHighlight}`;
        }

        const handleRowClick = (e: React.MouseEvent) => {
            if (isLinking) {
                if (isThisParent || isAlreadyChild) return;
                toggleRefundSelection(transfer.id);
            } else {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+click opens in new tab
                    e.preventDefault();
                    window.open(`/transfers/${transfer.id}`, '_blank');
                } else {
                    navigate(`/transfers/${transfer.id}`);
                }
            }
        };

        return (
            <tr key={transfer.id} className={rowClass} onClick={handleRowClick}>
                {/* Checkbox column */}
                <td className="px-3 py-4 w-8" onClick={(e) => e.stopPropagation()}>
                    {isLinking ? (
                        isThisParent ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">P</span>
                        ) : isAlreadyChild ? (
                            <input type="checkbox" checked disabled className="h-4 w-4 text-indigo-400 rounded border-gray-300 opacity-50" />
                        ) : (
                            <input
                                type="checkbox"
                                checked={isSelectedAsRefund}
                                onChange={() => toggleRefundSelection(transfer.id)}
                                className="h-4 w-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400"
                                aria-label={`Select as refund: ${transfer.id}`}
                            />
                        )
                    ) : (
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(transfer.id)}
                            onChange={() => toggleSelect(transfer.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            aria-label={`Select transfer ${transfer.id}`}
                        />
                    )}
                </td>

                {/* Collapse toggle / child indicator */}
                <td className="px-1 py-4 w-6">
                    {!isLinking && childrenByParent.has(transfer.id) && (
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
                    {isChild && !isLinking && <span className="text-indigo-400 text-xs ml-1">↳</span>}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(transfer.date)}</td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isThisParent && linkRefundSelected.length > 0 ? (
                        <>
                            <Amount amount={linkRefundNewAmount.toFixed(2)} />
                            <div className="text-xs text-gray-400 line-through">
                                <Amount amount={transfer.amount} />
                            </div>
                        </>
                    ) : (
                        <>
                            <Amount amount={transfer.amount} />
                            {transfer.amountBeforeRefund != null && transfer.amountBeforeRefund !== transfer.amount && (
                                <div className="text-xs text-gray-400 line-through">
                                    <Amount amount={transfer.amountBeforeRefund} />
                                </div>
                            )}
                        </>
                    )}
                </td>

                <td className="px-6 py-4 text-sm text-gray-900">
                    {transfer.fromAccountId ? (
                        <Link
                            to={`/accounts/${transfer.fromAccountId}`}
                            onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    window.open(`/accounts/${transfer.fromAccountId}`, '_blank');
                                } else {
                                    e.stopPropagation();
                                }
                            }}
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
                            onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    window.open(`/accounts/${transfer.toAccountId}`, '_blank');
                                } else {
                                    e.stopPropagation();
                                }
                            }}
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

                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{transfer.reference}</td>

                <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                        {isThisParent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                Parent
                            </span>
                        )}
                        {isSelectedAsRefund && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500 text-white">
                                ✓ Refund
                            </span>
                        )}
                        {isAlreadyChild && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                Already linked
                            </span>
                        )}
                        {isLinkedElsewhere && isLinking && (
                            <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700"
                                title="Currently linked to another transfer — selecting will move it here"
                            >
                                linked elsewhere
                            </span>
                        )}
                        {!isThisParent && !isSelectedAsRefund && !isAlreadyChild && transfer.isInternal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">Internal</span>
                        )}
                        {!isThisParent && !isSelectedAsRefund && !isAlreadyChild && !isLinking && transfer.parentTransferId && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">Refund</span>
                        )}
                        {/* Collapsed-parent refund count badge */}
                        {!isLinking && isCollapsedParent && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleCollapse(transfer.id); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
                                title="Click to expand refunds"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                {(childrenByParent.get(transfer.id)?.length ?? 0)} refund{(childrenByParent.get(transfer.id)?.length ?? 0) !== 1 ? 's' : ''} ▶
                            </button>
                        )}
                        {(transfer.labelLinks ?? []).filter((link) => !link.isArchived).map((link) => (
                            <button
                                key={link.id}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleCtrlClick(e, `/labels/${link.labelId || ''}`);
                                }}
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
    };

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

    const isLinking = linkRefundParentId !== null;

    return (
        <>
            {!hideImportPanel && <TransferImport onImportComplete={handleImportComplete} />}

            <div className={`bg-white rounded-lg shadow-md ${isLinking ? 'ring-2 ring-blue-300' : ''}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {isLinking ? (
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold">
                                Refund linking
                            </span>
                            <span className="text-sm text-gray-700">
                                Click transfers below to mark them as refunds of{' '}
                                <span className="font-semibold">
                                    <Amount amount={linkRefundParent?.amount ?? '0'} />
                                </span>{' '}
                                on {linkRefundParent ? formatDate(linkRefundParent.date) : ''}
                            </span>
                        </div>
                    ) : (
                        <h2 className="text-2xl font-bold text-gray-800">Transfers</h2>
                    )}
                    {!isLinking && transfers.length > 0 && (
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
                                            {!isLinking && (
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleSelectAll}
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    aria-label="Select all transfers"
                                                />
                                            )}
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
                        {error && (
                            <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-800 text-sm flex items-center justify-between">
                                <span>Failed to load more transfers.</span>
                                <button onClick={() => void fetchPage(page, false)} className="underline">Retry</button>
                            </div>
                        )}
                        <div ref={sentinelRef} className="px-6 py-4 flex items-center justify-center min-h-14">
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

            {/* ── Refund-linking confirmation bar ──────────────────────────── */}
            {isLinking && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40 max-w-3xl">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {linkRefundSelected.length === 0 ? (
                        <span className="text-sm text-blue-200">Click rows to select refunds…</span>
                    ) : (
                        <span className="text-sm">
                            <span className="font-semibold">{linkRefundSelected.length} refund{linkRefundSelected.length > 1 ? 's' : ''}</span>
                            {' · '}sum: <span className="font-medium">{linkRefundSum >= 0 ? '+' : ''}{linkRefundSum.toFixed(2)}</span>
                            {' · '}new amount:{' '}
                            <span className={`font-semibold ${linkRefundNewAmount >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                {linkRefundNewAmount >= 0 ? '+' : ''}{linkRefundNewAmount.toFixed(2)}
                            </span>
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={linkRefundSelected.length === 0}
                        onClick={() => void handleConfirmLinkRefunds()}
                        className="text-xs bg-white text-blue-700 font-semibold rounded px-3 py-1 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Confirm
                    </button>
                    <button
                        type="button"
                        onClick={cancelLinkRefund}
                        className="text-xs text-blue-200 hover:text-white"
                        aria-label="Cancel refund linking"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ── Normal floating bulk action panel ────────────────────────── */}
            {!isLinking && selectedIds.length > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-indigo-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40">
                    <span className="text-sm font-medium">{selectedIds.length} selected</span>

                    {availableLabels.length > 0 && onBulkAction && (
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

                    {selectedIds.length === 1 && (
                        <button
                            type="button"
                            onClick={() => {
                                setLinkRefundParentId(selectedIds[0] ?? null);
                                setLinkRefundSelected([]);
                            }}
                            className="text-xs bg-white/20 hover:bg-white/30 rounded px-3 py-1 flex items-center gap-1"
                            aria-label="Link refund transfers"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Link Refunds
                        </button>
                    )}

                    {selectedIds.some((id) => transfers.find((t) => t.id === id)?.parentTransferId) && (
                        <button
                            type="button"
                            onClick={() => void handleBulkAction({ action: 'remove_refund' })}
                            className="text-xs bg-white/20 hover:bg-white/30 rounded px-3 py-1 flex items-center gap-1"
                            aria-label="Remove refund link"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Remove Refund Link
                        </button>
                    )}

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
