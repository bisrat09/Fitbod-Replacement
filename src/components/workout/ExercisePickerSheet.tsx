import React from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { BottomSheet } from '../BottomSheet';
import { Chip } from '../Chip';
import { PinkButton } from '../PinkButton';
import { ExerciseInitial } from '../ExerciseInitial';

const MUSCLE_FILTERS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

type ExercisePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  exercises: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  muscleFilter: string | null;
  onMuscleFilterChange: (val: string | null) => void;
};

function matchesMuscleFilter(mg: string, filter: string): boolean {
  const groups = (mg || '').toLowerCase();
  const map: Record<string, string[]> = {
    chest: ['chest', 'upper_chest'],
    back: ['lats', 'upper_back', 'lower_back', 'rear_delts'],
    legs: ['quads', 'glutes', 'hamstrings', 'calves'],
    shoulders: ['delts', 'front_delts', 'rear_delts'],
    arms: ['biceps', 'triceps'],
    core: ['core', 'abs'],
  };
  return (map[filter] ?? []).some((m) => groups.includes(m));
}

export function ExercisePickerSheet({
  visible, onClose, title, confirmLabel,
  exercises, selectedId, onSelect, onConfirm,
  search, onSearchChange, muscleFilter, onMuscleFilterChange,
}: ExercisePickerSheetProps) {
  const { c } = useTheme();

  let filtered = exercises;
  if (search) filtered = filtered.filter((ex: any) => ex.name.toLowerCase().includes(search.toLowerCase()));
  if (muscleFilter) filtered = filtered.filter((ex: any) => matchesMuscleFilter(ex.muscle_groups, muscleFilter));

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {/* Search */}
      <TextInput
        placeholder="Search exercises..."
        value={search}
        onChangeText={onSearchChange}
        style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
        placeholderTextColor={c.textMuted}
      />

      {/* Muscle filter chips */}
      <View style={styles.chipsRow}>
        {MUSCLE_FILTERS.map((mf) => (
          <Chip
            key={mf}
            label={mf}
            selected={muscleFilter === mf}
            onPress={() => onMuscleFilterChange(muscleFilter === mf ? null : mf)}
            size="sm"
          />
        ))}
      </View>

      {/* Exercise list */}
      <ScrollView style={styles.list}>
        {filtered.map((ex: any) => {
          const selected = selectedId === ex.id;
          return (
            <Pressable
              key={ex.id}
              onPress={() => onSelect(ex.id)}
              style={[
                styles.exerciseRow,
                { borderColor: selected ? c.accent : c.cardBorder },
                selected && { backgroundColor: c.accentLight },
              ]}
            >
              <ExerciseInitial name={ex.name} size={36} />
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: selected ? c.accent : c.text }]}>
                  {ex.name}
                </Text>
                <Text style={[styles.muscleTag, { color: c.textMuted }]}>
                  {(ex.muscle_groups || '').replace(/,/g, ' \u00B7 ').replace(/_/g, ' ')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Confirm button */}
      <PinkButton title={confirmLabel} onPress={onConfirm} disabled={!selectedId} fullWidth />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: fontSize.body,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  list: {
    maxHeight: 280,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  muscleTag: {
    fontSize: fontSize.tiny,
    textTransform: 'capitalize',
  },
});
