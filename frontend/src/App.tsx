import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { NotificationProvider } from './components/NotificationProvider';
import BankAccountsListPage from './pages/BankAccountsListPage';
import LabelsListPage from './pages/LabelsListPage';
import BankAccountDetailPage from './pages/BankAccountDetailPage';
import LabelDetailPage from './pages/LabelDetailPage';
import TransferDetailPage from './pages/TransferDetailPage';
import TransferListPage from './pages/TransferListPage';
import GroupByPage from './pages/GroupByPage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useState, useMemo, useEffect } from 'react';
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
    useParams,
} from 'react-router-dom';

type Page = 'transfers' | 'bank-accounts' | 'labels' | 'group-by' | 'settings';

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

const GroupByIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// ── Page titles map ──────────────────────────────────────────────────────────
const PAGE_TITLES: Record<Page, string> = {
    transfers: 'Transfers',
    'bank-accounts': 'Bank Accounts',
    labels: 'Labels',
    'group-by': 'Group By & Analysis',
    settings: 'Settings',
};

// ── Route wrapper: reads :id param and renders BankAccountDetailPage ─────────
function BankAccountDetailRoute() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) return <Navigate to="/accounts" replace />;

    return (
        <BankAccountDetailPage
            bankAccountId={id}
            onBack={() => navigate('/accounts')}
            onDeleted={() => navigate('/accounts')}
        />
    );
}

function AppContent() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    // Derive current page from the URL pathname
    const currentPage = useMemo<Page>(() => {
        if (location.pathname.startsWith('/accounts')) return 'bank-accounts';
        if (location.pathname.startsWith('/labels')) return 'labels';
        if (location.pathname.startsWith('/group-by')) return 'group-by';
        if (location.pathname.startsWith('/settings')) return 'settings';
        return 'transfers';
    }, [location.pathname]);

    // Update page title dynamically
    useEffect(() => {
        let title = PAGE_TITLES[currentPage];
        document.title = `${title} - Bank App`;
    }, [currentPage]);

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
        { id: 'group-by' as Page, label: 'Group By', icon: <GroupByIcon /> },
    ];

    const footerPages = [
        { id: 'settings' as Page, label: 'Settings', icon: <SettingsIcon /> },
    ];

    const sidebarWidth = sidebarExpanded ? 'ml-56' : 'ml-16';

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <Sidebar
                expanded={sidebarExpanded}
                onToggle={() => setSidebarExpanded((prev) => !prev)}
                pages={navPages}
                footerPages={footerPages}
                currentPage={currentPage}
                onNavigate={(id: string) => {
                    if (id === 'transfers') navigate('/transfers');
                    else if (id === 'bank-accounts') navigate('/accounts');
                    else if (id === 'labels') navigate('/labels');
                    else if (id === 'group-by') navigate('/group-by');
                    else if (id === 'settings') navigate('/settings');
                    // Auto-close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) setSidebarExpanded(false);
                }}
            />

            {/* ── Main area ────────────────────────────────────────────────── */}
            <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 ${sidebarWidth}`}>
                {/* ── Top bar ──────────────────────────────────────────────── */}
                <TopBar
                    title={PAGE_TITLES[currentPage]}
                    userEmail={user?.email}
                    onLogout={logout}
                />

                {/* ── Page content ─────────────────────────────────────────── */}
                <main
                    className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
                    id="main-content"
                    aria-label="Main content"
                >
                    <Routes>
                        <Route path="/" element={<Navigate to="/transfers" replace />} />
                        <Route path="/transfers" element={<TransferListPage />} />
                        <Route path="/transfers/:id" element={<TransferDetailPage />} />
                        <Route path="/accounts" element={<BankAccountsListPage />} />
                        <Route path="/accounts/:id" element={<BankAccountDetailRoute />} />
                        <Route path="/labels" element={<LabelsListPage />} />
                        <Route path="/labels/:id" element={<LabelDetailPage />} />
                        <Route path="/group-by" element={<GroupByPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/transfers" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <NotificationProvider>
                    <AppContent />
                </NotificationProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
