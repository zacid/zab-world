// throwaway: run the live world N years and print rooks/scarecrow numbers per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const yrs = +(process.argv[2] || 5);
const w = S.migrate(loadLive().w);
const seen = new Set(w.log.map((e) => e.text + e.t));
for (let y = 0; y < yrs; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w);
  const h = w.hist.yearly[w.hist.yearly.length - 1];
  console.log(`Y${s.year} pop ${s.pop} fields ${w.fields.length} rooks ${h.rooks} scared ${h.scared} turned ${h.crowTurned} | sc ${s.scarecrows} found ${s.scareFound} moved ${s.scareMoved} hides ${s.hides} flock ${s.crowFlock}`);
  for (const e of w.log) { const k = e.text + e.t; if (!seen.has(k)) { seen.add(k); if (/scarecrow|rook|Rook/i.test(e.text)) console.log('   ', e.s, e.text.slice(0, 220)); } }
}
if (w.crow && w.crow.m) console.log(JSON.stringify(w.crow.m));
