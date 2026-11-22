// node scripts/_crowprobe.mjs [years] [seed|live]: rooks on the grain each year, fields stripped, scarings, and the harvest
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  console.log('Y' + h.y, 'pop', s.pop, 'fields', s.fields, 'harvest', h.harvest, 'flock', s.crowFlock, 'rooks ate', h.rooks ?? '-', 'scared', h.scared ?? '-',
    'stripped ever', s.crowStripped, 'landings', s.crowLandings, 'food', s.food);
}
for (const e of w.chronicle) if (e.t >= t0 && /rook|clapper/i.test(e.text)) console.log(e.s, e.text.slice(0, 500));
for (const e of (w.log || [])) if (e.t >= w.t - 2 * S.TICKS_PER_YEAR && /rook|clapper/i.test(e.text)) console.log(' log', e.text.slice(0, 200));
