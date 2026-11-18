// Probe: how often islanders earn a byname, and what the living tallies look like.
import * as S from '../src/sim.js';
for (const seed of [20261114, 777, 4242]) {
  const w = S.genesis(seed, 0);
  S.advanceTo(w, 100 * S.TICKS_PER_YEAR);
  const named = w.chronicle.filter((e) => / the (Wolf-slayer|Hunter|Finder|Builder|Fisher|Reaper)/.test(e.text));
  const by = {};
  for (const e of named) { const m = / the (Wolf-slayer|Hunter|Finder|Builder|Fisher|Reaper)/.exec(e.text); by[m[1]] = (by[m[1]] || 0) + 1; }
  console.log(seed, 'pop', w.people.length, 'chronicle', w.chronicle.length, 'byname lines', named.length, by);
  const top = {};
  for (const p of w.people) for (const [k, v] of Object.entries(p.dd || {})) if (k !== 'by') top[k] = Math.max(top[k] || 0, v);
  console.log('  living max', top);
  for (const e of named.slice(0, 6)) console.log('  ', e.s, e.text);
}
