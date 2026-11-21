// node scripts/_loneprobe.mjs [years] [seed|live]: lone wolves, what they take, and how they end
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
  for (const e of w.log) if (e.t >= last && (e.k === 'major' || /lone|One-Ear|Greyback|Pale-Eye|Longshank|Scar-Muzzle/.test(e.text)) && /lone|One-Ear|Greyback|Pale-Eye|Longshank|Scar-Muzzle/.test(e.text)) console.log(e.s, e.text.slice(0, 170));
  last = w.t;
}
for (const h of w.hist.yearly.slice(h0)) if (h.lone) console.log('Y' + h.y, 'pop', h.pop, 'lone attacks', h.lone, 'wolves', h.wolves, 'goatsLost', h.goatsLost ?? '-');
const s = S.summary(w);
console.log('came', s.loneCame, 'killed', s.loneKilled, 'now', s.lone, 'pop', s.pop, 'wolves', s.wolves);
