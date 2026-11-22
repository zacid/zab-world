// node scripts/_cloakprobe.mjs [years] [seed|live]: wolf-skin cloaks, who wears them and where they go
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 40), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  S.advanceTo(w, w.t + S.TICKS_PER_DAY);
  for (const e of w.log) if (e.t >= last && /cloak|pelt of|wolf's skin|asleep in the bracken/.test(e.text)) console.log(e.s, e.text.slice(0, 300));
  last = w.t;
}
const s = S.summary(w);
console.log('made', s.cloaksMade, 'worn', s.cloaks, 'graves', (w.graves || []).filter((g) => g.cl).map((g) => g.n + ':' + g.cl),
  'pop', s.pop, 'lone came', s.loneCame, 'killed', s.loneKilled);
