// node scripts/_squallprobe.mjs [years] [seed|live] [quiet]: squalls at sea, who was out and how it ended
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 40), src = process.argv[3] || 'live', quiet = !!process.argv[4];
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t, maxWatch = 0;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  for (let h = 0; h < 24; h++) {
    S.advanceTo(w, w.t + S.TICKS_PER_DAY / 24);
    if (w.squall && w.squall.cur) maxWatch = Math.max(maxWatch, w.people.filter((p) => !p.dead && p.task && p.task.k === 'shore').length);
  }
  if (!quiet) for (const e of w.log) if (e.t >= last && /squall|dugout rolls|surf half swamped|drags .* up the sand|crawls up the sand|drowned|dugout comes in on|pieces of the dugout/i.test(e.text)) console.log(e.s, e.text.slice(0, 260));
  last = w.t;
}
const s = S.summary(w);
console.log('squalls', s.squalls, 'in', s.squallIn, 'swam', s.squallSwam, 'drowned', s.squallDrowned, 'boats lost', s.squallBoats,
  'trips', s.canoeTrips, 'max watchers', maxWatch, 'pop', s.pop, 'year', s.year);
console.log('per year', (w.hist.yearly || []).map((r) => r.squalls || 0).join(''));
