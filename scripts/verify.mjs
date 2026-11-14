// Gate for agent changes: the LIVE world must load under the new rules and keep living.
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const { w: raw, live } = loadLive();
const ids = new Set(raw.people.map((p) => p.id));
const w = S.migrate(JSON.parse(JSON.stringify(raw)));
const fails = [];
if (w.v !== S.SIM_VERSION) fails.push(`migrate left version ${w.v}, expected ${S.SIM_VERSION}`);
for (const id of ids) if (!w.people.some((p) => p.id === id)) { fails.push(`migration lost villager ${id}`); break; }
const start = S.summary(w);
const t0 = Date.now();
S.advanceTo(w, w.t + 15 * S.TICKS_PER_YEAR);
const ms = Date.now() - t0;
const end = S.summary(w);
if (!Number.isFinite(w.food) || !Number.isFinite(w.timber)) fails.push('stores became non-finite');
if (w.people.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) fails.push('villager position became non-finite');
if (start.pop >= 10 && end.pop < start.pop * 0.4) fails.push(`population collapsed ${start.pop} -> ${end.pop}`);
if (end.pop > Math.max(600, start.pop * 4)) fails.push(`population exploded ${start.pop} -> ${end.pop}`);
const perYear = ms / 15;
if (perYear > 1500 * Math.max(1, end.pop / 300)) fails.push(`too slow: ${perYear.toFixed(0)} ms per simulated year`);
// determinism across save/load on the live world
const a = S.migrate(JSON.parse(JSON.stringify(raw))), b = JSON.parse(JSON.stringify(a));
S.advanceTo(a, a.t + 2000);
let bb = b; while (bb.t < a.t) { S.advanceTo(bb, Math.min(a.t, bb.t + 333)); bb = JSON.parse(JSON.stringify(bb)); }
if (S.fingerprint(a) !== S.fingerprint(bb)) fails.push('non-deterministic across save/load');
console.log(`${live ? 'live' : 'test'} world ${start.name}: pop ${start.pop} -> ${end.pop} over 15 years, ${perYear.toFixed(0)} ms/yr`);
if (fails.length) { console.error('VERIFY FAILED:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('VERIFY OK');
