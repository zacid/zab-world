import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const yrs = +(process.argv[2] || 20), seed = process.argv[3];
let w;
if (seed) w = S.genesis(+seed, 0); else w = S.migrate(JSON.parse(JSON.stringify(loadLive().w)));
const seen = new Set(w.chronicle.map((e) => JSON.stringify(e)));
const logs = new Set((w.log || []).map((e) => JSON.stringify(e)));
let maxNu = 0, maxCg = 0;
for (let d = 0; d < yrs * 360; d++) {
  S.advanceTo(w, w.t + 24);
  const s = S.summary(w);
  maxNu = Math.max(maxNu, s.nursing); maxCg = Math.max(maxCg, s.coughing);
  for (const e of w.chronicle) { const k = JSON.stringify(e); if (!seen.has(k)) { seen.add(k); if (/cough/.test(k)) console.log('CHR', k.slice(0, 260)); } }
  for (const e of w.log || []) { const k = JSON.stringify(e); if (!logs.has(k)) { logs.add(k); if (/cough/.test(k)) console.log('LOG', k.slice(0, 200)); } }
}
const s = S.summary(w);
console.log({ pop: s.pop, children: s.children, coughs: s.coughs, lost: s.coughLost, had: s.coughHad, maxNu, maxCg });
console.log(w.hist.yearly.slice(-yrs).map((h) => `${h.y}:${h.pop}${h.coughs ? ` c${h.coughs}/${h.coughDied}` : ''}`).join(' '));
