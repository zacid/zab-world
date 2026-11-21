// Time five late-game years on seed 4242 (around 250-300 people), with and without late frosts.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const off = src.replace('if (s.n < FROST_SET_IN) return;', 'return;');
for (const [label, code] of [['frost on', src], ['frost off', off]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}`).toString('base64'));
  const w = S.genesis(4242, 0);
  S.advanceTo(w, 90 * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, 95 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr');
}
