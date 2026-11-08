import React from 'react';
import { View, Text, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { PinkButton } from '../PinkButton';
import { ActionChip } from '../ActionChip';
import { splitLabel, type WorkoutSummary } from '@/lib/workoutSummary';
import { formatClock } from '@/lib/cardio';

type WorkoutSummaryModalProps = {
  summary: WorkoutSummary | null;
  unit: 'lb' | 'kg';
  onShare: () => void;
  onDone: () => void;
};

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function WorkoutSummaryModal({ summary, unit, onShare, onDone }: WorkoutSummaryModalProps) {
  const { c } = useTheme();
  if (!summary) return null;

  const date = new Date(summary.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const stats: { value: string; label: string }[] = [
    { value: formatDuration(summary.durationSec), label: 'Duration' },
    { value: summary.calories != null ? `~${summary.calories}` : '--', label: 'Calories (est.)' },
    { value: summary.volume.toLocaleString(), label: `Volume (${unit})` },
    { value: String(summary.workingSets), label: 'Sets' },
    summary.cardioSec > 0
      ? { value: formatClock(summary.cardioSec), label: 'Cardio' }
      : { value: String(summary.reps), label: 'Reps' },
    { value: String(summary.exercises), label: 'Exercises' },
  ];
  const topPct = summary.muscles[0]?.percentage ?? 100;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onDone}>
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: c.text }]}>Workout Complete</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {splitLabel(summary.split)} · {date}
          </Text>

          <View style={styles.grid}>
            {stats.map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                <Text style={[styles.statValue, { color: c.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          {summary.calories == null && (
            <Text style={[styles.hint, { color: c.textMuted }]}>
              Log your body weight when finishing to estimate calories.
            </Text>
          )}

          {summary.muscles.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Muscles Worked</Text>
              {summary.muscles.map((m) => (
                <View key={m.muscle} style={styles.muscleRow}>
                  <Text style={[styles.muscleName, { color: c.textSecondary }]}>{m.muscle}</Text>
                  <View style={[styles.barTrack, { backgroundColor: c.card }]}>
                    <View style={[styles.barFill, { backgroundColor: c.accent, width: `${Math.max(4, (m.percentage / topPct) * 100)}%` }]} />
                  </View>
                  <Text style={[styles.musclePct, { color: c.text }]}>{m.percentage}%</Text>
                </View>
              ))}
            </View>
          )}

          {summary.lines.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Exercises</Text>
              {summary.lines.map((l) => (
                <View key={l.exerciseId} style={[styles.exRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.exName, { color: c.text }]} numberOfLines={1}>{l.name}</Text>
                  <Text style={[styles.exDetail, { color: c.textSecondary }]}>
                    {l.cardio
                      ? [formatClock(l.cardio.durationSec), l.cardio.level != null ? `Level ${l.cardio.level}` : null, l.cardio.calories != null ? `${l.cardio.calories} cal` : null].filter(Boolean).join(' · ')
                      : `${l.sets} ${l.sets === 1 ? 'set' : 'sets'} · best ${l.bestWeight > 0 ? `${l.bestWeight} ${unit} × ` : ''}${l.bestReps}`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.actions, { borderTopColor: c.cardBorder }]}>
          <ActionChip icon="share-outline" label="Share" onPress={onShare} />
          <View style={{ flex: 1 }}>
            <PinkButton title="Done" onPress={onDone} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  title: { fontSize: fontSize.h1, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.body, marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  statCard: { width: '31%', flexGrow: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: fontSize.h2, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.tiny, textTransform: 'uppercase' },
  hint: { fontSize: fontSize.small },
  section: { marginTop: 12, gap: 8 },
  sectionTitle: { fontSize: fontSize.h3, fontWeight: fontWeight.bold },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muscleName: { width: 100, fontSize: fontSize.caption },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  musclePct: { width: 40, textAlign: 'right', fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  exRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  exName: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  exDetail: { fontSize: fontSize.caption },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
});
