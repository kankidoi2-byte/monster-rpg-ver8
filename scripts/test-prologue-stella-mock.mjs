import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const skills=read('js/skills.js');
const rules=read('js/battle-rules.js');
const flow=read('js/battle-flow.js');
const index=read('index.html');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
const steps=[
  'stella_mock_battle','stella_mock_enemy','stella_mock_actor','stella_mock_skill_open',
  'stella_mock_advantage','stella_mock_free','stella_mock_victory','stella_mock_retry','lumina_intro'
];
let previous=-1;
for(const id of steps){
  const at=main.indexOf(`id:'${id}'`);
  assert.ok(at>previous,`Stella mock STEP is missing or out of order: ${id}`);
  previous=at;
}
const mockFlow=main.slice(main.indexOf("id:'stella_mock_battle'"),main.indexOf("id:'first_hunt'"));
assert.ok(!mockFlow.includes('カナタ'),'Kanata must not appear in the prologue mock battle');
assert.match(mockFlow,/id:'stella_mock_battle'[^\n]+transition:'start_stella_mock_battle'[^\n]+nextStepId:'stella_mock_enemy'/);
assert.match(mockFlow,/id:'stella_mock_skill_open'[^\n]+externalAdvance:true[^\n]+persistAs:'stella_mock_battle'/);
assert.match(mockFlow,/id:'stella_mock_advantage'[^\n]+data-tutorial-stella-advantage[^\n]+externalAdvance:true[^\n]+persistAs:'stella_mock_battle'/);
assert.match(mockFlow,/id:'stella_mock_free'[^\n]+persistAs:'stella_mock_battle'[^\n]+waitForEvent:'battle_outcome'/);
assert.match(mockFlow,/id:'stella_mock_retry'[^\n]+nextStepId:'stella_mock_battle'[^\n]+persistAs:'stella_mock_battle'/);
assert.match(mockFlow,/id:'lumina_intro'[^\n]+persistAs:'lumina_intro'[^\n]+scene:'workshop'/);
for(const id of ['stella_mock_enemy','stella_mock_actor','stella_mock_skill_open','stella_mock_advantage','stella_mock_free']){
  assert.match(mockFlow,new RegExp(`id:'${id}'[^\\n]+persistAs:'stella_mock_battle'`),`interruption must resume from the mock battle checkpoint: ${id}`);
}

assert.ok(tutorial.includes("TUTORIAL_STELLA_MOCK=Object.freeze({mapId:'grassland',enemyId:'grassbeat',difficultyId:'easy',actorId:'freigal'})"));
assert.ok(tutorial.includes("request.tutorialStellaMock=true"),'the mock request needs a stable non-reward identity');
assert.ok(tutorial.includes("tutorialBattleSession.kind='stella_mock'")&&tutorial.includes("tutorialBattleSession.advantageUsed=false"));
assert.ok(tutorial.includes("tutorialMonsterInLineage(player?.id,TUTORIAL_STELLA_MOCK.actorId)")&&tutorial.includes("enemy?.id===TUTORIAL_STELLA_MOCK.enemyId"),'the real battle must start with the Freigal lineage against Grassbeat');
assert.ok(tutorial.includes("if(tutorialBattleSession.kind==='stella_mock')")&&tutorial.includes('tutorialElnaContractInstance()'),'the mock party must use owned contract bodies, not the Elna guest');

const advantageStart=tutorial.indexOf('function isTutorialStellaMockAdvantageMove');
const advantageEnd=tutorial.indexOf('function completeTutorialStellaMockVictory',advantageStart);
assert.ok(advantageStart>=0&&advantageEnd>advantageStart);
const context=vm.createContext({
  tutorialBattleSession:{active:true,kind:'stella_mock'},
  TUTORIAL_STELLA_MOCK:{actorId:'freigal',enemyId:'grassbeat'},
  moveTypes:move=>Array.isArray(move[2])?move[2]:[move[2]],
  typeEff:(types,defense)=>types.includes('fire')&&defense.includes('grass')?1.5:1,
  activeInstance:{id:'freigal'},enemy:{id:'grassbeat',types:['grass']},
  by:id=>({freigal:{id:'freigal',evolution:'freiwolf'},freiwolf:{id:'freiwolf'},aquaron:{id:'aquaron'}})[id]||null
});
context.isTutorialStellaMockBattleActive=()=>context.tutorialBattleSession.active&&context.tutorialBattleSession.kind==='stella_mock';
const lineageStart=tutorial.indexOf('function tutorialMonsterInLineage');
const lineageEnd=tutorial.indexOf('function tutorialInitialPartyReady',lineageStart);
vm.runInContext(tutorial.slice(lineageStart,lineageEnd),context);
vm.runInContext(tutorial.slice(advantageStart,advantageEnd),context);
assert.equal(vm.runInContext("isTutorialStellaMockAdvantageMove(['火炎牙',28,'fire'])",context),true);
assert.equal(vm.runInContext("isTutorialStellaMockAdvantageMove(['炎狼牙',36,'fire'],{id:'freiwolf'},enemy)",context),true,'evolved Freigal must satisfy the advantage lesson');
assert.equal(vm.runInContext("isTutorialStellaMockAdvantageMove(['通常攻撃',24,'normal'])",context),false);
assert.equal(vm.runInContext("isTutorialStellaMockAdvantageMove(['火炎牙',28,'fire'],{id:'aquaron'},enemy)",context),false);

assert.ok(skills.includes("data-tutorial-stella-advantage"),'only an actually advantageous skill must receive the spotlight target');
assert.ok(rules.includes("handleTutorialBattleAction(tutorialAction,{move:playerMove,actor:activeInstance,target:enemy})"),'the real selected move, actor, and target must be validated');
const win=flow.slice(flow.indexOf('function win()'));
assert.ok(win.indexOf('completeTutorialStellaMockVictory')<win.indexOf('if (battleRewardGranted) return;'),'mock victory must settle before normal rewards');
assert.ok(tutorial.includes("title:'属性模擬戦クリア'")&&tutorial.includes('模擬戦のため通常報酬はありません。'),'mock victory must explicitly grant no normal battle reward');
assert.ok(tutorial.includes("setTutorialStep(cleared?'lumina_intro':'stella_mock_battle')"),'victory and retry must persist different safe checkpoints');
assert.ok(tutorial.includes("resumeTutorialMainFlowAfterEvent(cleared?'stella_mock_victory':'stella_mock_retry'"),'victory, defeat, retreat, and invalid clear must route deterministically');

for(const file of ['tutorial.js','skills.js','battle-rules.js','battle-flow.js']){
  assert.ok(index.includes(`${file}?v=`)&&index.match(new RegExp(`${file.replace('.','\\.')}\\?v=[^\"']*prologue-stella-mock-1`)),`${file} cache key must refresh`);
}
assert.equal(packageJson.scripts['check:prologue-stella-mock'],'node scripts/test-prologue-stella-mock.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-stella-mock'));

console.log('Prologue Stella mock battle validation passed (real advantage action, reward-free victory, retry paths, interruption resume, and Lumina checkpoint).');
