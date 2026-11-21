// Wildfire determinism: the live world run straight vs. saved and loaded every 7 hours through its next fires.
// node scripts/_blazedet.mjs [years]
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 2);
const a = S.migrate(loadLive().w);
let b = JSON.parse(JSON.stringify(a));
const N = a.t + years * S.TICKS_PER_YEAR;
let lit = 0;
while (a.t < N) { S.step(a); if (S.blazeOn(a)) lit++; }
while (b.t < N) { S.advanceTo(b, Math.min(N, b.t + 7)); b = JSON.parse(JSON.stringify(b)); }
const fa = S.fingerprint(a), fb = S.fingerprint(b);
console.log(`fires ${a.blaze ? a.blaze.n : 0}, ${lit} hours alight; ${fa} vs ${fb} ${fa === fb ? 'OK' : 'MISMATCH'}`);
process.exit(fa === fb ? 0 : 1);
