import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const w = S.migrate(JSON.parse(JSON.stringify(loadLive().w)));
const yrs = +(process.argv[2] || 20);
for (let y = 0; y < yrs; y++) {
  S.advanceTo(w, w.t + S.TICKS_PER_YEAR);
  const s = S.summary(w);
  console.log(s.year, 'pop', s.pop, 'timber', Math.round(s.timber), 'goats', s.goats, 'loom', s.loom, s.weaver, 'hair', s.hair, 'yarn', s.yarn, 'blankets', s.blankets, 'cover', s.blanketCover, 'woven', s.woven, 'houses', s.houses);
}
for (const e of w.log.filter((e) => /loom|blanket|spindle|moult|weav/i.test(e.text || e[2] || JSON.stringify(e))).slice(0, 12)) console.log(JSON.stringify(e).slice(0, 400));
