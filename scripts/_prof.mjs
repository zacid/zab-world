// node --cpu-prof scripts/_prof.mjs [seed] [from] [to]: run a stretch of years for profiling
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 4242), from = +(process.argv[3] || 80), to = +(process.argv[4] || 85);
const w = S.genesis(seed, 0);
S.advanceTo(w, from * S.TICKS_PER_YEAR);
const t = Date.now();
S.advanceTo(w, to * S.TICKS_PER_YEAR);
console.log('pop', w.people.length, Math.round((Date.now() - t) / (to - from)), 'ms/yr');
