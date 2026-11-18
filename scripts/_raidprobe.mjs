// Raid probe: run a seed for N years and report raids from the far isle. node scripts/_raidprobe.mjs [years] [seed]
import * as S from '../src/sim.js';
const years = +(process.argv[2] || 60), seed = +(process.argv[3] || 20261114);
const w = S.genesis(seed, 0);
const seen = new Set();
let hours = 0, maxh = 0, cur = 0;
for (let y = 1; y <= years; y++) {
  while (w.t < y * S.TICKS_PER_YEAR) {
    S.step(w);
    if (w.raid && w.raid.cur) { cur++; hours++; } else { maxh = Math.max(maxh, cur); cur = 0; }
    if (w.raid && w.raid.n > seen.size) { seen.add(w.raid.n); const e = w.log[w.log.length - 1]; console.log(`  #${w.raid.n} ${e.s} ${S.clock(w.t).hour}h: ${e.text}`); }
  }
  const s = S.summary(w);
  if (y % 10 === 0) console.log(`Y${y} pop ${s.pop} food ${s.food} isle ${s.isleVisits} raids ${s.raids} driven ${s.raidsDriven} grain ${s.raidGrain} feud ${s.feud}`);
}
console.log('longest raid', maxh, 'hours');
for (const e of w.log) if (/stolen grain/.test(e.text)) console.log('  ', e.s, e.text.slice(-120));
