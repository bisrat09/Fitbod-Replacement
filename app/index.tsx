import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Pressable, Vibration, Modal, ScrollView } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, createWorkout, addSet, listWorkoutSets, createExercise, listBlocksWithExercises, createBlock, addBlockExercise, listExercisesAvailableByEquipment, getExercise, findExerciseByName, listExercises, getNextSetIndex, updateSet, listBlockExercisesWithNames, listFavoriteExerciseIds } from '@/lib/dao';
import * as Crypto from 'expo-crypto';
import { suggestNextWeight, generateWarmupWeights } from '@/lib/progression';

export default function Today(){
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
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
  const DEFAULT_REST = 120;
  const [timers, setTimers] = useState<Record<string,{timeLeft:number;running:boolean}>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timer>>({});
  const [activeRowByBlock, setActiveRowByBlock] = useState<Record<string, {exerciseId:string; row:number}>>({});
  const [activeBlockId, setActiveBlockId] = useState<string|null>(null);
  // DB-backed completion via sets.is_completed; no separate memory needed

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
    ];
    let defaultExId: string | null = null;
    for(const s of seed){
      const existing = await findExerciseByName(ctx, s.name);
      if(existing){
        if(s.name==='Barbell Bench Press') defaultExId = existing.id;
        continue;
      }
      const id = Crypto.randomUUID();
      if(s.name==='Barbell Bench Press') defaultExId = id;
      await createExercise(ctx, {
        id,
        name: s.name,
        muscle_groups: s.mg,
        is_compound: 1,
        required_equipment: s.req,
        tags: 'primary',
        default_increment: 2.5,
      });
    }
    if(!defaultExId){
      const exs = await listExercises(ctx);
      defaultExId = exs?.[0]?.id ?? null;
    }
    setExerciseId(defaultExId ?? null);
    setDbCtx(ctx);
  })();},[]);

  async function startWorkout(){
    if(!dbCtx) return;
    const id = Crypto.randomUUID();
    await createWorkout(dbCtx, { id, date: new Date().toISOString(), split: 'push' });
    setWorkoutId(id); setSets([]); setBlocks([]);
  }

  async function logSetForBlock(blockId:string, exerciseId:string){
    if(!dbCtx || !workoutId) return;
    const id = Crypto.randomUUID();
    const nextIdx = await getNextSetIndex(dbCtx, workoutId);
    await addSet(dbCtx, { id, workout_id: workoutId, exercise_id: exerciseId, set_index: nextIdx, weight: parseFloat(weight), reps: parseInt(reps), rir: parseInt(rir), is_warmup: 0, block_id: blockId });
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
    // Prefill next-set weight
    const prevWeight = parseFloat(weight);
    const prevRir = isNaN(parseInt(rir)) ? null : parseInt(rir);
    const next = suggestNextWeight(prevWeight, prevRir, 2, 2.5);
    setWeight(String(next));
    // Start per-block rest timer
    startRest(blockId, DEFAULT_REST);
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
        if(next===0){
          clearInterval(intervalRefs.current[blockId]);
          delete intervalRefs.current[blockId];
          setTimeout(()=>Vibration.vibrate(400),0);
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
    setTimers(prev=>({ ...prev, [blockId]: { timeLeft: DEFAULT_REST, running: false } }));
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
    startRest(blockId, DEFAULT_REST);
    // If last row, advance to next exercise
    if(active.row === perExSets.length-1){
      const exs = blockExercises[blockId] ?? [];
      const idxEx = exs.findIndex((e:any)=>e.exercise_id===active.exerciseId);
      if(idxEx>=0 && idxEx<exs.length-1){
        const nextEx = exs[idxEx+1];
        setActiveRowByBlock(prev=>({ ...prev, [blockId]: { exerciseId: nextEx.exercise_id, row: 0 } }));
      } else {
        const idxBlock = blocks.findIndex((x:any)=>x.id===blockId);
        const nextBlock = idxBlock>=0 && idxBlock<blocks.length-1 ? blocks[idxBlock+1] : null;
        if(nextBlock){
          const nextEx = (blockExercises[nextBlock.id] ?? [])[0];
          if(nextEx){ setActiveRowByBlock(prev=>({ ...prev, [nextBlock.id]: { exerciseId: nextEx.exercise_id, row: 0 } })); }
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
    const [exs, favIds] = await Promise.all([
      listExercisesAvailableByEquipment(dbCtx),
      listFavoriteExerciseIds(dbCtx)
    ]);
    // order: favorites first, then others
    const favSet = new Set(favIds);
    const fav = exs.filter((e:any)=>favSet.has(e.id));
    const others = exs.filter((e:any)=>!favSet.has(e.id));
    setExerciseChoices([...fav, ...others]);
    setSelectedExerciseId(exs?.[0]?.id ?? null);
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
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    const rirVal = isNaN(parseInt(rir)) ? null : parseInt(rir);
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

  useEffect(()=>{ (async()=>{ if(dbCtx && workoutId){ await refreshBlocksAndSets(); } })(); },[dbCtx, workoutId]);

  return(<View style={styles.container}>
    <Text style={styles.h1}>Today</Text>
    <View style={styles.row}>
      <Button title={workoutId?'Workout Started':'Start Workout'} onPress={startWorkout} disabled={!!workoutId} />
      <Button title='Equipment' onPress={()=>import('expo-router').then(m=>m.router.push('/equipment'))} />
      <Button title='Exercises' onPress={()=>import('expo-router').then(m=>m.router.push('/exercises'))} />
    </View>
    {workoutId && (
      <Button title='Add Exercise' onPress={openAddBlock} />
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
            const timer = timers[b.id] ?? { timeLeft: DEFAULT_REST, running: false };
            const exs = blockExercises[b.id] ?? (b.exercise_id ? [{exercise_id:b.exercise_id, exercise_name:b.exercise_name}] : []);
            return (
              <View key={b.id} style={styles.blockBox}>
                <Text style={styles.blockTitle}>{b.order_index}. {(exs[0]?.exercise_name) ?? 'Exercise'}</Text>
                {exs.length===1 && (
                  <Pressable onPress={()=>openMakeSuperset(b.id)}><Text style={{color:'#0ea5a4'}}>Make Superset</Text></Pressable>
                )}
                {exs.map((ex:any)=>{
                  const blockSets = allBlockSets.filter((s:any)=>s.exercise_id===ex.exercise_id);
                  return (
                    <View key={ex.exercise_id} style={{gap:6, marginTop:6}}>
                      {exs.length>1 && <Text style={{fontWeight:'600'}}>{ex.exercise_name}</Text>}
                      <View style={{gap:6}}>
                        {blockSets.map((s:any, i:number)=>{
                          const idx = s.set_index;
                          const completed = s.is_completed ? true : false;
                          const complete = s.reps!=null && s.weight!=null;
                          return (
                            <View key={s.id} style={styles.setRow}>
                              <View style={styles.setBadge}><Text style={styles.setBadgeText}>{idx}</Text></View>
                              <View style={styles.setCell}>
                                <Text style={styles.setCellLabel}>Reps</Text>
                                <TextInput
                                  defaultValue={s.reps!=null?String(s.reps):''}
                                  keyboardType='numeric'
                                  returnKeyType='next'
                                  onFocus={()=>{ setActiveBlockId(b.id); setActiveRowByBlock(prev=>({...prev,[b.id]:{exerciseId:ex.exercise_id,row:i}})); }}
                                  onEndEditing={async (e)=>{ const v=parseInt(e.nativeEvent.text||''); await updateSet(dbCtx,{id:s.id,reps:isNaN(v)?null:v}); const rows=await listWorkoutSets(dbCtx, workoutId!); setSets(rows); }}
                                  style={[styles.setInput, completed? styles.setInputCompleted : (!complete&&{borderColor:'#f59e0b'})]}
                                />
                              </View>
                              <View style={styles.setCell}>
                                <Text style={styles.setCellLabel}>Weight (lb)</Text>
                                <TextInput
                                  defaultValue={s.weight!=null?String(s.weight):''}
                                  keyboardType='numeric'
                                  returnKeyType='done'
                                  onFocus={()=>{ setActiveBlockId(b.id); setActiveRowByBlock(prev=>({...prev,[b.id]:{exerciseId:ex.exercise_id,row:i}})); }}
                                  onEndEditing={async (e)=>{ const v=parseFloat(e.nativeEvent.text||''); await updateSet(dbCtx,{id:s.id,weight:isNaN(v)?null:v}); const rows=await listWorkoutSets(dbCtx, workoutId!); setSets(rows); }}
                                  style={[styles.setInput, completed? styles.setInputCompleted : (!complete&&{borderColor:'#f59e0b'})]}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.row}>
                        <Button title='+ Set' onPress={()=>logSetForBlock(b.id, ex.exercise_id)} />
                        <Button title='Add Warmups' onPress={()=>addWarmups(b.id, ex.exercise_id)} />
                      </View>
                    </View>
                  );
                })}
                {/* Inline CTA removed; sticky action bar handles logging */}
                <View style={styles.timerBox}>
                  <Text>Rest: {formatTime(timer.timeLeft)}</Text>
                  <View style={styles.row}>
                    <Button title={timer.running?'Pause':'Resume'} onPress={()=>{ if(timer.timeLeft===0){ startRest(b.id, DEFAULT_REST); } else { pauseResume(b.id); } }} />
                    <Button title='Reset' onPress={()=>resetTimer(b.id)} />
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    )}
    {/* Logged Sets hidden to make room for sticky action bar */}

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
      return (
        <View style={styles.stickyBar}>
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
          <Text>Select Exercise</Text>
          <ScrollView style={{maxHeight:240}}>
            {exerciseChoices.map((ex:any)=>{
              const selected = selectedExerciseId===ex.id;
              return (
                <Pressable key={ex.id} onPress={()=>setSelectedExerciseId(ex.id)} style={[styles.choiceRow, selected && styles.choiceRowSelected]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{ex.name}</Text>
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
          <Text>Select another exercise</Text>
          <ScrollView style={{maxHeight:240}}>
            {supersetChoices.map((ex:any)=>{
              const selected = selectedSupersetExerciseId===ex.id;
              return (
                <Pressable key={ex.id} onPress={()=>setSelectedSupersetExerciseId(ex.id)} style={[styles.choiceRow, selected && styles.choiceRowSelected]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{ex.name}</Text>
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
});
