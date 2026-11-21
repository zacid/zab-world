// Gift probe: run a seed for N years and report raids and peace gifts. node scripts/_giftprobe.mjs [years] [seed]
import * as S from '../src/sim.js';
const years = +(process.argv[2] || 100), seed = +(process.argv[3] || 20261114);
const w = S.genesis(seed, 0);
for (let y = 1; y <= years; y++) {
  while (w.t < y * S.TICKS_PER_YEAR) S.step(w);
  const s = S.summary(w);
  if (y % 20 === 0) console.log(`Y${y} pop ${s.pop} food ${s.food} isle ${s.isleVisits} raids ${s.raids} driven ${s.raidsDriven} stolen ${s.raidGrain} gifts ${s.gifts} given ${s.giftGrain}`);
}
for (const e of w.log) if (/thin and have brought|learns to send/.test(e.text)) console.log('  ', e.s, e.text.slice(-220));
