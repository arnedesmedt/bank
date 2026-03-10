import React, { useEffect, useState } from 'react';
import { fetchBankAccounts, BankAccount } from '../services/bankAccountsService';
import BankAccountRow from '../components/BankAccountRow';
import EmptyOrErrorState from '../components/EmptyOrErrorState';

const BankAccountsListPage: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchBankAccounts()
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <EmptyOrErrorState error={error} />;
  if (accounts.length === 0) return <EmptyOrErrorState emptyMessage="No bank accounts found" />;

  return (
    <div>
      <h1>Bank Accounts</h1>
      <ul>
        {accounts.map((account) => (
          <BankAccountRow key={account.id} account={account} />
        ))}
      </ul>
    </div>
  );
};

export default BankAccountsListPage;

