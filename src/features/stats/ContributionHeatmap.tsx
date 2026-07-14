import { useMemo } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { useHeal } from "../../store/store";
import { contributionGrid } from "../../store/selectors";
import { HEAT_RAMP } from "../../lib/chartTheme";
import {
  daysBetween,
  formatFull,
  fromISO,
  isToday,
  startOfWeek,
  weekdayOf,
} from "../../lib/dates";
import { EmptyState } from "../../components/ui";

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const WEEKS = 26;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_FMT = new Intl.DateTimeFormat("en", { month: "short" });

interface PositionedCell {
  date: string;
  xp: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** 0-based week column, oldest week first. */
  col: number;
  /** 0-based row, Monday = 0 … Sunday = 6. */
  row: number;
}

export default function ContributionHeatmap() {
  const xpByDay = useHeal((s) => s.xpByDay);

  const { cells, cols, monthLabels, totalXp, activeDays } = useMemo(() => {
    const days = contributionGrid({ xpByDay }, WEEKS);
    const gridStart = startOfWeek(days[0].date);

    const positioned: PositionedCell[] = days.map((d) => ({
      ...d,
      col: daysBetween(gridStart, startOfWeek(d.date)) / 7,
      row: (weekdayOf(d.date) + 6) % 7,
    }));
    const nCols = positioned[positioned.length - 1].col + 1;

    // Earliest date landing in each column (cells arrive oldest → newest).
    const firstOfCol: string[] = [];
    for (const c of positioned) {
      if (firstOfCol[c.col] === undefined) firstOfCol[c.col] = c.date;
    }
    const labels: Array<{ col: number; label: string }> = [];
    for (let c = 0; c < nCols; c++) {
      const cur = firstOfCol[c];
      const prev = c > 0 ? firstOfCol[c - 1] : undefined;
      if (cur && (!prev || fromISO(cur).getMonth() !== fromISO(prev).getMonth())) {
        labels.push({ col: c, label: MONTH_FMT.format(fromISO(cur)) });
      }
    }
    // Avoid the partial first column's label colliding with the next month's.
    if (labels.length > 1 && labels[0].col === 0 && labels[1].col < 3) labels.shift();

    return {
      cells: positioned,
      cols: nCols,
      monthLabels: labels,
      totalXp: days.reduce((a, d) => a + d.xp, 0),
      activeDays: days.filter((d) => d.xp > 0).length,
    };
  }, [xpByDay]);

  return (
    <div className="card card-hover">
      <style>{`
        .heal-heat-cell { transition: transform 130ms var(--ease-out, ease), box-shadow 130ms ease; }
        .heal-heat-cell:hover { transform: scale(1.3); box-shadow: 0 0 10px rgba(139, 92, 246, 0.55); }
      `}</style>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          <CalendarDays size={16} />
          Activity Heatmap
        </div>
        {totalXp > 0 && (
          <span className="small muted mono">
            {totalXp.toLocaleString()} XP · {activeDays} active days
          </span>
        )}
      </div>

      {totalXp === 0 ? (
        <EmptyState
          icon={<Sparkles size={28} />}
          title="No activity yet"
          hint="Complete a mission or check off a habit — every XP you earn lights up a square here."
        />
      ) : (
        <>
          <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <div style={{ display: "flex", gap: 8, width: "max-content" }}>
              {/* Day-of-week labels */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: GAP,
                  marginTop: 18,
                }}
              >
                {DAY_LABELS.map((d) => (
                  <div
                    key={d}
                    style={{
                      height: CELL,
                      lineHeight: `${CELL}px`,
                      fontSize: 9,
                      color: "var(--text-3)",
                      width: 26,
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div>
                {/* Month labels, anchored to the first day of each column */}
                <div
                  style={{
                    position: "relative",
                    height: 18,
                    width: cols * STEP - GAP,
                  }}
                >
                  {monthLabels.map((m) => (
                    <span
                      key={`${m.label}-${m.col}`}
                      style={{
                        position: "absolute",
                        left: m.col * STEP,
                        fontSize: 10,
                        color: "var(--text-3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>

                {/* The grid: one column per week, Mon → Sun top to bottom */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: `repeat(7, ${CELL}px)`,
                    gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
                    gap: GAP,
                  }}
                >
                  {cells.map((c) => (
                    <div
                      key={c.date}
                      className="heal-heat-cell"
                      title={`${formatFull(c.date)} — ${c.xp} XP`}
                      style={{
                        gridRow: c.row + 1,
                        gridColumn: c.col + 1,
                        borderRadius: 3,
                        background: HEAT_RAMP[c.level],
                        boxShadow: isToday(c.date)
                          ? "0 0 0 1px var(--violet)"
                          : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div
            className="row"
            style={{ justifyContent: "flex-end", gap: 4, marginTop: 12 }}
          >
            <span className="small muted" style={{ marginRight: 4 }}>
              Less
            </span>
            {HEAT_RAMP.map((color) => (
              <span
                key={color}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  background: color,
                  display: "inline-block",
                }}
              />
            ))}
            <span className="small muted" style={{ marginLeft: 4 }}>
              More
            </span>
          </div>
        </>
      )}
    </div>
  );
}
