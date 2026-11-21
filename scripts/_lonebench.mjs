// node scripts/_lonebench.mjs [seed] [from] [to]: ms per year for the committed sim.js and the working copy
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const seed = +(process.argv[2] || 20261114), from = +(process.argv[3] || 60), to = +(process.argv[4] || 70);
const now = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const head = execFileSync('git', ['show', 'HEAD:src/sim.js'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
for (const [label, code] of [['HEAD', head], ['work', now], ['HEAD', head], ['work', now]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${Math.random()}`).toString('base64'));
  const w = S.genesis(seed, 0);
  S.advanceTo(w, from * S.TICKS_PER_YEAR);
  const t = Date.now();
  S.advanceTo(w, to * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, Math.round((Date.now() - t) / (to - from)), 'ms/yr');
}
