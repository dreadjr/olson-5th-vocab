// Check every word set and every math help file without building.
import { loadSets } from './lib.mjs';
import { checkAllHelp } from './help-check.mjs';

try {
  const sets = loadSets();
  for (const s of sets) console.log(`ok  sets/${s.slug}.json  (${s.words.length} words)`);
  const helpErrs = checkAllHelp();
  if (helpErrs.length) throw new Error(helpErrs.join('\n'));
  console.log('ok  math help files');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
