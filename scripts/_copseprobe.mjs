// node scripts/_copseprobe.mjs [years] [seed|live]: tall trees near the hearth, stools, timber per year
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const years = +(process.argv[2] || 10), arg = process.argv[3] || 'live';
let w;
if (arg === 'live') { w = S.migrate(loadLive().w); S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now()))); }
else w = S.genesis(+arg, 0);
const near = (R) => { let n = 0; for (let y = 0; y < S.MAP; y++) for (let x = 0; x < S.MAP; x++) { const i = y * S.MAP + x; if (w.tiles[i] === S.T.FOREST && w.wood[i] >= 6 && (x - w.fire.x) ** 2 + (y - w.fire.y) ** 2 <= R * R) n++; } return n; };
const t0 = w.t;
for (let y = 0; y < years; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w), h = w.hist.yearly[w.hist.yearly.length - 1] || {};
  console.log('Y' + (s.year - 1), 'pop', s.pop, 'houses', s.houses, 'fields', s.fields, 'timber', s.timber, 'tall<=12', near(12), 'tall<=20', near(20), 'copse', w.copse ? `stools=${w.copse.s.length} tall=${w.copse.s.filter((i) => w.wood[i] >= 6).length} cut=${w.copse.n} yr=${h.copse}` : '-', 'deaths', h.deaths, 'cold', h.cold || 0);
}
for (const e of [...w.chronicle, ...w.log]) if (e.t >= t0 && /copp|stool|hazel|cold/i.test(e.text)) console.log(e.s, e.text);
