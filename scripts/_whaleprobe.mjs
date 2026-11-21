// node scripts/_whaleprobe.mjs [years] [seed|live]: strandings, meat cut and how each whale ended
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 60), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t, ms = 0;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  const a = performance.now();
  S.advanceTo(w, w.t + S.TICKS_PER_DAY);
  ms += performance.now() - a;
  for (const e of w.log) if (e.t >= last && /whale/i.test(e.text)) console.log(e.s, e.text);
  if (w.whale && w.whale.cur && S.clock(w.t).hour === 0 && d % 1 === 0) {
    const cut = w.people.filter((p) => p.task && p.task.k === 'whale').length;
    if (cut) console.log('   ', S.clock(w.t).day, 'left', w.whale.cur.m, 'cutting now', cut);
  }
  last = w.t;
}
console.log('pop', w.people.length, 'whales', w.whale && w.whale.n, 'meat', w.whale && w.whale.g, 'bones', JSON.stringify(w.whale && w.whale.bones));
console.log('ms/yr', (ms / years).toFixed(0));
