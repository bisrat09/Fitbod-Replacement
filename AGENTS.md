# Fitlog — Agent Guide

Purpose
- This file orients coding agents working in this repository. It defines scope, conventions, and constraints. Treat it as the canonical collaboration contract with the developer.

Mode
- Level: Medium
- Verbosity: 4 (balanced; concise but with brief rationale when useful)
- Initiative: Balanced (propose small, high‑value steps; avoid gold‑plating)
- Confirmations: Ask before network access or adding dependencies
- Output: Show diffs for edited files; keep changes localized

Context Tips
- Persist context in-repo: keep DEVLOG.md and this AGENTS.md updated.
- Prefer file references over large pastes; send diffs when possible.
- Keep messages compact; summarize long threads on request.
- On context drift, reset by: “Read DEVLOG.md and AGENTS.md, then do X.”
- Response suffix (visibility cue): append "I remember" at the end of each assistant reply in this repo to indicate continued context tracking.

Project Snapshot
- App: Expo Router + TypeScript, offline-first fitness tracker
- Storage: SQLite via `expo-sqlite` (local only)
- Key files:
  - `app/`: screens (Today, History)
  - `src/lib/fitlog_schema.ts`: SQL schema as string (SDK 54-friendly)
  - `src/lib/db.ts`: open DB + migrate
  - `src/lib/dao.ts`: DAO for users, exercises, workouts, sets, metrics
  - `src/lib/progression.ts`: RIR progression + Epley 1RM
  - `src/lib/bootstrap.ts`: bootstrap DB + persistent `userId`
  - `src/state/store.ts`: future global state (Zustand)

Environment
- Target: Expo SDK 54, React Native 0.81, React 19.1.0
- Run: `npm start` (Expo Go 54)
- Doctor: `npx expo-doctor`

Working Rules
- Modify only the files necessary for a task; prefer localized changes.
- Do not add new dependencies without explicit developer approval.
- Follow Expo + TypeScript best practices; keep UI simple and maintainable.
- Show diffs for edited files when presenting changes.
- If a change requires schema or DAO updates, note any migration implications.
- Prefer deterministic, testable helpers; keep business logic out of views.

Coding Conventions
- TypeScript with explicit types on public helpers; avoid `any` where practical.
- Small, focused components and functions; keep Today screen logic lightweight.
- Avoid one-letter variables; keep names semantic.
- No inline license headers unless requested.
- Keep styles simple and colocated for small views; avoid adding style libs.

Data & Multi-user
- Schema is multi-user; every table has `user_id`. When adding tables or queries, include `user_id` and relevant indexes.

Performance & Offline
- All data is local; avoid network calls. Optimize DB queries and indexes.

Roadmap Pointers (future tasks)
- Rest timer polish (custom durations, +30s)
- PR banner (detect new Epley 1RM)
- Weekly volume per muscle group
- Backup/export JSON via `expo-file-system`
- UI polish: RIR chips, forms, charts (`react-native-svg`)

Today’s Context
- Latest changes are summarized in `DEVLOG.md`.
