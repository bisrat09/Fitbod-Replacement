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
- [x] Friends sharing 2026-10-28: TestFlight external group "Friends" + public link https://testflight.apple.com/join/xUeE6QZW (limit 10 testers). Build 8 submitted to Beta App Review (Waiting for Review); link works once approved. Test Information filled (description, feedback email bisrat09, review contact, no sign-in)
- [ ] Each new build must be added to the Friends group in App Store Connect (EAS auto-submit only reaches internal testers); later builds of the same version usually skip full review
- [ ] Later: bundle photos/GIFs for regulars into the app (offline at the gym)
- [x] First real workout 2026-10-29 + gym trial. Fitbod cancelled 2026-11-07, Fitlog is the daily driver
- [x] Gym feedback fixes 2026-11-07 (code done, not yet in a build):
  - Rest timer per exercise: heavy barbell compounds 2:00, other compounds 1:30, isolation 1:00, core/calves/forearms 0:30 (`src/lib/restTimer.ts`). +/-10s on a running timer is saved as that exercise's rest (settings key `rest_seconds:<exerciseId>`)
  - Rest timer kept counting only while the app was open (JS interval suspended in background). Now wall-clock: stores end time, recomputes on resume
  - Replace/Add search: words in any order, partial words, gym abbreviations (db, bb, kb, rdl, ohp, tri, ext...), plurals, hyphens (`src/lib/exerciseSearch.ts`). First tap on a result no longer just dismisses the keyboard. "No matches" hint mentions active muscle filter
  - 326 tests
- [x] Build 9 queued 2026-11-07 on EAS with auto-submit (build cce6e218). Add to Friends group in App Store Connect once processed
- [x] Bisrat retested build 9 2026-11-08: search works
- [x] Gym feedback 2026-11-08: today's split + Muscle Focus % on the active workout screen; full-screen Workout Complete summary after Finish (duration, est. calories, volume, sets, reps, exercises, muscles worked, best set per exercise, share). Calories = MET 5.0 x body weight x hours (`src/lib/workoutSummary.ts`), shown only when a body weight is logged. 334 tests
- [ ] IN PROGRESS: Build 10 with the above; Bisrat checks summary + muscle focus at the gym
- [x] [2026-11-08] Split rotation fixed: Fitbod-style muscle recovery (src/lib/muscleRecovery.ts). Split = freshest main muscles, lifts led by a recovering muscle (<60%) skipped, Muscle Recovery row on pre-workout screen. Re-plans after Finish
- [x] [2026-11-08] More Options in exercise detail did nothing on iOS: options sheet was a sibling Modal of the pageSheet; now nested inside it
- [x] [2026-11-08] Swap/Add picker: keyboard hid results. BottomSheet now KeyboardAvoidingView; tapping a row, the handle, or Search dismisses the keyboard
- [x] [2026-11-08] Cardio tracking: exercises with primary muscle 'cardio' log Time (stopwatch or typed), Level, Calories (migration 009: sets.duration_sec/level/calories). One set by default, never auto-picked by the generator. Summary uses machine calories (else MET 8 estimate) and excludes cardio time from the lifting estimate. "Last: null" fixed everywhere
- [x] [2026-11-08] Summary didn't appear after Finish: summary Modal was set visible while the Finish BottomSheet was still presented (iOS drops it). Now the sheet closes first and the summary opens on its onDismiss (900ms fallback)
- [x] [2026-11-08] Remove Exercise row in the exercise detail menu (confirms if sets were logged)
- [x] [2026-11-08] Finish drops planned-but-unlogged sets and empty blocks (dropUnloggedSets); Finish sheet says how many will be left out
- [x] [2026-11-08] Pre-workout preview race: stale refreshPreview results could overwrite the current split's list (Push showing Hip Extension). Latest request wins
- [x] Build 14 shipped (finish -> summary, remove exercise)
- [x] [2026-11-08] Log tab redesign (Bisrat asked for Fitbod's more useful log layout, kept Fitlog styling): stats header (total workouts, days this week vs weekly goal, week streak; tap goal to cycle 1-7, setting `weekly_goal_days`), week strip calendar that expands to month, tap a day to filter, timeline of compact cards (muscle title by working sets, Exercises / Volume / Sets, "A, B, C and N more"), tap to expand sets + Repeat/Delete, Show more paging. `src/lib/logStats.ts`. 369 tests
- [x] Build 15 queued 2026-11-08 (EAS 9b2e16b0, auto-submit)
- [x] [2026-11-08] Form video button opened a YouTube search (random suggestions). Now opens one specific video per exercise from trusted coaching channels (Nippard, RP, Scott Herman, Athlean-X, Squat University, Catalyst...): `src/data/formVideos.json`, 223/237 exercises, built by `scripts/buildFormVideos.mjs` (hand-reviewed; OVERRIDES/EXCLUDE lists in the script). Channel + title shown under the button, "More videos" still opens search. 14 excluded exercises fall back to search. 372 tests
- [x] Build 16 queued 2026-11-08 (EAS 07b85005, auto-submit)
- [x] [2026-11-08] Build 16 feedback: Cable One Arm Tricep Side Extension still opened a search (only the 237 exercises with instructions had videos). Script now covers the whole 1,060 seed library. 915 exercises have one specific video; every library pick hand-reviewed by title, 57 wrong picks excluded (paper airplane, pancake recipe, eyelash, FedEx, guitar...), re-upload channels blocked. Rest fall back to search. YouTube may still show its own pre-roll ads (no way around that without Premium)
- [x] Build 17 queued 2026-11-09 (EAS fc815b73, auto-submit)
- [x] [2026-11-11] Bisrat used build 17 at the gym: summary shows, calories blank
- [x] [2026-11-11] Calories showed "--" because no body weight was ever logged (the only places to log it were Settings and an optional field on the finish sheet). Summary now has a body weight field next to an Estimate button when calories are unknown: saves the weight, fills calories in place, reused for every later workout. 373 tests
- [x] [2026-11-11] Build 18 (EAS 55af78f2) failed at signing: provisioning profile lacked the HealthKit capability. Fixed with an interactive EAS build (Bisrat approved): Apple sign-in used the saved session, EAS enabled HealthKit on com.bisrat.fitlog and regenerated the profile. A new native capability always needs one interactive build; run it in tmux and answer the prompts
- [x] [2026-11-11] Build 19 built (EAS e2ef53cb, auto-submit scheduled): calories fix, split label fix, Apple Health body weight. Upload to TestFlight not confirmed from the CLI
- [x] [2026-11-11] Build 19 never reached TestFlight: Apple rejected the upload (ITMS-90683, missing NSHealthUpdateUsageDescription). The HealthKit library contains write code, so Apple requires the write purpose string even though Fitlog only reads. app.json now sets it. Lesson: after auto-submit, check Bisrat's inbox for an App Store Connect "Action needed" email before calling a build shipped
- [x] [2026-11-11] Push day labeled "Pull" (Bisrat changed nothing, only added the stair stepper). Cause: the split label lived only in screen state. When iOS reloaded the app mid-workout, startup re-planned from muscle recovery, and with push muscles now tired it picked Pull. The stored workout was still push. Fix: the active workout's stored split now sets the label (`getWorkoutSplit`), also covers Repeat and Quick Start
- [x] [2026-11-11] Apple Health body weight (Bisrat approved the dependency 2026-11-11; Renpho has no public API but writes weight to Health). `@kingstinct/react-native-healthkit` 16.2.0 + `react-native-nitro-modules` 0.37.2, config plugin in app.json (read-only: HealthKit entitlement + NSHealthShareUsageDescription). Settings > Body Weight > "Sync from Apple Health" switch (setting `health_weight_sync`). When on, finishing a workout pulls the newest Health weight if it is newer than the stored one. Pure logic `src/lib/healthWeight.ts`, native adapter `src/lib/healthKit.ts`. 384 tests. NOT yet verified on a device (no Xcode on the Mac Mini): first real check is build 18 on Bisrat's phone
- [x] [2026-11-11] Build 20 live on TestFlight (EAS 88a94cd2; Apple's "ready to test" email received): calories fix, split label fix, Apple Health body weight
- [x] [2026-11-11] Build 20 on Bisrat's phone: Health switch works (no crash, permission granted) but shows "No weight found". Known bug fixed in code, not yet built: the 4s sync timeout also covered the iOS permission sheet, so the first toggle gave up before Bisrat tapped Allow. Settings now waits up to 5 min on the toggle and re-reads Health whenever the app comes back to the foreground. Finish keeps the 4s limit
- [x] [2026-11-11] Build 21 on TestFlight (EAS 41a0c456, Apple "ready to test" email 04:04 UTC): Health timeout fix
- [x] [2026-11-11] Build 22 on TestFlight (EAS c4caeb8c, Apple "ready to test" email 04:13 UTC): body fat goal card
- [x] [2026-11-13] Apple Health weight sync verified on Bisrat's phone: Settings shows "Latest from Apple Health: 198.4 lb" and the Nov 8 Renpho weigh-in was imported into Body Weight
- [ ] IN PROGRESS: Bisrat opens Progress in build 22 and reports the body fat goal card. Then add build 22 to the Friends group
- [x] [2026-11-11] Body fat goal tracker on the Progress tab (Bisrat's target: 15% body fat). Reads 90 days of body fat and weight from Apple Health, shows the 7-day average, lean mass, weight at the goal, fat to lose, 4-week trend and weeks to go. Goal is editable on the card (default 15). Needs the Health switch on in Settings; iOS shows one more permission sheet for Body Fat Percentage. No new library. Not device-tested (no Xcode here)
- [ ] Bisrat: in the build with the goal card, open Progress, allow Body Fat Percentage on the Health sheet, report what the card shows
- [ ] Ideas from the body fat talk, not approved: cut mode in the workout generator, muscle-loss warning (lean mass dropping), lean-mass-based calorie estimate
- [ ] Later (when Bisrat's Apple Watch arrives): measured calories from the watch (active energy over the workout window, Watch sources only) and save workouts to Apple Health / Fitness. Needs write permission (NSHealthUpdateUsageDescription, currently off)
- [ ] Later: rest-done local notification while the app is in background (needs expo-notifications, new dependency, Bisrat approval)
- [x] [2026-11-08] Muscle-recovery tracking (Fitbod-style freshness per muscle)
- [ ] Pre-existing: 26 TypeScript errors (expo-file-system documentDirectory API change, Timer types)
