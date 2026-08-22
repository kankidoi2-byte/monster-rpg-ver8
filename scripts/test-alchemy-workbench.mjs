import fs from 'node:fs';

const alchemy = fs.readFileSync(new URL('../js/alchemy.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/ui-redesign.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function assert(condition, message){
  if(!condition) throw new Error(message);
}

assert(alchemy.includes('selectedAlchemyMaterialCounts = []'), 'material quantity state is missing');
assert(alchemy.includes('if(!ins) return {levelBonus:0, evolutionBonus:0, total:0}'), 'empty catalyst still receives a bonus');
assert(alchemy.includes('changeAlchemyMaterialCount(index, delta)'), 'material quantity controls are missing');
assert(alchemy.includes("<option value=\"\">使用しない</option>"), 'optional catalyst choice is missing');
assert(!alchemy.includes("if(!ins) errors.push('投入モンスターが選択されていません。')"), 'catalyst is still mandatory');
assert(alchemy.includes('inferAlchemyRecipe(selectedAlchemyMaterialIds)'), 'normal alchemy still requires a preselected target');
assert(alchemy.includes('完成するモンスターは錬成後に判明'), 'unknown-result guidance is missing');
assert(alchemy.includes('IMG.lumina_apprentice'), 'Lumina guide image is missing');
assert(alchemy.includes('alchemyLuminaAdvice(plan, errors)'), 'Lumina advice does not react to the current plan');
assert(alchemy.includes('alchemy-lumina-advisor'), 'Lumina is not permanently visible in the forecast');
assert(!alchemy.includes('value="designated"'), 'designated alchemy is still selectable');
assert(!alchemy.includes('指定錬成'), 'designated alchemy copy is still visible');
assert(alchemy.includes('save.items[id] -= plan.selection.materialCounts[index]'), 'selected material quantities are not consumed');
assert(alchemy.includes('if(plan.instance){'), 'optional catalyst consumption guard is missing');
assert(css.includes('one-screen alchemy workbench'), 'alchemy workbench styles are missing');
assert(css.includes('@media(max-height:700px)'), 'short smartphone layout is missing');
assert(css.includes('#alchemy>.alchemy-panel>.ui-page-heading'), 'legacy alchemy heading is not hidden');
assert(css.includes('#alchemy>.alchemy-panel>.alchemy-home-button'), 'legacy alchemy home button is not hidden');

console.log('Alchemy workbench validation passed (materials, quantities, optional catalyst, hidden result, resident Lumina advice, no designated mode, and short-screen layout).');
