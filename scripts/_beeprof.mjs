// node scripts/_beeprof.mjs: time spent inside the bee code over two late-game years on seed 4242
import { readFileSync } from 'node:fs';
let src = readFileSync(new URL('../src/sim.js', import.meta.url), 'utf8');
for (const f of ['beeDay', 'beeTask', 'honeyDone', 'findHiveSite']) {
  src = src.replace(`function ${f}(`, `function ${f}(...a) { const t0 = performance.now(); try { return ${f}_(...a); } finally { globalThis.BT[${JSON.stringify(f)}] = (globalThis.BT[${JSON.stringify(f)}] || 0) + performance.now() - t0; } }\nfunction ${f}_(`);
}
globalThis.BT = {};
const S = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const w = S.genesis(4242, 0);
S.advanceTo(w, 90 * S.TICKS_PER_YEAR);
globalThis.BT = {};
const t = Date.now();
S.advanceTo(w, 92 * S.TICKS_PER_YEAR);
console.log('pop', w.people.length, (Date.now() - t) / 2, 'ms/yr', Object.fromEntries(Object.entries(globalThis.BT).map(([k, v]) => [k, Math.round(v / 2) + ' ms/yr'])));
