import * as S from '../src/sim.js';
const w = S.genesis(+(process.argv[2] || 777), 0);
if (process.argv[3] === 'off') delete w.stones; // the rules as they were: no ring is ever begun
S.advanceTo(w, 70 * S.TICKS_PER_YEAR);
const t0 = Date.now();
S.advanceTo(w, w.t + 8 * S.TICKS_PER_YEAR);
console.log('pop', w.people.length, ((Date.now() - t0) / 8).toFixed(0), 'ms/yr', 'stones', w.stones ? w.stones.s.length : '-', S.fingerprint(w));
