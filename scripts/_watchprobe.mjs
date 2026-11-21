// The beach watch on the live world and test seeds: node scripts/_watchprobe.mjs [years]
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 30);
const run = (label, w) => {
  const t0 = w.t, seen = new Set();
  S.advanceTo(w, t0 + years * S.TICKS_PER_YEAR);
  const s = S.summary(w);
  console.log(`${label}: Y${s.year} pop ${s.pop} raids ${s.raids} driven ${s.raidsDriven} grain ${s.raidGrain} | watch ${s.watch} nights ${s.watchNights} turned ${s.watchTurned} | learned Y${w.learned && w.learned.watch != null ? S.clock(w.learned.watch).year : '-'}`);
  for (const e of [...w.chronicle, ...w.log]) if (/beach fire|beach watch|granary door|dugout slides/.test(e.text) && !seen.has(e.t)) { seen.add(e.t); console.log('   ', e.s, e.text.slice(0, 150)); }
};
run('live', S.migrate(loadLive().w));
for (const seed of [20261114, 777, 4242]) run('seed ' + seed, S.genesis(seed, 0));
