// Time years 60-65 on seed 4242 with the committed sim.js and with the working copy (dugout).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const cur = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const old = execSync('git show HEAD:src/sim.js', { cwd: new URL('..', import.meta.url) }).toString();
for (const [label, code] of [['old', old], ['new', cur], ['old', old], ['new', cur]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${Math.random()}`).toString('base64'));
  const w = S.genesis(4242, 0);
  S.advanceTo(w, 60 * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, 65 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr');
}
