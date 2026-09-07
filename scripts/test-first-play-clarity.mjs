import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Deliberately DOM-light: verifies state/rendered HTML, not mobile layout or play time.
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const roster={
  html:'', openUids:new Set(), inventoryOpen:false,
  get innerHTML(){return this.html;},
  set innerHTML(value){
    this.html=value;
    this.openUids=new Set([...value.matchAll(/data-instance-uid="([^"]+)"[\s\S]*?<details class="monster-roster-details"([^>]*)>/g)]
      .filter(match=>/\bopen\b/.test(match[2])).map(match=>match[1]));
    this.inventoryOpen=/<details class="monster-inventory-summary" open>/.test(value);
  },
  querySelectorAll(){return [...this.openUids].map(uid=>({closest:()=>({dataset:{instanceUid:uid}})}));},
  querySelector(){return {open:this.inventoryOpen};}
};
const nodes=new Map([['partyList',roster]]);
for(const id of ['battle','battleOutcome','battleOutcomeIcon','battleOutcomeEyebrow','battleOutcomeTitle','battleOutcomeRewards','battleOutcomeNote','next','expeditionNav','expedition'])nodes.set(id,{classList:{add(){},remove(){}},textContent:'',innerHTML:''});
const mon={id:'m',name:'テスト仲間',rarity:'★',types:['fire'],desc:''};
const item={id:'kilo_data',name:'キロデータ',expItem:true,expAmount:20};
const context=vm.createContext({
  console,document:{getElementById:id=>nodes.get(id)||null},
  save:{instances:[{id:'m',uid:'first',level:1,exp:0},{id:'m',uid:'second',level:1,exp:0}],party:['first','second'],items:{kilo_data:3},coins:0,expeditions:{active:[]}},
  by:()=>mon,ensureContractScrollItem(){},getDataItems:()=>[item],itemCountText:()=>'',itemInlineVisual:()=>'',
  ITEM_DEX_BY_ID:{water_mirror:{}},ITEM_BY_ID:{kilo_data:item},SHOP_ITEMS:[],vis:()=>'',typesHtml:()=>'',
  isMaxLevel:level=>level>=100,needExp:()=>100,getEquippedSkillIds:()=>[],SKILL_BY_ID:{},equippedSkillCost:()=>0,skillCostLimitFor:()=>1,isCharacterUnit:()=>false,
  pendingEvolutions:[],checkEvolution(){},saveGame:()=>true,alert(){},setTimeout(){},
  activeHuntRequest:null
});
context.getInstance=uid=>context.save.instances.find(ins=>ins.uid===uid);
context.isInstanceOnExpedition=uid=>context.save.expeditions.active.some(entry=>entry.memberUids.includes(uid));
for(const file of ['js/party.js','js/items.js','js/battle-view.js','js/expedition.js'])vm.runInContext(read(file),context,{filename:file});
context.renderParty();
assert.equal(roster.openUids.size,0);
roster.openUids.add('second');roster.inventoryOpen=true;
context.useExpItemOnInstance('kilo_data','second');
assert.equal(context.save.items.kilo_data,2);
assert.equal(context.save.instances[1].exp,20);
assert.deepEqual([...roster.openUids],['second'],'using an EXP item must preserve only the opened individual, even with duplicate species');
assert.equal(roster.inventoryOpen,true);
context.toggleInstanceLock('second');
assert.deepEqual([...roster.openUids],['second'],'locking an individual must not close its details');
roster.openUids.clear();roster.inventoryOpen=false;
context.renderParty();
assert.equal(roster.openUids.size,0,'player-closed details must stay closed');
assert.equal(roster.inventoryOpen,false);
roster.openUids.add('second');context.save.instances.pop();context.renderParty();
assert.equal(roster.openUids.size,0,'removed individuals must not leave stale open state');

for(const kind of ['victory','defeat','retreat']){
  context.activeHuntRequest={worldMapExploration:true};
  context.showBattleOutcome({kind,title:'test'});
  assert.equal(nodes.get('next').textContent,'探索先へ戻る ›');
  context.activeHuntRequest={};
  context.showBattleOutcome({kind,title:'test'});
  assert.equal(nodes.get('next').textContent,kind==='victory'?'次の討伐依頼へ ›':'依頼を選び直す ›','tutorial retry instructions must retain their matching button label');
}
context.save.instances.push({id:'m',uid:'second',level:1,exp:0});
assert.match(context.expeditionEmptyMemberGuide(),/戦闘用の仲間を1体以上残して/);
assert.match(context.expeditionEmptyMemberGuide(),/パーティー編成を開く/);
context.save.party=['first'];context.save.expeditions.active=[{memberUids:['second']}];
assert.match(context.expeditionEmptyMemberGuide(),/戦闘用の仲間を1体残しましょう/);
context.save.party=[];context.save.expeditions.active=[{memberUids:['first','second']}];
assert.match(context.expeditionEmptyMemberGuide(),/途中帰還/);
assert.doesNotMatch(context.expeditionEmptyMemberGuide(),/パーティーから外/);
context.save.instances=[];assert.match(context.expeditionEmptyMemberGuide(),/仲間を増やしましょう/);
console.log('First-play clarity validation passed: repeated EXP/lock renders, duplicate UID isolation, closed/removed panels, 6 outcome labels, 4 expedition empty states. DOM-light only; browser/device QA remains pending.');
