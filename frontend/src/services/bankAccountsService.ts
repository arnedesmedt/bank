import { apiGet } from './apiClient';

/**
 * Represents a bank account as returned by GET /api/bank-accounts.
 * Accounts are created when a CSV is imported via the transfer import feature.
 */
export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  linkedLabelIds: string[];
}

/** Fetch all bank accounts belonging to the authenticated user. */
export function fetchBankAccounts(accessToken: string): Promise<BankAccount[]> {
  return apiGet<BankAccount[]>('/api/bank-accounts', accessToken);
}

