import { execSync } from 'node:child_process';
import * as S from '../src/sim.js';
const live = process.argv[2] !== 'seed';
let w;
if (live) w = S.migrate(JSON.parse(execSync('git show origin/world-data:state.json', { maxBuffer: 64 << 20 }).toString()));
else { w = S.genesis(+process.argv[3] || 20261114, 0); S.advanceTo(w, (+process.argv[4] || 30) * S.TICKS_PER_YEAR); }
const tile = (x, y) => (x < 0 || y < 0 || x >= S.MAP || y >= S.MAP ? 0 : w.tiles[y * S.MAP + x]);
const dist = (f) => { for (let r = 1; r <= 20; r++) for (let yy = f.y - r; yy <= f.y + r; yy++) for (let xx = f.x - r; xx <= f.x + r; xx++) if (tile(xx, yy) === S.T.WATER) return r; return 99; };
let sand = 0; for (const t of w.tiles) if (t === S.T.SAND) sand++;
console.log('sand tiles', sand, 'fire', w.fire);
const h = {};
for (const f of w.fields) { const d = dist(f); h[d] = (h[d] || 0) + 1; }
console.log('fields', w.fields.length, 'by distance to sea', h);
