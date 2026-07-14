# HEAL ⚡

> **Heal Yourself. Level Your Life.**

HEAL is a **Personal Growth Operating System (PGOS)** — a gamified, offline-first
life dashboard that turns self-improvement into a game you actually want to play.
Missions, habits, goals, focus sessions, journaling, health, finance, and learning
all feed one engine: **XP → Levels → Ranks → Achievements**.

Think *Notion × Habitica × Duolingo × the GitHub contribution graph × Solo Leveling*.

## Quick start

```bash
# 1. Database (PostgreSQL in Docker, host port 5433)
docker compose up -d db

# 2. Env files (defaults work as-is — OTPs print to the server console)
cp server/.env.example server/.env
cp .env.example .env

# 3. API server (auth) — http://localhost:4000
cd server && npm install && npm start

# 4. App — http://localhost:5173
npm install
npm run dev
```

`npm run build` produces the production bundle in `dist/`; `npm run preview` serves it.

**Accounts** live in PostgreSQL (bcrypt passwords, JWT sessions). Sign-up
verifies your **email and phone via 6-digit OTPs**, sign-in takes email *or*
phone, and there's a forgot-password flow. It all runs free out of the box —
OTP codes go to the server console until you plug in Gmail SMTP or Firebase
Phone Auth. Setup, API reference, and testing guide: [docs/AUTH.md](docs/AUTH.md).
**Life data** stays on your device (localStorage) and can be exported/imported
as JSON from **Profile → Data**.

## What's inside (v0.1 — Heal Web)

| Module | What it does |
|---|---|
| **Dashboard** | Command center: level ring, life scores, today's missions & habits, quick water/mood log, streak, quote + coach tip |
| **Missions** | Tasks as XP-rewarding missions (easy → epic difficulty) |
| **Habits** | Scheduled habits with streaks, strength %, 7-day grid |
| **Goals** | Weekly → lifetime goals with milestones and 3× XP payoffs |
| **Focus** | Drift-free Pomodoro + deep-work stopwatch, focus score |
| **Journal** | Morning/night/free templates, gratitude, mood, tags, search |
| **Health** | Water, sleep, steps, weight, mood, workouts, meditation + trends |
| **Finance** | Income/expenses, budgets, savings rate, finance score |
| **Learning** | Book tracker with highlights + study log, knowledge XP |
| **Statistics** | Contribution heatmap, 10-stat radar, XP charts |
| **Achievements** | 40+ achievements across bronze/silver/gold tiers |
| **AI Coach** | On-device analytics: weekly analysis, schedule generator, burnout detection |
| **Profile** | Avatar, rank, 10 stat levels, targets, backup/restore |

### The engine

- **XP curve:** level *L* requires `100·(L−1)^1.6` total XP (level 100 ≈ 155k XP)
- **Titles:** Beginner → Awakened → Disciplined → Focused → Scholar → Warrior → Master → Elite → Legend
- **Ranks:** E → D → C → B → A → S → SS → SSS
- **10 independent life stats** (Strength, Mind, Knowledge, Health, Finance,
  Relationships, Productivity, Creativity, Leadership, Communication), each with
  its own level curve
- **Coins** earned alongside XP, with achievement bonuses
- **Streaks** from daily activity — every module feeds the same flame

## Architecture

```
src/
├── lib/            # pure engine: xp curves, dates, chart theme
├── store/          # zustand store (persisted), types, selectors, achievements
├── components/     # ui kit, particle background, toasts
├── features/       # one folder per module (lazy-loaded routes)
└── styles/         # design tokens + glassmorphism system
```

- **State:** single persisted zustand store; every reward flows through one
  `grant()` pipeline (XP → coins → daily activity → level-up → achievements)
- **Design:** dark glass UI, CSS design tokens, validated chart palette
  (CVD-safe on the dark surface)
- **Charts:** Recharts + a shared `chartTheme` so every chart reads as one system

## Roadmap — the HEAL ecosystem

See [docs/ROADMAP.md](docs/ROADMAP.md) for the phased plan from this web v0.1 to
Heal Mobile, Heal AI (cloud LLM coach), sync backend, watch/health integrations,
community, and the public API.
