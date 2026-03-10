const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// API service for fetching bank accounts
export async function fetchBankAccounts(accessToken: string): Promise<BankAccount[]> {
  const response = await fetch(`${API_URL}/api/bank-accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch bank accounts');
  }
  return response.json() as Promise<BankAccount[]>;
}

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  linkedLabelIds: string[];
}
