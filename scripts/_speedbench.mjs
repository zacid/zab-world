// node scripts/_speedbench.mjs [seed] [from] [to]: ms per year for the committed sim.js and the working copy,
// and whether both end in exactly the same world (a hash of the saved state)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const seed = +(process.argv[2] || 4242), from = +(process.argv[3] || 80), to = +(process.argv[4] || 83);
const now = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const head = execFileSync('git', ['show', 'HEAD:src/sim.js'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
const out = {};
for (const [label, code] of [['HEAD', head], ['work', now]]) {
  const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${process.hrtime.bigint()}`).toString('base64'));
  const w0 = S.genesis(seed, 0);
  S.advanceTo(w0, from * S.TICKS_PER_YEAR);
  const w = S.migrate(JSON.parse(JSON.stringify(w0))); // the live world is always loaded from its save first
  const t = process.hrtime.bigint();
  S.advanceTo(w, to * S.TICKS_PER_YEAR);
  const ms = Number(process.hrtime.bigint() - t) / 1e6 / (to - from);
  // keys sorted, so a property cleared to undefined and one deleted give the same fingerprint
  const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, canon(v[k])])) : v;
  const h = createHash('sha1').update(JSON.stringify(canon(JSON.parse(JSON.stringify(w))))).digest('hex').slice(0, 12);
  out[label] = h;
  console.log(label, 'pop', w.people.length, Math.round(ms), 'ms/yr', h);
}
console.log(out.HEAD === out.work ? 'same world' : 'WORLDS DIFFER');
