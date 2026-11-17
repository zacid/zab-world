// Probe: run the live world 10 years and show the far-isle boat visits hour by hour.
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const { w: raw } = loadLive();
const w = S.migrate(raw);
S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now())));
const t0 = w.t;
while (w.t < t0 + 10 * S.TICKS_PER_YEAR) {
  S.step(w);
  const B = w.isle && w.isle.boat;
  if (B) console.log(S.clock(w.t).hour, B.st, B.gs.map((g) => `${g.nm}:${g.k}@${g.x.toFixed(1)},${g.y.toFixed(1)}`).join(' '));
}
for (const e of w.chronicle) if (e.t >= t0) console.log(e.s, e.text);
console.log(w.isle && { ...w.isle, boat: !!w.isle.boat });
