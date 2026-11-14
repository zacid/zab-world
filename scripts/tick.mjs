// The world clock. Loads world/state.json (or founds the world), upgrades it to the
// current rules, simulates up to "now", and writes it back with a public summary.
// Usage: node scripts/tick.mjs [stateDir]   (default: world)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as S from '../src/sim.js';

const dir = process.argv[2] || 'world';
const file = `${dir}/state.json`;
mkdirSync(dir, { recursive: true });

let w;
if (existsSync(file)) {
  w = S.migrate(JSON.parse(readFileSync(file, 'utf8')));
} else {
  const seed = +(process.env.WORLD_SEED || 20261114);
  const epoch = Math.floor(Date.now() / 3600000) * 3600000; // founded on the hour
  w = S.genesis(seed, epoch);
  console.log(`Founded ${w.name} (seed ${seed}) at ${new Date(epoch).toISOString()}`);
}

const before = S.summary(w);
const target = S.tickAt(w, Date.now());
const t0 = Date.now();
S.advanceTo(w, target);
const after = S.summary(w);

// sanity: never publish a broken world
const bad = [];
if (!Number.isFinite(w.food) || !Number.isFinite(w.timber)) bad.push('non-finite stores');
if (w.people.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) bad.push('lost villager');
if (w.people.length > 5000) bad.push('population runaway');
if (bad.length) { console.error('Refusing to save:', bad.join(', ')); process.exit(1); }

writeFileSync(file, JSON.stringify(w));
writeFileSync(`${dir}/summary.json`, JSON.stringify({ ...after, t: w.t, updated: new Date().toISOString(), version: w.v, techs: w.techs }, null, 1));
console.log(`${after.name}: Y${before.year} ${before.season} -> Y${after.year} ${after.season} ${after.day}, pop ${before.pop} -> ${after.pop} (${Date.now() - t0} ms)`);
