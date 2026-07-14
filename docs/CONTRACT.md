# HEAL — Feature Module Contract

You are building ONE feature module of HEAL, a gamified personal-growth app
("Solo Leveling meets Notion"). Dark theme, glassmorphism, purple/blue neon.
The core engine, store, design system, and app shell already exist. **Do not
modify anything outside your assigned `src/features/<name>/` directory.**

## Hard rules

1. You own exactly `src/features/<name>/`. Create `<Name>Page.tsx` there with a
   **default export** React component — the router lazy-loads it from that exact
   path. You may add extra component files inside your directory.
2. Plain TypeScript + React 18. No new npm packages. Available: `react`,
   `react-router-dom`, `zustand`, `recharts`, `lucide-react`.
3. All state lives in the global store (`useHeal`). Never use localStorage
   directly. Local `useState` only for UI state (form fields, open modals, tabs).
4. Never award XP by hand-rolling logic — call the store actions; they handle
   XP, coins, streaks, toasts, and achievements automatically. Use `awardXp`
   only when told to in your task.
5. Wrap each page in `<div className="page">` with a `<h1 className="page-title">`
   and `<p className="page-subtitle">`.
6. Dates are local ISO days `"YYYY-MM-DD"` — always via helpers in `src/lib/dates.ts`.

## Store — `import { useHeal } from "../../store/store"`

Select narrowly: `const missions = useHeal(s => s.missions)`.

State: `totalXp, coins, statXp, xpByDay, unlocked, toasts, settings, missions,
habits, goals, journal, focusSessions, health, transactions, books, studySessions`

Actions (all on the store):
- Missions: `addMission({title, date?, difficulty?, category?, notes?})`,
  `toggleMission(id)`, `updateMission(id, patch)`, `deleteMission(id)`
- Habits: `addHabit({name, icon?, category?, schedule?, target?})`,
  `updateHabit(id, patch)`, `deleteHabit(id)`, `checkHabit(id, date?, delta?)`
- Goals: `addGoal({title, horizon?, category?, priority?, difficulty?, deadline?,
  notes?, milestones?: string[]})`, `updateGoal`, `deleteGoal`,
  `addMilestone(goalId, title)`, `toggleMilestone(goalId, msId)`, `completeGoal(id)`
- Journal: `addJournal({type, text, mood?, gratitude?, wins?, lessons?, tags?, date?})`,
  `updateJournal`, `deleteJournal`
- Focus: `logFocusSession(minutes, "pomodoro"|"deep", label?)`
- Health: `updateHealth(dateISO, partialHealthDay)` — fields: `water, sleepHours,
  steps, weightKg, mood(1-5), meditationMin, workoutMin`
- Finance: `addTransaction({type:"income"|"expense", amount, category, note?, date?})`,
  `deleteTransaction(id)`, `setBudget(category, limit)`, `removeBudget(category)`
- Learning: `addBook({title, author?, totalPages, status?})`,
  `updateBookProgress(id, currentPage)`, `updateBook`, `deleteBook`,
  `addHighlight(bookId, text)`, `addStudySession({minutes, subject, kind?, date?})`,
  `deleteStudySession(id)`
- Misc: `updateSettings(patch)`, `exportJSON()`, `importJSON(json): boolean`,
  `resetAll()`, `pushToast({kind, title, detail?})`, `awardXp(xp, category?, reason?)`

## Types — `import type { ... } from "../../store/types"`

`Mission, Habit, Goal, Milestone, JournalEntry, FocusSession, HealthDay,
Transaction, Book, StudySession, Settings, StatCategory, Difficulty, ISODate,
GoalHorizon, JournalType, StudyKind` + constants `STAT_CATEGORIES, STAT_LABEL`.

Habit.schedule = days of week (0=Sun…6=Sat). Habit.log = `{ [date]: count }`,
done when `count >= target`.

## Engine — `import { ... } from "../../lib/xp"`

`levelFromXp(xp)`, `levelProgress(xp) → {level, current, needed, pct}`,
`statLevelFromXp`, `statLevelProgress`, `titleForLevel(level)`,
`rankForLevel(level)`, `DIFFICULTY_XP`, `DIFFICULTY_LABEL`, `coinsForXp`,
`xpToReachLevel`, `MAX_LEVEL`.

## Selectors — `import { ... } from "../../store/selectors"`

`currentStreak({xpByDay})`, `longestStreak`, `isHabitDue(habit, date?)`,
`habitDoneOn(habit, date)`, `habitStreak(habit)`, `habitSuccessRate(habit, n?)`,
`lifeScores(state) → {discipline, health, productivity, knowledge, finance, focus, life}`,
`xpSeries({xpByDay}, n)`, `contributionGrid({xpByDay}, weeks) → [{date, xp, level 0-4}]`,
`statRadar({statXp}) → [{stat, level, key}]`, `todayMissionProgress({missions})`,
`habitsToday({habits})`.
For `lifeScores` pass the full state: `const scores = lifeScores(useHeal());`
(fine to subscribe broadly on dashboards) — or select the slices it needs.

## Dates — `import { ... } from "../../lib/dates"`

`todayISO()`, `toISO(d)`, `fromISO(iso)`, `addDays(iso, n)`, `lastNDates(n, end?)`,
`weekdayOf(iso)`, `startOfWeek(iso)`, `monthKey(iso)`, `daysBetween(a,b)`,
`formatShort`, `formatFull`, `formatWeekday`, `isToday`, `greeting()`.

## UI kit — `import { ... } from "../../components/ui"`

- `<ProgressBar value max? color? height? />`
- `<ProgressRing pct size? stroke? color?>{children}</ProgressRing>` (pct 0..1)
- `<StatTile label value sub? icon? accent? />`
- `<Modal open onClose title>{form}</Modal>`
- `<EmptyState icon title hint? action? />`
- `<SectionHeader title action? />`
- `<CategoryBadge category />`
- Maps: `CATEGORY_ICON` (lucide component per StatCategory), `CATEGORY_COLOR`
  (CSS color string), `DIFFICULTY_COLOR`.

Icons: `lucide-react`, size 14–20.

## CSS classes (already loaded globally — use these, avoid inline styles except
for one-off dimensions/colors)

Layout: `page, page-title, page-subtitle, grid grid-2|grid-3|grid-4|grid-auto,
row, row-between, col, wrap, grow`
Cards: `card, card-hover, card-accent, card-title`
Buttons: `btn, btn-primary, btn-ghost, btn-danger, btn-sm, btn-icon`
Forms: `input, select, textarea, label`
Misc: `chip, chip-active, muted, small, mono, gradient-text, divider,
progress-track/fill, check-circle (+ .done), strike, empty, tabs, tab (+ .active),
stat-tile, stat-label, stat-value, stat-sub`
Tokens: `var(--violet) var(--blue) var(--cyan) var(--success) var(--warning)
var(--danger) var(--text-1..3) var(--glass) var(--glass-border) var(--cat-<category>)
var(--diff-<difficulty>) var(--grad-brand) var(--radius-sm/md/lg/full)`

## Charts (Recharts) — `import { ... } from "../../lib/chartTheme"`

`CHART_COLORS` (assign in fixed order, never cycle — fold extras into "Other"),
`HEAT_RAMP` (5-step sequential for heatmaps), `GRID_STROKE`, `AXIS_TICK`,
`AXIS_LINE`, `TOOLTIP_STYLE`, `TOOLTIP_LABEL_STYLE`, `TOOLTIP_ITEM_STYLE`.

Rules: ONE y-axis per chart (never dual-axis — two measures = two charts).
Always `<ResponsiveContainer width="100%" height={N}>`. Always a themed
`<Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE}
itemStyle={TOOLTIP_ITEM_STYLE} cursor={{fill: "rgba(255,255,255,0.04)"}} />`.
CartesianGrid: `stroke={GRID_STROKE} vertical={false}`. Axis: `tick={AXIS_TICK}
axisLine={AXIS_LINE} tickLine={false}`. Bars: `radius={[4,4,0,0]}`,
`maxBarSize={36}`. Lines/areas: `strokeWidth={2}`, `dot={false}` on dense series.
Legend only when ≥2 series. Labels/ticks always use text colors, never series
colors. Empty data → render an `<EmptyState>` instead of a hollow chart.

## Quality bar

- The page must feel ALIVE: card hover lifts, `check-circle done` pop animation,
  progress bars that fill smoothly. Never a dead wall of text.
- Every list needs a considered `<EmptyState>` with a call-to-action.
- Forms in `<Modal>`; primary action `btn btn-primary`; Enter submits where natural.
- Confirm destructive deletes (a simple `confirm()` is acceptable).
- TypeScript strict: no `any` unless unavoidable, no unused-import errors,
  `import type` for type-only imports.
- Responsive: works at 380px wide (grids collapse via the provided classes).
