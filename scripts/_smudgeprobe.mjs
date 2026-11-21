// node scripts/_smudgeprobe.mjs [years] [seed|live]: late frosts and the smudge fires lit against them
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 40), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t, maxFires = 0;
const h0 = w.hist.yearly.length;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  for (let h = 0; h < S.TICKS_PER_DAY; h++) { S.advanceTo(w, w.t + 1); if (w.smudge) maxFires = Math.max(maxFires, w.smudge.on.length); }
  for (const e of w.log) if (e.t >= last && /frost|smudg/i.test(e.text)) console.log(e.s, e.text);
  last = w.t;
}
for (const h of w.hist.yearly.slice(h0)) console.log('Y' + h.y, 'pop', h.pop, 'harvest', h.harvest, 'frosted', h.frosted ?? '-', 'smudged', h.smudged ?? '-', 'timber', h.timber);
console.log('frosts', w.frost && w.frost.n, 'killed', w.frost && w.frost.k, 'smudge', w.smudge && { n: w.smudge.n, f: w.smudge.f, s: w.smudge.s }, 'most fires in a night', maxFires);
