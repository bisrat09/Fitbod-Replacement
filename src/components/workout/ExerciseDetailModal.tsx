import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { ExerciseImage } from '../ExerciseImage';
import { SetRow } from '../SetRow';
import { ActionChip } from '../ActionChip';
import { RestTimer } from '../RestTimer';

type ExerciseDetailModalProps = {
  visible: boolean;
  onClose: () => void;

  // Exercise info
  exerciseId: string;
  exerciseName: string;
  imageUrl?: string | null;
  supersetLabel?: string | null; // e.g. "SUPERSET · 1 of 2"

  // Sets
  sets: any[];
  unit: 'lb' | 'kg';
  bestSetIds: Set<string>;
  lastSets?: any[];

  // Timer
  timer?: { timeLeft: number; running: boolean };
  restDuration: number;

  // Callbacks
  onSetUpdate: (setId: string, updates: Record<string, any>) => void;
  onSetFocus: (row: number) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: () => void;
  onAddWarmups: () => void;
  onSwapExercise: () => void;
  onOpenOptions: () => void;
  onTimerPauseResume: () => void;
  onTimerAdjust: (delta: number) => void;
  onTimerReset: () => void;
  onImageFetched?: (url: string) => void;
};

export function ExerciseDetailModal({
  visible, onClose,
  exerciseId, exerciseName, imageUrl, supersetLabel,
  sets, unit, bestSetIds, lastSets,
  timer, restDuration,
  onSetUpdate, onSetFocus, onDeleteSet, onAddSet,
  onAddWarmups, onSwapExercise, onOpenOptions,
  onTimerPauseResume, onTimerAdjust, onTimerReset,
  onImageFetched,
}: ExerciseDetailModalProps) {
  const { c } = useTheme();

  const workingSets = sets.filter((s: any) => !s.is_warmup);
  const doneCount = workingSets.filter((s: any) => s.is_completed).length;
  const totalCount = workingSets.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        {/* Hero area */}
        <View style={[styles.hero, { backgroundColor: c.card }]}>
          <ExerciseImage
            name={exerciseName}
            imageUrl={imageUrl}
            size={120}
            onImageFetched={onImageFetched}
          />

          {/* Close button */}
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.chipBg }]} hitSlop={8}>
            <Ionicons name="close" size={22} color={c.text} />
          </Pressable>

          {/* Superset badge */}
          {supersetLabel && (
            <Text style={[styles.supersetBadge, { color: c.textSecondary }]}>
              {supersetLabel}
            </Text>
          )}

          {/* Exercise name */}
          <Text style={[styles.exerciseName, { color: c.text }]}>{exerciseName}</Text>

          {/* Progress */}
          <Text style={[styles.progress, { color: c.textSecondary }]}>
            {doneCount} of {totalCount} sets completed
          </Text>
        </View>

        {/* Action chips */}
        <View style={styles.chipsRow}>
          <ActionChip icon="time-outline" label={formatRestLabel(restDuration)} onPress={onTimerPauseResume} />
          <ActionChip icon="swap-horizontal" label="Replace" onPress={onSwapExercise} />
          <ActionChip icon="flame-outline" label="Warm-up" onPress={onAddWarmups} />
          <ActionChip icon="ellipsis-horizontal" label="More" onPress={onOpenOptions} />
        </View>

        {/* Sets */}
        <ScrollView style={styles.setsScroll} contentContainerStyle={styles.setsContent} keyboardShouldPersistTaps="handled">
          {/* Last-time preview */}
          {lastSets && lastSets.length > 0 && (
            <Text style={[styles.lastTime, { color: c.textMuted }]}>
              Last: {lastSets.map((s: any) => `${s.weight}${unit}\u00D7${s.reps}${s.rir != null ? ` @${s.rir}` : ''}`).join(', ')}
            </Text>
          )}

          {/* Column headers */}
          <View style={styles.columnHeaders}>
            <View style={styles.setBadgeCol} />
            <Text style={[styles.colHeader, { color: c.textMuted }]}>Reps</Text>
            <Text style={[styles.colHeader, { color: c.textMuted }]}>Weight ({unit})</Text>
          </View>

          {/* Set rows */}
          {sets.map((s: any, i: number) => (
            <SetRow
              key={s.id}
              index={s.set_index}
              reps={s.reps}
              weight={s.weight}
              unit={unit}
              completed={!!s.is_completed}
              isWarmup={!!s.is_warmup}
              isBest={bestSetIds.has(s.id)}
              onRepsChange={(val) => onSetUpdate(s.id, { reps: val })}
              onWeightChange={(val) => onSetUpdate(s.id, { weight: val })}
              onFocus={() => onSetFocus(i)}
              onDelete={!s.is_completed ? () => onDeleteSet(s.id) : undefined}
              note={s.notes}
              onNoteChange={(val) => onSetUpdate(s.id, { notes: val })}
            />
          ))}

          {/* + Add Set */}
          <Pressable onPress={onAddSet} style={styles.addSetBtn}>
            <Ionicons name="add" size={16} color={c.accent} />
            <Text style={[styles.addSetText, { color: c.accent }]}>Add Set</Text>
          </Pressable>
        </ScrollView>

        {/* Rest timer overlay */}
        {timer && (timer.running || timer.timeLeft !== restDuration) && timer.timeLeft > 0 && (
          <View style={styles.timerOverlay}>
            <RestTimer
              timeLeft={timer.timeLeft}
              running={timer.running}
              onPauseResume={onTimerPauseResume}
              onAdjust={onTimerAdjust}
              onDismiss={onTimerReset}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

function formatRestLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    gap: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supersetBadge: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  progress: {
    fontSize: fontSize.caption,
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  setsScroll: {
    flex: 1,
  },
  setsContent: {
    padding: 16,
    gap: 8,
    paddingBottom: 100,
  },
  lastTime: {
    fontSize: fontSize.small,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  setBadgeCol: {
    width: 28,
  },
  colHeader: {
    flex: 1,
    fontSize: fontSize.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  addSetText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  timerOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
});
