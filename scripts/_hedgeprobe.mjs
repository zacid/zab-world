// node scripts/_hedgeprobe.mjs [years] [seed|live]: boar raid nights, fences, hedges planted and grown per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 10), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  console.log('Y' + h.y, 'pop', s.pop, 'fields', s.fields, 'timber', s.timber, 'raids', h.raids, 'fences', h.fences, 'hedges', s.hedges, 'grown', s.hedgesGrown, 'new', h.hedgesNew ?? '-', 'turned', s.hedgeTurned, 'br', w.fauna && w.fauna.br);
}
for (const e of [...w.chronicle, ...w.log]) if (e.t >= t0 && /hedge|hawthorn|thorn/i.test(e.text)) console.log(e.s, e.text.slice(0, 160));
