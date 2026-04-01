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

/** Represents a transfer as returned by GET /api/bank-accounts/{id}/transfers */
export interface BankAccountTransfer {
  id: string;
  amount: string;
  date: string;
  fromAccountNumber: string | null;
  fromAccountName: string | null;
  toAccountNumber: string | null;
  toAccountName: string | null;
  reference: string;
  isInternal: boolean;
  labelIds: string[];
  labelLinks: { id: string; name: string; isManual: boolean }[];
}

/** Fetch all bank accounts belonging to the authenticated user. */
export function fetchBankAccounts(accessToken: string): Promise<BankAccount[]> {
  return apiGet<BankAccount[]>('/api/bank-accounts', accessToken);
}

/** Fetch a single bank account by ID. */
export function fetchBankAccount(id: string, accessToken: string): Promise<BankAccount> {
  return apiGet<BankAccount>(`/api/bank-accounts/${id}`, accessToken);
}

/** Fetch all transfers for a bank account. */
export function fetchBankAccountTransfers(
  id: string,
  accessToken: string,
  filters?: { search?: string; dateFrom?: string; dateTo?: string; labelIds?: string[]; amountMin?: string; amountMax?: string; amountOperator?: string },
): Promise<BankAccountTransfer[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  filters?.labelIds?.forEach((lid) => params.append('labelIds[]', lid));
  if (filters?.amountMin) params.set('amountMin', filters.amountMin);
  if (filters?.amountMax) params.set('amountMax', filters.amountMax);
  if (filters?.amountOperator && filters.amountOperator !== 'eq') params.set('amountOperator', filters.amountOperator);
  const query = params.toString();
  return apiGet<BankAccountTransfer[]>(`/api/bank-accounts/${id}/transfers${query ? `?${query}` : ''}`, accessToken);
}

/** Create a new bank account. */
export async function createBankAccount(
  data: { accountName: string; accountNumber?: string | null },
  accessToken: string,
): Promise<BankAccount> {
  const response = await fetch(`${API_URL}/api/bank-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = (await response.json()) as { detail?: string; error?: { message?: string } };
    throw new Error(err.detail ?? err.error?.message ?? 'Failed to create bank account');
  }

  return response.json() as Promise<BankAccount>;
}

/** Update a bank account (accountName is editable; accountNumber is preserved). */
export async function updateBankAccount(
  id: string,
  accountName: string,
  accessToken: string,
  accountNumber?: string | null,
): Promise<BankAccount> {
  const response = await fetch(`${API_URL}/api/bank-accounts/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ accountName, accountNumber: accountNumber ?? null }),
  });

  if (!response.ok) {
    const err = (await response.json()) as { detail?: string; error?: { message?: string } };
    throw new Error(err.detail ?? err.error?.message ?? 'Failed to update bank account');
  }

  return response.json() as Promise<BankAccount>;
}

/** Delete a bank account by ID. */
export async function deleteBankAccount(id: string, accessToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/bank-accounts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = 'Failed to delete bank account';
    try {
      const err = JSON.parse(text) as { detail?: string; error?: { message?: string } };
      message = err.detail ?? err.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
}
