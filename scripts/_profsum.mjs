// node scripts/_profsum.mjs <file.cpuprofile> [n]: self time per function, top n
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const n = +(process.argv[3] || 30);
const dt = new Map();
for (let i = 0; i < p.samples.length; i++) dt.set(p.samples[i], (dt.get(p.samples[i]) || 0) + (p.timeDeltas[i] || 0));
const self = new Map(), byId = new Map();
for (const nd of p.nodes) byId.set(nd.id, nd);
let total = 0;
for (const nd of p.nodes) {
  const t = dt.get(nd.id) || 0; total += t;
  const cf = nd.callFrame, k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
  self.set(k, (self.get(k) || 0) + t);
}
// inclusive time
const incl = new Map();
const walk = (id, seen) => {
  const nd = byId.get(id); let t = dt.get(id) || 0;
  for (const c of nd.children || []) t += walk(c, seen);
  const cf = nd.callFrame, k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
  if (!seen.has(k)) { incl.set(k, (incl.get(k) || 0) + t); }
  return t;
};
walk(p.nodes[0].id, new Set());
console.log('total ms', Math.round(total / 1000));
console.log('--- self');
for (const [k, t] of [...self].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log((t / total * 100).toFixed(1).padStart(5) + '%', k);
// hot source lines (needs positionTicks in the profile), across all functions
const lines = new Map();
for (const nd of p.nodes) for (const pt of nd.positionTicks || []) {
  const k = `${nd.callFrame.functionName || '(anon)'} :${pt.line}`;
  lines.set(k, (lines.get(k) || 0) + pt.ticks);
}
const lt = [...lines.values()].reduce((a, b) => a + b, 0);
if (lt) {
  console.log('--- hot lines');
  for (const [k, t] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log((t / lt * 100).toFixed(1).padStart(5) + '%', k);
}
console.log('--- inclusive (approx, recursion double counts)');
for (const [k, t] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log((t / total * 100).toFixed(1).padStart(5) + '%', k);
