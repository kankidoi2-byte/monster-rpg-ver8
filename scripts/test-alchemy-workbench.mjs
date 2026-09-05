import fs from 'node:fs';

const alchemy = fs.readFileSync(new URL('../js/alchemy.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/ui-redesign.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function assert(condition, message){
  if(!condition) throw new Error(message);
}

assert(alchemy.includes('selectedAlchemyMaterialCounts = []'), 'material quantity state is missing');
assert(alchemy.includes('if(!ins) return {levelBonus:0, evolutionBonus:0, total:0}'), 'missing catalyst bonus fallback is absent');
assert(alchemy.includes('changeAlchemyMaterialCount(index, delta)'), 'material quantity controls are missing');
assert(!alchemy.includes("<option value=\"\">使用しない</option>"), 'optional catalyst choice remains');
assert(alchemy.includes("if(!ins) errors.push('触媒契約体を1体選択してください。')"), 'catalyst is not mandatory');
assert(alchemy.includes('必須・1体消費'), 'mandatory catalyst guidance is missing');
assert(alchemy.includes('inferAlchemyRecipe(selectedAlchemyMaterialIds)'), 'normal alchemy still requires a preselected target');
assert(alchemy.includes('完成するモンスターは錬成後に判明'), 'unknown-result guidance is missing');
assert(alchemy.includes('IMG.lumina_apprentice'), 'Lumina guide image is missing');
assert(alchemy.includes('alchemyLuminaAdvice(plan, errors)'), 'Lumina advice does not react to the current plan');
assert(alchemy.includes('alchemy-lumina-advisor'), 'Lumina is not permanently visible in the forecast');
assert(!alchemy.includes('value="designated"'), 'designated alchemy is still selectable');
assert(!alchemy.includes('指定錬成'), 'designated alchemy copy is still visible');
assert(alchemy.includes('save.items[id] -= plan.selection.materialCounts[index]'), 'selected material quantities are not consumed');
assert(alchemy.includes('save.instances = save.instances.filter(ins => ins.uid !== plan.instance.uid)'), 'catalyst consumption is missing');
assert(!alchemy.includes('designatedAlchemyCandidates'), 'designated alchemy candidate helper remains');
assert(!alchemy.includes('alchemyResonanceStatus'), 'obsolete alchemy resonance UI remains');
assert(!alchemy.includes('resonanceGain'), 'obsolete alchemy resonance gain remains');
assert(alchemy.includes("plan.recipe?.recipeId === 'elixion_standard'"), 'Elixion-specific forecast is missing');
assert(css.includes('one-screen alchemy workbench'), 'alchemy workbench styles are missing');
assert(css.includes('@media(max-height:700px)'), 'short smartphone layout is missing');
assert(css.includes('#alchemy>.alchemy-panel>.ui-page-heading'), 'legacy alchemy heading is not hidden');
assert(css.includes('#alchemy>.alchemy-panel>.alchemy-home-button'), 'legacy alchemy home button is not hidden');

console.log('Alchemy workbench validation passed (materials, quantities, mandatory consumed catalyst, hidden result, resident Lumina advice, no designated remnants, and short-screen layout).');
