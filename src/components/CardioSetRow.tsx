import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { formatClock, parseClock } from '@/lib/cardio';

type CardioSetRowProps = {
  index: number;
  durationSec: number | null;
  level: number | null;
  calories: number | null;
  completed?: boolean;
  /** Live stopwatch seconds while running, else null. */
  liveSec: number | null;
  onToggleClock: () => void;
  onDurationChange: (sec: number | null) => void;
  onLevelChange: (val: number | null) => void;
  onCaloriesChange: (val: number | null) => void;
  onFocus?: () => void;
  onDelete?: () => void;
};

/** Cardio set: stopwatch + time, machine level and calories. */
export function CardioSetRow({
  index, durationSec, level, calories, completed, liveSec,
  onToggleClock, onDurationChange, onLevelChange, onCaloriesChange, onFocus, onDelete,
}: CardioSetRowProps) {
  const { c } = useTheme();
  const running = liveSec != null;
  const textColor = completed ? c.green : c.text;
  const border = completed ? c.completedBorder : c.inputBorder;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: completed ? c.green : c.setBadgeBg }]}>
          {completed
            ? <Ionicons name="checkmark" size={14} color={c.textOnAccent} />
            : <Text style={[styles.badgeText, { color: c.textSecondary }]}>{index}</Text>}
        </View>

        <View style={[styles.cell, styles.timeCell, { borderColor: running ? c.accent : border, backgroundColor: c.inputBg }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Time</Text>
          {running ? (
            <Text style={[styles.input, { color: c.accent }]}>{formatClock(liveSec)}</Text>
          ) : (
            <TextInput
              key={`t-${durationSec ?? ''}`}
              defaultValue={durationSec ? formatClock(durationSec) : ''}
              placeholder="0:00"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              editable={!completed}
              onFocus={onFocus}
              onEndEditing={(e) => onDurationChange(parseClock(e.nativeEvent.text || ''))}
              style={[styles.input, { color: textColor }]}
              placeholderTextColor={c.textMuted}
            />
          )}
        </View>

        <View style={[styles.cell, { borderColor: border, backgroundColor: c.inputBg }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Level</Text>
          <TextInput
            key={`l-${level ?? ''}`}
            defaultValue={level != null ? String(level) : ''}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onFocus={onFocus}
            onEndEditing={(e) => { const v = parseFloat(e.nativeEvent.text || ''); onLevelChange(isNaN(v) ? null : v); }}
            style={[styles.input, { color: textColor }]}
            placeholderTextColor={c.textMuted}
          />
        </View>

        <View style={[styles.cell, { borderColor: border, backgroundColor: c.inputBg }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Calories</Text>
          <TextInput
            key={`c-${calories ?? ''}`}
            defaultValue={calories != null ? String(calories) : ''}
            placeholder="auto"
            keyboardType="number-pad"
            returnKeyType="done"
            onFocus={onFocus}
            onEndEditing={(e) => { const v = parseInt(e.nativeEvent.text || '', 10); onCaloriesChange(isNaN(v) ? null : v); }}
            style={[styles.input, { color: textColor }]}
            placeholderTextColor={c.textMuted}
          />
        </View>

        {onDelete && !completed && !running && (
          <Pressable onPress={onDelete} hitSlop={6} style={[styles.iconBtn, { backgroundColor: c.dangerBg }]}>
            <Ionicons name="close" size={14} color={c.danger} />
          </Pressable>
        )}
      </View>

      {!completed && (
        <Pressable onPress={onToggleClock} style={[styles.clockBtn, { borderColor: c.accent }]}>
          <Ionicons name={running ? 'stop' : 'play'} size={14} color={c.accent} />
          <Text style={[styles.clockText, { color: c.accent }]}>
            {running ? 'Stop timer' : durationSec ? 'Resume timer' : 'Start timer'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: fontSize.small, fontWeight: fontWeight.bold },
  cell: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  timeCell: { flex: 1.3 },
  label: { fontSize: fontSize.tiny },
  input: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, paddingVertical: 2 },
  iconBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  clockBtn: {
    marginLeft: 36, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  clockText: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
});
