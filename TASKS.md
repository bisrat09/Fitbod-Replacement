# Fitlog — Tasks

## UI Redesign — ALL 7 PHASES COMPLETE

### Redesign Phases

#### Phase 1: Theme & Foundation — DONE
- [x] Update `src/theme/colors.ts` — dark color palette (near-black, orange accent, iOS colors)
- [x] Make dark mode default in `src/theme/ThemeContext.tsx`
- [x] Update tab bar in `app/_layout.tsx` — 4 tabs (Workout, Log, Progress, Settings) with Ionicons, pink active. Programs becomes hidden route accessible from Settings
- [x] Add `src/theme/typography.ts` — font size/weight constants
- [x] 186 tests passing

#### Phase 2: Reusable Components (`src/components/`) — DONE
- [x] Card, Chip, SetRow, ExerciseCard, SupersetHeader
- [x] BottomSheet, SectionHeader, SettingsRow
- [x] ActionChip, PinkButton, RestTimer, ExerciseInitial
- [x] Barrel export `src/components/index.ts`
- [x] 186 tests still passing

#### Phase 3: Workout Screen Redesign — DONE
- [x] Split `app/index.tsx` (1158→822 lines) into 6 sub-components in `src/components/workout/`
  - WorkoutHeader (136 lines) — "Up Next" title, PR banner, elapsed, stats, program suggestion
  - BlockCard (263 lines) — exercise card, set rows, rest timer, actions menu BottomSheet
  - ExercisePickerSheet (145 lines) — unified picker for add/superset/swap (replaced 3 separate modals)
  - FinishSheet (222 lines) — workout summary, stats, body weight, template, share
  - PlateCalcSheet (117 lines) — plate calculator with per-side breakdown
  - StickyBar (44 lines) — bottom sticky Log Set button + timer
- [x] Restyle with Phase 2 components: Card, Chip, PinkButton, SetRow, RestTimer, ExerciseInitial, etc.
- [x] Unified picker state (was 3 separate modal states → 1 PickerState)
- [x] Styled: dark cards, accent CTAs, exercise initial circles, green checkmarks, rest timer overlay
- [x] 186 tests still passing

#### Phase 4: History & Workout Summary — DONE
- [x] Restyle `app/history.tsx` — dark Card components, themed calendar (pink dots, accent today), ExerciseInitial circles in detail view, green checkmarks, gold PR badges, Ionicons nav arrows, ActionChip for repeat
- [x] 186 tests still passing

#### Phase 5: Progress, Programs, Exercises — DONE
- [x] Restyle `app/progress.tsx` — Card components, ExerciseInitial, gold PR timeline, themed 1RM calculator
- [x] Restyle `app/programs.tsx` — Card/Chip/PinkButton, BottomSheet for exercise picker, ExerciseInitial, themed day cards
- [x] Restyle `app/exercises.tsx` — search bar with icon, ExerciseInitial circles, star favorites, Card components, themed archive
- [x] 186 tests still passing

#### Phase 6: Settings & Equipment — DONE
- [x] Restyle `app/settings.tsx` — grouped sections with uppercase headers, segmented lb/kg pill selector, Switch toggle for dark mode, SettingsRow navigation with hairline separators, data export/import as full-width rows with icons, proper Card padding control
- [x] Restyle `app/equipment.tsx` — common equipment as toggle rows with checkmark circles, custom equipment section, icon per equipment type, add button as compact square, empty state with icon
- [x] 186 tests still passing

#### Phase 7: Polish & Cleanup — DONE
- [x] Remove all hardcoded hex values — added `textOnAccent` and `goldText` theme tokens, replaced all `#FFFFFF`/`#000000`/`#78350F`/`#666`/`#eee` across 9 files (settings, equipment, log, history, PinkButton, RestTimer, SetRow, ExerciseInitial, WorkoutHeader, PlateCalcSheet). Only ExerciseInitial palette remains (decorative, theme-independent)
- [x] Consistent spacing across screens — new screens use `padding: 16, paddingTop: 8`, `section: marginBottom: 24`, `h1: marginBottom: 20`, uniform `sectionTitle` styling. Older screens (exercises, progress, programs) have `marginBottom: 4` on h1 intentionally (subtitle below)
- [x] Restyle `app/log.tsx` — was completely un-themed; now uses Card, ExerciseInitial, ScrollView, theme tokens, grouped sections
- [x] 186 tests still passing
- [x] Update CLAUDE.md with new component structure + all phases marked DONE

---

## Exercise Images — IN PROGRESS

### Static GIF Map — DONE
- [x] Build script `scripts/buildGifMap.mjs` — fetches all 1500 ExerciseDB exercises, fuzzy-matches to seed data
- [x] Static JSON map `src/data/exerciseGifMap.json` — 1,699 entries (92% of 1,081 seed exercises matched)
- [x] `src/lib/exerciseImages.ts` — loads static map, proxies URLs through wsrv.nl, no runtime API calls
- [x] `src/components/ExerciseImage.tsx` — shows GIF with fallback to ExerciseInitial circle
- [x] Wired into BlockCard + ExerciseCard (replaced ExerciseInitial)
- [x] `onImageFetched` callback persists URLs to SQLite `video_url` column

### TLS Fix — DONE
- [x] `static.exercisedb.dev` has broken TLS — all URLs proxied through `wsrv.nl` (free image proxy)
- [x] wsrv.nl confirmed working: HTTP 200, valid SSL (verified via curl)
- [x] Exported `proxyUrl()` from `exerciseImages.ts`
- [x] `ExerciseImage.tsx` now proxies `imageUrl` prop (from SQLite) before rendering — fixes old un-proxied `video_url` values

### Remaining
- [ ] Clear Metro cache (`npx expo start --clear`) and test on device — old cached code with runtime API calls + console.logs still running
  - [ ] Feature built
  - [ ] TASKS.md updated
  - [ ] ARCHITECTURE.md updated
  - [ ] BISRAT-CONTEXT.md updated
  - [ ] Git committed and pushed
  - [ ] Posted to #engineering
- [ ] If wsrv.nl fails on device network, try alternative proxy (`images.weserv.nl` or self-hosted)
  - [ ] Feature built
  - [ ] TASKS.md updated
  - [ ] ARCHITECTURE.md updated
  - [ ] BISRAT-CONTEXT.md updated
  - [ ] Git committed and pushed
  - [ ] Posted to #engineering
- [ ] 87 unmatched exercises (niche: balance trainer, partner, foam roll, stretches) — not in ExerciseDB
  - [ ] Feature built
  - [ ] TASKS.md updated
  - [ ] ARCHITECTURE.md updated
  - [ ] BISRAT-CONTEXT.md updated
  - [ ] Git committed and pushed
  - [ ] Posted to #engineering

---

## New Workout Flow Redesign — ALL 6 PHASES COMPLETE

Restructuring the workout screen into distinct pre-workout and active-workout views with smart exercise preview, "Up Next" screen, and recommendation-aware generation.

### Phase 1: DB Migration + Data Layer — DONE
- [x] Migration `008_exercise_recommendation.ts` — adds `recommendation` column (`normal`/`more`/`less`/`never`) to exercises table
- [x] DAO functions: `updateExerciseRecommendation()`, `getExerciseRecommendation()`, `getExerciseRecommendations()`
- [x] `workoutGenerator.ts` — new pure logic module: `suggestSplit()` (stalest split wins), `selectExercises()` (60/40 compound/isolation, respects favorites + recency + recommendations)
- [x] `DURATION_EXERCISE_COUNT`, `DURATION_OPTIONS`, `SPLIT_MUSCLES`, `formatStaleness()` exported
- [x] 239 tests passing (5 new in `workoutGenerator.test.ts`)

### Phase 2: Pre-Workout Screen — DONE
- [x] `PreWorkoutView` component — "Up Next" header, Swap button, duration/split chips, exercise list preview, Start/Quick Start buttons
- [x] `TargetMuscles` component — horizontal scroll of muscle badges with percentages
- [x] `ExerciseListItem` component — exercise image, name, subtitle, menu button
- [x] `targetMuscles.ts` utility — extracted pure `computeTargetMuscles()` for testability
- [x] `index.tsx` refactored: inline pre-workout JSX replaced with `<PreWorkoutView />`, `refreshPreview()` generates preview exercises using `selectExercises` + `progressiveOverload` without DB writes
- [x] `WorkoutHeader` now only renders during active workout (no duplication with PreWorkoutView)
- [x] Barrel exports updated in `src/components/workout/index.ts`
- [x] 249 tests passing (10 new in `preWorkoutComponents.test.ts`)

### Phase 3: Active Workout Screen — DONE
- [x] `ActiveWorkoutView` component (196 lines) — WorkoutHeader, actions row (Add Exercise + Finish), rest timer chips, global inputs (weight/reps/RIR), BlockCard list, workout notes
- [x] `index.tsx` refactored: inline active workout JSX replaced with `<ActiveWorkoutView />`, removed unused imports (`Text`, `TextInput`, `Chip`, `PinkButton`, `ActionChip`), `REST_OPTIONS` constant, and 10 dead styles. File reduced from ~943 to ~820 lines
- [x] Barrel export updated in `src/components/workout/index.ts`
- [x] 249 tests passing

### Phase 4: Exercise Detail Modal — DONE
- [x] `ExerciseDetailModal` component (195 lines) — full-screen `pageSheet` modal with hero image (120px ExerciseImage), superset badge, exercise name, progress text, action chips (rest timer, replace, warm-up), column headers, SetRow list, + Add Set, RestTimer overlay
- [x] `BlockCard` updated — split header into tap-to-detail (exercise image+name) and tap-to-collapse (progress badge); added `onExercisePress` callback + `headerTapArea` style
- [x] `ActiveWorkoutView` updated — manages `detailTarget` state (`{ blockId, exerciseId } | null`), resolves exercise data from blocks/sets/timers, renders `ExerciseDetailModal` with all callbacks wired
- [x] Barrel export updated in `src/components/workout/index.ts`
- [x] 249 tests passing

### Phase 5: Exercise Menus — DONE
- [x] `ExerciseOptionsSheet` component — BottomSheet with notes input, Add Warm-up, unit toggle (lb/kg segmented), recommendation chips (More/Less/Never with toggle behavior), Remove from Workout (danger)
- [x] `ExerciseDetailModal` — added "More" (⋯) ActionChip to open options sheet
- [x] `ActiveWorkoutView` — manages `showOptions` state, wires ExerciseOptionsSheet with exercise notes/recommendations/unit/remove callbacks
- [x] `index.tsx` — new handlers: `handleExerciseNotesChange`, `handleExerciseRecommendationChange`, `handleUnitToggle`, `handleRemoveExercise`; loads notes/recs in `fetchLastTimePreviews`
- [x] DAO: `updateExerciseNotes()`, `getExerciseNotes()` added to `dao.ts`
- [x] Barrel export updated in `src/components/workout/index.ts`
- [x] 249 tests passing

### Phase 6: Polish + Tests + Cleanup — DONE
- [x] Removed dead imports from `index.tsx`: `useMemo`, `roundToIncrement`, `swapBlockOrder`, `duplicateBlock`
- [x] Removed dead state: `activeBlockId`, `collapsedBlocks`, `autoSuggestion`
- [x] Removed dead functions: `addDropSets`, `handleDeleteBlock`, `handleDuplicateBlock`, `moveBlock`
- [x] Removed dead memo: `rirValue`
- [x] Cleaned stale `setActiveBlockId` references from `logActiveSet`, `onSetFocus`, `confirmFinishWorkout`
- [x] Removed dead re-export of `computeTargetMuscles` from `TargetMuscles.tsx`
- [x] Cleaned barrel export in `src/components/workout/index.ts`
- [x] `index.tsx` reduced from ~860 to 814 lines
- [x] Added 26 new tests in `workoutFlow.test.ts` (generator edge cases, targetMuscles edge cases, generator+targetMuscles integration, SPLIT_MUSCLES completeness)
- [x] 275 tests passing (was 249)

---

## Backlog
- [ ] On-device testing pass
  - [ ] Feature built
  - [ ] TASKS.md updated
  - [ ] ARCHITECTURE.md updated
  - [ ] BISRAT-CONTEXT.md updated
  - [ ] Git committed and pushed
  - [ ] Posted to #engineering
- [ ] Add integration tests with real SQLite
  - [ ] Feature built
  - [ ] TASKS.md updated
  - [ ] ARCHITECTURE.md updated
  - [ ] BISRAT-CONTEXT.md updated
  - [ ] Git committed and pushed
  - [ ] Posted to #engineering

---

## Ship to iPhone — IN PROGRESS (2026-10-28)

Goal: replace the paid Fitbod subscription. Bisrat has an active Apple Developer account (Team ZU5M6MDDB7, renews 2027-09-10).

### Generator fixes — DONE 2026-10-28
- [x] Split suggestion stuck: PPL users were always suggested "upper" (never-trained splits outside the rotation won). Now only families the user trains count
- [x] Never-done exercises sorted first (1000-exercise library meant unfamiliar moves every workout). Now done-before (stalest first) beats never-done
- [x] Max 2 exercises per primary muscle (relaxed when variety runs out); compounds ordered first
- [x] Started workout now uses the same recommendations as the preview (they could differ)
- [x] Preview used hardcoded 2.5 increment; now per-exercise default_increment
- [x] 281 tests passing

### Next
- [x] Fitbod CSV importer — DONE 2026-10-28. `src/lib/fitbodImport.ts` (pure) + `importFitbodPlan()` in dao.ts + Settings > Import from Fitbod. Reads newest .csv from app Documents (Files > On My iPhone > Fitlog; `UIFileSharingEnabled` in app.json, no new dependency). Deterministic ids, re-import is a no-op. Verified on Bisrat's real export against a real SQLite DB built from schema + migrations: 386 workouts, 13,012 sets, 2,467 PR metrics, 25 new custom exercises. Splits inferred from muscles (mostly `full`)
- [x] Settings backup export/import fixed for SDK 54 (`expo-file-system/legacy`)
- [ ] First-time exercise weight: solved for anything in Fitbod history; brand-new exercises still fall back to the global input
- [ ] Upgrade Expo SDK 54 to current
- [x] Native build + TestFlight — DONE 2026-10-28. EAS project @bisrat09/fitlog, bundle com.bisrat.fitlog, ASC app 6828176600 ("Fitlog (e940cd)"). Build 3 (1.0.0) submitted to TestFlight. Rebuild before 90-day TestFlight expiry (~2027-01-26): `npx eas-cli build -p ios --profile production --auto-submit`. Distribution cert expires 2027-10-28
- [x] Build 3 installed on Bisrat's iPhone 2026-10-28; Fitbod import ran on device (386 workouts, 12,288 working sets)
- [x] Device feedback fixes 2026-10-28: generator rotated into exercises last done in 2023 (now regulars = done in last 90 days first); bodyweight moves got +2.5 lb (now reps-only); leftover 185 lb fallback removed (no-history shows sets x reps only); Workout tab re-plans on focus after import; per-muscle cap scales to split (full = 1 each); "more" recommendation bypasses cap. 310 tests
- [x] Build 4 installed 2026-10-28, Workout tab matches simulation (real lifts + weights, 1 per muscle)
- [x] Gym-test feedback 2026-10-28: tap any exercise image → full-screen demo (large GIF + target muscles + steps, 216 exercises, 47/50 of Bisrat's top recent lifts; free-exercise-db public domain via `scripts/buildInstructions.mjs`, strict match + hand-checked aliases); workout pause/resume (persisted, clock shifts on resume); big 44pt H:MM:SS clock with red/grey dot; bodyweight rows no longer show "0 lb"
- [x] Demo clarity 2026-10-28: ExerciseDB GIFs are only 180px (blurry full-screen). Demo now cycles sharp 850px start/finish photos from free-exercise-db (215 exercises, via jsDelivr), "Show animation" toggle keeps the GIF, "Watch form videos" opens YouTube search. Paid ExerciseDB premium (HD video) not needed
- [x] Picture audit 2026-10-28: visual check of the GIFs for Bisrat's 61 most-used exercises found ~22 wrong (fuzzy name match: Leg Press → rear-delt machine, Back Squat → seated press, 3 shoulder presses → band press, hip thrusts → kneeling band). Thumbnails now prefer the strictly matched free-exercise-db photo (66 regulars, all visually verified); audited-wrong GIFs blocked in `exerciseImages.ts` WRONG_GIFS (also overrides URLs cached in SQLite). Hip Thrust → Barbell Hip Thrust photos (Bisrat does the machine version; closest free match)
- [x] Build 8 2026-10-28: 20 more hand-checked photo aliases (Dip, Seated Dumbbell Calf Raise, Hammerstrength Iso Row, ...), 237 exercises with photos
- [ ] Later: bundle photos/GIFs for regulars into the app (offline at the gym)
- [ ] IN PROGRESS: first real workout 2026-10-29, Bisrat reports feedback. Trial must finish before Fitbod auto-renews 2026-11-05: Bisrat cancels Fitbod before then if Fitlog holds up, imports Fitbod CSV, uses it at the gym for a week
- [ ] Muscle-recovery tracking (Fitbod-style freshness per muscle)
- [ ] Pre-existing: 26 TypeScript errors (expo-file-system documentDirectory API change, Timer types)
