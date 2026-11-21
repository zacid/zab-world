// Population every 20 years on the test seeds, last commit's sim vs the current one: node scripts/_potpop.mjs [years]
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const years = +(process.argv[2] || 100);
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const old = execSync('git show HEAD:src/sim.js', { cwd: new URL('..', import.meta.url) }).toString();
for (const seed of [20261114, 777, 4242]) {
  for (const [label, code] of [['HEAD', old], ['now ', src]]) {
    const S = await import('data:text/javascript;base64,' + Buffer.from(code + `\n//${label}${seed}`).toString('base64'));
    const w = S.genesis(seed, 0), row = [];
    let rats = 0;
    for (let y = 20; y <= years; y += 20) {
      S.advanceTo(w, y * S.TICKS_PER_YEAR);
      row.push(w.people.length);
    }
    for (const h of w.hist.yearly) rats += h.rats || 0;
    console.log(seed, label, row.join(' '), 'rats ate', rats, 'fever cases', w.fever ? w.fever.all : 0, 'jars', w.pot ? w.pot.j : '-');
  }
}
