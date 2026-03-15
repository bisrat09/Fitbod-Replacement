# Fitlog — Claude Code Guide

## Working Protocol
- Always read TASKS.md before starting work
- Update TASKS.md after every completed phase
- TASKS.md has the full Fitbod design spec — never ask for screenshots
- Keep `DEVLOG.md` and `AGENTS.md` updated after each iteration

## Project Overview
Fitlog is an offline-first fitness workout logging app built with Expo Router + React Native + SQLite. It's a Fitbod replacement — no cloud, fully local data. Currently undergoing a UI redesign to match Fitbod's visual style.

## Tech Stack
- **Framework**: Expo SDK 54 + React Native 0.81.4 + React 19.1.0
- **Routing**: Expo Router 6 (file-based, tab layout)
- **Database**: SQLite via `expo-sqlite` (local only, offline-first)
- **Language**: TypeScript (strict mode)
- **Build**: Metro bundler with Babel
- **Icons**: `@expo/vector-icons` (Ionicons)
- **State**: React hooks (local), Zustand installed but unused

## Project Structure
```
app/                    # Screens (Expo Router)
  _layout.tsx           # Tab navigation (4 tabs: Workout, Log, Progress, Settings)
  index.tsx             # Workout screen (~1158 lines — being refactored)
  history.tsx           # Workout history with expandable detail
  progress.tsx          # 1RM trends per exercise
  programs.tsx          # Program builder (hidden route, accessible from Settings)
  settings.tsx          # Unit toggle, export/import, about
  exercises.tsx         # Exercise library with search + custom creation (hidden route)
  equipment.tsx         # Equipment inventory toggles (hidden route)
  log.tsx               # Recent sets (hidden route)
src/theme/              # Theming (Fitbod-style)
  colors.ts             # Light + dark palettes (Fitbod colors)
  ThemeContext.tsx       # Theme provider + useTheme hook (dark default)
  typography.ts         # Font size + weight constants
src/lib/                # Core logic
  dao.ts                # All database queries (~1025 lines)
  db.ts                 # DB init + migration runner
  fitlog_schema.ts      # Base schema v1 as TypeScript string
  bootstrap.ts          # Startup: opens DB, runs migrations, init userId
  progression.ts        # Weight suggestion, Epley 1RM, warmups
  migrations/           # Incremental schema migrations (v2-v7)
```

## Key Conventions
- **Multi-user schema**: Every table has `user_id`. Always include it in queries.
- **Offline-first**: No network calls. All data in SQLite.
- **Idempotent seeds**: Exercises are seeded via `INSERT OR IGNORE` / `findByName` check.
- **Migrations**: Incremental via `app_meta.schema_version`. Add new migrations in `src/lib/migrations/`.
- **DAO pattern**: All DB access goes through `src/lib/dao.ts`. No raw SQL in screens.
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig).
- **Theme**: Use `useTheme()` hook for colors. Never hardcode hex values — use `c.bg`, `c.card`, `c.accent`, etc.
- **Dark mode default**: App defaults to dark theme (Fitbod-style).

## Schema (v7)
Core tables: `users`, `exercises`, `workouts`, `sets`, `workout_blocks`, `block_exercises`, `user_equipment`, `user_favorite_exercises`, `metrics`, `weekly_volume`, `programs`, `program_days`, `program_day_exercises`, `settings`, `app_meta`, `body_weight`.

## Color Palette (Fitbod-style)
```
Dark theme (default):
  bg: #1C1C1E          card: #2C2C2E        cardBorder: #3A3A3C
  text: #FFFFFF        textSecondary: #8E8E93  textMuted: #636366
  accent: #FF3B5C      green: #34C759       gold: #FFD700
```

## Tab Layout (4 tabs)
1. **Workout** (barbell icon) → `index.tsx`
2. **Log** (calendar icon) → `history.tsx`
3. **Progress** (trending-up icon) → `progress.tsx`
4. **Settings** (settings icon) → `settings.tsx`

Hidden routes: Programs, Exercises, Equipment, Recent (Log)

## Running
```bash
npm start              # Expo dev server
npm start -- --clear   # Clear cache
npm test               # 186 tests
npx expo run:ios       # Build + run iOS
npx expo-doctor        # Check dependencies
```

## Working Rules
- Modify only necessary files; prefer localized changes.
- Do not add dependencies without developer approval.
- Keep business logic out of views (use dao.ts / progression.ts).
- If adding a table or column, create a migration in `src/lib/migrations/`.
- TypeScript with explicit types on public helpers; avoid `any` where practical.

## UI Redesign Status
See TASKS.md for the full Fitbod design spec and phase checklist.
- **Phase 1: Theme & Foundation** — DONE (colors, dark default, 4-tab Ionicons, typography)
- **Phase 2: Reusable Components** — pending
- **Phase 3: Workout Screen Redesign** — pending
- **Phase 4: History & Workout Summary** — pending
- **Phase 5: Progress, Programs, Exercises** — pending
- **Phase 6: Settings & Equipment** — pending
- **Phase 7: Polish & Cleanup** — pending
