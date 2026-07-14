import { Suspense, lazy, useState, useEffect } from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Swords,
  Repeat,
  Target,
  Timer,
  NotebookPen,
  HeartPulse,
  GraduationCap,
  Wallet,
  BarChart3,
  Trophy,
  Bot,
  UserRound,
  Flame,
  Coins,
  Menu,
  LogOut,
} from "lucide-react";
import { useHeal, loadUserData, clearActiveUser } from "./store/store";
import { useAuth } from "./store/auth";
import { levelProgress, titleForLevel } from "./lib/xp";
import { currentStreak } from "./store/selectors";
import { greeting, todayISO, formatFull } from "./lib/dates";
import { ParticleBackground } from "./components/ParticleBackground";
import { Toasts } from "./components/Toasts";
import { ProgressBar } from "./components/ui";

const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const MissionsPage = lazy(() => import("./features/missions/MissionsPage"));
const HabitsPage = lazy(() => import("./features/habits/HabitsPage"));
const GoalsPage = lazy(() => import("./features/goals/GoalsPage"));
const FocusPage = lazy(() => import("./features/focus/FocusPage"));
const JournalPage = lazy(() => import("./features/journal/JournalPage"));
const HealthPage = lazy(() => import("./features/health/HealthPage"));
const LearningPage = lazy(() => import("./features/learning/LearningPage"));
const FinancePage = lazy(() => import("./features/finance/FinancePage"));
const StatsPage = lazy(() => import("./features/stats/StatsPage"));
const AchievementsPage = lazy(() => import("./features/achievements/AchievementsPage"));
const CoachPage = lazy(() => import("./features/coach/CoachPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));
const SignInPage = lazy(() => import("./features/auth/SignInPage"));
const SignUpPage = lazy(() => import("./features/auth/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));

const NAV = [
  { section: "Command Center" },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/missions", label: "Missions", icon: Swords },
  { to: "/habits", label: "Habits", icon: Repeat },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/focus", label: "Focus", icon: Timer },
  { section: "Life Modules" },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/learning", label: "Learning", icon: GraduationCap },
  { to: "/finance", label: "Finance", icon: Wallet },
  { section: "Progress" },
  { to: "/stats", label: "Statistics", icon: BarChart3 },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/coach", label: "AI Coach", icon: Bot },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">H</div>
          <div>
            <div className="brand-name gradient-text">HEAL</div>
            <div className="brand-tag">Level Your Life</div>
          </div>
        </div>
        {NAV.map((item, i) =>
          "section" in item ? (
            <div key={i} className="nav-section">
              {item.section}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          )
        )}
      </aside>
    </>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const totalXp = useHeal((s) => s.totalXp);
  const coins = useHeal((s) => s.coins);
  const xpByDay = useHeal((s) => s.xpByDay);
  const name = useHeal((s) => s.settings.name);
  const lp = levelProgress(totalXp);
  const streak = currentStreak({ xpByDay });

  return (
    <header className="header">
      <button className="btn btn-ghost btn-icon menu-btn" onClick={onMenu} aria-label="Menu">
        <Menu size={20} />
      </button>
      <div className="grow">
        <div className="header-greeting">
          {greeting()}, {name}
        </div>
        <div className="header-date">{formatFull(todayISO())}</div>
      </div>
      <div className="level-pill" title={`${lp.current}/${lp.needed} XP to next level`}>
        <span className="level-num">LV {lp.level}</span>
        <div className="header-xpbar">
          <ProgressBar value={lp.current} max={lp.needed} height={6} />
        </div>
        <span className="small muted">{titleForLevel(lp.level)}</span>
      </div>
      <div className="pill-stat" title="Current streak">
        <Flame size={15} color="var(--warning)" />
        {streak}
      </div>
      <div className="pill-stat" title="Coins">
        <Coins size={15} color="var(--warning)" />
        {coins.toLocaleString()}
      </div>
      <button
        className="btn btn-ghost btn-icon"
        onClick={() => useAuth.getState().signOut()}
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <div className="muted">Loading…</div>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const token = useAuth((s) => s.token);
  const userId = useAuth((s) => s.user?.id ?? null);
  // Gate the app on data binding so we never flash one user's data to another.
  const [dataReady, setDataReady] = useState(false);

  // Bind the life-data store to the authenticated user (login, sign-up, or a
  // restored session on refresh); clear it on sign-out. This is the isolation
  // boundary: each account only ever reads/writes its own namespaced data.
  useEffect(() => {
    let alive = true;
    setDataReady(false);
    if (userId) {
      const name = useAuth.getState().user?.name;
      loadUserData(userId, name ?? undefined).finally(() => {
        if (alive) setDataReady(true);
      });
    } else {
      clearActiveUser();
      setDataReady(true);
    }
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!token) {
    return (
      <HashRouter>
        <ParticleBackground />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot" element={<ForgotPasswordPage />} />
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    );
  }

  // Signed in but this user's data hasn't loaded yet — brief guard.
  if (!dataReady) return <PageLoader />;

  return (
    <HashRouter>
      <ParticleBackground />
      <div className="shell">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="main">
          <Header onMenu={() => setMenuOpen(true)} />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/missions" element={<MissionsPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/learning" element={<LearningPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/coach" element={<CoachPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/signin" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route path="/forgot" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
      <Toasts />
    </HashRouter>
  );
}
