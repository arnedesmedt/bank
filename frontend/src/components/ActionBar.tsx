import React from 'react';

interface ActionBarProps {
    children?: React.ReactNode;
    className?: string;
}

/**
 * ActionBar renders a horizontal toolbar of page-level actions below the TopBar.
 * It scrolls with the page content and is automatically hidden when no actions
 * are provided (context-sensitive — T015).
 */
export function ActionBar({ children, className = '' }: ActionBarProps) {
    // T015: Hide if no children
    if (!children || React.Children.count(children) === 0) return null;

    return (
        <div
            className={`flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-3 bg-white border-b border-gray-200 shadow-sm ${className}`}
            role="toolbar"
            aria-label="Page actions"
        >
            {children}
        </div>
    );
}

