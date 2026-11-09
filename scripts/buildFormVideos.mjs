#!/usr/bin/env node
/**
 * Build src/data/formVideos.json: one specific YouTube form video per exercise,
 * picked from trusted coaching channels. Re-run to refresh; hand overrides in OVERRIDES.
 *
 *   node scripts/buildFormVideos.mjs            # all exercises in exerciseInstructions.json
 *   node scripts/buildFormVideos.mjs "Dip"      # one exercise (debug)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src/data/formVideos.json');
const instructions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/exerciseInstructions.json'), 'utf8'));
// Whole seed library (the strings inside RAW in seedExercises.ts), plus anything with instructions
const seedSrc = fs.readFileSync(path.join(root, 'src/data/seedExercises.ts'), 'utf8');
const seedNames = [...seedSrc.slice(seedSrc.indexOf('const RAW')).matchAll(/^\s+'([^']+)',?$/gm)].map((m) => m[1].toLowerCase().trim().replace(/\s+/g, ' '));
const ALL_NAMES = [...new Set([...Object.keys(instructions), ...seedNames])];

const TRUSTED = [
  'jeff nippard', 'renaissance periodization', 'scott herman fitness', 'scottHermanfitness', 'athlean-x',
  'squat university', 'alan thrall', 'jeremy ethier', 'built with science', 'mind pump', 'buff dudes',
  'barbend', 'calgary barbell', 'barbell medicine', 'starting strength', 'deltabolic', 'e3 rehab',
  'mike thurston', 'nick tumminello', 'muscle & strength', 'muscle and strength', 'bodybuilding.com',
  'garage strength', 'men\'s health', 'howcast', 'live lean tv', 'dr. carl baird', 'physique development',
  'nuffield health', 'jeff cavaliere', 'brian alsruhe', 'stronger by science', 'mass', 'hybrid calisthenics',
  'fitnessfaqs', 'marcus filly', 'functional bodybuilding', 'hevy', 'strengthlog', 'bret contreras',
  'redefining strength', 'dr. john rusin', 'precision movement', 'catalyst athletics', 'torokhtiy',
].map((s) => s.toLowerCase());

const QUALIFIERS = ['seated', 'standing', 'incline', 'decline', 'dumbbell', 'barbell', 'kettlebell', 'cable', 'machine', 'smith', 'single arm', 'one arm', 'single leg', 'band', 'landmine', 'close grip', 'wide grip', 'reverse', 'sumo', 'front', 'bulgarian', 'deficit', 'paused'];

// Hand-reviewed 2026-11-08
const OVERRIDES = { // 'exercise name': ['videoId', 'channel', 'title']
  'barbell shoulder press': ['_RlRDWO2jfg', 'Jeff Nippard', 'Build Bigger Shoulders With Perfect Training Technique (The Overhead Press)'],
};
// Auto-picks that were the wrong movement; these fall back to YouTube search in the app
const EXCLUDE = new Set([
  'machine bench press', 'incline hammer curl', 'smith machine pistol squat', 'calf press', 'v-bar pull up',
  'plate pinch', 'chin up', 'leg pull-in', 'windmill', 'lateral box jump',
  'single leg butt kick', 'smith machine decline press', 'smith machine hang power clean', 'weighted ball hyperextension',
  // Library pass, hand-reviewed 2026-11-08
  'airplane',
  'pancake',
  'incline ez-bar curl',
  'barbell pause curl',
  'single leg curl',
  'partner leg up stretch',
  'vertical knee raise',
  'medicine ball leg crunch',
  'cable underhand tricep pushdown',
  'elevated plank',
  'leg raises with stability ball',
  'dumbbell halo to oblique crunch',
  'partner sit up hi-five',
  'partner lying leg throw down',
  'partner russian twist',
  'single arm overhead kettlebell squat',
  'pvc helicopter',
  'machine row',
  'dumbbell squat to shoulder press',
  'medicine ball squat',
  'cluster',
  'wall ball',
  'butt scoot',
  'box drops',
  'medicine ball overhead lunge',
  'wall triple knee drive',
  'foam roll hip thrust',
  'single leg foam roll hip thrust',
  'forward lunge with twist',
  'dumbbell punches',
  'partner handstand',
  'loop band shoulder internal rotation',
  'trx t deltoid fly',
  'seated point and flex',
  'ac-skips',
  'ab-skips',
  'pvc windmill',
  'australian crawl',
  'bridge side to side',
  // Relaxed pass, hand-reviewed 2026-11-08
  'lateral cable tricep extension',
  'partner standing chest press',
  'balance trainer leg crossover planks',
  'balance trainer single leg lifts',
  'balance trainer side star plank',
  'mini loop band hip flexor',
  'balance trainer single leg trx lunges',
  'balance trainer trx pistol squats',
  'balance trainer hesitation lunges',
  'partner back to back wall sit',
  'barbell bulgarian split jump',
  'dumbbell bulgarian split jumps',
  'squat with rotation',
  'handle band forward raise',
  'single arm bottoms-up kettlebell clean',
  'balance trainer toe taps',
  'balance trainer lateral jumps',
  'dumbbell calf raise to high pull',
]);
// Re-upload / spam channels
const BLOCKED_CHANNELS = ['how to lose weight with the keto diet', 'statsky dev'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function secs(len) {
  if (!len) return 0;
  return len.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
}

const SYN = { one: 'single', 'one-arm': 'single', triceps: 'tricep', biceps: 'bicep', dumbbells: 'dumbbell', db: 'dumbbell', bb: 'barbell', kb: 'kettlebell', 'ez-bar': 'ez', 'e-z': 'ez', pushup: 'push', pullup: 'pull', 'push-up': 'push', 'pull-up': 'pull' };
const canon = (t) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).map((w) => SYN[w] ?? w).join(' ');

function words(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['with', 'the', 'and'].includes(w));
}

async function search(q) {
  for (let attempt = 0; ; attempt++) {
    try { return await searchOnce(q); } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(3000 * 2 ** attempt);
    }
  }
}

async function searchOnce(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=US`;
  const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US' } })).text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.videoRenderer?.videoId) {
      const v = o.videoRenderer;
      out.push({
        id: v.videoId,
        title: v.title?.runs?.map((r) => r.text).join('') ?? '',
        channel: v.ownerText?.runs?.[0]?.text ?? '',
        seconds: secs(v.lengthText?.simpleText),
      });
      return;
    }
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(JSON.parse(m[1]));
  return out;
}

/** Score: must mention the movement; trusted channel + short tutorial wins. */
function pick(name, results) {
  const need = words(canon(name));
  const scored = results
    .filter((r) => r.seconds >= 20 && r.seconds <= 15 * 60)
    .map((r, rank) => {
      const t = canon(r.title);
      const hit = need.filter((w) => t.includes(w.replace(/s$/, ''))).length / Math.max(need.length, 1);
      if (BLOCKED_CHANNELS.includes(r.channel.toLowerCase())) return { ...r, hit: 0, trusted: false, s: -99 };
      const trusted = TRUSTED.some((ch) => r.channel.toLowerCase().includes(ch));
      let s = hit * 10 - rank * 0.3;
      // Penalize a different variation (seated vs standing, dumbbell vs barbell...)
      for (const q of QUALIFIERS) if (t.includes(q) && !name.includes(q)) s -= 4;
      if (trusted) s += 6;
      if (/form|how to|technique|tutorial|guide|mistakes/i.test(r.title)) s += 2;
      if (r.seconds <= 6 * 60) s += 1;
      return { ...r, hit, trusted, s };
    })
    .filter((r) => r.hit >= (r.trusted ? 0.67 : RELAXED ? 0.67 : 0.85))
    .sort((a, b) => b.s - a.s);
  return scored[0] ?? null;
}

const only = process.argv[2];
const save = (obj) => fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]])), null, 2) + '\n');
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const force = process.argv.includes('--force');
const RELAXED = process.argv.includes('--relaxed');
const names = only && !only.startsWith('--') ? [only.toLowerCase()] : ALL_NAMES.filter((k) => force || OVERRIDES[k] || EXCLUDE.has(k) || !existing[k]);
const result = { ...existing };
let found = 0;
for (const key of names) {
  if (OVERRIDES[key]) { const [id, channel, title] = OVERRIDES[key]; result[key] = { id, title, channel, trusted: true }; found++; continue; }
  if (EXCLUDE.has(key)) { delete result[key]; continue; }
  const display = key.replace(/\b\w/g, (c) => c.toUpperCase());
  try {
    let best = pick(key, await search(`${display} proper form`));
    if (!best || !best.trusted) {
      const alt = pick(key, await search(`${display} how to`));
      if (alt && (!best || alt.s > best.s)) best = alt;
    }
    if (best) {
      result[key] = { id: best.id, title: best.title, channel: best.channel, trusted: best.trusted };
      found++;
      console.log(`${best.trusted ? 'OK ' : '?? '} ${best.hit.toFixed(2)} ${key} -> ${best.channel}: ${best.title}`);
    } else {
      delete result[key];
      console.log(`--  ${key}: no match (search fallback)`);
    }
  } catch (e) {
    console.log(`ERR ${key}: ${e.message}`);
  }
  if (!only || only.startsWith('--')) save(result);
  await sleep(1200);
}
if (!only || only.startsWith('--')) save(result);
console.log(`\n${found}/${names.length} exercises have a specific video`);
