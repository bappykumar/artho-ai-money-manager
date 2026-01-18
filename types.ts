
export type Category = 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Entertainment' | 'Others' | 'Income' | 'Education' | 'Health';

export interface Account {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  date: string; // ISO String
  type: 'expense' | 'income';
  source: string; // Dynamic account name
  note: string;
  rawInput: string;
}

export interface AIResponse {
  amount: number;
  category: Category;
  type: 'expense' | 'income';
  source: string;
  note: string;
  confidence: number;
}

export interface SpendingInsight {
  title: string;
  message: string;
  type: 'warning' | 'info' | 'positive';
}

export interface SyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  error: string | null;
}
