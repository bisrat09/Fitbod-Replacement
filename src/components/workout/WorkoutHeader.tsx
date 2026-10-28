import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type WorkoutHeaderProps = {
  prBanner: { exerciseName: string; est1rm: number } | null;
  elapsed: number;
  paused?: boolean;
  onTogglePause?: () => void;
  workoutStartTime: number | null;
  workoutId: string | null;
  streak: number;
  weekCount: number;
  suggestedDay: { day_order: number; split: string } | null;
  programName: string | null;
  unit: 'lb' | 'kg';
};

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutHeader({
  prBanner, elapsed, paused, onTogglePause, workoutStartTime, workoutId,
  streak, weekCount, suggestedDay, programName, unit,
}: WorkoutHeaderProps) {
  const { c } = useTheme();

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={[styles.title, { color: c.text }]}>
        {workoutId ? 'Today\'s Workout' : 'Workout'}
      </Text>

      {/* Workout clock + pause */}
      {workoutId && workoutStartTime && (
        <View style={styles.clockRow}>
          <View style={[styles.clockDot, { backgroundColor: paused ? c.textMuted : c.timerDot }]} />
          <Text style={[styles.clock, { color: paused ? c.textSecondary : c.text }]}>
            {formatTime(elapsed)}
          </Text>
          {paused && (
            <Text style={[styles.pausedLabel, { color: c.textSecondary }]}>PAUSED</Text>
          )}
          {onTogglePause && (
            <Pressable
              onPress={onTogglePause}
              style={[styles.pauseBtn, { backgroundColor: paused ? c.accent : c.chipBg, borderColor: paused ? c.accent : c.chipBorder }]}
              hitSlop={8}
              accessibilityLabel={paused ? 'Resume workout' : 'Pause workout'}
            >
              <Ionicons name={paused ? 'play' : 'pause'} size={26} color={paused ? c.textOnAccent : c.text} />
            </Pressable>
          )}
        </View>
      )}

      {/* PR Banner */}
      {prBanner && (
        <View style={[styles.prBanner, { backgroundColor: c.gold }]}>
          <Text style={[styles.prText, { color: c.goldText }]}>
            NEW PR! {prBanner.exerciseName} — Estimated Max: {prBanner.est1rm} {unit}
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
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  clockDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clock: {
    fontSize: 44,
    fontWeight: fontWeight.bold,
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  pausedLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  pauseBtn: {
    marginLeft: 'auto',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
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
