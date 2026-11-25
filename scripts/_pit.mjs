// probe: live world (or seed) forward N years, print bear/pit chronicle lines
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 15), seed = process.argv[3];
let w;
if (seed) { w = S.genesis(+seed, 0); } else { w = S.migrate(loadLive().w); }
const c0 = w.chronicle.length, l0 = (w.log || []).length;
console.log('start', S.summary(w).bearPit, w.bear && w.bear.pd);
const seen = new Set();
const t1 = w.t + years * S.TICKS_PER_YEAR;
while (w.t < t1) {
  S.advanceTo(w, Math.min(t1, w.t + 24));
  for (const e of (w.log || [])) {
    const k = e.t + e.text;
    if (seen.has(k)) continue;
    seen.add(k);
    if (/bear|pit|Bear/.test(e.text)) console.log('L', S.clock(e.t).year, S.clock(e.t).doy, e.text.slice(0, 220));
  }
}
for (const e of w.chronicle.slice(c0)) if (/bear|pit/.test(e.text)) console.log('C', e.s, e.text.slice(0, 300));
const s = S.summary(w);
console.log(s.year, s.pop, s.bearPit, s.bearVisits, s.bearsTaken, s.pitRound, s.pitChildren, JSON.stringify(s.bearSkin), JSON.stringify(w.bear && w.bear.pit));
