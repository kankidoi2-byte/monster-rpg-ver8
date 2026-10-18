import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const root=new URL('../',import.meta.url).pathname;
const profileSource=fs.readFileSync(root+'/js/profiles.js','utf8');
const results=[];
function h(slot=1){
 const r=runtime({data:s=>`globalThis.crypto={randomUUID:()=>String(Math.random())};globalThis.sessionStorage={getItem:()=> '${slot}',setItem(){}};localStorage.setItem('mb_v95c',JSON.stringify({coins:11111,auditMarker:'profile1'}));\n${profileSource}\n${s}`,save:s=>s+'\nglobalThis.originalSaveGame=saveGame;'});
 r.context.document.addEventListener=()=>{};r.context.window={addEventListener(){}};
 for(const file of ['contractor-rank','tutorial'])vm.runInContext(fs.readFileSync(root+'/js/'+file+'.js','utf8'),r.context);
 r.run('saveGame=originalSaveGame;save=initSave();save.coins=20000;renderShop=()=>{};updateItems=()=>{};renderItemGacha=()=>{};renderFusion=()=>{};renderPartySetup=()=>{};renderExpedition=()=>{};typesHtml=()=>"";battleRewardGranted=true;var auditNotices=[];showUiNotice=(text)=>auditNotices.push(text);saveGame();');
 return r;
}
// No network APIs or real saves are present in this VM.
for(const slot of [1,2])for(const feature of ['evolution','potion','upper_potion','attack_potion'])for(const fault of ['none','quota','write','read','lateRead','finalRead','conflict','display','notice','reenter','profile']){
 const r=h(slot);r.context.console={...console,error(){}};
 r.run(`var hero=addInstance('aquaron',50);save.party=[hero.uid];activeInstance=hero;partyBattle=[{inst:hero,hp:10,fainted:false}];activePartyIdx=0;player=by(hero.id);enemy=by('freigal');pHp=10;pAtk=1;pStatus={poison:2};busy=false;battleTurnCount=7;save.items.potion=3;save.items.upper_potion=3;save.items.attack_potion=3;checkEvolution(hero);currentEvolution=pendingEvolutions.shift();var target=currentEvolution.choices[0];pendingEvolutions.push({uid:'later',from:'aquaron',choices:[target]});saveGame();var key=MonsterProfiles.key(SAVE_KEY),otherKey=MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c';var other=localStorage.getItem(otherKey);var before=JSON.stringify(save),disk=localStorage.getItem(key),choice=JSON.stringify(currentEvolution),queue=JSON.stringify(pendingEvolutions);var set=localStorage.setItem,get=localStorage.getItem;var writes=0;localStorage.setItem=(k,v)=>{if(k===key)writes++;return set(k,v)};var action=()=>${feature==='evolution'?'confirmEvolution(target)':`useBattleItem('${feature}')`};`);
 if(['quota','write'].includes(fault))r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Object.assign(Error('${fault}'),{name:'${fault==='quota'?'QuotaExceededError':'SecurityError'}'});return set(k,v)};`);
 if(['read','lateRead','finalRead'].includes(fault))r.run(`var reads=0;localStorage.getItem=k=>{if(k===key&&${fault==='read'?'true':fault==='lateRead'?'++reads===2':'++reads===3'})throw Error('read');return get(k)};`);
 if(fault==='conflict')r.run('var newer=JSON.parse(disk);newer.coins=99999;set(key,JSON.stringify(newer))');
 if(fault==='display')r.run("renderParty=update=show=()=>{throw Error('display')}");
 if(fault==='notice')r.run("alert=showUiNotice=()=>{throw Error('notice')}");
 if(['reenter','profile'].includes(fault))r.run(`var called=false;localStorage.setItem=(k,v)=>{if(k===key){writes++;if(!called){called=true;${fault==='reenter'?'action()':`globalThis.location={reload(){throw Error('unexpected switch')}};globalThis.switched=MonsterProfiles.switchTo(${slot===1?2:1});`}}}return set(k,v)};`);
 r.run('action();localStorage.getItem=get;');
 const failed=['quota','write','read','lateRead','finalRead','conflict'].includes(fault);
 if(failed){
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'),`${slot}/${feature}/${fault} memory`);
  assert.equal(r.run('JSON.stringify(currentEvolution)'),r.run('choice'));
  assert.equal(r.run('localStorage.getItem(key)'),fault==='conflict'?r.run('JSON.stringify(newer)'):r.run('disk'));
  assert.equal(r.run('pHp'),10);assert.equal(r.run('pAtk'),1);
  assert(r.run('activeInstance===getInstance(hero.uid)&&partyBattle[0].inst===activeInstance'));
  if(fault!=='conflict'){r.run('localStorage.setItem=(k,v)=>{if(k===key)writes++;return set(k,v)};action()');}
 }
 if(fault!=='conflict'){
  assert.equal(r.run('JSON.stringify(save)'),r.run('localStorage.getItem(key)'));
  assert.equal(r.run('writes'),1);
  if(feature==='evolution'){
   assert.equal(r.run('getInstance(hero.uid).id'),r.run('target'));assert.equal(r.run('currentEvolution'),null);
   assert.equal(r.run('getInstance(hero.uid).level'),50);assert.equal(r.run('getInstance(hero.uid).exp'),0);
   assert.equal(r.run('JSON.stringify(save.items)'),r.run('JSON.stringify(JSON.parse(before).items)'));
   r.run('var committed=JSON.stringify(save);action()');assert.equal(r.run('JSON.stringify(save)'),r.run('committed'));
  }else{
   assert.equal(r.run(`save.items['${feature}']`),2);
   assert.equal(r.run('pAtk'),feature==='attack_potion'?1.6:1);
   assert.equal(r.run('pHp'),feature==='attack_potion'?10:r.run(`Math.min(playerMaxHp(),10+adjustedBattleHealing(${feature==='potion'?50:120}))`));
   assert.equal(r.run('partyBattle[0].hp'),r.run('pHp'));
   // A stale menu event after success (even after a render exception) is not a second use.
   r.run(`document.getElementById('battleItemSelect').classList.contains=()=>true;var committed=JSON.stringify(save);useBattleItemFromMenu('${feature}')`);
   assert.equal(r.run('JSON.stringify(save)'),r.run('committed'));
  }
 }
 assert.equal(r.run('JSON.stringify(pendingEvolutions)'),r.run('queue'));
 assert.equal(r.run('battleTurnCount'),7);assert.equal(r.run('JSON.stringify(pStatus)'),'{"poison":2}');
 assert.equal(r.run('localStorage.getItem(otherKey)'),r.run('other'));
 if(fault==='profile')assert.equal(r.run('switched'),false);
 assert.equal(r.run('evolutionSaveBusy||battleItemSaveBusy'),false);
 results.push(`${slot}/${feature}/${fault}`);
}
console.log(`PASS evolution/battle items: ${results.length} isolated fault/normal cases`);
// Adjacent special evolution: a failed backup-source read must not proceed to write.
for(const slot of [1,2])for(const readAt of [1,2,3]){
 const r=h(slot);r.context.console={...console,error(){}};
 r.run(`var recipe=FUSIONS[0];var hero=addInstance(recipe.from,1);save.items[recipe.item]=recipe.count;saveGame();var key=MonsterProfiles.key(SAVE_KEY),before=JSON.stringify(save),disk=localStorage.getItem(key),get=localStorage.getItem,reads=0;localStorage.getItem=k=>{if(k===key&&++reads===${readAt})throw Error('read');return get(k)};tryFusion(0);localStorage.getItem=get;`);
 assert.equal(r.run('JSON.stringify(save)'),r.run('before'),`fusion read ${readAt}`);assert.equal(r.run('localStorage.getItem(key)'),r.run('disk'));
 r.run('tryFusion(0)');assert.equal(r.run('getInstance(hero.uid).id'),r.run('recipe.to'));
}
console.log('PASS 6 adjacent fusion read failures and recovery');
{
 const r=h();vm.runInContext(fs.readFileSync(root+'/js/progression.js','utf8').replace('let evolutionSaveBusy = false;','evolutionSaveBusy = false;'),r.context);
 r.run(`var first=addInstance('aquaron',50),second=addInstance('freigal',50);checkEvolution(first);checkEvolution(second);globalThis.battleFeedback={finished:false};var node=document.getElementById('evoVisual');Object.defineProperty(node,'innerHTML',{configurable:true,set(){throw Error('display')}});`);
 assert.throws(()=>r.run('processNextEvolution()'),/display/);
 const choice=r.run('JSON.stringify(currentEvolution)'),queue=r.run('JSON.stringify(pendingEvolutions)');
 assert.throws(()=>r.run('processNextEvolution()'),/display/);
 assert.equal(r.run('JSON.stringify(currentEvolution)'),choice);assert.equal(r.run('JSON.stringify(pendingEvolutions)'),queue);
}
console.log('PASS evolution queue survives repeated presentation failure');
