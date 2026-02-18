export type ExpenseType = 'FIXED' | 'VARIABLE';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Income {
  id: string;
  personName: string;
  amount: number;
  description?: string;
}

// Used for Budget/Planning
export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: ExpenseType;
  date: string;
}

// New Interface for Credit Cards
export interface CreditCard {
  id: string;
  name: string;
  limitAmount: number;
  closingDay: number; // Dia de fechamento da fatura
  dueDay: number; // Dia de vencimento
  color?: string;
}

// New Interface for Shopping List
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  isChecked: boolean;
  category?: string; // Ex: "🍎 Frutas", "🧼 Limpeza"
  price?: number; // Preço unitário estimado ou real
}

// Shopping History Record
export interface ShoppingHistoryEntry {
  id: string;
  date: string;
  totalAmount: number;
  items: ShoppingItem[]; // Stored as JSON
}

// Used for Real/Daily Transactions
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  transactionType: TransactionType; // New field for Income/Expense/Transfer
  status: 'DONE' | 'PENDING'; // New field for Realized vs Pending
  type?: ExpenseType; // Only relevant if transactionType is EXPENSE
  date: string; // Data da compra
  referenceDate?: string; // Mês de competência/Fatura (ISO string)
  paymentMethod?: string;
  cardId?: string; // Optional: Link to a credit card
}

export interface Investment {
  id: string;
  name: string;
  amount: number; // Monthly contribution
  annualRate: number; // Individual expected return rate
  category: string;
}

export interface ScheduledEvent {
  id: string;
  name: string;
  type: 'INJECTION' | 'WITHDRAWAL'; // Aporte Extra vs Gasto/Retirada
  amount: number;
  month: number; // 0 = Janeiro, 11 = Dezembro
  year?: number; // Optional: If defined, happens only in that specific year (non-recurring)
}

export interface Category {
  id: string;
  name: string;
}

export interface AnalysisResult {
  advice: string;
  savingsPotential: number;
  status: 'healthy' | 'warning' | 'critical';
}

export type AIAnalysisType = 'BUDGET' | 'INVESTMENT' | 'MONTH_CLOSING';
