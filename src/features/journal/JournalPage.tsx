import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Feather,
  Flame,
  Hash,
  NotebookPen,
  Search,
  X,
} from "lucide-react";
import { useHeal } from "../../store/store";
import type { ISODate, JournalEntry, JournalType } from "../../store/types";
import { formatFull, isToday, monthKey, todayISO } from "../../lib/dates";
import { EmptyState, StatTile } from "../../components/ui";
import ComposeCard from "./ComposeCard";
import EntryCard from "./EntryCard";
import { JOURNAL_TYPES, TYPE_META, journalStreak, matchesSearch } from "./shared";

type TypeFilter = JournalType | "all";

export default function JournalPage() {
  const journal = useHeal((s) => s.journal);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const composeRef = useRef<HTMLDivElement>(null);

  /* ---------- tiles ---------- */
  const streak = useMemo(() => journalStreak(journal), [journal]);
  const entriesThisMonth = useMemo(() => {
    const mk = monthKey(todayISO());
    return journal.filter((e) => monthKey(e.date) === mk).length;
  }, [journal]);

  /* ---------- filters ---------- */
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of journal)
      for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }, [journal]);

  const filtered = useMemo(
    () =>
      journal.filter(
        (e) =>
          (typeFilter === "all" || e.type === typeFilter) &&
          (activeTags.length === 0 || activeTags.some((t) => e.tags.includes(t))) &&
          matchesSearch(e, query)
      ),
    [journal, typeFilter, activeTags, query]
  );

  /* ---------- timeline groups (newest day first) ---------- */
  const groups = useMemo(() => {
    const byDate = new Map<ISODate, JournalEntry[]>();
    for (const e of filtered) {
      const list = byDate.get(e.date);
      if (list) list.push(e);
      else byDate.set(e.date, [e]);
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => ({
        date,
        list: [...list].sort((a, b) => b.createdAt - a.createdAt),
      }));
  }, [filtered]);

  const hasFilters =
    query.trim() !== "" || typeFilter !== "all" || activeTags.length > 0;

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setActiveTags([]);
  };

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const scrollToCompose = () =>
    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="page">
      <h1 className="page-title">Journal</h1>
      <p className="page-subtitle">
        Morning intentions, night reflections, free thoughts — your mind, on record.
      </p>

      {/* top tiles */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <StatTile
          label="Total Entries"
          value={journal.length}
          icon={<NotebookPen size={14} />}
          sub="every word counts"
        />
        <StatTile
          label="Day Streak"
          value={streak > 0 ? `${streak} ${streak === 1 ? "day" : "days"}` : "—"}
          icon={<Flame size={14} />}
          accent="var(--warning)"
          sub={streak > 0 ? "keep the chain alive" : "write today to light it"}
        />
        <StatTile
          label="This Month"
          value={entriesThisMonth}
          icon={<CalendarDays size={14} />}
          accent="var(--cyan)"
          sub={entriesThisMonth === 1 ? "entry so far" : "entries so far"}
        />
      </div>

      {/* compose */}
      <div ref={composeRef} style={{ scrollMarginTop: 16 }}>
        <ComposeCard />
      </div>

      {/* filters */}
      {journal.length > 0 && (
        <div className="card col" style={{ marginTop: 18, gap: 12 }}>
          <div className="row wrap" style={{ gap: 10 }}>
            <div className="grow" style={{ position: "relative", minWidth: 200 }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Search text, wins, lessons, gratitude…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="tabs">
              <button
                className={typeFilter === "all" ? "tab active" : "tab"}
                onClick={() => setTypeFilter("all")}
              >
                All
              </button>
              {JOURNAL_TYPES.map((t) => {
                const m = TYPE_META[t];
                return (
                  <button
                    key={t}
                    className={typeFilter === t ? "tab active" : "tab"}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={() => setTypeFilter(t)}
                  >
                    <m.icon size={14} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="row wrap" style={{ gap: 6 }}>
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  className={activeTags.includes(tag) ? "chip chip-active" : "chip"}
                  style={{ cursor: "pointer" }}
                  aria-pressed={activeTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  <Hash size={11} />
                  {tag}
                  <span style={{ opacity: 0.65 }}>{count}</span>
                </button>
              ))}
              {activeTags.length > 0 && (
                <button
                  className="chip"
                  style={{ cursor: "pointer", color: "var(--danger)" }}
                  onClick={() => setActiveTags([])}
                >
                  <X size={11} />
                  clear tags
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* timeline */}
      <div className="col" style={{ marginTop: 20, gap: 24 }}>
        {journal.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Feather size={26} />}
              title="Your story starts today."
              hint="One grateful line is enough to begin — every entry earns +15 XP."
              action={
                <button className="btn btn-primary" onClick={scrollToCompose}>
                  <Feather size={15} />
                  Write your first entry
                </button>
              }
            />
          </div>
        ) : groups.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Search size={26} />}
              title="No entries match"
              hint="Try a different search, type or tag."
              action={
                hasFilters ? (
                  <button className="btn btn-ghost" onClick={clearFilters}>
                    <X size={15} />
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          groups.map(({ date, list }) => (
            <section key={date}>
              <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
                <h2 style={{ fontSize: 15, color: "var(--text-2)" }}>
                  {formatFull(date)}
                </h2>
                {isToday(date) && (
                  <span className="chip chip-active" style={{ fontSize: 11 }}>
                    Today
                  </span>
                )}
                <span className="small muted">
                  {list.length} {list.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="col" style={{ gap: 12 }}>
                {list.map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
