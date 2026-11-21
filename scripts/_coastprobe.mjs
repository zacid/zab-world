// node scripts/_coastprobe.mjs [seed|live] [years]: how far the fields lie from the sea (Chebyshev tiles)
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const src = process.argv[2] || 'live', years = +(process.argv[3] || 0);
const w = src === 'live' ? S.migrate(loadLive().w) : S.genesis(+src, 0);
S.advanceTo(w, w.t + years * S.TICKS_PER_YEAR);
const t = (x, y) => (x < 0 || y < 0 || x >= S.MAP || y >= S.MAP ? S.T.WATER : w.tiles[y * S.MAP + x]);
const dist = (f) => { for (let r = 1; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (t(f.x + dx, f.y + dy) === S.T.WATER) return r; return 99; };
const hist = {};
for (const f of w.fields) { const d = dist(f); hist[d] = (hist[d] || 0) + 1; }
console.log(src, 'Y' + S.clock(w.t).year, 'fields', w.fields.length, 'by distance to sea', JSON.stringify(hist), 'fire', w.fire);
