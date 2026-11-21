// node scripts/_bowprobe.mjs [years] [seed|live]: rainbows, who chases them, and how often the children reach the foot
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t, most = 0;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  for (let h = 0; h < S.HOURS_PER_DAY; h++) {
    S.advanceTo(w, w.t + 1);
    most = Math.max(most, w.people.filter((p) => p.task && p.task.k === 'bow').length);
  }
  for (const e of w.log) if (e.t >= last && /rainbow|bow of colours/.test(e.text)) console.log(e.s, e.text.slice(0, 200));
  last = w.t;
}
const s = S.summary(w);
console.log('rainbows', s.rainbows, 'reached', s.rainbowReached, 'chases', w.bow ? w.bow.c : 0, 'most at once', most, 'pop', s.pop);
