// node scripts/_muckprobe.mjs [years] [seed|live]: fields, forest, goats, muck heap and fields mucked per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 10), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
const forest = () => w.tiles.reduce((n, t) => n + (t === S.T.FOREST ? 1 : 0), 0);
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  console.log('Y' + h.y, 'pop', s.pop, 'food', s.food, 'fields', s.fields, 'forest', forest(), 'timber', s.timber, 'goats', s.goats, 'heap', s.muckHeap, 'mucked', h.mucked ?? '-', 'grain+', h.muckGrain ?? '-', 'harvest', h.harvest);
}
for (const e of [...w.chronicle, ...w.log]) if (e.t >= t0 && /muck|dung/i.test(e.text)) console.log(e.s, e.text.slice(0, 200));
