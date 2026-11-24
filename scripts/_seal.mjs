import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 10), seed = process.argv[3];
const w = seed && seed !== 'live' ? S.genesis(+seed, 0) : S.migrate(loadLive().w);
const y0 = S.clock(w.t).year, t0 = Date.now();
for (let k = 0; k < years; k++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const W = w.seal, K = w.canoe, s = S.summary(w);
  console.log('Y' + S.clock(w.t).year, 'pop', w.people.length, 'seals', W ? `${W.n} eaten ${W.ye}/${W.e} taken ${W.k} skins ${W.s} float ${W.fl != null} saves ${W.fs} bites ${W.b} hunt ${W.h != null}` : '-',
    'deep', K ? `${K.y}/${K.d}` : '-', 'squalls', s.squalls, 'drowned', s.squallDrowned, 'hides', w.hides);
}
console.log('ms/yr', Math.round((Date.now() - t0) / years), 'from', y0);
for (const e of [...w.log].filter((e) => /seal|float/i.test(e.text)).slice(-12)) console.log(' ', e.s, e.text);
for (const e of w.chronicle.filter((e) => /seal|float/i.test(e.text))) console.log(' C', e.s, e.text);
