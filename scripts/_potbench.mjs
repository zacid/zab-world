// Time five late-game years on seed 777 with the last commit's sim, and the current one with and without pottery.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const old = execSync('git show HEAD:src/sim.js', { cwd: new URL('..', import.meta.url) }).toString();
const off = src.replace('function learnPottery(w, c) {', 'function learnPottery(w, c) { return;');
for (const [label, code] of [['HEAD', old], ['pots off', off], ['pots on', src]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${Math.random()}`).toString('base64'));
  const w = S.genesis(777, 0);
  S.advanceTo(w, 90 * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, 95 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr');
}
