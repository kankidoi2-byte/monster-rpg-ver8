import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const saveSource=read('js/save.js');
const state=read('js/state.js');
const multi=read('js/multi-battle.js');
const battleView=read('js/battle-view.js');
const kokoro=read('js/kokoro-link.js');
const notices=read('js/notices-data.js');

assert.match(saveSource,/const SAVE_KEY = 'mb_v95c'/,'the established save key must not change');
['threeWay','invasion','kokoroLink'].forEach(id=>assert.ok(saveSource.includes(`'${id}'`),`missing persisted guide flag: ${id}`));

const flowSlice=(constant,nextConstant)=>{
  const start=tutorial.indexOf(`registerTutorialFlow(${constant}`);
  const end=nextConstant?tutorial.indexOf(`registerTutorialFlow(${nextConstant}`,start):tutorial.indexOf("document.addEventListener('click'",start);
  assert.ok(start>=0&&end>start,`missing feature guide flow: ${constant}`);
  return tutorial.slice(start,end);
};
const threeWayFlow=flowSlice('TUTORIAL_THREE_WAY_FLOW_ID','TUTORIAL_INVASION_FLOW_ID');
const invasionFlow=flowSlice('TUTORIAL_INVASION_FLOW_ID','TUTORIAL_KOKORO_LINK_FLOW_ID');
const kokoroFlow=flowSlice('TUTORIAL_KOKORO_LINK_FLOW_ID',null);
const stepCount=source=>(source.match(/\{id:'/g)||[]).length;
assert.equal(stepCount(threeWayFlow),3,'the three-way guide must remain within 1–3 screens');
assert.equal(stepCount(invasionFlow),2,'the invasion guide must remain within 1–3 screens');
assert.equal(stepCount(kokoroFlow),2,'the Kokoro Link guide must remain within 1–3 screens');

assert.ok(threeWayFlow.includes('敵同士も攻撃します'),'the three-way guide must explain enemy-versus-enemy attacks');
assert.ok(threeWayFlow.includes('技を選んだあと')&&threeWayFlow.includes('攻撃対象を決めます'),'the three-way guide must explain target selection after choosing a move');
assert.ok(threeWayFlow.includes('もう一方の敵に倒された相手とは契約できません'),'the three-way guide must explain the contract-candidate exclusion');
assert.ok(invasionFlow.includes('2〜4ターン目')&&invasionFlow.includes('このターンは行動しません'),'the invasion guide must explain timing and its no-action arrival turn');
assert.ok(kokoroFlow.includes('控えモンスター1体')&&kokoroFlow.includes('ターンは消費しません'),'the Kokoro Link guide must explain its source and free activation');
assert.ok(kokoroFlow.includes('1戦につき1回')&&kokoroFlow.includes('戦闘終了まで続きます'),'the Kokoro Link guide must explain use and duration');

const helperStart=tutorial.indexOf('function tutorialFlowSteps');
const helperEnd=tutorial.indexOf('function activeScreenId',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'the feature-guide gate must be present');
const context=vm.createContext({
  tutorialFlows:new Map([['guide',[{id:'one'}]]]),
  tutorialUiState:{active:false},
  state:{guides:{threeWay:false,invasion:false,kokoroLink:false}},
  saveOk:true,saveCalls:0,startCalls:0,
  currentTutorialState:()=>context.state,
  markTutorialGuideSeen:id=>{if(!(id in context.state.guides)||context.state.guides[id])return false;context.state.guides[id]=true;return true;},
  saveGame:()=>{context.saveCalls++;if(!context.saveOk)context.state={...context.state,guides:{...context.state.guides}};return context.saveOk;},
  startTutorialFlow:(flowId,options)=>{context.startCalls++;context.lastStart={flowId,options};return true;}
});
vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
const evaluate=expression=>vm.runInContext(expression,context);
assert.equal(evaluate("startTutorialFeatureGuide('threeWay','guide')"),true,'the first encounter must display the guide');
assert.equal(context.state.guides.threeWay,true,'the first display must persist its seen state');
assert.equal(context.saveCalls,1,'the seen flag must use one durable save');
assert.equal(context.startCalls,1,'the guide must start once');
assert.deepEqual(JSON.parse(JSON.stringify(context.lastStart)),{flowId:'guide',options:{persist:false}},'feature guidance must not overwrite required-tutorial progress');
assert.equal(evaluate("startTutorialFeatureGuide('threeWay','guide')"),false,'a seen guide must not repeat');
assert.equal(context.saveCalls,1,'a repeated trigger must not save again');
context.tutorialUiState.active=true;
assert.equal(evaluate("startTutorialFeatureGuide('invasion','guide')"),false,'a feature guide must not interrupt another active guide');
assert.equal(context.state.guides.invasion,false,'a blocked guide must remain eligible for its next encounter');
context.tutorialUiState.active=false;context.saveOk=false;
assert.equal(evaluate("startTutorialFeatureGuide('invasion','guide')"),false,'a failed seen-state save must not start the guide');
assert.equal(context.state.guides.invasion,false,'a failed save must restore the unread state');
assert.equal(context.startCalls,1,'a failed save must not display an unpersisted guide');

assert.match(multi,/function beginThreeWayBattle\([\s\S]*?startTutorialFeatureGuide\('threeWay',TUTORIAL_THREE_WAY_FLOW_ID\)/,'the three-way guide must trigger after the real battle starts');
assert.match(multi,/function triggerInvasionIfDue\([\s\S]*?busy = false;\s*if\(typeof startTutorialFeatureGuide==='function'\)startTutorialFeatureGuide\('invasion',TUTORIAL_INVASION_FLOW_ID\)/,'the invasion guide must trigger after the invader arrives');
assert.ok(battleView.includes("!panel.classList.contains('hidden')&&typeof startTutorialFeatureGuide==='function'"),'the Kokoro Link guide must trigger only when its real panel opens');

assert.match(state,/const THREE_WAY_RATES = Object\.freeze\(\{easy:0, normal:\.10, hard:\.20, extreme:\.30\}\)/,'three-way rates must remain unchanged');
assert.match(state,/const INVASION_RATES = Object\.freeze\(\{easy:0, normal:\.10, hard:\.20, extreme:\.30\}\)/,'invasion rates must remain unchanged');
assert.ok(state.includes('return 2 + Math.min(2, Math.floor(randomFn() * 3))'),'invasion must still occur on turns 2–4');
assert.match(multi,/targets=\[\{kind:'player'[\s\S]*?\.filter\(entry=>entry\.id!==actor\.id\)/,'enemies must still be able to attack one another');
assert.ok(multi.includes('entry.defeatedByPlayer&&isContractableUnit(entry.mon)'),'only player-defeated enemies may remain contract candidates');
assert.ok(multi.includes('multiBattle.enemies.map(entry=>grantMultiEnemyReward(entry,turnBonus))')&&multi.includes('報酬2体分'),'multi-battle rewards must remain the existing two-enemy rewards');
assert.ok(kokoro.includes('kokoroLinkBattleState.usedSourceUids.add(uid)')&&kokoro.includes('linksByTargetUid.set(targetUid,link)'),'Kokoro Link use and battle-lifetime state must remain in the existing engine');
assert.ok(notices.includes("id: '20260829-tutorial-battle-feature-guides'"),'the player-facing update must have a stable notice ID');

console.log('Tutorial Phase 5A validation passed (one-time persisted guides, three-way rules, invasion timing, Kokoro Link use, and unchanged battle contracts).');
