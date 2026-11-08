import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { recoveringMuscles, FRESH_THRESHOLD, type RecoveryMap } from '@/lib/muscleRecovery';

function label(m: string): string {
  return m.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Fitbod-style recovery row: which muscles are still recovering and by how much. */
export function MuscleRecovery({ recovery }: { recovery: RecoveryMap }) {
  const { c } = useTheme();
  const tired = recoveringMuscles(recovery);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: c.text }]}>Muscle Recovery</Text>
      {tired.length === 0 ? (
        <Text style={[styles.note, { color: c.textSecondary }]}>All muscles fully recovered</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {tired.map((t) => {
            const color = t.percentage / 100 < FRESH_THRESHOLD ? c.accent : c.green;
            return (
              <View key={t.muscle} style={styles.badge}>
                <Text style={[styles.muscleName, { color: c.text }]}>{label(t.muscle)}</Text>
                <View style={[styles.track, { backgroundColor: c.card }]}>
                  <View style={[styles.fill, { backgroundColor: color, width: `${Math.max(4, t.percentage)}%` }]} />
                </View>
                <Text style={[styles.pct, { color: c.textSecondary }]}>{t.percentage}%</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
      <Text style={[styles.note, { color: c.textMuted }]}>Today's split is the one with the freshest muscles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20, gap: 8 },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.bold, marginBottom: 4 },
  scroll: { gap: 16, paddingRight: 16 },
  badge: { alignItems: 'center', gap: 4, width: 72 },
  muscleName: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  track: { width: 64, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  pct: { fontSize: fontSize.tiny, fontWeight: fontWeight.bold },
  note: { fontSize: fontSize.small },
});
