// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as service from '../src/services/bankAccountsService';
import BankAccountsListPage from '../src/pages/BankAccountsListPage';

// Mock AuthContext so the page gets a token without a real provider
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

const mockAccounts: service.BankAccount[] = [
    { id: '1', accountName: 'Main Account', accountNumber: 'BE68539007547034', linkedLabelIds: ['l-1'] },
    { id: '2', accountName: 'Savings', accountNumber: 'BE71096400007055', linkedLabelIds: [] },
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
