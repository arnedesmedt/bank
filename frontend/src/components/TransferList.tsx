import { useCallback, useEffect, useState } from 'react';
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
  fromAccountNumber: string | null;
  fromAccountName: string | null;
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

/**
 * T017/T018: Transfer list with embedded collapsible import panel (right side)
 * and auto-refresh after upload. T024: Shows manual/automatic label badges.
 */
export function TransferList() {
  const { accessToken } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadTransfers = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/transfers?page=${page}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load transfers');

      const data = (await response.json()) as Transfer[] | unknown;
      setTransfers(Array.isArray(data) ? (data as Transfer[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, accessToken]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  // T018: Auto-update after import
  const handleImportComplete = useCallback(() => {
    void loadTransfers();
  }, [loadTransfers]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span className="text-gray-600">Loading transfers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={() => void loadTransfers()}
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
      {/* T016: Right-side collapsible import panel */}
      <TransferImport onImportComplete={handleImportComplete} />

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Transfers</h2>
        </div>

        {transfers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No transfers found. Use the ◀ Import button on the right to import a CSV file.
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
                    <tr key={transfer.id} className={transfer.isInternal ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transfer.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Amount amount={transfer.amount} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{transfer.fromAccountName}</div>
                        <div className="text-gray-500 text-xs">{transfer.fromAccountNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{transfer.toAccountName}</div>
                        <div className="text-gray-500 text-xs">{transfer.toAccountNumber}</div>
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
                          {/* T024: Show manual/automatic badge distinction */}
                          {(transfer.labelLinks ?? []).map((link) => (
                            <span
                              key={link.id}
                              title={link.isManual ? 'Manually assigned' : 'Auto-assigned'}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                link.isManual
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {link.isManual ? '🖊 ' : '⚙ '}{link.name}
                            </span>
                          ))}
                          {/* Fallback for older API responses without labelLinks */}
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

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={transfers.length < 30}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

