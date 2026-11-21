// Wildfire probe: run a seed for N years and report fires, burnt tiles and forest. node scripts/_blazeprobe.mjs [years] [seed] [live]
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 100), seed = +(process.argv[3] || 20261114), live = process.argv[4] === 'live';
const w = live ? S.migrate(loadLive().w) : S.genesis(seed, 0);
const t0 = w.t, seen = new Set();
const forest = () => w.tiles.filter((t) => t === S.T.FOREST).length;
const tell = (e) => { const k = e.t + e.text; if (seen.has(k)) return; seen.add(k); console.log('  ', e.s, e.text); };
for (let y = 1; y <= years; y++) {
  const end = t0 + y * S.TICKS_PER_YEAR;
  while (w.t < end) {
    S.step(w);
    if (w.log.length) { const e = w.log[w.log.length - 1]; if (e.t === w.t - 1 && /woods alight|tinder|puts out the fire|last flames in|burns itself out|Sparks catch|gust of flame|burnt roof/.test(e.text)) tell(e); }
  }
  const s = S.summary(w);
  if (y % 10 === 0 || live) console.log(`Y${s.year} pop ${s.pop} food ${s.food} timber ${s.timber} forest ${forest()} fires ${s.blazeFires} burnt ${s.blazeBurnt} ash ${w.blaze ? w.blaze.ash.length : 0}`);
}
