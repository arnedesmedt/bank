import React, { useState } from 'react';
import { TransferList } from '../components/TransferList';
import { ActionBar } from '../components/ActionBar';
import { TransferImport } from '../components/TransferImport';
import { useNotifications } from '../components/NotificationProvider';

/**
 * TransferListPage — wraps TransferList with an ActionBar.
 *
 * T013: CSV import is surfaced as a button in the ActionBar.
 * T014: Shows floating notifications after import completion.
 * The import panel in TransferList itself is hidden (hideImportPanel).
 * T015: ActionBar is hidden when no actions (context-sensitive).
 */
const TransferListPage: React.FC = () => {
    const { addNotification } = useNotifications();
    const [showImportModal, setShowImportModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="space-y-0">
            {/* T013: Action bar with CSV import button */}
            <ActionBar>
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
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                    </svg>
                    Import CSV
                </button>
            </ActionBar>

            {/* Transfer list — import panel hidden since ActionBar button is used */}
            <div className="mt-4 px-0">
                <TransferList hideImportPanel externalRefreshKey={refreshKey} />
            </div>

            {/* T014: CSV import modal */}
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
                                onImportComplete={(result) => {
                                    setShowImportModal(false);
                                    setRefreshKey((k) => k + 1);
                                    if (result.errors.length > 0) {
                                        addNotification({
                                            type: 'warning',
                                            message: `Import finished: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} error(s).`,
                                            autoClose: false,
                                        });
                                    } else if (result.imported > 0) {
                                        addNotification({
                                            type: 'success',
                                            message: `Import complete! ${result.imported} transfer(s) imported, ${result.skipped} skipped.`,
                                        });
                                    } else {
                                        addNotification({
                                            type: 'info',
                                            message: `Import finished: no new transfers. ${result.skipped} duplicate(s) skipped.`,
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

