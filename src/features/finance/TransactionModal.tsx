import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { Modal } from "../../components/ui";
import { useHeal } from "../../store/store";
import { todayISO } from "../../lib/dates";
import type { Transaction } from "../../store/types";

type TxType = Transaction["type"];

export default function TransactionModal({
  open,
  onClose,
  suggestions,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  suggestions: string[];
  currency: string;
}) {
  const addTransaction = useHeal((s) => s.addTransaction);

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  // Fresh form every time the modal opens.
  useEffect(() => {
    if (open) {
      setType("expense");
      setAmount("");
      setCategory("");
      setNote("");
      setDate(todayISO());
    }
  }, [open]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    addTransaction({
      type,
      amount: parsed,
      category: category.trim() || "Other",
      note: note.trim() || undefined,
      date: date || todayISO(),
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <form className="col" style={{ gap: 14 }} onSubmit={submit}>
        <div className="tabs" role="tablist" aria-label="Transaction type">
          <button
            type="button"
            role="tab"
            aria-selected={type === "expense"}
            className={`tab grow ${type === "expense" ? "active" : ""}`}
            onClick={() => setType("expense")}
          >
            <span className="row" style={{ gap: 6, justifyContent: "center" }}>
              <ArrowDownRight size={14} /> Expense
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === "income"}
            className={`tab grow ${type === "income" ? "active" : ""}`}
            onClick={() => setType("income")}
          >
            <span className="row" style={{ gap: 6, justifyContent: "center" }}>
              <ArrowUpRight size={14} /> Income
            </span>
          </button>
        </div>

        <div className="grid grid-2">
          <div>
            <label className="label" htmlFor="fin-amount">
              Amount ({currency})
            </label>
            <input
              id="fin-amount"
              className="input"
              type="number"
              min="0.01"
              step="any"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="fin-date">
              Date
            </label>
            <input
              id="fin-date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="fin-category">
            Category
          </label>
          <input
            id="fin-category"
            className="input"
            list="fin-category-suggestions"
            placeholder={type === "income" ? "Salary, Freelance…" : "Food, Rent, Transport…"}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="fin-category-suggestions">
            {suggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="fin-note">
            Note <span className="muted">(optional)</span>
          </label>
          <input
            id="fin-note"
            className="input"
            placeholder="What was it for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={!valid}>
          <Plus size={16} />
          Add {type === "income" ? "Income" : "Expense"}
        </button>
      </form>
    </Modal>
  );
}
