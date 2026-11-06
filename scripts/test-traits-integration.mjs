import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(import.meta.url)('jsdom');
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'http://traits.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,ctx=dom.getInternalVMContext(),run=s=>vm.runInContext(s,ctx);
w.structuredClone=structuredClone;w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
run(`Math.random=()=>0;playBattleSkillMotion=async()=>false;playBattleImpact=()=>{};battleMotionDelay=async()=>{};
var observedOutcome=null;const originalOutcome=showBattleOutcome;showBattleOutcome=x=>{observedOutcome=x;originalOutcome(x);};
save=initSave();ensureTutorialStarterContracts();`);
assert.equal(run('startTutorialRescueBattle()'),true);
assert.equal(run("typeof traitDamageMultiplier"),'function');
assert.ok(run('partyBattle.some(p=>traitsForSpecies(p.inst).length>0)'),'real tutorial companions carry production traits');
for(let i=0;i<100&&!run('observedOutcome');i++){
 await run('turn(-1)');
 for(let n=0;n<100&&run('busy&&!observedOutcome');n++)await new Promise(r=>setTimeout(r,5));
}
assert.equal(run('observedOutcome?.kind'),'victory','real prologue rescue waves resolve to victory');
assert.equal(run('tutorialBattleSession.enemyQueue.length'),0);
// Same-species enemy must not inherit player-only first-strike. Compare the real
// resolver with traitDamageMultiplier bypassed; production definitions stay intact.
run(`clearTutorialUi();tutorialBattleSession.active=false;activeHuntRequest={enemyLevel:40,difficultyId:'d1',conditionIds:[]};multiBattle=null;
a=addInstance('voltax',40);activeInstance=a;player=by('voltax');enemy=by('voltax');playerLevel=40;enemyLevel=40;
partyBattle=[{inst:a,mon:player,hp:99999}];activePartyIdx=0;pHp=99999;eHp=99999;pAtk=eAtk=1;pGuard=eGuard=false;
pStatus=eStatus=null;pPoisonTurns=ePoisonTurns=pParalysisTurns=eParalysisTurns=pConfusionTurns=eConfusionTurns=pSleepTurns=eSleepTurns=0;
resetBattleTransientEffects();resetBattleTurnCounter();resetTraitBattleState();pHp=playerMaxHp();eHp=enemyMaxHp();var hpStart=pHp;`);
await run("doAttack(enemy,player,['通常攻撃',24,'normal',null,null,0],false)");
const enemyWith=run('hpStart-pHp');
run('pHp=hpStart;resetBattleTransientEffects();resetTraitBattleState();var originalTraitDamage=traitDamageMultiplier;traitDamageMultiplier=()=>1');
await run("doAttack(enemy,player,['通常攻撃',24,'normal',null,null,0],false)");
assert.equal(run('hpStart-pHp'),enemyWith,'enemy voltax does not receive its first-strike trait');
run('traitDamageMultiplier=originalTraitDamage;eHp=enemyMaxHp();resetTraitBattleState();var enemyStart=eHp');
await run("doAttack(player,enemy,['通常攻撃',24,'normal',null,null,0],true)");
const playerWith=run('enemyStart-eHp');
run('eHp=enemyStart;resetTraitBattleState();traitDamageMultiplier=()=>1');
await run("doAttack(player,enemy,['通常攻撃',24,'normal',null,null,0],true)");
assert.ok(playerWith>run('enemyStart-eHp'),'same species player receives production first-strike');
assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
console.log('PASS traits integration: production prologue rescue victory, both waves, actual resolver player/enemy same-species isolation');
