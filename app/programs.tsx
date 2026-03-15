import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listPrograms, createProgram, deleteProgram, setActiveProgram, addProgramDay, listProgramDays, deleteProgramDay, addProgramDayExercise, listProgramDayExercises, removeProgramDayExercise, listExercisesAvailableByEquipment, getUserUnit } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { PinkButton } from '@/components/PinkButton';
import { ExerciseInitial } from '@/components/ExerciseInitial';
import { BottomSheet } from '@/components/BottomSheet';
import { ActionChip } from '@/components/ActionChip';

const SPLITS = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

export default function Programs() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, any[]>>({});
  const [dayExercises, setDayExercises] = useState<Record<string, any[]>>({});
  const [newName, setNewName] = useState('');
  const [addDayTo, setAddDayTo] = useState<string | null>(null);
  const [daySplit, setDaySplit] = useState('push');
  // Add exercise
  const [addExTo, setAddExTo] = useState<string | null>(null);
  const [exChoices, setExChoices] = useState<any[]>([]);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);
  const [targetSets, setTargetSets] = useState('3');
  const [targetReps, setTargetReps] = useState('8');
  const [targetRir, setTargetRir] = useState('2');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      setUnit(await getUserUnit(ctx));
      setDbCtx(ctx);
      await refresh(ctx);
    })();
  }, []);

  async function refresh(ctx?: any) {
    const x = ctx || dbCtx;
    if (!x) return;
    setPrograms(await listPrograms(x));
  }

  async function handleCreate() {
    if (!dbCtx || !newName.trim()) return;
    await createProgram(dbCtx, { id: Crypto.randomUUID(), name: newName.trim() });
    setNewName('');
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!dbCtx) return;
    await deleteProgram(dbCtx, id);
    setExpanded(null);
    await refresh();
  }

  async function handleSetActive(id: string) {
    if (!dbCtx) return;
    await setActiveProgram(dbCtx, id);
    await refresh();
  }

  async function toggleExpand(programId: string) {
    if (expanded === programId) { setExpanded(null); return; }
    if (!days[programId] && dbCtx) {
      const d = await listProgramDays(dbCtx, programId);
      setDays((prev) => ({ ...prev, [programId]: d }));
      const exMap: Record<string, any[]> = {};
      for (const day of d) exMap[day.id] = await listProgramDayExercises(dbCtx, day.id);
      setDayExercises((prev) => ({ ...prev, ...exMap }));
    }
    setExpanded(programId);
  }

  async function handleAddDay(programId: string) {
    if (!dbCtx) return;
    const existing = days[programId] ?? [];
    await addProgramDay(dbCtx, { id: Crypto.randomUUID(), program_id: programId, day_order: existing.length + 1, split: daySplit });
    const d = await listProgramDays(dbCtx, programId);
    setDays((prev) => ({ ...prev, [programId]: d }));
    setAddDayTo(null);
  }

  async function handleDeleteDay(dayId: string, programId: string) {
    if (!dbCtx) return;
    await deleteProgramDay(dbCtx, dayId);
    const d = await listProgramDays(dbCtx, programId);
    setDays((prev) => ({ ...prev, [programId]: d }));
  }

  async function openAddExercise(dayId: string) {
    if (!dbCtx) return;
    const exs = await listExercisesAvailableByEquipment(dbCtx);
    setExChoices(exs);
    setSelectedExId(exs?.[0]?.id ?? null);
    setAddExTo(dayId);
  }

  async function handleAddExercise() {
    if (!dbCtx || !addExTo || !selectedExId) { setAddExTo(null); return; }
    await addProgramDayExercise(dbCtx, {
      id: Crypto.randomUUID(), program_day_id: addExTo, exercise_id: selectedExId,
      target_sets: parseInt(targetSets) || 3, target_reps_min: parseInt(targetReps) || 8,
      target_reps_max: parseInt(targetReps) || 8, target_rir: parseFloat(targetRir) || 2,
    });
    const exs = await listProgramDayExercises(dbCtx, addExTo);
    setDayExercises((prev) => ({ ...prev, [addExTo!]: exs }));
    setAddExTo(null);
  }

  async function handleRemoveExercise(id: string, dayId: string) {
    if (!dbCtx) return;
    await removeProgramDayExercise(dbCtx, id);
    const exs = await listProgramDayExercises(dbCtx, dayId);
    setDayExercises((prev) => ({ ...prev, [dayId]: exs }));
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.h1, { color: c.text }]}>Programs</Text>
      <Text style={[styles.hint, { color: c.textMuted }]}>
        Create workout templates. The active program suggests your next workout day.
      </Text>

      {/* Create */}
      <View style={styles.createRow}>
        <TextInput
          placeholder="Program name..."
          value={newName}
          onChangeText={setNewName}
          style={[styles.nameInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          placeholderTextColor={c.textMuted}
        />
        <PinkButton title="Create" onPress={handleCreate} disabled={!newName.trim()} />
      </View>

      {/* Programs list */}
      {programs.map((p: any) => {
        const isExpanded = expanded === p.id;
        const programDays = days[p.id] ?? [];
        return (
          <Pressable key={p.id} onPress={() => toggleExpand(p.id)}>
            <Card done={p.is_active} style={isExpanded ? { borderColor: c.accent } : undefined}>
              <View style={styles.cardHeader}>
                <Text style={[styles.progName, { color: c.text }]}>{p.name}</Text>
                <View style={styles.headerActions}>
                  {p.is_active ? (
                    <Text style={[styles.activeBadge, { color: c.green, backgroundColor: c.completedBg }]}>ACTIVE</Text>
                  ) : (
                    <ActionChip label="Set Active" onPress={() => handleSetActive(p.id)} />
                  )}
                </View>
              </View>

              {isExpanded && (
                <View style={styles.expandedSection}>
                  {programDays.map((day: any) => {
                    const exs = dayExercises[day.id] ?? [];
                    return (
                      <View key={day.id} style={[styles.dayCard, { backgroundColor: c.bg, borderColor: c.cardBorder }]}>
                        <View style={styles.dayHeader}>
                          <Text style={[styles.dayTitle, { color: c.text }]}>
                            Day {day.day_order}: {day.split.toUpperCase()}
                          </Text>
                          <Pressable onPress={() => handleDeleteDay(day.id, p.id)} hitSlop={8}>
                            <Ionicons name="close-circle-outline" size={18} color={c.danger} />
                          </Pressable>
                        </View>
                        {exs.map((ex: any) => (
                          <View key={ex.id} style={styles.exRow}>
                            <ExerciseInitial name={ex.exercise_name} size={28} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.exName, { color: c.text }]}>{ex.exercise_name}</Text>
                              <Text style={[styles.exMeta, { color: c.textSecondary }]}>
                                {ex.target_sets}{'\u00D7'}{ex.target_reps_min} @ RIR {ex.target_rir}
                              </Text>
                            </View>
                            <Pressable onPress={() => handleRemoveExercise(ex.id, day.id)} hitSlop={8}>
                              <Ionicons name="close" size={16} color={c.danger} />
                            </Pressable>
                          </View>
                        ))}
                        <Pressable onPress={() => openAddExercise(day.id)} style={styles.addExBtn}>
                          <Ionicons name="add" size={14} color={c.accent} />
                          <Text style={[styles.addExText, { color: c.accent }]}>Exercise</Text>
                        </Pressable>
                      </View>
                    );
                  })}

                  {/* Add Day */}
                  {addDayTo === p.id ? (
                    <View style={[styles.addDayCard, { backgroundColor: c.bg, borderColor: c.cardBorder }]}>
                      <View style={styles.chipsRow}>
                        {SPLITS.map((s) => (
                          <Chip key={s} label={s.toUpperCase()} selected={daySplit === s} onPress={() => setDaySplit(s)} size="sm" />
                        ))}
                      </View>
                      <View style={styles.rowBtns}>
                        <ActionChip label="Cancel" onPress={() => setAddDayTo(null)} />
                        <PinkButton title="Add Day" onPress={() => handleAddDay(p.id)} />
                      </View>
                    </View>
                  ) : (
                    <Pressable onPress={() => setAddDayTo(p.id)} style={styles.addExBtn}>
                      <Ionicons name="add" size={14} color={c.accent} />
                      <Text style={[styles.addExText, { color: c.accent }]}>Add Day</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={() => handleDelete(p.id)} style={[styles.deleteBtn, { backgroundColor: c.dangerBg }]}>
                    <Ionicons name="trash-outline" size={14} color={c.danger} />
                    <Text style={[styles.deleteBtnText, { color: c.danger }]}>Delete Program</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.expandHintRow}>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
                {!isExpanded && (
                  <Text style={[styles.expandHintText, { color: c.textMuted }]}>{programDays.length || '?'} days</Text>
                )}
              </View>
            </Card>
          </Pressable>
        );
      })}

      {/* Add Exercise BottomSheet */}
      <BottomSheet visible={!!addExTo} onClose={() => setAddExTo(null)} title="Add Exercise to Day">
        <ScrollView style={{ maxHeight: 220 }}>
          {exChoices.map((ex: any) => {
            const selected = selectedExId === ex.id;
            return (
              <Pressable
                key={ex.id}
                onPress={() => setSelectedExId(ex.id)}
                style={[styles.choiceRow, { borderColor: selected ? c.accent : c.cardBorder }, selected && { backgroundColor: c.accentLight }]}
              >
                <ExerciseInitial name={ex.name} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.choiceName, { color: selected ? c.accent : c.text }]}>{ex.name}</Text>
                  <Text style={[styles.choiceMeta, { color: c.textMuted }]}>
                    {(ex.muscle_groups || '').replace(/,/g, ' \u00B7 ').replace(/_/g, ' ')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.targetRow}>
          <View style={styles.targetGroup}>
            <Text style={[styles.targetLabel, { color: c.textSecondary }]}>Sets</Text>
            <TextInput value={targetSets} onChangeText={setTargetSets} keyboardType="numeric" style={[styles.targetInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} />
          </View>
          <View style={styles.targetGroup}>
            <Text style={[styles.targetLabel, { color: c.textSecondary }]}>Reps</Text>
            <TextInput value={targetReps} onChangeText={setTargetReps} keyboardType="numeric" style={[styles.targetInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} />
          </View>
          <View style={styles.targetGroup}>
            <Text style={[styles.targetLabel, { color: c.textSecondary }]}>RIR</Text>
            <TextInput value={targetRir} onChangeText={setTargetRir} keyboardType="numeric" style={[styles.targetInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]} />
          </View>
        </View>
        <PinkButton title="Add" onPress={handleAddExercise} disabled={!selectedExId} fullWidth />
      </BottomSheet>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: fontSize.h1, fontWeight: fontWeight.bold, marginBottom: 4 },
  hint: { fontSize: fontSize.caption, marginBottom: 12 },
  createRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: fontSize.caption },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progName: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  activeBadge: { fontSize: fontSize.tiny, fontWeight: fontWeight.bold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  expandedSection: { marginTop: 8, gap: 8 },
  dayCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { fontWeight: fontWeight.semibold, fontSize: fontSize.caption },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  exName: { fontWeight: fontWeight.medium, fontSize: fontSize.caption },
  exMeta: { fontSize: fontSize.tiny },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addExText: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  addDayCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rowBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 8, marginTop: 4 },
  deleteBtnText: { fontWeight: fontWeight.semibold, fontSize: fontSize.caption },
  expandHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
  expandHintText: { fontSize: fontSize.tiny },
  // BottomSheet content
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  choiceName: { fontWeight: fontWeight.medium, fontSize: fontSize.caption },
  choiceMeta: { fontSize: fontSize.tiny, textTransform: 'capitalize' },
  targetRow: { flexDirection: 'row', gap: 12 },
  targetGroup: { gap: 4, alignItems: 'center' },
  targetLabel: { fontSize: fontSize.tiny, textTransform: 'uppercase' },
  targetInput: { borderWidth: 1, borderRadius: 8, padding: 6, width: 55, fontSize: fontSize.caption, textAlign: 'center' },
});
