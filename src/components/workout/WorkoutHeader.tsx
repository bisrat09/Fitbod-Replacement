import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type WorkoutHeaderProps = {
  prBanner: { exerciseName: string; est1rm: number } | null;
  elapsed: number;
  workoutStartTime: number | null;
  workoutId: string | null;
  streak: number;
  weekCount: number;
  suggestedDay: { day_order: number; split: string } | null;
  programName: string | null;
  unit: 'lb' | 'kg';
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutHeader({
  prBanner, elapsed, workoutStartTime, workoutId,
  streak, weekCount, suggestedDay, programName, unit,
}: WorkoutHeaderProps) {
  const { c } = useTheme();

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: c.text }]}>
          {workoutId ? 'Up Next' : 'Workout'}
        </Text>
        {workoutId && workoutStartTime && (
          <Text style={[styles.elapsed, { color: c.textSecondary }]}>
            {formatTime(elapsed)}
          </Text>
        )}
      </View>

      {/* PR Banner */}
      {prBanner && (
        <View style={[styles.prBanner, { backgroundColor: c.gold }]}>
          <Text style={[styles.prText, { color: c.goldText }]}>
            NEW PR! {prBanner.exerciseName} — Est. 1RM: {prBanner.est1rm} {unit}
          </Text>
        </View>
      )}

      {/* Stats (pre-workout) */}
      {!workoutId && (streak > 0 || weekCount > 0) && (
        <View style={styles.statsRow}>
          {streak > 0 && (
            <Text style={[styles.statText, { color: c.textSecondary }]}>
              {streak} day streak
            </Text>
          )}
          {streak > 0 && weekCount > 0 && (
            <Text style={[styles.statDot, { color: c.textMuted }]}>{'\u00B7'}</Text>
          )}
          {weekCount > 0 && (
            <Text style={[styles.statText, { color: c.textSecondary }]}>
              {weekCount} workout{weekCount !== 1 ? 's' : ''} this week
            </Text>
          )}
        </View>
      )}

      {/* Program suggestion (pre-workout) */}
      {!workoutId && suggestedDay && programName && (
        <View style={[styles.programBadge, { backgroundColor: c.accentLight, borderColor: c.accent }]}>
          <Text style={[styles.programText, { color: c.accent }]}>
            {programName}: Day {suggestedDay.day_order} ({suggestedDay.split.toUpperCase()})
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
  },
  elapsed: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  prBanner: {
    padding: 10,
    borderRadius: 10,
  },
  prText: {
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    fontSize: fontSize.caption,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  statText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  statDot: {
    fontSize: fontSize.caption,
  },
  programBadge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  programText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
