import fs from 'node:fs';
import strict from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

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

for(const [roll,success] of [[.001,true],[.999,false]]){
 const {run}=runtime();
 run(`save=initSave();save.coins=20000;save.party=[];
   updateItems=()=>{};typesHtml=()=>'';showUiNotice=()=>{};
   var catalyst=addInstance('freigal',1);addInstance('aquaron',1);
   var existing=addInstance('elixion',10);var existingUid=existing.uid,existingBefore=JSON.stringify(existing);
   const recipe=ALCHEMY_RECIPE_BY_ID.elixion_standard;
   const materialIds=recipe.materialChoices.map(x=>x.normal);
   materialIds.forEach(id=>save.items[id]=20);save.items.venom_carapace=20;save.items.fine_magic_crystal=20;
   const selection={recipeId:recipe.recipeId,mode:'normal',instanceUid:catalyst.uid,materialIds,materialCounts:[1,1,1,1],coinOptionId:'low'};
   selectedAlchemyMaterialIds=[...materialIds];selectedAlchemyMaterialCounts=[1,1,1,8];
   selectAlchemyWorkbenchMaterial(3,'god_core');changeAlchemyMaterialCount(3,1);changeAlchemyMaterialCount(3,-1);
 `);
 strict.equal(run('selectedAlchemyMaterialCounts[3]'),1);
 strict.equal(run('ITEM_DEX_ITEMS.some(x=>x.id==="fine_god_core")'),false);
 strict.equal(run('alchemyWorkbenchMaterialOptions("god_core").includes(\'value="god_core" selected\')'),true);
 strict.equal(run('alchemyPlan(selection).fineCount'),0);
 strict.equal(run("alchemyPlan({...selection,materialIds:['fine_magic_crystal',...materialIds.slice(1)]}).fineCount"),1);
 strict.equal(run('alchemyPlan({...selection,materialCounts:[9,1,1,1]}).quantityBonus'),8);
 strict.equal(run('alchemyPlan({...selection,materialCounts:[1,1,1,9]}).quantityBonus'),0);
 strict.match(run('validateAlchemyPlan(alchemyPlan({...selection,materialCounts:[1,1,1,9]})).join()'),/神核の投入数は1個/);
 strict.match(run("validateAlchemyPlan(alchemyPlan({...selection,materialIds:[...materialIds.slice(0,3),'monster_bone']})).join()"),/神核が1個不足/);
 run('save.items.god_core=0');
 strict.match(run('validateAlchemyPlan(alchemyPlan(selection)).join()'),/神核が1個不足/);
 run(`save.items.god_core=3;Math.random=()=>${roll};var plan=alchemyPlan(selection);`);
 strict.equal(run('validateAlchemyPlan(plan).join()'),'');
 run('finalizeAlchemy(plan);finalizeAlchemy(plan)');
 strict.equal(run('save.items.god_core'),2);
 strict.equal(run('save.items.venom_carapace'),20);
 strict.equal(run('save.instances.filter(x=>x.id==="elixion").length'),success?2:1);
 strict.equal(run('JSON.stringify(getInstance(existingUid))'),run('existingBefore'));
 strict.equal(run('(()=>{const old=structuredClone(save);delete old.items.god_core;return repairSave(old).items.god_core;})()'),0);
 strict.equal(run('(()=>{const old=structuredClone(save);delete old.items.god_core;return JSON.stringify(repairSave(old).instances.find(x=>x.uid===existingUid));})()'),run('existingBefore'));
}
console.log('God Core alchemy: mandatory even for partial matches, no quality/quantity bonus, ordinary quantity bonus preserved, one consumed on success/failure, old instance kept.');
