import { useMemo, useState } from "react";
import {
  Percent,
  Plus,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useHeal } from "../../store/store";
import { financeScore } from "../../store/selectors";
import { monthKey, todayISO } from "../../lib/dates";
import { SectionHeader, StatTile } from "../../components/ui";
import {
  categorySuggestions,
  expenseByCategory,
  fmtMoney,
  lastMonthKeys,
  monthLabel,
  summarize,
} from "./financeUtils";
import TransactionModal from "./TransactionModal";
import BudgetsCard from "./BudgetsCard";
import SpendingBreakdown from "./SpendingBreakdown";
import FinanceScoreCard from "./FinanceScoreCard";
import TransactionsList from "./TransactionsList";

export default function FinancePage() {
  const transactions = useHeal((s) => s.transactions);
  const settings = useHeal((s) => s.settings);

  const [month, setMonth] = useState(() => monthKey(todayISO()));
  const [modalOpen, setModalOpen] = useState(false);

  const months = useMemo(() => lastMonthKeys(7), []);
  const currency = settings.currency;

  const monthTxs = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  );
  const summary = useMemo(() => summarize(monthTxs), [monthTxs]);
  const breakdown = useMemo(() => expenseByCategory(monthTxs), [monthTxs]);
  const suggestions = useMemo(() => categorySuggestions(transactions), [transactions]);
  const score = useMemo(
    () => financeScore({ transactions, settings }),
    [transactions, settings]
  );

  const spentByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const row of breakdown) out[row.category] = row.amount;
    return out;
  }, [breakdown]);

  const selectedLabel = monthLabel(month);
  const incomeCount = monthTxs.filter((t) => t.type === "income").length;
  const expenseCount = monthTxs.length - incomeCount;
  const netColor = summary.net >= 0 ? "var(--success)" : "var(--danger)";

  return (
    <div className="page">
      <h1 className="page-title">Finance</h1>
      <p className="page-subtitle">
        Command your cashflow — every coin you track is a soldier under your banner.
      </p>

      <div className="row-between wrap" style={{ marginBottom: 18, gap: 12 }}>
        <div className="row wrap" style={{ gap: 8 }} role="tablist" aria-label="Month">
          {months.map((mk) => (
            <button
              key={mk}
              role="tab"
              aria-selected={month === mk}
              className={`chip ${month === mk ? "chip-active" : ""}`}
              onClick={() => setMonth(mk)}
              style={{ cursor: "pointer" }}
            >
              {monthLabel(mk)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatTile
          label="Income"
          icon={<TrendingUp size={14} />}
          accent="var(--success)"
          value={fmtMoney(summary.income, currency)}
          sub={`${incomeCount} ${incomeCount === 1 ? "entry" : "entries"} · ${selectedLabel}`}
        />
        <StatTile
          label="Expenses"
          icon={<TrendingDown size={14} />}
          accent="var(--danger)"
          value={fmtMoney(summary.expenses, currency)}
          sub={`${expenseCount} ${expenseCount === 1 ? "entry" : "entries"} · ${selectedLabel}`}
        />
        <StatTile
          label="Net"
          icon={<Scale size={14} />}
          accent={netColor}
          value={
            <span style={{ color: netColor }}>
              {summary.net >= 0 ? "+" : "-"}
              {fmtMoney(Math.abs(summary.net), currency)}
            </span>
          }
          sub="income − expenses"
        />
        <StatTile
          label="Savings Rate"
          icon={<Percent size={14} />}
          accent="var(--cyan)"
          value={summary.savingsRate === null ? "—" : `${summary.savingsRate}%`}
          sub={summary.savingsRate === null ? "no income yet" : "of income kept"}
        />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16, alignItems: "start" }}>
        <div className="col" style={{ gap: 16 }}>
          <FinanceScoreCard score={score} />
          <SpendingBreakdown data={breakdown} currency={currency} monthName={selectedLabel} />
        </div>
        <BudgetsCard
          spentByCategory={spentByCategory}
          currency={currency}
          suggestions={suggestions}
          monthName={selectedLabel}
        />
      </div>

      <div className="card">
        <SectionHeader
          title={
            <span className="row" style={{ gap: 8 }}>
              <ReceiptText size={17} style={{ color: "var(--violet)" }} />
              Transactions
            </span>
          }
          action={
            <span className="small muted">
              {monthTxs.length} in {selectedLabel}
            </span>
          }
        />
        <TransactionsList
          txs={monthTxs}
          currency={currency}
          hasAnyTransactions={transactions.length > 0}
          monthName={selectedLabel}
          onAdd={() => setModalOpen(true)}
        />
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        suggestions={suggestions}
        currency={currency}
      />
    </div>
  );
}
