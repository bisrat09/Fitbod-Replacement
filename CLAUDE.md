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
  index.tsx             # Workout screen (split into sub-components)
  history.tsx           # Workout history with expandable detail, calendar, PR badges
  progress.tsx          # 1RM trends per exercise, gold PR timeline
  programs.tsx          # Program builder (hidden route, accessible from Settings)
  settings.tsx          # Grouped sections, unit segmented control, Switch toggle, data export/import
  exercises.tsx         # Exercise library with search + custom creation (hidden route)
  equipment.tsx         # Equipment toggle rows with icons (hidden route)
  log.tsx               # Recent sets with ExerciseInitial circles (hidden route)
src/components/         # Reusable Fitbod-style components
  Card.tsx              # Dark surface card with border, optional done state
  Chip.tsx              # Filter chip pill (selected/unselected)
  PinkButton.tsx        # Pink accent CTA button
  ExerciseInitial.tsx   # Colored circle with exercise initial letter
  SectionHeader.tsx     # Section header with optional action
  ExerciseCard.tsx      # Exercise row with initial, name, set summary
  SupersetHeader.tsx    # Pink superset label
  SetRow.tsx            # Set input row with badge, reps/weight inputs
  ActionChip.tsx        # Icon + label chip for actions
  SettingsRow.tsx       # Settings row with label, value, chevron
  BottomSheet.tsx       # Modal bottom sheet with drag handle
  RestTimer.tsx         # Rest timer overlay with countdown + controls
  index.ts              # Barrel export
  workout/              # Workout screen sub-components
    WorkoutHeader.tsx   # Title, PR banner, stats, program suggestion
    BlockCard.tsx       # Exercise card with set rows, rest timer, actions
    ExercisePickerSheet.tsx  # Unified picker for add/superset/swap
    FinishSheet.tsx     # Workout summary + stats
    PlateCalcSheet.tsx  # Plate calculator
    StickyBar.tsx       # Bottom sticky Log Set button + timer
    PreWorkoutView.tsx  # Pre-workout planning: Up Next, exercises preview, target muscles
    TargetMuscles.tsx   # Horizontal scroll muscle badges with percentages
    ExerciseListItem.tsx # Exercise row: image, name, subtitle, menu
src/theme/              # Theming (Fitbod-style)
  colors.ts             # Light + dark palettes (Fitbod colors + textOnAccent, goldText)
  ThemeContext.tsx       # Theme provider + useTheme hook (dark default)
  typography.ts         # Font size + weight constants
src/lib/                # Core logic
  dao.ts                # All database queries (~1050 lines)
  db.ts                 # DB init + migration runner
  fitlog_schema.ts      # Base schema v1 as TypeScript string
  bootstrap.ts          # Startup: opens DB, runs migrations, init userId
  progression.ts        # Weight suggestion, Epley 1RM, warmups
  workoutGenerator.ts   # Smart split suggestion + exercise selection (pure logic)
  targetMuscles.ts      # Muscle group percentage computation (pure logic)
  migrations/           # Incremental schema migrations (v2-v8)
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

## Schema (v8)
Core tables: `users`, `exercises`, `workouts`, `sets`, `workout_blocks`, `block_exercises`, `user_equipment`, `user_favorite_exercises`, `metrics`, `weekly_volume`, `programs`, `program_days`, `program_day_exercises`, `settings`, `app_meta`, `body_weight`.

### v8 Addition
- `exercises.recommendation` column — `TEXT NOT NULL DEFAULT 'normal'`, values: `normal`/`more`/`less`/`never`

## Color Palette (Fitbod-style)
```
Dark theme (default):
  bg: #1C1C1E          card: #2C2C2E        cardBorder: #3A3A3C
  text: #FFFFFF        textSecondary: #8E8E93  textMuted: #636366
  accent: #FF3B5C      green: #34C759       gold: #FFD700
  textOnAccent: #FFFFFF (white text on colored backgrounds)
  goldText: #78350F    (dark brown text on gold badges)
```

**Rule:** Never hardcode hex values in screens/components. Use `c.*` theme tokens from `useTheme()`. The only exception is the ExerciseInitial palette (decorative, theme-independent).

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
npm test               # 249 tests
npm run build:gifmap   # Regenerate exercise GIF map from ExerciseDB API
npx expo run:ios       # Build + run iOS
npx expo-doctor        # Check dependencies
```

## Working Rules
- Modify only necessary files; prefer localized changes.
- Do not add dependencies without developer approval.
- Keep business logic out of views (use dao.ts / progression.ts).
- If adding a table or column, create a migration in `src/lib/migrations/`.
- TypeScript with explicit types on public helpers; avoid `any` where practical.

## Exercise Images
- **Static GIF map:** `src/data/exerciseGifMap.json` — 1,699 entries (92% coverage)
- **Build script:** `scripts/buildGifMap.mjs` — fetches ExerciseDB, fuzzy-matches to seed exercises
- **Runtime:** `src/lib/exerciseImages.ts` — static map lookup, `proxyUrl()` wraps all `static.exercisedb.dev` URLs through `wsrv.nl`
- **Component:** `src/components/ExerciseImage.tsx` — Image with wsrv.nl proxy + ExerciseInitial fallback
- **TLS issue:** `static.exercisedb.dev` cert is broken; all URLs proxied through `wsrv.nl` (free image proxy)
- **SQLite persistence:** `video_url` column in exercises table, `updateExerciseImageUrl()` in dao.ts

## UI Redesign Status — ALL PHASES COMPLETE
See TASKS.md for the full Fitbod design spec and phase checklist.
- **Phase 1: Theme & Foundation** — DONE (colors, dark default, 4-tab Ionicons, typography)
- **Phase 2: Reusable Components** — DONE (Card, Chip, SetRow, ExerciseCard, BottomSheet, etc.)
- **Phase 3: Workout Screen Redesign** — DONE (split into 6 sub-components)
- **Phase 4: History & Workout Summary** — DONE (dark cards, themed calendar, PR badges)
- **Phase 5: Progress, Programs, Exercises** — DONE (Card components, ExerciseInitial, gold PRs)
- **Phase 6: Settings & Equipment** — DONE (grouped sections, segmented controls, Switch, toggle rows)
- **Phase 7: Polish & Cleanup** — DONE (all hardcoded hex removed, consistent spacing)

## New Workout Flow Redesign — IN PROGRESS
See TASKS.md for full phase breakdown.
- **Phase 1: DB Migration + Data Layer** — DONE (recommendation column, workoutGenerator.ts, DAO functions)
- **Phase 2: Pre-Workout Screen** — DONE (PreWorkoutView, TargetMuscles, ExerciseListItem, preview generation)
- **Phase 3-6** — PENDING (ActiveWorkoutView, Exercise Detail Modal, Exercise Menus, Polish)

### Smart Workout Generator (`src/lib/workoutGenerator.ts`)
- `suggestSplit()` — picks stalest split from workout history
- `selectExercises()` — 60% compound / 40% isolation, respects favorites, recency, recommendations
- `SPLIT_MUSCLES` — maps each split to target muscle groups
- `DURATION_EXERCISE_COUNT` — 30m=5, 45m=8, 60m=10, 90m=14 exercises

### Exercise Recommendations (`exercises.recommendation` column)
- `normal` (default) — no special treatment
- `more` — prioritized in workout generation
- `less` — deprioritized
- `never` — excluded entirely
- DAO: `updateExerciseRecommendation()`, `getExerciseRecommendation()`, `getExerciseRecommendations()`
