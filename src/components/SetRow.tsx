import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type SetRowProps = {
  index: number;
  reps: number | null;
  weight: number | null;
  unit: 'lb' | 'kg';
  completed?: boolean;
  isWarmup?: boolean;
  isBest?: boolean;
  onRepsChange: (val: number | null) => void;
  onWeightChange: (val: number | null) => void;
  onFocus?: () => void;
  onDelete?: () => void;
  note?: string | null;
  onNoteChange?: (val: string | null) => void;
};

export function SetRow({
  index, reps, weight, unit, completed, isWarmup, isBest,
  onRepsChange, onWeightChange, onFocus, onDelete, note, onNoteChange,
}: SetRowProps) {
  const { c } = useTheme();

  const badgeColor = completed ? c.green : isBest ? c.gold : c.setBadgeBg;
  const badgeTextColor = completed ? c.textOnAccent : isBest ? c.goldText : c.textSecondary;
  const inputTextColor = completed ? c.green : c.text;
  const inputBorderColor = completed ? c.completedBorder : c.inputBorder;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          {completed ? (
            <Ionicons name="checkmark" size={14} color={c.textOnAccent} />
          ) : (
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>
              {isWarmup ? 'W' : index}
            </Text>
          )}
        </View>

        {/* Reps input */}
        <View style={[styles.inputCell, { borderColor: inputBorderColor, backgroundColor: c.inputBg }]}>
          <Text style={[styles.inputLabel, { color: c.textMuted }]}>Reps</Text>
          <TextInput
            defaultValue={reps != null ? String(reps) : ''}
            keyboardType="numeric"
            returnKeyType="next"
            onFocus={onFocus}
            onEndEditing={(e) => {
              const v = parseInt(e.nativeEvent.text || '');
              onRepsChange(isNaN(v) ? null : v);
            }}
            style={[styles.input, { color: inputTextColor }]}
            placeholderTextColor={c.textMuted}
          />
        </View>

        {/* Weight input */}
        <View style={[styles.inputCell, { borderColor: inputBorderColor, backgroundColor: c.inputBg }]}>
          <Text style={[styles.inputLabel, { color: c.textMuted }]}>Weight ({unit})</Text>
          <TextInput
            defaultValue={weight != null ? String(weight) : ''}
            keyboardType="numeric"
            returnKeyType="done"
            onFocus={onFocus}
            onEndEditing={(e) => {
              const v = parseFloat(e.nativeEvent.text || '');
              onWeightChange(isNaN(v) ? null : v);
            }}
            style={[styles.input, { color: inputTextColor }]}
            placeholderTextColor={c.textMuted}
          />
        </View>

        {/* Delete button */}
        {onDelete && !completed && (
          <Pressable onPress={onDelete} hitSlop={6} style={[styles.deleteBtn, { backgroundColor: c.dangerBg }]}>
            <Ionicons name="close" size={14} color={c.danger} />
          </Pressable>
        )}
      </View>

      {/* Note input */}
      {onNoteChange && (
        <TextInput
          placeholder="note..."
          defaultValue={note || ''}
          onEndEditing={(e) => onNoteChange(e.nativeEvent.text?.trim() || null)}
          style={[styles.noteInput, { color: c.textMuted }]}
          placeholderTextColor={c.textMuted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  inputCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  inputLabel: {
    fontSize: fontSize.tiny,
  },
  input: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    paddingVertical: 2,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    fontSize: fontSize.tiny,
    paddingVertical: 1,
    paddingHorizontal: 36, // align with inputs (badge width + gap)
    fontStyle: 'italic',
    minHeight: 18,
  },
});
