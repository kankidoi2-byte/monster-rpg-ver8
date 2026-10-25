import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const names=new Set(['tutorialMonsterInLineage','tutorialOwnedStarterInstance','tutorialInitialPartyReady','tutorialElnaContractInstance','tutorialStellaSkillTargetInstance','tutorialBattlePartyInstances','tutorialExpeditionPartyReady','tutorialExpeditionCandidateInstance','commitTutorialExpeditionDispatch','tutorialSkipRewardInstance','commitTutorialFullSkip']);
const helpers=parse(tutorial,{ecmaVersion:'latest'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.has(n.id.name)).map(n=>tutorial.slice(n.start,n.end)).join('\n');
const c=vm.createContext({console:{error(){}},save:null,saveSucceeds:true});
vm.runInContext(read('js/data.js'),c);
vm.runInContext(`
const TUTORIAL_STARTER_CONTRACT_IDS=['freigal','aquaron'];
const TUTORIAL_STELLA_SKILL_ID='s110_041';
const SKILL_BY_ID={s110_041:{id:'s110_041'}};
const TUTORIAL_LUMINA_ALCHEMY={resultId:'galdra'};
const TUTORIAL_REQUIRED_SKIP_FLAGS=['starterContractsGranted','elnaContractGranted','stellaSkillCardGranted','alchemySuppliesGranted','alchemyLessonPrepared','alchemyLessonCompleted','expeditionDispatched','prologueCompleted'];
const tutorialBattleSession={active:true,kind:'stella_mock',enemyQueue:[]};
function by(id){return M.find(x=>x.id===id)}
function getInstance(uid){return save.instances.find(x=>x.uid===uid)}
function getPartyInstances(){return save.party.map(getInstance)}
function expeditionAvailableInstances(){return save.instances.filter(x=>!save.party.includes(x.uid)&&!save.expeditions.active.some(e=>e.memberUids.includes(x.uid)))}
function currentTutorialState(){return save.progress.tutorial}
function tutorialCurrentStepId(){return currentTutorialState().stepId}
function setTutorialStep(id){currentTutorialState().stepId=id}
function markTutorialOnce(key){currentTutorialState()[key]=true;return true}
function markTutorialExpeditionDispatched(){return markTutorialOnce('expeditionDispatched')}
function setTutorialElnaGuestActive(value){currentTutorialState().elnaGuestActive=value}
function skipTutorial(){currentTutorialState().skipped=true}
function saveGame(){return saveSucceeds}
function addInstance(id,level,exp,extra){const unit={uid:'added-'+save.instances.length,id,level,exp,...extra};save.instances.push(unit);return unit}
${helpers}`,c);
const run=s=>vm.runInContext(s,c),plain=x=>JSON.parse(JSON.stringify(x));
let count=0;
for(const f of ['freigal','freiwolf'])for(const a of ['aquaron','highaquaron','shenhairon','tienhairon'])for(const e of ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen']){
 c.save={instances:[{uid:'f',id:f},{uid:'a',id:a},{uid:'e',id:e,tutorialRole:'contract_body'},{uid:'g',id:'galdra'}],party:['f','a','e'],expeditions:{active:[]},progress:{tutorial:{stepId:'expedition_dispatch'}}};
 assert.equal(run('tutorialInitialPartyReady()'),true,[f,a,e].join('/'));
 assert.equal(run('tutorialStellaSkillTargetInstance().uid'),'e');
 run("tutorialBattleSession.active=true;tutorialBattleSession.kind='stella_mock'");
 assert.deepEqual(plain(run('tutorialBattlePartyInstances().map(x=>x.uid)')),['f','a','e']);
 c.save.party=['g','a','e'];assert.equal(run('tutorialExpeditionPartyReady()'),true);
 assert.equal(run('tutorialExpeditionCandidateInstance().uid'),'f');
 assert.equal(run("commitTutorialExpeditionDispatch({mapId:'grassland',distanceId:'long',memberUids:['f']})"),false);
 assert.equal(run("commitTutorialExpeditionDispatch({mapId:'grassland',distanceId:'short',memberUids:['a']})"),false);
 assert.equal(run("commitTutorialExpeditionDispatch({mapId:'grassland',distanceId:'short',memberUids:['f']})"),true);
 c.save=plain(c.save); // Persisted identity must work after deserialization.
 assert.equal(run('tutorialExpeditionPartyReady()'),true);
 c.saveSucceeds=false;const before=JSON.stringify(c.save);
 assert.equal(run('commitTutorialFullSkip()'),false);assert.equal(JSON.stringify(c.save),before);
 c.saveSucceeds=true;assert.equal(run('commitTutorialFullSkip()'),true);
 assert.deepEqual(plain(c.save.instances.map(x=>x.id)),[f,a,e,'galdra']);
 const once=JSON.stringify(c.save);assert.equal(run('commitTutorialFullSkip()'),true);assert.equal(JSON.stringify(c.save),once);
 count++;
}
c.save.instances[0].id='slime';assert.equal(run('tutorialExpeditionPartyReady()'),false);assert.equal(run('tutorialExpeditionCandidateInstance()'),null);
c.save.instances[0].id='freiwolf';c.save.party=['g','f','e'];assert.equal(run('tutorialExpeditionPartyReady()'),false);
c.save.instances.push({uid:'guest',id:'elna_beginner',guest:true,tutorialRole:'contract_body'});assert.equal(run('tutorialElnaContractInstance().uid'),'e');
console.log('PASS '+count+' evolution combinations: initial/mock/final party, dispatch validation, reload, skip rollback/idempotence, unrelated units and guests.');
