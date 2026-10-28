import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { ExerciseImage } from '../ExerciseImage';
import { SetRow } from '../SetRow';
import { PinkButton } from '../PinkButton';
import { RestTimer } from '../RestTimer';
import { ExerciseDemoModal } from '../ExerciseDemoModal';

type ExerciseDetailModalProps = {
  visible: boolean;
  onClose: () => void;

  // Exercise info
  exerciseId: string;
  exerciseName: string;
  imageUrl?: string | null;
  supersetLabel?: string | null; // e.g. "Part 1 of 2 (Superset)"

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
  onCompleteSet?: () => void;
};

export function ExerciseDetailModal({
  visible, onClose,
  exerciseId, exerciseName, imageUrl, supersetLabel,
  sets, unit, bestSetIds, lastSets,
  timer, restDuration,
  onSetUpdate, onSetFocus, onDeleteSet, onAddSet,
  onAddWarmups, onSwapExercise, onOpenOptions,
  onTimerPauseResume, onTimerAdjust, onTimerReset,
  onImageFetched, onCompleteSet,
}: ExerciseDetailModalProps) {
  const { c } = useTheme();
  const [showDemo, setShowDemo] = useState(false);

  const workingSets = sets.filter((s: any) => !s.is_warmup);
  const doneCount = workingSets.filter((s: any) => s.is_completed).length;
  const totalCount = workingSets.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const nextIncomplete = sets.find((s: any) => !s.is_completed && s.reps != null && s.weight != null);
  const canLog = !!nextIncomplete && !allDone;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        {/* Compact header */}
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.cardBorder }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => setShowDemo(true)} hitSlop={6}>
              <ExerciseImage
                name={exerciseName}
                imageUrl={imageUrl}
                size={64}
                onImageFetched={onImageFetched}
              />
              <View style={[styles.demoBadge, { backgroundColor: c.accent }]}>
                <Ionicons name="play" size={10} color={c.textOnAccent} />
              </View>
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text style={[styles.exerciseName, { color: c.text }]} numberOfLines={2}>{exerciseName}</Text>
              {supersetLabel && (
                <Text style={[styles.supersetBadge, { color: c.textSecondary }]}>
                  {supersetLabel}
                </Text>
              )}
              <Text style={[styles.progress, { color: c.textSecondary }]}>
                {doneCount} of {totalCount} sets completed
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.chipBg }]} hitSlop={8}>
            <Ionicons name="close" size={22} color={c.text} />
          </Pressable>
        </View>

        <ExerciseDemoModal visible={showDemo} onClose={() => setShowDemo(false)} name={exerciseName} imageUrl={imageUrl} />

        {/* Action menu (vertical list) */}
        <View style={[styles.actionMenu, { borderBottomColor: c.cardBorder }]}>
          <Pressable style={styles.actionMenuItem} onPress={onTimerPauseResume}>
            <Ionicons name="time-outline" size={20} color={c.textSecondary} />
            <Text style={[styles.actionMenuLabel, { color: c.text }]}>Rest Timer — {formatRestLabel(restDuration)}</Text>
          </Pressable>
          <Pressable style={styles.actionMenuItem} onPress={onSwapExercise}>
            <Ionicons name="swap-horizontal" size={20} color={c.textSecondary} />
            <Text style={[styles.actionMenuLabel, { color: c.text }]}>Replace Exercise</Text>
          </Pressable>
          <Pressable style={styles.actionMenuItem} onPress={onAddWarmups}>
            <Ionicons name="flame-outline" size={20} color={c.textSecondary} />
            <Text style={[styles.actionMenuLabel, { color: c.text }]}>Add Warm-up Sets</Text>
          </Pressable>
          <Pressable style={styles.actionMenuItem} onPress={onOpenOptions}>
            <Ionicons name="ellipsis-horizontal" size={20} color={c.textSecondary} />
            <Text style={[styles.actionMenuLabel, { color: c.text }]}>More Options</Text>
          </Pressable>
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
            <Text style={[styles.addSetText, { color: c.accent }]}>Add Another Set</Text>
          </Pressable>
        </ScrollView>

        {/* Log Set button */}
        {onCompleteSet && !allDone && (
          <View style={styles.logSetBar}>
            <PinkButton
              title={doneCount === totalCount - 1 ? 'Log Set & Next Exercise' : 'Log Set'}
              onPress={onCompleteSet}
              fullWidth
              disabled={!canLog}
            />
          </View>
        )}

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
  demoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitleGroup: {
    flex: 1,
    gap: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  supersetBadge: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  exerciseName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  progress: {
    fontSize: fontSize.caption,
  },
  actionMenu: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  actionMenuLabel: {
    fontSize: fontSize.body,
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
  logSetBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  timerOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
  },
});
