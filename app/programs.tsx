import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Button, TextInput, Modal } from 'react-native';
import * as Crypto from 'expo-crypto';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listPrograms, createProgram, deleteProgram, setActiveProgram, addProgramDay, listProgramDays, deleteProgramDay, addProgramDayExercise, listProgramDayExercises, removeProgramDayExercise, listExercisesAvailableByEquipment, getUserUnit } from '@/lib/dao';

const SPLITS = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

export default function Programs() {
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, any[]>>({});
  const [dayExercises, setDayExercises] = useState<Record<string, any[]>>({});
  // Create program
  const [newName, setNewName] = useState('');
  // Add day
  const [addDayTo, setAddDayTo] = useState<string | null>(null);
  const [daySplit, setDaySplit] = useState('push');
  // Add exercise to day
  const [addExTo, setAddExTo] = useState<string | null>(null);
  const [exChoices, setExChoices] = useState<any[]>([]);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);
  const [targetSets, setTargetSets] = useState('3');
  const [targetReps, setTargetReps] = useState('8');
  const [targetRir, setTargetRir] = useState('2');
  const [unit, setUnit] = useState<'lb'|'kg'>('lb');

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
    const c = ctx || dbCtx;
    if (!c) return;
    const progs = await listPrograms(c);
    setPrograms(progs);
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
      setDays(prev => ({ ...prev, [programId]: d }));
      const exMap: Record<string, any[]> = {};
      for (const day of d) {
        exMap[day.id] = await listProgramDayExercises(dbCtx, day.id);
      }
      setDayExercises(prev => ({ ...prev, ...exMap }));
    }
    setExpanded(programId);
  }

  async function handleAddDay(programId: string) {
    if (!dbCtx) return;
    const existing = days[programId] ?? [];
    await addProgramDay(dbCtx, { id: Crypto.randomUUID(), program_id: programId, day_order: existing.length + 1, split: daySplit });
    const d = await listProgramDays(dbCtx, programId);
    setDays(prev => ({ ...prev, [programId]: d }));
    setAddDayTo(null);
  }

  async function handleDeleteDay(dayId: string, programId: string) {
    if (!dbCtx) return;
    await deleteProgramDay(dbCtx, dayId);
    const d = await listProgramDays(dbCtx, programId);
    setDays(prev => ({ ...prev, [programId]: d }));
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
      id: Crypto.randomUUID(),
      program_day_id: addExTo,
      exercise_id: selectedExId,
      target_sets: parseInt(targetSets) || 3,
      target_reps_min: parseInt(targetReps) || 8,
      target_reps_max: parseInt(targetReps) || 8,
      target_rir: parseFloat(targetRir) || 2,
    });
    const exs = await listProgramDayExercises(dbCtx, addExTo);
    setDayExercises(prev => ({ ...prev, [addExTo!]: exs }));
    setAddExTo(null);
  }

  async function handleRemoveExercise(id: string, dayId: string) {
    if (!dbCtx) return;
    await removeProgramDayExercise(dbCtx, id);
    const exs = await listProgramDayExercises(dbCtx, dayId);
    setDayExercises(prev => ({ ...prev, [dayId]: exs }));
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>Programs</Text>
      <Text style={styles.hint}>Create workout templates. The active program suggests your next workout day.</Text>

      {/* Create */}
      <View style={styles.createRow}>
        <TextInput placeholder='Program name...' value={newName} onChangeText={setNewName} style={styles.nameInput} />
        <Button title='Create' onPress={handleCreate} disabled={!newName.trim()} />
      </View>

      {/* Programs list */}
      {programs.map((p: any) => {
        const isExpanded = expanded === p.id;
        const programDays = days[p.id] ?? [];
        return (
          <Pressable key={p.id} onPress={() => toggleExpand(p.id)}>
            <View style={[styles.card, p.is_active && styles.cardActive]}>
              <View style={styles.cardHeader}>
                <Text style={styles.progName}>{p.name}</Text>
                <View style={styles.headerActions}>
                  {!p.is_active && <Pressable onPress={() => handleSetActive(p.id)} style={styles.activateBtn}><Text style={styles.activateBtnText}>Set Active</Text></Pressable>}
                  {p.is_active && <Text style={styles.activeBadge}>ACTIVE</Text>}
                </View>
              </View>

              {isExpanded && (
                <View style={styles.expandedSection}>
                  {programDays.map((day: any) => {
                    const exs = dayExercises[day.id] ?? [];
                    return (
                      <View key={day.id} style={styles.dayCard}>
                        <View style={[styles.cardHeader, { marginBottom: 4 }]}>
                          <Text style={styles.dayTitle}>Day {day.day_order}: {day.split.toUpperCase()}</Text>
                          <Pressable onPress={() => handleDeleteDay(day.id, p.id)}><Text style={styles.removeText}>Remove</Text></Pressable>
                        </View>
                        {exs.map((ex: any) => (
                          <View key={ex.id} style={styles.exRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.exName}>{ex.exercise_name}</Text>
                              <Text style={styles.exMeta}>{ex.target_sets}×{ex.target_reps_min} @ RIR {ex.target_rir}</Text>
                            </View>
                            <Pressable onPress={() => handleRemoveExercise(ex.id, day.id)}><Text style={styles.removeText}>×</Text></Pressable>
                          </View>
                        ))}
                        <Button title='+ Exercise' onPress={() => openAddExercise(day.id)} />
                      </View>
                    );
                  })}

                  {/* Add Day */}
                  {addDayTo === p.id ? (
                    <View style={styles.addDayRow}>
                      <View style={styles.splitChips}>
                        {SPLITS.map(s => (
                          <Pressable key={s} onPress={() => setDaySplit(s)} style={[styles.chip, daySplit === s && styles.chipSelected]}>
                            <Text style={[styles.chipText, daySplit === s && styles.chipTextSel]}>{s.toUpperCase()}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.rowBtns}>
                        <Button title='Cancel' onPress={() => setAddDayTo(null)} />
                        <Button title='Add Day' color='#059669' onPress={() => handleAddDay(p.id)} />
                      </View>
                    </View>
                  ) : (
                    <Button title='+ Add Day' onPress={() => setAddDayTo(p.id)} />
                  )}

                  <Pressable onPress={() => handleDelete(p.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>Delete Program</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.expandHint}>{isExpanded ? '▲' : `▼ ${programDays.length || '?'} days`}</Text>
            </View>
          </Pressable>
        );
      })}

      {/* Add Exercise Modal */}
      <Modal visible={!!addExTo} animationType='slide' transparent onRequestClose={() => setAddExTo(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>Add Exercise to Day</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {exChoices.map((ex: any) => {
                const selected = selectedExId === ex.id;
                return (
                  <Pressable key={ex.id} onPress={() => setSelectedExId(ex.id)} style={[styles.choiceRow, selected && styles.choiceRowSel]}>
                    <Text style={[styles.choiceText, selected && { color: '#fff' }]}>{ex.name}</Text>
                    <Text style={[styles.choiceMeta, selected && { color: '#d1fae5' }]}>{(ex.muscle_groups || '').replace(/,/g, ' · ')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.targetRow}>
              <Text>Sets</Text><TextInput value={targetSets} onChangeText={setTargetSets} keyboardType='numeric' style={styles.smallInput} />
              <Text>Reps</Text><TextInput value={targetReps} onChangeText={setTargetReps} keyboardType='numeric' style={styles.smallInput} />
              <Text>RIR</Text><TextInput value={targetRir} onChangeText={setTargetRir} keyboardType='numeric' style={styles.smallInput} />
            </View>
            <View style={styles.rowBtns}>
              <Button title='Cancel' onPress={() => setAddExTo(null)} />
              <Button title='Add' color='#059669' onPress={handleAddExercise} disabled={!selectedExId} />
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: '600' },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  createRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  nameInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 8, fontSize: 14 },
  card: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  cardActive: { borderColor: '#34d399', backgroundColor: '#f0fdf4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progName: { fontSize: 16, fontWeight: '700', color: '#111' },
  activeBadge: { fontSize: 11, fontWeight: '700', color: '#059669', backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  activateBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#e5e7eb' },
  activateBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  expandedSection: { marginTop: 10, gap: 8 },
  dayCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, gap: 4, backgroundColor: '#fff' },
  dayTitle: { fontWeight: '600', fontSize: 14, color: '#1f2937' },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 8, gap: 8 },
  exName: { fontWeight: '500', fontSize: 13, color: '#374151' },
  exMeta: { fontSize: 11, color: '#6b7280' },
  removeText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  addDayRow: { gap: 8, padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#f9fafb' },
  splitChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: '#aaa' },
  chipSelected: { backgroundColor: '#222', borderColor: '#222' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#222' },
  chipTextSel: { color: '#fff' },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  deleteBtn: { marginTop: 8, padding: 8, borderRadius: 6, backgroundColor: '#fee2e2', alignItems: 'center' },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  expandHint: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  choiceRow: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 6 },
  choiceRowSel: { backgroundColor: '#0ea5a4' },
  choiceText: { fontWeight: '500', color: '#111' },
  choiceMeta: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 6, width: 50, fontSize: 14, textAlign: 'center' },
});
