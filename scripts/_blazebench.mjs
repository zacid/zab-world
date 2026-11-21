// Time five late-game years with and without wildfire. node scripts/_blazebench.mjs [seed]
import { readFileSync } from 'node:fs';
const seed = +(process.argv[2] || 777);
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const off = src.replace('function blazeDay(w, c, was, wasN) {', 'function blazeDay(w, c, was, wasN) { return;');
for (const [label, code] of [['fire on', src], ['fire off', off]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${Math.random()}`).toString('base64'));
  const w = S.genesis(seed, 0);
  S.advanceTo(w, 90 * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, 95 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr', 'fires', w.blaze ? w.blaze.n : 0);
}
