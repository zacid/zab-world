// Time ten late-game years on seed 4242 (around 300 people), with and without the deeds tally.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const off = src.replace('function deed(w, p, k, v = 1) {', 'function deed(w, p, k, v = 1) { return;');
for (const [label, code] of [['deeds on', src], ['deeds off', off], ['deeds on', src]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${Math.random()}`).toString('base64'));
  const w = S.genesis(4242, 0);
  S.advanceTo(w, 90 * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, 95 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr');
}
