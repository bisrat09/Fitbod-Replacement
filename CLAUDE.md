# Fitlog — Claude Code Guide

## Project Overview
Fitlog is an offline-first fitness workout logging app built with Expo Router + React Native + SQLite. It's a Fitbod replacement — no cloud, fully local data.

## Tech Stack
- **Framework**: Expo SDK 54 + React Native 0.81.4 + React 19.1.0
- **Routing**: Expo Router 6 (file-based, tab layout)
- **Database**: SQLite via `expo-sqlite` (local only, offline-first)
- **Language**: TypeScript (strict mode)
- **Build**: Metro bundler with Babel
- **State**: React hooks (local), Zustand installed but unused

## Project Structure
```
app/                    # Screens (Expo Router)
  _layout.tsx           # Tab navigation (5 tabs)
  index.tsx             # Today/Workout screen (~950 lines)
  history.tsx           # Workout history with expandable detail
  progress.tsx          # 1RM trends per exercise
  programs.tsx          # Program builder (create/edit templates)
  settings.tsx          # Unit toggle, export/import, about
  exercises.tsx         # Exercise library with search + custom creation
  equipment.tsx         # Equipment inventory toggles
  log.tsx               # Recent sets (hidden route)
src/lib/                # Core logic
  dao.ts                # All database queries (~700 lines)
  db.ts                 # DB init + migration runner
  fitlog_schema.ts      # Base schema v1 as TypeScript string
  bootstrap.ts          # Startup: opens DB, runs migrations, init userId
  progression.ts        # Weight suggestion, Epley 1RM, warmups
  migrations/           # Incremental schema migrations (v2-v4)
```

## Key Conventions
- **Multi-user schema**: Every table has `user_id`. Always include it in queries.
- **Offline-first**: No network calls. All data in SQLite.
- **Idempotent seeds**: Exercises are seeded via `INSERT OR IGNORE` / `findByName` check.
- **Migrations**: Incremental via `app_meta.schema_version`. Add new migrations in `src/lib/migrations/`.
- **DAO pattern**: All DB access goes through `src/lib/dao.ts`. No raw SQL in screens.
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig).

## Schema (v4)
Core tables: `users`, `exercises`, `workouts`, `sets`, `workout_blocks`, `block_exercises`, `user_equipment`, `user_favorite_exercises`, `metrics`, `weekly_volume`, `programs`, `program_days`, `program_day_exercises`, `settings`, `app_meta`.

## Running
```bash
npm start              # Expo dev server
npm start -- --clear   # Clear cache
npx expo run:ios       # Build + run iOS
npx expo-doctor        # Check dependencies
```

## Working Rules
- Modify only necessary files; prefer localized changes.
- Do not add dependencies without developer approval.
- Keep business logic out of views (use dao.ts / progression.ts).
- If adding a table or column, create a migration in `src/lib/migrations/`.
- Show diffs for edited files when presenting changes.
- TypeScript with explicit types on public helpers; avoid `any` where practical.
- Keep `DEVLOG.md` and `AGENTS.md` updated after each iteration.
