// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as service from '../src/services/bankAccountsService';
import BankAccountDetailPage from '../src/pages/BankAccountDetailPage';

// Mock AuthContext
vi.mock('../src/contexts/AuthContext', () => ({
    useAuth: () => ({ accessToken: 'test-token' }),
}));

const mockAccount: service.BankAccount = {
    id: 'acct-1',
    accountName: 'Main Account',
    accountNumber: 'BE68 5390 0754 7034',
    linkedLabelIds: [],
    isInternal: true,
    totalBalance: '1250.50',
};

const mockTransfers: service.BankAccountTransfer[] = [
    {
        id: 'txn-1',
        amount: '100.00',
        date: '2026-01-15T00:00:00Z',
        fromAccountNumber: 'BE68 5390 0754 7034',
        fromAccountName: 'Main Account',
        toAccountNumber: null,
        toAccountName: 'Coffee Shop',
        reference: 'Coffee',
        isInternal: false,
        labelIds: [],
        labelLinks: [],
    },
    {
        id: 'txn-2',
        amount: '500.00',
        date: '2026-01-10T00:00:00Z',
        fromAccountNumber: null,
        fromAccountName: 'Employer',
        toAccountNumber: 'BE68 5390 0754 7034',
        toAccountName: 'Main Account',
        reference: 'Salary',
        isInternal: false,
        labelIds: [],
        labelLinks: [],
    },
];

describe('BankAccountDetailPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders account name and number', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByTestId('account-detail-name')).toHaveTextContent('Main Account');
            expect(screen.getByText('BE68 5390 0754 7034')).toBeInTheDocument();
        });
    });

    it('shows edit and delete buttons in view mode', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByTestId('edit-account-button')).toBeInTheDocument();
            expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
        });
    });

    it('shows edit form when edit button is clicked', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => screen.getByTestId('edit-account-button'));

        fireEvent.click(screen.getByTestId('edit-account-button'));
        expect(screen.getByTestId('account-name-input')).toBeInTheDocument();
        expect(screen.getByTestId('save-account-button')).toBeInTheDocument();
    });

    it('pre-fills edit form with current account name', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => screen.getByTestId('edit-account-button'));

        fireEvent.click(screen.getByTestId('edit-account-button'));
        const input = screen.getByTestId('account-name-input') as HTMLInputElement;
        expect(input.value).toBe('Main Account');
    });

    it('shows delete confirmation dialog', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => screen.getByTestId('delete-account-button'));

        fireEvent.click(screen.getByTestId('delete-account-button'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
        expect(screen.getByTestId('cancel-delete-button')).toBeInTheDocument();
    });

    it('calls onDeleted after confirmed delete', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        vi.spyOn(service, 'deleteBankAccount').mockResolvedValue(undefined);
        const onDeleted = vi.fn();
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={onDeleted} />);
        await waitFor(() => screen.getByTestId('delete-account-button'));

        fireEvent.click(screen.getByTestId('delete-account-button'));
        await waitFor(() => screen.getByTestId('confirm-delete-button'));

        fireEvent.click(screen.getByTestId('confirm-delete-button'));
        await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    });

    it('shows transaction history', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue(mockTransfers);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText('Coffee')).toBeInTheDocument();
            expect(screen.getByText('Salary')).toBeInTheDocument();
        });
    });

    it('shows empty state when no transfers', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockResolvedValue(mockAccount);
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText('No transactions found for this account.')).toBeInTheDocument();
        });
    });

    it('shows error state when account fetch fails', async () => {
        vi.spyOn(service, 'fetchBankAccount').mockRejectedValue(new Error('Not found'));
        vi.spyOn(service, 'fetchBankAccountTransfers').mockResolvedValue([]);
        render(<BankAccountDetailPage bankAccountId="acct-1" onBack={vi.fn()} onDeleted={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText('Failed to load bank account.')).toBeInTheDocument();
        });
    });
});

