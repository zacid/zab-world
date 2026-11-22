// node scripts/_pareprobe.mjs [years] [seed|live]: foot rot outbreaks before and after hoof paring is learned
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 30), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  if (h.lame || h.pared) console.log('Y' + h.y, 'pop', s.pop, 'goats', s.goats, 'lame', h.lame ?? '-', 'died', h.rotDied ?? '-', 'pared', h.pared ?? '-', 'held', s.rotHeld);
}
const s = S.summary(w);
console.log('end Y' + s.year, 'pop', s.pop, 'goats', s.goats, 'outbreaks', s.rots, 'died', s.rotDied, 'paring', s.paring, 'pared', s.pared, 'fold', JSON.stringify(w.pare && w.pare.f));
for (const e of w.chronicle) if (e.t >= t0 && /hoof|fold|foot rot/i.test(e.text)) console.log(e.s, e.text.slice(0, 220));
