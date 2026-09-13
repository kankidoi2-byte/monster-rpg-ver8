import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
const r=runtime(),run=r.run;
const originalGet=r.context.document.getElementById;
function node(){return {children:[],_html:'',_text:'',get innerHTML(){return this._html},set innerHTML(v){this._html=String(v);this._text=String(v).replace(/<[^>]*>/g,'')},get textContent(){return this._text},set textContent(v){this._text=v},appendChild(child){this.children.push(child);child.remove=()=>this.children.splice(this.children.indexOf(child),1)},replaceChildren(){this.children=[]},get firstElementChild(){return this.children[0]},querySelector(){return null}};}
r.context.document.createElement=node;
r.context.document.getElementById=id=>{
 const el=originalGet(id);if(!el.children)Object.assign(el,{children:[],querySelector(){return null},appendChild:node().appendChild,replaceChildren:node().replaceChildren});
 return el;
};
run(fs.readFileSync(new URL('../js/battle-feedback.js',import.meta.url),'utf8'));
run(`renderBattleInputState=()=>{};renderBattleHpResults=()=>{};`);
const setup=`save=initSave();save.instances=[];save.party=[];const ins=addInstance('freigal',10);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';beginChosenBattle('grassland','slime','normal',activeHuntRequest);refreshBattleFeedback();`;
run(`function setup(){${setup}};setup();`);
const history=()=>JSON.parse(run('JSON.stringify(battleFeedback.history)'));
run('pHp=playerMaxHp()-3;refreshBattleFeedback()');
await run(`performAction(player,enemy,['回復',0,'normal','heal'],true)`);
assert(history().some(e=>/回復 \+3/.test(e.text)),'capped healing must display actual +3');
run('setup()');r.context.Math.random=()=>0;
await run(`performAction(player,enemy,['連撃',12,'normal','repeat_attack',1],true)`);
const hits=history().filter(e=>e.kind==='hp'&&e.text.startsWith('スライム'));
assert.equal(hits.length,2);assert.match(hits[1].text,/追加攻撃/);
assert.equal(run('enemyMaxHp()-eHp'),hits.reduce((n,e)=>n+Number(e.text.match(/−(\d+)/)[1]),0));
run('setup();eHp=1;refreshBattleFeedback()');
await run(`performAction(player,enemy,['攻撃',40,'normal'],true)`);
assert(history().some(e=>/被弾 −1.*超過/.test(e.text)),'overkill separate from HP lost');
run('setup();pStatus="poison";pPoisonTurns=1;pHp=2;refreshBattleFeedback();applyPoisonEndTurn()');
assert.equal(run('pHp'),0);assert.equal(run('pStatus'),null);assert(history().some(e=>/毒 −2/.test(e.text)));
run('setup()');await run(`performAction(player,enemy,['反動技',12,'normal','recoil'],true)`);
assert(history().some(e=>/反動 −8/.test(e.text)));
run('setup();pSleepTurns=1;refreshBattleFeedback()');await run(`performAction(player,enemy,['攻撃',12,'normal'],true)`);
assert.equal(run('pSleepTurns'),0);assert(history().some(e=>/動けない/.test(e.text)));
run('setup();pGuard=true;pAquaShield=true;pAtk=1.5;refreshBattleFeedback()');
assert.match(run('battleStateLabels(battleCombatants()[0]).join(" ")'),/防御.*水の盾.*攻撃 ×1.5/);
// Identical messages across distinct actions are retained.
run(`setup();beginBattleAction(player,['防御'],true);document.getElementById('log').innerHTML='身を守った';captureBattleLog();beginBattleAction(player,['防御'],true);document.getElementById('log').innerHTML='身を守った';captureBattleLog();`);
assert.equal(history().filter(e=>e.text==='身を守った').length,2);
// Compare actual rule outcomes and random draws with the production baseline.
const {execFileSync}=await import('node:child_process');
const baseline=runtime(Object.fromEntries(['battle-rules','battle-flow','multi-battle','battle-view','items'].map(file=>[file,()=>execFileSync('git',['show',`4f3d5d5c488d4dd44da9b2bab30a56ab45663323:js/${file}.js`],{encoding:'utf8',maxBuffer:5e6})])));
for(const effect of [null,'repeat_attack','drain','recoil','alchemy_recoil','poison','paralysis','confusion','guard','heal','buff','aqua_shield']){
 const seed=912;const a=seeded(seed),b=seeded(seed);let drawsA=0,drawsB=0;
 baseline.run(`function setup(){${setup.replace('refreshBattleFeedback();','')}};setup();pHp=70;eHp=60;pGuard=true;eGuard=true;pAquaShield=true;eAquaShield=true;`);
 run('setup();pHp=70;eHp=60;pGuard=true;eGuard=true;pAquaShield=true;eAquaShield=true;refreshBattleFeedback()');
 baseline.context.Math.random=()=>{drawsA++;return a()};r.context.Math.random=()=>{drawsB++;return b()};
 const move=JSON.stringify(['検証', ['guard','heal','buff','aqua_shield'].includes(effect)?0:24,'normal',effect,1]);
 await baseline.run(`doAttack(player,enemy,${move},true)`);await run(`doAttack(player,enemy,${move},true)`);
 const state='JSON.stringify([pHp,eHp,pAtk,eAtk,pGuard,eGuard,pStatus,eStatus,pPoisonTurns,ePoisonTurns,eParalysisTurns,eConfusionTurns,pAquaShield,eAquaShield])';
 assert.equal(run(state),baseline.run(state),effect||'normal');assert.equal(drawsA,drawsB,'random draw count');
}
console.log('Battle readability: actual HP, repeat hit, overkill, poison, recoil, status expiry, repeated history and 13 baseline rule/RNG comparisons passed. DOM/layout checked separately in browser.');
