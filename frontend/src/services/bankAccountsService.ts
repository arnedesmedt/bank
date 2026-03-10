// API service for fetching bank accounts
export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/bank-accounts');
  if (!response.ok) {
    throw new Error('Failed to fetch bank accounts');
  }
  return response.json();
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
}

