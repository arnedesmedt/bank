// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as service from '../src/services/bankAccountsService';
import BankAccountsListPage from '../src/pages/BankAccountsListPage';

// Mock AuthContext so the page gets a token without a real provider
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

// Mock BankAccountEditPage to avoid deep rendering
vi.mock('../src/pages/BankAccountEditPage', () => ({
    default: ({ onCancel, bankAccountId }: { onCancel: () => void; bankAccountId: string }) => (
        <div data-testid="edit-page">
            <span>Editing {bankAccountId}</span>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ),
}));

const mockAccounts: service.BankAccount[] = [
    {
        id: '1',
        accountName: 'Main Account',
        accountNumber: 'BE68539007547034',
        linkedLabelIds: ['l-1'],
        isInternal: true,
        totalBalance: '1250.50',
    },
    {
        id: '2',
        accountName: 'Savings',
        accountNumber: 'BE71096400007055',
        linkedLabelIds: [],
        isInternal: false,
        totalBalance: '0.00',
    },
];

describe('BankAccountsListPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders bank accounts list', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue(mockAccounts);
        render(<BankAccountsListPage />);
        await waitFor(() => {
            expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
            expect(screen.getByText('Main Account')).toBeInTheDocument();
            expect(screen.getByText('Savings')).toBeInTheDocument();
        });
    });

    it('shows account numbers in the list', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue(mockAccounts);
        render(<BankAccountsListPage />);
        await waitFor(() => {
            expect(screen.getByText('BE68539007547034')).toBeInTheDocument();
        });
    });

    it('shows internal status indicator for internal accounts', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue(mockAccounts);
        render(<BankAccountsListPage />);
        await waitFor(() => {
            // Internal account shows ✓ indicator
            expect(screen.getAllByTestId('internal-indicator').length).toBeGreaterThanOrEqual(1);
            // Internal badge
            expect(screen.getByText(/Yes ✓/)).toBeInTheDocument();
        });
    });

    it('shows edit button for each account', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue(mockAccounts);
        render(<BankAccountsListPage />);
        await waitFor(() => {
            expect(screen.getByTestId('edit-bank-account-1')).toBeInTheDocument();
            expect(screen.getByTestId('edit-bank-account-2')).toBeInTheDocument();
        });
    });

    it('navigates to edit page on edit click', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue(mockAccounts);
        render(<BankAccountsListPage />);
        await waitFor(() => expect(screen.getByTestId('edit-bank-account-1')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('edit-bank-account-1'));
        await waitFor(() => expect(screen.getByTestId('edit-page')).toBeInTheDocument());
    });

    it('shows empty state when no accounts', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue([]);
        render(<BankAccountsListPage />);
        await waitFor(() => {
            expect(screen.getByText('No bank accounts found.')).toBeInTheDocument();
        });
    });

    it('shows error state on fetch failure', async () => {
        vi.spyOn(service, 'fetchBankAccounts').mockRejectedValue(new Error('API error'));
        render(<BankAccountsListPage />);
        await waitFor(() => {
            expect(screen.getByText('Failed to load bank accounts.')).toBeInTheDocument();
        });
    });
});
