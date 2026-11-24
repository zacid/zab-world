import * as S from '../src/sim.js';
import { loadLive } from './live.mjs';
const w = S.migrate(loadLive().w);
while (!w.seal || S.clock(w.t).doy < 290 || S.clock(w.t).year < 13) S.advanceTo(w, w.t + 24);
console.log('fire', w.fire, 'seal', JSON.stringify(w.seal), 'canoe', w.canoe.bx, w.canoe.by);
for (let d = 0; d < 6; d++) {
  for (let h = 0; h < 24; h++) {
    S.advanceTo(w, w.t + 1);
    const c = S.clock(w.t);
    if (h % 3 === 0) console.log(c.doy, c.hour, w.wx.k, w.people.filter((p) => S.ageY(w, p) >= 16).map((p) => `${p.name}:${p.task ? p.task.k : '-'}${p.haul ? '+' + p.haul : ''}`).join(' '));
  }
}
