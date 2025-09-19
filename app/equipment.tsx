import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Pressable } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listEquipment, addEquipment, removeEquipment } from '@/lib/dao';

const COMMON_ITEMS = ['barbell', 'rack', 'bench', 'dumbbells', 'pullup_bar', 'cable'];

export default function EquipmentScreen(){
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(()=>{(async()=>{
    const { db, userId } = await bootstrapDb();
    const ctx = { db, userId };
    await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
    setDbCtx(ctx);
    const rows = await listEquipment(ctx);
    setItems(rows.map(r=>r.item));
  })();},[]);

  async function refresh(){
    if(!dbCtx) return;
    const rows = await listEquipment(dbCtx);
    setItems(rows.map(r=>r.item));
  }

  async function addItem(item:string){
    if(!dbCtx) return;
    const val = item.trim();
    if(!val) return;
    await addEquipment(dbCtx, val);
    setNewItem('');
    await refresh();
  }

  async function toggleCommon(item:string){
    if(!dbCtx) return;
    if(items.includes(item)){
      await removeEquipment(dbCtx, item);
    }else{
      await addEquipment(dbCtx, item);
    }
    await refresh();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Your Equipment</Text>
      <View style={styles.row}>
        <TextInput placeholder='Add equipment (e.g., barbell)' value={newItem} onChangeText={setNewItem} style={styles.input} />
        <Button title='Add' onPress={()=>addItem(newItem)} />
      </View>
      <Text style={styles.h2}>Quick Toggle</Text>
      <View style={styles.chipsRow}>
        {COMMON_ITEMS.map(it=>{
          const selected = items.includes(it);
          return (
            <Pressable key={it} onPress={()=>toggleCommon(it)} style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{it}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.h2}>Selected</Text>
      {items.length===0 ? <Text style={{color:'#666'}}>None yet</Text> : items.map(it=>(<Text key={it}>• {it}</Text>))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,padding:16,gap:12},
  h1:{fontSize:24,fontWeight:'600'},
  h2:{fontSize:18,fontWeight:'600'},
  row:{flexDirection:'row',alignItems:'center',gap:8},
  input:{flex:1,borderWidth:1,borderColor:'#ccc',padding:8,borderRadius:8},
  chipsRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  chip:{paddingVertical:6,paddingHorizontal:10,borderRadius:999,borderWidth:1,borderColor:'#aaa'},
  chipSelected:{backgroundColor:'#222',borderColor:'#222'},
  chipText:{color:'#222',fontWeight:'600'},
  chipTextSelected:{color:'#fff'},
});

