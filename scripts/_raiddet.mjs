// Save/load determinism across raid nights: node scripts/_raiddet.mjs [years] [seed]
import * as S from '../src/sim.js';
const years = +(process.argv[2] || 12), seed = +(process.argv[3] || 20261114);
const a = S.genesis(seed, 0), N = S.TICKS_PER_YEAR * years;
S.advanceTo(a, N);
let b = S.genesis(seed, 0);
while (b.t < N) { S.advanceTo(b, Math.min(N, b.t + 5)); b = JSON.parse(JSON.stringify(b)); }
console.log('raids', a.raid && a.raid.n, S.fingerprint(a) === S.fingerprint(b) ? 'OK' : 'MISMATCH');
