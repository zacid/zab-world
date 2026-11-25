import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const seed = process.argv[2];
const yrs = +(process.argv[3] || 6);
let w = seed ? S.genesis(+seed, 0) : S.migrate(JSON.parse(JSON.stringify(loadLive().w)));
let lastCur = null, maxOn = 0;
const end = w.t + yrs * S.TICKS_PER_YEAR;
while (w.t < end) {
  S.step(w);
  const R = w.stones;
  if (R && R.cur) {
    const n = w.people.filter((p) => p.task && p.task.k === 'stone').length;
    if (n > maxOn) maxOn = n;
    const c = S.clock(w.t);
    if (c.hour === 12 && (!lastCur || lastCur !== c.day)) { lastCur = c.day; console.log(`Y${c.year} d${c.doy} stone ${R.cur.k} at ${R.cur.x.toFixed(1)},${R.cur.y.toFixed(1)} lever ${R.cur.w} h ${R.cur.h} up ${R.cur.up} crew ${R.cur.ids.length} on ${n}`); }
  }
}
const R = w.stones;
console.log('stones', R && { cx: R.cx, cy: R.cy, sx: R.sx, sy: R.sy, up: R.s.length, hurt: R.hurt, s: R.s }, 'maxOn', maxOn, 'pop', w.people.length);
for (const e of w.chronicle.filter((e) => /stone/.test(e.text))) console.log(e.s, e.text);
for (const e of w.log.filter((e) => /stone/i.test(e.text))) console.log('  log', e.s, e.text.slice(0, 140));
