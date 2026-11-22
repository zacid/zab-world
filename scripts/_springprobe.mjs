// node scripts/_springprobe.mjs [years] [seed|live]: days the spring was dry, thirsty days and water carried each year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 20), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const t0 = w.t;
let dryYears = 0, thirsty = 0;
for (let y = 0; y < years; y++) {
  const a = Date.now();
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  if (h.dry) dryYears++;
  thirsty += h.thirst || 0;
  console.log('Y' + h.y, 'pop', s.pop, 'dry', h.dry ?? 0, 'thirst', h.thirst ?? 0, 'carried', h.carried ?? 0, 'level', s.springLevel + '%', 'died of thirst', s.springDied, 'deaths', h.deaths, 'ms', Date.now() - a);
}
console.log('dry years', dryYears, 'of', years, 'thirsty days', thirsty, 'spring', JSON.stringify(w.spring && { x: w.spring.x, y: w.spring.y, px: w.spring.px, py: w.spring.py, fire: w.fire }));
for (const e of w.chronicle) if (e.t >= t0 && /spring|pool|thirst/i.test(e.text)) console.log(e.s, e.text.slice(0, 300));
