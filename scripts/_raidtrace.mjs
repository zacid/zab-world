// Trace the first raids hour by hour. node scripts/_raidtrace.mjs [seed] [raids]
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 20261114), want = +(process.argv[3] || 2);
const w = S.genesis(seed, 0);
let done = 0, was = false;
while (done < want && w.t < 60 * S.TICKS_PER_YEAR) {
  S.step(w);
  const C = w.raid && w.raid.cur;
  if (C) {
    const c = S.clock(w.t - 1);
    const g = (C.gx - C.bx) ** 2 + (C.gy - C.by) ** 2;
    console.log(`Y${c.year} d${c.doy} ${c.hour}h ${C.st} boat ${C.x},${C.y} beach->granary ${Math.sqrt(g).toFixed(1)} raiders ${C.rs.map((r) => r.k + '@' + r.x.toFixed(1) + ',' + r.y.toFixed(1)).join(' ')} take ${C.take}`);
    was = true;
  } else if (was) { was = false; done++; console.log('--'); }
}
