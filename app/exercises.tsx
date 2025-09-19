import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, findExerciseByName, createExercise, listFavoriteExerciseIds, listFavoriteExercises, addFavoriteExercise, removeFavoriteExercise } from '@/lib/dao';

const CATALOG = [
  { name: 'Barbell Bench Press', req: 'barbell,bench', mg: 'chest,triceps,front_delts' },
  { name: 'Dumbbell Bench Press', req: 'dumbbells,bench', mg: 'chest,triceps,front_delts' },
  { name: 'Incline Dumbbell Press', req: 'dumbbells,bench', mg: 'upper_chest,front_delts,triceps' },
  { name: 'Back Squat', req: 'barbell,rack', mg: 'quads,glutes,hamstrings' },
  { name: 'Front Squat', req: 'barbell,rack', mg: 'quads,core' },
  { name: 'Deadlift', req: 'barbell', mg: 'posterior_chain,glutes,hamstrings' },
  { name: 'Romanian Deadlift', req: 'barbell', mg: 'hamstrings,glutes' },
  { name: 'Pull-up', req: 'pullup_bar', mg: 'lats,biceps,upper_back' },
  { name: 'Lat Pulldown', req: 'cable', mg: 'lats,biceps' },
  { name: 'Cable Row', req: 'cable', mg: 'lats,upper_back,biceps' },
  { name: 'Overhead Press', req: 'barbell,rack', mg: 'delts,triceps,upper_chest' },
  { name: 'Dumbbell Shoulder Press', req: 'dumbbells,bench', mg: 'delts,triceps' },
  { name: 'Barbell Curl', req: 'barbell', mg: 'biceps' },
  { name: 'Dumbbell Curl', req: 'dumbbells', mg: 'biceps' },
  { name: 'Tricep Rope Pushdown', req: 'cable', mg: 'triceps' },
  { name: 'Cable Fly', req: 'cable', mg: 'chest' },
];

export default function ExerciseLibrary(){
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [favNames, setFavNames] = useState<Set<string>>(new Set());

  useEffect(()=>{(async()=>{
    const { db, userId } = await bootstrapDb();
    const ctx = { db, userId };
    await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
    setDbCtx(ctx);
    const ids = await listFavoriteExerciseIds(ctx);
    setFavIds(new Set(ids));
    const favs = await listFavoriteExercises(ctx);
    setFavNames(new Set(favs.map((f:any)=>f.name)));
  })();},[]);

  async function toggle(name:string, req:string, mg:string){
    if(!dbCtx) return;
    let ex = await findExerciseByName(dbCtx, name);
    if(!ex){
      const id = (await import('expo-crypto')).randomUUID();
      await createExercise(dbCtx, { id, name, muscle_groups: mg, is_compound: 1, required_equipment: req, tags: 'primary', default_increment: 2.5 });
      ex = await findExerciseByName(dbCtx, name);
    }
    if(!ex) return;
    if(favIds.has(ex.id)){
      await removeFavoriteExercise(dbCtx, ex.id);
    }else{
      await addFavoriteExercise(dbCtx, ex.id);
    }
    const ids = await listFavoriteExerciseIds(dbCtx);
    setFavIds(new Set(ids));
    const favs = await listFavoriteExercises(dbCtx);
    setFavNames(new Set(favs.map((f:any)=>f.name)));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Exercise Library</Text>
      <Text style={{color:'#666'}}>Tap to toggle which exercises appear first when adding to a workout.</Text>
      <ScrollView contentContainerStyle={{gap:8}}>
        {CATALOG.map(item=>{
          const active = favNames.has(item.name);
          return (
            <Pressable key={item.name} onPress={()=>toggle(item.name,item.req,item.mg)} style={[styles.row, active && styles.rowSelected]}>
              <Text style={[styles.rowText, active && { color: '#fff' }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,gap:12},
  h1:{fontSize:24,fontWeight:'600'},
  row:{padding:12,borderWidth:1,borderColor:'#e5e5e5',borderRadius:8},
  rowSelected:{backgroundColor:'#0ea5a4'},
  rowText:{color:'#111',fontWeight:'600'},
});
