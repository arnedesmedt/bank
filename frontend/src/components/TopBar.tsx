import React from 'react';

interface TopBarProps {
    title: string;
    onBack?: () => void;
    userEmail?: string;
    onLogout?: () => void;
    quickActions?: React.ReactNode[];
}

/**
 * T017/T018/T019/T020 [US2]: Fixed top bar with back button, page title, and quick actions.
 * Accessible: ARIA labels, visible focus states.
 */
const TopBar: React.FC<TopBarProps> = ({ title, onBack, userEmail, onLogout, quickActions }) => {
    return (
        <header
            role="banner"
            aria-label="Top navigation bar"
            className="bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 h-14 flex-shrink-0 shadow-sm z-10"
        >
            {/* Left: Back button + page title */}
            <div className="flex items-center gap-3 min-w-0">
                {onBack && (
                    <button
                        onClick={onBack}
                        aria-label="Go back"
                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-shrink-0 transition-colors duration-150"
                        data-testid="topbar-back-button"
                    >
                        <BackArrowIcon />
                    </button>
                )}
                <h1
                    className="text-base sm:text-lg font-semibold text-gray-800 truncate"
                    data-testid="topbar-title"
                >
                    {title}
                </h1>
            </div>

            {/* Right: Quick actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Custom quick actions */}
                {quickActions?.map((action, idx) => (
                    <React.Fragment key={idx}>{action}</React.Fragment>
                ))}

                {/* User menu */}
                {userEmail && (
                    <div className="flex items-center gap-2 ml-2">
                        <span
                            className="hidden sm:block text-sm text-gray-600 truncate max-w-[140px]"
                            aria-label={`Logged in as ${userEmail}`}
                        >
                            {userEmail}
                        </span>
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                aria-label="Sign out"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors duration-150"
                                data-testid="topbar-logout-button"
                            >
                                <SignOutIcon />
                                <span className="hidden sm:block">Sign Out</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

const BackArrowIcon: React.FC = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const SignOutIcon: React.FC = () => (
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
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
        />
    </svg>
);

export default TopBar;

