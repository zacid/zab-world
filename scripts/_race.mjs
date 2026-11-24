import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const yrs = +(process.argv[2] || 12);
const w = S.migrate(JSON.parse(JSON.stringify(loadLive().w)));
const seen = new Set(w.log.map((e) => e.t + e.text));
const end = w.t + yrs * S.TICKS_PER_YEAR;
while (w.t < end) {
  S.step(w);
  const c = S.clock(w.t);
  if (w.fest.race && w.fest.race.d === c.day && c.hour >= 17 && c.hour <= 20) {
    const R = w.fest.race;
    console.log(`Y${c.year} h${c.hour}`, R.rs.map(([id]) => { const p = w.people.find((q) => q.id === id); return p ? `${p.name}@${p.x.toFixed(1)},${p.y.toFixed(1)}` : id; }).join(' '));
  }
}
for (const e of w.log) if (/race|wreath|Swift/.test(e.text) && !seen.has(e.t + e.text)) console.log(e.text);
for (const e of w.chronicle || []) if (/race|wreath|Swift/.test(e.text)) console.log('CHRON', e.text);
console.log(S.summary(w).races, S.summary(w).raceLast, w.fire);
