/**
 * Smoke: exercise variant search — family grouping, no weights in API.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = dirname(fileURLToPath(import.meta.url));
const indexSrc = readFileSync(join(dir, 'exercise-search-index.js'), 'utf8');
const searchSrc = readFileSync(join(dir, 'exercise-search.js'), 'utf8');
const html = readFileSync(join(dir, 'coach.html'), 'utf8');

const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(`${indexSrc}\n${searchSrc}`, sandbox);

const { ExerciseSearch } = sandbox;

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

function names(hits) {
  return hits.map((h) => h.name);
}

function hasWeightLeak(hit) {
  const blob = JSON.stringify(hit);
  return /\bkg\b|pound|loadKg|last:/i.test(blob);
}

// deadlift family — multiple variants, no lat pulldown
const dead = ExerciseSearch.search('deadlift', 20);
must(dead.length >= 3, 'deadlift returns multiple variants: ' + names(dead).join(', '));
must(names(dead).some((n) => /Deadlift/.test(n)), 'includes Deadlift');
must(!names(dead).some((n) => /Lat Pulldown/i.test(n)), 'deadlift excludes lat pulldown');

// sumo narrows
const sumo = ExerciseSearch.search('sumo deadlift', 8);
must(names(sumo)[0].toLowerCase().includes('sumo'), 'sumo deadlift ranks sumo first: ' + names(sumo)[0]);

// lateral vs pulldown — both can appear for lat, user picks
const lat = ExerciseSearch.search('lat', 15);
must(names(lat).some((n) => /Lateral Raise/i.test(n)), 'lat includes lateral raise');
must(names(lat).some((n) => /Pulldown/i.test(n)), 'lat includes pulldown');

// db lat raise → lateral raise family, not pulldown first
const dbLat = ExerciseSearch.search('db lat raise', 8);
must(names(dbLat).length > 0, 'db lat raise has hits');
must(/Lateral Raise/i.test(names(dbLat)[0]), 'db lat raise prefers lateral raise: ' + names(dbLat)[0]);

// every hit has exerciseId + name, never weights
for (const q of ['deadlift', 'bench', 'curl']) {
  for (const hit of ExerciseSearch.search(q, 10)) {
    must(hit.exerciseId, q + ' hit missing exerciseId');
    must(hit.name, q + ' hit missing name');
    must(!hasWeightLeak(hit), q + ' hit leaks weight fields');
  }
}

// Current coach picker wiring, not the retired athlete workspace.
must(html.includes('exercise-search-index.js'), 'coach loads search index');
must(html.includes('exercise-search.js'), 'coach loads exercise-search.js');
must(html.includes('pickExerciseVariant('), 'coach exercise selection present');
must(html.includes('coachExerciseSuggestHits('), 'coach variant search present');

console.log('exercise-search.smoke: ok');
