import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { PinkButton } from '../PinkButton';
import { ActionChip } from '../ActionChip';
import { SupersetHeader } from '../SupersetHeader';
import { WorkoutHeader } from './WorkoutHeader';
import { ExerciseListItem } from './ExerciseListItem';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ExerciseOptionsSheet } from './ExerciseOptionsSheet';
import type { Recommendation } from '@/lib/dao';

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
  bestSetIds: Set<string>;
  lastSets: Record<string, any[]>;
  restDuration: number;

  // Actions
  onAddExercise: () => void;
  onFinishWorkout: () => void;

  // Exercise callbacks (for detail modal)
  onLogSet: (blockId: string, exerciseId: string) => void;
  onAddWarmups: (blockId: string, exerciseId: string) => void;
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
  onCompleteActiveSet?: (blockId: string) => void;
};

export function ActiveWorkoutView({
  prBanner, elapsed, workoutStartTime, workoutId,
  streak, weekCount, suggestedDay, programName, unit,
  blocks, blockExercises, sets, timers,
  bestSetIds, lastSets, restDuration,
  onAddExercise, onFinishWorkout,
  onLogSet, onAddWarmups, onSwapExercise,
  onDeleteSet, onSetUpdate, onSetFocus,
  onTimerPauseResume, onTimerAdjust, onTimerReset,
  onImageFetched,
  exerciseNotes, exerciseRecommendations,
  onExerciseNotesChange, onExerciseRecommendationChange,
  onUnitToggle, onRemoveExercise, onCompleteActiveSet,
}: ActiveWorkoutViewProps) {
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);
  const [showOptions, setShowOptions] = useState(false);
  const hasAutoOpened = useRef(false);

  // Auto-open first exercise when workout starts
  useEffect(() => {
    if (hasAutoOpened.current) return;
    if (blocks.length === 0) return;
    const firstBlock = blocks[0];
    const exs = blockExercises[firstBlock.id] ?? [];
    if (exs.length === 0) return;
    hasAutoOpened.current = true;
    setDetailTarget({ blockId: firstBlock.id, exerciseId: exs[0].exercise_id });
  }, [blocks, blockExercises]);

  // Find the next exercise with incomplete sets (after the current one)
  function findNextIncompleteExercise(currentBlockId: string, currentExerciseId: string): DetailTarget {
    const allExercises: { blockId: string; exerciseId: string }[] = [];
    for (const block of blocks) {
      for (const ex of (blockExercises[block.id] ?? [])) {
        allExercises.push({ blockId: block.id, exerciseId: ex.exercise_id });
      }
    }
    const currentIdx = allExercises.findIndex(e => e.blockId === currentBlockId && e.exerciseId === currentExerciseId);
    for (let i = currentIdx + 1; i < allExercises.length; i++) {
      const { blockId, exerciseId } = allExercises[i];
      const working = sets.filter((s: any) => s.block_id === blockId && s.exercise_id === exerciseId && !s.is_warmup);
      if (working.some((s: any) => !s.is_completed)) {
        return { blockId, exerciseId };
      }
    }
    return null;
  }

  // Wrap onCompleteActiveSet to auto-advance to next exercise when current is done
  function handleCompleteSet() {
    if (!onCompleteActiveSet || !detailTarget) return;
    const { blockId, exerciseId } = detailTarget;
    const working = sets.filter((s: any) => s.block_id === blockId && s.exercise_id === exerciseId && !s.is_warmup);
    const incompleteCount = working.filter((s: any) => !s.is_completed).length;

    onCompleteActiveSet(blockId);

    // If this was the last incomplete set, advance to next exercise
    if (incompleteCount <= 1) {
      const next = findNextIncompleteExercise(blockId, exerciseId);
      if (next) {
        setDetailTarget(next);
      } else {
        setDetailTarget(null); // All exercises done
      }
    }
  }

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

      {/* Clean exercise list */}
      <View style={styles.exerciseList}>
        {blocks.map((b: any) => {
          const exs = blockExercises[b.id] ?? [];
          const isSuperset = exs.length > 1;
          return (
            <View key={b.id}>
              {isSuperset && (
                <SupersetHeader exerciseCount={exs.length} />
              )}
              {exs.map((ex: any) => {
                const exSets = sets.filter((s: any) => s.block_id === b.id && s.exercise_id === ex.exercise_id);
                const workingSets = exSets.filter((s: any) => !s.is_warmup);
                const completedCount = workingSets.filter((s: any) => s.is_completed).length;
                const totalCount = workingSets.length;
                const allDone = totalCount > 0 && completedCount === totalCount;
                return (
                  <ExerciseListItem
                    key={`${b.id}-${ex.exercise_id}`}
                    name={ex.exercise_name}
                    imageUrl={ex.image_url}
                    subtitle={totalCount > 0
                      ? `${totalCount} sets \u00B7 ${exSets[0]?.reps ?? 0} reps \u00B7 ${exSets[0]?.weight ?? 0} ${unit}`
                      : '0 sets'}
                    progress={`${completedCount}/${totalCount}`}
                    allDone={allDone}
                    onPress={() => setDetailTarget({ blockId: b.id, exerciseId: ex.exercise_id })}
                    onMenuPress={() => {
                      setDetailTarget({ blockId: b.id, exerciseId: ex.exercise_id });
                      setTimeout(() => setShowOptions(true), 100);
                    }}
                    onImageFetched={onImageFetched ? (url) => onImageFetched(ex.exercise_id, url) : undefined}
                  />
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Actions row */}
      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <PinkButton title="Add Exercise" onPress={onAddExercise} fullWidth />
        </View>
        <ActionChip icon="checkmark-done-outline" label="Finish" onPress={onFinishWorkout} />
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
          onCompleteSet={onCompleteActiveSet ? handleCompleteSet : undefined}
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
  exerciseList: {
    gap: 0,
  },
});
