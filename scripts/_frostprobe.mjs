// node scripts/_frostprobe.mjs [years] [seed|live]: late frosts, fields killed and resown, harvest per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 40), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t;
const h0 = w.hist.yearly.length;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  S.advanceTo(w, w.t + S.TICKS_PER_DAY);
  for (const e of w.log) if (e.t >= last && /frost/i.test(e.text)) console.log(e.s, e.text);
  last = w.t;
}
for (const h of w.hist.yearly.slice(h0)) console.log('Y' + h.y, 'pop', h.pop, 'harvest', h.harvest, 'frosted', h.frosted ?? '-', 'food', h.food);
console.log('frosts', w.frost && w.frost.n, 'fields killed', w.frost && w.frost.k);
