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
  kokoroLinkForesightTextForTarget
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
assert.equal(api.resolveKokoroLink(monster('water'),{uid:'water'},targetStats).tacticsAbility.deferred,true,'cost reduction must remain deferred');
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
assert.equal(penetratedMultiplier(.5,.2),.7,'penetration must remove 20 percentage points of resistance');
assert.equal(penetratedMultiplier(.9,.2),1,'penetration must not exceed neutral effectiveness');
assert.equal(penetratedMultiplier(1.5,.2),1.5,'penetration must not alter weakness multipliers');
console.log('Kokoro Link Phase 4-3 tactics abilities validated (10 attributes, choice, deferral, one-shot charges, foresight, and penetration).');
