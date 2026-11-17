import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const runs = [['live', S.migrate(JSON.parse(JSON.stringify(loadLive().w))), 15]];
for (const seed of [20261114, 777, 4242]) runs.push([seed, S.genesis(seed, 0), 100]);
for (const [name, w, yrs] of runs) {
  const t0 = Date.now(), end = w.t + yrs * S.TICKS_PER_YEAR, seen = new Set(), lines = [];
  let fogWolfDeaths = 0;
  while (w.t < end) {
    S.step(w);
    for (const e of w.log) if (!seen.has(e)) { seen.add(e); if (/horn|shell/.test(e.text)) lines.push(`${e.s} ${e.text}`); if (/Wolves take .* in the fog/.test(e.text)) fogWolfDeaths++; }
  }
  const s = S.summary(w);
  console.log(`${name}: pop ${s.pop}, fa ${w.fauna && w.fauna.fa}, horn ${JSON.stringify(w.horn)}, learned ${w.learned.foghorn != null ? S.clock(w.learned.foghorn).year : '-'}, lost ${w.lost.n} found ${w.lost.f} died ${w.lost.d}, fog wolf deaths ${fogWolfDeaths}, ${Date.now() - t0} ms`);
  for (const l of lines.slice(0, 6)) console.log('  ', l);
}
