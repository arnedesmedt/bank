import React from 'react';
import { BankAccount } from '../services/bankAccountsService';

interface BankAccountRowProps {
  account: BankAccount;
}

const BankAccountRow: React.FC<BankAccountRowProps> = ({ account }) => (
  <li className="bank-account-row">
    <span className="account-name">{account.name}</span>
    <span className="account-number">{account.accountNumber}</span>
    <span className="account-balance">{account.balance.toFixed(2)}</span>
  </li>
);

export default BankAccountRow;

