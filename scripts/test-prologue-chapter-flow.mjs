import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js'),ui=read('js/ui.js');
const names=new Set(['tutorialDefersRankUpPresentation','recordTutorialBattleLesson','rememberTutorialBattleRetry','tutorialRetryBattleGuideStep']);
const helpers=parse(tutorial,{ecmaVersion:'latest'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.has(n.id.name)).map(n=>tutorial.slice(n.start,n.end)).join('\n');
const make=()=>vm.createContext({tutorialUiState:{active:false},tutorialRankUpWaitScreen:null,tutorialBattleLessonState:{seen:new Set(),retryKind:null},tutorialBattleSession:{active:true,kind:'elna_rescue'},activeScreenId:()=>c.screen,screen:'home'});
let c=make();vm.runInContext(helpers,c);
const run=s=>vm.runInContext(s,c);
for(const [kind,transition,first,free] of [['elna_rescue','start_elna_rescue','battle_enemy','battle_free'],['stella_mock','start_stella_mock_battle','stella_mock_enemy','stella_mock_free']]){
 c.tutorialBattleSession.kind=kind;c.step={transition};
 run("rememberTutorialBattleRetry('retreat')");
 assert.equal(run(`tutorialRetryBattleGuideStep(step,'${first}')`),first,'early retreat must retain uncompleted lessons');
 c.lesson={id:free};run('recordTutorialBattleLesson(lesson)');
 for(const outcome of ['retreat','defeat','error']){
  c.outcome=outcome;run('rememberTutorialBattleRetry(outcome)');
  assert.equal(run(`tutorialRetryBattleGuideStep(step,'${first}')`),free,'only a learned retry goes to free battle');
  assert.equal(run(`tutorialRetryBattleGuideStep(step,'${first}')`),first,'consume the shortcut once, after starting combat');
 }
 run("rememberTutorialBattleRetry('victory')");assert.equal(run(`tutorialRetryBattleGuideStep(step,'${first}')`),first);
 run("rememberTutorialBattleRetry('retreat')");assert.equal(run("tutorialRetryBattleGuideStep({transition:'prepare_lumina_alchemy'},'lumina_materials')"),'lumina_materials');
}
c=make();vm.runInContext(helpers,c);c.step={transition:'start_elna_rescue'};
assert.equal(run("tutorialRetryBattleGuideStep(step,'battle_enemy')"),'battle_enemy','fresh page/legacy save must use original explanation path');
const pending=[{fromRank:1,toRank:2}],before=JSON.stringify(pending);
c.save={contractor:{pendingRankUps:pending}};
const rank=parse(ui,{ecmaVersion:'latest'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='contractorRankUpCanPresent');
c.document={querySelector:()=>({id:c.screen}),body:{classList:{contains:()=>false}},getElementById:()=>({classList:{contains:()=>true}})};
vm.runInContext(ui.slice(rank.start,rank.end),c);
for(const [active,wait,screen,allowed] of [[true,null,'home',false],[true,null,'tutorialRequestReport',false],[false,'alchemyResult','alchemyResult',false],[false,'battle','battle',false],[false,null,'storyMode',true],[false,null,'home',true],[false,'alchemyResult','home',true]]){
 c.tutorialUiState.active=active;c.tutorialRankUpWaitScreen=wait;c.screen=screen;
 assert.equal(run('contractorRankUpCanPresent()'),allowed,`${active}/${wait}/${screen}`);
 assert.equal(JSON.stringify(pending),before,'deferral must never consume or rewrite queued notices');
}
console.log('PASS chapter flow: unseen/learned retries, one-use shortcut, victory reset, fresh-page defaults, guide/wait deferral, chapter/pause release, pending notices unchanged.');
