// @vitest-environment happy-dom
import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as service from '../services/bankAccountsService';
import BankAccountsListPage from '../pages/BankAccountsListPage';

const mockAccounts = [
  { id: '1', name: 'Main Account', accountNumber: 'BE123456789', balance: 1000.00 },
  { id: '2', name: 'Savings', accountNumber: 'BE987654321', balance: 2500.50 }
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

  it('shows empty state when no accounts', async () => {
    vi.spyOn(service, 'fetchBankAccounts').mockResolvedValue([]);
    render(<BankAccountsListPage />);
    await waitFor(() => {
      expect(screen.getByText('No bank accounts found')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    vi.spyOn(service, 'fetchBankAccounts').mockRejectedValue(new Error('API error'));
    render(<BankAccountsListPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });
});
