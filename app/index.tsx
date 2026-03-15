import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Share, Vibration } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import {
  ensureUser, createWorkout, addSet, listWorkoutSets, createExercise,
  listBlocksWithExercises, createBlock, addBlockExercise,
  listExercisesAvailableByEquipment, getExercise, findExerciseByName,
  getNextSetIndex, updateSet, listBlockExercisesWithNames,
  listFavoriteExerciseIds, lastWorkingSetsForExercise, upsertMetric,
  getBestMetric, replaceBlockExercise, getUserUnit, computeWeeklyVolume,
  upsertWeeklyVolume, exerciseRecency, deleteSet, deleteBlock,
  swapBlockOrder, latestExerciseTopSet, getSetting, setSetting,
  deleteSetting, getActiveProgram, getNextProgramDay,
  listProgramDayExercises, updateWorkoutNotes, getWorkoutStreak,
  getWorkoutsThisWeek, duplicateBlock, saveWorkoutAsTemplate,
  logBodyWeight, getBestSetsInWorkout, getMostRecentWorkoutId,
  repeatWorkout, listWorkoutDetail, updateWorkoutDuration,
} from '@/lib/dao';
import * as Crypto from 'expo-crypto';
import { suggestNextWeight, epley1RM, formatWorkoutSummary, roundToIncrement, generateWarmupWeights } from '@/lib/progression';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight as fw } from '@/theme/typography';
import { Chip } from '@/components/Chip';
import { PinkButton } from '@/components/PinkButton';
import { ActionChip } from '@/components/ActionChip';
import { WorkoutHeader, BlockCard, ExercisePickerSheet, FinishSheet, PlateCalcSheet, StickyBar } from '@/components/workout';

// ── Picker state (unified add / superset / swap) ──
type PickerState = {
  mode: 'add' | 'superset' | 'swap';
  blockId?: string;
  oldExerciseId?: string;
} | null;

export default function Today() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);

  // ── Workout state ──
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sets, setSets] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [blockExercises, setBlockExercises] = useState<Record<string, any[]>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeRowByBlock, setActiveRowByBlock] = useState<Record<string, { exerciseId: string; row: number }>>({});
  const [lastSets, setLastSets] = useState<Record<string, any[]>>({});
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  // ── Global inputs ──
  const [weight, setWeight] = useState('185');
  const [reps, setReps] = useState('5');
  const [rir, setRir] = useState('2');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');

  // ── Rest timer ──
  const REST_OPTIONS = [60, 90, 120, 180];
  const [restDuration, setRestDuration] = useState(120);
  const [timers, setTimers] = useState<Record<string, { timeLeft: number; running: boolean }>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timer>>({});

  // ── Split & program ──
  const SPLIT_OPTIONS = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];
  const [split, setSplit] = useState('push');
  const [suggestedDay, setSuggestedDay] = useState<any>(null);
  const [programName, setProgramName] = useState<string | null>(null);

  // ── PR banner ──
  const [prBanner, setPrBanner] = useState<{ exerciseName: string; est1rm: number } | null>(null);
  const prBannerTimer = useRef<NodeJS.Timer | null>(null);

  // ── Picker (unified) ──
  const [picker, setPicker] = useState<PickerState>(null);
  const [pickerChoices, setPickerChoices] = useState<any[]>([]);
  const [pickerSelectedId, setPickerSelectedId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

  // ── Finish modal ──
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [weeklyVolume, setWeeklyVolume] = useState<Record<string, number>>({});
  const [finishBwInput, setFinishBwInput] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const [bestSetIds, setBestSetIds] = useState<Set<string>>(new Set());

  // ── Plate calculator ──
  const [showPlateCalc, setShowPlateCalc] = useState(false);

  // ── Stats ──
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);

  // ── Workout notes ──
  const [workoutNotes, setWorkoutNotes] = useState('');

  // ═══════════════════════════════════════════════
  // ── Bootstrap ──
  // ═══════════════════════════════════════════════

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });

      // Seed demo exercises
      const seed = [
        { name: 'Barbell Bench Press', req: 'barbell,bench', mg: 'chest,triceps,front_delts' },
        { name: 'Dumbbell Bench Press', req: 'dumbbells,bench', mg: 'chest,triceps,front_delts' },
        { name: 'Back Squat', req: 'barbell,rack', mg: 'quads,glutes,hamstrings' },
        { name: 'Pull-up', req: 'pullup_bar', mg: 'lats,biceps,upper_back' },
        { name: 'Cable Row', req: 'cable', mg: 'lats,upper_back,biceps' },
        { name: 'Overhead Press', req: 'barbell,rack', mg: 'delts,triceps,upper_chest' },
        { name: 'Deadlift', req: 'barbell', mg: 'hamstrings,glutes,lower_back,upper_back' },
        { name: 'Romanian Deadlift', req: 'barbell', mg: 'hamstrings,glutes,lower_back' },
        { name: 'Lat Pulldown', req: 'cable', mg: 'lats,biceps,upper_back' },
        { name: 'Lateral Raise', req: 'dumbbells', mg: 'delts' },
        { name: 'Barbell Curl', req: 'barbell', mg: 'biceps' },
        { name: 'Tricep Pushdown', req: 'cable', mg: 'triceps' },
        { name: 'Leg Press', req: 'rack', mg: 'quads,glutes' },
        { name: 'Leg Curl', req: 'cable', mg: 'hamstrings' },
        { name: 'Face Pull', req: 'cable', mg: 'rear_delts,upper_back' },
        { name: 'Dips', req: '', mg: 'chest,triceps,front_delts' },
        { name: 'Incline Dumbbell Press', req: 'dumbbells,bench', mg: 'upper_chest,triceps,front_delts' },
        { name: 'Barbell Row', req: 'barbell', mg: 'upper_back,lats,biceps' },
        { name: 'Front Squat', req: 'barbell,rack', mg: 'quads,glutes,core' },
        { name: 'Hip Thrust', req: 'barbell,bench', mg: 'glutes,hamstrings' },
      ];
      for (const s of seed) {
        const existing = await findExerciseByName(ctx, s.name);
        if (existing) continue;
        await createExercise(ctx, {
          id: Crypto.randomUUID(), name: s.name, muscle_groups: s.mg,
          is_compound: 1, required_equipment: s.req, tags: 'primary', default_increment: 2.5,
        });
      }

      const userUnit = await getUserUnit(ctx);
      setUnit(userUnit);
      const [s, wc] = await Promise.all([getWorkoutStreak(ctx), getWorkoutsThisWeek(ctx)]);
      setStreak(s);
      setWeekCount(wc);

      const prog = await getActiveProgram(ctx);
      if (prog) {
        setProgramName(prog.name);
        const nextDay = await getNextProgramDay(ctx, prog.id);
        if (nextDay) { setSuggestedDay(nextDay); setSplit(nextDay.split || 'push'); }
      }

      const activeWid = await getSetting(ctx, 'active_workout_id');
      if (activeWid) {
        setWorkoutId(activeWid);
        const startTs = await getSetting(ctx, 'workout_start_time');
        if (startTs) setWorkoutStartTime(parseInt(startTs));
      }
      setDbCtx(ctx);
    })();
  }, []);

  // Cleanup rest timer intervals
  useEffect(() => {
    return () => { for (const key of Object.keys(intervalRefs.current)) clearInterval(intervalRefs.current[key]); };
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!workoutStartTime) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - workoutStartTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [workoutStartTime]);

  // Refresh blocks/sets when workout changes
  useEffect(() => { if (dbCtx && workoutId) refreshBlocksAndSets(); }, [dbCtx, workoutId]);
  useEffect(() => { fetchLastTimePreviews(); }, [blockExercises]);

  // ═══════════════════════════════════════════════
  // ── Core workout functions ──
  // ═══════════════════════════════════════════════

  function formatTime(sec: number) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }

  async function startWorkout() {
    if (!dbCtx || workoutId) return;
    const id = Crypto.randomUUID();
    const now = Date.now();
    await createWorkout(dbCtx, { id, date: new Date().toISOString(), split });
    await setSetting(dbCtx, 'active_workout_id', id);
    await setSetting(dbCtx, 'workout_start_time', String(now));
    setWorkoutId(id); setSets([]); setBlocks([]);
    setWorkoutStartTime(now); setElapsed(0);

    if (suggestedDay) {
      const dayExs = await listProgramDayExercises(dbCtx, suggestedDay.id);
      for (let i = 0; i < dayExs.length; i++) {
        const blockId = Crypto.randomUUID();
        const beId = Crypto.randomUUID();
        await createBlock(dbCtx, { id: blockId, workout_id: id, kind: 'single', order_index: i + 1, notes: null });
        await addBlockExercise(dbCtx, { id: beId, block_id: blockId, exercise_id: dayExs[i].exercise_id, order_index: 1 });
        const targetSets = dayExs[i].target_sets ?? 3;
        let nextIdx = await getNextSetIndex(dbCtx, id);
        const lastTop = await latestExerciseTopSet(dbCtx, dayExs[i].exercise_id) as any;
        const w = lastTop?.weight ?? (parseFloat(weight) || 0);
        const r = dayExs[i].target_reps_min ?? (lastTop?.reps ?? (parseInt(reps) || 0));
        const rirVal = dayExs[i].target_rir ?? (lastTop?.rir ?? 2);
        for (let s = 0; s < targetSets; s++) {
          await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: id, exercise_id: dayExs[i].exercise_id, set_index: nextIdx, weight: w, reps: r, rir: rirVal, is_warmup: 0, block_id: blockId });
          nextIdx++;
        }
      }
    }
  }

  async function handleQuickStart() {
    if (!dbCtx) return;
    const lastId = await getMostRecentWorkoutId(dbCtx);
    if (!lastId) return;
    const newId = Crypto.randomUUID();
    const now = Date.now();
    await repeatWorkout(dbCtx, lastId, newId, new Date().toISOString());
    await setSetting(dbCtx, 'active_workout_id', newId);
    await setSetting(dbCtx, 'workout_start_time', String(now));
    setWorkoutId(newId); setWorkoutStartTime(now); setElapsed(0);
  }

  async function refreshBlocksAndSets() {
    if (!dbCtx || !workoutId) return;
    const [rows, bs] = await Promise.all([listWorkoutSets(dbCtx, workoutId), listBlocksWithExercises(dbCtx, workoutId)]);
    setSets(rows); setBlocks(bs);
    const map: Record<string, any[]> = {};
    for (const b of bs) map[b.id] = await listBlockExercisesWithNames(dbCtx, b.id);
    setBlockExercises(map);
  }

  async function fetchLastTimePreviews() {
    if (!dbCtx || !workoutId) return;
    const allExIds = new Set<string>();
    for (const exs of Object.values(blockExercises)) for (const e of exs) allExIds.add(e.exercise_id);
    const previews: Record<string, any[]> = {};
    for (const exId of allExIds) {
      const rows = await lastWorkingSetsForExercise(dbCtx, exId, workoutId);
      if (rows.length > 0) previews[exId] = rows;
    }
    setLastSets(previews);
  }

  // ── Set operations ──

  async function handleSetUpdate(setId: string, updates: Record<string, any>) {
    if (!dbCtx || !workoutId) return;
    await updateSet(dbCtx, { id: setId, ...updates });
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  async function handleDeleteSet(setId: string) {
    if (!dbCtx || !workoutId) return;
    await deleteSet(dbCtx, setId);
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  async function logSetForBlock(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    const nextIdx = await getNextSetIndex(dbCtx, workoutId);
    const parsedRir = parseInt(rir);
    await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, rir: isNaN(parsedRir) ? null : parsedRir, is_warmup: 0, block_id: blockId });
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
    const next = suggestNextWeight(parseFloat(weight), isNaN(parseInt(rir)) ? null : parseInt(rir), 2, 2.5);
    setWeight(String(next));
    startRest(blockId, restDuration);
  }

  async function logActiveSet(blockId: string) {
    const active = activeRowByBlock[blockId];
    const block = blocks.find((x: any) => x.id === blockId);
    if (!active || !block) return;
    const perExSets = sets.filter((s: any) => s.block_id === blockId && s.exercise_id === active.exerciseId);
    if (active.row >= perExSets.length) return;
    const s = perExSets[active.row];
    if (!(s.reps != null && s.weight != null)) return;
    await updateSet(dbCtx, { id: s.id, is_completed: 1 });
    const rows = await listWorkoutSets(dbCtx, workoutId!);
    setSets(rows);
    startRest(blockId, restDuration);

    // PR detection
    const exName = (blockExercises[blockId] ?? []).find((e: any) => e.exercise_id === active.exerciseId)?.exercise_name ?? '';
    if (s.weight > 0 && s.reps > 0 && !s.is_warmup) checkForPR(active.exerciseId, exName, s.weight, s.reps);

    // Auto-advance
    const nextIncomplete = perExSets.findIndex((s: any, idx: number) => idx > active.row && !s.is_completed);
    if (nextIncomplete >= 0) {
      setActiveRowByBlock(prev => ({ ...prev, [blockId]: { exerciseId: active.exerciseId, row: nextIncomplete } }));
    } else {
      const exs = blockExercises[blockId] ?? [];
      const idxEx = exs.findIndex((e: any) => e.exercise_id === active.exerciseId);
      let advanced = false;
      for (let ei = idxEx + 1; ei < exs.length && !advanced; ei++) {
        const nextExSets = rows.filter((s: any) => s.block_id === blockId && s.exercise_id === exs[ei].exercise_id && !s.is_completed);
        if (nextExSets.length > 0) { setActiveRowByBlock(prev => ({ ...prev, [blockId]: { exerciseId: exs[ei].exercise_id, row: 0 } })); advanced = true; }
      }
      if (!advanced) {
        const idxBlock = blocks.findIndex((x: any) => x.id === blockId);
        for (let bi = idxBlock + 1; bi < blocks.length && !advanced; bi++) {
          const nextEx = (blockExercises[blocks[bi].id] ?? [])[0];
          if (nextEx) { setActiveBlockId(blocks[bi].id); setActiveRowByBlock(prev => ({ ...prev, [blocks[bi].id]: { exerciseId: nextEx.exercise_id, row: 0 } })); advanced = true; }
        }
      }
    }
  }

  async function addWarmups(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    const ex = await getExercise(dbCtx, exerciseId);
    const warmups = generateWarmupWeights(parseFloat(weight) || 0, ex?.default_increment ?? 2.5);
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    for (const w of warmups) {
      await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: w.weight, reps: w.reps, rir: null as any, is_warmup: 1, block_id: blockId });
      nextIdx++;
    }
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  async function addDropSets(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    const baseWeight = parseFloat(weight) || 0;
    const ex = await getExercise(dbCtx, exerciseId);
    const inc = ex?.default_increment ?? 2.5;
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    for (const pct of [0.8, 0.6, 0.4]) {
      await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: roundToIncrement(baseWeight * pct, inc), reps: parseInt(reps) || 8, rir: 0, is_warmup: 0, block_id: blockId });
      nextIdx++;
    }
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  async function addDefaultWorkingSets(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    const lastTop = await latestExerciseTopSet(dbCtx, exerciseId) as any;
    const w = lastTop?.weight ?? (parseFloat(weight) || 0);
    const r = lastTop?.reps ?? (parseInt(reps) || 0);
    const rirVal = lastTop?.rir ?? (isNaN(parseInt(rir)) ? null : parseInt(rir));
    for (let i = 0; i < 3; i++) {
      await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: w, reps: r, rir: rirVal as any, is_warmup: 0, block_id: blockId });
      nextIdx++;
    }
  }

  // ── Block operations ──

  async function handleDeleteBlock(blockId: string) {
    if (!dbCtx || !workoutId) return;
    await deleteBlock(dbCtx, blockId);
    await refreshBlocksAndSets();
  }

  async function handleDuplicateBlock(blockId: string) {
    if (!dbCtx || !workoutId) return;
    await duplicateBlock(dbCtx, blockId, workoutId);
    await refreshBlocksAndSets();
  }

  async function moveBlock(blockId: string, direction: 'up' | 'down') {
    const idx = blocks.findIndex((b: any) => b.id === blockId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= blocks.length) return;
    await swapBlockOrder(dbCtx, blockId, blocks[swapIdx].id);
    await refreshBlocksAndSets();
  }

  // ── Rest timer ──

  function startRest(blockId: string, duration: number) {
    if (intervalRefs.current[blockId]) { clearInterval(intervalRefs.current[blockId]); delete intervalRefs.current[blockId]; }
    setTimers(t => ({ ...t, [blockId]: { timeLeft: duration, running: true } }));
    intervalRefs.current[blockId] = setInterval(() => {
      setTimers(prev => {
        const st = prev[blockId] ?? { timeLeft: duration, running: true };
        if (!st.running) return prev;
        const next = st.timeLeft <= 1 ? 0 : st.timeLeft - 1;
        if (next > 0 && next <= 3) setTimeout(() => Vibration.vibrate(100), 0);
        if (next === 0) { clearInterval(intervalRefs.current[blockId]); delete intervalRefs.current[blockId]; setTimeout(() => Vibration.vibrate([0, 200, 100, 200]), 0); }
        return { ...prev, [blockId]: { ...st, timeLeft: next, running: next > 0 && st.running } };
      });
    }, 1000);
  }

  function pauseResume(blockId: string) {
    setTimers(prev => {
      const st = prev[blockId];
      if (!st) return prev;
      return { ...prev, [blockId]: { ...st, running: !st.running } };
    });
  }

  function resetTimer(blockId: string) {
    if (intervalRefs.current[blockId]) { clearInterval(intervalRefs.current[blockId]); delete intervalRefs.current[blockId]; }
    setTimers(prev => ({ ...prev, [blockId]: { timeLeft: restDuration, running: false } }));
  }

  // ── PR detection ──

  async function checkForPR(exerciseId: string, exerciseName: string, w: number, r: number) {
    if (!dbCtx || !w || !r || r <= 0) return;
    const est = epley1RM(w, r);
    const best = await getBestMetric(dbCtx, exerciseId);
    await upsertMetric(dbCtx, { id: Crypto.randomUUID(), date: new Date().toISOString(), exercise_id: exerciseId, est_1rm: est, top_set_weight: w, top_set_reps: r });
    if (!best || est > best.est_1rm) {
      setPrBanner({ exerciseName, est1rm: Math.round(est * 10) / 10 });
      if (prBannerTimer.current) clearTimeout(prBannerTimer.current);
      prBannerTimer.current = setTimeout(() => setPrBanner(null), 4000);
    }
  }

  // ── Exercise picker (unified) ──

  async function openPicker(mode: 'add' | 'superset' | 'swap', blockId?: string, oldExerciseId?: string) {
    if (!dbCtx || !workoutId) return;
    let choices: any[];
    if (mode === 'add') {
      const [exs, favIds, recency] = await Promise.all([listExercisesAvailableByEquipment(dbCtx), listFavoriteExerciseIds(dbCtx), exerciseRecency(dbCtx)]);
      const recencyMap = new Map(recency.map((r: any) => [r.exercise_id, r.last_used]));
      const favSet = new Set(favIds);
      const fav = exs.filter((e: any) => favSet.has(e.id));
      const others = exs.filter((e: any) => !favSet.has(e.id));
      others.sort((a: any, b: any) => { const ad = recencyMap.get(a.id) ?? ''; const bd = recencyMap.get(b.id) ?? ''; if (!ad && bd) return -1; if (ad && !bd) return 1; return ad < bd ? -1 : ad > bd ? 1 : 0; });
      choices = [...fav, ...others];
    } else if (mode === 'superset') {
      const all = await listExercisesAvailableByEquipment(dbCtx);
      const current = (await listBlockExercisesWithNames(dbCtx, blockId!)).map((e: any) => e.exercise_id);
      choices = all.filter((e: any) => !current.includes(e.id));
    } else {
      const all = await listExercisesAvailableByEquipment(dbCtx);
      choices = all.filter((e: any) => e.id !== oldExerciseId);
    }
    setPickerChoices(choices);
    setPickerSelectedId(choices?.[0]?.id ?? null);
    setPickerSearch('');
    setMuscleFilter(null);
    setPicker({ mode, blockId, oldExerciseId });
  }

  async function confirmPicker() {
    if (!picker || !pickerSelectedId || !dbCtx || !workoutId) { setPicker(null); return; }
    const { mode, blockId, oldExerciseId } = picker;
    if (mode === 'add') {
      const newBlockId = Crypto.randomUUID();
      await createBlock(dbCtx, { id: newBlockId, workout_id: workoutId, kind: 'single', order_index: (blocks?.length ?? 0) + 1, notes: null });
      await addBlockExercise(dbCtx, { id: Crypto.randomUUID(), block_id: newBlockId, exercise_id: pickerSelectedId, order_index: 1 });
      await addDefaultWorkingSets(newBlockId, pickerSelectedId);
    } else if (mode === 'superset') {
      const existing = await listBlockExercisesWithNames(dbCtx, blockId!);
      await addBlockExercise(dbCtx, { id: Crypto.randomUUID(), block_id: blockId!, exercise_id: pickerSelectedId, order_index: (existing?.length ?? 0) + 1 });
      await addDefaultWorkingSets(blockId!, pickerSelectedId);
    } else if (mode === 'swap') {
      await replaceBlockExercise(dbCtx, blockId!, oldExerciseId!, pickerSelectedId);
      await addDefaultWorkingSets(blockId!, pickerSelectedId);
    }
    await refreshBlocksAndSets();
    setPicker(null);
  }

  // ── Finish workout ──

  function getWeekStart(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    return mon.toISOString().slice(0, 10);
  }

  async function openFinishWorkout() {
    if (!dbCtx || !workoutId) return;
    const weekStart = getWeekStart();
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const vol = await computeWeeklyVolume(dbCtx, weekStart, weekEnd);
    for (const [mg, count] of Object.entries(vol)) await upsertWeeklyVolume(dbCtx, weekStart, mg, count);
    setWeeklyVolume(vol);
    const bests = await getBestSetsInWorkout(dbCtx, workoutId);
    setBestSetIds(bests);
    setTemplateSaved(false); setTemplateName(''); setFinishBwInput('');
    setShowFinishModal(true);
  }

  async function confirmFinishWorkout() {
    for (const key of Object.keys(intervalRefs.current)) { clearInterval(intervalRefs.current[key]); delete intervalRefs.current[key]; }
    setTimers({});
    if (dbCtx && finishBwInput.trim()) {
      const bw = parseFloat(finishBwInput);
      if (!isNaN(bw) && bw > 0) await logBodyWeight(dbCtx, { id: Crypto.randomUUID(), date: new Date().toISOString(), weight: bw });
    }
    if (dbCtx) {
      if (workoutId && elapsed > 0) await updateWorkoutDuration(dbCtx, workoutId, elapsed);
      if (workoutNotes.trim() && workoutId) await updateWorkoutNotes(dbCtx, workoutId, workoutNotes.trim());
      await deleteSetting(dbCtx, 'active_workout_id');
      await deleteSetting(dbCtx, 'workout_start_time');
      const [s, wc] = await Promise.all([getWorkoutStreak(dbCtx), getWorkoutsThisWeek(dbCtx)]);
      setStreak(s); setWeekCount(wc);
    }
    setWorkoutId(null); setSets([]); setBlocks([]); setBlockExercises({});
    setActiveBlockId(null); setActiveRowByBlock({}); setLastSets({});
    setShowFinishModal(false); setWorkoutStartTime(null); setElapsed(0); setWorkoutNotes('');
  }

  async function handleShareWorkout() {
    if (!dbCtx || !workoutId) return;
    const detail = await listWorkoutDetail(dbCtx, workoutId);
    const exMap = new Map<string, { name: string; sets: any[] }>();
    for (const s of detail) {
      if (!exMap.has(s.exercise_id)) exMap.set(s.exercise_id, { name: s.exercise_name, sets: [] });
      exMap.get(s.exercise_id)!.sets.push(s);
    }
    await Share.share({ message: formatWorkoutSummary({ split, date: new Date().toISOString(), elapsed }, Array.from(exMap.values()), unit) });
  }

  async function handleSaveAsTemplate() {
    if (!dbCtx || !workoutId || !templateName.trim()) return;
    await saveWorkoutAsTemplate(dbCtx, workoutId, templateName.trim(), Crypto.randomUUID());
    setTemplateSaved(true);
  }

  // ── Sticky bar logic ──
  const stickyBarState = useMemo(() => {
    const active = activeBlockId ? activeRowByBlock[activeBlockId] : null;
    let valid = false, label = 'Log Set', handler: (() => void) | undefined;
    if (active && activeBlockId) {
      const perExSets = sets.filter((s: any) => s.block_id === activeBlockId && s.exercise_id === active.exerciseId);
      if (active.row >= 0 && active.row < perExSets.length) {
        const s = perExSets[active.row];
        valid = s?.reps != null && s?.weight != null;
        label = active.row === perExSets.length - 1 ? 'Log Set & Next Exercise' : 'Log Set';
        handler = () => logActiveSet(activeBlockId);
      }
    }
    const runningTimer = activeBlockId ? timers[activeBlockId] : null;
    const timerText = runningTimer?.running && runningTimer.timeLeft > 0 ? formatTime(runningTimer.timeLeft) : undefined;
    return { valid, label, handler, timerText };
  }, [activeBlockId, activeRowByBlock, sets, timers]);

  const rirValue = useMemo(() => parseInt(rir) || 0, [rir]);

  // ═══════════════════════════════════════════════
  // ── Render ──
  // ═══════════════════════════════════════════════

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <WorkoutHeader
          prBanner={prBanner}
          elapsed={elapsed}
          workoutStartTime={workoutStartTime}
          workoutId={workoutId}
          streak={streak}
          weekCount={weekCount}
          suggestedDay={suggestedDay}
          programName={programName}
          unit={unit}
        />

        {/* Split selector (pre-workout) */}
        {!workoutId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Split</Text>
            <View style={styles.chipsRow}>
              {SPLIT_OPTIONS.map((s) => (
                <Chip key={s} label={s.toUpperCase()} selected={split === s} onPress={() => setSplit(s)} size="sm" />
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        {!workoutId ? (
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <PinkButton title="Start Workout" onPress={startWorkout} fullWidth />
            </View>
            <ActionChip icon="flash-outline" label="Quick Start" onPress={handleQuickStart} />
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <PinkButton title="Add Exercise" onPress={() => openPicker('add')} fullWidth />
            </View>
            <ActionChip icon="checkmark-done-outline" label="Finish" onPress={openFinishWorkout} />
          </View>
        )}

        {/* Utility links */}
        <View style={styles.utilRow}>
          <ActionChip icon="barbell-outline" label="Equipment" onPress={() => import('expo-router').then((m) => m.router.push('/equipment'))} />
          <ActionChip icon="calculator-outline" label="Plates" onPress={() => setShowPlateCalc(true)} />
        </View>

        {/* Rest duration (during workout) */}
        {workoutId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Rest Timer</Text>
            <View style={styles.chipsRow}>
              {REST_OPTIONS.map((sec) => (
                <Chip key={sec} label={`${sec}s`} selected={restDuration === sec} onPress={() => setRestDuration(sec)} size="sm" />
              ))}
            </View>
          </View>
        )}

        {/* Global inputs */}
        <View style={styles.inputsRow}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Weight</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Reps</Text>
            <TextInput
              value={reps}
              onChangeText={setReps}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>RIR</Text>
            <View style={styles.chipsRow}>
              {[3, 2, 1].map((v) => (
                <Chip key={v} label={String(v)} selected={rirValue === v} onPress={() => setRir(String(v))} size="sm" />
              ))}
            </View>
          </View>
        </View>

        {/* Exercise blocks */}
        {blocks.length > 0 && (
          <View style={styles.blocksContainer}>
            {blocks.map((b: any) => (
              <BlockCard
                key={b.id}
                block={b}
                exercises={blockExercises[b.id] ?? (b.exercise_id ? [{ exercise_id: b.exercise_id, exercise_name: b.exercise_name }] : [])}
                sets={sets.filter((s: any) => s.block_id === b.id)}
                timer={timers[b.id] ?? { timeLeft: restDuration, running: false }}
                activeRow={activeRowByBlock[b.id]}
                collapsed={collapsedBlocks.has(b.id)}
                unit={unit}
                bestSetIds={bestSetIds}
                lastSets={lastSets}
                restDuration={restDuration}
                onMoveUp={() => moveBlock(b.id, 'up')}
                onMoveDown={() => moveBlock(b.id, 'down')}
                onToggleCollapse={() => setCollapsedBlocks((prev) => { const next = new Set(prev); if (next.has(b.id)) next.delete(b.id); else next.add(b.id); return next; })}
                onDelete={() => handleDeleteBlock(b.id)}
                onDuplicate={() => handleDuplicateBlock(b.id)}
                onMakeSuperset={() => openPicker('superset', b.id)}
                onLogSet={(exId) => logSetForBlock(b.id, exId)}
                onAddWarmups={(exId) => addWarmups(b.id, exId)}
                onAddDropSets={(exId) => addDropSets(b.id, exId)}
                onSwapExercise={(exId) => openPicker('swap', b.id, exId)}
                onDeleteSet={handleDeleteSet}
                onSetUpdate={handleSetUpdate}
                onSetFocus={(exId, row) => { setActiveBlockId(b.id); setActiveRowByBlock((prev) => ({ ...prev, [b.id]: { exerciseId: exId, row } })); }}
                onTimerPauseResume={() => { const t = timers[b.id]; if (!t || t.timeLeft === 0) startRest(b.id, restDuration); else pauseResume(b.id); }}
                onTimerAdjust={(delta) => setTimers((prev) => ({ ...prev, [b.id]: { ...prev[b.id], timeLeft: (prev[b.id]?.timeLeft ?? 0) + delta } }))}
                onTimerReset={() => resetTimer(b.id)}
              />
            ))}
          </View>
        )}

        {/* Workout notes */}
        {workoutId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Notes</Text>
            <TextInput
              placeholder="How did this workout feel?"
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              multiline
              style={[styles.notesInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom bar */}
      <StickyBar
        label={stickyBarState.label}
        onPress={stickyBarState.handler ?? (() => {})}
        disabled={!stickyBarState.valid}
        timerText={stickyBarState.timerText}
      />

      {/* Exercise picker (add / superset / swap) */}
      <ExercisePickerSheet
        visible={!!picker}
        onClose={() => setPicker(null)}
        title={picker?.mode === 'add' ? 'Add Exercise' : picker?.mode === 'superset' ? 'Make Superset' : 'Swap Exercise'}
        confirmLabel={picker?.mode === 'swap' ? 'Swap' : 'Add'}
        exercises={pickerChoices}
        selectedId={pickerSelectedId}
        onSelect={setPickerSelectedId}
        onConfirm={confirmPicker}
        search={pickerSearch}
        onSearchChange={setPickerSearch}
        muscleFilter={muscleFilter}
        onMuscleFilterChange={setMuscleFilter}
      />

      {/* Finish workout sheet */}
      <FinishSheet
        visible={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        exerciseCount={blocks.length}
        sets={sets}
        elapsed={elapsed}
        unit={unit}
        weeklyVolume={weeklyVolume}
        workoutNotes={workoutNotes}
        bwInput={finishBwInput}
        onBwChange={setFinishBwInput}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        templateSaved={templateSaved}
        onSaveTemplate={handleSaveAsTemplate}
        onShare={handleShareWorkout}
        onConfirm={confirmFinishWorkout}
      />

      {/* Plate calculator */}
      <PlateCalcSheet
        visible={showPlateCalc}
        onClose={() => setShowPlateCalc(false)}
        unit={unit}
        initialWeight={weight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  section: {
    gap: 4,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: fw.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: fontSize.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 70,
    fontSize: fontSize.caption,
    fontWeight: fw.semibold,
  },
  blocksContainer: {
    gap: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: fontSize.caption,
    minHeight: 48,
    textAlignVertical: 'top',
  },
});
