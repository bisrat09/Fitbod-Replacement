import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';
import { parseGoalPct } from '@/lib/bodyComposition';
import type { BodyFatGoalState } from '@/lib/healthKit';

type Props = {
  /** Null while loading. */
  state: BodyFatGoalState | null;
  unit: 'lb' | 'kg';
  onSaveGoal: (pct: number) => void;
};

const fmt = (n: number) => String(Math.round(n * 10) / 10);

function trendText(weeklyChange: number | null, weeksToGoal: number | null, goalPct: number, reached: boolean): string {
  if (weeklyChange == null) return 'Trend shows after about 2 weeks of readings';
  if (Math.abs(weeklyChange) < 0.05) return 'Holding steady over the last 4 weeks';
  const rate = `${fmt(Math.abs(weeklyChange))} points per week`;
  if (weeklyChange > 0) return `Up ${rate} over the last 4 weeks`;
  if (reached || weeksToGoal == null) return `Down ${rate}`;
  return `Down ${rate}, about ${weeksToGoal} ${weeksToGoal === 1 ? 'week' : 'weeks'} to ${fmt(goalPct)}%`;
}

/** Body fat goal tracker for the Progress tab. Renders nothing where Apple Health does not exist. */
export function BodyFatGoalCard({ state, unit, onSaveGoal }: Props) {
  const { c } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (!state || state.status === 'unavailable') return null;

  const parsed = parseGoalPct(draft);
  const save = () => {
    if (parsed == null) return;
    onSaveGoal(parsed);
    setEditing(false);
  };

  const goal = state.status === 'ok' ? state.goal : null;

  return (
    <Card>
      <View style={styles.header}>
        <Text style={[styles.label, { color: c.textMuted }]}>BODY FAT GOAL</Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType="decimal-pad"
              autoFocus
              placeholder={fmt(state.goalPct)}
              placeholderTextColor={c.textMuted}
              onSubmitEditing={save}
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            />
            <Text style={{ color: c.textSecondary }}>%</Text>
            <Pressable onPress={save} disabled={parsed == null} hitSlop={8}>
              <Text style={[styles.action, { color: parsed == null ? c.textMuted : c.accent }]}>Save</Text>
            </Pressable>
            <Pressable onPress={() => setEditing(false)} hitSlop={8}>
              <Text style={[styles.action, { color: c.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => { setDraft(fmt(state.goalPct)); setEditing(true); }}
            hitSlop={8}
            style={styles.editRow}
            accessibilityLabel="Change body fat goal"
          >
            <Text style={[styles.action, { color: c.textSecondary }]}>Goal {fmt(state.goalPct)}%</Text>
            <Ionicons name="pencil" size={12} color={c.textSecondary} />
          </Pressable>
        )}
      </View>

      {state.status === 'off' && (
        <Text style={[styles.note, { color: c.textSecondary }]}>
          Turn on Sync from Apple Health in Settings to track your body fat here.
        </Text>
      )}

      {state.status === 'empty' && (
        <Text style={[styles.note, { color: c.textSecondary }]}>
          No body fat readings in Apple Health yet. Weigh in on your scale, open its app so it syncs to Health,
          and allow Body Fat Percentage for Fitlog in Health {'>'} Sharing {'>'} Apps.
        </Text>
      )}

      {goal && (
        <>
          <View style={styles.bigRow}>
            <Text style={[styles.big, { color: c.text }]}>{fmt(goal.bodyFat)}%</Text>
            {goal.reached ? (
              <Text style={[styles.target, { color: c.green }]}>Goal reached</Text>
            ) : (
              <>
                <Ionicons name="arrow-forward" size={18} color={c.textMuted} />
                <Text style={[styles.target, { color: c.gold }]}>{fmt(goal.goalPct)}%</Text>
              </>
            )}
          </View>

          {goal.progress != null && (
            <View style={[styles.track, { backgroundColor: c.cardBorder }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: goal.reached ? c.green : c.accent, width: `${Math.round(goal.progress * 100)}%` },
                ]}
              />
            </View>
          )}

          <Text style={[styles.caption, { color: c.textMuted }]}>
            {goal.stale
              ? 'Latest reading, nothing in the last 7 days'
              : `7-day average from ${goal.days} ${goal.days === 1 ? 'day' : 'days'} of readings`}
          </Text>

          {goal.mass ? (
            <View style={[styles.stats, { borderTopColor: c.cardBorder }]}>
              <Stat label="Weight" value={`${fmt(goal.mass.weight)} ${unit}`} />
              <Stat label="Lean mass" value={`${fmt(goal.mass.leanMass)} ${unit}`} />
              <Stat label={`Weight at ${fmt(goal.goalPct)}%`} value={`${fmt(goal.mass.goalWeight)} ${unit}`} />
              <Stat label="Fat to lose" value={`${fmt(goal.mass.toLose)} ${unit}`} highlight={!goal.reached} />
            </View>
          ) : (
            <Text style={[styles.caption, { color: c.textMuted }]}>
              Add a body weight to see lean mass and your goal weight.
            </Text>
          )}

          <Text style={[styles.trend, { color: c.textSecondary }]}>
            {trendText(goal.weeklyChange, goal.weeksToGoal, goal.goalPct, goal.reached)}
          </Text>
          {goal.mass && !goal.reached && (
            <Text style={[styles.caption, { color: c.textMuted }]}>
              Goal weight assumes you keep all your lean mass.
            </Text>
          )}
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: highlight ? c.accent : c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  label: { fontSize: fontSize.tiny, letterSpacing: 0.5, fontWeight: fontWeight.semibold },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  input: { borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, width: 60, fontSize: fontSize.caption, textAlign: 'center' },
  note: { fontSize: fontSize.caption, marginTop: 6, lineHeight: 20 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  big: { fontSize: fontSize.h1, fontWeight: fontWeight.bold },
  target: { fontSize: fontSize.h2, fontWeight: fontWeight.bold },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  fill: { height: 8, borderRadius: 4 },
  caption: { fontSize: fontSize.small, marginTop: 6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, marginTop: 10, paddingTop: 8 },
  stat: { width: '50%', paddingVertical: 4 },
  statLabel: { fontSize: fontSize.tiny, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: fontSize.h3, fontWeight: fontWeight.bold },
  trend: { fontSize: fontSize.caption, marginTop: 8 },
});
