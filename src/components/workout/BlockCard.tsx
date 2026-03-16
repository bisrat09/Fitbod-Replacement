import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '../Card';
import { ExerciseImage } from '../ExerciseImage';
import { SetRow } from '../SetRow';
import { SupersetHeader } from '../SupersetHeader';
import { RestTimer } from '../RestTimer';
import { BottomSheet } from '../BottomSheet';
import { SettingsRow } from '../SettingsRow';

type BlockCardProps = {
  block: { id: string; order_index: number };
  exercises: Array<{ exercise_id: string; exercise_name: string; image_url?: string | null }>;
  sets: any[];
  timer: { timeLeft: number; running: boolean };
  activeRow?: { exerciseId: string; row: number };
  collapsed: boolean;
  unit: 'lb' | 'kg';
  bestSetIds: Set<string>;
  lastSets: Record<string, any[]>;
  restDuration: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCollapse: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMakeSuperset: () => void;
  onLogSet: (exerciseId: string) => void;
  onAddWarmups: (exerciseId: string) => void;
  onAddDropSets: (exerciseId: string) => void;
  onSwapExercise: (exerciseId: string) => void;
  onDeleteSet: (setId: string) => void;
  onSetUpdate: (setId: string, updates: Record<string, any>) => void;
  onSetFocus: (exerciseId: string, row: number) => void;
  onTimerPauseResume: () => void;
  onTimerAdjust: (delta: number) => void;
  onTimerReset: () => void;
  onImageFetched?: (exerciseId: string, url: string) => void;
};

export function BlockCard({
  block, exercises, sets, timer, activeRow, collapsed, unit, bestSetIds, lastSets, restDuration,
  onMoveUp, onMoveDown, onToggleCollapse, onDelete, onDuplicate, onMakeSuperset,
  onLogSet, onAddWarmups, onAddDropSets, onSwapExercise,
  onDeleteSet, onSetUpdate, onSetFocus,
  onTimerPauseResume, onTimerAdjust, onTimerReset,
  onImageFetched,
}: BlockCardProps) {
  const { c } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  // The exercise being targeted by menu actions (for superset blocks)
  const [menuExerciseId, setMenuExerciseId] = useState<string | null>(null);

  const workingSets = sets.filter((s: any) => !s.is_warmup);
  const doneCount = workingSets.filter((s: any) => s.is_completed).length;
  const totalCount = workingSets.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const isSuperset = exercises.length > 1;
  const primaryExercise = exercises[0];

  // Build subtitle from first exercise's sets
  const primarySets = sets.filter((s: any) => s.exercise_id === primaryExercise?.exercise_id && !s.is_warmup);
  const subtitle = primarySets.length > 0
    ? `${primarySets.length} sets${primarySets[0]?.reps ? ` \u00B7 ${primarySets[0].reps} reps` : ''}${primarySets[0]?.weight ? ` \u00B7 ${primarySets[0].weight} ${unit}` : ''}`
    : '';

  function openMenu(exerciseId?: string) {
    setMenuExerciseId(exerciseId || exercises[0]?.exercise_id || null);
    setShowMenu(true);
  }

  function closeMenu() {
    setShowMenu(false);
    setMenuExerciseId(null);
  }

  return (
    <Card done={allDone}>
      {/* Header */}
      <Pressable onPress={onToggleCollapse} style={styles.header}>
        <ExerciseImage
          name={primaryExercise?.exercise_name ?? '?'}
          imageUrl={primaryExercise?.image_url}
          size={40}
          onImageFetched={(url) => onImageFetched?.(primaryExercise?.exercise_id, url)}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.exerciseName, { color: c.text }]} numberOfLines={1}>
            {primaryExercise?.exercise_name ?? 'Exercise'}
          </Text>
          {subtitle !== '' && (
            <Text style={[styles.exerciseSub, { color: c.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.progressBadge, { color: c.textSecondary, backgroundColor: c.setBadgeBg }]}>
            {doneCount}/{totalCount}
          </Text>
          <Pressable onPress={() => openMenu()} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={c.textSecondary} />
          </Pressable>
        </View>
      </Pressable>

      {!collapsed && (
        <>
          {/* Superset header */}
          {isSuperset && <SupersetHeader exerciseCount={exercises.length} />}

          {/* Exercise sections */}
          {exercises.map((ex) => {
            const exSets = sets.filter((s: any) => s.exercise_id === ex.exercise_id);
            const lastTime = lastSets[ex.exercise_id];
            return (
              <View key={ex.exercise_id} style={styles.exerciseSection}>
                {/* Show name for superset sub-exercises */}
                {isSuperset && (
                  <View style={styles.subExHeader}>
                    <ExerciseImage
                      name={ex.exercise_name}
                      imageUrl={ex.image_url}
                      size={28}
                      onImageFetched={(url) => onImageFetched?.(ex.exercise_id, url)}
                    />
                    <Text style={[styles.subExName, { color: c.text }]}>{ex.exercise_name}</Text>
                  </View>
                )}

                {/* Last-time preview */}
                {lastTime && lastTime.length > 0 && (
                  <Text style={[styles.lastTime, { color: c.textMuted }]}>
                    Last: {lastTime.map((s: any) => `${s.weight}${unit}\u00D7${s.reps}${s.rir != null ? ` @${s.rir}` : ''}`).join(', ')}
                  </Text>
                )}

                {/* Set rows */}
                <View style={styles.setsContainer}>
                  {exSets.map((s: any, i: number) => (
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
                      onFocus={() => onSetFocus(ex.exercise_id, i)}
                      onDelete={!s.is_completed ? () => onDeleteSet(s.id) : undefined}
                      note={s.notes}
                      onNoteChange={(val) => onSetUpdate(s.id, { notes: val })}
                    />
                  ))}
                </View>

                {/* + Add Set */}
                <Pressable onPress={() => onLogSet(ex.exercise_id)} style={styles.addSetBtn}>
                  <Ionicons name="add" size={16} color={c.accent} />
                  <Text style={[styles.addSetText, { color: c.accent }]}>Add Set</Text>
                </Pressable>
              </View>
            );
          })}

          {/* Rest timer */}
          {(timer.running || timer.timeLeft !== restDuration) && timer.timeLeft > 0 && (
            <RestTimer
              timeLeft={timer.timeLeft}
              running={timer.running}
              onPauseResume={onTimerPauseResume}
              onAdjust={onTimerAdjust}
              onDismiss={onTimerReset}
            />
          )}
        </>
      )}

      {/* Actions menu */}
      <BottomSheet visible={showMenu} onClose={closeMenu} title="Actions">
        {exercises.length === 1 && (
          <SettingsRow label="Make Superset" onPress={() => { closeMenu(); onMakeSuperset(); }} />
        )}
        <SettingsRow
          label="Add Warm-up Sets"
          onPress={() => { closeMenu(); if (menuExerciseId) onAddWarmups(menuExerciseId); }}
        />
        <SettingsRow
          label="Add Drop Sets"
          onPress={() => { closeMenu(); if (menuExerciseId) onAddDropSets(menuExerciseId); }}
        />
        <SettingsRow
          label="Swap Exercise"
          onPress={() => { closeMenu(); if (menuExerciseId) onSwapExercise(menuExerciseId); }}
        />
        <View style={[styles.menuDivider, { backgroundColor: c.cardBorder }]} />
        <SettingsRow label="Move Up" onPress={() => { closeMenu(); onMoveUp(); }} />
        <SettingsRow label="Move Down" onPress={() => { closeMenu(); onMoveDown(); }} />
        <SettingsRow label="Duplicate" onPress={() => { closeMenu(); onDuplicate(); }} />
        <SettingsRow label="Remove Block" danger onPress={() => { closeMenu(); onDelete(); }} />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  exerciseSub: {
    fontSize: fontSize.small,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  exerciseSection: {
    gap: 6,
    marginTop: 4,
  },
  subExHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subExName: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  lastTime: {
    fontSize: fontSize.small,
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  setsContainer: {
    gap: 6,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  addSetText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
});
