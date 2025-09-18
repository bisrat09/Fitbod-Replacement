import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Pressable, Vibration } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, createWorkout, addSet, listWorkoutSets, createExercise } from '@/lib/dao';
import * as Crypto from 'expo-crypto';
import { suggestNextWeight } from '@/lib/progression';

export default function Today(){
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [weight, setWeight] = useState('185');
  const [reps, setReps] = useState('5');
  const [rir, setRir] = useState('2');
  const [sets, setSets] = useState<any[]>([]);
  const DEFAULT_REST = 120;
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_REST);
  const [running, setRunning] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(()=>{(async()=>{
    const { db, userId } = await bootstrapDb();
    const ctx = { db, userId };
    await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
    const benchId = Crypto.randomUUID();
    await createExercise(ctx, { id: benchId, name: 'Barbell Bench Press', muscle_groups: 'chest,triceps,front_delts', is_compound: 1 });
    setExerciseId(benchId);
    setDbCtx(ctx);
  })();},[]);

  async function startWorkout(){
    if(!dbCtx) return;
    const id = Crypto.randomUUID();
    await createWorkout(dbCtx, { id, date: new Date().toISOString(), split: 'push' });
    setWorkoutId(id); setSets([]);
  }

  async function logSet(){
    if(!dbCtx || !workoutId || !exerciseId) return;
    const id = Crypto.randomUUID();
    await addSet(dbCtx, { id, workout_id: workoutId, exercise_id: exerciseId, set_index: sets.length+1, weight: parseFloat(weight), reps: parseInt(reps), rir: parseInt(rir), is_warmup: 0 });
    const rows = await listWorkoutSets(dbCtx, workoutId);
    setSets(rows);
    // Prefill next-set weight based on progression target RIR 2 and 2.5 increment
    const prevWeight = parseFloat(weight);
    const prevRir = isNaN(parseInt(rir)) ? null : parseInt(rir);
    const next = suggestNextWeight(prevWeight, prevRir, 2, 2.5);
    setWeight(String(next));
    // Auto-start rest timer
    startRest(DEFAULT_REST);
  }

  function startRest(duration:number){
    clearTimer();
    setTimeLeft(duration);
    setRunning(true);
  }

  function clearTimer(){
    if(intervalRef.current){
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(()=>{
    if(!running){
      clearTimer();
      return;
    }
    intervalRef.current = setInterval(()=>{
      setTimeLeft((t)=>{
        if(t<=1){
          // reached 0
          clearTimer();
          setRunning(false);
          setTimeout(()=>Vibration.vibrate(400),0);
          return 0;
        }
        return t-1;
      });
    },1000);
    return ()=>{ clearTimer(); };
  },[running]);

  function formatTime(sec:number){
    const m = Math.floor(sec/60);
    const s = sec%60;
    const mm = String(m).padStart(2,'0');
    const ss = String(s).padStart(2,'0');
    return `${mm}:${ss}`;
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

  return(<View style={styles.container}>
    <Text style={styles.h1}>Today</Text>
    <Button title={workoutId?'Workout Started':'Start Workout'} onPress={startWorkout} disabled={!!workoutId} />
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
      <Button title='+ Set' onPress={logSet} disabled={!workoutId} />
    </View>
    <View style={styles.timerBox}>
      <Text style={styles.h2}>Rest Timer</Text>
      <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      <View style={styles.row}>
        <Button title={running?'Pause':'Resume'} onPress={()=>{ if(timeLeft===0){ startRest(DEFAULT_REST); } else { setRunning(r=>!r); } }} />
        <Button title='Reset' onPress={()=>{ setRunning(false); setTimeLeft(DEFAULT_REST); }} />
      </View>
    </View>
    <View style={{marginTop:12}}>
      <Text style={styles.h2}>Logged Sets</Text>
      {sets.map((s:any)=>(<Text key={s.id}>{s.set_index}. {s.exercise_name} — {s.weight} x {s.reps} (RIR {s.rir})</Text>))}
    </View>
  </View>);
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,gap:12},
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
});
