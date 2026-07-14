import { useState, type FormEvent } from "react";
import { PiggyBank, Target, X } from "lucide-react";
import { EmptyState, ProgressBar, SectionHeader } from "../../components/ui";
import { useHeal } from "../../store/store";
import { fmtMoney } from "./financeUtils";

function budgetColor(spent: number, limit: number): string {
  if (limit <= 0) return "var(--success)";
  const pct = (spent / limit) * 100;
  if (pct < 70) return "var(--success)";
  if (pct <= 100) return "var(--warning)";
  return "var(--danger)";
}

export default function BudgetsCard({
  spentByCategory,
  currency,
  suggestions,
  monthName,
}: {
  spentByCategory: Record<string, number>;
  currency: string;
  suggestions: string[];
  monthName: string;
}) {
  const budgets = useHeal((s) => s.settings.budgets);
  const setBudget = useHeal((s) => s.setBudget);
  const removeBudget = useHeal((s) => s.removeBudget);

  const [cat, setCat] = useState("");
  const [limit, setLimit] = useState("");

  const entries = Object.entries(budgets).sort((a, b) => a[0].localeCompare(b[0]));
  const limitNum = Number(limit);
  const canSet = cat.trim().length > 0 && Number.isFinite(limitNum) && limitNum > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSet) return;
    setBudget(cat.trim(), limitNum);
    setCat("");
    setLimit("");
  }

  function remove(category: string) {
    if (window.confirm(`Remove the budget for "${category}"?`)) removeBudget(category);
  }

  return (
    <div className="card card-hover">
      <SectionHeader
        title={
          <span className="row" style={{ gap: 8 }}>
            <Target size={17} style={{ color: "var(--violet)" }} />
            Budgets
          </span>
        }
        action={<span className="small muted">{monthName}</span>}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={26} />}
          title="No budgets set"
          hint="Give each spending category a monthly cap — limits turn intent into discipline."
        />
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {entries.map(([category, budgetLimit]) => {
            const spent = spentByCategory[category] ?? 0;
            const color = budgetColor(spent, budgetLimit);
            const over = spent - budgetLimit;
            return (
              <div key={category} className="col" style={{ gap: 6 }}>
                <div className="row-between" style={{ gap: 8 }}>
                  <span className="grow" style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {category}
                  </span>
                  <span className="small mono" style={{ color: "var(--text-2)" }}>
                    <span style={{ color }}>{fmtMoney(spent, currency)}</span>
                    <span className="muted"> / {fmtMoney(budgetLimit, currency)}</span>
                  </span>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => remove(category)}
                    aria-label={`Remove budget for ${category}`}
                    title="Remove budget"
                  >
                    <X size={14} />
                  </button>
                </div>
                <ProgressBar value={spent} max={budgetLimit} color={color} height={8} />
                {over > 0 && (
                  <span className="small" style={{ color: "var(--danger)" }}>
                    Over by {fmtMoney(over, currency)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <hr className="divider" />

      <form className="row wrap" style={{ gap: 8 }} onSubmit={submit}>
        <input
          className="input grow"
          style={{ minWidth: 130 }}
          list="fin-budget-suggestions"
          placeholder="Category"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Budget category"
        />
        <datalist id="fin-budget-suggestions">
          {suggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          className="input"
          style={{ width: 130 }}
          type="number"
          min="1"
          step="any"
          inputMode="decimal"
          placeholder={`Limit (${currency})`}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          aria-label="Monthly limit"
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={!canSet}>
          Set budget
        </button>
      </form>
    </div>
  );
}
