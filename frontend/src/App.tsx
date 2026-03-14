import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { TransferList } from './components/TransferList';
import BankAccountsListPage from './pages/BankAccountsListPage';
import LabelsListPage from './pages/LabelsListPage';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useState } from 'react';

type Page = 'transfers' | 'bank-accounts' | 'labels';

// ── Icons (inline SVG) ───────────────────────────────────────────────────────
const TransfersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

const BankAccountsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-4 9 4M3 6v14a1 1 0 001 1h5v-5h4v5h5a1 1 0 001-1V6M3 6h18" />
    </svg>
);

const LabelsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
);

// ── Page titles map ──────────────────────────────────────────────────────────
const PAGE_TITLES: Record<Page, string> = {
    transfers: 'Transfers',
    'bank-accounts': 'Bank Accounts',
    labels: 'Labels',
};

function AppContent() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState<Page>('transfers');
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginForm />;
    }

    const navPages = [
        { id: 'transfers' as Page, label: 'Transfers', icon: <TransfersIcon /> },
        { id: 'bank-accounts' as Page, label: 'Bank Accounts', icon: <BankAccountsIcon /> },
        { id: 'labels' as Page, label: 'Labels', icon: <LabelsIcon /> },
    ];

    // Sidebar width for offset
    const sidebarWidth = sidebarExpanded ? 'ml-56' : 'ml-16';

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* ── Sidebar (T009/T011-T015) ─────────────────────────────────── */}
            <Sidebar
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded((prev) => !prev)}
                pages={navPages}
                currentPage={currentPage}
                onNavigate={(id: string) => {
                    setCurrentPage(id as Page);
                    // Auto-close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) setSidebarExpanded(false);
                }}
            />

            {/* ── Main area (offset by sidebar width) ─────────────────────── */}
            <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 ${sidebarWidth}`}>
                {/* ── Top bar (T017-T020) ──────────────────────────────────── */}
                <TopBar
                    title={PAGE_TITLES[currentPage]}
                    userEmail={user?.email}
                    onLogout={logout}
                />

                {/* ── Page content ──────────────────────────────────────────── */}
                <main
                    className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
                    id="main-content"
                    aria-label="Main content"
                >
                    {currentPage === 'transfers' && <TransferList />}
                    {currentPage === 'bank-accounts' && <BankAccountsListPage />}
                    {currentPage === 'labels' && <LabelsListPage />}
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
