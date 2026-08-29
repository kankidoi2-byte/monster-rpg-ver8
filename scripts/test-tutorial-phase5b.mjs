import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const saveSource=read('js/save.js');
const data=read('js/data.js');
const alchemy=read('js/alchemy.js');
const expedition=read('js/expedition.js');
const progression=read('js/progression.js');
const skills=read('js/skills.js');
const skillGacha=read('js/skill-gacha.js');
const state=read('js/state.js');
const battleFlow=read('js/battle-flow.js');
const ui=read('js/ui.js');
const index=read('index.html');
const notices=read('js/notices-data.js');

assert.match(saveSource,/const SAVE_KEY = 'mb_v95c'/,'the established save key must not change');
const guideIds=['alchemy','expedition','evolutionFusion','skillCards','goldenLand','dex','shopItems','contractorRank'];
guideIds.forEach(id=>assert.ok(saveSource.includes(`'${id}'`),`missing persisted guide flag: ${id}`));

const flowConstants=[
  'TUTORIAL_ALCHEMY_FLOW_ID','TUTORIAL_EXPEDITION_FLOW_ID','TUTORIAL_FUSION_FLOW_ID','TUTORIAL_EVOLUTION_FLOW_ID',
  'TUTORIAL_SKILL_CARDS_FLOW_ID','TUTORIAL_SKILL_GACHA_FLOW_ID','TUTORIAL_GOLDEN_LAND_FLOW_ID','TUTORIAL_DEX_FLOW_ID',
  'TUTORIAL_SHOP_ITEMS_FLOW_ID','TUTORIAL_BATTLE_ITEMS_FLOW_ID','TUTORIAL_CONTRACTOR_RANK_FLOW_ID','TUTORIAL_CONTRACTOR_TITLES_FLOW_ID'
];
const flowSlice=(constant,nextConstant)=>{
  const start=tutorial.indexOf(`registerTutorialFlow(${constant}`);
  const end=nextConstant?tutorial.indexOf(`registerTutorialFlow(${nextConstant}`,start):tutorial.indexOf("document.addEventListener('click'",start);
  assert.ok(start>=0&&end>start,`missing feature guide flow: ${constant}`);
  return tutorial.slice(start,end);
};
const flows=Object.fromEntries(flowConstants.map((constant,index)=>[constant,flowSlice(constant,flowConstants[index+1]||null)]));
for(const [constant,source] of Object.entries(flows)){
  const steps=(source.match(/\{id:'/g)||[]).length;
  assert.ok(steps>=1&&steps<=3,`${constant} must remain within 1–3 screens`);
}

assert.ok(flows.TUTORIAL_ALCHEMY_FLOW_ID.includes('4枠')&&flows.TUTORIAL_ALCHEMY_FLOW_ID.includes('1体消費'),'alchemy guidance must explain four materials and catalyst consumption');
assert.ok(flows.TUTORIAL_ALCHEMY_FLOW_ID.includes('50・100・250コイン')&&flows.TUTORIAL_ALCHEMY_FLOW_ID.includes('成功率'),'alchemy guidance must explain all coin choices and success rate');
assert.ok(flows.TUTORIAL_EXPEDITION_FLOW_ID.includes('1〜3体')&&flows.TUTORIAL_EXPEDITION_FLOW_ID.includes('短距離は1勝、中距離は3勝、長距離は5勝'),'expedition guidance must explain party size and win progression');
assert.ok(flows.TUTORIAL_EXPEDITION_FLOW_ID.includes('50％'),'expedition guidance must explain early-return rewards');
assert.ok(flows.TUTORIAL_FUSION_FLOW_ID.includes('指定アイテム')&&flows.TUTORIAL_EVOLUTION_FLOW_ID.includes('必要レベル'),'evolution and fusion guidance must distinguish current requirements');
assert.ok(flows.TUTORIAL_SKILL_CARDS_FLOW_ID.includes('所持枚数')&&flows.TUTORIAL_SKILL_GACHA_FLOW_ID.includes('100コイン')&&flows.TUTORIAL_SKILL_GACHA_FLOW_ID.includes('900コイン'),'skill guidance must explain finite cards and current gacha prices');
assert.ok(flows.TUTORIAL_GOLDEN_LAND_FLOW_ID.includes('出発した時に地図を1枚消費'),'Golden Land guidance must explain map consumption timing');
assert.ok(flows.TUTORIAL_DEX_FLOW_ID.includes('モンスター、キャラクター、マップ、アイテム'),'dex guidance must explain all four records');
assert.ok(flows.TUTORIAL_SHOP_ITEMS_FLOW_ID.includes('回復薬、強化薬、契約書')&&flows.TUTORIAL_BATTLE_ITEMS_FLOW_ID.includes('勝利後の契約'),'shop and item guidance must distinguish item use locations');
assert.ok(flows.TUTORIAL_CONTRACTOR_RANK_FLOW_ID.includes('モンスターのレベルとは別')&&flows.TUTORIAL_CONTRACTOR_TITLES_FLOW_ID.includes('能力補正はありません'),'Rank and title guidance must explain progression and cosmetic-only titles');

const screenGuideSlice=tutorial.slice(tutorial.indexOf('function tutorialFeatureGuideForScreen'),tutorial.indexOf('function tutorialFirstHuntIsPending'));
[
  "alchemy:['alchemy'","expedition:['expedition'","fusion:['evolutionFusion'","evolution:['evolutionFusion'",
  "skillEdit:['skillCards'","skillGacha:['skillCards'","dexHub:['dex'","shop:['shopItems'",
  "battleItemSelect:['shopItems'","contractorRank:['contractorRank'","contractorTitles:['contractorRank'"
].forEach(mapping=>assert.ok(screenGuideSlice.includes(mapping),`missing first-screen guide mapping: ${mapping}`));
assert.ok(screenGuideSlice.includes('if(tutorialUiState.active){setTimeout(renderTutorialStep,0);return;}'),'feature guides must not interrupt an active guide');
assert.ok(battleFlow.includes("data-tutorial-golden-land")&&battleFlow.includes("setTimeout(offerGoldenLandTutorialGuide,0)"),'Golden Land guidance must trigger only after a real choice is rendered');

assert.match(data,/id:'low', amount:50, bonus:-10/,'the 50-coin alchemy option changed');
assert.match(data,/id:'standard', amount:100, bonus:0/,'the 100-coin alchemy option changed');
assert.match(data,/id:'high', amount:250, bonus:15/,'the 250-coin alchemy option changed');
assert.ok(alchemy.includes('必須・1体消費')&&alchemy.includes('plan.selection.materialIds.forEach'),'alchemy must still consume the catalyst and selected materials');
assert.match(expedition,/short:Object\.freeze\(\{id:'short',label:'短距離',wins:1/,'short expedition wins changed');
assert.match(expedition,/medium:Object\.freeze\(\{id:'medium',label:'中距離',wins:3/,'medium expedition wins changed');
assert.match(expedition,/long:Object\.freeze\(\{id:'long',label:'長距離',wins:5/,'long expedition wins changed');
assert.ok(expedition.includes('memberUids.length>=1&&entry.memberUids.length<=3')&&expedition.includes('factor=(entry.progress/entry.requiredWins)*.5'),'expedition party size or recall factor changed');
assert.ok(progression.includes('function getEvoCandidates')&&progression.includes('save.items[r.item] -= r.count'),'evolution and fusion must retain existing requirements and consumption');
assert.ok(skills.includes('availableSkillCount')&&skills.includes("if (arr.length >= 3)"),'skill cards must remain finite and limited to three equipped moves');
assert.match(skillGacha,/SKILL_GACHA_SINGLE_COST = 100/,'single skill-gacha cost changed');
assert.match(skillGacha,/SKILL_GACHA_TEN_COST = 900/,'ten-pull skill-gacha cost changed');
assert.ok(state.includes('consumeReservedGoldenLandMap')&&battleFlow.includes('if (activeHuntRequest.goldenLandMapEntry)'),'Golden Land maps must still be consumed on departure');
assert.ok(ui.includes('装備しても戦闘能力や利用できる機能は変わりません。')&&index.includes('称号による能力補正はありません。'),'titles must remain cosmetic only');
assert.ok(notices.includes("id: '20260829-tutorial-growth-collection-guides'"),'the player-facing update must have a stable notice ID');
assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1')&&index.includes('tutorial-action-guidance-1'),'changed browser scripts must have refreshed cache keys');

console.log('Tutorial Phase 5B validation passed (eight persisted guide families, current rules, first-use routing, and no gameplay-rule changes).');
