import * as S from '../src/sim.js';
for (const seed of [20261114, 777, 4242]) {
  const w = S.genesis(seed, 0);
  const seen = new Set(), lines = [];
  let maxSearch = 0, t0 = Date.now();
  for (let y = 1; y <= 100; y++) {
    while (w.t < y * S.TICKS_PER_YEAR) {
      S.step(w);
      if (w.lost.cur) maxSearch = Math.max(maxSearch, w.people.filter((p) => p.task && p.task.k === 'search').length);
      for (const e of w.log) if (!seen.has(e) && /fog|torchlight|smoke of the hearth|wandered/.test(e.text) && /wander|find|finds|comes across|stumbles/.test(e.text)) { seen.add(e); lines.push(`${e.s} ${e.text}`); }
    }
  }
  const s = S.summary(w);
  console.log(`seed ${seed}: pop ${s.pop}, lost ${w.lost.n}, found ${w.lost.f}, died ${w.lost.d}, max searchers ${maxSearch}, ${Date.now() - t0} ms`);
  for (const l of lines.slice(0, 14)) console.log('  ', l);
}
