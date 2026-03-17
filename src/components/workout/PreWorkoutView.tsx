import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { PinkButton } from '../PinkButton';
import { ActionChip } from '../ActionChip';
import { Chip } from '../Chip';
import { TargetMuscles } from './TargetMuscles';
import { ExerciseListItem } from './ExerciseListItem';
import {
  DURATION_OPTIONS,
  DURATION_EXERCISE_COUNT,
  type DurationOption,
} from '@/lib/workoutGenerator';

type PreviewExercise = {
  id: string;
  name: string;
  muscle_groups: string;
  image_url?: string | null;
  sets: number;
  reps: number;
  weight: number;
};

type PreWorkoutViewProps = {
  previewExercises: PreviewExercise[];
  split: string;
  duration: DurationOption;
  unit: 'lb' | 'kg';
  programName: string | null;
  streak: number;
  weekCount: number;
  onDurationChange: (d: DurationOption) => void;
  onSplitChange: (s: string) => void;
  onStartWorkout: () => void;
  onQuickStart: () => void;
  onEquipmentPress: () => void;
  onExerciseMenuPress?: (exerciseId: string) => void;
  onSwapWorkout?: () => void;
  onImageFetched?: (exerciseId: string, url: string) => void;
};

const SPLIT_OPTIONS = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

export function PreWorkoutView({
  previewExercises,
  split,
  duration,
  unit,
  programName,
  streak,
  weekCount,
  onDurationChange,
  onSplitChange,
  onStartWorkout,
  onQuickStart,
  onEquipmentPress,
  onExerciseMenuPress,
  onSwapWorkout,
  onImageFetched,
}: PreWorkoutViewProps) {
  const { c } = useTheme();
  const exerciseCount = previewExercises.length || DURATION_EXERCISE_COUNT[duration] || 10;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: c.text }]}>Up Next</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {exerciseCount} Exercises
          </Text>
        </View>
        <View style={styles.headerRight}>
          {onSwapWorkout && (
            <Pressable onPress={onSwapWorkout} style={styles.swapBtn}>
              <Ionicons name="swap-horizontal" size={16} color={c.accent} />
              <Text style={[styles.swapText, { color: c.accent }]}>Swap</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Stats row */}
      {(streak > 0 || weekCount > 0) && (
        <View style={styles.statsRow}>
          {streak > 0 && (
            <Text style={[styles.statText, { color: c.textSecondary }]}>
              {streak} day streak
            </Text>
          )}
          {weekCount > 0 && (
            <Text style={[styles.statText, { color: c.textSecondary }]}>
              {weekCount} this week
            </Text>
          )}
        </View>
      )}

      {/* Filter chips — duration as dropdown, equipment */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {!programName && (
          <Pressable
            onPress={() => {
              const idx = DURATION_OPTIONS.indexOf(duration);
              const next = DURATION_OPTIONS[(idx + 1) % DURATION_OPTIONS.length];
              onDurationChange(next);
            }}
            style={[styles.dropdownChip, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}
          >
            <Text style={[styles.dropdownText, { color: c.text }]}>
              {duration >= 60 ? `${duration / 60}h` : `${duration}m`}
            </Text>
            <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
          </Pressable>
        )}
        <Pressable
          onPress={onEquipmentPress}
          style={[styles.dropdownChip, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}
        >
          <Text style={[styles.dropdownText, { color: c.text }]}>Equipment</Text>
          <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
        </Pressable>
      </ScrollView>

      {/* Split selector */}
      {!programName && (
        <View style={styles.chipsRow}>
          {SPLIT_OPTIONS.map((s) => (
            <Chip
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={split === s}
              onPress={() => onSplitChange(s)}
              size="sm"
            />
          ))}
        </View>
      )}

      {/* Target Muscles */}
      {previewExercises.length > 0 && (
        <TargetMuscles exercises={previewExercises} />
      )}

      {/* Exercise list */}
      {previewExercises.length > 0 && (
        <View style={styles.exerciseList}>
          {previewExercises.map((ex) => (
            <ExerciseListItem
              key={ex.id}
              name={ex.name}
              imageUrl={ex.image_url}
              subtitle={`${ex.sets} sets \u00B7 ${ex.reps} reps \u00B7 ${ex.weight} ${unit}`}
              onMenuPress={onExerciseMenuPress ? () => onExerciseMenuPress(ex.id) : undefined}
              onImageFetched={onImageFetched ? (url) => onImageFetched(ex.id, url) : undefined}
            />
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <PinkButton title="Start Workout" onPress={onStartWorkout} fullWidth />
        </View>
        <ActionChip icon="flash-outline" label="Quick Start" onPress={onQuickStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.caption,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  swapText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: fontSize.small,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  exerciseList: {
    gap: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
});
