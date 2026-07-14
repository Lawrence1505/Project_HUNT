# HEAL — Ecosystem Roadmap

The master vision: a Personal Growth Operating System spanning web, mobile,
watch, AI, community, and an open API. This roadmap sequences it so every phase
ships something usable and each layer builds on a proven previous one.

## Phase 0 — Heal Web v0.1 ✅ (this repo)

Offline-first PWA-ready web app. Single-device, zero backend.
- Core engine: XP / levels / ranks / 10 stats / coins / streaks / 40+ achievements
- Modules: dashboard, missions, habits, goals, focus, journal, health, finance,
  learning, stats, achievements, on-device coach, profile
- JSON export/import backup

## Phase 1 — Polish & PWA (weeks)

- `vite-plugin-pwa`: installable app, offline cache, home-screen icon
- Notifications API: streak-at-risk, water, and focus-break nudges (opt-in, encouraging not naggy)
- Season/weekly challenges generated from the user's own data
- Streak protection item (spend coins), daily reward chest, skill-tree view of the 10 stats
- Onboarding flow: pick starter habits/goals, set targets, choose avatar

## Phase 2 — Heal AI (cloud LLM coach)

- Pluggable provider layer (Anthropic Claude first) behind the existing Coach UI
- The on-device analyzers become the *context builders*: they compress store
  state into a structured weekly summary the LLM reasons over
- Features: conversational coaching, true schedule generation, habit-design
  advice, monthly PDF-style reports, burnout/pattern narratives
- Privacy stance: explicit opt-in, user-supplied or subscription key, raw
  journal text excluded by default

## Phase 3 — Sync backend + accounts

- NestJS + PostgreSQL + Prisma + Redis; JWT + OAuth (Google/Apple/GitHub) + passkeys
- CRDT-ish merge for offline-first multi-device sync (the store is already
  serializable and idempotent by id)
- E2E-encrypted journal option (AES, key derived client-side)
- Admin dashboard: feature flags, analytics, support

## Phase 4 — Heal Mobile + Watch + Health data

- React Native (shares the TypeScript engine/store contracts 1:1)
- Home-screen widgets: progress ring, today's habits, water counter
- Health Connect / HealthKit: auto-import steps, sleep, workouts, heart rate
- Watch: quick habit check-ins, focus timer, breathing

## Phase 5 — Community & Marketplace

- Friends, leaderboards (opt-in), accountability groups, shared challenges, mentors
- Marketplace: themes, avatar frames, icon packs, premium AI packs (coins + premium)
- Moderation, privacy controls, block/report from day one

## Phase 6 — Heal API & verticals

- Public REST/GraphQL API + webhooks; third-party integrations (Todoist,
  Google Calendar, Strava, banks via aggregators)
- Verticals: Heal Academy (learning paths), Heal Career (skill roadmaps),
  deeper Heal Finance (investments), Heal Health (nutrition)

## Monetization (from Phase 3)

Free core forever → Premium (AI coach, sync, advanced analytics, themes) →
Family/Student plans → AI credits → marketplace rev-share.

## Guiding principles

1. **Healthy addiction only** — streaks motivate, never shame; rest is rewarded (burnout detection already ships in v0.1)
2. **Offline-first, privacy-first** — the user's life data is theirs; local always works
3. **One engine** — every module feeds the same XP pipeline so "Life Score" stays honest
4. **Ship thin vertical slices** — every phase is a complete product, not scaffolding
