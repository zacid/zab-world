// What the raiders do to the live world over the next N years: node scripts/_raidlive.mjs [years]
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 15);
const w = S.migrate(loadLive().w);
const t0 = w.t, seen = new Set();
S.advanceTo(w, t0 + years * S.TICKS_PER_YEAR);
const s = S.summary(w);
console.log(`Y${s.year} pop ${s.pop} isle visits ${s.isleVisits} raids ${s.raids} driven ${s.raidsDriven} grain ${s.raidGrain}`);
for (const e of [...w.chronicle, ...w.log]) if (/granary door|dugout slides|stolen grain|far isle/.test(e.text) && !seen.has(e.t)) { seen.add(e.t); console.log(' ', e.s, e.text); }
