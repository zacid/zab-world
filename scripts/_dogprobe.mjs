// Dog probe: run a seed for N years and report dogs and their deeds. node scripts/_dogprobe.mjs [years] [seed]
import * as S from '../src/sim.js';
const years = +(process.argv[2] || 60), seed = +(process.argv[3] || 20261114);
const w = S.genesis(seed, 0);
for (let y = 1; y <= years; y++) {
  S.advanceTo(w, y * S.TICKS_PER_YEAR);
  const s = S.summary(w);
  if (y % 5 === 0 || y < 8) console.log(`Y${y} pop ${s.pop} dogs ${s.dogs} turned ${s.dogsTurned} found ${s.dogsFound} rats ${s.dogsRats} pen ${w.dogs ? w.dogs.p : 0} killed ${w.dogs ? w.dogs.dead : 0} goats ${s.goats}`);
}
const re = /dog|cub|pup|whelp|Bran|Gyp|Fen|Tor|Mab|Rua|Nip|Scar|Brock|Moss|Tansy|Holt|Wisp|Cull|Sorrel|Grim|Dun|Pip|Rook/;
for (const e of [...w.chronicle]) if (re.test(e.text)) console.log('  *', e.s, e.text);
for (const e of w.log.slice(-400)) if (re.test(e.text)) console.log('   ', e.s, e.text);
