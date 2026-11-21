// Pottery on the live world (or a seed) year by year: node scripts/_potprobe.mjs [years] [seed]
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 15), seed = process.argv[3];
const w = seed ? S.genesis(+seed, 0) : S.migrate(loadLive().w);
const seen = new Set();
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  console.log(`Y${s.year} pop ${s.pop} food ${s.food} timber ${s.timber} rats ${s.rats} ateLastYr ${h.rats} jars ${s.jars} wet ${s.jarsWet} sealed ${s.jarsSealed} potter ${s.potter} firings ${s.firings}`);
}
for (const e of [...w.chronicle, ...w.log]) if (/clay|jar|kiln|potter/.test(e.text) && !seen.has(e.t + e.text)) { seen.add(e.t + e.text); console.log(' ', e.s, e.text); }
