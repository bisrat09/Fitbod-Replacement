#!/usr/bin/env node
/**
 * Fetches ALL exercises from ExerciseDB API and builds a static
 * name → gifUrl mapping file. Run once, then images work offline.
 *
 * Usage: node scripts/buildGifMap.mjs
 *
 * Output: src/data/exerciseGifMap.json
 */

const API = 'https://exercisedb-api.vercel.app/api/v1/exercises';
const DELAY_MS = 3000; // 3s between requests to stay under rate limit
const PER_PAGE = 100;
const OUT_FILE = new URL('../src/data/exerciseGifMap.json', import.meta.url);

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalize(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function fetchPage(offset) {
  const url = `${API}?limit=${PER_PAGE}&offset=${offset}`;
  console.log(`  Fetching offset=${offset}...`);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      console.log('  Rate limited — waiting 10s...');
      await sleep(10000);
      return fetchPage(offset); // retry
    }
    throw new Error(`HTTP ${res.status} at offset ${offset}`);
  }
  const json = await res.json();
  return json.data || [];
}

async function main() {
  console.log('Building exercise GIF map from ExerciseDB API...\n');

  // Load seed exercises to know what names we care about
  let seedNames = [];
  try {
    const seedPath = fileURLToPath(new URL('../src/data/seedExercises.ts', import.meta.url));
    const seedContent = readFileSync(seedPath, 'utf-8');
    // Extract exercise names from the RAW array (lines matching 'string',)
    const nameRegex = /'([^']+)'/g;
    let match;
    const rawSection = seedContent.substring(seedContent.indexOf("const RAW"));
    while ((match = nameRegex.exec(rawSection)) !== null) {
      const name = match[1];
      // Skip keys that are muscle group categories
      if (['triceps','chest','biceps','hamstrings','abs','back','quads','glutes',
           'shoulders','trapezius','forearms','adductors','abductors','calves','lower-back'].includes(name)) continue;
      seedNames.push(name);
    }
    console.log(`Found ${seedNames.length} seed exercises to match against.\n`);
  } catch {
    console.log('Could not read seed exercises — will save all API exercises.\n');
  }

  // Fetch all exercises from API
  const allExercises = [];
  let offset = 0;
  let page = 1;

  while (true) {
    const batch = await fetchPage(offset);
    if (batch.length === 0) break;
    allExercises.push(...batch);
    console.log(`  Page ${page}: got ${batch.length} exercises (total: ${allExercises.length})`);
    if (batch.length < PER_PAGE) break; // last page
    offset += PER_PAGE;
    page++;
    await sleep(DELAY_MS);
  }

  console.log(`\nFetched ${allExercises.length} exercises total from ExerciseDB.\n`);

  // Build API lookup: normalized name → gifUrl
  const apiMap = new Map();
  for (const ex of allExercises) {
    if (ex.name && ex.gifUrl) {
      apiMap.set(normalize(ex.name), ex.gifUrl);
    }
  }

  // Match seed exercises against API exercises
  const gifMap = {};
  let matched = 0;
  let unmatched = 0;

  const seedTargets = seedNames.length > 0 ? seedNames : [...apiMap.keys()];

  for (const seedName of seedTargets) {
    const key = normalize(seedName);

    // 1. Exact match
    if (apiMap.has(key)) {
      gifMap[key] = apiMap.get(key);
      matched++;
      continue;
    }

    // 2. Try common variations
    const variations = [
      key,
      key.replace('ez-bar', 'ez bar'),
      key.replace('dumbbell row', 'dumbbell one arm bent-over row'),
      key.replace('cable row', 'cable seated row'),
      key.replace('machine row', 'lever seated row'),
      key.replace('pull up', 'pull-up'),
      key.replace('push up', 'push-up'),
      key.replace('chin up', 'chin-up'),
      key.replace('step up', 'step-up'),
      `barbell ${key}`,
      `dumbbell ${key}`,
      `cable ${key}`,
      `lever ${key}`,
      `machine ${key}`,
      `smith machine ${key}`,
      `smith ${key}`,
    ];

    let found = false;
    for (const v of variations) {
      if (apiMap.has(v)) {
        gifMap[key] = apiMap.get(v);
        matched++;
        found = true;
        break;
      }
    }
    if (found) continue;

    // 3. Substring/contains match — find best API name that contains seed name or vice versa
    let bestMatch = null;
    let bestLen = Infinity;
    for (const [apiName, url] of apiMap) {
      if (apiName.includes(key) || key.includes(apiName)) {
        // Prefer shorter names (more specific)
        if (apiName.length < bestLen) {
          bestMatch = url;
          bestLen = apiName.length;
        }
      }
    }
    if (bestMatch) {
      gifMap[key] = bestMatch;
      matched++;
      continue;
    }

    // 4. Word overlap — require 60%+ overlap
    const keyWords = key.split(' ').filter(w => w.length > 2);
    let bestOverlap = null;
    let bestRatio = 0;
    for (const [apiName, url] of apiMap) {
      const apiWords = apiName.split(' ').filter(w => w.length > 2);
      const shared = keyWords.filter(w => apiWords.includes(w)).length;
      const ratio = shared / Math.max(keyWords.length, 1);
      if (ratio > bestRatio && ratio >= 0.6) {
        bestOverlap = url;
        bestRatio = ratio;
      }
    }
    if (bestOverlap) {
      gifMap[key] = bestOverlap;
      matched++;
      continue;
    }

    unmatched++;
  }

  // Also add all API exercises directly (lowercase name → url)
  // This ensures on-demand lookups work too
  for (const [name, url] of apiMap) {
    if (!gifMap[name]) {
      gifMap[name] = url;
    }
  }

  // Write output
  const outPath = fileURLToPath(OUT_FILE);
  writeFileSync(outPath, JSON.stringify(gifMap, null, 2));

  console.log(`Matched: ${matched}/${seedTargets.length} seed exercises`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Total map entries: ${Object.keys(gifMap).length}`);
  console.log(`\nWrote: ${outPath}`);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
