# Fitlog Dev Log — 2025-09-18

This log captures today’s changes so we can pick up smoothly tomorrow.

**Summary**
- Added a rest timer and RIR quick-select chips on the Today screen.
- Upgraded the project to Expo SDK 54 so it works with Expo Go 54.
- Resolved bundler/build issues (Babel plugin updates, module installs, import fixes).

**Today Screen Enhancements**
- Rest timer: auto-starts after "+ Set" (default 120s), shows `mm:ss`, Pause/Resume and Reset, vibrates at 0.
- RIR chips: 3/2/1 chips to set RIR quickly with visual highlight.
- Next-set weight: auto-prefills using `suggestNextWeight(prevWeight, prevRir, 2, 2.5)`.
- All changes localized to `app/index.tsx`.

Files
- `app/index.tsx`: Added RIR chips, timer state/logic, next-weight prefill, vibration.

**SDK Upgrade (51 → 54)**
- Bumped Expo and aligned RN ecosystem to SDK 54.
- Installed/updated dependencies to satisfy peer requirements.
- Verified with `npx expo-doctor` and addressed actionable items.

Version Highlights (package.json)
- `expo`: `~54.0.0`
- `react-native`: `0.81.4`
- `react`: `19.1.0` (aligned to RN renderer 19.1.0)
- `expo-router`: `~6.0.6`
- `expo-sqlite`: `~16.0.8`
- `expo-file-system`: `~19.0.14`
- `@expo/metro-runtime`, `expo-constants`, `expo-linking`, `expo-status-bar`, `react-native-screens`, `react-native-worklets`: installed
- Dev: `typescript@~5.9.2`, `babel-preset-expo` added

**Babel/Metro Updates**
- Switched Reanimated plugin path to `react-native-worklets/plugin`.
- Removed deprecated `expo-router/babel` plugin in favor of `babel-preset-expo` preset.

Files
- `babel.config.js`: Updated plugin list.

**SQLite Schema Import Fix**
- Metro in SDK 54 doesn’t support `?raw` imports for `.sql` by default.
- Added a small wrapper exporting the SQL as a string and updated the import.

Files
- `src/lib/fitlog_schema.ts`: New string export of the schema.
- `src/lib/bootstrap.ts`: Import changed from `fitlog_schema.sql?raw` to `fitlog_schema`.

**Other Fixes**
- Missing modules installed:
  - `expo-crypto` (for UUIDs)
  - `expo-secure-store` (persistent `user_id`)
- SQLite import adjusted to stable entry:
  - `src/lib/db.ts`: `import * as SQLite from 'expo-sqlite'` (removed `/next`).
- App config asset paths normalized; `.expo/` added to `.gitignore`.

**How to Run**
- Start (clear cache): `npm start -- --clear`
- Open in Expo Go (SDK 54) via QR.

**Known/Notes**
- Keep React and RN renderer versions exactly aligned (19.1.0 today).
- If Metro complains about missing peer deps, run `npx expo-doctor` and install suggested packages via `npx expo install ...`.

**Next Up (nice-to-haves)**
- Refine timer UX (custom durations, quick-add +30s).
- Haptics polish (pattern on final 3 seconds if we add `expo-haptics`).
- PR banner (Epley 1RM detection) and weekly volume view.
- Export/backup JSON via `expo-file-system`.
- UI polish: RIR chips styling, nicer forms, charts (react-native-svg).

---

# Fitlog Dev Log — 2025-09-19

Summary
- Iteration 1 complete (blocks + timers + attached sets).
- Iteration 2 progress: Equipment filtering, Favorites library, Supersets, sticky action bar, Tabs, Log view.

Highlights
- Supersets: “Make Superset” adds a second exercise to a block; unified block rest; auto-advance across exercises.
- Inline set editing and completion: per-row Reps/Weight inputs; “Log Set” marks only that row; persists with `sets.is_completed`.
- Sticky bottom bar: centered red “Log Set” button; always visible; hides the old summary list to prevent overlap.
- Favorites library: toggle common exercises; Add Exercise modal prioritizes favorites, then other equipment-available exercises.
- Tabs: Workout and Log (grouped by workout date: Today/Yesterday/date).
- Migrations: v3 (`sets.is_completed`) and v4 (`user_favorite_exercises`).

Key files
- `app/index.tsx`, `app/_layout.tsx`, `app/log.tsx`, `app/exercises.tsx`
- `src/lib/dao.ts`, `src/lib/migrations/{003,004}_*.{sql,ts}`

Next Steps (tomorrow)
- Variant rotation: bias by recency + simple per‑muscle fatigue.
- Persist active row across reloads.
- Export/backup JSON via `expo-file-system`.
- UI polish: nicer tab icons, charts (`react-native-svg`).

---

# Fitlog Dev Log — 2026-03-14

Summary
- Iteration 3: Last-time preview, PR detection banner, History screen, exercise swap, tab layout update.

Highlights
- **Last-time preview**: When a block is displayed, shows the most recent completed working sets for that exercise from a prior workout (e.g. "Last: 185lb×5 @2, 190lb×4 @1"). Fetched via `lastWorkingSetsForExercise()` DAO query that finds the most recent workout with completed sets for the exercise, excluding the current workout.
- **PR detection banner**: After completing a set, computes Epley est. 1RM and compares against the `metrics` table. If it's a new record, shows a gold "NEW PR!" banner for 4 seconds. Always upserts the metric regardless of PR. Uses existing `metrics` table from schema v1.
- **History screen**: Replaced the stub with a full workout history view. Shows past workouts as expandable cards with date, exercise names, set/exercise counts. Tap to expand and see all sets grouped by exercise with weight, reps, RIR, and completion status. Added `listWorkoutSummaries()` and `listWorkoutDetail()` DAO queries.
- **Exercise swap**: Added "Swap" button per exercise in a block. Opens a modal to pick a replacement exercise. Replaces the exercise in `block_exercises`, deletes old sets, and creates new default working sets. Uses `replaceBlockExercise()` DAO function.
- **Tab layout**: Promoted History to a visible tab (Workout / Log / History). Equipment remains a hidden push route.

Key files
- `app/index.tsx`: Last-time preview, PR banner, swap modal, new state/logic
- `app/history.tsx`: Full history screen with expandable workout cards
- `app/_layout.tsx`: History promoted to visible tab
- `src/lib/dao.ts`: 6 new DAO functions (lastWorkingSetsForExercise, upsertMetric, getBestMetric, listWorkoutSummaries, listWorkoutDetail, replaceBlockExercise)

New DAO functions
- `lastWorkingSetsForExercise(ctx, exerciseId, excludeWorkoutId?)` — prior workout's working sets
- `upsertMetric(ctx, metric)` — insert/update metrics row
- `getBestMetric(ctx, exerciseId)` — highest est_1rm for an exercise
- `listWorkoutSummaries(ctx, limit)` — aggregated workout list for history
- `listWorkoutDetail(ctx, workoutId)` — all sets for a workout with exercise names
- `replaceBlockExercise(ctx, blockId, oldExId, newExId)` — swap exercise in block + delete old sets

---

# Fitlog Dev Log — 2026-03-14 (Iteration 4)

Summary
- Iteration 4: Unit preferences (lb/kg), weekly volume tracking, rest timer polish, finish workout flow.

Highlights
- **Unit preferences (lb/kg)**: Added `getUserUnit()` and `updateUserUnit()` DAO functions. All screens (Today, Log, History) now read and display the user's preferred unit. Toggle button in the Today screen header switches between lb/kg and persists to the `users` table.
- **Weekly volume tracking**: After finishing a workout, computes hard sets per muscle group for the current week. Uses `computeWeeklyVolume()` to expand comma-separated `muscle_groups` into individual counts, then `upsertWeeklyVolume()` to persist. Displayed as horizontal bar chart in the Finish Workout modal.
- **Rest timer polish**: Replaced hardcoded 120s with selectable rest duration chips (60/90/120/180s). Added "+30s" quick-add button per block timer. Active timer now shown in the sticky action bar. Running timers highlighted in red.
- **Finish Workout flow**: "Finish Workout" button triggers weekly volume computation, shows a summary modal (exercises count, sets completed, weekly volume bar chart), then resets the Today screen for the next workout. Stops all running timers.
- **Cleanup**: Removed unused `DEFAULT_REST` constant; all rest references use `restDuration` state.

Key files
- `app/index.tsx`: Unit toggle, rest chips, +30s, sticky timer, finish workout modal, weekly volume bars
- `app/log.tsx`: Dynamic unit display
- `app/history.tsx`: Dynamic unit display
- `src/lib/dao.ts`: 5 new DAO functions (getUserUnit, updateUserUnit, upsertWeeklyVolume, getWeeklyVolume, computeWeeklyVolume)

Next Steps
- Persist active row across reloads.
- UI polish: nicer tab icons, charts (`react-native-svg`).
- JSON import (restore from backup).
- Program builder (multi-day templates).

---

# Fitlog Dev Log — 2026-03-14 (Iteration 5)

Summary
- Iteration 5: JSON export, smart exercise suggestions, delete set/block, workout duration tracking.

Highlights
- **JSON export**: "Export" button in Today header writes all user data (exercises, workouts, sets, equipment, favorites, metrics, weekly volume) to a JSON file in the app's document directory via `expo-file-system`. Shows status feedback for 4 seconds.
- **Smart exercise suggestions (recency bias)**: When adding an exercise, the picker now sorts: favorites first, then least-recently-used exercises (never-used come first, then oldest). Uses `exerciseRecency()` DAO query to get last workout date per exercise.
- **Delete set**: Each incomplete set row now has a "×" button to remove it. Completed sets cannot be deleted (safety guard).
- **Remove block**: Each block header has a "Remove" button that deletes the block and all its sets and block_exercises.
- **Workout duration**: Elapsed time counter starts when workout begins, shown in the header. Duration included in the Finish Workout summary modal.

Key files
- `app/index.tsx`: Export button, recency-sorted picker, delete set/block buttons, elapsed timer, new styles
- `src/lib/dao.ts`: 4 new DAO functions (exportAllData, exerciseRecency, deleteSet, deleteBlock)

New DAO functions
- `exportAllData(ctx)` — gathers all tables into a JSON-serializable object
- `exerciseRecency(ctx)` — last workout date per exercise for sorting
- `deleteSet(ctx, setId)` — remove a single set
- `deleteBlock(ctx, blockId)` — remove block + its sets + block_exercises

Next Steps
- JSON import (restore from backup).
- Persist active row across reloads.
- UI polish: nicer tab icons, charts.
- Program builder (multi-day templates).

---

# Fitlog Dev Log — 2026-03-14 (Iteration 6)

Summary
- Iteration 6: Expanded exercise library, auto-prefill from history, exercise search & muscle tags, block reorder, UX improvements.

Highlights
- **Expanded seed exercises**: Library grew from 6 to 20 exercises covering all major muscle groups: Deadlift, Romanian Deadlift, Lat Pulldown, Lateral Raise, Barbell Curl, Tricep Pushdown, Leg Press, Leg Curl, Face Pull, Dips, Incline DB Press, Barbell Row, Front Squat, Hip Thrust. All seeded idempotently.
- **Auto-prefill from last workout**: When adding a block, default working sets now use the exercise's last completed top set (weight, reps, RIR) instead of global inputs. Falls back to global values if no history exists. Uses existing `latestExerciseTopSet()` DAO.
- **Search in exercise pickers**: All three picker modals (Add Exercise, Make Superset, Swap) now have a search TextInput to filter exercises by name. Essential with 20+ exercises.
- **Muscle group tags**: Exercise pickers now show muscle groups as grey tags below each exercise name (e.g. "chest · triceps · front_delts"). Selected rows show tags in green.
- **Block reorder**: Up/down arrow buttons (▲▼) in each block header swap order with adjacent blocks. Uses `swapBlockOrder()` DAO that swaps `order_index` values.

Key files
- `app/index.tsx`: 14 new seed exercises, search input, muscle tags, move buttons, auto-prefill logic
- `src/lib/dao.ts`: 1 new DAO function (swapBlockOrder)

New DAO functions
- `swapBlockOrder(ctx, blockIdA, blockIdB)` — swap order_index between two blocks

Next Steps
- Persist active row across reloads.
- UI polish: charts, animations.
- Program builder (multi-day templates).

---

# Fitlog Dev Log — 2026-03-14 (Iteration 7)

Summary
- Iteration 7: Settings screen, JSON import, delete workout, exercises upgrade, header cleanup.

Highlights
- **Settings screen**: New tab with unit toggle (LB/KG buttons), JSON export, JSON import (restore from latest backup), backup file listing, and about section. Consolidates settings that were previously scattered in the Today screen header.
- **JSON import**: `importData()` DAO function merges backup data into the DB using `INSERT OR IGNORE`. Settings screen imports the most recent `fitlog_backup_*.json` file from the app's document directory.
- **Delete workout**: History screen now shows a "Delete Workout" button when a card is expanded. Removes the workout and all associated sets, blocks, and block_exercises via `deleteWorkout()` DAO.
- **Exercises screen upgrade**: Full rewrite. Now shows all exercises from DB (not just a hardcoded catalog), with muscle group tags and equipment info. Search/filter by name. Favorite toggle with star indicator. "Create Custom Exercise" form with name, muscle groups, and equipment inputs.
- **Today screen cleanup**: Removed Export button and unit toggle from header (moved to Settings). Removed unused imports (`FileSystem`, `updateUserUnit`, `exportAllData`). Header is now focused: Start Workout, Equipment, Exercises.
- **Tab layout**: Added Settings as 4th tab (Workout / Log / History / Settings). Exercises remains a hidden push route. Tab label font reduced to 14 for 4-tab fit.

Key files
- `app/settings.tsx`: New settings screen (120 lines)
- `app/exercises.tsx`: Full rewrite with search, muscle tags, custom creation (110 lines)
- `app/history.tsx`: Delete workout button
- `app/index.tsx`: Header cleanup, removed export/unit toggle
- `app/_layout.tsx`: Settings tab added, exercises hidden
- `src/lib/dao.ts`: 3 new DAO functions (deleteWorkout, importData, already had swapBlockOrder)

New DAO functions
- `deleteWorkout(ctx, workoutId)` — delete workout + all sets/blocks/block_exercises
- `importData(ctx, data)` — merge JSON backup into DB (exercises, workouts, sets, equipment, favorites)

---

# Fitlog Dev Log — 2026-03-14 (Iteration 8)

Summary
- Iteration 8: Workout resume on reload, split selector, total volume, auto-advance, block progress.

Highlights
- **Resume workout on reload**: Active workout ID and start time persisted to `settings` table. On launch, if an active workout exists, it auto-restores with blocks, sets, and elapsed timer. Cleared on "Finish Workout".
- **Split selector**: Choose push/pull/legs/upper/lower/full via chips before starting. Replaces hardcoded 'push'.
- **Total volume in finish summary**: Shows sum of weight × reps for completed working sets.
- **Smart auto-advance**: After logging a set, active row advances to next incomplete set — same exercise, then next exercise, then next block.
- **Block completion progress**: "2/3" badge per block. Completed blocks get green border/background.

Key files
- `app/index.tsx`: Resume logic, split selector, auto-advance, volume, progress badge
- `src/lib/dao.ts`: 4 new DAO functions (getSetting, setSetting, deleteSetting, getTodayWorkout)

---

# Fitlog Dev Log — 2026-03-14 (Iteration 9)

Summary
- Iteration 9: Program builder, Progress screen (1RM trends), program-to-workout integration.

Highlights
- **Program builder**: Full CRUD for workout programs. Create programs with named days (push/pull/legs/upper/lower/full). Add exercises to each day with target sets, reps, and RIR. Set one program as active. Delete programs/days/exercises. New `programs.tsx` screen (283 lines).
- **Progress screen**: Shows all exercises with recorded metrics. Per-exercise expandable timeline showing est. 1RM trend over time with date, weight×reps, and delta from previous entry. PR entries highlighted in gold. New `progress.tsx` screen (137 lines).
- **Program-to-workout integration**: When starting a workout, if an active program exists, the next program day is suggested (based on the last workout's split, cycling through days). The split selector auto-sets to the suggested day's split. On start, blocks are auto-populated from the program day's exercises with target sets and auto-prefilled weights from history.
- **Tab layout**: 5 visible tabs (Workout / History / Progress / Programs / Settings). Log moved to hidden push route. Font size reduced for 5-tab fit.

Key files
- `app/programs.tsx`: New program builder screen (283 lines)
- `app/progress.tsx`: New progress/1RM trends screen (137 lines)
- `app/index.tsx`: Program suggestion, auto-populate from program day
- `app/_layout.tsx`: 5-tab layout
- `src/lib/dao.ts`: 15 new DAO functions for programs + progress

New DAO functions
- Programs: `createProgram`, `listPrograms`, `getActiveProgram`, `setActiveProgram`, `deleteProgram`, `addProgramDay`, `listProgramDays`, `deleteProgramDay`, `addProgramDayExercise`, `listProgramDayExercises`, `removeProgramDayExercise`, `getNextProgramDay`
- Progress: `getMetricHistory`, `listExercisesWithMetrics`

---

# Fitlog Dev Log — 2026-03-14 (Iteration 10)

Summary
- Iteration 10: Workout notes, streak tracking, weekly stats, history polish.

Highlights
- **Workout notes**: Multiline text input during workout ("How did this workout feel?"). Saved to `workouts.notes` on finish. Displayed in finish modal and in history cards.
- **Streak tracking**: Shows consecutive-day workout streak on Today screen when no workout is active (e.g. "3 day streak"). Computed by checking distinct workout dates backwards from today.
- **Weekly stats**: Shows workouts count this week on Today screen (e.g. "4 workouts this week"). Refreshes after finishing a workout.
- **History polish**: Workout cards now show split badge (purple PUSH/PULL/LEGS), total volume badge (grey, formatted weight), muscle groups worked (unique list from exercises), and workout notes. Uses `listWorkoutSummariesEnhanced()` which computes volume and collects muscle groups in SQL.

Key files
- `app/index.tsx`: Notes input, stats display, streak/week state (+46 lines, now 946 total)
- `app/history.tsx`: Split badge, volume badge, muscles, notes (+28 lines, now 167 total)
- `src/lib/dao.ts`: 5 new DAO functions (+70 lines, now 705 total)

New DAO functions
- `updateWorkoutNotes(ctx, workoutId, notes)` — save notes to workout
- `getWorkoutNotes(ctx, workoutId)` — read workout notes
- `getWorkoutStreak(ctx)` — consecutive days with workouts
- `getWorkoutsThisWeek(ctx)` — count of workouts since Monday
- `listWorkoutSummariesEnhanced(ctx, limit)` — summaries with volume + muscle groups

---

# Fitlog Dev Log — 2026-03-14 (Iteration 11)

Summary
- Iteration 11: Per-set notes (schema v5), repeat past workout, duplicate block, PR badges in history.

Highlights
- **Per-set notes**: Schema migration v5 adds `notes TEXT` column to `sets`. Each set row has an inline note input ("note...") saved on blur. Notes shown in history detail after the set info.
- **Repeat past workout**: "Repeat Workout" button on expanded history cards. Creates a new workout with same split, blocks, exercises, and sets pre-filled with latest weights from history. Sets the new workout as active so it appears on the Workout tab.
- **Duplicate block**: "Dup" button on each block header copies the block with all exercises and sets (uncompleted) to the end of the workout.
- **PR badges in history**: When expanding a workout in history, sets that matched the best-ever est. 1RM for their exercise get a gold "PR" badge. Computed via `getSetPRStatus()` which compares each set's Epley 1RM against the metrics table.
- **Tests**: 8 new tests (117 total) covering repeatWorkout, duplicateBlock, getSetPRStatus, and updateSet with notes.

Key files
- `src/lib/migrations/005_set_notes.ts`: New migration adding notes column
- `src/lib/migrations/index.ts`: Added v5 migration
- `src/lib/dao.ts`: 3 new functions, updateSet updated (+133 lines, now 838)
- `app/index.tsx`: Duplicate block, per-set notes input (+23 lines, now 969)
- `app/history.tsx`: Repeat workout, PR badges, notes display (+44 lines, now 211)
- `src/__tests__/dao.test.ts`: 8 new tests (117 total)

New DAO functions
- `repeatWorkout(ctx, sourceId, newId, date)` — copy workout structure with fresh sets
- `duplicateBlock(ctx, blockId, workoutId)` — clone a block within a workout
- `getSetPRStatus(ctx, workoutId)` — returns Set of set IDs that were PRs

---

# Fitlog Dev Log — 2026-03-14 (Iteration 12)

Summary
- Iteration 12: Body weight tracking (schema v6), workout calendar, lifetime stats.

Highlights
- **Body weight tracking**: New `body_weight` table via migration v6. Settings screen has a weight input with log button and recent history (last 10 entries). Each entry shows date and weight with delete option.
- **Workout calendar**: Monthly grid on History screen showing dots on workout days. Navigate months with left/right arrows. Today highlighted in blue. No external calendar library — pure View/Text grid.
- **Lifetime stats**: Settings screen shows 4 stat cards (total workouts, total sets, total volume, current streak) plus the most-trained exercise. Uses `getLifetimeStats()` which aggregates across all tables.
- **Settings upgrade**: Reorganized with stats at top, body weight section, then unit/data/about. Now 226 lines.
- **Tests**: 9 new tests (126 total) covering body weight CRUD, calendar dates, and lifetime stats.

Key files
- `src/lib/migrations/006_body_weight.ts`: New table
- `src/lib/migrations/index.ts`: v6 migration
- `src/lib/dao.ts`: 6 new functions (+64 lines, now 902)
- `app/settings.tsx`: Body weight input/history + lifetime stats cards (full rewrite, 226 lines)
- `app/history.tsx`: Monthly calendar grid with dots (+72 lines, now 283)
- `src/__tests__/dao.test.ts`: 9 new tests (126 total)

New DAO functions
- `logBodyWeight(ctx, entry)` — insert body weight record
- `getBodyWeightHistory(ctx, limit)` — recent body weight entries
- `getLatestBodyWeight(ctx)` — most recent entry
- `deleteBodyWeight(ctx, id)` — remove entry
- `getWorkoutDatesForMonth(ctx, yearMonth)` — distinct workout dates in a month
- `getLifetimeStats(ctx)` — aggregated lifetime statistics

---

# Fitlog Dev Log — 2026-03-14 (Iteration 13)

Summary
- Iteration 13: Haptic countdown, save-as-template, exercise archive, body weight prompt, best set highlights.

Highlights
- **Haptic countdown**: Rest timer vibrates at 3, 2, 1 seconds (short 100ms buzz) and double-buzz at 0. Timer text pulses larger/bolder red in final 3 seconds.
- **Save workout as template**: In the finish modal, enter a name and tap "Save Template" to create a program from the current workout's structure. Copies all exercises with average reps/sets/RIR. Appears in Programs tab.
- **Exercise archive**: Each exercise in the library has an "Archive" button. Archived exercises are hidden from pickers. Collapsible "Archived" section at the bottom with "Restore" to unarchive.
- **Body weight prompt**: Finish modal includes an optional body weight input. If filled, logs the weight to body_weight table automatically.
- **Best set highlight**: After finishing, sets with the highest est. 1RM per exercise get a gold badge ring. Computed via `getBestSetsInWorkout()`.
- **Tests**: 7 new tests (133 total).

Key files
- `app/index.tsx`: Haptic countdown, best set badges, BW prompt, save template (+49 lines, 1018)
- `app/exercises.tsx`: Archive/restore toggle + archived section (+79 lines, 189)
- `src/lib/dao.ts`: 5 new functions (+78 lines, 980)
- `src/__tests__/dao.test.ts`: 7 new tests (133 total)

New DAO functions
- `saveWorkoutAsTemplate(ctx, workoutId, name, programId)` — create program from workout
- `archiveExercise(ctx, exerciseId)` — set is_archived=1
- `unarchiveExercise(ctx, exerciseId)` — set is_archived=0
- `listArchivedExercises(ctx)` — list archived exercises
- `getBestSetsInWorkout(ctx, workoutId)` — set IDs with highest est 1RM per exercise

---

# Fitlog Dev Log — 2026-03-14 (Iteration 14)

Summary
- Iteration 14: Plate calculator, workout sharing, exercise personal bests, collapsible blocks, quick-start.

Highlights
- **Plate calculator**: Modal showing plates per side for any target weight. Supports lb (45/25/10/5/2.5) and kg (20/10/5/2.5/1.25). Visual plate bars with counts and total verification.
- **Share workout**: "Share" button in finish modal uses React Native Share API to send a formatted text summary of the workout (split, duration, exercises, sets with weight/reps/RIR).
- **Exercise personal bests**: Exercises screen shows per-exercise stats: total completed sets, best est. 1RM, max weight. Uses `getAllExerciseStats()` single-query approach.
- **Collapsible blocks**: Tap block title to collapse/expand. Collapsed blocks show only the header with progress badge. Timer stays visible. Reduces scroll noise during long workouts.
- **Quick-start**: "Quick Start" button on Today screen (when no workout active) repeats the most recent workout. One tap to start training.
- **formatWorkoutSummary**: Pure function in progression.ts that formats workout data into shareable text.
- **Tests**: 17 new tests (150 total) — plate calculator (10), formatWorkoutSummary (2), exercise stats (3), getMostRecentWorkoutId (2).

Key files
- `src/lib/progression.ts`: calculatePlates, formatWorkoutSummary (+38 lines, now 40)
- `src/lib/dao.ts`: getExerciseStats, getAllExerciseStats, getMostRecentWorkoutId (+40 lines, now 1020)
- `app/index.tsx`: Plate calc modal, collapsible blocks, quick-start, share (+88 lines, now 1106)
- `app/exercises.tsx`: Personal bests display (+14 lines, now 203)

---

# Fitlog Dev Log — 2026-03-14 (Iteration 15)

Summary
- Iteration 15: Dark mode, drop sets, muscle group filter chips.

Highlights
- **Dark mode**: Full theme system with React Context (`ThemeProvider`). Light/dark color palettes for all UI elements. Persisted to settings table. Toggle in Settings screen. Applied to tab bar, headers, Today screen container/blocks/sticky bar. New `src/theme/` with `colors.ts` (73 lines) and `ThemeContext.tsx` (51 lines).
- **Drop sets**: "Drop" button per exercise adds 3 descending-weight sets (80%/60%/40% of current weight, rounded to increment). RIR set to 0 for drop sets.
- **Muscle group filter chips**: Exercise picker modals (Add/Superset/Swap) now have filter chips for chest/back/legs/shoulders/arms/core. Filters stack with text search. Muscle mapping handles compound groups (e.g. "back" matches lats, upper_back, lower_back, rear_delts).
- **Theme-aware layout**: `_layout.tsx` reads theme colors for tab bar, header, and borders. Blocks, sticky bar, and container all respond to dark mode.

Key files
- `src/theme/colors.ts`: Light/dark color palettes (73 lines)
- `src/theme/ThemeContext.tsx`: Theme provider + useTheme hook (51 lines)
- `app/_layout.tsx`: ThemeProvider wrapper, theme-aware tab bar (39 lines)
- `app/index.tsx`: Drop sets, muscle filters, theme-aware container/blocks/sticky (+51 lines, 1157)
- `app/settings.tsx`: Theme toggle UI (+15 lines, 241)

---

# Fitlog Dev Log — 2026-03-14 (Iteration 16)

Summary
- Iteration 16: Dark mode on all screens, 1RM calculator, workout duration storage.

Highlights
- **Dark mode on all screens**: Applied `useTheme()` + `c.bg`/`c.text` to History, Progress, Programs, Exercises, Equipment, and Log screens. Every screen now responds to the dark mode toggle. Tab bar, headers, and all containers are theme-aware.
- **1RM calculator**: Top of Progress screen has a weight×reps calculator showing estimated 1RM and a rep max table (1-15 rep equivalents). Uses Epley formula. Styled with theme colors.
- **Workout duration storage**: Schema v7 adds `duration_seconds` to workouts table. Duration is saved when finishing a workout. Shown in history cards as "X min". Included in enhanced history query.
- **Tests**: 2 new tests (152 total).

Key files
- `src/lib/migrations/007_workout_duration.ts`: New column
- `src/lib/migrations/index.ts`: v7 migration
- `src/lib/dao.ts`: updateWorkoutDuration, enhanced query (+7 lines, 1027)
- `app/progress.tsx`: 1RM calculator with rep table (+40 lines, 183)
- `app/history.tsx`, `app/programs.tsx`, `app/exercises.tsx`, `app/equipment.tsx`, `app/log.tsx`: Dark mode applied
- `app/index.tsx`: Save duration on finish (+3 lines, 1162)

---

# Fitlog Dev Log — 2026-03-14 (Bug Fix Pass)

Summary
- Systematic audit and bug fix pass across all 16 iterations. 34 new edge-case tests.

Bugs Fixed
1. **Date mutation in getWeekStart** (CRITICAL): `new Date(d.setDate(diff))` mutated `d`. Fixed to `const mon = new Date(d); mon.setDate(diff);`
2. **NaN rir in logSetForBlock** (HIGH): `parseInt(rir)` could be NaN and was passed directly to addSet. Fixed with `isNaN(parsedRir) ? null : parsedRir`.
3. **Loose equality in PR check** (HIGH): `s.weight && s.reps` would skip weight=0. Fixed to `s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0`.
4. **Missing null guards** (MEDIUM): Set edit handlers (`onEndEditing`) called `updateSet(dbCtx, ...)` without null check. Added `if(!dbCtx||!workoutId) return;` guards.
5. **Dead code removed** (MEDIUM): Unused `exerciseId`/`setExerciseId` state and `defaultExId` tracking removed. Simplified seed loop.
6. **Missing interval cleanup** (MEDIUM): Added `useEffect` cleanup to clear all rest timer intervals on component unmount.

Tests Added
- `edge-cases.test.ts` (34 tests): epley1RM extremes, roundToIncrement boundaries, suggestNextWeight undefined/zero/clamping, calculatePlates (bar-only, below-bar, heavy, mixed kg), formatWorkoutSummary (empty/no-split/no-elapsed/null-rir), streak edge cases, weekly volume (spaces, empty), equipment filtering (whitespace), program day cycling (missing split).

Test count: 152 → 186 (34 new edge-case tests)

Next Steps
- Run on device to catch runtime issues.
- Refactor index.tsx into smaller components.
- Add integration tests with real SQLite.

---

# Fitlog Dev Log — 2026-03-15 (UI Redesign Phase 1)

Summary
- Starting Fitbod-style UI redesign. Phase 1 (Theme & Foundation) complete.
- Analyzed 12 Fitbod screenshots and documented full design spec in TASKS.md.
- Created TASKS.md for cross-session continuity (design spec + phase checklist).

Phase 1: Theme & Foundation

- **Color palette updated** (`src/theme/colors.ts`): Swapped navy-based dark theme for Fitbod's iOS-style near-black. Key changes: bg `#0f172a` → `#1C1C1E`, card `#1e293b` → `#2C2C2E`, accent `#ef4444` → `#FF3B5C` (pink), green → `#34C759`, gold → `#FFD700`. Light theme also updated to match iOS system colors.
- **Dark mode default** (`src/theme/ThemeContext.tsx`): Default theme changed from `'light'` to `'dark'`. Loads saved preference on startup — only switches to light if explicitly saved as `'light'`.
- **4-tab layout** (`app/_layout.tsx`): Reduced from 5 tabs to 4: Workout (barbell), Log (calendar), Progress (trending-up), Settings (cog). Programs moved to hidden route (accessible from Settings). Emoji icons replaced with Ionicons via `@expo/vector-icons`.
- **Typography constants** (`src/theme/typography.ts`): New file with font size scale (h1=28 through tiny=11) and weight constants (bold/semibold/medium/regular).

Key files
- `src/theme/colors.ts`: Full palette rewrite (72 lines)
- `src/theme/ThemeContext.tsx`: Default dark + load logic inverted (51 lines)
- `app/_layout.tsx`: 4 tabs with Ionicons (67 lines)
- `src/theme/typography.ts`: New file (16 lines)
- `TASKS.md`: New file — full Fitbod design spec from screenshots + 7-phase checklist
- `CLAUDE.md`: Updated with current structure, redesign status, color palette docs

Tests: 186 passing (unchanged — tests are logic-only, not UI)

Next Steps
- Phase 2: Create 12 reusable components in `src/components/`
- Phase 3: Split + restyle Workout screen (index.tsx)
- See TASKS.md for full phase breakdown
