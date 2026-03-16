import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { BottomSheet } from '../BottomSheet';
import { SettingsRow } from '../SettingsRow';
import type { Recommendation } from '@/lib/dao';

type ExerciseOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;

  // Notes
  notes: string;
  onNotesChange: (notes: string) => void;

  // Actions
  onAddWarmups: () => void;

  // Units
  unit: 'lb' | 'kg';
  onUnitToggle: () => void;

  // Recommendations
  recommendation: Recommendation;
  onRecommendationChange: (rec: Recommendation) => void;

  // Remove
  onRemove: () => void;
};

const REC_OPTIONS: { value: Recommendation; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'more', label: 'More', icon: 'arrow-up-circle-outline' },
  { value: 'less', label: 'Less', icon: 'arrow-down-circle-outline' },
  { value: 'never', label: 'Never', icon: 'ban-outline' },
];

export function ExerciseOptionsSheet({
  visible, onClose, exerciseName,
  notes, onNotesChange,
  onAddWarmups,
  unit, onUnitToggle,
  recommendation, onRecommendationChange,
  onRemove,
}: ExerciseOptionsSheetProps) {
  const { c } = useTheme();
  const [localNotes, setLocalNotes] = useState(notes);

  useEffect(() => {
    if (visible) setLocalNotes(notes);
  }, [visible, notes]);

  function handleNotesBlur() {
    if (localNotes !== notes) onNotesChange(localNotes);
  }

  function handleRecToggle(rec: Recommendation) {
    onRecommendationChange(recommendation === rec ? 'normal' : rec);
  }

  return (
    <BottomSheet visible={visible} onClose={() => { handleNotesBlur(); onClose(); }} title={exerciseName}>
      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>NOTES</Text>
        <TextInput
          value={localNotes}
          onChangeText={setLocalNotes}
          onBlur={handleNotesBlur}
          placeholder="Add exercise notes..."
          placeholderTextColor={c.textMuted}
          multiline
          style={[styles.notesInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
        />
      </View>

      {/* Add Warm-up */}
      <SettingsRow
        label="Add Warm-up Sets"
        onPress={() => { onClose(); onAddWarmups(); }}
        showChevron={false}
      />

      {/* Units */}
      <View style={styles.unitRow}>
        <Text style={[styles.unitLabel, { color: c.text }]}>Units</Text>
        <View style={[styles.segmented, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}>
          <Pressable
            onPress={unit === 'kg' ? onUnitToggle : undefined}
            style={[styles.segBtn, unit === 'lb' && { backgroundColor: c.accent }]}
          >
            <Text style={[styles.segText, { color: unit === 'lb' ? c.textOnAccent : c.textSecondary }]}>lb</Text>
          </Pressable>
          <Pressable
            onPress={unit === 'lb' ? onUnitToggle : undefined}
            style={[styles.segBtn, unit === 'kg' && { backgroundColor: c.accent }]}
          >
            <Text style={[styles.segText, { color: unit === 'kg' ? c.textOnAccent : c.textSecondary }]}>kg</Text>
          </Pressable>
        </View>
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>RECOMMEND</Text>
        <View style={styles.recRow}>
          {REC_OPTIONS.map((opt) => {
            const active = recommendation === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleRecToggle(opt.value)}
                style={[
                  styles.recChip,
                  { borderColor: active ? c.accent : c.chipBorder, backgroundColor: active ? c.accent : c.chipBg },
                ]}
              >
                <Ionicons name={opt.icon} size={16} color={active ? c.textOnAccent : c.textSecondary} />
                <Text style={[styles.recLabel, { color: active ? c.textOnAccent : c.text }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: c.cardBorder }]} />

      {/* Remove from workout */}
      <SettingsRow
        label="Remove from Workout"
        danger
        onPress={() => { onClose(); onRemove(); }}
        showChevron={false}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    fontSize: fontSize.caption,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unitLabel: {
    fontSize: fontSize.body,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  segText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  recRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  recChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  recLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});
