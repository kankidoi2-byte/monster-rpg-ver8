import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math,document:{addEventListener(){},getElementById(){return null}},window:{addEventListener(){}}});
for(const file of ['data.js','kokoro-link.js','tutorial.js']){
  vm.runInContext(fs.readFileSync(new URL(`../js/${file}`,import.meta.url),'utf8'),context,{filename:`js/${file}`});
}

const contract=vm.runInContext(`({
  byId:id => M.find(unit => unit.id === id),
  resetKokoroLinkBattleState,
  kokoroLinkBattleSnapshot,
  activateKokoroLinkSource,
  listKokoroLinkSources,
  tutorialElnaGuestInstance,
  tutorialReplayContractInstance,
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
assert.deepEqual(plain(contract.kokoroLinkBattleSnapshot()),{usedSourceUids:[],activeLinks:[],enemyEffects:[]});

// Canonical character templates and the exact temporary instances from the walkthrough.
const ownedElna=entry('owned-elna','elna_beginner');
Object.assign(ownedElna.inst,{tutorialContract:true,tutorialRole:'contract_body',locked:true});
const guestElna=contract.tutorialElnaGuestInstance();
const replayMonster=contract.tutorialReplayContractInstance('freigal',0);
const asEntry=inst=>({uid:inst.uid,inst,mon:contract.byId(inst.id),hp:120,fainted:false});
assert.equal(guestElna.id,ownedElna.inst.id);
assert.equal(guestElna.guest,true);
assert.equal(replayMonster.guest,true);
const monster=entry('monster','aquaron');
const secondCharacter=entry('other-char','elna_middle');
for(const [from,to] of [[ownedElna,monster],[monster,ownedElna],[ownedElna,secondCharacter]]){
  contract.resetKokoroLinkBattleState();
  const party=[to,from,entry('unused','grassbeat')];
  const activated=contract.activateKokoroLinkSource(from.uid,party,0,targetStats);
  assert.equal(activated.ok,true,`${from.inst.id} → ${to.inst.id}`);
  assert.equal(activated.link.profile.monsterId,from.inst.id);
  assert.equal(activated.link.targetUid,to.uid);
  assert.equal(contract.activateKokoroLinkSource('unused',party,0,targetStats).reason,'target-linked');
  assert.equal(contract.activateKokoroLinkSource(from.uid,party,2,targetStats).reason,'invalid-source');
  assert.deepEqual(plain(contract.kokoroLinkBattleSnapshot().usedSourceUids),[from.uid]);
}
for(const guest of [asEntry(guestElna),asEntry(replayMonster)]){
  contract.resetKokoroLinkBattleState();
  assert.deepEqual(plain(contract.listKokoroLinkSources([monster,guest,ownedElna],0)).map(source=>source.uid),[ownedElna.uid]);
  assert.equal(contract.activateKokoroLinkSource(guest.uid,[monster,guest,ownedElna],0,targetStats).reason,'invalid-source');
  assert.equal(contract.activateKokoroLinkSource(monster.uid,[guest,monster,ownedElna],0,targetStats).reason,'invalid-target');
  assert.deepEqual(plain(contract.kokoroLinkBattleSnapshot().usedSourceUids),[]);
}

const indexSource=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const coreSource=fs.readFileSync(new URL('../js/core.js',import.meta.url),'utf8');
const viewSource=fs.readFileSync(new URL('../js/battle-view.js',import.meta.url),'utf8');
const rulesSource=fs.readFileSync(new URL('../js/battle-rules.js',import.meta.url),'utf8');
const multiSource=fs.readFileSync(new URL('../js/multi-battle.js',import.meta.url),'utf8');
assert(indexSource.includes('id="kokoroLinkButton"')&&indexSource.includes('id="kokoroLinkPanel"'),'battle UI must expose the link command and source panel');
assert(viewSource.includes('レアリティ補正 ×')&&viewSource.includes('（適用済み）')&&viewSource.includes('最終効果：'),'battle UI must distinguish the applied rarity modifier from final effects');
assert(viewSource.includes('★1リンク能力：')&&viewSource.includes('kokoroLinkPowerAbilityStatus'),'battle UI must preview and track one-star ability state');
assert(viewSource.includes('★2リンク能力：')&&viewSource.includes('beginKokoroLinkStatusTargetSelection'),'battle UI must preview two-star abilities and select a multi-battle target');
assert(viewSource.includes('★3リンク能力：')&&viewSource.includes('beginKokoroLinkOriginChoice')&&viewSource.includes('beginKokoroLinkFreeSwitch')&&viewSource.includes('kokoroLinkSourceNeedsEnemyTarget'),'battle UI must preview three-star abilities and expose tactical and enemy-target choices');
assert(coreSource.includes('kokoroLinkAttackMultiplierFor')&&coreSource.includes('kokoroLinkSpeedBonusFor'),'combat stats must include link effects');
assert(viewSource.includes('activateKokoroLinkFromBattle')&&viewSource.includes('行動を消費せず発動'),'battle UI must activate links as a free subcommand');
assert(viewSource.includes("button.disabled=!targetEligible||(!current&&available===0)"),'active links must remain inspectable from the battle command');
assert(rulesSource.includes('resolvePlayerIncomingDamage'),'single battle damage must pass through the link barrier');
assert(rulesSource.includes('kokoroLinkMovePowerMultiplierFor')&&rulesSource.includes('playerKokoroLinkChance')&&rulesSource.includes('applyPlayerKokoroLinkRegeneration'),'single battle must consume active one-star abilities');
assert(rulesSource.includes('applyKokoroLinkStatusAbilityForBattle')&&rulesSource.includes('tickSingleEnemyKokoroLinkEffects'),'single battle must apply and expire two-star enemy effects');
assert(rulesSource.includes('applyKokoroLinkTacticsAbilityForBattle')&&rulesSource.includes('nextEnemyMoveWithKokoroLinkForesight')&&rulesSource.includes('kokoroLinkPenetratedMultiplier'),'single battle must apply three-star tactical support');
const feedbackSource=fs.readFileSync(new URL('../js/battle-feedback.js',import.meta.url),'utf8');
assert(multiSource.includes('resolvePlayerIncomingDamage')&&multiSource.includes('refreshBattleFeedback')&&feedbackSource.includes('kokoroLinkStatusHtml')&&multiSource.includes('applyPlayerKokoroLinkLifeSteal'),'multi battle must share link effects, abilities, and display');

console.log('Kokoro Link battle validation passed (activation UI, target binding, no stacking, base boosts, ★1–★3 abilities, switch reuse, and lifecycle reset).');
