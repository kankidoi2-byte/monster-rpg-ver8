import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/world-map.js',import.meta.url),'utf8');
const map={id:'magic_academy',name:'魔導学園',image:'academy.webp',desc:'学園',region:'王都',chapter:'序章',ecosystem:'施設',enemyIds:['m']};
const difficulty={id:'easy',label:'Easy',rewardText:'0.7',danger:'安全'};
let facility=null,visits=[],battleStarts=0,prepared=0,requests=0;
const list={
  classList:{add(){}},innerHTML:'',contains(){return true;},querySelector(){return null;}
};
const context={
  MAPS:[map],HUNT_DIFFICULTIES:{easy:difficulty},Math,Map,Object,String,
  save:{worldMap:{}},document:{getElementById(){return list;}},setTimeout(){return 1;},alert(){},
  worldMapActiveEvents:()=>[],worldMapEntryAvailable:()=>true,
  worldMapAvailableDifficulties:()=>[difficulty],worldMapCandidates:()=>[{id:'m',name:'Enemy',rarity:'★'}],
  huntLevelFor:()=>1,goldenLandMapIsReady:()=>false,registerMapDex:()=>false,saveGame:()=>true,
  tutorialWorldMapFacilityVisitFor:id=>{assert.equal(id,'magic_academy');return facility;},
  handleTutorialWorldMapFacilityVisit:id=>{visits.push(id);return true;},
  getPartyInstances:()=>[{uid:'p'}],prepareBattleParty:()=>prepared++,
  createHuntRequest:()=>{requests++;return {requestId:'r'};},rollHuntConditionIds:()=>[],registerHuntRequest(){},
  startChosenBattle:()=>battleStarts++
};
vm.createContext(context);vm.runInContext(source,context);

assert.equal(context.showWorldMapLocation('magic_academy'),true);
assert.equal(list.innerHTML.includes('data-wm-facility-visit'),false,'ordinary location detail is unchanged outside the tutorial step');

facility={label:'学園へ向かう <案内>',description:'ステラとの模擬戦へ進みます & 戦闘探索ではありません。'};
assert.equal(context.showWorldMapLocation('magic_academy'),true);
assert.ok(list.innerHTML.includes('data-wm-facility-visit="magic_academy"'));
assert.ok(list.innerHTML.includes('学園へ向かう &lt;案内&gt;'));
assert.ok(list.innerHTML.includes('進みます &amp; 戦闘探索ではありません。'));
assert.equal(list.innerHTML.includes('data-wm-depart'),false,'the normal exploration CTA must be hidden during a tutorial facility visit');

const button={
  dataset:{wmFacilityVisit:'magic_academy'},
  hasAttribute:name=>name==='data-wm-facility-visit'||name==='data-wm-depart'
};
list.onclick({target:{closest:()=>button}});
assert.deepEqual(visits,['magic_academy'],'the tutorial facility handler consumes the CTA');
assert.equal(prepared,0);assert.equal(requests,0);assert.equal(battleStarts,0,'facility visits must not start an exploration battle');

console.log('World map facility UI passed: tutorial-only CTA, escaped copy, handler routing, and no exploration battle.');
