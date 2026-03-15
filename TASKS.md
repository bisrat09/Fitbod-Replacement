# Fitlog — Tasks

## UI Redesign (Fitbod-style) — ALL 7 PHASES COMPLETE

### Fitbod Design Reference (from 12 screenshots — DO NOT ASK FOR AGAIN)

#### Color Palette
- **Background:** `#1C1C1E` (iOS system dark, near-black)
- **Card/surface:** `#2C2C2E` (elevated dark)
- **Card border:** `#3A3A3C`
- **Primary accent:** `#FF3B5C` (pink/coral — buttons, active tab, superset headers, links)
- **Text primary:** `#FFFFFF`
- **Text secondary:** `#8E8E93` (grey)
- **Text muted:** `#636366`
- **Green (completed):** `#34C759` (iOS system green — completed sets, checkmarks)
- **Gold (PRs):** `#FFD700` (trophies, PR badges)
- **Tab bar:** near-black bg, subtle top border, pink active, grey inactive
- **Input fields:** dark bg with subtle borders, white text
- **Toggle switches:** pink when ON

#### Tab Bar (4 tabs)
- **Workout** (wrench/dumbbell icon) — main workout planning + active workout
- **Body** (person icon) — strength scores, muscle group breakdown
- **Targets** (target icon) — training targets/goals
- **Log** (calendar icon) — workout history

#### Workout Screen (Screenshot 1, 9)
- **"Up Next"** bold header + "10 Exercises" subtitle
- **"Swap"** button (pink text + swap icon) + `⋯` menu top-right
- **Filter chips row:** "1h", "Equipment", "Hypertrophy", "Intermediate" — pill-shaped, dark bg, light border, dropdown arrows
- **"Target Muscles"** section: horizontal scroll of muscle names with percentage badges (e.g. "Hamstrings 68%")
- **Exercise cards:** square thumbnail on left, exercise name (bold white), "3 sets · 10 reps · 155 lb" (grey) + `⋯` menu right
- **Superset headers:** "Superset · 4 Rounds" in pink text + `⋯` menu
- **Pink "Start Workout" CTA** pinned at bottom, full-width, rounded

#### Exercise Detail View (Screenshots 2, 3)
- Hero image/gradient area at top with dark overlay
- **"SUPERSET · 1 of 2"** badge (grey text) + close X (white)
- Exercise name: large bold white
- **"How-To"** play button
- **Action chips row:** "1:15 rest" (clock icon), "History" (chart), "Replace" (swap), "More" (⋯) — pill-shaped, dark bg, light border
- **Set rows:** Warm-up row (W icon, grey) + numbered rows (1, 2, 3 circles)
  - Each row: **Reps** input | **Weight (lb)** input — side by side
  - "Plates Only" label under weight column
- **"+ Add Set"** in pink at bottom

#### Active Workout (Screenshot 4)
- Completed set: **green checkmark** circle icon, **green text** on reps/weight values
- Remaining sets: numbered circles in grey
- **Rest timer bottom sheet:** dark card overlay at bottom
  - "Rest" title + X dismiss
  - Large **`1:13`** countdown (white, very large font)
  - **-10s / +10s** stopwatch quick-adjust buttons on either side
  - Pink **pause/resume** button below

#### Workout Summary / History Detail (Screenshot 5)
- Back arrow, "Today, 3:22 PM" center, share + `⋯` right
- **Muscle map** illustrations (front + back body — we'll skip, use text instead)
- **Muscle groups** listed bold: "Chest, Triceps, Abs, Back, & Adductors"
- **Duration:** "1h 35m"
- **Stats row:** CALORIES / VOLUME / RECORDS — with values below each label
- **"10 Exercises"** section with pink + button
- Per-exercise: thumbnail, name, each set listed ("12 reps x 55 lb"), green checkmark for completed
- **"Est. 1 Rep Max"** card: trophy icon + value + chevron

#### Body Tab (Screenshot 6)
- **Segmented control:** "Results" / "Recovery" (selected has white text + underline)
- **"Overall Strength"** card: large score number (70) + diagonal gold bar chart
- **Muscle group cards:** "Push Muscles 69 mSTRENGTH", "Pull Muscles 66", "Leg Muscles 74" — each with trend icon + chevron

#### Exercise Options Bottom Sheet (Screenshot 7/10)
- Drag handle at top
- Exercise name + pink X
- Menu items with icons: Notes, Add Warm-up set, Units (kg/lb toggle), Recommend more/less, Don't recommend, Delete (red)

#### Swap Workout Bottom Sheet (Screenshot 11)
- "Swap Workout" title + pink X
- 2x2 grid: Pick Muscles, Saved Workouts, Create From Scratch, On Demand — each as dark card with icon + chevron

#### Exercise Picker (Screenshots 12, 13)
- Header: filter icon (pink) + "All Exercises" + X (pink)
- Search bar: dark bg, pink/red border
- **Tab filters:** All / By Muscle / Categories (segmented, "All" = white bg pill)
- **Alphabetical sections** (1, 2, A, B...)
- Exercise rows: thumbnail, name, **checkbox** (blue/teal fill when selected)
- **Bottom bar:** "Group as..." (dark/disabled) + **"Add Exercise"** (pink button)

#### My Plan / Settings (Screenshots 14, 16)
- "My Plan" title + "Done" (pink)
- **Goal banner:** green pill — "Goal: Build Muscle >"
- **Grouped sections** with uppercase grey headers: LOCATION, TRAINING PROFILE, TRAINING FORMAT, PREFERENCES
- **Row items:** label left, value + chevron right
- **Toggles:** pink when ON
- **lb/kg:** segmented pill selector (selected = white bg)
- Rows: Equipment, Bodyweight-only, Workouts/Week, Duration, Experience, Training Split, Variability, Focus, Warm-Up Sets, Circuits & Supersets, Timed Intervals, Units, Cardio, Stretching, Manage Exercises

#### Manage Exercises (Screenshot 17)
- Filter icon (pink) + "Manage Exercises" + "Done" (pink)
- Search bar (dark, rounded)
- Exercise rows: thumbnail, name, **usage count** number, status icons (↑ prioritized, ⊘ excluded), `⋯` menu
- Sorted by usage count descending

---

### Redesign Phases

#### Phase 1: Theme & Foundation — DONE
- [x] Update `src/theme/colors.ts` — Fitbod color palette (near-black, pink accent, iOS colors)
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
- [x] Fitbod-styled: dark cards, pink CTAs, exercise initial circles, green checkmarks, rest timer overlay
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

## Backlog
- [ ] On-device testing pass
- [ ] Add integration tests with real SQLite
