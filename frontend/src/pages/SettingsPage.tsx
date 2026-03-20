import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../components/NotificationProvider';
import { deleteAllTransfers } from '../services/transfersService';

/**
 * Settings page — exposes administrative / destructive actions.
 * Currently provides the ability to wipe all transfer records after
 * a two-step confirmation.
 */
const SettingsPage: React.FC = () => {
    const { accessToken } = useAuth();
    const { addNotification } = useNotifications();

    // Confirmation dialog state
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDeleteAll = async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const result = await deleteAllTransfers(accessToken);
            setShowConfirm(false);
            addNotification({
                type: 'success',
                message: `All transfers deleted successfully (${result.deleted} record${result.deleted !== 1 ? 's' : ''} removed).`,
            });
        } catch (err) {
            addNotification({
                type: 'error',
                message: err instanceof Error ? err.message : 'Failed to delete transfers.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-8">
            {/* ── Danger Zone ────────────────────────────────────────────── */}
            <section
                className="bg-white rounded-lg shadow-md border border-red-200 overflow-hidden"
                aria-labelledby="danger-zone-heading"
            >
                <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                    <h2
                        id="danger-zone-heading"
                        className="text-lg font-semibold text-red-700 flex items-center gap-2"
                    >
                        <WarningIcon />
                        Danger Zone
                    </h2>
                    <p className="text-sm text-red-600 mt-1">
                        Actions in this section are irreversible. Proceed with extreme caution.
                    </p>
                </div>

                <div className="px-6 py-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="font-medium text-gray-800">Remove all transfers</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Permanently delete every transfer record from the database. Labels and
                            bank accounts are kept, but all transaction history is wiped and bank
                            account balances are reset to €0.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-haspopup="dialog"
                    >
                        Delete all transfers
                    </button>
                </div>
            </section>

            {/* ── Confirmation dialog ─────────────────────────────────────── */}
            {showConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                >
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <WarningIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3
                                    id="confirm-dialog-title"
                                    className="text-base font-semibold text-gray-900"
                                >
                                    Are you sure?
                                </h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    This will permanently delete{' '}
                                    <strong>all transfers</strong> from the database and reset all
                                    bank account balances to <strong>€0</strong>.
                                    This action{' '}
                                    <strong className="text-red-600">cannot be undone</strong>.
                                    Labels and bank accounts will not be removed.
                                </p>
                            </div>
                        </div>

                        {/* Warning callout */}
                        <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            ⚠️ All transaction history will be permanently lost. Make sure you have
                            a backup if needed.
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void handleDeleteAll()}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 flex items-center gap-2"
                            >
                                {loading && (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                                {loading ? 'Deleting…' : 'Yes, delete everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Icon ─────────────────────────────────────────────────────────────────────

interface WarningIconProps {
    className?: string;
}

const WarningIcon: React.FC<WarningIconProps> = ({ className = 'w-5 h-5' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export default SettingsPage;



