// node scripts/_cheeseprobe.mjs [years] [seed|live]: cheese pressed and eaten each year, and the cold deaths of the frail
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
let cold = 0;
for (let y = 0; y < years; y++) {
  const c0 = w.chronicle.length;
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  const lg = (w.log || []).filter((e) => e.t >= w.t - S.TICKS_PER_YEAR && /died of the cold/.test(e.text)).length;
  cold += lg;
  console.log('Y' + h.y, 'pop', s.pop, 'goats', s.goats, 'pressed', h.cheese ?? '-', 'eaten', h.cheeseEaten ?? '-', 'rack', s.cheeseRack, 'pail', s.cheesePail, 'bitter days fed', s.cheeseDays, 'cold deaths', lg, 'rack tile', JSON.stringify(w.cheese && w.cheese.r));
}
console.log('cold deaths in all', cold);
for (const e of w.chronicle) if (e.t >= t0 && /cheese|curd|rack/i.test(e.text)) console.log(e.s, e.text.slice(0, 400));
