// Bundles src/ into a single self-contained dist/index.html (plus a preview variant).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Script } from 'node:vm';

const src = readFileSync('src/sim.js', 'utf8');
// every name sim.js exports, so render.js sees the same S.* in the bundle as it does under Node
const names = new Set();
for (const m of src.matchAll(/^export (?:const|let|function) (\w+)/gm)) names.add(m[1]); // one name per export line
for (const m of src.matchAll(/^export \{([^}]*)\}/gm)) for (const n of m[1].split(',')) if (n.trim()) names.add(n.trim());
const sim = src.replace(/^export \{[^}]*\};?$/gm, '').replace(/^export /gm, '');
const render = readFileSync('src/render.js', 'utf8').replace(/^import .*$/gm, '');
const used = new Set([...render.matchAll(/\bS\.([A-Za-z_]\w*)/g)].map((m) => m[1]));
const missing = [...used].filter((n) => !names.has(n));
if (missing.length) { console.error('render.js uses names sim.js does not export: ' + missing.join(', ')); process.exit(1); }
const js = `(() => {\nconst S = (() => {\n${sim}\nreturn { ${[...names].join(', ')} };\n})();\n${render}\n})();`;
// the page is one script: a syntax error anywhere (a name declared twice in render.js, say) leaves it blank
try { new Script(js, { filename: 'bundle.js' }); } catch (e) { console.error('bundle does not parse: ' + e.message); process.exit(1); }
const html = readFileSync('src/index.html', 'utf8');

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html.replace('<!--SCRIPT-->', `<script>\n${js}\n</script>`));

// Inline preview: fixed height, no page background, short demo history.
const preview = html
  .replace(/height:100vh; height:100dvh;/, 'height:560px;')
  .replace('</style>', 'html,body{background:transparent;height:auto} #app{height:560px;border-radius:8px;background:#04070d}</style>')
  .replace('<!--SCRIPT-->', `<script>window.DEMO_YEARS=${process.env.DEMO_YEARS || 6};\n${js}\n</script>`);
writeFileSync('dist/preview.html', preview);
console.log('built dist/index.html', (js.length / 1024).toFixed(0) + ' KB js');
