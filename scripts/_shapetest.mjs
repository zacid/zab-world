// node scripts/_shapetest.mjs [seed] [from] [to]: ms/yr with and without rebuilding people/fields to one key order at `from`
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 4242), from = +(process.argv[3] || 80), to = +(process.argv[4] || 83);
const uniform = (list) => {
  const keys = new Set(); for (const o of list) for (const k of Object.keys(o)) keys.add(k);
  const order = [...keys].sort();
  return list.map((o) => { const n = {}; for (const k of order) n[k] = o[k]; return n; });
};
for (const mode of ['plain', 'uniform']) {
  const w0 = S.genesis(seed, 0);
  S.advanceTo(w0, from * S.TICKS_PER_YEAR);
  const w = JSON.parse(JSON.stringify(w0)); // a fresh world object, so no lookup cache holds the old objects
  if (mode === 'uniform') { w.people = uniform(w.people); w.fields = uniform(w.fields); w.buildings = uniform(w.buildings); }
  const t = Date.now();
  S.advanceTo(w, to * S.TICKS_PER_YEAR);
  console.log(mode, 'pop', w.people.length, Math.round((Date.now() - t) / (to - from)), 'ms/yr', S.fingerprint(w));
}
