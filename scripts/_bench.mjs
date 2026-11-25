const which = process.argv[2], seed = +(process.argv[3] || 4242), yrs = +(process.argv[4] || 80);
const S = await import(which === 'old' ? './_oldsim.mjs' : '../src/sim.js');
const w = S.genesis(seed, 0);
S.advanceTo(w, (yrs - 10) * S.TICKS_PER_YEAR);
const t0 = Date.now();
S.advanceTo(w, yrs * S.TICKS_PER_YEAR);
console.log(which, 'pop', w.people.length, ((Date.now() - t0) / 10).toFixed(0), 'ms/yr over last 10 yrs');
