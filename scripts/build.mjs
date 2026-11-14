// Bundles src/ into a single self-contained dist/index.html (plus a preview variant).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const sim = readFileSync('src/sim.js', 'utf8').replace(/^export \{[^}]*\};?$/gm, '').replace(/^export /gm, '');
const render = readFileSync('src/render.js', 'utf8').replace(/^import .*$/gm, '');
const js = `(() => {\nconst S = (() => {\n${sim}\nreturn { SIM_VERSION, TICK_MS, HOURS_PER_DAY, DAYS_PER_SEASON, DAYS_PER_YEAR, TICKS_PER_DAY, TICKS_PER_YEAR, SEASONS, MAP, T, TECHS, rnd, hash, clock, tickAt, ageY, genesis, migrate, step, advanceTo, summary, fingerprint };\n})();\n${render}\n})();`;
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
