// Resolve identifier-only renames while comparing historical source snapshots.
// Historical files and all gameplay fields remain unchanged on disk.
import fs from 'node:fs';
import vm from 'node:vm';
const aliases=vm.runInNewContext(fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8')+';MONSTER_ID_ALIASES');
export function applyRenamedMonsterIds(source){
  return Object.entries(aliases).reduce((text,[oldId,newId])=>text.replaceAll(oldId,newId),source);
}
