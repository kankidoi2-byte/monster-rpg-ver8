import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
for(const file of ['data.js','kokoro-link.js']){
  vm.runInContext(fs.readFileSync(new URL(`../js/${file}`,import.meta.url),'utf8'),context,{filename:`js/${file}`});
}

const contract=vm.runInContext(`({
  byId:id => M.find(unit => unit.id === id),
  resetKokoroLinkBattleState,
  kokoroLinkBattleSnapshot,
  activateKokoroLinkSource,
  kokoroLinkEffectForInstance,
  kokoroLinkAttackMultiplierFor,
  kokoroLinkSpeedBonusFor,
  kokoroLinkBarrierFor,
  absorbKokoroLinkDamage
})`,context);
const plain=value=>JSON.parse(JSON.stringify(value));
function entry(uid,id,hp=120){const mon=contract.byId(id);return {uid,inst:{uid,id,level:5},mon,hp,fainted:false};}

const party=[entry('target-a','freigal'),entry('source-b','aquaron'),entry('target-c','grassbeat')];
contract.resetKokoroLinkBattleState();
const targetStats={maxHp:180,speed:70};
const first=contract.activateKokoroLinkSource('source-b',party,0,targetStats);
assert.equal(first.ok,true,'a living reserve monster must activate a link');
assert(first.link.effects.barrier>0);
assert(first.link.effects.attackMultiplier>1);
assert(first.link.effects.speedBonus>0);
assert.equal(contract.kokoroLinkAttackMultiplierFor(party[0].inst),first.link.effects.attackMultiplier);
assert.equal(contract.kokoroLinkSpeedBonusFor(party[0].inst),first.link.effects.speedBonus);
assert.equal(contract.kokoroLinkBarrierFor(party[0].inst),first.link.effects.barrier);

const blocked=contract.activateKokoroLinkSource('target-c',party,0,targetStats);
assert.deepEqual(plain(blocked),{ok:false,reason:'target-linked'},'one combatant cannot receive stacked links');
assert.deepEqual(plain(contract.kokoroLinkBattleSnapshot().usedSourceUids),['source-b'],'a rejected link must not consume its source');

const incoming=first.link.effects.barrier+9;
const guarded=contract.absorbKokoroLinkDamage(party[0].inst,incoming);
assert.equal(guarded.absorbed,first.link.effects.barrier);
assert.equal(guarded.hpDamage,9);
assert.equal(contract.kokoroLinkBarrierFor(party[0].inst),0);

const second=contract.activateKokoroLinkSource('target-a',party,2,targetStats);
assert.equal(second.ok,true,'after switching, an unused reserve can link the new active monster');
assert.equal(contract.kokoroLinkEffectForInstance(party[2].inst).sourceUid,'target-a');
assert.equal(contract.kokoroLinkEffectForInstance(party[0].inst).sourceUid,'source-b','links stay bound to their original target UID');

contract.resetKokoroLinkBattleState();
assert.equal(contract.kokoroLinkEffectForInstance(party[0].inst),null);
assert.deepEqual(plain(contract.kokoroLinkBattleSnapshot()),{usedSourceUids:[],activeLinks:[]});

const indexSource=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const coreSource=fs.readFileSync(new URL('../js/core.js',import.meta.url),'utf8');
const viewSource=fs.readFileSync(new URL('../js/battle-view.js',import.meta.url),'utf8');
const rulesSource=fs.readFileSync(new URL('../js/battle-rules.js',import.meta.url),'utf8');
const multiSource=fs.readFileSync(new URL('../js/multi-battle.js',import.meta.url),'utf8');
assert(indexSource.includes('id="kokoroLinkButton"')&&indexSource.includes('id="kokoroLinkPanel"'),'battle UI must expose the link command and source panel');
assert(coreSource.includes('kokoroLinkAttackMultiplierFor')&&coreSource.includes('kokoroLinkSpeedBonusFor'),'combat stats must include link effects');
assert(viewSource.includes('activateKokoroLinkFromBattle')&&viewSource.includes('行動を消費せず発動'),'battle UI must activate links as a free subcommand');
assert(rulesSource.includes('resolvePlayerIncomingDamage'),'single battle damage must pass through the link barrier');
assert(multiSource.includes('resolvePlayerIncomingDamage')&&multiSource.includes('kokoroLinkStatusHtml'),'multi battle must share link effects and display');

console.log('Kokoro Link battle validation passed (activation UI, target binding, no stacking, attack/speed boosts, barrier absorption, switch reuse, and lifecycle reset).');
