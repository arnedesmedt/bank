import React, { useRef, useEffect } from 'react';

export interface SidebarPage {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    expanded: boolean;
    onToggle: () => void;
    pages: SidebarPage[];
    currentPage: string;
    onNavigate: (id: string) => void;
}

/**
 * T011/T012/T013/T014/T015 [US1]: Fixed, collapsible sidebar with always-visible icons,
 * keyboard navigation, ARIA roles, and hamburger toggle.
 * Does not scroll with main content (position: fixed).
 */
const Sidebar: React.FC<SidebarProps> = ({ expanded, onToggle, pages, currentPage, onNavigate }) => {
    const firstNavItemRef = useRef<HTMLButtonElement | null>(null);

    // Trap focus within sidebar when it's expanded on mobile (optional enhancement)
    useEffect(() => {
        if (expanded && firstNavItemRef.current) {
            firstNavItemRef.current.focus();
        }
    }, [expanded]);

    return (
        <>
            {/* Mobile overlay */}
            {expanded && (
                <div
                    className="fixed inset-0 bg-black/40 z-20 lg:hidden"
                    aria-hidden="true"
                    onClick={onToggle}
                />
            )}

            <nav
                role="navigation"
                aria-label="Main navigation"
                aria-expanded={expanded}
                className={`
                    fixed top-0 left-0 h-full z-30 flex flex-col
                    bg-gray-900 text-white
                    transition-all duration-200 ease-in-out
                    ${expanded ? 'w-56' : 'w-16'}
                    shadow-xl
                `}
            >
                {/* Hamburger / Toggle button */}
                <div className="flex items-center justify-between px-3 py-4 border-b border-gray-700">
                    {expanded && (
                        <span className="text-base font-bold text-white tracking-wide truncate select-none">
                            Bank App
                        </span>
                    )}
                    <button
                        onClick={onToggle}
                        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        aria-controls="sidebar-nav-list"
                        className={`
                            p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400
                            transition-colors duration-150
                            ${expanded ? 'ml-auto' : 'mx-auto'}
                        `}
                        data-testid="sidebar-toggle"
                    >
                        {/* Hamburger icon */}
                        <HamburgerIcon />
                    </button>
                </div>

                {/* Navigation items */}
                <ul
                    id="sidebar-nav-list"
                    role="list"
                    className="flex flex-col flex-1 py-3 gap-1 px-2 overflow-y-auto"
                >
                    {pages.map((page, index) => {
                        const isActive = currentPage === page.id;
                        return (
                            <li key={page.id} role="listitem">
                                <button
                                    ref={index === 0 ? firstNavItemRef : undefined}
                                    onClick={() => onNavigate(page.id)}
                                    aria-label={page.label}
                                    aria-current={isActive ? 'page' : undefined}
                                    title={!expanded ? page.label : undefined}
                                    className={`
                                        w-full flex items-center gap-3 rounded-lg px-3 py-2.5
                                        transition-colors duration-150 text-left
                                        focus:outline-none focus:ring-2 focus:ring-blue-400
                                        ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }
                                    `}
                                    data-testid={`nav-${page.id}`}
                                >
                                    {/* Icon — always visible */}
                                    <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">
                                        {page.icon}
                                    </span>
                                    {/* Label — only visible when expanded */}
                                    {expanded && (
                                        <span className="text-sm font-medium truncate">
                                            {page.label}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
};

const HamburgerIcon: React.FC = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export default Sidebar;

