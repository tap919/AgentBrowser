export interface BankAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'business' | 'credit';
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface Budget {
  id: string;
  category: string;
  name: string;
  allocated: number;
  spent: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
}

export interface RevenueStream {
  id: string;
  name: string;
  source: 'music' | 'software' | 'services' | 'affiliate' | 'other';
  monthlyAvg: number;
  lastMonth: number;
  trend: 'up' | 'down' | 'stable';
  notes?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: string;
  tags: string[];
}

// In-memory store (will be persisted via Prisma in production)
let accounts: BankAccount[] = [];
let budgets: Budget[] = [];
let revenueStreams: RevenueStream[] = [];
let transactions: Transaction[] = [];

export function initFinance(
  initialAccounts?: BankAccount[],
  initialBudgets?: Budget[],
  initialRevenue?: RevenueStream[],
): void {
  accounts = initialAccounts || [];
  budgets = initialBudgets || [];
  revenueStreams = initialRevenue || [];
  transactions = [];
}

export function getAccounts(): BankAccount[] {
  return [...accounts];
}

export function getBudgets(): Budget[] {
  return [...budgets];
}

export function getRevenueStreams(): RevenueStream[] {
  return [...revenueStreams];
}

export function addTransaction(tx: Omit<Transaction, 'id'>): Transaction {
  const newTx: Transaction = { id: crypto.randomUUID(), ...tx };
  transactions.push(newTx);

  // Update account balance
  const account = accounts.find(a => a.id === tx.accountId);
  if (account) {
    account.balance += tx.type === 'income' ? tx.amount : -tx.amount;
    account.lastUpdated = new Date().toISOString();
  }

  // Update budget spending
  if (tx.type === 'expense') {
    const budget = budgets.find(b => b.category === tx.category);
    if (budget) budget.spent += tx.amount;
  }

  return newTx;
}

export function getRecentTransactions(limit = 20): Transaction[] {
  return transactions.slice(-limit).reverse();
}

export function getMonthlyBurn(): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthlyRevenue(): number {
  return revenueStreams.reduce((sum, r) => sum + r.monthlyAvg, 0);
}

export function getBudgetUtilization(): Array<{ name: string; pct: number; status: 'healthy' | 'warning' | 'critical' }> {
  return budgets.map(b => {
    const pct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
    return {
      name: b.name,
      pct: Math.round(pct),
      status: pct < 60 ? 'healthy' : pct < 85 ? 'warning' : 'critical',
    };
  });
}

export function getFinancialHealth(): {
  monthlyRevenue: number;
  monthlyBurn: number;
  netProfit: number;
  runwayMonths: number;
  budgetHealth: 'good' | 'warning' | 'critical';
} {
  const revenue = getMonthlyRevenue();
  const burn = getMonthlyBurn();
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return {
    monthlyRevenue: revenue,
    monthlyBurn: burn,
    netProfit: revenue - burn,
    runwayMonths: burn > 0 ? Math.round(totalBalance / burn * 10) / 10 : 99,
    budgetHealth: getBudgetUtilization().some(b => b.status === 'critical') ? 'critical'
      : getBudgetUtilization().some(b => b.status === 'warning') ? 'warning' : 'good',
  };
}

export const DEFAULT_ACCOUNTS: BankAccount[] = [
  { id: 'main-business', name: 'NCSOUND Business Account', type: 'business', balance: 0, currency: 'USD', lastUpdated: new Date().toISOString() },
  { id: 'revenue-hold', name: 'Revenue Reserve', type: 'savings', balance: 0, currency: 'USD', lastUpdated: new Date().toISOString() },
];

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'bgt-tools', category: 'tools', name: 'Software & Tools', allocated: 200, spent: 0, period: 'monthly', startDate: new Date().toISOString() },
  { id: 'bgt-marketing', category: 'marketing', name: 'Marketing & Ads', allocated: 500, spent: 0, period: 'monthly', startDate: new Date().toISOString() },
  { id: 'bgt-infra', category: 'infrastructure', name: 'Infrastructure', allocated: 100, spent: 0, period: 'monthly', startDate: new Date().toISOString() },
  { id: 'bgt-content', category: 'content', name: 'Content Creation', allocated: 300, spent: 0, period: 'monthly', startDate: new Date().toISOString() },
];

export const DEFAULT_REVENUE: RevenueStream[] = [
  { id: 'rev-music', name: 'Music Streaming', source: 'music', monthlyAvg: 0, lastMonth: 0, trend: 'stable' },
  { id: 'rev-software', name: 'Software Sales', source: 'software', monthlyAvg: 0, lastMonth: 0, trend: 'stable' },
  { id: 'rev-services', name: 'Services & Consulting', source: 'services', monthlyAvg: 0, lastMonth: 0, trend: 'stable' },
];
