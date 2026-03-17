import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Share, Vibration } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import {
  ensureUser, createWorkout, addSet, listWorkoutSets, createExercise,
  listBlocksWithExercises, createBlock, addBlockExercise,
  listExercisesAvailableByEquipment, getExercise,
  getNextSetIndex, updateSet, listBlockExercisesWithNames,
  listFavoriteExerciseIds, lastWorkingSetsForExercise, upsertMetric,
  getBestMetric, replaceBlockExercise, getUserUnit, computeWeeklyVolume,
  upsertWeeklyVolume, exerciseRecency, deleteSet, deleteBlock,
  latestExerciseTopSet, getSetting, setSetting,
  deleteSetting, getActiveProgram, getNextProgramDay,
  listProgramDayExercises, updateWorkoutNotes, getWorkoutStreak,
  getWorkoutsThisWeek, saveWorkoutAsTemplate,
  logBodyWeight, getBestSetsInWorkout, getMostRecentWorkoutId,
  repeatWorkout, listWorkoutDetail, updateWorkoutDuration,
  getRecentWorkoutSplits,
  updateExerciseImageUrl,
  getExerciseRecommendations,
  updateExerciseNotes, getExerciseNotes,
  updateExerciseRecommendation, getExerciseRecommendation,
  updateUserUnit,
  type Recommendation,
} from '@/lib/dao';
import * as Crypto from 'expo-crypto';
import { SEED_EXERCISES } from '@/data/seedExercises';
import { suggestNextWeight, epley1RM, formatWorkoutSummary, generateWarmupWeights, progressiveOverload } from '@/lib/progression';
import {
  suggestSplit, selectExercises,
  DURATION_EXERCISE_COUNT, DURATION_OPTIONS,
  type DurationOption,
} from '@/lib/workoutGenerator';
import { useTheme } from '@/theme/ThemeContext';
import { ActiveWorkoutView, ExercisePickerSheet, FinishSheet, PlateCalcSheet, PreWorkoutView } from '@/components/workout';
import { RestTimer } from '@/components/RestTimer';

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
  const [activeRowByBlock, setActiveRowByBlock] = useState<Record<string, { exerciseId: string; row: number }>>({});
  const [lastSets, setLastSets] = useState<Record<string, any[]>>({});

  // ── Global inputs ──
  const [weight, setWeight] = useState('185');
  const [reps, setReps] = useState('5');
  const [rir, setRir] = useState('2');
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');

  // ── Rest timer ──
  const [restDuration, setRestDuration] = useState(120);
  const [timers, setTimers] = useState<Record<string, { timeLeft: number; running: boolean }>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timer>>({});

  // ── Split & program ──
  const [split, setSplit] = useState('push');
  const [suggestedDay, setSuggestedDay] = useState<any>(null);

  // ── Auto-generation ──
  const [duration, setDuration] = useState<DurationOption>(60);
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

  // ── Exercise options (notes + recommendations) ──
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [exerciseRecommendations, setExerciseRecommendations] = useState<Record<string, Recommendation>>({});

  // ── Preview exercises (pre-workout) ──
  type PreviewExercise = {
    id: string;
    name: string;
    muscle_groups: string;
    image_url?: string | null;
    sets: number;
    reps: number;
    weight: number;
  };
  const [previewExercises, setPreviewExercises] = useState<PreviewExercise[]>([]);

  // ═══════════════════════════════════════════════
  // ── Bootstrap ──
  // ═══════════════════════════════════════════════

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });

      // Seed exercise library (batch check for efficiency)
      const existingRows = await ctx.db.getAllAsync<{ name: string }>(
        `SELECT name FROM exercises WHERE user_id = ?`,
        [ctx.userId]
      );
      const existingNames = new Set(existingRows.map(r => r.name));
      const toInsert = SEED_EXERCISES.filter(s => !existingNames.has(s.name));
      if (toInsert.length > 0) {
        await ctx.db.execAsync('BEGIN TRANSACTION');
        for (const s of toInsert) {
          await createExercise(ctx, {
            id: Crypto.randomUUID(), name: s.name, muscle_groups: s.mg,
            is_compound: s.compound, default_increment: 2.5,
          });
        }
        await ctx.db.execAsync('COMMIT');
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
      } else {
        // Auto-suggest split when no program is active
        const recentWorkouts = await getRecentWorkoutSplits(ctx);
        const suggestion = suggestSplit(recentWorkouts);
        setSplit(suggestion.split);
        const savedDuration = await getSetting(ctx, 'preferred_duration');
        if (savedDuration) {
          const d = parseInt(savedDuration);
          if ((DURATION_OPTIONS as readonly number[]).includes(d)) {
            setDuration(d as DurationOption);
          }
        }
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

  // Generate preview exercises for pre-workout screen
  async function refreshPreview() {
    if (!dbCtx || workoutId) return;
    const exerciseCount = DURATION_EXERCISE_COUNT[duration] ?? 10;
    const [available, recency, favIds, recs] = await Promise.all([
      listExercisesAvailableByEquipment(dbCtx),
      exerciseRecency(dbCtx),
      listFavoriteExerciseIds(dbCtx),
      getExerciseRecommendations(dbCtx),
    ]);
    const selected = selectExercises(available, split, exerciseCount, recency, new Set(favIds), recs);
    const previews: PreviewExercise[] = [];
    for (const ex of selected) {
      const last = await lastWorkingSetsForExercise(dbCtx, ex.id);
      const prog = progressiveOverload(last, ex.is_compound === 1, 2.5);
      previews.push({
        id: ex.id, name: ex.name, muscle_groups: ex.muscle_groups,
        image_url: (ex as any).video_url ?? null,
        sets: 3, reps: prog.reps, weight: prog.weight || (parseFloat(weight) || 0),
      });
    }
    setPreviewExercises(previews);
  }

  useEffect(() => {
    if (!dbCtx || workoutId || programName) return;
    refreshPreview();
  }, [dbCtx, workoutId, split, duration, programName]);

  // ═══════════════════════════════════════════════
  // ── Core workout functions ──
  // ═══════════════════════════════════════════════

  async function startWorkout() {
    if (!dbCtx || workoutId) return;
    const id = Crypto.randomUUID();
    const now = Date.now();
    await createWorkout(dbCtx, { id, date: new Date().toISOString(), split });
    await setSetting(dbCtx, 'active_workout_id', id);
    await setSetting(dbCtx, 'workout_start_time', String(now));

    // Populate exercises BEFORE setting workoutId in state.
    // Otherwise React flushes the state update during awaits,
    // triggering refreshBlocksAndSets() before exercises are in the DB.
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
    } else {
      await autoPopulateExercises(id);
    }

    // Now set state — useEffect will fire refreshBlocksAndSets() and find the populated workout
    setWorkoutId(id); setSets([]); setBlocks([]);
    setWorkoutStartTime(now); setElapsed(0);
  }

  async function autoPopulateExercises(workoutId: string) {
    if (!dbCtx) return;
    const exerciseCount = DURATION_EXERCISE_COUNT[duration] ?? 10;
    const [available, recency, favIds] = await Promise.all([
      listExercisesAvailableByEquipment(dbCtx),
      exerciseRecency(dbCtx),
      listFavoriteExerciseIds(dbCtx),
    ]);

    const selected = selectExercises(
      available, split, exerciseCount, recency, new Set(favIds)
    );

    for (let i = 0; i < selected.length; i++) {
      const blockId = Crypto.randomUUID();
      const beId = Crypto.randomUUID();
      await createBlock(dbCtx, { id: blockId, workout_id: workoutId, kind: 'single', order_index: i + 1, notes: null });
      await addBlockExercise(dbCtx, { id: beId, block_id: blockId, exercise_id: selected[i].id, order_index: 1 });
      let nextIdx = await getNextSetIndex(dbCtx, workoutId);
      const lastSets = await lastWorkingSetsForExercise(dbCtx, selected[i].id);
      const ex = await getExercise(dbCtx, selected[i].id);
      const inc = (ex as any)?.default_increment ?? 2.5;
      const prog = progressiveOverload(lastSets, selected[i].is_compound === 1, inc);
      const w = prog.weight || (parseFloat(weight) || 0);
      const r = prog.reps;
      const rirVal = 2;
      for (let s = 0; s < 3; s++) {
        await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: workoutId, exercise_id: selected[i].id, set_index: nextIdx, weight: w, reps: r, rir: rirVal, is_warmup: 0, block_id: blockId });
        nextIdx++;
      }
    }
  }

  async function handleDurationChange(d: DurationOption) {
    setDuration(d);
    if (dbCtx) await setSetting(dbCtx, 'preferred_duration', String(d));
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
    const notes: Record<string, string> = {};
    const recs: Record<string, Recommendation> = {};
    for (const exId of allExIds) {
      const [rows, note, rec] = await Promise.all([
        lastWorkingSetsForExercise(dbCtx, exId, workoutId),
        getExerciseNotes(dbCtx, exId),
        getExerciseRecommendation(dbCtx, exId),
      ]);
      if (rows.length > 0) previews[exId] = rows;
      if (note) notes[exId] = note;
      if (rec !== 'normal') recs[exId] = rec;
    }
    setLastSets(previews);
    setExerciseNotes(notes);
    setExerciseRecommendations(recs);
  }

  // ── Set operations ──

  async function handleSetUpdate(setId: string, updates: Record<string, any>) {
    if (!dbCtx || !workoutId) return;
    await updateSet(dbCtx, { id: setId, ...updates });

    // Auto-fill weight to subsequent uncompleted sets of the same exercise
    if (updates.weight !== undefined) {
      const updatedSet = sets.find((s: any) => s.id === setId);
      if (updatedSet) {
        const exSets = sets.filter((s: any) =>
          s.exercise_id === updatedSet.exercise_id &&
          s.block_id === updatedSet.block_id
        );
        const updatedIdx = exSets.findIndex((s: any) => s.id === setId);
        for (let i = updatedIdx + 1; i < exSets.length; i++) {
          if (!exSets[i].is_completed) {
            await updateSet(dbCtx, { id: exSets[i].id, weight: updates.weight });
          }
        }
      }
    }

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

    // PR detection
    const exName = (blockExercises[blockId] ?? []).find((e: any) => e.exercise_id === active.exerciseId)?.exercise_name ?? '';
    if (s.weight > 0 && s.reps > 0 && !s.is_warmup) checkForPR(active.exerciseId, exName, s.weight, s.reps);

    // Auto-advance — only start rest timer if more sets remain in the same exercise
    const nextIncomplete = perExSets.findIndex((s: any, idx: number) => idx > active.row && !s.is_completed);
    if (nextIncomplete >= 0) {
      startRest(blockId, restDuration);
      setActiveRowByBlock(prev => ({ ...prev, [blockId]: { exerciseId: active.exerciseId, row: nextIncomplete } }));
    } else {
      // All sets done for this exercise — stop any running rest timer
      resetTimer(blockId);
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
          if (nextEx) { setActiveRowByBlock(prev => ({ ...prev, [blocks[bi].id]: { exerciseId: nextEx.exercise_id, row: 0 } })); advanced = true; }
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

  // ── Exercise options (notes, recommendations, unit, remove) ──

  async function handleExerciseNotesChange(exerciseId: string, notes: string) {
    if (!dbCtx) return;
    await updateExerciseNotes(dbCtx, exerciseId, notes);
    setExerciseNotes(prev => ({ ...prev, [exerciseId]: notes }));
  }

  async function handleExerciseRecommendationChange(exerciseId: string, rec: Recommendation) {
    if (!dbCtx) return;
    await updateExerciseRecommendation(dbCtx, exerciseId, rec);
    setExerciseRecommendations(prev => {
      const next = { ...prev };
      if (rec === 'normal') delete next[exerciseId];
      else next[exerciseId] = rec;
      return next;
    });
  }

  async function handleUnitToggle() {
    if (!dbCtx) return;
    const newUnit = unit === 'lb' ? 'kg' : 'lb';
    await updateUserUnit(dbCtx, newUnit);
    setUnit(newUnit);
  }

  async function handleRemoveExercise(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    const exs = blockExercises[blockId] ?? [];
    if (exs.length <= 1) {
      await deleteBlock(dbCtx, blockId);
    } else {
      // Remove exercise from superset: delete its sets, then remove block_exercise row
      const exSets = sets.filter((s: any) => s.block_id === blockId && s.exercise_id === exerciseId);
      for (const s of exSets) await deleteSet(dbCtx, s.id);
      await dbCtx.db.runAsync(
        `DELETE FROM block_exercises WHERE block_id=? AND exercise_id=?`,
        [blockId, exerciseId]
      );
    }
    await refreshBlocksAndSets();
  }

  async function addDefaultWorkingSets(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    const lastSets = await lastWorkingSetsForExercise(dbCtx, exerciseId, workoutId);
    const ex = await getExercise(dbCtx, exerciseId);
    const inc = (ex as any)?.default_increment ?? 2.5;
    const isCompound = (ex as any)?.is_compound === 1;
    const prog = progressiveOverload(lastSets, isCompound, inc);
    const w = prog.weight || (parseFloat(weight) || 0);
    const r = prog.reps;
    const rirVal = 2;
    for (let i = 0; i < 3; i++) {
      await addSet(dbCtx, { id: Crypto.randomUUID(), workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: w, reps: r, rir: rirVal, is_warmup: 0, block_id: blockId });
      nextIdx++;
    }
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
    setActiveRowByBlock({}); setLastSets({});
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

  // ═══════════════════════════════════════════════
  // ── Render ──
  // ═══════════════════════════════════════════════

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Active workout view */}
        {workoutId && (
          <ActiveWorkoutView
            prBanner={prBanner}
            elapsed={elapsed}
            workoutStartTime={workoutStartTime}
            workoutId={workoutId}
            streak={streak}
            weekCount={weekCount}
            suggestedDay={suggestedDay}
            programName={programName}
            unit={unit}
            blocks={blocks}
            blockExercises={blockExercises}
            sets={sets}
            timers={timers}
            bestSetIds={bestSetIds}
            lastSets={lastSets}
            restDuration={restDuration}
            onAddExercise={() => openPicker('add')}
            onFinishWorkout={openFinishWorkout}
            onLogSet={(blockId, exId) => logSetForBlock(blockId, exId)}
            onAddWarmups={(blockId, exId) => addWarmups(blockId, exId)}
            onSwapExercise={(blockId, exId) => openPicker('swap', blockId, exId)}
            onDeleteSet={handleDeleteSet}
            onSetUpdate={handleSetUpdate}
            onSetFocus={(blockId, exId, row) => { setActiveRowByBlock((prev) => ({ ...prev, [blockId]: { exerciseId: exId, row } })); }}
            onTimerPauseResume={(blockId) => { const t = timers[blockId]; if (!t || t.timeLeft === 0) startRest(blockId, restDuration); else pauseResume(blockId); }}
            onTimerAdjust={(blockId, delta) => setTimers((prev) => ({ ...prev, [blockId]: { ...prev[blockId], timeLeft: (prev[blockId]?.timeLeft ?? 0) + delta } }))}
            onTimerReset={resetTimer}
            onImageFetched={(exId, url) => { if (dbCtx) updateExerciseImageUrl(dbCtx, exId, url); }}
            exerciseNotes={exerciseNotes}
            exerciseRecommendations={exerciseRecommendations}
            onExerciseNotesChange={handleExerciseNotesChange}
            onExerciseRecommendationChange={handleExerciseRecommendationChange}
            onUnitToggle={handleUnitToggle}
            onRemoveExercise={handleRemoveExercise}
            onCompleteActiveSet={(blockId) => logActiveSet(blockId)}
          />
        )}

        {/* Pre-workout view */}
        {!workoutId && (
          <PreWorkoutView
            previewExercises={previewExercises}
            split={split}
            duration={duration}
            unit={unit}
            programName={programName}
            streak={streak}
            weekCount={weekCount}
            onDurationChange={handleDurationChange}
            onSplitChange={setSplit}
            onStartWorkout={startWorkout}
            onQuickStart={handleQuickStart}
            onEquipmentPress={() => import('expo-router').then((m) => m.router.push('/equipment'))}
            onSwapWorkout={refreshPreview}
            onImageFetched={(exId, url) => { if (dbCtx) updateExerciseImageUrl(dbCtx, exId, url); }}
          />
        )}
      </ScrollView>

      {/* Floating rest timer — only during active workout */}
      {workoutId && (() => {
        const entry = Object.entries(timers).find(([, t]) => t.running && t.timeLeft > 0);
        if (!entry) return null;
        const [blockId, timer] = entry;
        return (
          <View style={styles.floatingTimer}>
            <RestTimer
              timeLeft={timer.timeLeft}
              running={timer.running}
              onPauseResume={() => { const t = timers[blockId]; if (!t || t.timeLeft === 0) startRest(blockId, restDuration); else pauseResume(blockId); }}
              onAdjust={(delta) => setTimers((prev) => ({ ...prev, [blockId]: { ...prev[blockId], timeLeft: (prev[blockId]?.timeLeft ?? 0) + delta } }))}
              onDismiss={() => resetTimer(blockId)}
            />
          </View>
        );
      })()}

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
  floatingTimer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
