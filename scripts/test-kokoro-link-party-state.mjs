import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
const dataSource=fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8');
const engineSource=fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8');
const battleFlowSource=fs.readFileSync(new URL('../js/battle-flow.js',import.meta.url),'utf8');
const multiBattleSource=fs.readFileSync(new URL('../js/multi-battle.js',import.meta.url),'utf8');
vm.runInContext(dataSource,context,{filename:'js/data.js'});
vm.runInContext(engineSource,context,{filename:'js/kokoro-link.js'});

const contract=vm.runInContext(`({
  byId:id => M.find(unit => unit.id === id),
  resetKokoroLinkBattleState,
  kokoroLinkBattleSnapshot,
  listKokoroLinkSources,
  canUseKokoroLinkSource,
  markKokoroLinkSourceUsed
})`,context);

const plain=value => JSON.parse(JSON.stringify(value));

function entry(uid,id,hp=100,fainted=false){
  const mon=contract.byId(id);
  return {uid,inst:{uid,id,level:5},mon,hp,fainted};
}

const party=[entry('active','freigal'),entry('reserve-a','aquaron'),entry('reserve-b','grassbeat')];
contract.resetKokoroLinkBattleState();
let sources=contract.listKokoroLinkSources(party,0);
assert.deepEqual(sources.map(source=>source.uid),['reserve-a','reserve-b'],'the two non-active party monsters must be link sources');
assert(sources.every(source=>source.available&&!source.used&&source.profile));

const reserveBefore=JSON.stringify(party[1]);
assert.equal(contract.markKokoroLinkSourceUsed('reserve-a',party,0),true);
assert.equal(JSON.stringify(party[1]),reserveBefore,'using a link must not alter or remove the reserve combatant');
assert.equal(contract.markKokoroLinkSourceUsed('reserve-a',party,0),false,'one source can link only once per battle');
assert.deepEqual(plain(contract.kokoroLinkBattleSnapshot().usedSourceUids),['reserve-a']);
assert.deepEqual(contract.listKokoroLinkSources(party,0).map(source=>source.uid),['reserve-b']);
assert.deepEqual(contract.listKokoroLinkSources(party,0,{includeUsed:true}).map(source=>[source.uid,source.used]),[['reserve-a',true],['reserve-b',false]]);

sources=contract.listKokoroLinkSources(party,1);
assert.deepEqual(sources.map(source=>source.uid),['active','reserve-b'],'after switching, the former active monster and other reserve must be recalculated');
assert.equal(contract.canUseKokoroLinkSource('reserve-a',party,1),false,'the current active monster cannot link even if it was previously a reserve');

party[2].fainted=true;party[2].hp=0;
assert.deepEqual(contract.listKokoroLinkSources(party,0),[],'fainted and used reserves must not be available');

contract.resetKokoroLinkBattleState();
party[2].fainted=false;party[2].hp=100;
assert.deepEqual(contract.listKokoroLinkSources(party,0).map(source=>source.uid),['reserve-a','reserve-b'],'battle reset must restore both reserves');

const withCharacter=[entry('active','freigal'),entry('character','elna_beginner'),entry('reserve','aquaron')];
assert.deepEqual(contract.listKokoroLinkSources(withCharacter,0).map(source=>source.uid),['reserve'],'character units must not enter monster-only link sources');

const duplicate=[entry('active','freigal'),entry('same','aquaron'),entry('same','grassbeat')];
assert.equal(contract.listKokoroLinkSources(duplicate,0).length,1,'duplicate UIDs must not create duplicate link uses');
assert.equal(contract.listKokoroLinkSources(party,-1).length,0,'invalid active indexes must fail closed');

assert(battleFlowSource.includes("function prepareBattleParty() {\n  if (typeof resetKokoroLinkBattleState === 'function') resetKokoroLinkBattleState();"),'battle preparation must reset link usage');
assert(battleFlowSource.includes("function endPartyRecovery()")&&battleFlowSource.includes("function runAway()")&&battleFlowSource.includes("function win()"));
assert((battleFlowSource.match(/resetKokoroLinkBattleState/g)||[]).length>=4,'normal battle lifecycle must reset link usage at preparation and every outcome');
assert(multiBattleSource.includes("function winMultiBattle()")&&multiBattleSource.includes("function runAwayFromMultiBattle()"));
assert((multiBattleSource.match(/resetKokoroLinkBattleState/g)||[]).length>=2,'multi battle victory and retreat must reset link usage');

console.log('Kokoro Link party-state validation passed (one active, two reserves, once-per-UID use, switch recalculation, faint exclusion, combat eligibility, reset, and duplicate protection).');
