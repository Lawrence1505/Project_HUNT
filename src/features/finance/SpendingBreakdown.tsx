import { PieChart } from "lucide-react";
import { EmptyState, ProgressBar, SectionHeader } from "../../components/ui";
import { CHART_COLORS } from "../../lib/chartTheme";
import { fmtMoney } from "./financeUtils";

export default function SpendingBreakdown({
  data,
  currency,
  monthName,
}: {
  /** Expense totals per category, already sorted desc. */
  data: Array<{ category: string; amount: number }>;
  currency: string;
  monthName: string;
}) {
  // Top 5 categories, everything else folded into "Other" (fixed color order).
  const top = data.slice(0, 5);
  const rest = data.slice(5);
  const rows =
    rest.length > 0
      ? [...top, { category: "Other", amount: rest.reduce((a, r) => a + r.amount, 0) }]
      : top;
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const max = Math.max(1, ...rows.map((r) => r.amount));

  return (
    <div className="card card-hover">
      <SectionHeader
        title={
          <span className="row" style={{ gap: 8 }}>
            <PieChart size={17} style={{ color: "var(--blue)" }} />
            Spending Breakdown
          </span>
        }
        action={<span className="small muted">{monthName}</span>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<PieChart size={26} />}
          title="No expenses this month"
          hint="Log an expense to see where the gold flows."
        />
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {rows.map((r, i) => {
            const color = CHART_COLORS[i];
            const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
            return (
              <div key={r.category} className="col" style={{ gap: 6 }}>
                <div className="row-between" style={{ gap: 8 }}>
                  <span className="row grow" style={{ gap: 8, minWidth: 0 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "var(--radius-full)",
                        background: color,
                        boxShadow: `0 0 8px color-mix(in srgb, ${color} 60%, transparent)`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.category}
                    </span>
                  </span>
                  <span className="small mono" style={{ color: "var(--text-2)", flexShrink: 0 }}>
                    {fmtMoney(r.amount, currency)}
                    <span className="muted"> · {pct}%</span>
                  </span>
                </div>
                <ProgressBar value={r.amount} max={max} color={color} height={10} />
              </div>
            );
          })}
          <div className="row-between small" style={{ marginTop: 2 }}>
            <span className="muted">Total spent</span>
            <span className="mono" style={{ color: "var(--text-1)", fontWeight: 650 }}>
              {fmtMoney(total, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
