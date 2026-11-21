// Time five late-game years on seed 4242 with and without children's snow play (same starting world).
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
const off = src.replace('const snowOk = (w, c) =>', 'const snowOk = (w, c) => false &&');
const mod = async (code, tag) => import('data:text/javascript;base64,' + Buffer.from(code + `\n//${tag}`).toString('base64'));
const on = await mod(src, 'on'), no = await mod(off, 'off');
const w0 = on.genesis(4242, 0);
on.advanceTo(w0, 80 * on.TICKS_PER_YEAR);
const snap = JSON.stringify(w0);
for (const [label, S] of [['snow on', on], ['snow off', no], ['snow on', on], ['snow off', no]]) {
  const w = JSON.parse(snap);
  const t = Date.now();
  S.advanceTo(w, 85 * S.TICKS_PER_YEAR);
  console.log(label, 'pop', w.people.length, (Date.now() - t) / 5, 'ms/yr');
}
