// node scripts/_rotprobe.mjs [years] [seed|live]: goats, foot rot outbreaks, lame and dead per year, milk
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 10), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  console.log('Y' + h.y, 'pop', s.pop, 'goats', s.goats, 'lame', h.lame ?? '-', 'died', h.rotDied ?? '-', 'wolves took', h.goatsLost ?? '-', 'outbreaks', s.rots);
}
for (const e of [...w.chronicle, ...w.log]) if (e.t >= t0 && /foot rot|lame/i.test(e.text)) console.log(e.s, e.text.slice(0, 160));
