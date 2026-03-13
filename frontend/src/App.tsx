import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { TransferList } from './components/TransferList';
import BankAccountsListPage from './pages/BankAccountsListPage';
import LabelsListPage from './pages/LabelsListPage';
import { useState } from 'react';

type Page = 'transfers' | 'bank-accounts' | 'labels';

function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('transfers');

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

  const navItems: { id: Page; label: string }[] = [
    { id: 'transfers', label: 'Transfers' },
    { id: 'bank-accounts', label: 'Bank Accounts' },
    { id: 'labels', label: 'Labels' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bank Application</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition duration-200"
            >
              Sign Out
            </button>
          </div>

          {/* Navigation tabs */}
          <nav className="mt-4 flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'transfers' && <TransferList />}
        {currentPage === 'bank-accounts' && <BankAccountsListPage />}
        {currentPage === 'labels' && <LabelsListPage />}
      </main>
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
