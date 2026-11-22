// node --allow-natives-syntax scripts/_fastprops.mjs [seed] [year]: how many people/fields/beasts are still in fast-property mode
import * as S from '../src/sim.js';
const seed = +(process.argv[2] || 4242), yr = +(process.argv[3] || 40);
const w = S.genesis(seed, 0);
S.advanceTo(w, yr * S.TICKS_PER_YEAR);
const fast = (o) => eval('%HasFastProperties(o)');
const count = (list) => `${list.filter(fast).length}/${list.length}`;
console.log('people', count(w.people), 'fields', count(w.fields), 'buildings', count(w.buildings), 'beasts', w.beasts ? count(w.beasts) : '-');
const shapes = (list) => { const reps = []; for (const o of list) if (!reps.some((r) => eval('%HaveSameMap(r, o)'))) reps.push(o); return reps.length; };
console.log('distinct shapes: people', shapes(w.people), 'fields', shapes(w.fields), 'buildings', shapes(w.buildings), 'tasks', shapes(w.people.filter((p) => p.task).map((p) => p.task)));
console.log('tasks', count(w.people.filter((p) => p.task).map((p) => p.task)), 'w', fast(w), 'res', fast(w.res), 'stats', fast(w.stats));
