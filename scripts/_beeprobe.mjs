// node scripts/_beeprobe.mjs [years] [seed|live]: bees, swarms, honey and mead, per year and in total
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 60), src = process.argv[3] || 'live';
let w;
if (src === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+src, 0);
let last = w.t;
const h0 = w.hist.yearly.length;
for (let d = 0; d < years * S.DAYS_PER_YEAR; d++) {
  S.advanceTo(w, w.t + S.TICKS_PER_DAY);
  for (const e of w.log) if (e.t >= last && /bee|hive|swarm|honey|mead/i.test(e.text)) console.log(e.s, e.text.slice(0, 170));
  last = w.t;
}
for (const h of w.hist.yearly.slice(h0)) if (h.hives != null) console.log('Y' + h.y, 'pop', h.pop, 'hives', h.hives, 'honey', h.honey, 'births', h.births);
const s = S.summary(w);
console.log('hives', s.hives, 'logs', s.hiveLogs, 'honey kept', s.honey, 'ever', s.honeyEver, 'swarms', s.swarms, 'lost', s.swarmsLost, 'died', s.hivesDied, 'meads', s.meads, 'wounds', s.honeyWounds, 'pop', s.pop);
