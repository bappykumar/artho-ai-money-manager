
export type Category = 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Entertainment' | 'Others' | 'Income' | 'Education' | 'Health';
export type AccountSource = 'BRAC BANK' | 'DBBL' | 'BKASH' | 'CASH';

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  date: string; // ISO String
  type: 'expense' | 'income';
  source: AccountSource;
  note: string;
  rawInput: string;
}

export interface AIResponse {
  amount: number;
  category: Category;
  type: 'expense' | 'income';
  source: AccountSource;
  note: string;
  dateRelative?: string;
  confidence: number;
}

export interface SpendingInsight {
  title: string;
  message: string;
  type: 'warning' | 'info' | 'positive';
}

export interface AppState {
  transactions: Transaction[];
  balance: number;
}
