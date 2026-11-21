// node scripts/_canoeprobe.mjs [years] [seed|live]: dugout trips, catch and losses per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 10), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.createWorld(+arg);
const t0 = w.t;
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1];
  console.log('Y' + h.y, 'pop', s.pop, 'food', s.food, 'timber', s.timber, 'canoe', s.canoe ? `ok=${s.canoeOk} trips=${s.canoeTrips} fish=${s.canoeFish} deep=${s.canoeDeep} lost=${s.canoeLost} yr=${h.deep}` : '-');
}
for (const e of [...w.chronicle, ...w.log]) if (e.t >= t0 && /dugout|oak/i.test(e.text)) console.log(e.s, e.text);
