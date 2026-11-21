// node scripts/_wadeprobe.mjs [years] [seed|live]: children in the shallows, cockles and scares per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t, most = 0;
const h0 = w.hist.yearly.length;
for (let d = 0; d < years * S.DAYS_PER_YEAR * 24; d++) {
  S.advanceTo(w, w.t + 1);
  most = Math.max(most, w.people.filter((p) => p.task && p.task.k === 'wade').length);
  for (const e of w.log) if (e.t >= last && /shallows|sea\b|cockle/i.test(e.text)) console.log(e.s, e.text);
  last = w.t;
}
for (const h of w.hist.yearly.slice(h0)) console.log('Y' + h.y, 'pop', h.pop, 'cockles', h.cockles ?? '-');
console.log('most wading at once', most, 'spells', w.wade && w.wade.n, 'cockles', w.wade && w.wade.g, 'scares', w.wade && w.wade.s);
