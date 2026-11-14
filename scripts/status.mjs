// What's happening on the island right now - read this before choosing what to build.
import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const { w: raw, live } = loadLive();
const w = S.migrate(raw);
S.advanceTo(w, Math.max(w.t, S.tickAt(w, Date.now())));
const s = S.summary(w);
console.log(live ? 'LIVE WORLD' : 'NO LIVE WORLD YET (showing a 30-year test island)');
console.log(JSON.stringify(s, null, 1));
console.log('techs:', w.techs.join(', '));
console.log('wild food', Math.round(w.wild), '| harvest factor', w.harvest, '| forest tiles', w.tiles.filter((t) => t === S.T.FOREST).length, '| grass tiles', w.tiles.filter((t) => t === S.T.GRASS).length);
console.log('\nyearly history (last 15):');
for (const y of w.hist.yearly.slice(-15)) console.log(' ', JSON.stringify(y));
console.log('\nchronicle:'); for (const e of w.chronicle) console.log(' ', e.s, e.text);
console.log('\nrecent log:'); for (const e of w.log.slice(-40)) console.log(' ', e.s, `[${e.k}]`, e.text);
