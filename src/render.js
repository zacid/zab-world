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
const ROLE = { harvest: '#f2cd4c', plant: '#f2cd4c', clear: '#f2cd4c', chop: '#e07b45', build: '#5fb4f0', forage: '#c08ae8', fish: '#5fd0c8', hunt: '#d0574a', haul: '#d0574a', fest: '#e889b8', idle: '#d9d9d9', gather: '#d9d9d9' };
const FX = { food: '#f2cd4c', wood: '#e07b45', build: '#5fb4f0', fish: '#5fd0c8', meat: '#e8796b', muted: '#9aa', sick: '#b7c98a' };

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
  for (const o of [...w.buildings, ...w.fields]) { x0 = Math.min(x0, o.x - 4); x1 = Math.max(x1, o.x + 5); y0 = Math.min(y0, o.y - 4); y1 = Math.max(y1, o.y + 5); }
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
  return p.task && p.task.k === 'fest' ? 'dancing at the midsummer fire' : a < 14 ? 'playing' : p.hurt ? 'nursing a wolf bite' : a >= 65 ? 'resting' : ({ harvest: 'harvesting', plant: 'sowing', clear: 'clearing a field', fence: 'weaving a fence', chop: 'felling trees', build: 'building', forage: 'foraging', fish: 'fishing', idle: 'idling', gather: 'at the fire',
    hunt: p.task && p.task.q === 'wolf' ? 'hunting wolves' : 'hunting boar', haul: `carrying a ${p.task && p.task.q === 'wolf' ? 'wolf' : 'boar'} home` })[p.task ? p.task.k : 'idle'] || 'idling';
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
    el.innerHTML = `<div class="hd">Following <span class="x" data-close>✕</span></div><b>${esc(gone)}</b><div class="m">is no longer among the living.</div>` +
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
  const ev = mentions(p.name, 3);
  el.innerHTML = `<div class="hd">Following <span class="x" data-close>✕</span></div>` +
    `<b>${esc(p.name)}</b> <span class="m">${p.sex === 'f' ? 'woman' : 'man'}${a < 14 ? ' (child)' : ''}, ${a} yrs</span>` +
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
function drawTerrain() {
  const c = clockNow();
  const pal = PAL[c.season];
  tc.clearRect(0, 0, PX, PX);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, t = w.tiles[i], X = x * TILE, Y = y * TILE;
    const h = S.hash(x, y, 3);
    if (t === S.T.WATER) {
      const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const tt = (w.tiles[(y + b) * N + x + a]); return x + a >= 0 && x + a < N && y + b >= 0 && y + b < N && tt !== S.T.WATER; });
      if (shore) { px(tc, X, Y, '#0b1a2b', 8, 8); if (h < 0.5) px(tc, X + ((h * 80) | 0) % 7, Y + ((h * 300) | 0) % 7, '#1d3550', 2, 1); }
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
  }
}
const wxNow = () => (w.wx ? w.wx.k : 'clear');

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
  for (const s of sparks) {
    const a = 0.25 + 0.75 * Math.max(0, Math.sin(now / 1400 + s.p));
    ctx.fillStyle = `rgba(150,180,220,${(a * (0.25 + s.s * 0.5)).toFixed(3)})`;
    const sz = s.s > 0.85 ? 2 : 1;
    ctx.fillRect(Math.floor(s.x * cv.width), Math.floor(s.y * cv.height), sz * dpr, sz * dpr);
  }

  // scene at native resolution
  sc.clearRect(0, 0, PX, PX);
  sc.drawImage(terr, 0, 0);
  // fire
  const fx0 = w.fire.x * TILE, fy0 = w.fire.y * TILE;
  const fl = Math.floor(now / 140) % 3;
  const fest = festNow(c);
  if (fest) bonfire(fx0, fy0, now);
  else { px(sc, fx0 + 3, fy0 + 3, '#f0742b', 2, 3); px(sc, fx0 + 3 + (fl === 1 ? 1 : 0), fy0 + 2 - (fl === 2 ? 1 : 0), '#ffc23d', 1, 2); px(sc, fx0 + 4 - (fl === 0 ? 1 : 0), fy0 + 4, '#ffe48a', 1, 1); }
  // people
  const shown = [];
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
        const fur = p.task.q === 'wolf' ? '#8a8d93' : '#4d3527';
        px(sc, X - 1, Y - 1, fur, 4, 2); px(sc, X - 2, Y, fur, 1, 1); px(sc, X + 3, Y - 1, p.task.q === 'wolf' ? '#b4b7bc' : '#7a5444', 1, 1);
      }
    }
    if (p.hurt && age >= 14) px(sc, X + 1, Y + 1, '#c8433a'); // a bloodied bandage
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
  const beasts = drawBeasts(frac, now);
  // the day's sky colours the land
  const wx = wxNow();
  const tint = { rain: 'rgba(18,26,40,0.22)', storm: 'rgba(8,12,22,0.42)', heat: 'rgba(255,170,60,0.09)', cold: 'rgba(150,190,255,0.12)', snow: 'rgba(200,215,235,0.10)' }[wx];
  if (tint) { sc.fillStyle = tint; sc.fillRect(0, 0, PX, PX); }
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
  skyFx(wx, now);
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
    const tip = $('tip');
    if (beast) {
      const what = beast.k === 'wolf'
        ? (beast.prey != null ? 'stalking someone' : 'prowling the treeline')
        : (beast.f != null && beast.x === beast.px && beast.y === beast.py ? 'rooting in the grain' : 'trotting through the dark');
      tip.innerHTML = `<b>${beast.k === 'wolf' ? 'Grey wolf' : 'Wild boar'}</b><br><span class="m">${what}</span>`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else if (best) {
      const p = best.p, a = Math.floor(S.ageY(w, p));
      const partner = p.partner != null ? w.people.find((o) => o.id === p.partner) : null;
      tip.innerHTML = `<b>${p.name}</b><br>${a} yrs · ${doing(p)}${partner ? `<br><span class="m">partner of ${partner.name}</span>` : ''}` + (p.id !== follow ? '<br><span class="m">click to follow</span>' : '');
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else tip.hidden = true;
  }
  requestAnimationFrame(frame);
}
// ---------- midsummer ----------
const CROWN = ['#f28ab0', '#f7d34a', '#ffffff', '#b98af0', '#f28ab0'];
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
function skyFx(wx, now) {
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
    else rows = !moving && b.f != null ? (Math.floor(now / 380 + b.id) % 2 ? BOAR_ROOT : BOAR) : moving && stepF ? BOAR_RUN : BOAR;
    const map = b.k === 'wolf' ? WCOL : BCOL;
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < 6; k++) {
      const ch = rows[r][k];
      if (ch !== '.' && map[ch]) px(sc, face > 0 ? X + k : X + 5 - k, Y + r, map[ch]);
    }
    out.push({ b, x, y, X, Y, face });
  }
  return out;
}

function glow(c, x, y, r, col) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- panels ----------
function updatePanels() {
  const s = S.summary(w), c = S.clock(w.t);
  $('title').textContent = w.name;
  const sky = s.weather + (s.weather !== 'clear' && s.weatherDays > 1 ? ` (day ${s.weatherDays})` : '');
  $('when').innerHTML = `Year ${s.year} · ${s.season}, day ${s.day} · ${String(s.hour).padStart(2, '0')}:00 · <span class="wx ${wxNow()}">${sky}</span>` + (s.festival ? ' · <span class="fest">midsummer fire</span>' : '');
  $('res').innerHTML = [
    ['pop', 'People', `${s.pop} <span class="m">(${s.children} young)</span>` + (s.sick ? ` <span class="bad">${s.sick} sick</span>` : '')],
    ['food', 'Grain', s.food > s.safe ? `${s.food.toLocaleString()} <span class="m">(${(s.food - s.safe).toLocaleString()} rotting)</span>` : s.food.toLocaleString()],
    ['wood', 'Timber', s.timber.toLocaleString()],
    ['house', 'Houses', s.roofsDown ? `${s.houses} <span class="m">(${s.roofsDown} roofless)</span>` : s.houses],
    ['field', 'Fields', s.fencing ? `${s.fields} <span class="m">(${s.fenced} fenced)</span>` : s.fields],
    ['gran', 'Granaries', `${s.granaries} <span class="m">(${s.safe.toLocaleString()} kept dry)</span>`],
    ['wild', 'Wilds', `${s.wolves} wolves · ${s.boars} boars` + (s.hurt ? ` <span class="bad">(${s.hurt} bitten)</span>` : s.afraid ? ' <span class="m">(in by dusk)</span>' : '')],
    ...(s.hunting ? [['hunt', 'Hunt', `${s.boarsTaken} boars · ${s.wolvesTaken} wolves <span class="m">(${s.hides} ${s.hides === 1 ? 'hide' : 'hides'})</span>`]] : []),
  ].map(([k, l, v]) => `<div class="row"><i class="ic ${k}"></i><span>${l}</span><b>${v}</b></div>`).join('');
  const kinds = { major: 'maj', bad: 'bad', good: 'good', birth: 'good', death: 'm', love: 'love', year: 'm', info: '' };
  $('log').innerHTML = w.log.slice(-40).reverse().map((e) => `<div class="${kinds[e.k] || ''}"><span class="when">${e.s}</span>${e.text}</div>`).join('');
  for (const p of w.people) if (!known.has(p.id)) known.set(p.id, { name: p.name, sex: p.sex });
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
  }
  cvs.onmousemove = (e) => {
    const r = cvs.getBoundingClientRect(), mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr;
    const hit = ids.find((id) => Math.hypot(pos[id].x - mx, pos[id].y - my) < 18 * dpr);
    $('skytip').textContent = hit ? `${S.TECHS[hit].name}: ${S.TECHS[hit].desc}` : 'Each star is something the islanders have learned. New stars appear when spare power reaches the island.';
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
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && follow != null) stopFollow(); });
  $('who').addEventListener('click', (e) => {
    const a = e.target.closest('[data-id],[data-close]');
    if (!a) return;
    if (a.hasAttribute('data-close')) stopFollow(); else startFollow(+a.dataset.id);
  });
  cv.addEventListener('mouseleave', () => { mouse = null; $('tip').hidden = true; });
  $('skybtn').onclick = () => { $('sky').hidden = !$('sky').hidden; $('skybtn').classList.toggle('on', !$('sky').hidden); if (!$('sky').hidden) drawSky(); };
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
