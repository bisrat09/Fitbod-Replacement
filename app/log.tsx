import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, getUserUnit } from '@/lib/dao';

export default function LogScreen(){
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [recentByDate, setRecentByDate] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb'|'kg'>('lb');

  useEffect(()=>{(async()=>{
    const { db, userId } = await bootstrapDb();
    const ctx = { db, userId };
    await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
    setDbCtx(ctx);
    const u = await getUserUnit(ctx);
    setUnit(u);
  })();},[]);

  useEffect(()=>{(async()=>{
    if(!dbCtx) return;
    const rows = await dbCtx.db.getAllAsync(`
      SELECT s.*, ex.name AS exercise_name, w.date AS workout_date
      FROM sets s
      JOIN exercises ex ON ex.id=s.exercise_id
      JOIN workouts w ON w.id = s.workout_id
      WHERE s.user_id=?
      ORDER BY w.date DESC, s.set_index ASC
      LIMIT 100
    `,[dbCtx.userId]);
    const by: Record<string, any[]> = {};
    for(const r of rows){
      const key = (r.workout_date || '').slice(0,10);
      if(!by[key]) by[key] = [];
      by[key].push(r);
    }
    setRecentByDate(by);
  })();},[dbCtx]);

  function formatHeader(key:string){
    try{
      const d = new Date(key);
      const today = new Date();
      const yday = new Date(); yday.setDate(today.getDate()-1);
      const fmt = (x:Date)=>x.toISOString().slice(0,10);
      if(fmt(d)===fmt(today)) return 'Today';
      if(fmt(d)===fmt(yday)) return 'Yesterday';
      return d.toLocaleDateString();
    }catch{ return key; }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Log</Text>
      {Object.keys(recentByDate).length===0 ? (
        <Text style={{color:'#666'}}>No recent activity yet.</Text>
      ) : (
        Object.entries(recentByDate).map(([key, list])=> (
          <View key={key} style={{marginBottom:12}}>
            <Text style={styles.section}>{formatHeader(key)}</Text>
            {list.map((s:any)=> (
              <View key={s.id} style={styles.rowItem}>
                <Text style={styles.title}>{s.exercise_name}</Text>
                <Text style={styles.meta}>{s.reps ?? '-'} reps • {s.weight ?? '-'} {unit}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,gap:12},
  h1:{fontSize:24,fontWeight:'600'},
  section:{fontSize:16,fontWeight:'700',marginTop:8,marginBottom:4},
  rowItem:{paddingVertical:8,borderBottomWidth:1,borderColor:'#eee'},
  title:{fontWeight:'600'},
  meta:{color:'#666'},
});
