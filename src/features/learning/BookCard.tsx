import { useState } from "react";
import type { FormEvent } from "react";
import {
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  Quote,
  Trash2,
  Trophy,
} from "lucide-react";
import { useHeal } from "../../store/store";
import type { Book } from "../../store/types";
import { ProgressBar } from "../../components/ui";
import { formatShort, todayISO } from "../../lib/dates";

const GOLD = "#fbbf24";

export default function BookCard({ book }: { book: Book }) {
  const updateBookProgress = useHeal((s) => s.updateBookProgress);
  const updateBook = useHeal((s) => s.updateBook);
  const deleteBook = useHeal((s) => s.deleteBook);
  const addHighlight = useHeal((s) => s.addHighlight);

  const [settingPage, setSettingPage] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [showHighlights, setShowHighlights] = useState(false);
  const [highlightInput, setHighlightInput] = useState("");

  const finished = book.status === "finished";
  const pct = Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100);
  const barColor = finished ? GOLD : "var(--cat-knowledge)";

  const submitPage = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(pageInput);
    if (!Number.isFinite(n) || n < 0) return;
    updateBookProgress(book.id, n);
    setPageInput("");
    setSettingPage(false);
  };

  const submitHighlight = (e: FormEvent) => {
    e.preventDefault();
    const text = highlightInput.trim();
    if (!text) return;
    addHighlight(book.id, text);
    setHighlightInput("");
  };

  const startReading = () =>
    updateBook(book.id, { status: "reading", startedAt: book.startedAt ?? todayISO() });

  const remove = () => {
    if (window.confirm(`Delete "${book.title}" from your library? This can't be undone.`))
      deleteBook(book.id);
  };

  return (
    <div className="card card-hover">
      <div className="row-between" style={{ alignItems: "flex-start", gap: 10 }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="card-title" style={{ marginBottom: 2 }}>{book.title}</div>
          <div className="small muted">{book.author ? `by ${book.author}` : "Unknown author"}</div>
        </div>
        <div className="row" style={{ gap: 6, flexShrink: 0 }}>
          {finished && (
            <span className="chip" style={{ color: GOLD, borderColor: "rgba(251, 191, 36, 0.45)" }}>
              <Trophy size={12} /> Finished
            </span>
          )}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={remove}
            aria-label={`Delete ${book.title}`}
            title="Delete book"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {book.status === "wishlist" ? (
        <div className="row-between wrap" style={{ marginTop: 14, gap: 8 }}>
          <span className="small muted mono">{book.totalPages} pages</span>
          <button className="btn btn-primary btn-sm" onClick={startReading}>
            <BookOpen size={14} /> Start reading
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="small mono muted">
              {book.currentPage}/{book.totalPages} pages
            </span>
            <span className="small mono" style={{ color: barColor }}>{pct}%</span>
          </div>
          <ProgressBar value={book.currentPage} max={book.totalPages} color={barColor} />
        </div>
      )}

      {book.status === "reading" && (
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button
            className="btn btn-sm"
            onClick={() => updateBookProgress(book.id, book.currentPage + 10)}
          >
            <Plus size={14} /> 10 pages
          </button>
          {settingPage ? (
            <form className="row" style={{ gap: 6 }} onSubmit={submitPage}>
              <input
                className="input"
                type="number"
                min={0}
                max={book.totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder={String(book.currentPage)}
                autoFocus
                aria-label="Set current page"
                style={{ width: 92 }}
              />
              <button className="btn btn-sm btn-primary" type="submit">Set</button>
              <button
                className="btn btn-sm btn-ghost"
                type="button"
                onClick={() => {
                  setSettingPage(false);
                  setPageInput("");
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setSettingPage(true)}>
              Set page…
            </button>
          )}
        </div>
      )}

      {finished && book.finishedAt && (
        <div className="row small muted" style={{ marginTop: 10, gap: 6 }}>
          <CalendarCheck size={14} style={{ color: GOLD }} />
          Finished on {formatShort(book.finishedAt)}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowHighlights((v) => !v)}>
          <Quote size={14} />
          {book.highlights.length} highlight{book.highlights.length === 1 ? "" : "s"}
          {showHighlights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showHighlights && (
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            {book.highlights.length === 0 && (
              <div className="small muted">
                No highlights yet — save the lines you never want to forget.
              </div>
            )}
            {book.highlights.map((h, i) => (
              <blockquote
                key={`${i}-${h.slice(0, 16)}`}
                className="small"
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  borderLeft: `2px solid var(--cat-knowledge)`,
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                  color: "var(--text-2)",
                }}
              >
                “{h}”
              </blockquote>
            ))}
            <form className="row" style={{ gap: 6 }} onSubmit={submitHighlight}>
              <input
                className="input grow"
                value={highlightInput}
                onChange={(e) => setHighlightInput(e.target.value)}
                placeholder="Add a highlight…"
                aria-label="Add a highlight"
              />
              <button
                className="btn btn-sm btn-primary"
                type="submit"
                disabled={!highlightInput.trim()}
              >
                Add
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
