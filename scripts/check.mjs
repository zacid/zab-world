// Balance + determinism checks. Run: node scripts/check.mjs [years] [seed]
import * as S from '../src/sim.js';
const years = +(process.argv[2] || 40), seed = +(process.argv[3] || 20261114);
let fail = 0;

// 1. determinism: continuous vs. save/load every ~3 game-days (odd chunk)
const a = S.genesis(seed, 0), b = S.genesis(seed, 0);
const N = S.TICKS_PER_YEAR * 2;
S.advanceTo(a, N);
let bb = b;
while (bb.t < N) { S.advanceTo(bb, Math.min(N, bb.t + 77)); bb = JSON.parse(JSON.stringify(bb)); }
const fa = S.fingerprint(a), fb = S.fingerprint(bb);
console.log(`determinism: ${fa} vs ${fb} ${fa === fb ? 'OK' : 'MISMATCH'}`);
if (fa !== fb) fail++;

// 2. balance
const w = S.genesis(seed, 0);
const t0 = Date.now();
for (let y = 1; y <= years; y++) {
  S.advanceTo(w, y * S.TICKS_PER_YEAR);
  const s = S.summary(w);
  console.log(`Y${String(y).padStart(3)} pop ${String(s.pop).padStart(4)} (kids ${String(s.children).padStart(3)})  food ${String(s.food).padStart(6)}  timber ${String(s.timber).padStart(5)}  houses ${String(s.houses).padStart(3)}  fields ${String(s.fields).padStart(3)}  forest ${w.tiles.filter((t) => t === S.T.FOREST).length} grass ${w.tiles.filter((t) => t === S.T.GRASS).length} couples-waiting ${w.people.filter((p) => p.wants).length}`);
  if (s.pop === 0) { console.log('EXTINCT'); fail++; break; }
}
const ms = Date.now() - t0;
console.log(`${years} years in ${ms} ms (${(ms / years).toFixed(0)} ms/year), state ${(JSON.stringify(w).length / 1024).toFixed(0)} KB`);
console.log('chronicle:'); for (const e of w.chronicle) console.log('  ', e.s, e.text);
if (w.people.length > 600) { console.log('POPULATION EXPLOSION'); fail++; }
process.exit(fail ? 1 : 0);
