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
        <Text style={[styles.label, { color: c.textSecondary }]}>Rest</Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={20} color={c.textSecondary} />
        </Pressable>
      </View>

      <Text style={[styles.time, { color: urgent ? c.danger : c.text }]}>
        {formatTime(timeLeft)}
      </Text>

      <View style={styles.controls}>
        <Pressable onPress={() => onAdjust(-10)} style={[styles.adjustBtn, { backgroundColor: c.chipBg }]}>
          <Text style={[styles.adjustText, { color: c.text }]}>-10s</Text>
        </Pressable>

        <Pressable onPress={onPauseResume} style={[styles.playBtn, { backgroundColor: c.accent }]}>
          <Ionicons name={running ? 'pause' : 'play'} size={24} color={c.textOnAccent} />
        </Pressable>

        <Pressable onPress={() => onAdjust(10)} style={[styles.adjustBtn, { backgroundColor: c.chipBg }]}>
          <Text style={[styles.adjustText, { color: c.text }]}>+10s</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
