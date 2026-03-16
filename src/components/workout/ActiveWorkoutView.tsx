import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight as fw } from '@/theme/typography';
import { Chip } from '../Chip';
import { PinkButton } from '../PinkButton';
import { ActionChip } from '../ActionChip';
import { WorkoutHeader } from './WorkoutHeader';
import { BlockCard } from './BlockCard';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ExerciseOptionsSheet } from './ExerciseOptionsSheet';
import type { Recommendation } from '@/lib/dao';

const REST_OPTIONS = [60, 90, 120, 180];

type DetailTarget = {
  blockId: string;
  exerciseId: string;
} | null;

type ActiveWorkoutViewProps = {
  // Header
  prBanner: { exerciseName: string; est1rm: number } | null;
  elapsed: number;
  workoutStartTime: number | null;
  workoutId: string;
  streak: number;
  weekCount: number;
  suggestedDay: { day_order: number; split: string } | null;
  programName: string | null;
  unit: 'lb' | 'kg';

  // Blocks
  blocks: any[];
  blockExercises: Record<string, any[]>;
  sets: any[];
  timers: Record<string, { timeLeft: number; running: boolean }>;
  activeRowByBlock: Record<string, { exerciseId: string; row: number }>;
  collapsedBlocks: Set<string>;
  bestSetIds: Set<string>;
  lastSets: Record<string, any[]>;
  restDuration: number;

  // Global inputs
  weight: string;
  reps: string;
  rir: string;
  rirValue: number;
  onWeightChange: (val: string) => void;
  onRepsChange: (val: string) => void;
  onRirChange: (val: string) => void;
  onRestDurationChange: (sec: number) => void;

  // Notes
  workoutNotes: string;
  onWorkoutNotesChange: (val: string) => void;

  // Actions
  onAddExercise: () => void;
  onFinishWorkout: () => void;

  // Block callbacks
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  onToggleCollapse: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMakeSuperset: (blockId: string) => void;
  onLogSet: (blockId: string, exerciseId: string) => void;
  onAddWarmups: (blockId: string, exerciseId: string) => void;
  onAddDropSets: (blockId: string, exerciseId: string) => void;
  onSwapExercise: (blockId: string, exerciseId: string) => void;
  onDeleteSet: (setId: string) => void;
  onSetUpdate: (setId: string, updates: Record<string, any>) => void;
  onSetFocus: (blockId: string, exerciseId: string, row: number) => void;
  onTimerPauseResume: (blockId: string) => void;
  onTimerAdjust: (blockId: string, delta: number) => void;
  onTimerReset: (blockId: string) => void;
  onImageFetched?: (exerciseId: string, url: string) => void;

  // Exercise options
  exerciseNotes: Record<string, string>;
  exerciseRecommendations: Record<string, Recommendation>;
  onExerciseNotesChange: (exerciseId: string, notes: string) => void;
  onExerciseRecommendationChange: (exerciseId: string, rec: Recommendation) => void;
  onUnitToggle: () => void;
  onRemoveExercise: (blockId: string, exerciseId: string) => void;
};

export function ActiveWorkoutView({
  prBanner, elapsed, workoutStartTime, workoutId,
  streak, weekCount, suggestedDay, programName, unit,
  blocks, blockExercises, sets, timers, activeRowByBlock, collapsedBlocks,
  bestSetIds, lastSets, restDuration,
  weight, reps, rir, rirValue,
  onWeightChange, onRepsChange, onRirChange, onRestDurationChange,
  workoutNotes, onWorkoutNotesChange,
  onAddExercise, onFinishWorkout,
  onMoveBlock, onToggleCollapse, onDeleteBlock, onDuplicateBlock,
  onMakeSuperset, onLogSet, onAddWarmups, onAddDropSets, onSwapExercise,
  onDeleteSet, onSetUpdate, onSetFocus,
  onTimerPauseResume, onTimerAdjust, onTimerReset,
  onImageFetched,
  exerciseNotes, exerciseRecommendations,
  onExerciseNotesChange, onExerciseRecommendationChange,
  onUnitToggle, onRemoveExercise,
}: ActiveWorkoutViewProps) {
  const { c } = useTheme();
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Resolve detail modal data from current target
  const detailData = (() => {
    if (!detailTarget) return null;
    const { blockId, exerciseId } = detailTarget;
    const exs = blockExercises[blockId] ?? [];
    const ex = exs.find((e: any) => e.exercise_id === exerciseId);
    if (!ex) return null;

    const exSets = sets.filter((s: any) => s.block_id === blockId && s.exercise_id === exerciseId);
    const exIndex = exs.findIndex((e: any) => e.exercise_id === exerciseId);
    const isSuperset = exs.length > 1;
    const supersetLabel = isSuperset ? `SUPERSET \u00B7 ${exIndex + 1} of ${exs.length}` : null;

    return {
      exerciseId,
      exerciseName: ex.exercise_name,
      imageUrl: ex.image_url,
      supersetLabel,
      sets: exSets,
      lastSets: lastSets[exerciseId],
      timer: timers[blockId],
      blockId,
    };
  })();

  return (
    <View style={styles.container}>
      {/* Header */}
      <WorkoutHeader
        prBanner={prBanner}
        elapsed={elapsed}
        workoutStartTime={workoutStartTime}
        workoutId={workoutId}
        streak={streak}
        weekCount={weekCount}
        suggestedDay={suggestedDay}
        programName={programName}
        unit={unit}
      />

      {/* Actions row */}
      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <PinkButton title="Add Exercise" onPress={onAddExercise} fullWidth />
        </View>
        <ActionChip icon="checkmark-done-outline" label="Finish" onPress={onFinishWorkout} />
      </View>

      {/* Rest duration */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: c.textSecondary }]}>Rest Timer</Text>
        <View style={styles.chipsRow}>
          {REST_OPTIONS.map((sec) => (
            <Chip key={sec} label={`${sec}s`} selected={restDuration === sec} onPress={() => onRestDurationChange(sec)} size="sm" />
          ))}
        </View>
      </View>

      {/* Global inputs */}
      <View style={styles.inputsRow}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Weight</Text>
          <TextInput
            value={weight}
            onChangeText={onWeightChange}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Reps</Text>
          <TextInput
            value={reps}
            onChangeText={onRepsChange}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>RIR</Text>
          <View style={styles.chipsRow}>
            {[3, 2, 1].map((v) => (
              <Chip key={v} label={String(v)} selected={rirValue === v} onPress={() => onRirChange(String(v))} size="sm" />
            ))}
          </View>
        </View>
      </View>

      {/* Exercise blocks */}
      {blocks.length > 0 && (
        <View style={styles.blocksContainer}>
          {blocks.map((b: any) => (
            <BlockCard
              key={b.id}
              block={b}
              exercises={blockExercises[b.id] ?? (b.exercise_id ? [{ exercise_id: b.exercise_id, exercise_name: b.exercise_name }] : [])}
              sets={sets.filter((s: any) => s.block_id === b.id)}
              timer={timers[b.id] ?? { timeLeft: restDuration, running: false }}
              activeRow={activeRowByBlock[b.id]}
              collapsed={collapsedBlocks.has(b.id)}
              unit={unit}
              bestSetIds={bestSetIds}
              lastSets={lastSets}
              restDuration={restDuration}
              onMoveUp={() => onMoveBlock(b.id, 'up')}
              onMoveDown={() => onMoveBlock(b.id, 'down')}
              onToggleCollapse={() => onToggleCollapse(b.id)}
              onDelete={() => onDeleteBlock(b.id)}
              onDuplicate={() => onDuplicateBlock(b.id)}
              onMakeSuperset={() => onMakeSuperset(b.id)}
              onLogSet={(exId) => onLogSet(b.id, exId)}
              onAddWarmups={(exId) => onAddWarmups(b.id, exId)}
              onAddDropSets={(exId) => onAddDropSets(b.id, exId)}
              onSwapExercise={(exId) => onSwapExercise(b.id, exId)}
              onDeleteSet={onDeleteSet}
              onSetUpdate={onSetUpdate}
              onSetFocus={(exId, row) => onSetFocus(b.id, exId, row)}
              onTimerPauseResume={() => onTimerPauseResume(b.id)}
              onTimerAdjust={(delta) => onTimerAdjust(b.id, delta)}
              onTimerReset={() => onTimerReset(b.id)}
              onExercisePress={(exId) => setDetailTarget({ blockId: b.id, exerciseId: exId })}
              onImageFetched={onImageFetched}
            />
          ))}
        </View>
      )}

      {/* Workout notes */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: c.textSecondary }]}>Notes</Text>
        <TextInput
          placeholder="How did this workout feel?"
          value={workoutNotes}
          onChangeText={onWorkoutNotesChange}
          multiline
          style={[styles.notesInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Exercise detail modal */}
      {detailData && detailTarget && (
        <ExerciseDetailModal
          visible
          onClose={() => setDetailTarget(null)}
          exerciseId={detailData.exerciseId}
          exerciseName={detailData.exerciseName}
          imageUrl={detailData.imageUrl}
          supersetLabel={detailData.supersetLabel}
          sets={detailData.sets}
          unit={unit}
          bestSetIds={bestSetIds}
          lastSets={detailData.lastSets}
          timer={detailData.timer}
          restDuration={restDuration}
          onSetUpdate={onSetUpdate}
          onSetFocus={(row) => onSetFocus(detailTarget.blockId, detailData.exerciseId, row)}
          onDeleteSet={onDeleteSet}
          onAddSet={() => onLogSet(detailTarget.blockId, detailData.exerciseId)}
          onAddWarmups={() => onAddWarmups(detailTarget.blockId, detailData.exerciseId)}
          onSwapExercise={() => { setDetailTarget(null); onSwapExercise(detailTarget.blockId, detailData.exerciseId); }}
          onOpenOptions={() => setShowOptions(true)}
          onTimerPauseResume={() => onTimerPauseResume(detailTarget.blockId)}
          onTimerAdjust={(delta) => onTimerAdjust(detailTarget.blockId, delta)}
          onTimerReset={() => onTimerReset(detailTarget.blockId)}
          onImageFetched={onImageFetched ? (url) => onImageFetched(detailData.exerciseId, url) : undefined}
        />
      )}

      {/* Exercise options sheet */}
      {detailData && detailTarget && (
        <ExerciseOptionsSheet
          visible={showOptions}
          onClose={() => setShowOptions(false)}
          exerciseName={detailData.exerciseName}
          notes={exerciseNotes[detailData.exerciseId] ?? ''}
          onNotesChange={(notes) => onExerciseNotesChange(detailData.exerciseId, notes)}
          onAddWarmups={() => onAddWarmups(detailTarget.blockId, detailData.exerciseId)}
          unit={unit}
          onUnitToggle={onUnitToggle}
          recommendation={(exerciseRecommendations[detailData.exerciseId] as any) ?? 'normal'}
          onRecommendationChange={(rec) => onExerciseRecommendationChange(detailData.exerciseId, rec)}
          onRemove={() => { setShowOptions(false); setDetailTarget(null); onRemoveExercise(detailTarget.blockId, detailData.exerciseId); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    gap: 4,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: fw.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: fontSize.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 70,
    fontSize: fontSize.caption,
    fontWeight: fw.semibold,
  },
  blocksContainer: {
    gap: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: fontSize.caption,
    minHeight: 48,
    textAlignVertical: 'top',
  },
});
