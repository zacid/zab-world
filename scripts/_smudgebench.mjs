// Time five late-game years on seed 4242 with the committed sim and with the working copy (smudge fires).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const now = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const base = execSync('git show HEAD:src/sim.js', { cwd: new URL('..', import.meta.url) }).toString();
for (const [label, code] of [['HEAD', base], ['working', now]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}`).toString('base64'));
  const w = S.genesis(4242, 0);
  S.advanceTo(w, 90 * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, 95 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr');
}
