// node scripts/_tasks.mjs [seed] [from] [years]: share of person-hours by task kind (adults 14-64 awake by day)
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 4242), from = +(process.argv[3] || 80), yrs = +(process.argv[4] || 1);
const w = S.genesis(seed, 0);
S.advanceTo(w, from * S.TICKS_PER_YEAR);
const n = {}; let all = 0;
const end = (from + yrs) * S.TICKS_PER_YEAR;
while (w.t < end) {
  S.step(w);
  for (const p of w.people) {
    const a = S.ageY(w, p);
    if (a < 14 || a >= 65) continue;
    const k = p.task ? p.task.k + (p.task.k === 'idle' ? '' : '') : 'none';
    n[k] = (n[k] || 0) + 1; all++;
  }
}
console.log('pop', w.people.length);
for (const [k, v] of Object.entries(n).sort((a, b) => b[1] - a[1])) console.log((v / all * 100).toFixed(1).padStart(5) + '%', k);
