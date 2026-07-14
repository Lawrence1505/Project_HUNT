import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { uid } from "../lib/id";
import { todayISO } from "../lib/dates";
import {
  levelFromXp,
  coinsForXp,
  DIFFICULTY_XP,
  titleForLevel,
} from "../lib/xp";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_COIN_BONUS,
} from "./achievements";
import type {
  Mission,
  Habit,
  Goal,
  Milestone,
  JournalEntry,
  FocusSession,
  HealthDay,
  Transaction,
  Book,
  StudySession,
  Toast,
  Settings,
  StatCategory,
  ISODate,
  Difficulty,
  GoalHorizon,
  JournalType,
  StudyKind,
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  name: "Hunter",
  avatar: "⚡",
  waterTarget: 8,
  sleepTarget: 8,
  stepsTarget: 8000,
  focusTarget: 120,
  pomodoroMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  budgets: {},
  currency: "$",
};

const EMPTY_STAT_XP: Record<StatCategory, number> = {
  strength: 0,
  mind: 0,
  knowledge: 0,
  health: 0,
  finance: 0,
  relationships: 0,
  productivity: 0,
  creativity: 0,
  leadership: 0,
  communication: 0,
};

/* =========================================================================
   Per-user data isolation.
   Every account's life-data is persisted under its OWN localStorage key
   (`heal:user:<id>`), never a shared one. `activeUserId` is set on sign-in and
   cleared on sign-out; the store's storage adapter reads it live so writes
   always land in the current user's namespace (and `heal:anon` when nobody is
   signed in). This is what keeps User B from ever seeing User A's data.
   ========================================================================= */
let activeUserId: string | null = null;

const STORE_KEY_BASE = "heal:v1";

function scopedKey(): string {
  return activeUserId ? `${STORE_KEY_BASE}:user:${activeUserId}` : `${STORE_KEY_BASE}:anon`;
}

const namespacedStorage: StateStorage = {
  getItem: () => localStorage.getItem(scopedKey()),
  setItem: (_name, value) => localStorage.setItem(scopedKey(), value),
  removeItem: () => localStorage.removeItem(scopedKey()),
};

export interface HealState {
  /* gamification */
  totalXp: number;
  coins: number;
  statXp: Record<StatCategory, number>;
  xpByDay: Record<ISODate, number>;
  /** achievement id -> unlock timestamp */
  unlocked: Record<string, number>;
  bestStreak: number;
  toasts: Toast[];

  /* data */
  settings: Settings;
  missions: Mission[];
  habits: Habit[];
  goals: Goal[];
  journal: JournalEntry[];
  focusSessions: FocusSession[];
  health: Record<ISODate, HealthDay>;
  transactions: Transaction[];
  books: Book[];
  studySessions: StudySession[];

  /* core engine */
  awardXp: (xp: number, category?: StatCategory, reason?: string) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  /* missions */
  addMission: (m: {
    title: string;
    date?: ISODate;
    difficulty?: Difficulty;
    category?: StatCategory;
    notes?: string;
  }) => void;
  toggleMission: (id: string) => void;
  updateMission: (id: string, patch: Partial<Mission>) => void;
  deleteMission: (id: string) => void;

  /* habits */
  addHabit: (h: {
    name: string;
    icon?: string;
    category?: StatCategory;
    schedule?: number[];
    target?: number;
  }) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  /** increment/decrement today's (or given date's) completion count */
  checkHabit: (id: string, date?: ISODate, delta?: number) => void;

  /* goals */
  addGoal: (g: {
    title: string;
    horizon?: GoalHorizon;
    category?: StatCategory;
    priority?: Goal["priority"];
    difficulty?: Difficulty;
    deadline?: ISODate;
    notes?: string;
    milestones?: string[];
  }) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addMilestone: (goalId: string, title: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  completeGoal: (id: string) => void;

  /* journal */
  addJournal: (e: {
    type: JournalType;
    text: string;
    mood?: JournalEntry["mood"];
    gratitude?: string[];
    wins?: string;
    lessons?: string;
    tags?: string[];
    date?: ISODate;
  }) => void;
  updateJournal: (id: string, patch: Partial<JournalEntry>) => void;
  deleteJournal: (id: string) => void;

  /* focus */
  logFocusSession: (minutes: number, mode: FocusSession["mode"], label?: string) => void;

  /* health */
  updateHealth: (date: ISODate, patch: Partial<HealthDay>) => void;

  /* finance */
  addTransaction: (t: {
    type: Transaction["type"];
    amount: number;
    category: string;
    note?: string;
    date?: ISODate;
  }) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: string, monthlyLimit: number) => void;
  removeBudget: (category: string) => void;

  /* learning */
  addBook: (b: { title: string; author?: string; totalPages: number; status?: Book["status"] }) => void;
  updateBookProgress: (id: string, currentPage: number) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  addHighlight: (bookId: string, text: string) => void;
  addStudySession: (s: { minutes: number; subject: string; kind?: StudyKind; date?: ISODate }) => void;
  deleteStudySession: (id: string) => void;

  /* settings & data */
  updateSettings: (patch: Partial<Settings>) => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

export const useHeal = create<HealState>()(
  persist(
    (set, get) => {
      /** Core reward pipeline: XP → coins → daily activity → level-up → achievements. */
      function grant(xp: number, category?: StatCategory, reason?: string) {
        const s = get();
        const day = todayISO();
        const beforeLevel = levelFromXp(s.totalXp);
        const totalXp = Math.max(0, s.totalXp + xp);
        const afterLevel = levelFromXp(totalXp);
        const coins = Math.max(
          0,
          s.coins + (xp >= 0 ? coinsForXp(xp) : -coinsForXp(-xp))
        );
        const xpByDay = {
          ...s.xpByDay,
          [day]: Math.max(0, (s.xpByDay[day] ?? 0) + xp),
        };
        if (xpByDay[day] === 0) delete xpByDay[day];
        const statXp = category
          ? { ...s.statXp, [category]: Math.max(0, (s.statXp[category] ?? 0) + xp) }
          : s.statXp;

        const toasts: Toast[] = [...s.toasts];
        if (xp > 0 && reason) {
          toasts.push({ id: uid(), kind: "xp", title: `+${xp} XP`, detail: reason });
        }
        if (afterLevel > beforeLevel) {
          toasts.push({
            id: uid(),
            kind: "levelup",
            title: `Level ${afterLevel} — ${titleForLevel(afterLevel)}!`,
            detail: "Your dedication is paying off.",
          });
        }
        set({ totalXp, coins, xpByDay, statXp, toasts: toasts.slice(-6) });
        evaluateAchievements();
      }

      function evaluateAchievements() {
        const s = get();
        const newly = ACHIEVEMENTS.filter(
          (a) => !s.unlocked[a.id] && a.check(s)
        );
        if (newly.length === 0) return;
        const unlocked = { ...s.unlocked };
        let coins = s.coins;
        const toasts = [...s.toasts];
        for (const a of newly) {
          unlocked[a.id] = Date.now();
          coins += ACHIEVEMENT_COIN_BONUS[a.tier];
          toasts.push({
            id: uid(),
            kind: "achievement",
            title: `${a.icon} ${a.name}`,
            detail: `Achievement unlocked · +${ACHIEVEMENT_COIN_BONUS[a.tier]} coins`,
          });
        }
        set({ unlocked, coins, toasts: toasts.slice(-6) });
      }

      return {
        totalXp: 0,
        coins: 0,
        statXp: { ...EMPTY_STAT_XP },
        xpByDay: {},
        unlocked: {},
        bestStreak: 0,
        toasts: [],

        settings: { ...DEFAULT_SETTINGS },
        missions: [],
        habits: [],
        goals: [],
        journal: [],
        focusSessions: [],
        health: {},
        transactions: [],
        books: [],
        studySessions: [],

        awardXp: (xp, category, reason) => grant(xp, category, reason),

        pushToast: (t) =>
          set((s) => ({ toasts: [...s.toasts, { ...t, id: uid() }].slice(-6) })),
        dismissToast: (id) =>
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        /* ---------- missions ---------- */
        addMission: (m) => {
          const mission: Mission = {
            id: uid(),
            title: m.title.trim(),
            notes: m.notes,
            date: m.date ?? todayISO(),
            difficulty: m.difficulty ?? "medium",
            category: m.category ?? "productivity",
            done: false,
            createdAt: Date.now(),
          };
          set((s) => ({ missions: [mission, ...s.missions] }));
          evaluateAchievements();
        },
        toggleMission: (id) => {
          const s = get();
          const m = s.missions.find((x) => x.id === id);
          if (!m) return;
          const done = !m.done;
          set({
            missions: s.missions.map((x) =>
              x.id === id
                ? { ...x, done, doneAt: done ? Date.now() : undefined }
                : x
            ),
          });
          const xp = DIFFICULTY_XP[m.difficulty];
          grant(done ? xp : -xp, m.category, done ? `Mission: ${m.title}` : undefined);
        },
        updateMission: (id, patch) =>
          set((s) => ({
            missions: s.missions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          })),
        deleteMission: (id) =>
          set((s) => ({ missions: s.missions.filter((x) => x.id !== id) })),

        /* ---------- habits ---------- */
        addHabit: (h) => {
          const habit: Habit = {
            id: uid(),
            name: h.name.trim(),
            icon: h.icon ?? "✅",
            category: h.category ?? "productivity",
            schedule: h.schedule ?? [0, 1, 2, 3, 4, 5, 6],
            target: Math.max(1, h.target ?? 1),
            log: {},
            createdAt: Date.now(),
          };
          set((s) => ({ habits: [...s.habits, habit] }));
          evaluateAchievements();
        },
        updateHabit: (id, patch) =>
          set((s) => ({
            habits: s.habits.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          })),
        deleteHabit: (id) =>
          set((s) => ({ habits: s.habits.filter((x) => x.id !== id) })),
        checkHabit: (id, date, delta = 1) => {
          const s = get();
          const h = s.habits.find((x) => x.id === id);
          if (!h) return;
          const d = date ?? todayISO();
          const prev = h.log[d] ?? 0;
          const next = Math.max(0, prev + delta);
          const log = { ...h.log };
          if (next === 0) delete log[d];
          else log[d] = next;
          set({
            habits: s.habits.map((x) => (x.id === id ? { ...x, log } : x)),
          });
          // XP when the habit crosses its daily target (and rollback if undone)
          if (prev < h.target && next >= h.target) {
            grant(15, h.category, `Habit: ${h.name}`);
          } else if (prev >= h.target && next < h.target) {
            grant(-15, h.category);
          }
        },

        /* ---------- goals ---------- */
        addGoal: (g) => {
          const goal: Goal = {
            id: uid(),
            title: g.title.trim(),
            notes: g.notes,
            horizon: g.horizon ?? "monthly",
            category: g.category ?? "productivity",
            priority: g.priority ?? "medium",
            difficulty: g.difficulty ?? "medium",
            deadline: g.deadline,
            milestones: (g.milestones ?? [])
              .filter((t) => t.trim())
              .map((t) => ({ id: uid(), title: t.trim(), done: false })),
            status: "active",
            createdAt: Date.now(),
          };
          set((s) => ({ goals: [goal, ...s.goals] }));
          evaluateAchievements();
        },
        updateGoal: (id, patch) =>
          set((s) => ({
            goals: s.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          })),
        deleteGoal: (id) =>
          set((s) => ({ goals: s.goals.filter((x) => x.id !== id) })),
        addMilestone: (goalId, title) =>
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === goalId
                ? {
                    ...g,
                    milestones: [
                      ...g.milestones,
                      { id: uid(), title: title.trim(), done: false } as Milestone,
                    ],
                  }
                : g
            ),
          })),
        toggleMilestone: (goalId, milestoneId) => {
          const s = get();
          const g = s.goals.find((x) => x.id === goalId);
          if (!g) return;
          const ms = g.milestones.find((m) => m.id === milestoneId);
          if (!ms) return;
          const done = !ms.done;
          set({
            goals: s.goals.map((x) =>
              x.id === goalId
                ? {
                    ...x,
                    milestones: x.milestones.map((m) =>
                      m.id === milestoneId ? { ...m, done } : m
                    ),
                  }
                : x
            ),
          });
          grant(done ? 10 : -10, g.category, done ? `Milestone: ${ms.title}` : undefined);
        },
        completeGoal: (id) => {
          const s = get();
          const g = s.goals.find((x) => x.id === id);
          if (!g || g.status === "completed") return;
          set({
            goals: s.goals.map((x) =>
              x.id === id
                ? { ...x, status: "completed" as const, completedAt: Date.now() }
                : x
            ),
          });
          grant(DIFFICULTY_XP[g.difficulty] * 3, g.category, `Goal achieved: ${g.title}`);
        },

        /* ---------- journal ---------- */
        addJournal: (e) => {
          const entry: JournalEntry = {
            id: uid(),
            date: e.date ?? todayISO(),
            type: e.type,
            mood: e.mood,
            gratitude: e.gratitude?.filter((x) => x.trim()),
            wins: e.wins,
            lessons: e.lessons,
            text: e.text,
            tags: e.tags ?? [],
            createdAt: Date.now(),
          };
          set((s) => ({ journal: [entry, ...s.journal] }));
          grant(15, "mind", "Journal entry");
        },
        updateJournal: (id, patch) =>
          set((s) => ({
            journal: s.journal.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          })),
        deleteJournal: (id) =>
          set((s) => ({ journal: s.journal.filter((x) => x.id !== id) })),

        /* ---------- focus ---------- */
        logFocusSession: (minutes, mode, label) => {
          if (minutes <= 0) return;
          const session: FocusSession = {
            id: uid(),
            date: todayISO(),
            minutes: Math.round(minutes),
            mode,
            label,
            endedAt: Date.now(),
          };
          set((s) => ({ focusSessions: [session, ...s.focusSessions] }));
          grant(
            Math.min(120, Math.round(minutes)),
            "productivity",
            `${mode === "pomodoro" ? "Pomodoro" : "Deep work"} · ${Math.round(minutes)} min`
          );
        },

        /* ---------- health ---------- */
        updateHealth: (date, patch) => {
          const s = get();
          const prev: HealthDay = s.health[date] ?? {};
          const next: HealthDay = { ...prev, ...patch };
          set({ health: { ...s.health, [date]: next } });

          const t = s.settings;
          // Water: reward crossing the daily target
          if ((prev.water ?? 0) < t.waterTarget && (next.water ?? 0) >= t.waterTarget)
            grant(10, "health", "Water target hit");
          // Sleep: reward logging a night at/above target
          if (prev.sleepHours == null && next.sleepHours != null)
            grant(next.sleepHours >= t.sleepTarget ? 15 : 5, "health", "Sleep logged");
          // Steps: reward crossing the target
          if ((prev.steps ?? 0) < t.stepsTarget && (next.steps ?? 0) >= t.stepsTarget)
            grant(15, "health", "Step goal reached");
          // Workout: reward first log of the day (1 XP per 2 min, cap 40)
          if ((prev.workoutMin ?? 0) === 0 && (next.workoutMin ?? 0) > 0)
            grant(
              Math.min(40, Math.round((next.workoutMin ?? 0) / 2)),
              "strength",
              "Workout logged"
            );
          // Meditation: reward first log of the day
          if ((prev.meditationMin ?? 0) === 0 && (next.meditationMin ?? 0) > 0)
            grant(
              Math.min(20, Math.round((next.meditationMin ?? 0) / 2)),
              "mind",
              "Meditation logged"
            );
        },

        /* ---------- finance ---------- */
        addTransaction: (t) => {
          const tx: Transaction = {
            id: uid(),
            date: t.date ?? todayISO(),
            type: t.type,
            amount: Math.abs(t.amount),
            category: t.category.trim() || "Other",
            note: t.note,
          };
          set((s) => ({ transactions: [tx, ...s.transactions] }));
          grant(5, "finance", "Transaction tracked");
        },
        deleteTransaction: (id) =>
          set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),
        setBudget: (category, monthlyLimit) =>
          set((s) => ({
            settings: {
              ...s.settings,
              budgets: { ...s.settings.budgets, [category]: monthlyLimit },
            },
          })),
        removeBudget: (category) =>
          set((s) => {
            const budgets = { ...s.settings.budgets };
            delete budgets[category];
            return { settings: { ...s.settings, budgets } };
          }),

        /* ---------- learning ---------- */
        addBook: (b) => {
          const book: Book = {
            id: uid(),
            title: b.title.trim(),
            author: b.author,
            totalPages: Math.max(1, b.totalPages),
            currentPage: 0,
            status: b.status ?? "reading",
            highlights: [],
            startedAt: b.status === "wishlist" ? undefined : todayISO(),
          };
          set((s) => ({ books: [book, ...s.books] }));
          evaluateAchievements();
        },
        updateBookProgress: (id, currentPage) => {
          const s = get();
          const b = s.books.find((x) => x.id === id);
          if (!b) return;
          const page = Math.min(b.totalPages, Math.max(0, Math.round(currentPage)));
          const delta = page - b.currentPage;
          const finished = page >= b.totalPages;
          set({
            books: s.books.map((x) =>
              x.id === id
                ? {
                    ...x,
                    currentPage: page,
                    status: finished ? "finished" : x.status === "wishlist" ? "reading" : x.status,
                    startedAt: x.startedAt ?? todayISO(),
                    finishedAt: finished ? todayISO() : x.finishedAt,
                  }
                : x
            ),
          });
          if (delta > 0)
            grant(Math.min(30, Math.ceil(delta / 5)), "knowledge", `Read ${delta} pages`);
          if (finished && b.status !== "finished")
            grant(60, "knowledge", `Finished: ${b.title}`);
        },
        updateBook: (id, patch) =>
          set((s) => ({
            books: s.books.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          })),
        deleteBook: (id) =>
          set((s) => ({ books: s.books.filter((x) => x.id !== id) })),
        addHighlight: (bookId, text) =>
          set((s) => ({
            books: s.books.map((x) =>
              x.id === bookId ? { ...x, highlights: [...x.highlights, text.trim()] } : x
            ),
          })),
        addStudySession: (x) => {
          const session: StudySession = {
            id: uid(),
            date: x.date ?? todayISO(),
            minutes: Math.max(1, Math.round(x.minutes)),
            subject: x.subject.trim() || "Study",
            kind: x.kind ?? "other",
          };
          set((s) => ({ studySessions: [session, ...s.studySessions] }));
          grant(
            Math.min(60, Math.round(session.minutes / 2)),
            "knowledge",
            `Studied ${session.subject}`
          );
        },
        deleteStudySession: (id) =>
          set((s) => ({ studySessions: s.studySessions.filter((x) => x.id !== id) })),

        /* ---------- settings & data ---------- */
        updateSettings: (patch) =>
          set((s) => ({ settings: { ...s.settings, ...patch } })),

        exportJSON: () => {
          const s = get();
          const { toasts: _toasts, ...data } = s;
          const clean = Object.fromEntries(
            Object.entries(data).filter(([, v]) => typeof v !== "function")
          );
          return JSON.stringify({ app: "HEAL", version: 1, exportedAt: new Date().toISOString(), data: clean }, null, 2);
        },
        importJSON: (json) => {
          try {
            const parsed = JSON.parse(json);
            const data = parsed?.data;
            if (!data || typeof data.totalXp !== "number" || !Array.isArray(data.missions))
              return false;
            set({
              totalXp: data.totalXp,
              coins: data.coins ?? 0,
              statXp: { ...EMPTY_STAT_XP, ...data.statXp },
              xpByDay: data.xpByDay ?? {},
              unlocked: data.unlocked ?? {},
              bestStreak: data.bestStreak ?? 0,
              settings: { ...DEFAULT_SETTINGS, ...data.settings },
              missions: data.missions ?? [],
              habits: data.habits ?? [],
              goals: data.goals ?? [],
              journal: data.journal ?? [],
              focusSessions: data.focusSessions ?? [],
              health: data.health ?? {},
              transactions: data.transactions ?? [],
              books: data.books ?? [],
              studySessions: data.studySessions ?? [],
            });
            return true;
          } catch {
            return false;
          }
        },
        resetAll: () =>
          set({
            totalXp: 0,
            coins: 0,
            statXp: { ...EMPTY_STAT_XP },
            xpByDay: {},
            unlocked: {},
            bestStreak: 0,
            toasts: [],
            settings: { ...DEFAULT_SETTINGS },
            missions: [],
            habits: [],
            goals: [],
            journal: [],
            focusSessions: [],
            health: {},
            transactions: [],
            books: [],
            studySessions: [],
          }),
      };
    },
    {
      name: STORE_KEY_BASE, // ignored by the adapter; scopedKey() picks the real key
      version: 1,
      storage: createJSONStorage(() => namespacedStorage),
      partialize: (s) =>
        Object.fromEntries(
          Object.entries(s).filter(
            ([k, v]) => typeof v !== "function" && k !== "toasts"
          )
        ) as HealState,
    }
  )
);

/**
 * Bind the store to a signed-in user and load THAT user's data.
 * - If the user has saved data, rehydrate it (fully replaces in-memory data —
 *   the persisted blob contains every data field, so no prior user's state
 *   leaks through).
 * - If not (a brand-new account), reset to fresh defaults: XP 0, level 1, empty
 *   everything. Call this on sign-in/sign-up and on app boot for a live session.
 */
export async function loadUserData(userId: string, fallbackName?: string): Promise<void> {
  activeUserId = userId;
  const hasSaved = localStorage.getItem(scopedKey()) !== null;
  if (hasSaved) {
    await useHeal.persist.rehydrate(); // returning user → their own saved data + name
  } else {
    useHeal.getState().resetAll(); // fresh account; persists empty state to this user's key
    if (fallbackName) useHeal.getState().updateSettings({ name: fallbackName });
  }
}

/**
 * Unbind on sign-out: point storage back at the anonymous namespace, then clear
 * in-memory data. The reset writes empty state to `heal:anon` (harmless) and
 * leaves the user's own key untouched for their next sign-in.
 */
export function clearActiveUser(): void {
  activeUserId = null;
  useHeal.getState().resetAll();
}
