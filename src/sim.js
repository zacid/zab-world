// Deterministic island simulation. Runs identically in Node and the browser.
// Rules: no Math.random, no Date, no trig/exp in the step path; all state lives in
// the JSON-serialisable world object so save -> load -> continue == continue.

export const SIM_VERSION = 2;
export const TICK_MS = 10000;            // 1 game hour = 10 real seconds
export const HOURS_PER_DAY = 24;
export const DAYS_PER_SEASON = 90;
export const DAYS_PER_YEAR = 360;
export const TICKS_PER_DAY = HOURS_PER_DAY;
export const TICKS_PER_YEAR = DAYS_PER_YEAR * HOURS_PER_DAY; // 8640 ticks = 1 real day
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const MAP = 64;

export const T = { WATER: 0, SAND: 1, GRASS: 2, FOREST: 3, FIELD: 4, BUILD: 5 };

// Balance knobs
const SPEED = 3;             // tiles per hour
const FIELD_YIELD = 260;     // food per field per harvest (x harvest factor)
const GROW_DAYS = 80;
const HOUSE_COST = 15;       // wood
const HOUSE_WORK = 16;       // hours
const HOUSE_CAP = 6;
const TREE_MAX = 12;
const CHOP = 4;
const WILD_CAP = 300;
const WILD_REGEN = 8;
const FUEL_PER_HOUSE = 0.3;  // wood per winter day
const SPOIL = 0.0005;        // share of stored food lost per day
const FISH_CAP = 240;        // fish in the shallows around the island
const FISH_REGEN = 5;        // per day, spring to autumn (2 in winter)

export const TECHS = {
  fire:     { name: 'Fire',      desc: 'A hearth at the heart of the village. Warmth, light, cooked food.', req: [] },
  shelter:  { name: 'Shelter',   desc: 'Timber houses keep families together through winter.', req: ['fire'] },
  gather:   { name: 'Gathering', desc: 'Berries, roots and nuts foraged from the wild.', req: ['fire'] },
  farming:  { name: 'Farming',   desc: 'Grain planted in spring, harvested before the frost.', req: ['gather'] },
  woodcut:  { name: 'Woodcutting', desc: 'Stone axes fell trees for timber and firewood.', req: ['fire'] },
  fishing:  { name: 'Fishing',   desc: 'Spears and lines cast from the beach. Food in every season, even winter.', req: ['gather'] },
};

// ---------- randomness ----------
export function rnd(w) {
  let t = (w.rng = (w.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (w, n) => Math.floor(rnd(w) * n);

function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export { hash };
function vnoise(x, y, cell, s) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), d = hash(gx + 1, gy + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ---------- names ----------
const SYL = ['ka', 'lo', 'mi', 'ra', 'ten', 'sa', 'vi', 'dor', 'an', 'el', 'is', 'ru', 'ba', 'fen', 'ta', 'lin',
  'mor', 'ne', 'ol', 'ys', 'ha', 'bri', 'ce', 'du', 'go', 'wen', 'ar', 'thi', 'em', 'qua', 'ser', 'ul'];
function makeName(w) {
  const n = 2 + (rnd(w) < 0.25 ? 1 : 0);
  let s = '';
  for (let i = 0; i < n; i++) s += SYL[ri(w, SYL.length)];
  return s[0].toUpperCase() + s.slice(1);
}

// ---------- time helpers ----------
export function clock(t) {
  const day = Math.floor(t / HOURS_PER_DAY);
  const doy = day % DAYS_PER_YEAR;
  return {
    hour: t % HOURS_PER_DAY, day, doy,
    year: Math.floor(day / DAYS_PER_YEAR) + 1,
    season: Math.floor(doy / DAYS_PER_SEASON),
    dos: (doy % DAYS_PER_SEASON) + 1,
  };
}
export const tickAt = (w, ms) => Math.max(0, Math.floor((ms - w.epoch) / TICK_MS));
export const ageY = (w, p) => (w.t - p.born) / TICKS_PER_YEAR;
const stamp = (w) => { const c = clock(w.t); return `Y${c.year} ${SEASONS[c.season]}`; };

// ---------- map helpers ----------
const idx = (x, y) => y * MAP + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP;
const tile = (w, x, y) => (inMap(x, y) ? w.tiles[idx(x, y)] : T.WATER);

function lineOfLand(w, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 0.4);
  for (let i = 0; i <= n; i++) {
    const x = Math.floor(x0 + (dx * i) / (n || 1)), y = Math.floor(y0 + (dy * i) / (n || 1));
    if (tile(w, x, y) === T.WATER) return false;
  }
  return true;
}
function nearBuild(w, x, y, r) {
  for (let yy = y - r; yy <= y + r; yy++)
    for (let xx = x - r; xx <= x + r; xx++) if (tile(w, xx, yy) === T.BUILD) return true;
  return false;
}
const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

// ---------- logging ----------
function log(w, text, k = 'info') {
  w.log.push({ t: w.t, s: stamp(w), text, k });
  if (w.log.length > 200) w.log.splice(0, w.log.length - 200);
}
function milestone(w, text) {
  w.chronicle.push({ t: w.t, s: stamp(w), text });
  log(w, text, 'major');
}

// ---------- genesis ----------
export function genesis(seed, epoch) {
  const w = {
    v: SIM_VERSION, seed, epoch, t: 0, rng: seed | 0,
    name: '', tiles: new Array(MAP * MAP).fill(T.WATER), wood: new Array(MAP * MAP).fill(0),
    fire: { x: 0, y: 0 }, food: 500, timber: 30, wild: 200, harvest: 1,
    buildings: [], fields: [], people: [], nextId: 1, res: {}, prog: {},
    techs: ['fire', 'shelter', 'gather', 'farming', 'woodcut'],
    log: [], chronicle: [], hist: { daily: [], yearly: [] },
    stats: { births: 0, deaths: 0, peak: 0, yb: 0, yd: 0, yh: 0, hungry: false, cold: false },
  };
  // name the island
  let nm = '';
  for (let i = 0; i < 2 + (seed & 1); i++) nm += SYL[Math.floor(hash(i, 7, seed) * SYL.length)];
  w.name = nm[0].toUpperCase() + nm.slice(1);

  // terrain
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const dx = (x - 31.5) / 29, dy = (y - 31.5) / 29;
    const d = Math.sqrt(dx * dx + dy * dy);
    const n = vnoise(x, y, 16, seed) * 0.6 + vnoise(x, y, 6, seed + 1) * 0.3 + vnoise(x, y, 3, seed + 2) * 0.1;
    const h = 1 - d * 1.1 + (n - 0.5) * 0.6;
    let tt = h < 0.12 ? T.WATER : h < 0.2 ? T.SAND : T.GRASS;
    if (tt === T.GRASS && vnoise(x, y, 7, seed + 3) + vnoise(x, y, 3, seed + 4) * 0.25 > 0.66) tt = T.FOREST;
    w.tiles[idx(x, y)] = tt;
    if (tt === T.FOREST) w.wood[idx(x, y)] = TREE_MAX;
  }
  // keep only the landmass connected to the centre
  let cx = 32, cy = 32, best = 1e9;
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++)
    if (w.tiles[idx(x, y)] !== T.WATER) { const dd = d2(x, y, 31.5, 31.5); if (dd < best) { best = dd; cx = x; cy = y; } }
  const seen = new Uint8Array(MAP * MAP), q = [idx(cx, cy)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % MAP, y = (i / MAP) | 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ax, ny = y + ay;
      if (inMap(nx, ny) && !seen[idx(nx, ny)] && w.tiles[idx(nx, ny)] !== T.WATER) { seen[idx(nx, ny)] = 1; q.push(idx(nx, ny)); }
    }
  }
  for (let i = 0; i < MAP * MAP; i++) if (!seen[i]) { w.tiles[i] = T.WATER; w.wood[i] = 0; }

  // hearth: grass-ish tile nearest the centre, with a clearing around it
  w.fire = { x: cx, y: cy };
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++)
    if (tile(w, x, y) === T.FOREST || tile(w, x, y) === T.SAND) { w.tiles[idx(x, y)] = T.GRASS; w.wood[idx(x, y)] = 0; }
  for (const [ax, ay] of [[0, 0], [1, 0], [-1, 0]]) w.tiles[idx(cx + ax, cy + ay)] = T.BUILD;
  w.shore = findShore(w);
  w.fish = FISH_CAP;
  w.techs.push('fishing');

  // founders
  for (let c = 0; c < 3; c++) {
    const home = addBuilding(w, 1);
    const ages = [20 + ri(w, 10), 20 + ri(w, 10)];
    const f = addPerson(w, 'f', ages[0], null, null, home);
    const m = addPerson(w, 'm', ages[1], null, null, home);
    f.partner = m.id; m.partner = f.id;
    if (c < 2) addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', 2 + ri(w, 4), f.id, m.id, home);
  }
  for (let i = 0; i < 3; i++) addField(w);
  milestone(w, `${w.people.length} settlers land on ${w.name} and light a fire.`);
  w.stats.peak = w.people.length;
  return w;
}

// beach tiles touching open water: where the fishers stand. Sand never changes, so this is fixed.
function findShore(w) {
  const out = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    if (tile(w, x, y) !== T.SAND) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(w, x + a, y + b) === T.WATER)) out.push(idx(x, y));
  }
  return out;
}

function addPerson(w, sex, ageYears, mother, father, home) {
  const p = {
    id: w.nextId++, name: makeName(w), sex, born: w.t - Math.floor(ageYears * TICKS_PER_YEAR),
    mother, father, partner: null, home, wants: false, lastBirth: -1e9, hunger: 0,
    x: w.fire.x + 0.5 + (rnd(w) - 0.5) * 3, y: w.fire.y + 0.5 + (rnd(w) - 0.5) * 3, px: 0, py: 0,
    task: null, asleep: false,
  };
  p.px = p.x; p.py = p.y;
  w.people.push(p);
  return p;
}

function findHouseSite(w) {
  let best = null, bd = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
    const tt = tile(w, x, y);
    if ((tt !== T.GRASS && tt !== T.FOREST) || nearBuild(w, x, y, 1)) continue;
    const dd = d2(x, y, fx, fy) + hash(x, y, w.seed + 9) * 2 + (tt === T.FOREST ? 6 : 0);
    if (dd < 5 || dd >= bd) continue;
    if (!lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bd = dd; best = { x, y };
  }
  return best;
}
function addBuilding(w, progress) {
  const s = findHouseSite(w);
  if (!s) return null;
  w.timber += w.wood[idx(s.x, s.y)];
  w.wood[idx(s.x, s.y)] = 0;
  w.tiles[idx(s.x, s.y)] = T.BUILD;
  const b = { id: w.nextId++, kind: 'house', x: s.x, y: s.y, progress };
  w.buildings.push(b);
  return b.id;
}
function findFieldSite(w) {
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
    const tt = tile(w, x, y);
    if (tt !== T.GRASS && tt !== T.FOREST) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 16) continue;
    let adj = 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tile(w, x + ax, y + ay) === T.FIELD) adj++;
    const sc = Math.sqrt(dd) - adj * 1.6 + hash(x, y, w.seed + 5) + (tt === T.FOREST ? 4 : 0);
    if (sc >= bs) continue;
    if (!lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
function addField(w, at) {
  const s = at || findFieldSite(w);
  if (!s) return null;
  w.tiles[idx(s.x, s.y)] = T.FIELD;
  const f = { id: w.nextId++, x: s.x, y: s.y, stage: 'fallow', growth: 0 };
  w.fields.push(f);
  return f;
}

// ---------- the step ----------
export function step(w, fx) {
  const c = clock(w.t);
  for (const p of w.people) { p.px = p.x; p.py = p.y; }
  if (c.hour === 0) daily(w, c, fx);
  if (c.hour === 19) supper(w);
  for (const p of w.people) if (!p.dead) act(w, p, c, fx);
  if (w.people.some((p) => p.dead)) w.people = w.people.filter((p) => !p.dead);
  w.t++;
}

export function advanceTo(w, target, fx, maxSteps = Infinity) {
  let n = 0;
  while (w.t < target && n < maxSteps) { step(w, fx); n++; }
  return n;
}

function supper(w) {
  // everyone shares what there is; hunger builds with the shortfall
  const n = w.people.length;
  if (!n) return;
  const share = Math.min(1, w.food / n);
  w.food = Math.max(0, Math.round((w.food - share * n) * 100) / 100);
  for (const p of w.people) p.hunger = share >= 1 ? Math.max(0, p.hunger - 2) : Math.round((p.hunger + (1 - share)) * 100) / 100;
  const hungry = share < 1 ? n : 0;
  if (hungry && !w.stats.hungry) { w.stats.hungry = true; log(w, share > 0.5 ? 'Rations are cut. Bowls are half full.' : 'The stores are empty. The village goes hungry.', 'bad'); }
  if (!hungry && w.stats.hungry) { w.stats.hungry = false; log(w, 'There is food on every plate again.', 'good'); }
}

function daily(w, c, fx) {
  const pop = w.people.length;
  w.food = Math.round(w.food * (1 - SPOIL) * 100) / 100;
  // new year
  if (c.doy === 0) {
    if (c.year > 1) {
      w.hist.yearly.push({ y: c.year - 1, pop, births: w.stats.yb, deaths: w.stats.yd, harvest: w.stats.yh, food: Math.round(w.food), timber: Math.round(w.timber) });
      log(w, `Year ${c.year - 1} ends: ${pop} people, ${w.stats.yb} born, ${w.stats.yd} died, ${w.stats.yh} grain harvested.`, 'year');
    }
    w.stats.yb = w.stats.yd = w.stats.yh = 0;
    w.harvest = Math.round((0.65 + rnd(w) * 0.65) * 100) / 100;
    if (w.harvest < 0.8) log(w, 'A dry spring. The elders fear a thin harvest.', 'bad');
    else if (w.harvest > 1.15) log(w, 'Warm rains this spring. The soil feels rich.', 'good');
    for (const f of w.fields) if (f.stage === 'harvested') f.stage = 'fallow';
  }
  // crops rot at the first frost
  if (c.doy === DAYS_PER_SEASON * 3) {
    let rot = 0;
    for (const f of w.fields) if (f.stage === 'planted' || f.stage === 'ripe') { f.stage = 'fallow'; f.growth = 0; rot++; }
    if (rot) log(w, `Frost takes ${rot} unharvested field${rot > 1 ? 's' : ''}.`, 'bad');
  }
  // growth
  if (c.season < 3) {
    for (const f of w.fields) if (f.stage === 'planted') {
      f.growth = Math.min(1, Math.round((f.growth + 1 / GROW_DAYS) * 10000) / 10000);
      if (f.growth >= 1) f.stage = 'ripe';
    }
    w.wild = Math.min(WILD_CAP, w.wild + WILD_REGEN);
  }
  if (w.shore) w.fish = Math.min(FISH_CAP, w.fish + (c.season < 3 ? FISH_REGEN : 2));
  // forests regrow
  for (let k = 0; k < 60; k++) {
    const x = ri(w, MAP), y = ri(w, MAP), i = idx(x, y);
    if (w.tiles[i] === T.FOREST && w.wood[i] < TREE_MAX) w.wood[i]++;
    else if (w.tiles[i] === T.GRASS && rnd(w) < 0.05 && !nearBuild(w, x, y, 1) &&
      ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(w, x + a, y + b) === T.FIELD) &&
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(w, x + a, y + b) === T.FOREST)) {
      w.tiles[i] = T.FOREST; w.wood[i] = 1;
    }
  }
  // winter fuel
  if (c.season === 3) {
    const homes = w.buildings.filter((b) => b.progress >= 1 && w.people.some((p) => p.home === b.id)).length;
    const need = homes * FUEL_PER_HOUSE;
    if (w.timber >= need) { w.timber = Math.round((w.timber - need) * 100) / 100; if (w.stats.cold) { w.stats.cold = false; log(w, 'Every hearth is lit again.', 'good'); } }
    else { w.timber = 0; if (!w.stats.cold) { w.stats.cold = true; log(w, 'The woodpile is bare. Homes go cold.', 'bad'); } }
  } else w.stats.cold = false;

  lifeAndDeath(w, c);
  pairing(w);
  housing(w);

  w.hist.daily.push([c.day, w.people.length, Math.round(w.food), Math.round(w.timber)]);
  if (w.hist.daily.length > 400) w.hist.daily.splice(0, w.hist.daily.length - 400);
  if (w.people.length > w.stats.peak) {
    for (const m of [10, 25, 50, 100, 200, 400]) if (w.stats.peak < m && w.people.length >= m) milestone(w, `${w.name} is home to ${m} people.`);
    w.stats.peak = w.people.length;
  }
  if (w.people.length === 0 && !w.stats.empty) {
    w.stats.empty = true;
    milestone(w, `The last fire on ${w.name} goes out.`);
  }
  if (w.people.length === 0 && c.doy === 0) {
    for (let i = 0; i < 2; i++) {
      const f = addPerson(w, 'f', 19 + ri(w, 8), null, null, null), m = addPerson(w, 'm', 19 + ri(w, 8), null, null, null);
      f.partner = m.id; m.partner = f.id;
    }
    w.stats.empty = false;
    milestone(w, `A boat of four settlers finds the cold hearth on ${w.name} and relights it.`);
  }
  if (w.people.length) w.stats.empty = false;
  // castaways keep the island from emptying, and bring new blood
  const lonely = w.people.length < 12 ? 0.004 : 0.0008;
  if (c.season < 3 && rnd(w) < lonely) {
    const n = 1 + ri(w, 2);
    const a = addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', 18 + ri(w, 12), null, null, null);
    a.x = a.px = w.fire.x + 0.5; a.y = a.py = w.fire.y + 3.5;
    let text = `${a.name}, a castaway, washes ashore`;
    if (n === 2) { const b = addPerson(w, a.sex === 'f' ? 'm' : 'f', 18 + ri(w, 12), null, null, null); b.partner = a.id; a.partner = b.id; text = `${a.name} and ${b.name} drift ashore on a raft`; }
    log(w, text + '.', 'good');
  }
}

function die(w, p, why) {
  p.dead = true;
  release(w, p);
  for (const o of w.people) if (o.partner === p.id) o.partner = null;
  w.stats.deaths++; w.stats.yd++;
  log(w, `${p.name} ${why}, aged ${Math.floor(ageY(w, p))}.`, 'death');
}

function lifeAndDeath(w, c) {
  const pop = w.people.length;
  for (const p of w.people) {
    if (p.dead) continue;
    const a = ageY(w, p);
    let risk = 0.00003;
    if (a > 45) { const k = (a - 45) / 30; risk += k * k * k * 0.012; }
    if (a < 2) risk += 0.0002;
    if (w.stats.cold && (a < 6 || a > 55)) risk += 0.006;
    if (p.hunger > 12) risk += 0.0015 * (p.hunger - 12) * (a < 6 || a > 60 ? 2 : 1);
    if (rnd(w) < risk) die(w, p, p.hunger > 12 ? 'starved' : w.stats.cold && (a < 6 || a > 55) ? 'died of the cold' : 'passed away');
  }
  // births
  for (const p of w.people) {
    if (p.dead || p.sex !== 'f' || p.partner == null || p.wants || p.home == null) continue;
    const a = ageY(w, p);
    if (a < 18 || a > 42 || w.t - p.lastBirth < 2 * TICKS_PER_YEAR) continue;
    const dad = w.people.find((o) => o.id === p.partner);
    if (!dad || dad.home !== p.home) continue;
    if (w.people.filter((o) => o.home === p.home).length >= HOUSE_CAP) continue;
    if (w.food < pop * 250) continue;
    if (rnd(w) < 0.0035) {
      const k = addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', 0, p.id, dad.id, p.home);
      k.x = k.px = p.x; k.y = k.py = p.y;
      p.lastBirth = w.t;
      w.stats.births++; w.stats.yb++;
      if (w.stats.births === 1) milestone(w, `${k.name}, the first child born on ${w.name}, arrives to ${p.name} and ${dad.name}.`);
      else log(w, `${p.name} and ${dad.name} welcome ${k.sex === 'f' ? 'a daughter' : 'a son'}, ${k.name}.`, 'birth');
    }
  }
  w.people = w.people.filter((p) => !p.dead);
}

const sibling = (a, b) => (a.mother != null && a.mother === b.mother) || (a.father != null && a.father === b.father);
function pairing(w) {
  for (const f of w.people) {
    if (f.dead || f.sex !== 'f' || f.partner != null || ageY(w, f) < 17) continue;
    if (rnd(w) >= 0.012) continue;
    const fa = ageY(w, f);
    const m = w.people.find((o) => !o.dead && o.sex === 'm' && o.partner == null && ageY(w, o) >= 17 &&
      Math.abs(ageY(w, o) - fa) < 14 && !sibling(f, o) && f.mother !== o.id && o.mother !== f.id);
    if (!m) continue;
    f.partner = m.id; m.partner = f.id; f.wants = true;
    log(w, `${f.name} and ${m.name} are joined at the fire.`, 'love');
  }
}

function occupants(w, id) { let n = 0; for (const p of w.people) if (!p.dead && p.home === id) n++; return n; }
function housing(w) {
  const houses = w.buildings.filter((b) => b.progress >= 1);
  // children follow their mother
  for (const p of w.people) {
    if (p.dead || p.home != null || ageY(w, p) >= 14) continue;
    const mum = w.people.find((o) => o.id === p.mother && !o.dead);
    if (mum && mum.home != null) p.home = mum.home;
  }
  // couples who want their own home take an empty one
  for (const f of w.people) {
    if (f.dead || !(f.wants || (f.home == null && f.partner != null))) continue;
    const h = houses.find((b) => occupants(w, b.id) === 0);
    if (!h) continue;
    const m = w.people.find((o) => o.id === f.partner);
    f.home = h.id; f.wants = false;
    if (m) { m.home = h.id; m.wants = false; }
    log(w, `${f.name}${m ? ' and ' + m.name : ''} move into a home of their own.`, 'info');
  }
  // anyone else without a roof squeezes in where there's room
  for (const p of w.people) {
    if (p.dead || p.home != null) continue;
    const h = houses.find((b) => occupants(w, b.id) < HOUSE_CAP - 1);
    if (h) p.home = h.id;
  }
}

function needHouse(w) {
  return w.people.some((p) => !p.dead && (p.home == null || (p.sex === 'f' && p.wants)));
}
function woodTarget(w) { return HOUSE_COST * 2 + w.buildings.length * 25; }
function needFields(w) {
  const expect = w.fields.length * FIELD_YIELD * 0.9;
  const pop = w.people.length;
  return expect < pop * DAYS_PER_YEAR * 1.3 || (w.food < pop * 120 && w.fields.length < pop * 2.5);
}

function release(w, p) {
  if (p.task && p.task.key) {
    delete w.res[p.task.key];
    if (p.task.h > 0 && p.task.k === 'clear') w.prog[p.task.key] = p.task.h;
  }
  p.task = null;
}
function reserve(w, p, task) {
  if (task.key) {
    w.res[task.key] = p.id;
    if (w.prog[task.key] != null) { task.h = w.prog[task.key]; delete w.prog[task.key]; }
  }
  p.task = task;
}

function nearest(list, p, ok) {
  let best = null, bd = 1e9;
  for (const o of list) { if (!ok(o)) continue; const dd = d2(o.x + 0.5, o.y + 0.5, p.x, p.y); if (dd < bd) { bd = dd; best = o; } }
  return best;
}

function pickTask(w, p, c) {
  const free = (k) => w.res[k] == null;
  // harvest
  let f = nearest(w.fields, p, (o) => o.stage === 'ripe' && free('f' + o.id));
  if (f) return { k: 'harvest', key: 'f' + f.id, x: f.x, y: f.y, h: 4 };
  // planting
  if (c.season === 0) {
    f = nearest(w.fields, p, (o) => o.stage === 'fallow' && free('f' + o.id));
    if (f) return { k: 'plant', key: 'f' + f.id, x: f.x, y: f.y, h: 3 };
  }
  // lean times: everyone who can, forages
  if (c.season < 3 && w.food < w.people.length * 20 && w.wild >= 3) {
    const tk = forage(w, p);
    if (tk) return tk;
  }
  if (w.food < w.people.length * 20) {
    const tk = fish(w, p);
    if (tk) return tk;
  }
  // construction
  let b = nearest(w.buildings, p, (o) => o.progress < 1 && free('b' + o.id));
  if (b) return { k: 'build', key: 'b' + b.id, x: b.x, y: b.y, h: 4 };
  if (needHouse(w) && w.timber >= HOUSE_COST && !w.buildings.some((o) => o.progress < 1)) {
    const id = addBuilding(w, 0);
    if (id != null) {
      w.timber -= HOUSE_COST;
      b = w.buildings[w.buildings.length - 1];
      log(w, 'Timber is stacked for a new house.', 'info');
      return { k: 'build', key: 'b' + b.id, x: b.x, y: b.y, h: 4 };
    }
  }
  // timber
  if (w.timber < woodTarget(w)) {
    let bt = null, bd = 1e9;
    const R = 20;
    for (let y = w.fire.y - R; y <= w.fire.y + R; y++) for (let x = w.fire.x - R; x <= w.fire.x + R; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (w.tiles[i] !== T.FOREST || w.wood[i] < 6 || !free('t' + i)) continue;
      const dd = d2(x + 0.5, y + 0.5, p.x, p.y);
      if (dd < bd && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) { bd = dd; bt = { x, y, i }; }
    }
    if (bt) return { k: 'chop', key: 't' + bt.i, x: bt.x, y: bt.y, h: 3 };
  }
  // new fields
  if (c.season <= 1 && needFields(w)) {
    const s = findFieldSite(w);
    if (s) {
      const key = 'c' + idx(s.x, s.y);
      if (free(key)) return { k: 'clear', key, x: s.x, y: s.y, h: tile(w, s.x, s.y) === T.FOREST ? 9 : 6 };
    }
  }
  // foraging
  if (c.season < 3 && w.wild >= 3) {
    const tk = forage(w, p);
    if (tk) return tk;
  }
  // the shore: in winter, or when the woods are picked bare
  const tk = fish(w, p);
  if (tk) return tk;
  return wander(w, p, w.fire.x, w.fire.y, 3, 2);
}

function fish(w, p) {
  if (!w.shore || w.fish < 3 || !w.techs.includes('fishing')) return null;
  let best = null, bd = 1e9;
  const R2 = 22 * 22;
  const fx = w.fire.x, fy = w.fire.y, px = p.x - 0.5, py = p.y - 0.5;
  for (let k = 0; k < w.shore.length; k++) {
    const i = w.shore[k], x = i % MAP, y = (i - x) / MAP;
    const dd = (x - px) * (x - px) + (y - py) * (y - py);
    if (dd >= bd || (x - fx) * (x - fx) + (y - fy) * (y - fy) > R2 || w.res['s' + i] != null) continue;
    bd = dd; best = { x, y, i };
  }
  // only the nearest free spot is checked for a dry path; if the way is blocked, try another day
  if (!best || !lineOfLand(w, p.x, p.y, best.x + 0.5, best.y + 0.5)) return null;
  return { k: 'fish', key: 's' + best.i, x: best.x, y: best.y, h: 4 };
}

function forage(w, p) {
  for (let tries = 0; tries < 6; tries++) {
    const x = w.fire.x + ri(w, 25) - 12, y = w.fire.y + ri(w, 25) - 12;
    const tt = tile(w, x, y);
    if ((tt === T.GRASS || tt === T.FOREST) && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return { k: 'forage', x, y, h: 3 };
  }
  return null;
}

function wander(w, p, cx, cy, r, h) {
  for (let tries = 0; tries < 5; tries++) {
    const x = cx + ri(w, r * 2 + 1) - r, y = cy + ri(w, r * 2 + 1) - r;
    if (tile(w, x, y) !== T.WATER && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return { k: 'idle', x, y, h };
  }
  return { k: 'idle', x: cx, y: cy, h };
}

function homeOf(w, p) {
  const b = p.home != null ? w.buildings.find((o) => o.id === p.home && o.progress >= 1) : null;
  return b || { x: w.fire.x, y: w.fire.y + 1 };
}

function moveToward(p, tx, ty) {
  const dx = tx - p.x, dy = ty - p.y, dd = Math.sqrt(dx * dx + dy * dy);
  if (dd <= SPEED) { p.x = tx; p.y = ty; return true; }
  p.x = Math.round((p.x + (dx / dd) * SPEED) * 1000) / 1000;
  p.y = Math.round((p.y + (dy / dd) * SPEED) * 1000) / 1000;
  return false;
}

function act(w, p, c, fx) {
  const a = ageY(w, p), h = c.hour;
  const night = h >= 21 || h < 6;
  const evening = h >= 18 && h < 21;
  if (night) {
    if (p.task && p.task.k !== 'home') release(w, p);
    const home = homeOf(w, p);
    const off = (p.id % 3) * 0.25 - 0.25;
    if (moveToward(p, home.x + 0.5 + off, home.y + 0.5)) p.asleep = p.home != null;
    return;
  }
  p.asleep = false;
  if (evening) {
    if (p.task && p.task.k !== 'gather') release(w, p);
    if (!p.task) {
      const ang = (p.id * 2654435761) >>> 0;
      p.task = { k: 'gather', x: w.fire.x + ((ang % 5) - 2), y: w.fire.y + (((ang >>> 8) % 3) - 1) + ((ang >>> 4) & 1 ? 1 : -1), h: 99 };
    }
    moveToward(p, p.task.x + 0.5, p.task.y + 0.5);
    return;
  }
  if (p.task && (p.task.k === 'gather' || p.task.k === 'home')) p.task = null;
  // daytime
  if (!p.task) {
    if (a < 5) p.task = wander(w, p, homeOf(w, p).x, homeOf(w, p).y, 2, 3);
    else if (a < 14) p.task = wander(w, p, w.fire.x, w.fire.y, 6, 2);
    else if (a >= 65) p.task = wander(w, p, homeOf(w, p).x, homeOf(w, p).y, 2, 4);
    else reserve(w, p, pickTask(w, p, c));
  }
  const t = p.task;
  if (!moveToward(p, t.x + 0.5, t.y + 0.5)) return;
  t.h--;
  if (t.h > 0) return;
  finish(w, p, t, c, fx);
  release(w, p);
}

function finish(w, p, t, c, fx) {
  const pop = (text, color) => fx && fx.push({ x: t.x + 0.5, y: t.y, text, color });
  if (t.k === 'harvest') {
    const f = w.fields.find((o) => 'f' + o.id === t.key);
    if (!f || f.stage !== 'ripe') return;
    const y = Math.round(FIELD_YIELD * w.harvest);
    w.food += y; w.stats.yh += y; f.stage = 'harvested'; f.growth = 0;
    pop('+' + y, 'food');
  } else if (t.k === 'plant') {
    const f = w.fields.find((o) => 'f' + o.id === t.key);
    if (f && f.stage === 'fallow') { f.stage = 'planted'; f.growth = 0; pop('sown', 'muted'); }
  } else if (t.k === 'build') {
    const b = w.buildings.find((o) => 'b' + o.id === t.key);
    if (!b || b.progress >= 1) return;
    b.progress = Math.min(1, Math.round((b.progress + 4 / HOUSE_WORK) * 1000) / 1000);
    pop('+' + Math.round(b.progress * 100) + '%', 'build');
    if (b.progress >= 1) {
      const n = w.buildings.filter((o) => o.progress >= 1).length;
      if (n === 10 || n === 25 || n === 50) milestone(w, `The ${n}th house is raised on ${w.name}.`);
      else log(w, 'A new house is finished.', 'good');
      housing(w);
    }
  } else if (t.k === 'chop') {
    const i = idx(t.x, t.y);
    if (w.tiles[i] !== T.FOREST) return;
    const got = Math.min(CHOP, w.wood[i]);
    w.wood[i] -= got; w.timber += got;
    if (w.wood[i] <= 0) { w.tiles[i] = T.GRASS; w.wood[i] = 0; }
    pop('+' + got, 'wood');
  } else if (t.k === 'clear') {
    const tt = tile(w, t.x, t.y);
    if ((tt !== T.GRASS && tt !== T.FOREST) || !needFields(w)) return;
    if (tt === T.FOREST) { const got = w.wood[idx(t.x, t.y)]; w.timber += got; w.wood[idx(t.x, t.y)] = 0; if (got) pop('+' + got, 'wood'); }
    const f = addField(w, { x: t.x, y: t.y });
    if (f && w.fields.length % 10 === 0) log(w, `${w.fields.length} fields now ring the village.`, 'good');
  } else if (t.k === 'forage') {
    const got = Math.min(w.wild, 3 + ri(w, 3));
    w.wild -= got; w.food += got;
    if (got > 0) pop('+' + got, 'food');
  } else if (t.k === 'fish') {
    const got = Math.min(w.fish, 3 + ri(w, 4));
    w.fish -= got; w.food += got;
    if (got > 0) pop('+' + got, 'fish');
  }
}

// ---------- upgrades ----------
// Every rules change that alters the saved shape bumps SIM_VERSION and adds a step here.
// The live world must always load and carry on: never reset it, never drop people.
const MIGRATIONS = {
  // v1 -> v2: fishing. Mark the beaches, stock the shallows, and let someone find out.
  1: (w) => {
    w.shore = findShore(w);
    w.fish = FISH_CAP;
    if (!w.techs.includes('fishing')) {
      w.techs.push('fishing');
      const who = w.people.find((p) => ageY(w, p) >= 14);
      milestone(w, who
        ? `${who.name} wades into the shallows with a sharpened stick and comes back with fish. ${w.name} learns to fish.`
        : `The islanders learn to spear fish in the shallows.`);
    }
  },
};
export function migrate(w) {
  while (w.v < SIM_VERSION) {
    const m = MIGRATIONS[w.v];
    if (m) m(w);
    w.v++;
  }
  return w;
}

// ---------- summaries ----------
export function summary(w) {
  const c = clock(w.t);
  const adults = w.people.filter((p) => ageY(w, p) >= 14).length;
  return {
    name: w.name, year: c.year, season: SEASONS[c.season], day: c.dos, hour: c.hour,
    pop: w.people.length, adults, children: w.people.length - adults,
    food: Math.floor(w.food), timber: Math.floor(w.timber),
    houses: w.buildings.filter((b) => b.progress >= 1).length, fields: w.fields.length,
    births: w.stats.births, deaths: w.stats.deaths, peak: w.stats.peak,
  };
}

export function fingerprint(w) {
  const s = JSON.stringify(w);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
