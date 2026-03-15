export const epley1RM=(w:number,r:number)=>w*(1+r/30);export function roundToIncrement(x:number,inc:number){const n=Math.round(x/inc)*inc;return Math.max(0,Math.round(n*1000)/1000);}export function suggestNextWeight(prevWeight:number,prevRir:number|null,targetRir:number,increment:number){if(prevRir===null||prevRir===undefined)return roundToIncrement(prevWeight,increment);const delta=targetRir-prevRir;const pct=Math.max(-0.075,Math.min(0.075,delta*0.025));const raw=prevWeight*(1+pct);return roundToIncrement(raw,increment);}export function warmupPlan(){return[{pct:0.40,reps:5},{pct:0.60,reps:3},{pct:0.75,reps:2},{pct:0.85,reps:1}];}export function generateWarmupWeights(target:number,increment:number){return warmupPlan().map(step=>({weight:roundToIncrement(target*step.pct,increment),reps:step.reps}));}

// Plate calculator: returns plates needed per side
export function calculatePlates(targetWeight: number, barWeight: number, unit: 'lb' | 'kg'): { plate: number; count: number }[] {
  const plates = unit === 'kg' ? [20, 10, 5, 2.5, 1.25] : [45, 25, 10, 5, 2.5];
  let remaining = (targetWeight - barWeight) / 2;
  if (remaining <= 0) return [];
  const result: { plate: number; count: number }[] = [];
  for (const plate of plates) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      result.push({ plate, count });
      remaining -= count * plate;
    }
  }
  return result;
}

// Format workout summary as shareable text
export function formatWorkoutSummary(workout: { split?: string; date: string; elapsed?: number }, exercises: { name: string; sets: { weight: number; reps: number; rir?: number; is_warmup?: number; is_completed?: number }[] }[], unit: string): string {
  const lines: string[] = [];
  const date = new Date(workout.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  lines.push(`${workout.split ? workout.split.toUpperCase() + ' — ' : ''}${date}`);
  if (workout.elapsed) {
    const m = Math.floor(workout.elapsed / 60);
    lines.push(`Duration: ${m} min`);
  }
  lines.push('');
  for (const ex of exercises) {
    lines.push(ex.name);
    const workingSets = ex.sets.filter(s => !s.is_warmup && s.is_completed);
    for (const s of workingSets) {
      lines.push(`  ${s.weight} ${unit} × ${s.reps}${s.rir != null ? ` @ RIR ${s.rir}` : ''}`);
    }
  }
  lines.push('');
  lines.push('Logged with Fitlog');
  return lines.join('\n');
}
