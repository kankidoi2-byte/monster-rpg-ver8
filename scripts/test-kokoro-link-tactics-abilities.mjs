import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
vm.runInContext(fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8'),context,{filename:'js/kokoro-link.js'});
const api=vm.runInContext(`({
  resetKokoroLinkBattleState,resolveKokoroLink,activateKokoroLinkSource,kokoroLinkBattleSnapshot,
  kokoroLinkTacticsAbilityStatus,markKokoroLinkTacticsResolved,resolveKokoroLinkTacticsChoice,
  consumeKokoroLinkRecoilGuard,consumeKokoroLinkActionPriority,consumeKokoroLinkFreeSwitch,
  consumeKokoroLinkPenetration,setKokoroLinkForesight,consumeKokoroLinkForesightMove,
  kokoroLinkForesightTextForTarget,absorbKokoroLinkDamage
})`,context);
const plain=value=>JSON.parse(JSON.stringify(value));
const monster=type=>({id:type,name:type,entityKind:'monster',rarity:'★★★',types:[type],moves:[['技',40,type]]});
const types=['normal','fire','water','grass','thunder','wind','light','dark','star','dragon'];
const targetStats={maxHp:200,speed:100};

for(const type of types){
  const resolved=api.resolveKokoroLink(monster(type),{uid:`source-${type}`,level:99},targetStats);
  assert(resolved.tacticsAbility,`${type} must have a three-star tactics ability`);
  assert.equal(resolved.powerAbility,null);assert.equal(resolved.statusAbility,null);
}
assert.deepEqual(plain(api.resolveKokoroLink(monster('water'),{uid:'water'},targetStats).tacticsAbility),{
  id:'water_mirror_guard',label:'水鏡の護り',summary:'次に受ける直接ダメージを30%軽減（1回）',charges:1,reductionRate:.3,resolved:false,selectedOption:null
});
assert.equal(api.resolveKokoroLink(monster('normal'),{uid:'normal'},targetStats).tacticsAbility.options.find(option=>option.id==='cost_reduction').deferred,true);

const activate=type=>{
  api.resetKokoroLinkBattleState();
  const active={uid:`target-${type}`,hp:100,mon:{...monster('normal'),rarity:'★★★★★'},inst:{uid:`target-${type}`,level:1}};
  const source={uid:`source-${type}`,hp:100,mon:monster(type),inst:{uid:`source-${type}`,level:1}};
  const result=api.activateKokoroLinkSource(source.uid,[active,source],0,targetStats);assert.equal(result.ok,true);
  return {instance:active.inst,link:result.link};
};

{
  const {instance}=activate('normal');
  assert.deepEqual(plain(api.resolveKokoroLinkTacticsChoice(instance,'small_heal')),{resolved:true,option:{id:'small_heal',label:'小回復',summary:'最大HP10%回復'}});
  assert.equal(api.resolveKokoroLinkTacticsChoice(instance,'cleanse').resolved,false,'origin choice must resolve once');
}
{
  const {instance,link}=activate('fire');api.markKokoroLinkTacticsResolved(link);
  assert.equal(api.consumeKokoroLinkRecoilGuard(instance),true);assert.equal(api.consumeKokoroLinkRecoilGuard(instance),false);
}
{
  const {instance,link}=activate('water');link.barrierRemaining=20;api.markKokoroLinkTacticsResolved(link);
  const first=api.absorbKokoroLinkDamage(instance,100);
  assert.equal(first.reduced,30);assert.equal(first.absorbed,20);assert.equal(first.hpDamage,50);assert.equal(first.reductionLabel,'水鏡の護り');
  const second=api.absorbKokoroLinkDamage(instance,100);
  assert.equal(second.reduced,0);assert.equal(second.hpDamage,100);
  assert.match(api.kokoroLinkTacticsAbilityStatus(instance),/使用済み/);
}
{
  const {instance,link}=activate('thunder');api.markKokoroLinkTacticsResolved(link);
  assert.equal(api.consumeKokoroLinkActionPriority(instance),true);assert.equal(api.consumeKokoroLinkActionPriority(instance),false);
}
{
  const {instance,link}=activate('wind');api.markKokoroLinkTacticsResolved(link);
  assert.equal(api.consumeKokoroLinkFreeSwitch(instance),true);assert.equal(api.consumeKokoroLinkFreeSwitch(instance),false);
}
{
  const {instance,link}=activate('dragon');api.markKokoroLinkTacticsResolved(link);
  assert.deepEqual(plain(api.consumeKokoroLinkPenetration(instance,0)),{rate:0,penetrated:false});
  assert.deepEqual(plain(api.consumeKokoroLinkPenetration(instance,40)),{rate:.2,penetrated:true});
  assert.equal(api.consumeKokoroLinkPenetration(instance,40).penetrated,false);
}
{
  const {instance,link}=activate('star'),move=['星弾',40,'star'];
  assert.equal(api.setKokoroLinkForesight(link,'enemy-a',move),true);
  assert.equal(api.kokoroLinkForesightTextForTarget('enemy-a'),'🔮予知：星弾');
  assert.deepEqual(plain(api.consumeKokoroLinkForesightMove('enemy-a')),move);
  assert.equal(api.consumeKokoroLinkForesightMove('enemy-a'),null);
  assert.match(api.kokoroLinkTacticsAbilityStatus(instance),/使用済み/);
}

const snapshot=api.kokoroLinkBattleSnapshot();
assert(snapshot.activeLinks[0].tacticsAbility,'battle snapshot must include tactics ability state');

const battleContext=vm.createContext({console,Math,document:{querySelector:()=>true}});
vm.runInContext(fs.readFileSync(new URL('../js/battle-rules.js',import.meta.url),'utf8'),battleContext,{filename:'js/battle-rules.js'});
const penetratedMultiplier=vm.runInContext('kokoroLinkPenetratedMultiplier',battleContext);
const defenseMessage=vm.runInContext('kokoroLinkDefenseMessage',battleContext);
assert.equal(penetratedMultiplier(.5,.2),.7,'penetration must remove 20 percentage points of resistance');
assert.equal(penetratedMultiplier(.9,.2),1,'penetration must not exceed neutral effectiveness');
assert.equal(penetratedMultiplier(1.5,.2),1.5,'penetration must not alter weakness multipliers');
assert.equal(defenseMessage({reduced:30,reductionLabel:'水鏡の護り',absorbed:0,evaded:false}),'✨ 水鏡の護りが30ダメージを軽減！');
console.log('Kokoro Link tactics abilities validated (10 attributes, choice, water guard, one-shot charges, foresight, and penetration).');
