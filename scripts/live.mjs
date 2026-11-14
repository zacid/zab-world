// Loads the real live world from the world-data branch (falls back to a fresh one).
import { execSync } from 'node:child_process';
import * as S from '../src/sim.js';
export function loadLive() {
  try {
    execSync('git fetch -q --depth 1 origin world-data', { stdio: 'ignore' });
    const raw = execSync('git show FETCH_HEAD:state.json', { maxBuffer: 64 << 20 }).toString();
    return { w: JSON.parse(raw), live: true };
  } catch {
    const w = S.genesis(20261114, Date.now() - 30 * S.TICKS_PER_YEAR * S.TICK_MS);
    S.advanceTo(w, 30 * S.TICKS_PER_YEAR);
    return { w, live: false };
  }
}
