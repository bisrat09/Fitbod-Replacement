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

