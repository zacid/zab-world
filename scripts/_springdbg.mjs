// node scripts/_springdbg.mjs [seed] [years]: run until the spring is dry, then trace the carries hour by hour for two days
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 4242), years = +(process.argv[3] || 60);
const w = S.genesis(seed, 0);
S.advanceTo(w, w.t + years * S.TICKS_PER_YEAR);
let n = 0;
while (!(w.spring && w.spring.dry) && n++ < 2 * S.TICKS_PER_YEAR) S.step(w);
for (let h = 0; h < 48; h++) {
  S.step(w);
  const c = S.clock(w.t), sp = w.spring;
  const tasks = {};
  for (const p of w.people) { const k = p.task ? p.task.k + (p.task.b ? 'B' : '') : '-'; tasks[k] = (tasks[k] || 0) + 1; }
  const water = w.people.filter((p) => p.task && p.task.k === 'water').length;
  console.log('h', c.hour, 'pop', w.people.length, 'need', sp.nd, 'c', sp.c, 'o', sp.o, 'real', water, 'sh', sp.sh, JSON.stringify(tasks));
}
