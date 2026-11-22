// node scripts/_fogprobe.mjs [years] [seed|live]: fog signs, fogs called right and wrong, days the herd was kept in
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  S.advanceTo(w, w.t + S.HOURS_PER_DAY);
  for (const e of w.log) if (e.t >= last && (/fog signs|Fog by morning|called a fog|as .* said it would|carries off a goat|wandered off/.test(e.text))) console.log(e.s, e.text.slice(0, 200));
  last = w.t;
}
const s = S.summary(w);
console.log('lore', s.lore, 'fogLore', s.fogLore, 'calls', s.fogCalls, 'right', s.fogRight, 'missed', s.fogMissed, 'false', s.fogFalse, 'penned', s.fogPenned, 'stayed', s.fogStayed, 'pop', s.pop, 'goats', s.goats);
for (const r of w.hist.yearly.slice(-years)) console.log(r.y, 'fog', r.fog, 'goatsLost', r.goatsLost, 'lost', r.lost, 'wolves', r.wolves);
