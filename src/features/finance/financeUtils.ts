import { fromISO, monthKey, toISO, todayISO } from "../../lib/dates";
import type { Transaction } from "../../store/types";

/** Default category suggestions, merged with whatever the user already used. */
export const DEFAULT_CATEGORIES = [
  "Salary",
  "Food",
  "Rent",
  "Transport",
  "Fun",
  "Health",
  "Shopping",
  "Subscriptions",
] as const;

export function categorySuggestions(transactions: Transaction[]): string[] {
  const set = new Set<string>(DEFAULT_CATEGORIES);
  for (const t of transactions) set.add(t.category);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** "$1,234.56" — currency symbol comes from settings.currency. */
export function fmtMoney(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Current month + the past n-1 months as monthKeys, newest first. */
export function lastMonthKeys(n: number): string[] {
  const now = fromISO(todayISO());
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    keys.push(monthKey(toISO(new Date(now.getFullYear(), now.getMonth() - i, 1))));
  }
  return keys;
}

const MONTH_FMT = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

/** "Jul 2026" from a "2026-07" monthKey. */
export function monthLabel(mk: string): string {
  return MONTH_FMT.format(fromISO(`${mk}-01`));
}

export interface MonthSummary {
  income: number;
  expenses: number;
  net: number;
  /** Percent 0–100, or null when there is no income to save from. */
  savingsRate: number | null;
}

export function summarize(txs: Transaction[]): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  const net = income - expenses;
  return {
    income,
    expenses,
    net,
    savingsRate: income > 0 ? Math.round((net / income) * 100) : null,
  };
}

/** Expense totals per category for the given transactions, sorted desc. */
export function expenseByCategory(
  txs: Transaction[]
): Array<{ category: string; amount: number }> {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
