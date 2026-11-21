// node scripts/_loreprobe.mjs [years] [seed|live]: sky lore, storms called right and wrong, roofs held, grain cut by firelight
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t, most = 0;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  for (let h = 0; h < S.HOURS_PER_DAY; h++) {
    S.advanceTo(w, w.t + 1);
    most = Math.max(most, w.people.filter((p) => p.task && (p.task.k === 'tie' || p.task.eve)).length);
  }
  for (const e of w.log) if (e.t >= last && (e.k === 'major' && /sky|storm|stones/i.test(e.text) || /stones|called a storm|no warning|read in the sky/.test(e.text))) console.log(e.s, e.text.slice(0, 220));
  last = w.t;
}
const s = S.summary(w);
console.log('lore', s.lore, 'calls', s.loreCalls, 'right', s.loreRight, 'missed', s.loreMissed, 'false', s.loreFalse, 'held', s.loreHeld, 'reaped', s.loreReaped, 'most at work', most, 'pop', s.pop);
for (const r of w.hist.yearly.slice(-years)) console.log(r.y, 'storms', r.storms, 'held', r.held, 'flattened', r.flattened);
