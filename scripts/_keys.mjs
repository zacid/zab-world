// node scripts/_keys.mjs [seed] [years]: every key ever seen on people, fields and buildings (sampled daily)
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 4242), yrs = +(process.argv[3] || 100);
const w = S.genesis(seed, 0);
const seen = { people: new Set(), fields: new Set(), buildings: new Set() };
for (let d = 0; d < yrs * S.DAYS_PER_YEAR; d++) {
  S.advanceTo(w, w.t + S.TICKS_PER_DAY);
  for (const k of ['people', 'fields', 'buildings']) for (const o of w[k]) for (const key of Object.keys(o)) seen[k].add(key);
}
for (const k in seen) console.log(k, [...seen[k]].join(' '));
