// probe: wolves at the goat pen. node scripts/_penprobe.mjs [years] [seed]
import * as S from '../src/sim.js';
const years = +(process.argv[2] || 60), seed = +(process.argv[3] || 20261114);
const w = S.genesis(seed, 0);
const herd = [];
for (let y = 1; y <= years; y++) {
  S.advanceTo(w, y * S.TICKS_PER_YEAR);
  const s = S.summary(w);
  herd.push(s.goatsCame ? s.goats : '-');
}
const s = S.summary(w);
console.log(`seed ${seed}: pop ${s.pop} raids ${s.penRaids} taken ${s.penTaken} goatsLost ${s.goatsLost}`);
console.log('herd by year:', herd.join(' '));
for (const e of w.chronicle) if (/pen/.test(e.text)) console.log('  C', e.s, e.text);
const yl = w.hist.yearly.map((h) => h.pens || 0).join(' ');
console.log('pens/yr:', yl);
