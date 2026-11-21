import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const { w: raw } = loadLive();
const w = S.migrate(raw);
S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now())));
const t0 = w.t;
for (let y = 0; y < 3; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const c = S.clock(w.t);
  console.log('Y' + c.year, 'men', JSON.stringify(w.snow && w.snow.men), 'ever', w.snow && w.snow.n);
}
for (const e of w.log) if (e.t >= t0 && /snow/i.test(e.text)) console.log(e.s, e.text);
for (const e of w.chronicle) if (e.t >= t0 && /snowm/i.test(e.text)) console.log('CHRON', e.s, e.text);
console.log(w.hist.yearly.slice(-3).map((h) => h.snowmen));
