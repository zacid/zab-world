import * as S from './sim.js';

const TILE = 8, N = S.MAP, PX = N * TILE;
const DEMO_SEED = 20261114;

// ---------- palettes ----------
const PAL = [
  { grass: ['#3d7a3a', '#47883f', '#356d33'], tree: ['#2a6332', '#3a8143', '#1f4f28'], sand: ['#c6a86c', '#d6bb82'], snow: 0 },
  { grass: ['#4a7d2e', '#578b35', '#416f28'], tree: ['#27592b', '#357334', '#1c4520'], sand: ['#c9ab6c', '#dbbf84'], snow: 0 },
  { grass: ['#76763a', '#857f3f', '#6a6833'], tree: ['#b5652a', '#d08a2e', '#8a4a22'], sand: ['#c2a46a', '#d1b67e'], snow: 0 },
  { grass: ['#c9d1da', '#dbe2e9', '#b5c0cb'], tree: ['#24443a', '#2f5848', '#1a332b'], sand: ['#cfc6ad', '#ddd5bf'], snow: 1 },
];
const ROLE = { harvest: '#f2cd4c', plant: '#f2cd4c', clear: '#f2cd4c', chop: '#e07b45', build: '#5fb4f0', forage: '#c08ae8', fish: '#5fd0c8', hunt: '#d0574a', haul: '#d0574a', fest: '#e889b8', mourn: '#7f86a8', idle: '#d9d9d9', gather: '#d9d9d9', tend: '#8fcf7e', herb: '#8fcf7e', herd: '#e3d6b0', horn: '#e9dcc0' };
const FX = { food: '#f2cd4c', wood: '#e07b45', build: '#5fb4f0', fish: '#5fd0c8', meat: '#e8796b', muted: '#9aa', sick: '#b7c98a', herb: '#8fcf7e' };

const HOUSE = ['...rr...', '..rRRr..', '.rRRRRr.', 'rRRRRRRr', '.wwwwww.', '.wywdyw.', '.wwwdww.', '........'];
const FRAME = ['........', '...bb...', '..b..b..', '.b....b.', '.bbbbbb.', '.b....b.', '.b....b.', '........'];
const HCOL = { r: '#7a2f24', R: '#a8443a', w: '#d8c8a4', d: '#5a3a22', y: '#3a3326', b: '#9a6a3c' };
// granary: thatched cone on a plank store, raised on posts
const GRANARY = ['...tt...', '..tTTt..', '.tTTTTt.', 'tttttttt', '.pPpPpP.', '.pPpdpP.', '.b....b.', '.b....b.'];
const GCOL = { t: '#a8893e', T: '#d2b25a', p: '#8a5a32', P: '#a06c3e', d: '#4a3020', b: '#6e4a2a' };

// ---------- setup ----------
const app = document.getElementById('app');
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const scene = document.createElement('canvas'); scene.width = scene.height = PX;
const sc = scene.getContext('2d');
const terr = document.createElement('canvas'); terr.width = terr.height = PX;
const tc = terr.getContext('2d');
const $ = (id) => document.getElementById(id);

let w = null, popups = [], view = { s: 1, ox: 0, oy: 0 }, lastTerrTick = -1, mouse = null, demo = false;
let dpr = 1, zoom = 1, pan = { x: 0, y: 0 }, drag = null;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = app.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  ctx.imageSmoothingEnabled = false;
  computeView();
}
// camera: frame the settlement, widening as it grows
let base = { s: 1, x: 0, y: 0 };
function computeView() {
  if (!w) return;
  let x0 = w.fire.x - 9, x1 = w.fire.x + 10, y0 = w.fire.y - 7, y1 = w.fire.y + 8;
  const yard = w.yard ? [w.yard, { x: w.yard.x + S.YARD_W - 1, y: w.yard.y + S.YARD_H - 1 }] : [];
  for (const o of [...w.buildings, ...w.fields, ...yard]) { x0 = Math.min(x0, o.x - 4); x1 = Math.max(x1, o.x + 5); y0 = Math.min(y0, o.y - 4); y1 = Math.max(y1, o.y + 5); }
  const bw = (x1 - x0) * TILE, bh = (y1 - y0) * TILE;
  let fit = Math.min(cv.width / bw, cv.height / bh) * 0.8 * zoom;
  fit = Math.min(fit, 9 * dpr);
  base = { s: fit >= 2 ? Math.round(fit) : fit, x: ((x0 + x1) / 2) * TILE, y: ((y0 + y1) / 2) * TILE };
  applyView();
}
// cam (scene px) overrides the settlement centre while someone is followed, and glides back afterwards
function applyView() {
  const c = cam || base, s = base.s;
  view = { s, ox: Math.round(cv.width / 2 - c.x * s + pan.x * dpr), oy: Math.round(cv.height / 2 - c.y * s + pan.y * dpr) };
}

// ---------- following one islander ----------
// Render-only: nothing here is saved or touches the simulation.
let follow = null, track = false, cam = null, returning = false, gone = null, lastShown = [];
const known = new Map(); // id -> { name, sex }, so the dead keep their names on the card
function startFollow(id) {
  cam = { x: (cv.width / 2 - view.ox) / view.s, y: (cv.height / 2 - view.oy) / view.s }; // glide from where we are
  follow = id; track = true; returning = false; gone = null;
  const p = w.people.find((q) => q.id === id);
  if (p) known.set(id, { name: p.name, sex: p.sex });
  pan = { x: 0, y: 0 };
  zoom = Math.max(zoom, 1.6);
  computeView();
  drawWho();
}
function stopFollow() {
  if (cam) { cam = { x: cam.x - (pan.x * dpr) / base.s, y: cam.y - (pan.y * dpr) / base.s }; pan = { x: 0, y: 0 }; }
  follow = null; track = false; gone = null; returning = !!cam;
  $('who').hidden = true;
}
function moveCam(target) {
  if (!cam) return;
  const t = target || base;
  cam.x += (t.x - cam.x) * 0.12; cam.y += (t.y - cam.y) * 0.12;
  if (!target && Math.abs(t.x - cam.x) + Math.abs(t.y - cam.y) < 0.5) { cam = null; returning = false; }
  applyView();
}
function doing(p) {
  const a = Math.floor(S.ageY(w, p));
  if (p.sick) return p.asleep ? 'tossing with fever' : 'laid up with fever';
  if (p.asleep) return 'asleep at home';
  if (p.task && p.task.k === 'mourn') {
    const g = w.yard && p.mourn && w.graves.find((o) => o.s === p.mourn[1]);
    return g ? `mourning at ${g.n}'s grave` : 'mourning at a graveside';
  }
  if (p.task && p.task.k === 'tend') { const o = w.people.find((q) => q.id === p.task.o); return o ? `tending ${o.name}` : 'tending the sick'; }
  if (p.task && p.task.k === 'herb') return "gathering herbs at the wood's edge";
  if (p.task && p.task.k === 'herd') return 'minding the goats';
  if (p.task && p.task.k === 'lost') return 'lost in the fog';
  if (p.task && p.task.k === 'horn') return 'blowing the fog horn at the hearth';
  if (p.task && p.task.k === 'search') { const o = w.lost && w.lost.cur && w.people.find((q) => q.id === w.lost.cur.id); return o ? `searching for ${o.name}` : 'searching the fog'; }
  return p.task && p.task.k === 'fest' ? 'dancing at the midsummer fire' : a < 14 ? 'playing' : p.hurt ? 'nursing a wolf bite' : a >= 65 ? 'resting' : ({ harvest: 'harvesting', plant: 'sowing', clear: 'clearing a field', fence: 'weaving a fence', chop: 'felling trees', build: 'building', forage: 'foraging', fish: 'fishing', idle: 'idling', gather: 'at the fire',
    hunt: p.task && p.task.q === 'wolf' ? 'hunting wolves' : p.task && p.task.q === 'deer' ? 'stalking deer' : 'hunting boar', haul: `carrying a ${(p.task && p.task.q) || 'boar'} home` })[p.task ? p.task.k : 'idle'] || 'idling';
}
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
function link(id) {
  const o = w.people.find((q) => q.id === id), k = known.get(id);
  if (o) return `<a data-id="${id}">${esc(o.name)}</a>`;
  return k ? `<span class="m">${esc(k.name)} †</span>` : '';
}
// the card: who they are, what they're doing, their family, and the last things the island said of them
function drawWho() {
  const el = $('who');
  if (follow == null) { el.hidden = true; return; }
  const p = w.people.find((q) => q.id === follow);
  if (!p) {
    if (!gone) { const k = known.get(follow); gone = k ? k.name : 'They'; }
    const last = mentions(gone, 1)[0];
    const g = (w.graves || []).find((o) => o.id === follow);
    el.innerHTML = `<div class="hd">Following <span class="x" data-close>✕</span></div><b>${esc(gone)}</b><div class="m">is no longer among the living.</div>` +
      (g ? `<div class="do">${esc(graveText(g))}; lies in the burying ground since ${when(g.d)}.</div>` : '') +
      (g && g.dd ? `<div class="kin"><span class="m">in life</span> ${esc(g.dd)}</div>` : '') +
      (last ? `<div class="ev"><span class="when">${last.s}</span>${esc(last.text)}</div>` : '');
    el.hidden = false; return;
  }
  const a = Math.floor(S.ageY(w, p));
  const kin = [];
  const parents = [p.mother, p.father].filter((id) => id != null).map(link).filter(Boolean);
  if (parents.length) kin.push(['child of', parents.join(' &amp; ')]);
  if (p.partner != null) kin.push([p.sex === 'f' ? 'wife of' : 'husband of', link(p.partner)]);
  const kids = w.people.filter((o) => o.mother === p.id || o.father === p.id).sort((x, y) => x.born - y.born);
  if (kids.length) kin.push([kids.length === 1 ? 'child' : 'children', kids.map((o) => link(o.id)).join(', ')]);
  if (p.home != null) {
    const mates = w.people.filter((o) => o.home === p.home && o.id !== p.id && o.id !== p.partner && !kids.includes(o));
    if (mates.length) kin.push(['shares a roof with', mates.map((o) => link(o.id)).join(', ')]);
  } else kin.push(['home', '<span class="bad">none yet</span>']);
  const ev = mentions(p.name, 3), by = S.byname(p), deeds = S.deedsText(p.dd);
  if (deeds) kin.push(['so far', esc(deeds)]);
  const dog = w.dogs && w.dogs.d.find((d) => d.own === p.id && w.t - d.b >= S.TICKS_PER_YEAR);
  if (dog) kin.push(['dog', esc(dog.nm)]);
  el.innerHTML = `<div class="hd">Following <span class="x" data-close>✕</span></div>` +
    `<b>${esc(p.name)}</b>${by ? ` <span class="by">${esc(by)}</span>` : ''} <span class="m">${p.sex === 'f' ? 'woman' : 'man'}${a < 14 ? ' (child)' : ''}, ${a} yrs</span>` +
    (w.heal && w.heal.id === p.id ? ` <span class="herb">${p.sex === 'f' ? 'herb-woman' : 'herb-man'}</span>` : '') +
    (w.goats && w.goats.hid === p.id ? ' <span class="goat">goatherd</span>' : '') +
    `<div class="do">${doing(p)}${!track ? ' · <a data-id="' + p.id + '">find</a>' : ''}</div>` +
    kin.map(([l, v]) => `<div class="kin"><span class="m">${l}</span> ${v}</div>`).join('') +
    ev.map((e) => `<div class="ev"><span class="when">${e.s}</span>${esc(e.text)}</div>`).join('');
  el.hidden = false;
}
function mentions(name, n) {
  const re = new RegExp(`\\b${name.replace(/[^\w]/g, '')}\\b`), out = [], seen = new Set();
  for (const e of [...w.log].reverse()) {
    if (out.length >= n) break;
    if (re.test(e.text) && !seen.has(e.text + e.t)) { seen.add(e.text + e.t); out.push(e); }
  }
  return out;
}

// ---------- terrain ----------
function px(c, x, y, col, wdt = 1, hgt = 1) { c.fillStyle = col; c.fillRect(x, y, wdt, hgt); }
function sprite(c, rows, ox, oy, map) {
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    const k = rows[y][x]; if (k !== '.' && map[k]) px(c, ox + x, oy + y, map[k]);
  }
}
function drawTree(c, x, y, size, pal, h) {
  const [mid, lit, dark] = pal.tree;
  const autumnMix = pal === PAL[2] && h < 0.35 ? PAL[1].tree : pal.tree;
  const [m2, l2, d2] = autumnMix;
  if (size < 0.5) { // sapling
    px(c, x + 3, y + 4, m2, 2, 2); px(c, x + 3, y + 6, '#4a3020', 1, 1); return;
  }
  px(c, x + 3, y + 6, '#4a3020', 1, 2);
  px(c, x + 1, y + 2, d2, 6, 4); px(c, x + 2, y + 1, m2, 4, 5); px(c, x + 1, y + 3, m2, 6, 2);
  px(c, x + 2, y + 1, l2, 2, 1); px(c, x + 1, y + 2, l2, 1, 1); px(c, x + 3, y + 2, l2, 1, 1);
  if (pal.snow) { px(c, x + 2, y + 1, '#eef3f7', 3, 1); px(c, x + 1, y + 2, '#eef3f7', 1, 1); }
}
// footpaths: trampled grass shows scuffs of earth; a real path is a ragged bare track that joins up
// with the paths, houses, beach and fields around it. Under snow it is churned grey slush.
const isWay = (x, y) => {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  const i = y * N + x, t = w.tiles[i];
  return t === S.T.BUILD || t === S.T.SAND || t === S.T.FIELD || (t === S.T.GRASS && w.wear[i] >= S.PATH_AT);
};
function drawPath(x, y, X, Y, v, pal) {
  const dirt = pal.snow ? '#a1998c' : '#6f5a3e', edge = pal.snow ? '#b3ada3' : '#7f6a4a', stone = pal.snow ? '#8d8579' : '#8f8170';
  if (v < S.PATH_AT) { // scuffed: a few patches of earth, more the more it is walked
    const k = Math.min(7, 1 + ((v - S.WEAR_SEEN) / 3) | 0);
    for (let j = 0; j < k; j++) { const hh = S.hash(x * 7 + j, y, 41); px(tc, X + 1 + ((hh * 6) | 0), Y + 1 + ((hh * 360) | 0) % 6, j & 1 ? edge : dirt, 2, 1); }
    return;
  }
  px(tc, X + 2, Y + 2, dirt, 4, 4);
  const n = isWay(x, y - 1), s = isWay(x, y + 1), e = isWay(x + 1, y), we = isWay(x - 1, y);
  if (n) px(tc, X + 2, Y, dirt, 4, 2);
  if (s) px(tc, X + 2, Y + 6, dirt, 4, 2);
  if (we) px(tc, X, Y + 2, dirt, 2, 4);
  if (e) px(tc, X + 6, Y + 2, dirt, 2, 4);
  // diagonal tracks, where the walk cuts a corner
  for (const [ax, ay] of [[1, -1], [1, 1], [-1, 1], [-1, -1]]) {
    if (!isWay(x + ax, y + ay) || isWay(x + ax, y) || isWay(x, y + ay)) continue;
    px(tc, X + (ax > 0 ? 6 : 0), Y + (ay > 0 ? 6 : 0), dirt, 2, 2);
  }
  // ragged verges and a pebble or two, so it reads as worn ground rather than paving
  const h = S.hash(x, y, 43);
  px(tc, X + 2 + ((h * 4) | 0), Y + 2 + ((h * 40) | 0) % 4, stone);
  if (!n) px(tc, X + 2 + ((h * 90) | 0) % 4, Y + 1, edge, 2, 1);
  if (!s) px(tc, X + 2 + ((h * 70) | 0) % 4, Y + 6, edge, 2, 1);
  if (!we) px(tc, X + 1, Y + 2 + ((h * 50) | 0) % 4, edge, 1, 2);
  if (!e) px(tc, X + 6, Y + 2 + ((h * 30) | 0) % 4, edge, 1, 2);
}
function drawTerrain() {
  const c = clockNow();
  const pal = PAL[c.season];
  tc.clearRect(0, 0, PX, PX);
  surf = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, t = w.tiles[i], X = x * TILE, Y = y * TILE;
    const h = S.hash(x, y, 3);
    if (t === S.T.WATER) {
      const land = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => x + a >= 0 && x + a < N && y + b >= 0 && y + b < N && w.tiles[(y + b) * N + x + a] !== S.T.WATER);
      if (land.length) {
        px(tc, X, Y, '#0b1a2b', 8, 8); if (h < 0.5) px(tc, X + ((h * 80) | 0) % 7, Y + ((h * 300) | 0) % 7, '#1d3550', 2, 1);
        for (const [a, b] of land) surf.push({ X, Y, a, b, h: S.hash(x * 2 + a, y * 2 + b, 51) });
      }
      continue;
    }
    if (t === S.T.SAND) {
      px(tc, X, Y, pal.sand[0], 8, 8);
      for (let k = 0; k < 4; k++) { const hh = S.hash(x * 4 + k, y, 11); px(tc, X + ((hh * 8) | 0), Y + ((hh * 64) | 0) % 8, pal.sand[1]); }
      continue;
    }
    // grass base for everything else
    px(tc, X, Y, pal.grass[0], 8, 8);
    for (let k = 0; k < 5; k++) { const hh = S.hash(x * 5 + k, y, 17); px(tc, X + ((hh * 8) | 0), Y + ((hh * 64) | 0) % 8, k < 3 ? pal.grass[1] : pal.grass[2]); }
    if (t === S.T.FOREST) drawTree(tc, X, Y, w.wood[i] / 12, pal, h);
    else if (t === S.T.GRASS && w.wear && w.wear[i] >= S.WEAR_SEEN) drawPath(x, y, X, Y, w.wear[i], pal);
  }
  // fields
  for (const f of w.fields) {
    const X = f.x * TILE, Y = f.y * TILE;
    px(tc, X, Y, pal.snow ? '#8a7f74' : '#5a3d24', 8, 8);
    for (let r = 0; r < 4; r++) px(tc, X, Y + r * 2 + 1, pal.snow ? '#b9b2a8' : '#6e4b2c', 8, 1);
    if (f.stage === 'planted') {
      const g = Math.max(1, Math.round(f.growth * 3));
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) px(tc, X + k * 2, Y + r * 2 + 2 - g, f.growth > 0.7 ? '#9bbf3c' : '#5fae47', 1, g);
    } else if (f.stage === 'ripe') {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { px(tc, X + k * 2, Y + r * 2, '#e6c14a', 1, 2); px(tc, X + k * 2, Y + r * 2, '#f7dc78'); }
    } else if (f.stage === 'harvested') {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) px(tc, X + k * 2, Y + r * 2 + 1, '#b59b5c');
    } else if (f.flat) { // storm-flattened grain lying in the mud
      for (let r = 0; r < 4; r++) px(tc, X + (r & 1), Y + r * 2 + 1, '#8f7a3e', 6, 1);
    }
    if (f.root) { // boars have been at it: torn-up clods and bare black earth
      for (let k = 0; k < 6; k++) { const hh = S.hash(f.x * 6 + k, f.y, 23); px(tc, X + ((hh * 7) | 0), Y + ((hh * 56) | 0) % 7, k < 3 ? '#2a1a10' : '#7a5636', 2, 1); }
    }
  }
  drawYard(pal);
  drawPen(pal);
  // wattle fences: woven hazel on the outer edges of each fenced block, with a stake at every corner
  const fenced = new Set();
  for (const f of w.fields) if (f.fence) fenced.add(f.y * S.MAP + f.x);
  for (const f of w.fields) {
    if (!f.fence) continue;
    const X = f.x * TILE, Y = f.y * TILE, rod = pal.snow ? '#a89a86' : '#9a7a4e', stake = '#5e4026';
    const open = (ax, ay) => !fenced.has((f.y + ay) * S.MAP + f.x + ax);
    if (open(0, -1)) { px(tc, X, Y, rod, 8, 1); px(tc, X + 3, Y, stake); }
    if (open(0, 1)) { px(tc, X, Y + 7, rod, 8, 1); px(tc, X + 4, Y + 7, stake); }
    if (open(-1, 0)) { px(tc, X, Y, rod, 1, 8); px(tc, X, Y + 4, stake); }
    if (open(1, 0)) { px(tc, X + 7, Y, rod, 1, 8); px(tc, X + 7, Y + 3, stake); }
    for (const [cx, cy] of [[0, 0], [7, 0], [0, 7], [7, 7]]) px(tc, X + cx, Y + cy, stake);
  }
  // fire ring, stores
  const fx = w.fire.x * TILE, fy = w.fire.y * TILE;
  px(tc, fx - 8, fy, '#7d6a4e', 24, 8);
  for (let k = 0; k < 6; k++) px(tc, fx + [1, 6, 1, 6, 3, 4][k], fy + [2, 2, 5, 5, 1, 6][k], '#9b9b9b', 1, 1);
  const sacks = Math.min(4, Math.ceil(w.food / 400));
  for (let k = 0; k < sacks; k++) { px(tc, fx + 9 + (k % 2) * 3, fy + 2 + ((k / 2) | 0) * 3, '#d9c08a', 3, 3); px(tc, fx + 10 + (k % 2) * 3, fy + 2 + ((k / 2) | 0) * 3, '#b49a64'); }
  const logs = Math.min(4, Math.ceil(w.timber / 60));
  for (let k = 0; k < logs; k++) { px(tc, fx - 7, fy + 6 - k * 2, '#8a5a32', 6, 2); px(tc, fx - 7, fy + 6 - k * 2, '#c09060', 1, 2); }
  // drying rack above the hearth: one stretched hide per pelt in store, up to three
  if (w.techs.includes('hunting')) {
    const rx = fx - 6, ry = fy - 7;
    px(tc, rx, ry, '#6e4a2a', 1, 6); px(tc, rx + 10, ry, '#6e4a2a', 1, 6); px(tc, rx, ry, '#8a5a32', 11, 1);
    const hides = Math.min(3, w.hides || 0);
    for (let k = 0; k < hides; k++) { px(tc, rx + 1 + k * 3, ry + 1, k === 1 ? '#8a6c4c' : '#a4825a', 3, 4); px(tc, rx + 2 + k * 3, ry + 2, '#6e5238', 1, 2); }
  }
  // the healer's house: bundles of herbs hang drying under the eaves, one for every ten in store
  const healer = w.heal && w.heal.id != null ? w.people.find((p) => p.id === w.heal.id) : null;
  const herbHome = healer && healer.home != null ? healer.home : null;
  // houses
  for (const b of w.buildings) {
    if (b.kind === 'granary') {
      const rows = b.progress >= 1 ? GRANARY : b.progress > 0.5 ? GRANARY.slice(3) : GRANARY.slice(6);
      sprite(tc, rows, b.x * TILE, b.y * TILE + 8 - rows.length, GCOL);
      if (pal.snow && b.progress >= 1) px(tc, b.x * TILE + 2, b.y * TILE + 1, '#eef3f7', 4, 1);
      continue;
    }
    if (b.dmg) { // storm took the roof: walls stand, rafters show through
      sprite(tc, HOUSE, b.x * TILE, b.y * TILE, HCOL);
      for (const [hx, hy] of [[3, 1], [4, 1], [2, 2], [4, 2], [5, 2], [3, 3]]) px(tc, b.x * TILE + hx, b.y * TILE + hy, '#2a1c14');
      px(tc, b.x * TILE + 1, b.y * TILE + 3, '#9a6a3c', 6, 1);
      continue;
    }
    if (b.progress >= 1) sprite(tc, HOUSE, b.x * TILE, b.y * TILE, HCOL);
    else {
      sprite(tc, FRAME, b.x * TILE, b.y * TILE, HCOL);
      if (b.progress > 0.5) sprite(tc, HOUSE.slice(0, 4), b.x * TILE, b.y * TILE, HCOL);
    }
    if (pal.snow && b.progress >= 1) {
      px(tc, b.x * TILE + 2, b.y * TILE + 1, '#eef3f7', 4, 1);
      if (wxNow() === 'snow') { px(tc, b.x * TILE + 1, b.y * TILE + 2, '#eef3f7', 6, 1); px(tc, b.x * TILE + 3, b.y * TILE, '#eef3f7', 2, 1); }
    }
    if (b.id === herbHome && b.progress >= 1) {
      const n = Math.min(3, Math.ceil(w.heal.s / 10));
      for (let k = 0; k < n; k++) {
        const hx = b.x * TILE + [1, 6, 3][k], hy = b.y * TILE + 4;
        px(tc, hx, hy, '#6e5238', 1, 1); px(tc, hx, hy + 1, ['#7aa860', '#a5b86a', '#6e9a58'][k], 1, 2);
      }
    }
  }
}
const wxNow = () => (w.wx ? w.wx.k : 'clear');
// the burying ground: a low dry-stone wall with a gap toward the hearth, graves in rows inside.
// A new grave is bare earth under a wooden stake, with flowers for the first weeks; within a year
// it has grassed over and a grey stone stands at its head.
function yardGate(Y) {
  const dx = Y.x + S.YARD_W / 2 - w.fire.x, dy = Y.y + S.YARD_H / 2 - w.fire.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'w' : 'e') : dy > 0 ? 'n' : 's'; // the wall that faces the village
}
function drawYard(pal) {
  const Y = w.yard;
  if (!Y) return;
  const X0 = Y.x * TILE, Y0 = Y.y * TILE, W = S.YARD_W * TILE, H = S.YARD_H * TILE;
  const wall = pal.snow ? '#c4c0b8' : '#8d8a80', dark = pal.snow ? '#9a968e' : '#5f5c55', gate = yardGate(Y);
  for (let k = 0; k < W; k++) {
    const gap = k >= W / 2 - 2 && k < W / 2 + 2;
    if (!(gate === 'n' && gap)) px(tc, X0 + k, Y0, k % 3 ? wall : dark);
    if (!(gate === 's' && gap)) px(tc, X0 + k, Y0 + H - 1, k % 3 ? wall : dark);
  }
  for (let k = 1; k < H - 1; k++) {
    const gap = k >= H / 2 - 2 && k < H / 2 + 2;
    if (!(gate === 'w' && gap)) px(tc, X0, Y0 + k, k % 3 ? wall : dark);
    if (!(gate === 'e' && gap)) px(tc, X0 + W - 1, Y0 + k, k % 3 ? wall : dark);
  }
  for (const g of w.graves) {
    const p = S.gravePos(Y, g.s), cx = Math.round(p.x * TILE), cy = Math.round(p.y * TILE);
    const age = w.t - g.d;
    if (age < S.TICKS_PER_YEAR) {
      px(tc, cx - 1, cy - 1, pal.snow ? '#d9dde2' : '#6e4b2c', 2, 1); px(tc, cx - 1, cy, '#5a3d24', 2, 1);
      px(tc, cx - 1, cy - 2, '#9a6a3c', 1, 1); // a stake until the stone is cut
      if (age < 20 * S.TICKS_PER_DAY && !pal.snow) px(tc, cx, cy - 1, (g.id & 1) ? '#f28ab0' : '#f7d34a');
    } else {
      px(tc, cx - 1, cy - 1, pal.snow ? '#eef3f7' : pal.grass[2], 2, 2);
      px(tc, cx - 1, cy - 2, age > 20 * S.TICKS_PER_YEAR ? '#7d7a72' : '#b8b8b0', 2, 1);
    }
  }
}
// the goat pen: trodden earth and straw inside a wattle fence, a gap toward the village, and a
// lean-to of bark against the back wall where the herd beds down
function drawPen(pal) {
  const G = w.goats;
  if (!G) return;
  const X0 = G.pen.x * TILE, Y0 = G.pen.y * TILE, W = S.PEN_W * TILE, H = S.PEN_H * TILE;
  px(tc, X0, Y0, pal.snow ? '#a59d90' : '#6f5c40', W, H);
  for (let k = 0; k < 18; k++) { const h = S.hash(G.pen.x * 3 + k, G.pen.y, 71); px(tc, X0 + 1 + ((h * 14) | 0), Y0 + 1 + ((h * 131) | 0) % 14, pal.snow ? '#d9dde2' : k % 3 ? '#c9b06a' : '#a8904e', 2, 1); }
  const dx = X0 + W / 2 - (w.fire.x * TILE + 4), dy = Y0 + H / 2 - (w.fire.y * TILE + 4);
  const gate = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'w' : 'e') : dy > 0 ? 'n' : 's';
  const back = { n: 's', s: 'n', e: 'w', w: 'e' }[gate];
  const rod = pal.snow ? '#a89a86' : '#9a7a4e', stake = '#5e4026', roof = pal.snow ? '#e4e8ec' : '#7a5232';
  // lean-to along the back wall
  if (back === 'n') px(tc, X0 + 2, Y0 + 1, roof, W - 4, 3);
  if (back === 's') px(tc, X0 + 2, Y0 + H - 4, roof, W - 4, 3);
  if (back === 'w') px(tc, X0 + 1, Y0 + 2, roof, 3, H - 4);
  if (back === 'e') px(tc, X0 + W - 4, Y0 + 2, roof, 3, H - 4);
  // a wolf tore through the back wall: a ragged hole until someone weaves it back
  const torn = (side, k, n) => G.gap && back === side && k >= n / 2 - 3 && k < n / 2 + 2;
  for (let k = 0; k < W; k++) {
    const gap = k >= W / 2 - 2 && k < W / 2 + 2;
    if (!(gate === 'n' && gap) && !torn('n', k, W)) px(tc, X0 + k, Y0, k % 4 === 0 ? stake : rod);
    if (!(gate === 's' && gap) && !torn('s', k, W)) px(tc, X0 + k, Y0 + H - 1, k % 4 === 0 ? stake : rod);
  }
  for (let k = 0; k < H; k++) {
    const gap = k >= H / 2 - 2 && k < H / 2 + 2;
    if (!(gate === 'w' && gap) && !torn('w', k, H)) px(tc, X0, Y0 + k, k % 4 === 0 ? stake : rod);
    if (!(gate === 'e' && gap) && !torn('e', k, H)) px(tc, X0 + W - 1, Y0 + k, k % 4 === 0 ? stake : rod);
  }
  if (G.gap) { // snapped rods splayed out from the hole
    const bx = back === 'w' ? X0 - 1 : back === 'e' ? X0 + W : X0 + W / 2 - 1;
    const by = back === 'n' ? Y0 - 1 : back === 's' ? Y0 + H : Y0 + H / 2 - 1;
    px(tc, bx, by, rod); px(tc, bx + (back === 'n' || back === 's' ? 2 : 0), by + (back === 'w' || back === 'e' ? 2 : 0), rod);
  }
}
function graveAt(mx, my) {
  if (!w.yard) return null;
  let best = null, bd = 0.3;
  for (const g of w.graves) {
    const p = S.gravePos(w.yard, g.s), d = Math.max(Math.abs(p.x - mx) * 1.6, Math.abs(p.y - 0.12 - my));
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}
const when = (t) => { const c = S.clock(t); return `Y${c.year} ${S.SEASONS[c.season]}`; };
const graveText = (g) => `${g.n}${g.by ? ' ' + g.by : ''} ${g.why}, aged ${Math.floor((g.d - g.b) / S.TICKS_PER_YEAR)}`;

// ---------- time ----------
function nowTickF() { return (Date.now() - w.epoch) / S.TICK_MS; }
function clockNow() { return S.clock(w.t); }
function darkness(hf) { // hf = fractional hour
  if (hf >= 7 && hf <= 17) return 0;
  if (hf > 17 && hf < 21) return ((hf - 17) / 4) * 0.62;
  if (hf >= 21 || hf < 4) return 0.62;
  return ((7 - hf) / 3) * 0.62;
}

// ---------- frame ----------
const sparks = Array.from({ length: 260 }, (_, i) => ({ x: S.hash(i, 1, 5), y: S.hash(i, 2, 5), p: S.hash(i, 3, 5) * 6.28, s: S.hash(i, 4, 5) }));

// ---------- ambience: surf on the beach, smoke from the roofs, gulls over the shallows ----------
// Render-only: none of this is saved or touches the simulation.
let surf = []; // water tiles that touch land: { X, Y, a, b } with (a, b) pointing at the land
const gulls = [];
function ambience(c, hf, now, layer) {
  const wx = wxNow(), storm = wx === 'storm', dark = darkness(hf);
  if (layer === 'below') {
    // waves run up the sand and draw back; storms throw up a wide white fringe
    // in fog the sea lies flat: a faint, slow lap at the sand
    const fog = wx === 'fog';
    const reach = storm ? 4 : wx === 'rain' ? 3 : fog ? 1 : 2, period = storm ? 1500 : fog ? 4200 : 2600;
    for (const s of surf) {
      const ph = ((now / period + s.h) % 1), k = ph < 0.6 ? ph / 0.6 : (1 - ph) / 0.4; // in fast, out slow
      const d = reach - Math.round(k * reach), a = (0.25 + 0.45 * k) * (1 - dark * 0.6) * (fog ? 0.5 : 1);
      sc.fillStyle = `rgba(220,235,245,${a.toFixed(3)})`;
      const gap = ((s.h * 64) | 0) % 8; // a break in the foam, so it does not read as a ruled line
      for (let j = 0; j < 8; j++) {
        if (j === gap || j === (gap + 1) % 8) continue;
        const o = 7 - d; // distance in from the far side of the tile
        if (s.a) sc.fillRect(s.X + (s.a > 0 ? o : 7 - o), s.Y + j, 1, 1);
        else sc.fillRect(s.X + j, s.Y + (s.b > 0 ? o : 7 - o), 1, 1);
      }
      if (storm && k > 0.7) { sc.fillStyle = 'rgba(240,248,255,0.5)'; sc.fillRect(s.X + 2 + ((s.h * 40) | 0) % 4, s.Y + 2 + ((s.h * 90) | 0) % 4, 2, 1); }
    }
    return;
  }
  // smoke: every lived-in house keeps a fire. In winter and on cold days it smokes all day;
  // in spring and autumn mornings and evenings; in summer only while supper cooks.
  const cold = wx === 'cold' || wx === 'snow';
  const lit = c.season === 3 || cold ? 1 : c.season === 1 ? (hf >= 18 && hf < 21 ? 0.6 : 0) : (hf < 9 || hf >= 17 ? 0.8 : 0.25);
  if (lit > 0) {
    const homes = new Set();
    for (const p of w.people) if (p.home != null) homes.add(p.home);
    const wind = storm ? 1.6 : wx === 'rain' ? 0.6 : 0.3, rise = storm ? 6 : 14;
    const col = dark > 0.3 ? '170,170,180' : '205,205,210';
    for (const b of w.buildings) {
      if (b.kind === 'granary' || b.progress < 1 || b.dmg || !homes.has(b.id)) continue;
      const n = lit >= 0.8 ? 5 : 3, X0 = b.x * TILE + 5, Y0 = b.y * TILE + 1;
      for (let i = 0; i < n; i++) {
        const t = (now / 3400 + i / n + S.hash(b.id, 3, 61)) % 1;
        const y = Y0 - t * rise, x = X0 + t * t * rise * wind + Math.sin(now / 900 + b.id + i * 2) * t * 1.5;
        const r = t < 0.35 ? 1 : 2;
        sc.fillStyle = `rgba(${col},${((1 - t) * 0.45 * lit).toFixed(3)})`;
        sc.fillRect(Math.round(x), Math.round(y), r, r);
      }
    }
  }
  // gulls: a few wheel over the shallows by day, drawn to whoever is fishing; gone at night and in storms
  const want = dark > 0.3 || storm || wx === 'fog' || !surf.length ? 0 : c.season === 3 ? 2 : 4;
  const fishers = w.people.filter((p) => !p.asleep && p.task && p.task.k === 'fish');
  for (let g = 0; g < want; g++) {
    const f = fishers.length ? fishers[g % fishers.length] : null;
    const s = surf[Math.floor(S.hash(g, 5, 71) * surf.length)];
    const ax = f ? f.x * TILE + 6 : s.X + 4, ay = f ? f.y * TILE - 2 : s.Y + 4;
    let o = gulls[g];
    if (!o) o = gulls[g] = { x: ax, y: ay };
    o.x += (ax - o.x) * 0.01; o.y += (ay - o.y) * 0.01; // drift over to a new fisher, never jump
    const r = 7 + g * 3, sp = (g & 1 ? -1 : 1) / (1400 + g * 300);
    const X = Math.round(o.x + Math.cos(now * sp + g * 2) * r), Y = Math.round(o.y + Math.sin(now * sp + g * 2) * r * 0.6) - 6;
    const flap = Math.floor(now / 220 + g * 3) % 4 < 2;
    sc.fillStyle = `rgba(240,240,240,${(0.9 - dark).toFixed(3)})`;
    if (flap) { sc.fillRect(X, Y, 1, 1); sc.fillRect(X + 2, Y, 1, 1); sc.fillRect(X + 1, Y + 1, 1, 1); }
    else sc.fillRect(X, Y + 1, 3, 1);
  }
  gulls.length = Math.min(gulls.length, want);
}

function frame() {
  if (!w) return requestAnimationFrame(frame);
  const target = S.tickAt(w, Date.now());
  if (w.t < target) {
    const fx = [];
    const behind = target - w.t;
    S.advanceTo(w, target, fx, 3000);
    if (behind <= 3) for (const f of fx) popups.push({ ...f, born: performance.now() });
    if (w.t < target) { $('catch').hidden = false; $('catch').textContent = `The island stirs… ${Math.ceil((target - w.t) / S.TICKS_PER_DAY)} days to catch up`; }
    else $('catch').hidden = true;
  }
  const tf = nowTickF();
  const frac = Math.max(0, Math.min(1, tf - (w.t - 1)));
  if (w.t !== lastTerrTick) { drawTerrain(); lastTerrTick = w.t; computeView(); updatePanels(); }

  const now = performance.now();
  const c = S.clock(Math.max(0, w.t - 1));
  const hf = c.hour + frac;
  const dark = darkness(hf);

  // background sea: near-black with drifting glints
  ctx.fillStyle = '#04070d'; ctx.fillRect(0, 0, cv.width, cv.height);
  const fogged = wxNow() === 'fog';
  if (fogged) { ctx.fillStyle = `rgba(120,130,138,${(0.16 * (1 - dark * 0.7)).toFixed(3)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  for (const s of sparks) {
    if (fogged && s.s < 0.8) continue; // fog swallows all but the brightest glints
    const a = 0.25 + 0.75 * Math.max(0, Math.sin(now / 1400 + s.p));
    ctx.fillStyle = `rgba(150,180,220,${(a * (0.25 + s.s * 0.5)).toFixed(3)})`;
    const sz = s.s > 0.85 ? 2 : 1;
    ctx.fillRect(Math.floor(s.x * cv.width), Math.floor(s.y * cv.height), sz * dpr, sz * dpr);
  }

  // scene at native resolution
  sc.clearRect(0, 0, PX, PX);
  sc.drawImage(terr, 0, 0);
  ambience(c, hf, now, 'below');
  // fire
  const fx0 = w.fire.x * TILE, fy0 = w.fire.y * TILE;
  const fl = Math.floor(now / 140) % 3;
  const fest = festNow(c);
  if (fest) bonfire(fx0, fy0, now);
  else { px(sc, fx0 + 3, fy0 + 3, '#f0742b', 2, 3); px(sc, fx0 + 3 + (fl === 1 ? 1 : 0), fy0 + 2 - (fl === 2 ? 1 : 0), '#ffc23d', 1, 2); px(sc, fx0 + 4 - (fl === 0 ? 1 : 0), fy0 + 4, '#ffe48a', 1, 1); }
  // people
  const shown = [];
  let horner = null;
  const fcx = w.fire.x + 0.5, fcy = w.fire.y + 0.5;
  for (const p of w.people) {
    if (p.asleep) continue;
    let x = p.px + (p.x - p.px) * frac, y = p.py + (p.y - p.py) * frac;
    const moving = p.x !== p.px || p.y !== p.py;
    const dancing = fest && p.task && p.task.k === 'fest' && !moving;
    let hop = 0;
    if (dancing) { // the ring turns around the bonfire, each ring the other way, everyone skipping
      const dx = x - fcx, dy = y - fcy, r = Math.hypot(dx, dy) || 1;
      const a = Math.atan2(dy, dx) + ((p.task.r || 0) % 2 ? -1 : 1) * (now / (2400 * r));
      x = fcx + Math.cos(a) * r; y = fcy + Math.sin(a) * r;
      hop = Math.floor(now / 240 + p.id) % 2;
    }
    const X = Math.round(x * TILE) - 1, Y = Math.round(y * TILE) - 3 - hop;
    const age = S.ageY(w, p);
    const step = moving || dancing ? Math.floor(now / 180 + p.id) % 2 : 0;
    if (p.sick && !moving) { // lying in the doorway under a blanket, a pale face, now and then a shiver
      const sh = Math.floor(now / 700 + p.id) % 5 === 0 ? 1 : 0;
      px(sc, X - 1 + sh, Y + 2, '#c9d4a8'); px(sc, X + sh, Y + 2, '#7d6a52', 4, 2); px(sc, X + 1 + sh, Y + 2, '#a08868', 2, 1);
      if (Math.floor(now / 2600 + p.id * 0.7) % 3 === 0) px(sc, X - 1, Y, 'rgba(183,201,138,0.7)'); // breath in the cold
      shown.push({ p, x, y });
      continue;
    }
    const col = p.sick ? '#b7c98a' : age < 14 ? '#f4f4f4' : age >= 65 ? '#a3a3a3' : ROLE[p.task ? p.task.k : 'idle'] || '#d9d9d9';
    if (dancing) px(sc, X + (age < 14 ? 1 : 0), Y + (age < 14 ? 0 : -1), CROWN[p.id % CROWN.length], age < 14 ? 1 : 3, 1); // a crown of summer flowers
    if (age < 14) {
      px(sc, X + 1, Y + 1, '#f1c9a5'); px(sc, X, Y + 2, col, 3, 1); px(sc, X + step, Y + 3, '#555', 1, 1); px(sc, X + 2 - step, Y + 3, '#555', 1, 1);
    } else {
      px(sc, X + 1, Y, '#f1c9a5'); px(sc, X, Y + 1, col, 3, 2); px(sc, X + step * 2, Y + 3, '#3a3a3a', 1, 1); px(sc, X + 2 - step * 2, Y + 3, '#3a3a3a', 1, 1);
      if (p.task && !moving && ['chop', 'harvest', 'build', 'clear'].includes(p.task.k) && Math.floor(now / 300 + p.id) % 2) px(sc, X + 3, Y + 1, '#ddd', 1, 1);
      if (p.task && p.task.k === 'fish' && !moving) { // rod held out toward the water, line bobbing
        const bob = Math.floor(now / 500 + p.id) % 3 === 0 ? 1 : 0;
        px(sc, X + 3, Y, '#8a5a32', 1, 1); px(sc, X + 4, Y - 1, '#8a5a32', 1, 1);
        px(sc, X + 5, Y - 1, 'rgba(255,255,255,0.55)', 1, 3 + bob); px(sc, X + 5, Y + 2 + bob, '#e8e8e8', 1, 1);
      }
      if (p.task && p.task.k === 'hunt') { // an ash spear, flint point up; jabbed forward at the lair
        const jab = !moving && Math.floor(now / 260 + p.id) % 4 === 0 ? 1 : 0;
        px(sc, X + 3 + jab, Y - 2, '#b49a6a', 1, 5); px(sc, X + 3 + jab, Y - 3, '#e8e8e8', 1, 1);
      }
      if (p.task && p.task.k === 'haul') { // the kill slung over a shoulder
        const q = p.task.q, fur = q === 'wolf' ? '#8a8d93' : q === 'deer' ? '#9a6a3c' : '#4d3527';
        px(sc, X - 1, Y - 1, fur, 4, 2); px(sc, X - 2, Y, fur, 1, 1); px(sc, X + 3, Y - 1, q === 'wolf' ? '#b4b7bc' : q === 'deer' ? '#efe6d2' : '#7a5444', 1, 1);
      }
    }
    if (w.heal && w.heal.id === p.id && age >= 14) { // the healer's basket on the hip, green leaves showing
      px(sc, X - 1, Y + 2, '#8a5a32', 1, 2); px(sc, X - 1, Y + 1, '#8fcf7e', 1, 1);
      if (p.task && p.task.k === 'tend' && !moving) { // stooped over the bed with a steaming bowl
        px(sc, X + 3, Y + 2, '#a08868', 2, 1);
        if (Math.floor(now / 400 + p.id) % 3) px(sc, X + 3 + (Math.floor(now / 800) % 2), Y + 1, 'rgba(220,235,210,0.6)', 1, 1);
      }
      if (p.task && p.task.k === 'herb' && !moving && Math.floor(now / 350 + p.id) % 2) px(sc, X + 1, Y + 3, '#8fcf7e', 2, 1); // bent to pick
    }
    if (w.goats && w.goats.hid === p.id && p.task && p.task.k === 'herd') { // the herder's crook, hooked at the top
      const top = age < 14 ? Y - 1 : Y - 2;
      px(sc, X + 3, top, '#9a7a4e', 1, Y + 4 - top); px(sc, X + 4, top, '#9a7a4e'); px(sc, X + 4, top + 1, '#9a7a4e');
    }
    if (p.hurt && age >= 14) px(sc, X + 1, Y + 1, '#c8433a'); // a bloodied bandage
    if (p.task && p.task.k === 'search') { // a pitch torch held high, flickering
      const fl = Math.floor(now / 160 + p.id) % 3;
      px(sc, X + 3, Y - 1, '#8a5a32', 1, 3); px(sc, X + 3, Y - 2, fl ? '#ffb43c' : '#ffe48a'); if (fl === 2) px(sc, X + 3, Y - 3, '#f0742b');
    }
    if (p.task && p.task.k === 'horn' && age >= 14) { // the whelk shell: raised to the lips when blown, else at the hip
      if (!moving && hornBlast(now) >= 0) { px(sc, X + 2, Y, '#e9dcc0', 2, 1); px(sc, X + 4, Y - 1, '#d8c39a', 1, 2); horner = { x, y }; }
      else { px(sc, X + 3, Y + 2, '#e9dcc0', 1, 1); px(sc, X + 3, Y + 1, '#d8c39a', 1, 1); }
    }
    if (p.task && p.task.k === 'lost' && !moving && Math.floor(now / 900 + p.id) % 2) px(sc, X - 1, Y + 3, '#f4f4f4', 5, 1); // sat down, arms round the knees
    shown.push({ p, x, y });
  }
  lastShown = shown;
  // keep the followed islander in the middle of the screen (at home while they sleep)
  let fpos = null;
  if (follow != null) {
    const o = shown.find((q) => q.p.id === follow);
    if (o) fpos = { x: o.x * TILE, y: o.y * TILE - 1, awake: true };
    else {
      const p = w.people.find((q) => q.id === follow), b = p && p.home != null && w.buildings.find((q) => q.id === p.home);
      if (b) fpos = { x: b.x * TILE + 4, y: b.y * TILE + 4, awake: false };
    }
  }
  if (track && fpos) moveCam(fpos);
  else if (returning) moveCam(null);
  drawRats(hf, now);
  const guests = drawIsle(frac, now, fest);
  const beasts = drawBeasts(frac, now);
  const goats = drawGoats(frac, now);
  const dogs = drawDogs(frac, now);
  ambience(c, hf, now, 'above');
  // the day's sky colours the land
  const wx = wxNow();
  const tint = { rain: 'rgba(18,26,40,0.22)', storm: 'rgba(8,12,22,0.42)', heat: 'rgba(255,170,60,0.09)', cold: 'rgba(150,190,255,0.12)', snow: 'rgba(200,215,235,0.10)', fog: 'rgba(190,198,204,0.30)' }[wx];
  if (tint) { sc.fillStyle = tint; sc.fillRect(0, 0, PX, PX); }
  if (horner) hornRings(horner, now);
  // night
  if (dark > 0) {
    sc.fillStyle = `rgba(6,10,28,${dark.toFixed(3)})`; sc.fillRect(0, 0, PX, PX);
    sc.globalCompositeOperation = 'lighter';
    for (const b of w.buildings) if (b.progress >= 1 && w.people.some((p) => p.home === b.id)) {
      const lit = S.hash(b.id, Math.floor(w.t / 6), 1) < 0.85;
      if (!lit) continue;
      px(sc, b.x * TILE + 2, b.y * TILE + 5, '#ffcf6a'); px(sc, b.x * TILE + 5, b.y * TILE + 5, '#ffcf6a');
      glow(sc, b.x * TILE + 4, b.y * TILE + 5, 7, `rgba(255,190,90,${(dark * 0.35).toFixed(3)})`);
    }
    for (const o of shown) if (o.p.task && o.p.task.k === 'search') { // the searchers' torches bob through the dark
      glow(sc, o.x * TILE + 2.5, o.y * TILE - 4.5, 6 + (Math.floor(now / 160 + o.p.id) % 3) * 0.6, `rgba(255,170,70,${(dark * 0.55).toFixed(3)})`);
    }
    glow(sc, fx0 + 4, fy0 + 4, (fest ? 44 : 22) + Math.sin(now / 200) * (fest ? 3 : 1.5), `rgba(255,140,50,${(dark * (fest ? 0.75 : 0.55)).toFixed(3)})`);
    if (fest) glow(sc, fx0 + 4, fy0, 14, `rgba(255,220,120,${(dark * 0.6).toFixed(3)})`);
    // wolf eyes catch the firelight at the treeline
    if (dark > 0.25) for (const o of beasts) if (o.b.k === 'wolf' && Math.floor(now / 1700 + o.b.id * 0.37) % 7) {
      const ex = o.X + (o.face > 0 ? 5 : 0), ey = o.Y + 1;
      px(sc, ex, ey, '#ffe36a');
      glow(sc, ex + 0.5, ey + 0.5, 3, `rgba(255,220,90,${(dark * 0.7).toFixed(3)})`);
    }
    sc.globalCompositeOperation = 'source-over';
  }
  skyFx(wx, now, dark);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene, view.ox, view.oy, PX * view.s, PX * view.s);
  if (fpos) { // thin white corner brackets around whoever is followed; dashed round the house while they sleep
    const sx = view.ox + fpos.x * view.s, sy = view.oy + fpos.y * view.s;
    const r = Math.max(7 * dpr, (fpos.awake ? 4 : 6) * view.s), l = r * 0.45 + Math.sin(now / 300) * dpr;
    ctx.strokeStyle = 'rgba(232,232,232,0.85)'; ctx.lineWidth = dpr;
    if (!fpos.awake) ctx.setLineDash([2 * dpr, 2 * dpr]);
    ctx.beginPath();
    for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = sx + ax * r, cy = sy + ay * r;
      ctx.moveTo(cx - ax * l, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy - ay * l);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  // popups
  const fs = Math.round(11 * dpr);
  ctx.font = `${fs}px "Share Tech Mono", monospace`; ctx.textAlign = 'center';
  popups = popups.filter((q) => now - q.born < 1800);
  for (const q of popups) {
    const k = (now - q.born) / 1800;
    ctx.globalAlpha = 1 - k * k;
    ctx.fillStyle = FX[q.color] || '#fff';
    ctx.fillText(q.text, view.ox + q.x * TILE * view.s, view.oy + q.y * TILE * view.s - k * 18 * dpr);
  }
  ctx.globalAlpha = 1;

  // hover
  if (mouse) {
    const mx = (mouse.x * dpr - view.ox) / (TILE * view.s), my = (mouse.y * dpr - view.oy) / (TILE * view.s);
    let best = null, bd = 0.6;
    for (const o of shown) { const d = Math.hypot(o.x - mx, o.y - 0.2 - my); if (d < bd) { bd = d; best = o; } }
    let beast = null;
    for (const o of beasts) { const d = Math.hypot(o.x - mx, o.y - my); if (d < bd) { bd = d; beast = o.b; best = null; } }
    let goat = null;
    for (const o of goats) { const d = Math.hypot(o.x - mx, o.y - my); if (d < bd) { bd = d; goat = o; beast = null; best = null; } }
    let dog = null;
    for (const o of dogs) { const d = Math.hypot(o.x - mx, o.y - my); if (d < bd) { bd = d; dog = o; goat = null; beast = null; best = null; } }
    let guest = null;
    for (const o of guests) { const d = Math.hypot(o.x - mx, o.y - 0.2 - my); if (d < bd) { bd = d; guest = o; dog = null; goat = null; beast = null; best = null; } }
    const tip = $('tip');
    if (dog) {
      const d = dog.d, o = d.own != null && w.people.find((q) => q.id === d.own);
      const yrs = Math.floor((w.t - d.b) / S.TICKS_PER_YEAR);
      const what = dog.pup ? (o ? `tumbling after ${esc(o.name)}` : 'tumbling about the hearth') : !o ? 'lying by the hearth' : d.lie ? `asleep across ${esc(o.name)}'s doorway` : `at ${esc(o.name)}'s heels`;
      tip.innerHTML = `<b>${esc(d.nm)}</b><br>${dog.pup ? 'pup' : `dog · ${yrs} yrs`} · ${what}`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else if (guest) {
      const g = guest.g;
      const what = g.isl ? 'leaving for the far isle' : g.k === 'boat' ? 'at the paddle' : g.k === 'fest' ? 'dancing at the midsummer fire'
        : g.k === 'sleep' ? 'asleep by the embers' : g.k === 'wait' ? 'waiting by the hearth for the fire' : 'walking';
      tip.innerHTML = guest.boat ? `<b>Dugout</b><br><span class="m">from the far isle · ${guest.n ? `${guest.n} aboard` : 'pulled up on the beach'}</span>`
        : `<b>${esc(g.nm)}</b><br>${g.a} yrs · ${what}${g.isl ? '' : '<br><span class="m">guest from the far isle</span>'}`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else if (goat) {
      const g = goat.g, still = g.x === g.px && g.y === g.py;
      const cx = Math.floor(g.x), cy = Math.floor(g.y), onField = w.tiles[cy * S.MAP + cx] === S.T.FIELD;
      const what = !g.out ? (darkness(hf) > 0.4 ? 'asleep in the pen' : 'shut in the pen') : onField ? 'in the young grain' : still ? 'grazing' : 'trotting after the herd';
      const yrs = Math.floor((w.t - g.b) / S.TICKS_PER_YEAR);
      tip.innerHTML = `<b>${goat.kid ? 'Kid' : 'Goat'}</b><br><span class="m">${what}${goat.kid ? '' : ` · ${yrs} yrs`}</span>`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else if (beast) {
      const still = beast.x === beast.px && beast.y === beast.py;
      const what = beast.k === 'wolf'
        ? (beast.prey != null ? 'stalking someone' : 'prowling the treeline')
        : beast.k === 'deer' ? (beast.run ? 'bounding away' : still ? 'grazing' : 'wandering the meadow')
        : (beast.f != null && still ? 'rooting in the grain' : 'trotting through the dark');
      tip.innerHTML = `<b>${beast.k === 'wolf' ? 'Grey wolf' : beast.k === 'deer' ? 'Red deer' : 'Wild boar'}</b><br><span class="m">${what}</span>`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else if (best) {
      const p = best.p, a = Math.floor(S.ageY(w, p));
      const partner = p.partner != null ? w.people.find((o) => o.id === p.partner) : null;
      const by = S.byname(p);
      tip.innerHTML = `<b>${p.name}</b>${by ? ` <span class="by">${by}</span>` : ''}<br>${a} yrs · ${doing(p)}${partner ? `<br><span class="m">partner of ${partner.name}</span>` : ''}` + (p.id !== follow ? '<br><span class="m">click to follow</span>' : '');
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else if ((best = graveAt(mx, my))) {
      const kin = [best.m, best.f].map((id) => id != null && known.get(id)).filter(Boolean).map((k) => k.name);
      tip.innerHTML = `<b>${esc(best.n)}</b>${best.by ? ` <span class="by">${esc(best.by)}</span>` : ''}<br>${esc(best.why)}, aged ${Math.floor((best.d - best.b) / S.TICKS_PER_YEAR)}<br><span class="m">laid to rest ${when(best.d)}${kin.length ? `<br>child of ${kin.map(esc).join(' &amp; ')}` : ''}</span>`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else tip.hidden = true;
  }
  requestAnimationFrame(frame);
}
// ---------- the far isle ----------
// a dugout, 9x3, and its guests in sea-blue; paddles dip on alternate sides while it moves
const DUGOUT = ['.bbbbbbb.', 'bBBBBBBBb', '.bbbbbbb.'];
const DCOLS = { b: '#5a3a22', B: '#8a5a32' };
const GUEST = '#6fa3c8';
function drawIsle(frac, now, fest) {
  const out = [], B = w.isle && w.isle.boat;
  if (!B) return out;
  const bx = B.px + (B.x - B.px) * frac, by = B.py + (B.y - B.py) * frac, going = B.x !== B.px || B.y !== B.py;
  const X = Math.round(bx * TILE) - 4, Y = Math.round(by * TILE) - 1;
  if (going) px(sc, X - 2, Y + 1, 'rgba(200,220,240,0.35)', 1, 1); // a little wake
  sprite(sc, DUGOUT, X, Y, DCOLS);
  const aboard = B.gs.filter((g) => g.k === 'boat');
  aboard.forEach((g, i) => { // heads and shoulders in a row, paddles dipping
    const gx = X + 1 + i * 2;
    px(sc, gx, Y - 2, '#f1c9a5'); px(sc, gx, Y - 1, g.isl ? '#d9d9d9' : GUEST);
    if (going && (Math.floor(now / 300) + i) % 2) px(sc, gx + 1, Y + 1 + ((i & 1) ? -2 : 2), '#b49a6a', 1, 2);
  });
  out.push({ g: {}, boat: true, n: aboard.length, x: bx, y: by });
  const fcx = w.fire.x + 0.5, fcy = w.fire.y + 0.5;
  for (const g of B.gs) {
    if (g.k === 'boat') continue;
    let x = g.px + (g.x - g.px) * frac, y = g.py + (g.y - g.py) * frac;
    const moving = g.x !== g.px || g.y !== g.py, h = S.hash(g.nm.length, g.a, 7) * 10;
    if (g.k === 'sleep' && !moving) { // rolled in a cloak by the embers
      const GX = Math.round(x * TILE) - 1, GY = Math.round(y * TILE);
      px(sc, GX - 1, GY, '#f1c9a5'); px(sc, GX, GY, GUEST, 4, 1); px(sc, GX + 1, GY - 1, '#4f7fa0', 2, 1);
      out.push({ g, x, y });
      continue;
    }
    let hop = 0;
    if (fest && g.k === 'fest' && !moving) { // the ring turns, and the guests turn with it
      const dx = x - fcx, dy = y - fcy, r = Math.hypot(dx, dy) || 1;
      const a = Math.atan2(dy, dx) + ((g.r || 0) % 2 ? -1 : 1) * (now / (2400 * r));
      x = fcx + Math.cos(a) * r; y = fcy + Math.sin(a) * r;
      hop = Math.floor(now / 240 + h) % 2;
    }
    const GX = Math.round(x * TILE) - 1, GY = Math.round(y * TILE) - 3 - hop;
    const step = moving || hop ? Math.floor(now / 180 + h) % 2 : 0;
    px(sc, GX + 1, GY, '#f1c9a5'); px(sc, GX, GY + 1, GUEST, 3, 2); px(sc, GX + 1, GY + 1, '#4f7fa0', 1, 1); // a shell bead on the breast
    px(sc, GX + step * 2, GY + 3, '#3a3a3a', 1, 1); px(sc, GX + 2 - step * 2, GY + 3, '#3a3a3a', 1, 1);
    px(sc, GX + 1, GY - 1, '#e9dcc0'); // and a white feather in the hair
    out.push({ g, x, y });
  }
  return out;
}
// ---------- midsummer ----------
const CROWN =['#f28ab0', '#f7d34a', '#ffffff', '#b98af0', '#f28ab0'];
function festNow(c) { return !!(w.fest && w.fest.on === c.day && c.hour >= 16 && c.hour < 23); }
// the midsummer bonfire: a stack of logs, tall flickering flames and sparks drifting up into the dark
function bonfire(X, Y, now) {
  px(sc, X + 1, Y + 6, '#6e4a2a', 6, 1); px(sc, X + 2, Y + 5, '#8a5a32', 4, 1);
  const f = Math.floor(now / 110);
  for (let k = 0; k < 6; k++) { // six tongues of flame, each its own height, licking upward
    const hgt = 4 + Math.floor(S.hash(k, f, 61) * 5) + (k === 2 || k === 3 ? 3 : 0);
    px(sc, X + 1 + k, Y + 6 - hgt, '#e0521f', 1, hgt);
    px(sc, X + 1 + k, Y + 6 - Math.floor(hgt * 0.7), '#f59a2e', 1, Math.floor(hgt * 0.7));
    if (k > 0 && k < 5) px(sc, X + 1 + k, Y + 6 - Math.floor(hgt * 0.4), '#ffe48a', 1, Math.floor(hgt * 0.4));
  }
  for (let i = 0; i < 10; i++) { // sparks rise, drift and wink out
    const life = 1600 + S.hash(i, 3, 62) * 1400, t = ((now + S.hash(i, 4, 62) * life) % life) / life;
    const sx = X + 4 + (S.hash(i, 5, 62) - 0.5) * 6 + Math.sin(now / 400 + i) * 2 * t, sy = Y - 2 - t * 22;
    if (t < 0.85) px(sc, sx | 0, sy | 0, t < 0.4 ? '#ffe48a' : '#f59a2e');
  }
}
// rain, snow and lightning over the scene, at native pixel size so they stay crisp
const drops = Array.from({ length: 900 }, (_, i) => ({ x: S.hash(i, 1, 31), y: S.hash(i, 2, 31), s: S.hash(i, 3, 31) }));
function skyFx(wx, now, dark = 0) {
  if (wx === 'fog') { // banks of sea fog drift slowly in from the west and thin out between
    const col = dark > 0.3 ? '120,128,140' : '214,220,224', a = 0.2 * (1 - dark * 0.55);
    for (let i = 0; i < 26; i++) {
      const d = drops[i], r = 18 + d.s * 26, span = PX + r * 2;
      const x = ((d.x * span + now * (0.0016 + d.s * 0.0018)) % span) - r;
      const y = d.y * PX + Math.sin(now / 9000 + i) * 4;
      const k = 0.55 + 0.45 * Math.sin(now / 7000 + d.s * 9); // each bank thickens and thins
      glow(sc, x, y, r, `rgba(${col},${(a * k).toFixed(3)})`);
    }
    return;
  }
  if (wx === 'rain' || wx === 'storm') {
    const n = wx === 'storm' ? 900 : 380, slant = wx === 'storm' ? 2 : 1;
    sc.fillStyle = wx === 'storm' ? 'rgba(190,210,235,0.55)' : 'rgba(160,190,225,0.45)';
    for (let i = 0; i < n; i++) {
      const d = drops[i], v = 0.22 + d.s * 0.12;
      const y = (d.y * PX + now * v) % PX, x = (d.x * PX + (y * slant) / 4) % PX;
      sc.fillRect(x | 0, y | 0, 1, 2); sc.fillRect((x + slant / 2) | 0, (y + 2) | 0, 1, 2);
    }
    if (wx === 'storm') { // lightning: a white flash, then a fainter echo
      const k = Math.floor(now / 120), f = S.hash(k, 7, 77) < 0.012 ? 0.5 : S.hash(k - 1, 7, 77) < 0.012 ? 0.2 : 0;
      if (f) { sc.fillStyle = `rgba(230,238,255,${f})`; sc.fillRect(0, 0, PX, PX); }
    }
  } else if (wx === 'snow') {
    for (let i = 0; i < 420; i++) {
      const d = drops[i], v = 0.012 + d.s * 0.014;
      const y = (d.y * PX + now * v) % PX, x = (d.x * PX + Math.sin(now / 1100 + d.s * 6.28) * 3 + PX) % PX;
      sc.fillStyle = d.s > 0.8 ? '#ffffff' : 'rgba(235,242,250,0.8)';
      sc.fillRect(x | 0, y | 0, d.s > 0.8 ? 2 : 1, d.s > 0.8 ? 2 : 1);
    }
  } else if (wx === 'heat') { // heat haze: faint rising shimmer
    sc.fillStyle = 'rgba(255,230,180,0.10)';
    for (let i = 0; i < 120; i++) {
      const d = drops[i], y = PX - ((d.y * PX + now * 0.01) % PX);
      sc.fillRect((d.x * PX) | 0, y | 0, 3, 1);
    }
  }
}
// ---------- creatures ----------
// 6x4 sprites facing right; mirrored when heading left. Legs swap while moving.
const WOLF = ['....gG', 'G..gGg', '.gggg.', '.d..d.'];
const WOLF_RUN = ['....gG', 'G..gGg', '.gggg.', 'd....d'];
const WCOL = { g: '#8a8d93', G: '#b4b7bc', d: '#55585e' };
const BOAR = ['.BBB..', 'bbbbbs', 'bbbbbt', '.d..d.'];
const BOAR_RUN = ['.BBB..', 'bbbbbs', 'bbbbbt', 'd....d'];
const BOAR_ROOT = ['.BBB..', 'bbbbb.', 'bbbbbs', '.d..dt'];
const BCOL = { b: '#4d3527', B: '#2e2018', s: '#7a5444', t: '#efe6d2', d: '#2a1d15' };
// deer stand taller: 6x5, head up and ears pricked, or head down in the grass
const DEER = ['....e.', '....hn', 'tbbbb.', '.bbbb.', '.l..l.'];
const DEER_RUN = ['....e.', '....hn', 'tbbbb.', '.bbbb.', 'l....l'];
const DEER_GRAZE = ['......', '......', 'tbbbb.', '.bbbbh', '.l..ln'];
const DCOL = { b: '#9a6a3c', h: '#8a5c32', e: '#6e4a2a', n: '#2a1d15', t: '#efe6d2', l: '#5a3d22' };
const facing = new Map();
function drawBeasts(frac, now) {
  const out = [];
  for (const b of w.beasts || []) {
    if (!b.out) continue;
    const x = b.px + (b.x - b.px) * frac, y = b.py + (b.y - b.py) * frac;
    const dx = b.x - b.px, moving = dx !== 0 || b.y !== b.py;
    let face = facing.get(b.id) || 1;
    if (dx > 0.01) face = 1; else if (dx < -0.01) face = -1;
    facing.set(b.id, face);
    const X = Math.round(x * TILE) - 3, Y = Math.round(y * TILE) - 3;
    const stepF = Math.floor(now / 160 + b.id) % 2;
    let rows;
    if (b.k === 'wolf') rows = moving && stepF ? WOLF_RUN : WOLF;
    else if (b.k === 'deer') rows = moving ? (stepF ? DEER_RUN : DEER) : Math.floor(now / 900 + b.id * 1.7) % 4 ? DEER_GRAZE : DEER;
    else rows = !moving && b.f != null ? (Math.floor(now / 380 + b.id) % 2 ? BOAR_ROOT : BOAR) : moving && stepF ? BOAR_RUN : BOAR;
    const map = b.k === 'wolf' ? WCOL : b.k === 'deer' ? DCOL : BCOL;
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < 6; k++) {
      const ch = rows[r][k];
      if (ch !== '.' && map[ch]) px(sc, face > 0 ? X + k : X + 5 - k, Y + r, map[ch]);
    }
    out.push({ b, x, y, X, Y, face });
  }
  return out;
}

// goats: 5x4, horns up; mirrored when heading left. Head down to graze, legs tucked when bedded in
// the pen. Kids are 3x3 and white. Coats vary: white, brown and white, or near black.
const GOAT = ['...h.', 't.wwH', '.www.', '.l.l.'];
const GOAT_STEP = ['...h.', 't.wwH', '.www.', 'l...l'];
const GOAT_GRAZE = ['.....', 't....', '.wwwh', '.l.lH'];
const GOAT_BED = ['.....', '...h.', 't.wwH', 'wwww.'];
const KID = ['..H', 'ww.', 'l.l'];
const KID_BED = ['...', '..H', 'ww.'];
const GCOATS = [{ w: '#ece6d6', H: '#d8d0bc' }, { w: '#8a6a4a', H: '#ece6d6' }, { w: '#3c3632', H: '#5a524c' }];
function drawGoats(frac, now) {
  const out = [];
  if (!w.goats) return out;
  for (const g of w.goats.herd) {
    const x = g.px + (g.x - g.px) * frac, y = g.py + (g.y - g.py) * frac;
    const dx = g.x - g.px, moving = dx !== 0 || g.y !== g.py;
    let face = facing.get(g.id) || ((g.id & 1) ? 1 : -1);
    if (dx > 0.01) face = 1; else if (dx < -0.01) face = -1;
    facing.set(g.id, face);
    const kid = w.t - g.b < S.TICKS_PER_YEAR;
    const step = Math.floor(now / 170 + g.id) % 2;
    const rows = kid ? (!g.out && !moving ? KID_BED : KID)
      : !g.out && !moving ? GOAT_BED : moving ? (step ? GOAT_STEP : GOAT) : Math.floor(now / 1100 + g.id * 1.3) % 3 ? GOAT_GRAZE : GOAT;
    const coat = kid ? GCOATS[0] : GCOATS[g.id % 3];
    const map = { w: coat.w, H: coat.H, h: '#6e665c', t: coat.w, l: '#2e2a26' };
    const hop = kid && moving && step ? 1 : 0; // kids skip
    const n = rows[0].length, X = Math.round(x * TILE) - (n >> 1), Y = Math.round(y * TILE) - rows.length + 1 - hop;
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < n; k++) {
      const ch = rows[r][k];
      if (ch !== '.') px(sc, face > 0 ? X + k : X + n - 1 - k, Y + r, map[ch]);
    }
    out.push({ g, x, y, kid });
  }
  return out;
}

// dogs: 5x3, tail up, ears pricked; wagging when they stand still, flat out across the doorway at night.
// Pups are 3x2 and tumble after the grown ones. Coats are wolf grey, tawny or near black.
const DOG = ['t...e', '.bbbh', '.l.l.'];
const DOG_STEP = ['t...e', '.bbbh', 'l...l'];
const DOG_WAG = ['....e', 'tbbbh', '.l.l.'];
const DOG_LIE = ['....e', 'tbbbh'];
const PUP = ['..e', 'bbh'];
const DCOATS = [{ b: '#8a8d93', h: '#a3a6ab' }, { b: '#9a7448', h: '#b58d5c' }, { b: '#4a443e', h: '#635b53' }];
function drawDogs(frac, now) {
  const out = [];
  if (!w.dogs) return out;
  for (const d of w.dogs.d) {
    const x = d.px + (d.x - d.px) * frac, y = d.py + (d.y - d.py) * frac;
    const dx = d.x - d.px, moving = dx !== 0 || d.y !== d.py;
    let face = facing.get(d.id) || ((d.id & 1) ? -1 : 1);
    if (dx > 0.01) face = 1; else if (dx < -0.01) face = -1;
    facing.set(d.id, face);
    const pup = w.t - d.b < S.TICKS_PER_YEAR;
    const step = Math.floor(now / 120 + d.id) % 2;
    const rows = pup ? PUP : d.lie && !moving ? DOG_LIE : moving ? (step ? DOG_STEP : DOG) : Math.floor(now / 260 + d.id) % 2 ? DOG_WAG : DOG;
    const coat = DCOATS[d.id % 3];
    const map = { b: coat.b, h: coat.h, t: coat.b, e: '#2e2a26', l: '#2e2a26' };
    const hop = pup && moving && step ? 1 : 0;
    const n = rows[0].length, X = Math.round(x * TILE) - (n >> 1), Y = Math.round(y * TILE) - rows.length + 1 - hop;
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < n; k++) {
      const ch = rows[r][k];
      if (ch !== '.') px(sc, face > 0 ? X + k : X + n - 1 - k, Y + r, map[ch]);
    }
    out.push({ d, x, y, pup });
  }
  return out;
}

// rats: render-only. A few dart about the granaries (or the houses) by day; at dusk and through
// the night the colony comes out in force, one sprite for every six or so, scurrying in short
// runs along the walls, freezing, then running again. Spilled grain lies under a swarmed granary.
const RAT = ['.bbh', 't...'];
const RCOL = { b: '#6f6862', h: '#57514c', t: '#a08a84' };
function drawRats(hf, now) {
  const n = w.rats ? w.rats.n : 0;
  if (!n) return;
  let nests = w.buildings.filter((b) => b.kind === 'granary' && b.progress >= 1);
  if (!nests.length) nests = w.buildings.filter((b) => b.progress >= 1);
  if (!nests.length) return;
  const wx = wxNow();
  const night = hf >= 19 || hf < 6;
  const shown = Math.min(18, Math.ceil(n / (night ? 6 : 25)) - (wx === 'storm' || wx === 'snow' ? 1 : 0));
  if (n >= 40) for (const b of nests) if (b.kind === 'granary') { // spilled grain and husks under the floor
    for (let k = 0; k < 5; k++) px(sc, b.x * TILE + 1 + Math.floor(S.hash(b.id, k, 31) * 6), b.y * TILE + 7, k % 2 ? '#c9a94e' : '#8f7a46');
  }
  for (let i = 0; i < shown; i++) {
    const b = nests[i % nests.length];
    // each rat runs a little loop around its nest: a dash, a pause, a dash
    const per = 2600 + Math.floor(S.hash(i, 1, 37) * 2400);
    const ph = ((now + S.hash(i, 2, 37) * per) % per) / per;
    const run = ph < 0.45 ? ph / 0.45 : ph < 0.55 ? 1 : 1 - (ph - 0.55) / 0.45;
    const a0 = S.hash(i, 3, 37) * 6.28, a1 = a0 + (S.hash(i, 4, 37) < 0.5 ? 1.6 : -1.6);
    const r = 5 + S.hash(i, 5, 37) * 5;
    const ang = a0 + (a1 - a0) * run;
    const X = Math.round(b.x * TILE + 4 + Math.cos(ang) * r), Y = Math.round(b.y * TILE + 5 + Math.sin(ang) * r * 0.6);
    const face = (a1 > a0) === (ph < 0.5) ? (Math.sin(ang) > 0 ? -1 : 1) : (Math.sin(ang) > 0 ? 1 : -1);
    for (let row = 0; row < RAT.length; row++) for (let k = 0; k < 4; k++) {
      const ch = RAT[row][k];
      if (ch !== '.') px(sc, face > 0 ? X + k : X + 3 - k, Y + row, RCOL[ch]);
    }
  }
}

// the fog horn is blown for a long breath every few seconds: ms into the blast, or -1 between blasts
const HORN_EVERY = 5200, HORN_LONG = 1800;
const hornBlast = (now) => { const t = now % HORN_EVERY; return t < HORN_LONG ? t : -1; };
// thin rings of sound roll out from the hearth over the fog and fade at the edge of earshot (13 tiles)
function hornRings(at, now) {
  const t = now % HORN_EVERY, reach = 13 * TILE, cx = at.x * TILE + 3.5, cy = at.y * TILE - 3.5;
  sc.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const age = t - k * 420;
    if (age < 0) continue;
    const f = age / (HORN_EVERY - 600);
    if (f >= 1) continue;
    sc.strokeStyle = `rgba(255,255,255,${(0.42 * (1 - f) * (1 - f)).toFixed(3)})`;
    sc.beginPath(); sc.arc(cx, cy, 2 + f * reach, 0, Math.PI * 2); sc.stroke();
  }
}
function glow(c, x, y, r, col) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- panels ----------
function updatePanels() {
  const s = S.summary(w), c = S.clock(w.t);
  const named = w.people.filter((p) => p.dd && p.dd.by).sort((a, b) => a.born - b.born);
  $('title').textContent = w.name;
  const sky = s.weather + (s.weather !== 'clear' && s.weatherDays > 1 ? ` (day ${s.weatherDays})` : '');
  $('when').innerHTML = `Year ${s.year} · ${s.season}, day ${s.day} · ${String(s.hour).padStart(2, '0')}:00 · <span class="wx ${wxNow()}">${sky}</span>` + (s.festival ? ' · <span class="fest">midsummer fire</span>' : '');
  $('res').innerHTML = [
    ['pop', 'People', `${s.pop} <span class="m">(${s.children} young)</span>` + (s.sick ? ` <span class="bad">${s.sick} sick</span>` : '') + (s.lost ? ` <span class="bad">${esc(s.lost)} lost in the fog</span>` : '')],
    ['food', 'Grain', s.food > s.safe ? `${s.food.toLocaleString()} <span class="m">(${(s.food - s.safe).toLocaleString()} rotting)</span>` : s.food.toLocaleString()],
    ['wood', 'Timber', s.timber.toLocaleString()],
    ['house', 'Houses', s.roofsDown ? `${s.houses} <span class="m">(${s.roofsDown} roofless)</span>` : s.houses],
    ['field', 'Fields', s.fencing ? `${s.fields} <span class="m">(${s.fenced} fenced)</span>` : s.fields],
    ['gran', 'Granaries', `${s.granaries} <span class="m">(${s.safe.toLocaleString()} kept dry)</span>`],
    ['wild', 'Wilds', `${s.wolves} wolves · ${s.boars} boars · ${s.deer} deer` + (s.hurt ? ` <span class="bad">(${s.hurt} bitten)</span>` : s.afraid ? ' <span class="m">(in by dusk)</span>' : '')],
    ...(w.techs.includes('paths') ? [['path', 'Paths', `${s.paths} <span class="m">tiles trodden bare</span>`]] : []),
    ...(w.techs.includes('herbs') ? [['herb', 'Herbs', `${s.herbs} <span class="m">bundles · ${s.healer ? esc(s.healer) + ' heals' : 'no healer'}</span>`]] : []),
    ...(s.ratsCame ? [['rat', 'Rats', s.rats ? `${s.rats} <span class="m">· ${s.ratsAte.toLocaleString()} grain eaten this year</span>` : '<span class="m">none in the stores</span>']] : []),
    ...(s.goatsCame ? [['goat', 'Goats', `${s.goats} <span class="m">· ${s.herder ? esc(s.herder) + ' minds them' : 'nobody minds them'}${s.goatMilk ? ` · ${s.goatMilk} milk this year` : ''}${s.penYear ? ` · wolves at the pen ${s.penYear}x this year` : ''}${w.goats && w.goats.gap ? ' · <span class="bad">wattle torn</span>' : ''}</span>`]] : []),
    ...(s.dogsCame ? [['dog', 'Dogs', s.dogs ? `${s.dogs} <span class="m">· ${w.dogs.d.filter((d) => w.t - d.b >= S.TICKS_PER_YEAR).map((d) => { const o = w.people.find((q) => q.id === d.own); return esc(d.nm) + (o ? ' with ' + esc(o.name) : ''); }).join(' · ') || 'all pups'}${s.dogsTurned ? ` · ${s.dogsTurned} ${s.dogsTurned === 1 ? 'wolf' : 'wolves'} turned` : ''}${s.dogsFound ? ` · ${s.dogsFound} lost found` : ''}${s.dogsRats ? ` · ${s.dogsRats} rats` : ''}</span>` : '<span class="m">none left</span>']] : []),
    ...(s.horn ? [['horn', 'Horn', `<span class="m">${esc(s.horn)} blows it at the hearth${s.hornFound ? ` · ${s.hornFound} lost ${s.hornFound === 1 ? 'one' : 'ones'} walked home to it` : ''}</span>`]] : []),
    ...(s.isleVisits ? [['isle', 'Far isle', `${s.guests ? `<span class="fest">${s.guests} guests here</span> · ` : ''}<span class="m">${s.isleVisits} ${s.isleVisits === 1 ? 'visit' : 'visits'} · ${s.isleWed} stayed to marry${s.isleGone ? ` · ${s.isleGone} sailed away` : ''}</span>`]] : []),
    ...(named.length ? [['by', 'Named', `<span class="by">${named.map((p) => esc(p.name + ' ' + S.byname(p))).join(' · ')}</span>`]] : []),
    ...(w.yard ? [['grave', 'Graves', `${s.lying} <span class="m">in the burying ground</span>`]] : []),
    ...(s.hunting ? [['hunt', 'Hunt', `${s.boarsTaken} boars · ${s.wolvesTaken} wolves <span class="m">(${s.hides} ${s.hides === 1 ? 'hide' : 'hides'})</span>`]] : []),
  ].map(([k, l, v]) => `<div class="row"><i class="ic ${k}"></i><span>${l}</span><b>${v}</b></div>`).join('');
  const kinds = { major: 'maj', bad: 'bad', good: 'good', birth: 'good', death: 'm', love: 'love', year: 'm', info: '' };
  $('log').innerHTML = w.log.slice(-40).reverse().map((e) => `<div class="${kinds[e.k] || ''}"><span class="when">${e.s}</span>${e.text}</div>`).join('');
  for (const p of w.people) if (!known.has(p.id)) known.set(p.id, { name: p.name, sex: p.sex });
  for (const g of w.graves || []) if (!known.has(g.id)) known.set(g.id, { name: g.n, sex: g.x });
  drawWho();
  drawSpark();
  if (!$('sky').hidden) drawSky();
}
function drawSpark() {
  const cvs = $('spark'), g = cvs.getContext('2d');
  const W = (cvs.width = cvs.clientWidth * dpr), H = (cvs.height = cvs.clientHeight * dpr);
  const d = w.hist.daily.slice(-360);
  g.clearRect(0, 0, W, H);
  if (d.length < 2) return;
  const vals = d.map((r) => r[1]);
  const lo = Math.max(0, Math.min(...vals) - 2), hi = Math.max(...vals) + 2;
  g.strokeStyle = '#59f08b'; g.lineWidth = dpr; g.beginPath();
  d.forEach((r, i) => { const x = (i / (d.length - 1)) * (W - 2) + 1, y = H - 2 - ((r[1] - lo) / (hi - lo)) * (H - 4); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke();
  $('sparkcap').textContent = `population ${lo}–${hi}, last ${Math.min(360, d.length)} days`;
}

// ---------- dates for the sky ----------
const realWhen = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function gameWhen(id, long) {
  const t = w.learned && w.learned[id];
  if (t == null) return long ? 'before records began' : '';
  if (t === 0) return long ? 'at the founding' : 'founding';
  const c = S.clock(t);
  return long ? `in year ${c.year}, ${S.SEASONS[c.season].toLowerCase()} day ${c.dos}` : `Y${c.year} ${S.SEASONS[c.season]} ${c.dos}`;
}
let progress = null;
async function loadProgress() {
  if (progress) return;
  try { const r = await fetch('progress.json', { cache: 'no-store' }); progress = r.ok ? await r.json() : []; } catch { progress = []; }
  drawTimeline();
}
function drawTimeline() {
  if (!progress || !w) return;
  const rows = [...progress].reverse().map((e) => `<div><span class="when">${esc(realWhen(e.at))}</span>${esc(e.title)}</div>`);
  rows.push(`<div><span class="when">${esc(realWhen(new Date(w.epoch).toISOString()))}</span>${esc(w.name)} is founded</div>`);
  $('tlog').innerHTML = rows.join('');
  $('tlhd').textContent = `Changes to the island · ${progress.length}`;
}

// ---------- history: one entry per island year, with the real day it fell on ----------
const realDay = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
function drawHistory() {
  if (!w) return;
  const YMS = S.TICKS_PER_YEAR * S.TICK_MS, c = S.clock(w.t), s = S.summary(w);
  const yearly = w.hist.yearly || [];
  $('hhd').textContent = `History of ${w.name}`;
  $('hsub').textContent = `founded ${realWhen(new Date(w.epoch).toISOString())} · year ${c.year} now · one island year passes each real day`;
  // events of each year from the chronicle (major moments only)
  const ev = {};
  for (const e of w.chronicle || []) (ev[S.clock(e.t).year] ||= []).push(e);
  const row = (y, now) => {
    const h = yearly.find((r) => r.y === y);
    const start = w.epoch + (y - 1) * YMS;
    const when = now ? `${realDay(start)} – now` : `${realDay(start)} ${new Date(start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${realDay(start + YMS)}`;
    let st = '';
    if (h) {
      st = `${h.pop} people · <span class="up">+${h.births} born</span> · <span class="dn">−${h.deaths} died</span> · ${h.harvest} grain harvested`;
      const n = (k, one, many) => k && `${k} ${k === 1 ? one : many}`;
      const xs = [n(h.storms, 'storm day', 'storm days'), n(h.wolves, 'wolf attack', 'wolf attacks'), n(h.raids, 'boar raid', 'boar raids'), n(h.hunted, 'beast hunted', 'beasts hunted'), h.sick && `${h.sick} fell sick`, h.rats >= 50 && `${h.rats} grain eaten by rats`, h.goats && `${h.goats} goats`, n(h.goatsLost, 'goat lost to wolves', 'goats lost to wolves'), n(h.pens, 'night a wolf came to the pen', 'nights wolves came to the pen'),n(h.lost, 'search in the fog', 'searches in the fog'), n(h.dogs, 'dog', 'dogs')].filter(Boolean);
      if (xs.length) st += `<br>${xs.join(' · ')}`;
    } else if (now) {
      st = `${s.pop} people so far · <span class="up">+${w.stats.yb} born</span> · <span class="dn">−${w.stats.yd} died</span> · now ${s.season.toLowerCase()}, day ${s.day}`;
    }
    const list = (ev[y] || []).map((e) => `<div class="ev"><span class="se">${esc(S.SEASONS[S.clock(e.t).season])}</span>${esc(e.text)}</div>`).join('');
    return `<div class="yr${now ? ' now' : ''}"><div class="yh"><b>Year ${y}${now ? ' · in progress' : ''}</b><span class="rd">${esc(when)}</span></div>`
      + (st ? `<div class="ys">${st}</div>` : '') + (list || '<div class="quiet">A quiet year.</div>') + '</div>';
  };
  let html = '';
  for (let y = c.year; y >= 1; y--) html += row(y, y === c.year);
  $('hyears').innerHTML = html;
  drawHistChart();
}
function drawHistChart() {
  const cvs = $('hspark'), g = cvs.getContext('2d');
  const W = (cvs.width = cvs.clientWidth * dpr), H = (cvs.height = cvs.clientHeight * dpr);
  g.clearRect(0, 0, W, H);
  // whole years if there are a few of them, otherwise the days of this young island
  const yearly = w.hist.yearly || [];
  let pts, cap;
  if (yearly.length >= 2) {
    pts = [...yearly.map((r) => [r.y, r.pop]), [yearly[yearly.length - 1].y + S.clock(w.t).doy / S.DAYS_PER_YEAR, w.people.length]];
    cap = [`population by year, 1–${yearly.length}`, `peak ${w.stats.peak}`];
  } else {
    pts = (w.hist.daily || []).map((r) => [r[0], r[1]]);
    cap = ['population by day so far (years appear once a few have passed)', `now ${w.people.length}`];
  }
  if (pts.length < 2) pts = [[0, w.people.length], [1, w.people.length]];
  const x0 = pts[0][0], x1 = pts[pts.length - 1][0] || 1;
  const vals = pts.map((p) => p[1]), lo = 0, hi = Math.max(10, ...vals) * 1.1;
  const X = (x) => 4 * dpr + ((x - x0) / Math.max(1e-9, x1 - x0)) * (W - 8 * dpr), Y = (v) => H - 3 * dpr - ((v - lo) / (hi - lo)) * (H - 10 * dpr);
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = dpr;
  for (const f of [0.25, 0.5, 0.75]) { g.beginPath(); g.moveTo(0, Y(hi * f)); g.lineTo(W, Y(hi * f)); g.stroke(); }
  g.fillStyle = 'rgba(89,240,139,0.08)'; g.beginPath(); g.moveTo(X(pts[0][0]), H);
  for (const p of pts) g.lineTo(X(p[0]), Y(p[1]));
  g.lineTo(X(pts[pts.length - 1][0]), H); g.fill();
  g.strokeStyle = '#59f08b'; g.lineWidth = 1.5 * dpr; g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.stroke();
  g.fillStyle = '#8a8f98'; g.font = `${Math.round(11 * dpr)}px "Share Tech Mono", monospace`; g.textAlign = 'left';
  g.fillText(String(Math.round(hi * 0.75)), 4 * dpr, Y(hi * 0.75) - 3 * dpr);
  $('hcap').innerHTML = cap.map((t) => `<span>${esc(t)}</span>`).join('');
}
function showHistory(on) {
  $('hist').hidden = !on; $('histbtn').classList.toggle('on', on);
  if (on) { $('sky').hidden = true; $('skybtn').classList.remove('on'); drawHistory(); }
}

// ---------- the sky: discoveries as constellations ----------
function drawSky() {
  const cvs = $('skyc'), g = cvs.getContext('2d');
  const W = (cvs.width = cvs.clientWidth * dpr), H = (cvs.height = cvs.clientHeight * dpr);
  g.fillStyle = '#020308'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(200,210,255,${(S.hash(i, 9, 2) * 0.5).toFixed(2)})`; g.fillRect(S.hash(i, 1, 2) * W, S.hash(i, 2, 2) * H, dpr, dpr); }
  const ids = Object.keys(S.TECHS);
  const pos = {};
  ids.forEach((id, i) => { pos[id] = { x: W * (0.2 + 0.6 * S.hash(i, 21, 7)), y: H * (0.2 + 0.6 * S.hash(i, 22, 7)) }; });
  // tidy layout: a gentle arc by depth
  const depth = (id) => (S.TECHS[id].req.length ? 1 + Math.max(...S.TECHS[id].req.map(depth)) : 0);
  const byD = {}; ids.forEach((id) => (byD[depth(id)] ||= []).push(id));
  const D = Object.keys(byD).length;
  for (const [d, list] of Object.entries(byD)) list.forEach((id, k) => {
    pos[id] = { x: W * (0.15 + 0.7 * ((+d + 0.5) / D)), y: H * (0.18 + 0.64 * ((k + 0.5) / list.length)) + (S.hash(k, +d, 4) - 0.5) * H * 0.12 };
  });
  g.lineWidth = dpr;
  for (const id of ids) for (const r of S.TECHS[id].req) {
    const lit = w.techs.includes(id) && w.techs.includes(r);
    g.strokeStyle = lit ? 'rgba(89,240,139,0.7)' : 'rgba(255,255,255,0.18)';
    g.beginPath(); g.moveTo(pos[r].x, pos[r].y); g.lineTo(pos[id].x, pos[id].y); g.stroke();
  }
  g.font = `${Math.round(13 * dpr)}px "Share Tech Mono", monospace`; g.textAlign = 'center';
  for (const id of ids) {
    const { x, y } = pos[id], lit = w.techs.includes(id);
    const col = lit ? '#59f08b' : '#666';
    g.fillStyle = col;
    const r = 5 * dpr;
    g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x + r * 0.4, y - r * 0.4); g.lineTo(x + r * 2, y); g.lineTo(x + r * 0.4, y + r * 0.4);
    g.lineTo(x, y + r * 2); g.lineTo(x - r * 0.4, y + r * 0.4); g.lineTo(x - r * 2, y); g.lineTo(x - r * 0.4, y - r * 0.4); g.fill();
    if (lit) { const gg = g.createRadialGradient(x, y, 0, x, y, r * 4); gg.addColorStop(0, 'rgba(89,240,139,0.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); }
    g.fillStyle = lit ? '#e8e8e8' : '#777'; g.fillText(S.TECHS[id].name, x, y + r * 4.2);
    g.font = `${Math.round(11 * dpr)}px "Share Tech Mono", monospace`;
    g.fillStyle = lit ? 'rgba(89,240,139,0.75)' : '#555';
    g.fillText(lit ? gameWhen(id) : 'not yet learned', x, y + r * 4.2 + 14 * dpr);
    g.font = `${Math.round(13 * dpr)}px "Share Tech Mono", monospace`;
  }
  cvs.onmousemove = (e) => {
    const r = cvs.getBoundingClientRect(), mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr;
    const hit = ids.find((id) => Math.hypot(pos[id].x - mx, pos[id].y - my) < 18 * dpr);
    if (!hit) { $('skytip').textContent = 'Each star is something the islanders have learned. New stars appear when spare power reaches the island.'; return; }
    const T = S.TECHS[hit], lit = w.techs.includes(hit);
    $('skytip').innerHTML = `${esc(T.name)}: ${esc(T.desc)}<div class="m">${T.added ? 'came to the island ' + esc(realWhen(T.added)) + ' · ' : ''}${lit ? 'learned ' + esc(gameWhen(hit, true)) : 'not learned yet'}</div>`;
  };
}

// ---------- boot ----------
async function boot() {
  resize();
  window.addEventListener('resize', () => { resize(); if (w) updatePanels(); });
  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (drag) dragTo(e);
  });
  // a drag pans (and lets go of the camera, though the card stays); a click without a drag picks someone to follow
  const dragTo = (e) => {
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5 && !drag.moved) return;
    if (!drag.moved) { drag.moved = true; returning = false; if (track) { track = false; drawWho(); } }
    pan.x = drag.px + e.clientX - drag.x; pan.y = drag.py + e.clientY - drag.y; applyView();
  };
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (drag && e.pointerType !== 'mouse') dragTo(e); });
  cv.addEventListener('pointerup', (e) => {
    const d = drag; drag = null;
    if (!d || d.moved || !w) return;
    const r = cv.getBoundingClientRect();
    const mx = ((e.clientX - r.left) * dpr - view.ox) / (TILE * view.s), my = ((e.clientY - r.top) * dpr - view.oy) / (TILE * view.s);
    let best = null, bd = e.pointerType === 'mouse' ? 0.6 : 1.2;
    for (const o of lastShown) { const dd = Math.hypot(o.x - mx, o.y - 0.2 - my); if (dd < bd) { bd = dd; best = o.p; } }
    if (best) startFollow(best.id);
    else if (follow != null) stopFollow();
  });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.35, Math.min(4, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); computeView(); }, { passive: false });
  cv.addEventListener('dblclick', () => { zoom = 1; pan = { x: 0, y: 0 }; if (follow != null) stopFollow(); cam = null; returning = false; computeView(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('hist').hidden) return showHistory(false); if (e.key === 'Escape' && follow != null) stopFollow(); });
  $('who').addEventListener('click', (e) => {
    const a = e.target.closest('[data-id],[data-close]');
    if (!a) return;
    if (a.hasAttribute('data-close')) stopFollow(); else startFollow(+a.dataset.id);
  });
  cv.addEventListener('mouseleave', () => { mouse = null; $('tip').hidden = true; });
  $('histbtn').onclick = () => showHistory($('hist').hidden);
  $('histback').onclick = () => showHistory(false);
  $('skybtn').onclick = () => { if (!$('hist').hidden) showHistory(false); $('sky').hidden = !$('sky').hidden; $('skybtn').classList.toggle('on', !$('sky').hidden); if (!$('sky').hidden) { drawSky(); loadProgress(); } };
  $('logbtn').onclick = () => app.classList.toggle('logopen');
  try {
    const r = await fetch('world/state.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    w = S.migrate(await r.json());
  } catch {
    demo = true;
    const yrs = +(new URLSearchParams(location.search).get('demo') || window.DEMO_YEARS || 12);
    w = S.genesis(DEMO_SEED, Date.now() - yrs * S.TICKS_PER_YEAR * S.TICK_MS - 13.5 * S.TICK_MS);
    $('badge').hidden = false;
    S.advanceTo(w, S.tickAt(w, Date.now()) - 1);
  }
  requestAnimationFrame(frame);
}
boot();
