// Check every word set without building.
import { loadSets } from './lib.mjs';

try {
  const sets = loadSets();
  for (const s of sets) console.log(`ok  sets/${s.slug}.json  (${s.words.length} words)`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
