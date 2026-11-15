import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const w = S.migrate(JSON.parse(JSON.stringify(loadLive().w)));
console.log(w.chronicle.at(-1).text, w.fauna.mead, w.fauna.bed, w.fire);
for (let d = 0; d < 200; d++) {
  S.advanceTo(w, w.t + 24);
  if (d % 25 === 0) { const c = S.clock(w.t); console.log(c.year, S.SEASONS[c.season], c.dos, S.summary(w).deer); }
}
for (const e of w.log.filter((e) => /deer|fawn|venison|stag/.test(e.text))) console.log(e.s, e.text);
