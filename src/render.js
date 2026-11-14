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
const ROLE = { harvest: '#f2cd4c', plant: '#f2cd4c', clear: '#f2cd4c', chop: '#e07b45', build: '#5fb4f0', forage: '#c08ae8', fish: '#5fd0c8', idle: '#d9d9d9', gather: '#d9d9d9' };
const FX = { food: '#f2cd4c', wood: '#e07b45', build: '#5fb4f0', fish: '#5fd0c8', muted: '#9aa' };

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
function computeView() {
  if (!w) return;
  let x0 = w.fire.x - 9, x1 = w.fire.x + 10, y0 = w.fire.y - 7, y1 = w.fire.y + 8;
  for (const o of [...w.buildings, ...w.fields]) { x0 = Math.min(x0, o.x - 4); x1 = Math.max(x1, o.x + 5); y0 = Math.min(y0, o.y - 4); y1 = Math.max(y1, o.y + 5); }
  const bw = (x1 - x0) * TILE, bh = (y1 - y0) * TILE;
  let fit = Math.min(cv.width / bw, cv.height / bh) * 0.8 * zoom;
  fit = Math.min(fit, 9 * dpr);
  const s = fit >= 2 ? Math.round(fit) : fit;
  const cx = ((x0 + x1) / 2) * TILE, cy = ((y0 + y1) / 2) * TILE;
  view = { s, ox: Math.round(cv.width / 2 - cx * s + pan.x * dpr), oy: Math.round(cv.height / 2 - cy * s + pan.y * dpr) };
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
    }
  }
  // fire ring, stores
  const fx = w.fire.x * TILE, fy = w.fire.y * TILE;
  px(tc, fx - 8, fy, '#7d6a4e', 24, 8);
  for (let k = 0; k < 6; k++) px(tc, fx + [1, 6, 1, 6, 3, 4][k], fy + [2, 2, 5, 5, 1, 6][k], '#9b9b9b', 1, 1);
  const sacks = Math.min(4, Math.ceil(w.food / 400));
  for (let k = 0; k < sacks; k++) { px(tc, fx + 9 + (k % 2) * 3, fy + 2 + ((k / 2) | 0) * 3, '#d9c08a', 3, 3); px(tc, fx + 10 + (k % 2) * 3, fy + 2 + ((k / 2) | 0) * 3, '#b49a64'); }
  const logs = Math.min(4, Math.ceil(w.timber / 60));
  for (let k = 0; k < logs; k++) { px(tc, fx - 7, fy + 6 - k * 2, '#8a5a32', 6, 2); px(tc, fx - 7, fy + 6 - k * 2, '#c09060', 1, 2); }
  // houses
  for (const b of w.buildings) {
    if (b.kind === 'granary') {
      const rows = b.progress >= 1 ? GRANARY : b.progress > 0.5 ? GRANARY.slice(3) : GRANARY.slice(6);
      sprite(tc, rows, b.x * TILE, b.y * TILE + 8 - rows.length, GCOL);
      if (pal.snow && b.progress >= 1) px(tc, b.x * TILE + 2, b.y * TILE + 1, '#eef3f7', 4, 1);
      continue;
    }
    if (b.progress >= 1) sprite(tc, HOUSE, b.x * TILE, b.y * TILE, HCOL);
    else {
      sprite(tc, FRAME, b.x * TILE, b.y * TILE, HCOL);
      if (b.progress > 0.5) sprite(tc, HOUSE.slice(0, 4), b.x * TILE, b.y * TILE, HCOL);
    }
    if (pal.snow && b.progress >= 1) px(tc, b.x * TILE + 2, b.y * TILE + 1, '#eef3f7', 4, 1);
  }
}

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
  px(sc, fx0 + 3, fy0 + 3, '#f0742b', 2, 3); px(sc, fx0 + 3 + (fl === 1 ? 1 : 0), fy0 + 2 - (fl === 2 ? 1 : 0), '#ffc23d', 1, 2); px(sc, fx0 + 4 - (fl === 0 ? 1 : 0), fy0 + 4, '#ffe48a', 1, 1);
  // people
  const shown = [];
  for (const p of w.people) {
    if (p.asleep) continue;
    const x = p.px + (p.x - p.px) * frac, y = p.py + (p.y - p.py) * frac;
    const X = Math.round(x * TILE) - 1, Y = Math.round(y * TILE) - 3;
    const age = S.ageY(w, p);
    const moving = p.x !== p.px || p.y !== p.py;
    const step = moving ? Math.floor(now / 180 + p.id) % 2 : 0;
    const col = age < 14 ? '#f4f4f4' : age >= 65 ? '#a3a3a3' : ROLE[p.task ? p.task.k : 'idle'] || '#d9d9d9';
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
    }
    shown.push({ p, x, y });
  }
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
    glow(sc, fx0 + 4, fy0 + 4, 22 + Math.sin(now / 200) * 1.5, `rgba(255,140,50,${(dark * 0.55).toFixed(3)})`);
    sc.globalCompositeOperation = 'source-over';
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene, view.ox, view.oy, PX * view.s, PX * view.s);

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
    const tip = $('tip');
    if (best) {
      const p = best.p, a = Math.floor(S.ageY(w, p));
      const job = a < 14 ? 'playing' : a >= 65 ? 'resting' : ({ harvest: 'harvesting', plant: 'sowing', clear: 'clearing a field', chop: 'felling trees', build: 'building', forage: 'foraging', fish: 'fishing', idle: 'idling', gather: 'at the fire' })[p.task ? p.task.k : 'idle'];
      const partner = p.partner != null ? w.people.find((o) => o.id === p.partner) : null;
      tip.innerHTML = `<b>${p.name}</b><br>${a} yrs · ${job}${partner ? `<br><span class="m">partner of ${partner.name}</span>` : ''}`;
      tip.style.left = mouse.x + 14 + 'px'; tip.style.top = mouse.y + 10 + 'px'; tip.hidden = false;
    } else tip.hidden = true;
  }
  requestAnimationFrame(frame);
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
  $('when').textContent = `Year ${s.year} · ${s.season}, day ${s.day} · ${String(s.hour).padStart(2, '0')}:00`;
  $('res').innerHTML = [
    ['pop', 'People', `${s.pop} <span class="m">(${s.children} young)</span>`],
    ['food', 'Grain', s.food > s.safe ? `${s.food.toLocaleString()} <span class="m">(${(s.food - s.safe).toLocaleString()} rotting)</span>` : s.food.toLocaleString()],
    ['wood', 'Timber', s.timber.toLocaleString()],
    ['house', 'Houses', s.houses],
    ['field', 'Fields', s.fields],
    ['gran', 'Granaries', `${s.granaries} <span class="m">(${s.safe.toLocaleString()} kept dry)</span>`],
  ].map(([k, l, v]) => `<div class="row"><i class="ic ${k}"></i><span>${l}</span><b>${v}</b></div>`).join('');
  const kinds = { major: 'maj', bad: 'bad', good: 'good', birth: 'good', death: 'm', love: 'love', year: 'm', info: '' };
  $('log').innerHTML = w.log.slice(-40).reverse().map((e) => `<div class="${kinds[e.k] || ''}"><span class="when">${e.s}</span>${e.text}</div>`).join('');
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
    if (drag) { pan.x = drag.px + e.clientX - drag.x; pan.y = drag.py + e.clientY - drag.y; computeView(); }
  });
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (drag && e.pointerType !== 'mouse') { pan.x = drag.px + e.clientX - drag.x; pan.y = drag.py + e.clientY - drag.y; computeView(); } });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.35, Math.min(4, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); computeView(); }, { passive: false });
  cv.addEventListener('dblclick', () => { zoom = 1; pan = { x: 0, y: 0 }; computeView(); });
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
