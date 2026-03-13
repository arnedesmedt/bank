import { apiGet, API_URL } from './apiClient';

/**
 * Represents a bank account as returned by GET /api/bank-accounts.
 * Accounts are created when a CSV is imported via the transfer import feature.
 */
export interface BankAccount {
  id: string;
  accountName: string | null;
  accountNumber: string | null;
  linkedLabelIds: string[];
  isInternal: boolean;
  totalBalance: string;
}

/** Fetch all bank accounts belonging to the authenticated user. */
export function fetchBankAccounts(accessToken: string): Promise<BankAccount[]> {
  return apiGet<BankAccount[]>('/api/bank-accounts', accessToken);
}

/** Fetch a single bank account by ID. */
export function fetchBankAccount(id: string, accessToken: string): Promise<BankAccount> {
  return apiGet<BankAccount>(`/api/bank-accounts/${id}`, accessToken);
}

/** Update a bank account (only accountName is editable). */
export async function updateBankAccount(
  id: string,
  accountName: string,
  accessToken: string,
): Promise<BankAccount> {
  const response = await fetch(`${API_URL}/api/bank-accounts/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ accountName }),
  });

  if (!response.ok) {
    const err = (await response.json()) as { detail?: string };
    throw new Error(err.detail ?? 'Failed to update bank account');
  }

  return response.json() as Promise<BankAccount>;
}
