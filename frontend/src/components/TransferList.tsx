import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TransferImport } from './TransferImport';
import { API_URL } from '../services/apiClient';
import Amount from './Amount';

interface LabelLink {
  id: string;
  name: string;
  isManual: boolean;
}

interface Transfer {
  id: string;
  amount: string;
  date: string;
  fromAccountId: string | null;
  fromAccountNumber: string | null;
  fromAccountName: string | null;
  toAccountId: string | null;
  toAccountNumber: string | null;
  toAccountName: string | null;
  reference: string;
  csvSource: string;
  transactionId: string | null;
  isInternal: boolean;
  labelIds: string[];
  labelNames: string[];
  labelLinks: LabelLink[];
}

const PAGE_SIZE = 30;

interface TransferListProps {
  hideImportPanel?: boolean;
  externalRefreshKey?: number;
}

export function TransferList({ hideImportPanel = false, externalRefreshKey = 0 }: TransferListProps) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sentinel element observed at the bottom of the list
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Prevent the observer from firing multiple concurrent fetches
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (!accessToken) return;
    isFetchingRef.current = true;

    if (replace) {
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/transfers?page=${pageNum}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load transfers');

      const data = (await response.json()) as unknown;
      const page_data = Array.isArray(data) ? (data as Transfer[]) : [];

      if (replace) {
        setTransfers(page_data);
      } else {
        setTransfers((prev) => [...prev, ...page_data]);
      }

      setHasMore(page_data.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [accessToken]);

  // Reset and reload from page 1 whenever externalRefreshKey changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRefreshKey, accessToken]);

  // Load next pages when page increments (but not on the initial load handled above)
  useEffect(() => {
    if (page === 1) return;
    void fetchPage(page, false);
  }, [page, fetchPage]);

  // IntersectionObserver: when sentinel becomes visible, load next page
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

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, initialLoading]);

  // T018: Auto-update after import (resets to page 1)
  const handleImportComplete = useCallback(() => {
    setPage(1);
    setHasMore(true);
    void fetchPage(1, true);
  }, [fetchPage]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  if (initialLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span className="text-gray-600">Loading transfers...</span>
        </div>
      </div>
    );
  }

  if (error && transfers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={() => void fetchPage(1, true)}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hideImportPanel && <TransferImport onImportComplete={handleImportComplete} />}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Transfers</h2>
        </div>

        {transfers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No transfers found. Use the Import button to import a CSV file.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labels</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfers.map((transfer) => (
                    <tr
                      key={transfer.id}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${transfer.isInternal ? 'bg-gray-50' : ''}`}
                      onClick={() => navigate(`/transfers/${transfer.id}`)}
                    >
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
                          {(transfer.labelLinks ?? []).map((link) => (
                            <button
                              key={link.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/labels/${link.id}`); }}
                              title={link.isManual ? 'Manually assigned – click to view label' : 'Auto-assigned – click to view label'}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity ${
                                link.isManual ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {link.isManual ? '🖊 ' : '⚙ '}{link.name}
                            </button>
                          ))}
                          {(!transfer.labelLinks || transfer.labelLinks.length === 0) &&
                            transfer.labelNames.map((label, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {label}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inline error when more-page load fails */}
            {error && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-800 text-sm flex items-center justify-between">
                <span>Failed to load more transfers.</span>
                <button onClick={() => void fetchPage(page, false)} className="underline">
                  Retry
                </button>
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
    </>
  );
}

