import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { BottomSheet } from '../BottomSheet';
import { PinkButton } from '../PinkButton';
import { ActionChip } from '../ActionChip';

type FinishSheetProps = {
  visible: boolean;
  onClose: () => void;
  // Summary data
  exerciseCount: number;
  sets: any[];
  elapsed: number;
  unit: 'lb' | 'kg';
  weeklyVolume: Record<string, number>;
  workoutNotes: string;
  // Form state
  bwInput: string;
  onBwChange: (val: string) => void;
  templateName: string;
  onTemplateNameChange: (val: string) => void;
  templateSaved: boolean;
  onSaveTemplate: () => void;
  // Actions
  onShare: () => void;
  onConfirm: () => void;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FinishSheet({
  visible, onClose,
  exerciseCount, sets, elapsed, unit, weeklyVolume, workoutNotes,
  bwInput, onBwChange, templateName, onTemplateNameChange, templateSaved, onSaveTemplate,
  onShare, onConfirm,
}: FinishSheetProps) {
  const { c } = useTheme();

  const completedSets = sets.filter((s: any) => s.is_completed && !s.is_warmup);
  const totalVol = completedSets.reduce((sum: number, s: any) => sum + ((s.weight || 0) * (s.reps || 0)), 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Workout Complete!">
      {/* Summary stats */}
      <View style={[styles.statsCard, { backgroundColor: c.chipBg }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.text }]}>{exerciseCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Exercises</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.text }]}>{completedSets.length}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Sets</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.text }]}>{Math.round(totalVol).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Volume ({unit})</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: c.text }]}>{formatTime(elapsed)}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Duration</Text>
          </View>
        </View>
      </View>

      {/* Weekly volume */}
      {Object.keys(weeklyVolume).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Weekly Volume (hard sets)</Text>
          {Object.entries(weeklyVolume)
            .sort((a, b) => b[1] - a[1])
            .map(([mg, count]) => (
              <View key={mg} style={styles.volumeRow}>
                <Text style={[styles.volumeLabel, { color: c.textSecondary }]}>
                  {mg.replace(/_/g, ' ')}
                </Text>
                <View style={[styles.volumeBar, { backgroundColor: c.accent, width: Math.min(count * 12, 160) }]} />
                <Text style={[styles.volumeCount, { color: c.text }]}>{count}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Notes */}
      {workoutNotes.trim() !== '' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Notes</Text>
          <Text style={[styles.notesText, { color: c.textSecondary }]}>{workoutNotes}</Text>
        </View>
      )}

      {/* Body weight */}
      <View style={styles.section}>
        <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Log body weight (optional)</Text>
        <TextInput
          placeholder={`Body weight (${unit})`}
          value={bwInput}
          onChangeText={onBwChange}
          keyboardType="numeric"
          style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Save as template */}
      <View style={styles.section}>
        {!templateSaved ? (
          <View style={styles.templateRow}>
            <TextInput
              placeholder="Template name..."
              value={templateName}
              onChangeText={onTemplateNameChange}
              style={[styles.input, styles.templateInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
            <ActionChip
              icon="bookmark-outline"
              label="Save"
              onPress={onSaveTemplate}
            />
          </View>
        ) : (
          <Text style={[styles.savedText, { color: c.green }]}>Template saved!</Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <ActionChip icon="share-outline" label="Share" onPress={onShare} />
        <View style={{ flex: 1 }}>
          <PinkButton title="Done" onPress={onConfirm} fullWidth />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: 10,
    padding: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.tiny,
    textTransform: 'uppercase',
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  volumeLabel: {
    fontSize: fontSize.small,
    width: 90,
    textTransform: 'capitalize',
  },
  volumeBar: {
    height: 10,
    borderRadius: 4,
  },
  volumeCount: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  notesText: {
    fontSize: fontSize.caption,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: fontSize.small,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: fontSize.caption,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateInput: {
    flex: 1,
  },
  savedText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
});
