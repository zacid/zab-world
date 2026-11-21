// node scripts/_rogueprobe.mjs [years] [seed|live]: rust outbreaks and rogueing, per year and in total
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 60), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t;
const h0 = w.hist.yearly.length;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  S.advanceTo(w, w.t + S.TICKS_PER_DAY);
  for (const e of w.log) if (e.t >= last && /rust|rogue|pulled/i.test(e.text)) console.log(e.s, e.text.slice(0, 160));
  last = w.t;
}
for (const h of w.hist.yearly.slice(h0)) if (h.rusted || h.rogued) console.log('Y' + h.y, 'pop', h.pop, 'harvest', h.harvest, 'rusted', h.rusted, 'rogued', h.rogued ?? '-');
const s = S.summary(w);
console.log('outbreaks', s.rusts, 'fields spotted', s.rustEver, 'grain lost', s.rustGrain, 'pulled', s.rogueEver, 'stopped', s.rogueStopped, 'fields now', s.fields, 'pop', s.pop);
