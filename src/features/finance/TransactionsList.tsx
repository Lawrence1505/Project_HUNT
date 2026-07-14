import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from "lucide-react";
import { EmptyState } from "../../components/ui";
import { useHeal } from "../../store/store";
import { formatFull, isToday } from "../../lib/dates";
import type { Transaction } from "../../store/types";
import { fmtMoney } from "./financeUtils";

export default function TransactionsList({
  txs,
  currency,
  hasAnyTransactions,
  monthName,
  onAdd,
}: {
  /** Transactions of the selected month (store order: newest first). */
  txs: Transaction[];
  currency: string;
  /** Whether ANY transaction exists across all months. */
  hasAnyTransactions: boolean;
  monthName: string;
  onAdd: () => void;
}) {
  const deleteTransaction = useHeal((s) => s.deleteTransaction);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of txs) {
      const arr = map.get(t.date);
      if (arr) arr.push(t);
      else map.set(t.date, [t]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [txs]);

  function remove(t: Transaction) {
    if (
      window.confirm(
        `Delete this ${t.type} of ${fmtMoney(t.amount, currency)} (${t.category})?`
      )
    ) {
      deleteTransaction(t.id);
    }
  }

  if (txs.length === 0) {
    return hasAnyTransactions ? (
      <EmptyState
        icon={<Wallet size={28} />}
        title={`No transactions in ${monthName}`}
        hint="Switch months above, or log one for this month."
        action={
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={15} /> Add Transaction
          </button>
        }
      />
    ) : (
      <EmptyState
        icon={<Wallet size={28} />}
        title="Track your first transaction — awareness is step one."
        hint="Every entry earns XP and sharpens your Finance Score."
        action={
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={15} /> Add Transaction
          </button>
        }
      />
    );
  }

  return (
    <div className="col" style={{ gap: 4 }}>
      {groups.map(([date, list], gi) => {
        const dayNet = list.reduce(
          (a, t) => a + (t.type === "income" ? t.amount : -t.amount),
          0
        );
        return (
          <div key={date}>
            {gi > 0 && <hr className="divider" />}
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span
                className="small"
                style={{
                  fontWeight: 650,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: isToday(date) ? "var(--violet)" : "var(--text-3)",
                }}
              >
                {isToday(date) ? "Today" : formatFull(date)}
              </span>
              <span
                className="small mono"
                style={{ color: dayNet >= 0 ? "var(--success)" : "var(--danger)" }}
              >
                {dayNet >= 0 ? "+" : "-"}
                {fmtMoney(Math.abs(dayNet), currency)}
              </span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              {list.map((t) => {
                const income = t.type === "income";
                const color = income ? "var(--success)" : "var(--danger)";
                const Icon = income ? ArrowUpRight : ArrowDownRight;
                return (
                  <div
                    key={t.id}
                    className="row"
                    style={{ padding: "7px 0", gap: 12 }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "var(--radius-full)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `color-mix(in srgb, ${color} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                        color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.category}
                      </div>
                      {t.note && (
                        <div
                          className="small muted"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.note}
                        </div>
                      )}
                    </div>
                    <span
                      className="mono"
                      style={{ color, fontWeight: 650, flexShrink: 0 }}
                    >
                      {income ? "+" : "-"}
                      {fmtMoney(t.amount, currency)}
                    </span>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => remove(t)}
                      aria-label="Delete transaction"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
