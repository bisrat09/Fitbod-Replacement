# Fitlog Expo Starter (Offline-First, SQLite)
Ready-to-run Expo Router + TS app for local-only fitness logging.

## Install
```bash
npm i
npx expo install expo-router expo-sqlite expo-file-system react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-svg
```

## Run
```bash
npx expo start
```

## Notes
- The Today screen seeds a 'Barbell Bench Press' exercise for demo, then lets you start a workout and log sets.
- All data is stored locally in SQLite (`fitlog.db`).