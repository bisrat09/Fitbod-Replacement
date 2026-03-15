import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Pressable, Vibration, Modal, ScrollView, Share } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, createWorkout, addSet, listWorkoutSets, createExercise, listBlocksWithExercises, createBlock, addBlockExercise, listExercisesAvailableByEquipment, getExercise, findExerciseByName, listExercises, getNextSetIndex, updateSet, listBlockExercisesWithNames, listFavoriteExerciseIds, lastWorkingSetsForExercise, upsertMetric, getBestMetric, replaceBlockExercise, getUserUnit, computeWeeklyVolume, upsertWeeklyVolume, exerciseRecency, deleteSet, deleteBlock, swapBlockOrder, latestExerciseTopSet, getSetting, setSetting, deleteSetting, getTodayWorkout, getActiveProgram, getNextProgramDay, listProgramDayExercises, updateWorkoutNotes, getWorkoutStreak, getWorkoutsThisWeek, duplicateBlock, saveWorkoutAsTemplate, logBodyWeight, getBestSetsInWorkout, getMostRecentWorkoutId, repeatWorkout, listWorkoutDetail, updateWorkoutDuration } from '@/lib/dao';
import * as Crypto from 'expo-crypto';
import { suggestNextWeight, generateWarmupWeights, epley1RM, calculatePlates, formatWorkoutSummary, roundToIncrement } from '@/lib/progression';
import { useTheme } from '@/theme/ThemeContext';

export default function Today(){
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [weight, setWeight] = useState('185');
  const [reps, setReps] = useState('5');
  const [rir, setRir] = useState('2');
  const [sets, setSets] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [blockExercises, setBlockExercises] = useState<Record<string, any[]>>({});
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [exerciseChoices, setExerciseChoices] = useState<any[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showSupersetModal, setShowSupersetModal] = useState<{blockId:string|null}>({blockId:null});
  const [supersetChoices, setSupersetChoices] = useState<any[]>([]);
  const [selectedSupersetExerciseId, setSelectedSupersetExerciseId] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string,{timeLeft:number;running:boolean}>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timer>>({});
  const [activeRowByBlock, setActiveRowByBlock] = useState<Record<string, {exerciseId:string; row:number}>>({});
  const [activeBlockId, setActiveBlockId] = useState<string|null>(null);
  // Last-time preview per exercise
  const [lastSets, setLastSets] = useState<Record<string, any[]>>({});
  // PR banner
  const [prBanner, setPrBanner] = useState<{exerciseName:string; est1rm:number} | null>(null);
  const prBannerTimer = useRef<NodeJS.Timer | null>(null);
  // Swap exercise modal
  const [showSwapModal, setShowSwapModal] = useState<{blockId:string; oldExerciseId:string} | null>(null);
  const [swapChoices, setSwapChoices] = useState<any[]>([]);
  const [selectedSwapExerciseId, setSelectedSwapExerciseId] = useState<string | null>(null);
  // User unit preference
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  // Custom rest duration
  const REST_OPTIONS = [60, 90, 120, 180];
  const [restDuration, setRestDuration] = useState(120);
  // Finish workout
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [weeklyVolume, setWeeklyVolume] = useState<Record<string, number>>({});
  // Workout duration
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Exercise picker search
  const [pickerSearch, setPickerSearch] = useState('');
  // Finish modal extras
  const [finishBwInput, setFinishBwInput] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const [bestSetIds, setBestSetIds] = useState<Set<string>>(new Set());
  // Muscle group filter for pickers
  const MUSCLE_FILTERS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  // Plate calculator
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateTarget, setPlateTarget] = useState('');
  const BAR_WEIGHT = { lb: 45, kg: 20 };
  // Collapsible blocks
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  // Workout split
  const SPLIT_OPTIONS = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];
  const [split, setSplit] = useState('push');
  // Program suggestion
  const [suggestedDay, setSuggestedDay] = useState<any>(null);
  const [programName, setProgramName] = useState<string | null>(null);
  // Workout notes
  const [workoutNotes, setWorkoutNotes] = useState('');
  // Stats
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);

  useEffect(()=>{(async()=>{
    const { db, userId } = await bootstrapDb();
    const ctx = { db, userId };
    await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
    // Seed demo exercises idempotently (insert if missing by name)
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
    for(const s of seed){
      const existing = await findExerciseByName(ctx, s.name);
      if(existing) continue;
      await createExercise(ctx, {
        id: Crypto.randomUUID(),
        name: s.name,
        muscle_groups: s.mg,
        is_compound: 1,
        required_equipment: s.req,
        tags: 'primary',
        default_increment: 2.5,
      });
    }
    const userUnit = await getUserUnit(ctx);
    setUnit(userUnit);
    // Load stats
    const [s, wc] = await Promise.all([getWorkoutStreak(ctx), getWorkoutsThisWeek(ctx)]);
    setStreak(s);
    setWeekCount(wc);
    // Check for active program and suggest next day
    const prog = await getActiveProgram(ctx);
    if (prog) {
      setProgramName(prog.name);
      const nextDay = await getNextProgramDay(ctx, prog.id);
      if (nextDay) {
        setSuggestedDay(nextDay);
        setSplit(nextDay.split || 'push');
      }
    }
    // Resume active workout if one exists
    const activeWid = await getSetting(ctx, 'active_workout_id');
    if (activeWid) {
      setWorkoutId(activeWid);
      const startTs = await getSetting(ctx, 'workout_start_time');
      if (startTs) {
        setWorkoutStartTime(parseInt(startTs));
      }
    }
    setDbCtx(ctx);
  })();},[]);

  // Cleanup all rest timer intervals on unmount
  useEffect(() => {
    return () => {
      for (const key of Object.keys(intervalRefs.current)) {
        clearInterval(intervalRefs.current[key]);
      }
    };
  }, []);

  // Workout elapsed timer
  useEffect(() => {
    if (!workoutStartTime) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - workoutStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [workoutStartTime]);

  async function startWorkout(){
    if(!dbCtx) return;
    const id = Crypto.randomUUID();
    const now = Date.now();
    await createWorkout(dbCtx, { id, date: new Date().toISOString(), split });
    await setSetting(dbCtx, 'active_workout_id', id);
    await setSetting(dbCtx, 'workout_start_time', String(now));
    setWorkoutId(id); setSets([]); setBlocks([]);
    setWorkoutStartTime(now);
    setElapsed(0);
    // Auto-populate from program day if available
    if (suggestedDay) {
      const dayExs = await listProgramDayExercises(dbCtx, suggestedDay.id);
      for (let i = 0; i < dayExs.length; i++) {
        const blockId = Crypto.randomUUID();
        const beId = Crypto.randomUUID();
        await createBlock(dbCtx, { id: blockId, workout_id: id, kind: 'single', order_index: i + 1, notes: null });
        await addBlockExercise(dbCtx, { id: beId, block_id: blockId, exercise_id: dayExs[i].exercise_id, order_index: 1 });
        // Use target_sets from program, with auto-prefilled weight from history
        const targetSets = dayExs[i].target_sets ?? 3;
        let nextIdx = await getNextSetIndex(dbCtx, id);
        const lastTop = await latestExerciseTopSet(dbCtx, dayExs[i].exercise_id) as any;
        const w = lastTop?.weight ?? (parseFloat(weight) || 0);
        const r = dayExs[i].target_reps_min ?? (lastTop?.reps ?? (parseInt(reps) || 0));
        const rirVal = dayExs[i].target_rir ?? (lastTop?.rir ?? 2);
        for (let s = 0; s < targetSets; s++) {
          const setId = Crypto.randomUUID();
          await addSet(dbCtx, { id: setId, workout_id: id, exercise_id: dayExs[i].exercise_id, set_index: nextIdx, weight: w, reps: r, rir: rirVal, is_warmup: 0, block_id: blockId });
          nextIdx++;
        }
      }
    }
  }

  async function logSetForBlock(blockId:string, exerciseId:string){
    if(!dbCtx || !workoutId) return;
    const id = Crypto.randomUUID();
    const nextIdx = await getNextSetIndex(dbCtx, workoutId);
    const parsedRir = parseInt(rir);
    await addSet(dbCtx, { id, workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, rir: isNaN(parsedRir) ? null : parsedRir, is_warmup: 0, block_id: blockId });
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
    // Prefill next-set weight
    const prevWeight = parseFloat(weight);
    const prevRir = isNaN(parseInt(rir)) ? null : parseInt(rir);
    const next = suggestNextWeight(prevWeight, prevRir, 2, 2.5);
    setWeight(String(next));
    // Start per-block rest timer
    startRest(blockId, restDuration);
  }

  function startRest(blockId:string, duration:number){
    // clear existing interval for this block
    if(intervalRefs.current[blockId]){
      clearInterval(intervalRefs.current[blockId]);
      delete intervalRefs.current[blockId];
    }
    setTimers(t=>({...t,[blockId]:{timeLeft:duration,running:true}}));
    intervalRefs.current[blockId] = setInterval(()=>{
      setTimers(prev=>{
        const st = prev[blockId] ?? { timeLeft: duration, running: true };
        if(!st.running) return prev;
        const next = st.timeLeft<=1 ? 0 : st.timeLeft-1;
        const updated = { ...prev, [blockId]: { ...st, timeLeft: next, running: next>0 && st.running } };
        // Haptic countdown: short buzz at 3, 2, 1
        if(next > 0 && next <= 3){
          setTimeout(()=>Vibration.vibrate(100),0);
        }
        if(next===0){
          clearInterval(intervalRefs.current[blockId]);
          delete intervalRefs.current[blockId];
          setTimeout(()=>Vibration.vibrate([0, 200, 100, 200]),0);
        }
        return updated;
      });
    },1000);
  }

  function pauseResume(blockId:string){
    setTimers(prev=>{
      const st = prev[blockId];
      if(!st) return prev;
      return { ...prev, [blockId]: { ...st, running: !st.running } };
    });
  }

  function resetTimer(blockId:string){
    if(intervalRefs.current[blockId]){
      clearInterval(intervalRefs.current[blockId]);
      delete intervalRefs.current[blockId];
    }
    setTimers(prev=>({ ...prev, [blockId]: { timeLeft: restDuration, running: false } }));
  }

  function formatTime(sec:number){
    const m = Math.floor(sec/60);
    const s = sec%60;
    const mm = String(m).padStart(2,'0');
    const ss = String(s).padStart(2,'0');
    return `${mm}:${ss}`;
  }

  async function logActiveSet(blockId:string){
    const active = activeRowByBlock[blockId];
    const block = blocks.find((x:any)=>x.id===blockId);
    if(!active || !block) return;
    const perExSets = sets.filter((s:any)=>s.block_id===blockId && s.exercise_id===active.exerciseId);
    if(active.row >= perExSets.length) return;
    const s = perExSets[active.row];
    if(!(s.reps!=null && s.weight!=null)) return; // require filled values
    await updateSet(dbCtx, { id: s.id, is_completed: 1 });
    const rows = await listWorkoutSets(dbCtx, workoutId!);
    setSets(rows);
    startRest(blockId, restDuration);
    // PR detection
    const exName = (blockExercises[blockId] ?? []).find((e: any) => e.exercise_id === active.exerciseId)?.exercise_name ?? '';
    if (s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0 && !s.is_warmup) {
      checkForPR(active.exerciseId, exName, s.weight, s.reps);
    }
    // Auto-advance to next incomplete set
    // First try next row in same exercise
    const nextIncomplete = perExSets.findIndex((s:any, idx:number) => idx > active.row && !s.is_completed);
    if (nextIncomplete >= 0) {
      setActiveRowByBlock(prev=>({ ...prev, [blockId]: { exerciseId: active.exerciseId, row: nextIncomplete } }));
    } else {
      // Try next exercise in block
      const exs = blockExercises[blockId] ?? [];
      const idxEx = exs.findIndex((e:any)=>e.exercise_id===active.exerciseId);
      let advanced = false;
      for (let ei = idxEx + 1; ei < exs.length && !advanced; ei++) {
        const nextExSets = rows.filter((s:any)=>s.block_id===blockId && s.exercise_id===exs[ei].exercise_id && !s.is_completed);
        if (nextExSets.length > 0) {
          setActiveRowByBlock(prev=>({ ...prev, [blockId]: { exerciseId: exs[ei].exercise_id, row: 0 } }));
          advanced = true;
        }
      }
      // Try next block
      if (!advanced) {
        const idxBlock = blocks.findIndex((x:any)=>x.id===blockId);
        for (let bi = idxBlock + 1; bi < blocks.length && !advanced; bi++) {
          const nextBlock = blocks[bi];
          const nextEx = (blockExercises[nextBlock.id] ?? [])[0];
          if (nextEx) {
            setActiveBlockId(nextBlock.id);
            setActiveRowByBlock(prev=>({ ...prev, [nextBlock.id]: { exerciseId: nextEx.exercise_id, row: 0 } }));
            advanced = true;
          }
        }
      }
    }
  }

  const rirValue = useMemo(()=>parseInt(rir)||0,[rir]);

  function RirChip({value}:{value:number}){
    const selected = rirValue===value;
    return (
      <Pressable onPress={()=>setRir(String(value))} style={[styles.chip, selected && styles.chipSelected]}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value}</Text>
      </Pressable>
    );
  }

  async function addWarmups(blockId:string, exerciseId:string){
    if(!dbCtx || !workoutId) return;
    const ex = await getExercise(dbCtx, exerciseId);
    const inc = ex?.default_increment ?? 2.5;
    const target = parseFloat(weight) || 0;
    const warmups = generateWarmupWeights(target, inc);
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    for(const w of warmups){
      const id = Crypto.randomUUID();
      await addSet(dbCtx, { id, workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: w.weight, reps: w.reps, rir: null as any, is_warmup: 1, block_id: blockId });
      nextIdx++;
    }
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  async function openAddBlock(){
    if(!dbCtx || !workoutId) return;
    const [exs, favIds, recency] = await Promise.all([
      listExercisesAvailableByEquipment(dbCtx),
      listFavoriteExerciseIds(dbCtx),
      exerciseRecency(dbCtx)
    ]);
    // Build recency map: exercise_id -> last_used date string
    const recencyMap = new Map(recency.map(r => [r.exercise_id, r.last_used]));
    // order: favorites first, then others sorted by least-recently-used
    const favSet = new Set(favIds);
    const fav = exs.filter((e:any)=>favSet.has(e.id));
    const others = exs.filter((e:any)=>!favSet.has(e.id));
    // Sort others: never-used first, then least-recently-used
    others.sort((a: any, b: any) => {
      const aDate = recencyMap.get(a.id) ?? '';
      const bDate = recencyMap.get(b.id) ?? '';
      if (!aDate && bDate) return -1;
      if (aDate && !bDate) return 1;
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
    });
    const sorted = [...fav, ...others];
    setExerciseChoices(sorted);
    setSelectedExerciseId(sorted?.[0]?.id ?? null);
    setPickerSearch('');
    setMuscleFilter(null);
    setShowAddBlock(true);
  }

  async function confirmAddBlock(){
    if(!dbCtx || !workoutId || !selectedExerciseId) { setShowAddBlock(false); return; }
    const blockId = Crypto.randomUUID();
    const beId = Crypto.randomUUID();
    await createBlock(dbCtx, { id: blockId, workout_id: workoutId, kind: 'single', order_index: (blocks?.length ?? 0)+1, notes: null });
    await addBlockExercise(dbCtx, { id: beId, block_id: blockId, exercise_id: selectedExerciseId, order_index: 1 });
    // Add three default working sets like Fitbod presets
    await addDefaultWorkingSets(blockId, selectedExerciseId);
    await refreshBlocksAndSets();
    setShowAddBlock(false);
  }

  async function addDefaultWorkingSets(blockId:string, exerciseId:string){
    if(!dbCtx || !workoutId) return;
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    // Auto-prefill from last workout's top set, fallback to global inputs
    const lastTop = await latestExerciseTopSet(dbCtx, exerciseId) as any;
    const w = lastTop?.weight ?? (parseFloat(weight) || 0);
    const r = lastTop?.reps ?? (parseInt(reps) || 0);
    const rirVal = lastTop?.rir ?? (isNaN(parseInt(rir)) ? null : parseInt(rir));
    for(let i=0;i<3;i++){
      const id = Crypto.randomUUID();
      await addSet(dbCtx, { id, workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: w, reps: r, rir: rirVal as any, is_warmup: 0, block_id: blockId });
      nextIdx++;
    }
  }

  async function openMakeSuperset(blockId:string){
    if(!dbCtx || !workoutId) return;
    const all = await listExercisesAvailableByEquipment(dbCtx);
    const current = (await listBlockExercisesWithNames(dbCtx, blockId)).map((e:any)=>e.exercise_id);
    const choices = all.filter((e:any)=>!current.includes(e.id));
    setSupersetChoices(choices);
    setSelectedSupersetExerciseId(choices?.[0]?.id ?? null);
    setPickerSearch('');
    setShowSupersetModal({blockId});
  }

  async function confirmMakeSuperset(){
    if(!dbCtx || !workoutId || !showSupersetModal.blockId || !selectedSupersetExerciseId){ setShowSupersetModal({blockId:null}); return; }
    const blockId = showSupersetModal.blockId;
    const beId = Crypto.randomUUID();
    const existing = await listBlockExercisesWithNames(dbCtx, blockId);
    const order_index = (existing?.length ?? 0) + 1;
    await addBlockExercise(dbCtx, { id: beId, block_id: blockId, exercise_id: selectedSupersetExerciseId, order_index });
    await addDefaultWorkingSets(blockId, selectedSupersetExerciseId);
    await refreshBlocksAndSets();
    setShowSupersetModal({blockId:null});
  }

  async function refreshBlocksAndSets(){
    if(!dbCtx || !workoutId) return;
    const [rows, bs] = await Promise.all([
      listWorkoutSets(dbCtx, workoutId),
      listBlocksWithExercises(dbCtx, workoutId)
    ]);
    setSets(rows);
    setBlocks(bs);
    const map: Record<string, any[]> = {};
    for(const b of bs){
      map[b.id] = await listBlockExercisesWithNames(dbCtx, b.id);
    }
    setBlockExercises(map);
  }

  // Fetch last-time preview for all exercises in current blocks
  async function fetchLastTimePreviews() {
    if (!dbCtx || !workoutId) return;
    const allExIds = new Set<string>();
    for (const exs of Object.values(blockExercises)) {
      for (const e of exs) allExIds.add(e.exercise_id);
    }
    const previews: Record<string, any[]> = {};
    for (const exId of allExIds) {
      const rows = await lastWorkingSetsForExercise(dbCtx, exId, workoutId);
      if (rows.length > 0) previews[exId] = rows;
    }
    setLastSets(previews);
  }

  // PR detection: check if a completed set is a new Epley 1RM PR
  async function checkForPR(exerciseId: string, exerciseName: string, weight: number, reps: number) {
    if (!dbCtx || !weight || !reps || reps <= 0) return;
    const est = epley1RM(weight, reps);
    const best = await getBestMetric(dbCtx, exerciseId);
    const isPR = !best || est > best.est_1rm;
    // Always upsert the metric
    await upsertMetric(dbCtx, {
      id: Crypto.randomUUID(),
      date: new Date().toISOString(),
      exercise_id: exerciseId,
      est_1rm: est,
      top_set_weight: weight,
      top_set_reps: reps,
    });
    if (isPR) {
      // Show PR banner for 4 seconds
      setPrBanner({ exerciseName: exerciseName, est1rm: Math.round(est * 10) / 10 });
      if (prBannerTimer.current) clearTimeout(prBannerTimer.current);
      prBannerTimer.current = setTimeout(() => setPrBanner(null), 4000);
    }
  }

  // Swap exercise functions
  async function openSwapExercise(blockId: string, oldExerciseId: string) {
    if (!dbCtx) return;
    const all = await listExercisesAvailableByEquipment(dbCtx);
    const choices = all.filter((e: any) => e.id !== oldExerciseId);
    setSwapChoices(choices);
    setSelectedSwapExerciseId(choices?.[0]?.id ?? null);
    setPickerSearch('');
    setShowSwapModal({ blockId, oldExerciseId });
  }

  function getWeekStart(): string {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const mon = new Date(d);
    mon.setDate(diff);
    return mon.toISOString().slice(0, 10);
  }

  async function openFinishWorkout() {
    if (!dbCtx || !workoutId) return;
    // Compute weekly volume
    const weekStart = getWeekStart();
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const vol = await computeWeeklyVolume(dbCtx, weekStart, weekEnd);
    // Persist weekly volume
    for (const [mg, count] of Object.entries(vol)) {
      await upsertWeeklyVolume(dbCtx, weekStart, mg, count);
    }
    setWeeklyVolume(vol);
    // Get best sets for highlighting
    const bests = await getBestSetsInWorkout(dbCtx, workoutId);
    setBestSetIds(bests);
    setTemplateSaved(false);
    setTemplateName('');
    setFinishBwInput('');
    setShowFinishModal(true);
  }

  async function confirmFinishWorkout() {
    // Stop all timers
    for (const key of Object.keys(intervalRefs.current)) {
      clearInterval(intervalRefs.current[key]);
      delete intervalRefs.current[key];
    }
    setTimers({});
    // Log body weight if provided
    if (dbCtx && finishBwInput.trim()) {
      const bw = parseFloat(finishBwInput);
      if (!isNaN(bw) && bw > 0) {
        await logBodyWeight(dbCtx, { id: Crypto.randomUUID(), date: new Date().toISOString(), weight: bw });
      }
    }
    // Save duration, notes, and clear persisted active workout
    if (dbCtx) {
      if (workoutId && elapsed > 0) {
        await updateWorkoutDuration(dbCtx, workoutId, elapsed);
      }
      if (workoutNotes.trim() && workoutId) {
        await updateWorkoutNotes(dbCtx, workoutId, workoutNotes.trim());
      }
      await deleteSetting(dbCtx, 'active_workout_id');
      await deleteSetting(dbCtx, 'workout_start_time');
      // Refresh stats
      const [s, wc] = await Promise.all([getWorkoutStreak(dbCtx), getWorkoutsThisWeek(dbCtx)]);
      setStreak(s);
      setWeekCount(wc);
    }
    setWorkoutId(null);
    setSets([]);
    setBlocks([]);
    setBlockExercises({});
    setActiveBlockId(null);
    setActiveRowByBlock({});
    setLastSets({});
    setShowFinishModal(false);
    setWorkoutStartTime(null);
    setElapsed(0);
    setWorkoutNotes('');
  }

  // Delete a single set
  async function handleDeleteSet(setId: string) {
    if (!dbCtx || !workoutId) return;
    await deleteSet(dbCtx, setId);
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  // Delete an entire block
  async function handleDeleteBlock(blockId: string) {
    if (!dbCtx || !workoutId) return;
    await deleteBlock(dbCtx, blockId);
    await refreshBlocksAndSets();
  }

  // Move block up/down
  async function moveBlock(blockId: string, direction: 'up' | 'down') {
    const idx = blocks.findIndex((b: any) => b.id === blockId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= blocks.length) return;
    await swapBlockOrder(dbCtx, blockId, blocks[swapIdx].id);
    await refreshBlocksAndSets();
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
    setWorkoutId(newId);
    setWorkoutStartTime(now);
    setElapsed(0);
  }

  function matchesMuscleFilter(mg: string, filter: string): boolean {
    const groups = (mg || '').toLowerCase();
    const map: Record<string, string[]> = {
      chest: ['chest', 'upper_chest'],
      back: ['lats', 'upper_back', 'lower_back', 'rear_delts'],
      legs: ['quads', 'glutes', 'hamstrings', 'calves'],
      shoulders: ['delts', 'front_delts', 'rear_delts'],
      arms: ['biceps', 'triceps'],
      core: ['core', 'abs'],
    };
    return (map[filter] ?? []).some(m => groups.includes(m));
  }

  function filterExercises(list: any[]): any[] {
    let filtered = list;
    if (pickerSearch) filtered = filtered.filter((ex: any) => ex.name.toLowerCase().includes(pickerSearch.toLowerCase()));
    if (muscleFilter) filtered = filtered.filter((ex: any) => matchesMuscleFilter(ex.muscle_groups, muscleFilter));
    return filtered;
  }

  function toggleCollapseBlock(blockId: string) {
    setCollapsedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId); else next.add(blockId);
      return next;
    });
  }

  async function handleShareWorkout() {
    if (!dbCtx || !workoutId) return;
    const detail = await listWorkoutDetail(dbCtx, workoutId);
    // Group sets by exercise
    const exMap = new Map<string, { name: string; sets: any[] }>();
    for (const s of detail) {
      if (!exMap.has(s.exercise_id)) exMap.set(s.exercise_id, { name: s.exercise_name, sets: [] });
      exMap.get(s.exercise_id)!.sets.push(s);
    }
    const text = formatWorkoutSummary(
      { split, date: new Date().toISOString(), elapsed },
      Array.from(exMap.values()),
      unit
    );
    await Share.share({ message: text });
  }

  async function handleSaveAsTemplate() {
    if (!dbCtx || !workoutId || !templateName.trim()) return;
    await saveWorkoutAsTemplate(dbCtx, workoutId, templateName.trim(), Crypto.randomUUID());
    setTemplateSaved(true);
  }

  async function addDropSets(blockId: string, exerciseId: string) {
    if (!dbCtx || !workoutId) return;
    const baseWeight = parseFloat(weight) || 0;
    const drops = [0.8, 0.6, 0.4]; // 80%, 60%, 40%
    const ex = await getExercise(dbCtx, exerciseId);
    const inc = ex?.default_increment ?? 2.5;
    let nextIdx = await getNextSetIndex(dbCtx, workoutId);
    for (const pct of drops) {
      const id = Crypto.randomUUID();
      const dropWeight = roundToIncrement(baseWeight * pct, inc);
      await addSet(dbCtx, { id, workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: dropWeight, reps: parseInt(reps) || 8, rir: 0, is_warmup: 0, block_id: blockId });
      nextIdx++;
    }
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
  }

  async function handleDuplicateBlock(blockId: string) {
    if (!dbCtx || !workoutId) return;
    await duplicateBlock(dbCtx, blockId, workoutId);
    await refreshBlocksAndSets();
  }

  async function confirmSwapExercise() {
    if (!dbCtx || !showSwapModal || !selectedSwapExerciseId || !workoutId) {
      setShowSwapModal(null);
      return;
    }
    const { blockId, oldExerciseId } = showSwapModal;
    await replaceBlockExercise(dbCtx, blockId, oldExerciseId, selectedSwapExerciseId);
    // Add default working sets for the new exercise
    await addDefaultWorkingSets(blockId, selectedSwapExerciseId);
    await refreshBlocksAndSets();
    setShowSwapModal(null);
  }

  useEffect(() => { (async () => { if (dbCtx && workoutId) { await refreshBlocksAndSets(); } })(); }, [dbCtx, workoutId]);
  // Refresh last-time previews when blockExercises change
  useEffect(() => { fetchLastTimePreviews(); }, [blockExercises]);

  return(<View style={[styles.container, {backgroundColor: c.bg}]}>
    <Text style={[styles.h1, {color: c.text}]}>Today</Text>
    {/* PR Banner */}
    {prBanner && (
      <View style={styles.prBanner}>
        <Text style={styles.prBannerText}>NEW PR! {prBanner.exerciseName} — Est. 1RM: {prBanner.est1rm} {unit}</Text>
      </View>
    )}
    {workoutId && workoutStartTime && (
      <Text style={styles.elapsedText}>{formatTime(elapsed)}</Text>
    )}
    {!workoutId && (streak > 0 || weekCount > 0) && (
      <View style={styles.statsRow}>
        {streak > 0 && <Text style={styles.statText}>{streak} day streak</Text>}
        {streak > 0 && weekCount > 0 && <Text style={styles.statDot}>·</Text>}
        {weekCount > 0 && <Text style={styles.statText}>{weekCount} workout{weekCount !== 1 ? 's' : ''} this week</Text>}
      </View>
    )}
    {!workoutId && suggestedDay && programName && (
      <View style={styles.programSuggestion}>
        <Text style={styles.programSuggestionText}>{programName}: Day {suggestedDay.day_order} ({suggestedDay.split.toUpperCase()})</Text>
      </View>
    )}
    {!workoutId && (
      <View style={{gap:4}}>
        <Text style={{fontSize:12,color:'#6b7280'}}>Split</Text>
        <View style={styles.chipsRow}>
          {SPLIT_OPTIONS.map(s => (
            <Pressable key={s} onPress={() => setSplit(s)} style={[styles.chip, split === s && styles.chipSelected]}>
              <Text style={[styles.chipText, split === s && styles.chipTextSelected]}>{s.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    )}
    <View style={styles.row}>
      <Button title={workoutId?'Workout Started':'Start Workout'} onPress={startWorkout} disabled={!!workoutId} />
      {!workoutId && <Button title='Quick Start' color='#6b7280' onPress={handleQuickStart} />}
      <Button title='Equipment' onPress={()=>import('expo-router').then(m=>m.router.push('/equipment'))} />
      <Button title='Plates' color='#6b7280' onPress={()=>{setPlateTarget(weight);setShowPlateCalc(true);}} />
    </View>
    {workoutId && (
      <View style={styles.row}>
        <Button title='Add Exercise' onPress={openAddBlock} />
        <Button title='Finish Workout' color='#059669' onPress={openFinishWorkout} />
      </View>
    )}
    {workoutId && (
      <View style={{gap:4}}>
        <Text style={{fontSize:12,color:'#6b7280'}}>Rest Timer</Text>
        <View style={styles.chipsRow}>
          {REST_OPTIONS.map(sec => (
            <Pressable key={sec} onPress={() => setRestDuration(sec)} style={[styles.chip, restDuration === sec && styles.chipSelected]}>
              <Text style={[styles.chipText, restDuration === sec && styles.chipTextSelected]}>{sec}s</Text>
            </Pressable>
          ))}
        </View>
      </View>
    )}
    <View style={styles.row}>
      <Text>Weight</Text><TextInput value={weight} onChangeText={setWeight} keyboardType='numeric' style={styles.input} />
      <Text>Reps</Text><TextInput value={reps} onChangeText={setReps} keyboardType='numeric' style={styles.input} />
      <Text>RIR</Text>
      <TextInput value={rir} onChangeText={setRir} keyboardType='numeric' style={styles.input} />
      <View style={styles.chipsRow}>
        <RirChip value={3}/>
        <RirChip value={2}/>
        <RirChip value={1}/>
      </View>
    </View>
    {blocks.length>0 && (
      <View style={{marginTop:12,gap:12}}>
        <Text style={styles.h2}>Blocks</Text>
        <ScrollView contentContainerStyle={{gap:12}}>
          {blocks.map((b:any)=>{
            const allBlockSets = sets.filter((s:any)=>s.block_id===b.id);
            const timer = timers[b.id] ?? { timeLeft: restDuration, running: false };
            const exs = blockExercises[b.id] ?? (b.exercise_id ? [{exercise_id:b.exercise_id, exercise_name:b.exercise_name}] : []);
            const workingSets = allBlockSets.filter((s:any) => !s.is_warmup);
            const doneCount = workingSets.filter((s:any) => s.is_completed).length;
            const totalCount = workingSets.length;
            const allDone = totalCount > 0 && doneCount === totalCount;
            return (
              <View key={b.id} style={[styles.blockBox, {backgroundColor: c.blockBg, borderColor: c.blockBorder}, allDone && styles.blockBoxDone]}>
                <View style={[styles.row, {justifyContent:'space-between'}]}>
                  <View style={[styles.row, {gap:4}]}>
                    <Pressable onPress={()=>moveBlock(b.id,'up')} style={styles.moveBtn}><Text style={styles.moveBtnText}>▲</Text></Pressable>
                    <Pressable onPress={()=>moveBlock(b.id,'down')} style={styles.moveBtn}><Text style={styles.moveBtnText}>▼</Text></Pressable>
                    <Pressable onPress={()=>toggleCollapseBlock(b.id)} style={{flexDirection:'row',alignItems:'center',gap:4}}>
                      <Text style={styles.blockTitle}>{collapsedBlocks.has(b.id) ? '▶' : '▼'} {b.order_index}. {(exs[0]?.exercise_name) ?? 'Exercise'}</Text>
                    </Pressable>
                    <Text style={styles.progressBadge}>{doneCount}/{totalCount}</Text>
                  </View>
                  <View style={[styles.row, {gap:4}]}>
                    <Pressable onPress={()=>handleDuplicateBlock(b.id)} style={styles.dupBlockBtn}>
                      <Text style={styles.dupBlockBtnText}>Dup</Text>
                    </Pressable>
                    <Pressable onPress={()=>handleDeleteBlock(b.id)} style={styles.deleteBlockBtn}>
                      <Text style={styles.deleteBlockBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
                {!collapsedBlocks.has(b.id) && <>
                {exs.length===1 && (
                  <Pressable onPress={()=>openMakeSuperset(b.id)}><Text style={{color:'#0ea5a4'}}>Make Superset</Text></Pressable>
                )}
                {exs.map((ex:any)=>{
                  const blockSets = allBlockSets.filter((s:any)=>s.exercise_id===ex.exercise_id);
                  const lastTime = lastSets[ex.exercise_id];
                  return (
                    <View key={ex.exercise_id} style={{gap:6, marginTop:6}}>
                      {exs.length>1 && <Text style={{fontWeight:'600'}}>{ex.exercise_name}</Text>}
                      {/* Last-time preview */}
                      {lastTime && lastTime.length > 0 && (
                        <Text style={styles.lastTimeText}>
                          Last: {lastTime.map((s:any) => `${s.weight}${unit}×${s.reps}${s.rir!=null ? ` @${s.rir}` : ''}`).join(', ')}
                        </Text>
                      )}
                      <View style={{gap:6}}>
                        {blockSets.map((s:any, i:number)=>{
                          const idx = s.set_index;
                          const completed = s.is_completed ? true : false;
                          const complete = s.reps!=null && s.weight!=null;
                          const isBest = bestSetIds.has(s.id);
                          return (
                            <View key={s.id} style={{gap:2}}>
                            <View style={styles.setRow}>
                              <View style={[styles.setBadge, isBest && styles.setBadgeBest]}><Text style={[styles.setBadgeText, isBest && styles.setBadgeTextBest]}>{idx}</Text></View>
                              <View style={styles.setCell}>
                                <Text style={styles.setCellLabel}>Reps</Text>
                                <TextInput
                                  defaultValue={s.reps!=null?String(s.reps):''}
                                  keyboardType='numeric'
                                  returnKeyType='next'
                                  onFocus={()=>{ setActiveBlockId(b.id); setActiveRowByBlock(prev=>({...prev,[b.id]:{exerciseId:ex.exercise_id,row:i}})); }}
                                  onEndEditing={async (e)=>{ if(!dbCtx||!workoutId) return; const v=parseInt(e.nativeEvent.text||''); await updateSet(dbCtx,{id:s.id,reps:isNaN(v)?null:v}); const rows=await listWorkoutSets(dbCtx, workoutId); setSets(rows); }}
                                  style={[styles.setInput, completed? styles.setInputCompleted : (!complete&&{borderColor:'#f59e0b'})]}
                                />
                              </View>
                              <View style={styles.setCell}>
                                <Text style={styles.setCellLabel}>Weight ({unit})</Text>
                                <TextInput
                                  defaultValue={s.weight!=null?String(s.weight):''}
                                  keyboardType='numeric'
                                  returnKeyType='done'
                                  onFocus={()=>{ setActiveBlockId(b.id); setActiveRowByBlock(prev=>({...prev,[b.id]:{exerciseId:ex.exercise_id,row:i}})); }}
                                  onEndEditing={async (e)=>{ if(!dbCtx||!workoutId) return; const v=parseFloat(e.nativeEvent.text||''); await updateSet(dbCtx,{id:s.id,weight:isNaN(v)?null:v}); const rows=await listWorkoutSets(dbCtx, workoutId); setSets(rows); }}
                                  style={[styles.setInput, completed? styles.setInputCompleted : (!complete&&{borderColor:'#f59e0b'})]}
                                />
                              </View>
                              {!completed && (
                                <Pressable onPress={()=>handleDeleteSet(s.id)} style={styles.deleteBtn}>
                                  <Text style={styles.deleteBtnText}>×</Text>
                                </Pressable>
                              )}
                            </View>
                            {/* Per-set note */}
                            <TextInput
                              placeholder='note...'
                              defaultValue={s.notes || ''}
                              onEndEditing={async (e) => { if(!dbCtx) return; const v = e.nativeEvent.text?.trim() || null; await updateSet(dbCtx, { id: s.id, notes: v }); }}
                              style={styles.setNoteInput}
                            />
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.row}>
                        <Button title='+ Set' onPress={()=>logSetForBlock(b.id, ex.exercise_id)} />
                        <Button title='Add Warmups' onPress={()=>addWarmups(b.id, ex.exercise_id)} />
                        <Button title='Drop' color='#8b5cf6' onPress={()=>addDropSets(b.id, ex.exercise_id)} />
                        <Button title='Swap' color='#6b7280' onPress={()=>openSwapExercise(b.id, ex.exercise_id)} />
                      </View>
                    </View>
                  );
                })}
                </>}
                <View style={styles.timerBox}>
                  <Text style={[timer.running ? styles.timerRunning : undefined, timer.running && timer.timeLeft <= 3 && timer.timeLeft > 0 && styles.timerUrgent]}>Rest: {formatTime(timer.timeLeft)}</Text>
                  <View style={styles.row}>
                    <Button title={timer.running?'Pause':'Resume'} onPress={()=>{ if(timer.timeLeft===0){ startRest(b.id, restDuration); } else { pauseResume(b.id); } }} />
                    <Button title='+30s' onPress={()=>setTimers(prev=>({...prev,[b.id]:{...prev[b.id],timeLeft:(prev[b.id]?.timeLeft??0)+30}}))} />
                    <Button title='Reset' onPress={()=>resetTimer(b.id)} />
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    )}
    {/* Workout Notes */}
    {workoutId && (
      <View style={{gap:4}}>
        <Text style={{fontSize:12,color:'#6b7280'}}>Notes</Text>
        <TextInput
          placeholder='How did this workout feel?'
          value={workoutNotes}
          onChangeText={setWorkoutNotes}
          multiline
          style={styles.notesInput}
        />
      </View>
    )}

    {/* Sticky Action Bar */}
    {(()=>{
      const active = activeBlockId ? activeRowByBlock[activeBlockId] : null;
      let valid=false, label='Log Set', handler=undefined as undefined | (()=>void);
      if(active && activeBlockId){
        const perExSets = sets.filter((s:any)=>s.block_id===activeBlockId && s.exercise_id===active.exerciseId);
        if(active.row>=0 && active.row<perExSets.length){
          const s = perExSets[active.row];
          valid = s?.reps!=null && s?.weight!=null;
          const isLast = active.row === perExSets.length-1;
          label = isLast ? 'Log Set & Next Exercise' : 'Log Set';
          handler = ()=>logActiveSet(activeBlockId);
        }
      }
      // Find any running timer to display
      const runningTimer = activeBlockId ? timers[activeBlockId] : null;
      const showTimer = runningTimer && runningTimer.running && runningTimer.timeLeft > 0;
      return (
        <View style={[styles.stickyBar, {backgroundColor: c.stickyBg, borderColor: c.cardBorder}]}>
          {showTimer && (
            <Text style={styles.stickyTimerText}>{formatTime(runningTimer!.timeLeft)}</Text>
          )}
          <Pressable onPress={handler} disabled={!valid} style={[styles.primaryBtn, !valid && styles.primaryBtnDisabled]}>
            <Text style={styles.primaryBtnText}>{label}</Text>
          </Pressable>
        </View>
      );
    })()}

    <Modal visible={showAddBlock} animationType='slide' transparent={true} onRequestClose={()=>setShowAddBlock(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.h2}>Add Exercise</Text>
          <TextInput placeholder='Search exercises...' value={pickerSearch} onChangeText={setPickerSearch} style={styles.searchInput} />
          <View style={[styles.chipsRow, {flexWrap:'wrap',marginBottom:4}]}>
            {MUSCLE_FILTERS.map(mf => (
              <Pressable key={mf} onPress={() => setMuscleFilter(muscleFilter === mf ? null : mf)} style={[styles.chip, {paddingVertical:3,paddingHorizontal:7}, muscleFilter === mf && styles.chipSelected]}>
                <Text style={[{fontSize:11},styles.chipText, muscleFilter === mf && styles.chipTextSelected]}>{mf}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView style={{maxHeight:240}}>
            {filterExercises(exerciseChoices).map((ex:any)=>{
              const selected = selectedExerciseId===ex.id;
              return (
                <Pressable key={ex.id} onPress={()=>setSelectedExerciseId(ex.id)} style={[styles.choiceRow, selected && styles.choiceRowSelected]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{ex.name}</Text>
                  <Text style={[styles.muscleTag, selected && {color:'#d1fae5'}]}>{(ex.muscle_groups||'').replace(/,/g,' · ')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.row}>
            <Button title='Cancel' onPress={()=>setShowAddBlock(false)} />
            <Button title='Add' onPress={confirmAddBlock} disabled={!selectedExerciseId} />
          </View>
        </View>
      </View>
  </Modal>
  {/* Superset modal */}
    <Modal visible={!!showSupersetModal.blockId} animationType='slide' transparent={true} onRequestClose={()=>setShowSupersetModal({blockId:null})}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.h2}>Make Superset</Text>
          <TextInput placeholder='Search exercises...' value={pickerSearch} onChangeText={setPickerSearch} style={styles.searchInput} />
          <ScrollView style={{maxHeight:240}}>
            {filterExercises(supersetChoices).map((ex:any)=>{
              const selected = selectedSupersetExerciseId===ex.id;
              return (
                <Pressable key={ex.id} onPress={()=>setSelectedSupersetExerciseId(ex.id)} style={[styles.choiceRow, selected && styles.choiceRowSelected]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{ex.name}</Text>
                  <Text style={[styles.muscleTag, selected && {color:'#d1fae5'}]}>{(ex.muscle_groups||'').replace(/,/g,' · ')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.row}>
            <Button title='Cancel' onPress={()=>setShowSupersetModal({blockId:null})} />
            <Button title='Add' onPress={confirmMakeSuperset} disabled={!selectedSupersetExerciseId} />
          </View>
        </View>
      </View>
    </Modal>
    {/* Finish Workout Modal */}
    <Modal visible={showFinishModal} animationType='fade' transparent={true} onRequestClose={()=>setShowFinishModal(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.h2}>Workout Complete!</Text>
          <Text style={{fontWeight:'600',marginTop:4}}>Summary</Text>
          {(()=>{
            const completedSets = sets.filter((s:any)=>s.is_completed && !s.is_warmup);
            const totalVol = completedSets.reduce((sum:number, s:any) => sum + ((s.weight||0) * (s.reps||0)), 0);
            return <Text>{blocks.length} exercise{blocks.length!==1?'s':''} · {completedSets.length} sets · {Math.round(totalVol).toLocaleString()} {unit} total volume · {formatTime(elapsed)}</Text>;
          })()}
          {Object.keys(weeklyVolume).length > 0 && (
            <View style={{marginTop:8}}>
              <Text style={{fontWeight:'600',marginBottom:4}}>Weekly Volume (hard sets)</Text>
              {Object.entries(weeklyVolume).sort((a,b)=>b[1]-a[1]).map(([mg, count])=>(
                <View key={mg} style={styles.volumeRow}>
                  <Text style={styles.volumeLabel}>{mg.replace(/_/g,' ')}</Text>
                  <View style={[styles.volumeBar, {width: Math.min(count * 12, 200)}]} />
                  <Text style={styles.volumeCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}
          {workoutNotes.trim() ? (
            <View style={{marginTop:4}}>
              <Text style={{fontWeight:'600',marginBottom:2}}>Notes</Text>
              <Text style={{color:'#4b5563',fontSize:13,fontStyle:'italic'}}>{workoutNotes}</Text>
            </View>
          ) : null}
          {/* Body weight prompt */}
          <View style={{marginTop:8,gap:4}}>
            <Text style={{fontSize:12,color:'#6b7280'}}>Log body weight (optional)</Text>
            <TextInput placeholder={`Body weight (${unit})`} value={finishBwInput} onChangeText={setFinishBwInput} keyboardType='numeric' style={styles.finishInput} />
          </View>
          {/* Save as template */}
          <View style={{marginTop:4,gap:4}}>
            {!templateSaved ? (
              <View style={styles.row}>
                <TextInput placeholder='Template name...' value={templateName} onChangeText={setTemplateName} style={[styles.finishInput, {flex:1}]} />
                <Button title='Save Template' onPress={handleSaveAsTemplate} disabled={!templateName.trim()} />
              </View>
            ) : (
              <Text style={{color:'#059669',fontWeight:'600',fontSize:13}}>Template saved!</Text>
            )}
          </View>
          <View style={[styles.row, {marginTop:8}]}>
            <Button title='Share' color='#6b7280' onPress={handleShareWorkout} />
            <Button title='Back' onPress={()=>setShowFinishModal(false)} />
            <Button title='Done' color='#059669' onPress={confirmFinishWorkout} />
          </View>
        </View>
      </View>
    </Modal>
    {/* Swap Exercise Modal */}
    <Modal visible={!!showSwapModal} animationType='slide' transparent={true} onRequestClose={()=>setShowSwapModal(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.h2}>Swap Exercise</Text>
          <TextInput placeholder='Search exercises...' value={pickerSearch} onChangeText={setPickerSearch} style={styles.searchInput} />
          <ScrollView style={{maxHeight:240}}>
            {filterExercises(swapChoices).map((ex:any)=>{
              const selected = selectedSwapExerciseId===ex.id;
              return (
                <Pressable key={ex.id} onPress={()=>setSelectedSwapExerciseId(ex.id)} style={[styles.choiceRow, selected && styles.choiceRowSelected]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{ex.name}</Text>
                  <Text style={[styles.muscleTag, selected && {color:'#d1fae5'}]}>{(ex.muscle_groups||'').replace(/,/g,' · ')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.row}>
            <Button title='Cancel' onPress={()=>setShowSwapModal(null)} />
            <Button title='Swap' onPress={confirmSwapExercise} disabled={!selectedSwapExerciseId} />
          </View>
        </View>
      </View>
    </Modal>
    {/* Plate Calculator Modal */}
    <Modal visible={showPlateCalc} animationType='fade' transparent onRequestClose={()=>setShowPlateCalc(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.h2}>Plate Calculator</Text>
          <TextInput placeholder={`Target weight (${unit})`} value={plateTarget} onChangeText={setPlateTarget} keyboardType='numeric' style={styles.searchInput} />
          <Text style={{fontSize:12,color:'#6b7280'}}>Bar: {BAR_WEIGHT[unit]} {unit}</Text>
          {(()=>{
            const target = parseFloat(plateTarget) || 0;
            const bar = BAR_WEIGHT[unit];
            if (target <= bar) return <Text style={{color:'#9ca3af'}}>Weight must exceed bar weight ({bar} {unit})</Text>;
            const plates = calculatePlates(target, bar, unit);
            if (plates.length === 0) return <Text style={{color:'#9ca3af'}}>No plates needed</Text>;
            return (
              <View style={{gap:6,marginTop:4}}>
                <Text style={{fontWeight:'600',fontSize:13}}>Per side:</Text>
                {plates.map(p => (
                  <View key={p.plate} style={styles.plateRow}>
                    <View style={[styles.plateVisual, {width: Math.max(30, p.plate * (unit==='lb' ? 1.2 : 2.5))}]}>
                      <Text style={styles.plateText}>{p.plate}</Text>
                    </View>
                    <Text style={styles.plateCount}>×{p.count}</Text>
                  </View>
                ))}
                <Text style={{fontSize:12,color:'#6b7280',marginTop:4}}>
                  Total: {bar} + {plates.reduce((s,p)=>s+p.plate*p.count*2,0)} = {bar + plates.reduce((s,p)=>s+p.plate*p.count*2,0)} {unit}
                </Text>
              </View>
            );
          })()}
          <Button title='Close' onPress={()=>setShowPlateCalc(false)} />
        </View>
      </View>
    </Modal>
  </View>);
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,gap:12,paddingBottom:120},
  h1:{fontSize:24,fontWeight:'600'},
  h2:{fontSize:18,fontWeight:'600'},
  row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
  input:{borderWidth:1,borderColor:'#ccc',padding:8,width:70,borderRadius:8},
  chipsRow:{flexDirection:'row',gap:8,alignItems:'center'},
  chip:{paddingVertical:6,paddingHorizontal:10,borderRadius:999,borderWidth:1,borderColor:'#aaa'},
  chipSelected:{backgroundColor:'#222',borderColor:'#222'},
  chipText:{color:'#222',fontWeight:'600'},
  chipTextSelected:{color:'#fff'},
  timerBox:{paddingVertical:8,gap:6},
  timerText:{fontSize:32,fontWeight:'700'},
  blockBox:{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:8,gap:6},
  blockTitle:{fontWeight:'600'},
  modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.3)',justifyContent:'center',padding:16},
  modalCard:{backgroundColor:'#fff',borderRadius:12,padding:16,gap:12},
  choiceRow:{padding:10,borderRadius:8,borderWidth:1,borderColor:'#e5e5e5',marginBottom:8},
  choiceRowSelected:{backgroundColor:'#0ea5a4'},
  choiceText:{color:'#111'},
  choiceTextSelected:{color:'#fff',fontWeight:'600'},
  setRow:{flexDirection:'row',alignItems:'center',gap:8},
  setBadge:{width:24,height:24,borderRadius:12,backgroundColor:'#eee',alignItems:'center',justifyContent:'center'},
  setBadgeText:{fontWeight:'600',color:'#333'},
  setCell:{flexDirection:'column',minWidth:90,paddingVertical:4,paddingHorizontal:8,borderWidth:1,borderColor:'#e5e5e5',borderRadius:8},
  setCellLabel:{fontSize:11,color:'#666'},
  setCellValue:{fontSize:14,fontWeight:'600',color:'#111'},
  setInput:{fontSize:14,fontWeight:'600',color:'#111',borderWidth:1,borderColor:'#e5e5e5',borderRadius:6,paddingVertical:4,paddingHorizontal:8,minWidth:60},
  setInputCompleted:{color:'#065f46',borderColor:'#34d399'},
  stickyBar:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:'#ffffffee',padding:12,paddingBottom:24,borderTopWidth:1,borderColor:'#e5e5e5',alignItems:'center',zIndex:50},
  primaryBtn:{backgroundColor:'#ef4444',paddingVertical:12,paddingHorizontal:16,borderRadius:999},
  primaryBtnDisabled:{backgroundColor:'#fecaca'},
  primaryBtnText:{color:'#fff',fontWeight:'700'},
  lastTimeText:{fontSize:12,color:'#6b7280',fontStyle:'italic'},
  prBanner:{backgroundColor:'#fbbf24',padding:10,borderRadius:8,marginBottom:4},
  prBannerText:{fontWeight:'700',color:'#78350f',textAlign:'center',fontSize:14},
  timerRunning:{fontWeight:'700',color:'#ef4444'},
  stickyTimerText:{fontSize:18,fontWeight:'700',color:'#ef4444',marginBottom:4},
  volumeRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:2},
  volumeLabel:{fontSize:12,color:'#374151',width:90,textTransform:'capitalize'},
  volumeBar:{height:10,backgroundColor:'#3b82f6',borderRadius:4},
  volumeCount:{fontSize:12,fontWeight:'600',color:'#1f2937'},
  elapsedText:{fontSize:14,fontWeight:'600',color:'#6b7280',textAlign:'right'},
  deleteBtn:{width:24,height:24,borderRadius:12,backgroundColor:'#fee2e2',alignItems:'center',justifyContent:'center'},
  deleteBtnText:{color:'#ef4444',fontWeight:'700',fontSize:16,lineHeight:18},
  deleteBlockBtn:{paddingHorizontal:8,paddingVertical:2},
  deleteBlockBtnText:{color:'#ef4444',fontSize:12,fontWeight:'600'},
  moveBtn:{width:22,height:22,borderRadius:4,backgroundColor:'#f3f4f6',alignItems:'center',justifyContent:'center'},
  moveBtnText:{fontSize:10,color:'#6b7280'},
  searchInput:{borderWidth:1,borderColor:'#d1d5db',borderRadius:8,padding:8,fontSize:14,marginBottom:4},
  muscleTag:{fontSize:11,color:'#9ca3af',marginTop:2},
  blockBoxDone:{borderColor:'#34d399',backgroundColor:'#f0fdf4'},
  progressBadge:{fontSize:11,fontWeight:'600',color:'#6b7280',backgroundColor:'#f3f4f6',paddingHorizontal:6,paddingVertical:1,borderRadius:4},
  programSuggestion:{backgroundColor:'#eff6ff',borderWidth:1,borderColor:'#93c5fd',borderRadius:8,padding:8},
  programSuggestionText:{fontSize:13,fontWeight:'600',color:'#1d4ed8',textAlign:'center'},
  statsRow:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center',paddingVertical:4},
  statText:{fontSize:13,fontWeight:'600',color:'#6b7280'},
  statDot:{fontSize:13,color:'#d1d5db'},
  notesInput:{borderWidth:1,borderColor:'#d1d5db',borderRadius:8,padding:8,fontSize:14,minHeight:48,textAlignVertical:'top'},
  dupBlockBtn:{paddingHorizontal:6,paddingVertical:2,backgroundColor:'#e0e7ff',borderRadius:4},
  dupBlockBtnText:{color:'#4338ca',fontSize:11,fontWeight:'600'},
  setNoteInput:{fontSize:11,color:'#6b7280',paddingVertical:1,paddingHorizontal:8,fontStyle:'italic',minHeight:18},
  timerUrgent:{fontSize:18,fontWeight:'800',color:'#dc2626'},
  finishInput:{borderWidth:1,borderColor:'#d1d5db',borderRadius:6,padding:6,fontSize:14},
  setBadgeBest:{backgroundColor:'#fef3c7',borderWidth:1,borderColor:'#f59e0b'},
  setBadgeTextBest:{color:'#d97706'},
  plateRow:{flexDirection:'row',alignItems:'center',gap:8},
  plateVisual:{height:28,backgroundColor:'#374151',borderRadius:4,alignItems:'center',justifyContent:'center'},
  plateText:{color:'#fff',fontWeight:'700',fontSize:12},
  plateCount:{fontSize:14,fontWeight:'600',color:'#374151'},
});
