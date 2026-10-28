import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type RestTimerProps = {
  timeLeft: number;
  running: boolean;
  onPauseResume: () => void;
  onAdjust: (delta: number) => void;
  onDismiss: () => void;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimer({ timeLeft, running, onPauseResume, onAdjust, onDismiss }: RestTimerProps) {
  const { c } = useTheme();
  const urgent = timeLeft <= 3 && timeLeft > 0;

  return (
    <View style={[styles.container, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.header}>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={20} color={c.textSecondary} />
        </Pressable>
        <Text style={[styles.label, { color: c.textSecondary }]}>Rest Period</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.time, { color: urgent ? c.danger : c.text }]}>
          {formatTime(timeLeft)}
        </Text>

        <View style={styles.adjustStack}>
          <Pressable onPress={() => onAdjust(10)} style={[styles.adjustBtn, { backgroundColor: c.chipBg }]}>
            <Text style={[styles.adjustText, { color: c.text }]}>+10s</Text>
          </Pressable>
          <Pressable onPress={() => onAdjust(-10)} style={[styles.adjustBtn, { backgroundColor: c.chipBg }]}>
            <Text style={[styles.adjustText, { color: c.text }]}>-10s</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={onPauseResume} style={[styles.pauseBar, { backgroundColor: c.accent }]}>
        <Ionicons name={running ? 'pause' : 'play'} size={22} color={c.textOnAccent} />
        <Text style={[styles.pauseBarText, { color: c.textOnAccent }]}>
          {running ? 'Pause' : 'Resume'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  adjustStack: {
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  adjustText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  pauseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  pauseBarText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
