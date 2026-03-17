/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    /** Whether the notification auto-closes after `duration` ms. Default: true */
    autoClose?: boolean;
    /** Duration in milliseconds before auto-closing. Default: 5000 */
    duration?: number;
}

interface NotificationContextValue {
    addNotification: (notification: Omit<Notification, 'id'>) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error('useNotifications must be used inside <NotificationProvider>');
    }
    return ctx;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const typeStyles: Record<NotificationType, { bar: string; icon: string }> = {
    success: { bar: 'bg-green-50 border-green-400 text-green-800', icon: '✓' },
    error: { bar: 'bg-red-50 border-red-400 text-red-800', icon: '✗' },
    info: { bar: 'bg-blue-50 border-blue-400 text-blue-800', icon: 'ℹ' },
    warning: { bar: 'bg-yellow-50 border-yellow-400 text-yellow-800', icon: '⚠' },
};

// ── Single notification item ─────────────────────────────────────────────────

function NotificationItem({
    notification,
    onClose,
}: {
    notification: Notification;
    onClose: () => void;
}) {
    const styles = typeStyles[notification.type];

    return (
        <div
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg w-80 max-w-sm ${styles.bar}`}
        >
            <span className="text-lg font-bold shrink-0 leading-tight" aria-hidden="true">
                {styles.icon}
            </span>
            <p className="flex-1 text-sm font-medium leading-snug wrap-break-word">
                {notification.message}
            </p>
            <button
                onClick={onClose}
                aria-label="Close notification"
                className="shrink-0 ml-1 text-xl font-bold opacity-50 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-current rounded"
            >
                ×
            </button>
        </div>
    );
}

// ── Counter for unique IDs ────────────────────────────────────────────────────

let counter = 0;

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * NotificationProvider wraps the app and provides floating toast notifications.
 *
 * Features:
 * - Stacking: multiple notifications stack vertically in the top-right corner
 * - Auto-close: each notification closes after `duration` ms (default 5 s)
 * - Navigation clear: all notifications are dismissed when the route changes
 * - Accessible: each notification has role="alert" and aria-live="polite"
 *
 * Must be rendered inside <BrowserRouter> so it can use useLocation.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const location = useLocation();
    const prevPathname = useRef(location.pathname);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // T016: Clear notifications on route change
    useEffect(() => {
        if (prevPathname.current !== location.pathname) {
            timers.current.forEach((t) => clearTimeout(t));
            timers.current.clear();
            setNotifications([]);
            prevPathname.current = location.pathname;
        }
    }, [location.pathname]);

    const removeNotification = useCallback((id: string) => {
        const timer = timers.current.get(id);
        if (timer !== undefined) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addNotification = useCallback(
        (notif: Omit<Notification, 'id'>): string => {
            const id = `notif-${++counter}`;
            const full: Notification = { autoClose: true, duration: 5000, ...notif, id };
            setNotifications((prev) => [...prev, full]);

            if (full.autoClose) {
                const timer = setTimeout(() => removeNotification(id), full.duration ?? 5000);
                timers.current.set(id, timer);
            }

            return id;
        },
        [removeNotification],
    );

    const clearAll = useCallback(() => {
        timers.current.forEach((t) => clearTimeout(t));
        timers.current.clear();
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ addNotification, removeNotification, clearAll }}>
            {children}

            {/* T017: Stacked floating notifications – top-right corner */}
            {notifications.length > 0 && (
                <div
                    className="fixed top-4 right-4 z-50 flex flex-col gap-2"
                    aria-label="Notifications"
                    role="region"
                    aria-live="polite"
                >
                    {notifications.map((n) => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onClose={() => removeNotification(n.id)}
                        />
                    ))}
                </div>
            )}
        </NotificationContext.Provider>
    );
}

