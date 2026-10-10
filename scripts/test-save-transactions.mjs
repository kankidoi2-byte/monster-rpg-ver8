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
const seedAlchemy=`var catalyst=addInstance('freigal',1);addInstance('aquaron',1);save.party=[];var recipe=ALCHEMY_RECIPES[0];var materials=recipe.materialChoices.map(x=>x.normal);materials.forEach(id=>save.items[id]=10);var selection={recipeId:recipe.recipeId,mode:'normal',instanceUid:catalyst.uid,materialIds:materials,materialCounts:[1,1,1,1],coinOptionId:'low'};var plan=alchemyPlan(selection);saveGame();`;
for(const slot of [1,2])for(const fault of ['quota','conflict','postCommitDOM','notice']){
 const r=h(slot);r.run(seedAlchemy);assert.equal(r.run('validateAlchemyPlan(plan).length'),0);
 r.run(`var beforeMemory=JSON.stringify(save);var before1=localStorage.getItem('mb_v95c');var key=MonsterProfiles.key(SAVE_KEY);var originalSet=localStorage.setItem;var writes=0;`);
 if(fault==='quota')r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');return originalSet(k,v);}`);
 if(fault==='conflict')r.run(`var newer=JSON.parse(localStorage.getItem(key));newer.coins=99999;localStorage.setItem(key,JSON.stringify(newer));`);
 if(fault==='notice')r.run(`showUiNotice=()=>{throw Error('notice')}`);
 if(fault==='postCommitDOM'){let n=0;Object.defineProperty(r.context.document.getElementById('alchemyResultContent'),'innerHTML',{get:()=>'',set(){if(++n===1)throw Error('DOM')}});}
 r.run('finalizeAlchemy(plan)');
 if(['quota','conflict'].includes(fault))assert.equal(r.run('JSON.stringify(save)'),r.run('beforeMemory'));
 else assert.equal(r.run('save.coins'),19950);
 if(slot===2)assert.equal(r.run("localStorage.getItem('mb_v95c')"),r.run('before1'));
 if(fault==='conflict')assert.equal(r.run('JSON.parse(localStorage.getItem(key)).coins'),99999);
 assert.equal(r.run('alchemyBusy'),false);results.push(`alchemy/${slot}/${fault}`);
}
for(const slot of [1,2])for(const multi of [false,true])for(const outcome of [0,.999])for(const fault of ['none','quota','conflict','animation','notice']){
 const r=h(slot);r.run(`save.items.contract_scroll=3;var hero=addInstance('aquaron',1);activeInstance=hero;enemy=by('freigal');player=by('aquaron');busy=false;battleRewardGranted=true;playContractAnimation=async()=>{};refreshContractScrollDisplay=()=>{};appendMultiLog=x=>auditNotices.push(x);Math.random=()=>${outcome};saveGame();var before=JSON.stringify(save);var key=MonsterProfiles.key(SAVE_KEY);var disk=localStorage.getItem(key);var n=save.instances.length;var actualSet=localStorage.setItem;var writes=0;localStorage.setItem=(k,v)=>{if(k===key)writes++;return actualSet(k,v)};`);
 if(multi)r.run(`multiBattle={active:true,finished:true,enemies:[{id:'x',mon:enemy,defeatedByPlayer:true}],contractAttempts:{}};pendingMultiBattleContractId='x';`);
 if(fault==='quota')r.run(`localStorage.setItem=(k,v)=>{if(k===key){writes++;throw Error('quota')}return actualSet(k,v)};`);
 if(fault==='conflict')r.run(`var newer=JSON.parse(disk);newer.coins=99999;actualSet(key,JSON.stringify(newer));`);
 if(fault==='animation')r.run(`playContractAnimation=async()=>{throw Error('animation')}`);
 if(fault==='notice')r.run(`renderParty=()=>{throw Error('DOM')};showUiNotice=()=>{throw Error('notice')};`);
 await r.run(multi?"useMultiBattleContractScroll('contract_scroll')":"useContractScrollConfirmed()");
 if(['quota','conflict'].includes(fault)){
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'));
  assert(r.run('activeInstance===save.instances.find(x=>x.uid===hero.uid)'));
  assert.equal(r.run(multi?'!!multiBattle.contractAttempts.x':'singleBattleContractAttempted'),false);
 }else{
  assert.equal(r.run('writes'),1);assert.equal(r.run('save.items.contract_scroll'),2);
  assert.equal(r.run('save.instances.length-n'),outcome===0?1:0);
  assert.equal(r.run(multi?'multiBattle.contractAttempts.x':'singleBattleContractAttempted'),true);
 }
 assert.equal(r.run('postBattleContractBusy||busy'),false);results.push(`contract/${slot}/${multi}/${outcome}/${fault}`);
}
{
 const r=h();r.run(`save.items.contract_scroll=3;enemy=by('freigal');player=by('aquaron');playContractAnimation=async()=>{};refreshContractScrollDisplay=()=>{};Math.random=()=>0;saveGame();var n=save.instances.length;`);
 await Promise.all([r.run('useContractScrollConfirmed()'),r.run('useContractScrollConfirmed()')]);assert.equal(r.run('save.instances.length-n'),1);assert.equal(r.run('save.items.contract_scroll'),2);results.push('single/reentrant');
}
{
 const r=h();r.run(`save.items.contract_scroll=3;enemy=by('freigal');player=by('aquaron');playContractAnimation=async()=>{};refreshContractScrollDisplay=()=>{};Math.random=()=>.999;saveGame();var n=save.instances.length;var actualSet=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k===SAVE_KEY)throw Error('quota');return actualSet(k,v)};`);
 await r.run('useContractScrollConfirmed()');r.run('localStorage.setItem=actualSet;Math.random=()=>0');await r.run('useContractScrollConfirmed()');assert.equal(r.run('save.instances.length-n'),0);assert.equal(r.run('save.items.contract_scroll'),2);results.push('single/retry-preserves-roll');
}
for(const slot of [1,2])for(const feature of ['shop','itemGacha','fusion','expedition'])for(const fault of ['none','quota','conflict','DOM']){
 const r=h(slot);r.run(`var item=SHOP_ITEMS.find(x=>x.shop!==false);var fusion=FUSIONS[0];var unit=addInstance(fusion.from,1);save.party=[unit.uid];activeInstance=unit;prepareBattleParty();save.items[fusion.item]=fusion.count;save.expeditions.active=[{id:'test',mapId:MAPS[0].id,distanceId:'short',memberUids:[unit.uid],progress:1,requiredWins:1,status:'complete',suitability:{},reward:{coins:123,exp:1000,items:{}}}];`);
 if(feature==='fusion')r.run('save.expeditions.active=[]');
 r.run(`saveGame();var key=MonsterProfiles.key(SAVE_KEY);var before=JSON.stringify(save);var beforeQueue=JSON.stringify(pendingEvolutions);var disk=localStorage.getItem(key);var beforeOther=localStorage.getItem(${slot===1?"MonsterProfiles.key(SAVE_KEY)+'unused'":"'mb_v95c'"});var originalSet=localStorage.setItem;`);
 if(fault==='quota')r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');return originalSet(k,v)}`);
 if(fault==='conflict')r.run(`var newer=JSON.parse(disk);newer.coins=99999;originalSet(key,JSON.stringify(newer));`);
 if(fault==='DOM')r.run('renderShop=renderItemGacha=renderFusion=renderExpedition=()=>{throw Error("DOM")}');
 try{r.run(({shop:'buyItem(item.id)',itemGacha:'rollItemGacha()',fusion:'tryFusion(0)',expedition:'claimExpedition("test")'})[feature]);}catch(error){assert.equal(fault,'DOM');}
 if(['quota','conflict'].includes(fault)){
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'));assert.equal(r.run('JSON.stringify(pendingEvolutions)'),r.run('beforeQueue'));
  assert(r.run('partyBattle[0].inst===save.instances.find(x=>x.uid===unit.uid)'));
  assert(r.run('activeInstance===partyBattle[0].inst'));
 }else assert.equal(r.run('JSON.stringify(save)'),r.run('localStorage.getItem(key)'));
 if(slot===2)assert.equal(r.run("localStorage.getItem('mb_v95c')"),r.run('beforeOther'));
 results.push(`acquisition/${slot}/${feature}/${fault}`);
}
for(const slot of [1,2])for(const feature of ['import','restore'])for(const fault of ['none','backup','primary','conflict','reload']){
 const r=h(slot);r.context.location={reload(){r.context.reloaded=true;if(fault==='reload')throw Error('reload')}};
 r.run(`var old=initSave();old.coins=7;safeStorageSet(SAVE_BACKUP_KEY,JSON.stringify(old));var incoming=initSave();incoming.coins=909;var text=JSON.stringify(incoming);var key=MonsterProfiles.key(SAVE_KEY),backupKey=MonsterProfiles.key(SAVE_BACKUP_KEY);var disk=localStorage.getItem(key);var before=JSON.stringify(save);var other=localStorage.getItem('mb_v95c');var originalSet=localStorage.setItem;`);
 if(['backup','primary'].includes(fault))r.run(`localStorage.setItem=(k,v)=>{if(k===${fault==='backup'?'backupKey':'key'})throw Error('quota');return originalSet(k,v)};`);
 if(fault==='conflict')r.run(`var newer=JSON.parse(disk);newer.coins=99999;originalSet(key,JSON.stringify(newer));`);
 r.context.input={files:[{text:async()=>r.run('text')}],value:'fixture.json'};
 if(feature==='import')await r.run('importSaveData(input)');else r.run('restoreLastKnownGood()');
 if(['none','reload'].includes(fault)){
  assert.equal(r.run('JSON.parse(localStorage.getItem(key)).coins'),feature==='import'?909:7);
  assert.equal(r.run('localStorage.getItem(backupKey)'),r.run('disk'));
 }else{
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'));
  assert.equal(r.run('localStorage.getItem(key)'),fault==='conflict'?r.run('JSON.stringify(newer)'):r.run('disk'));
  assert(!r.context.reloaded);
 }
 if(slot===2)assert.equal(r.run("localStorage.getItem('mb_v95c')"),r.run('other'));
 results.push(`replace/${slot}/${feature}/${fault}`);
}
for(const slot of [1,2])for(const fault of ['none','quota','animation']){
 const r=h(slot);r.run(`save.items.contract_scroll=0;save.progress.tutorial.status='in_progress';save.progress.tutorial.stepId='contract_confirm';save.saveMeta.migrations=[];setTutorialContractContext();playContractAnimation=async()=>{};refreshContractScrollDisplay=()=>{};handleTutorialContractCommitted=()=>{};handleTutorialContractAnimationComplete=()=>{};saveGame();var before=JSON.stringify(save);var n=save.instances.length;var key=MonsterProfiles.key(SAVE_KEY);var oldSet=localStorage.setItem;var writes=0;localStorage.setItem=(k,v)=>{if(k===key)writes++;return oldSet(k,v);};`);
 assert(r.run('shouldGuaranteeTutorialContract(enemy,"contract_scroll")'));r.run('var screens=[];show=id=>screens.push(id)');
 if(fault==='quota')r.run('localStorage.setItem=(k,v)=>{if(k===key)throw Error("quota");return oldSet(k,v)}');
 if(fault==='animation')r.run('playContractAnimation=async()=>{throw Error("animation")}');
 await r.run('useContractScrollConfirmed()');
 if(fault==='quota'){assert.equal(r.run('JSON.stringify(save)'),r.run('before'));assert.equal(r.run('screens.at(-1)'),'contractConfirm');}
 else{assert.equal(r.run('writes'),1);assert.equal(r.run('save.instances.length-n'),1);assert.equal(r.run('save.items.contract_scroll'),0);assert(r.run('save.progress.tutorial.firstContractGuaranteeUsed'));}
 results.push(`guaranteed/${slot}/${fault}`);
}
{
 const r=h();r.run(seedAlchemy);r.run(`plan.transactionIdentity='another-profile';var before=JSON.stringify(save);finalizeAlchemy(plan)`);assert.equal(r.run('JSON.stringify(save)'),r.run('before'));results.push('alchemy/profile-change');
}
{
 const r=h();r.context.input={files:[{text:async()=>{r.run("saveTransactionIdentity=()=> 'another-profile'");return r.run('JSON.stringify(initSave())')}}],value:'fixture.json'};
 r.run('var disk=localStorage.getItem(SAVE_KEY);var before=JSON.stringify(save)');await r.run('importSaveData(input)');assert.equal(r.run('JSON.stringify(save)'),r.run('before'));assert.equal(r.run('localStorage.getItem(SAVE_KEY)'),r.run('disk'));results.push('import/profile-change-during-read');
}
for(const slot of [1,2])for(const fault of ['stage','backup','primary','completion','malformed','pending']){
 const r=h(slot);r.context.location={reload(){}};
 r.run(`var original=initSave();original.coins=7;safeStorageSet(SAVE_BACKUP_KEY,JSON.stringify(original));var key=MonsterProfiles.key(SAVE_KEY),bk=MonsterProfiles.key(SAVE_BACKUP_KEY),rk=MonsterProfiles.key(SAVE_REPLACEMENT_RECOVERY_KEY);var disk=localStorage.getItem(key),backup=localStorage.getItem(bk);var set=localStorage.setItem;var stages=0;`);
 if(fault==='malformed')r.run("set(rk,'{bad')");
 if(fault==='pending')r.run('stageReplacementRecovery(disk,backup)');
 r.run('var previousRecord=localStorage.getItem(rk)');
 if(fault==='stage')r.run(`localStorage.setItem=(k,v)=>{if(k===rk)throw Error('stage quota');return set(k,v)}`);
 if(fault==='backup')r.run(`localStorage.setItem=(k,v)=>{if(k===bk)throw Error('backup quota');return set(k,v)}`);
 if(fault==='primary')r.run(`localStorage.setItem=(k,v)=>{if(k===key||(k===bk&&stages++>0))throw Error('primary and rollback quota');return set(k,v)}`);
 if(fault==='completion')r.run(`localStorage.setItem=(k,v)=>{if(k===rk&&stages++>0)throw Error('marker quota');return set(k,v)}`);
 r.run('restoreLastKnownGood()');
 if(fault!=='completion')assert.equal(r.run('localStorage.getItem(key)'),r.run('disk'));
 if(['stage','malformed','pending'].includes(fault))assert.equal(r.run('localStorage.getItem(rk)'),r.run('previousRecord'));
 else{
  assert.equal(r.run('JSON.parse(localStorage.getItem(rk)).before'),r.run('disk'));assert.equal(r.run('JSON.parse(localStorage.getItem(rk)).backupBefore'),r.run('backup'));
  assert.equal(r.run('JSON.parse(JSON.parse(localStorage.getItem(rk)).after).coins'),7);
  r.run('localStorage.setItem=set;var exported=[];downloadTextFile=(name,text)=>exported.push({name,text});');
  for(const kind of ['before','after','backupBefore']){r.run(`exportReplacementRecovery('${kind}')`);assert(r.run('Array.isArray(parseAndPrepareSave(exported.at(-1).text,[]).instances)'));}
  r.run('acknowledgeReplacementRecovery()');assert.equal(r.run('JSON.parse(localStorage.getItem(rk)).status'),'pending');
  r.run('exportReplacementRecovery();acknowledgeReplacementRecovery()');assert.equal(r.run('JSON.parse(localStorage.getItem(rk)).status'),'acknowledged');
 }
 results.push(`replacement-record/${slot}/${fault}`);
}
{
 const r=h();r.run(`activeInstance={uid:'guest-test',guest:true};var guest=activeInstance;partyBattle=[{inst:guest,hp:17}];var snap=captureSaveTransaction();rollbackSaveTransaction(snap)`);assert(r.run('activeInstance===guest&&partyBattle[0].inst===guest&&partyBattle[0].hp===17'));results.push('guest-reference');
}
for(const slot of [1,2])for(const fault of ['none','quota','DOM']){
 const r=h(slot);r.run(`showAlchemy=()=>{};handleTutorialLuminaAlchemyCompleted=()=>{};save.progress.tutorial.status='in_progress';prepareTutorialLuminaAlchemy();var plan=alchemyPlan();saveGame();var before=JSON.stringify(save);var key=MonsterProfiles.key(SAVE_KEY);var set=localStorage.setItem;`);assert.equal(r.run('validateAlchemyPlan(plan).length'),0);
 if(fault==='quota')r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');return set(k,v)};`);
 if(fault==='DOM')r.run(`renderParty=()=>{throw Error('DOM')}`);
 r.run('finalizeAlchemy(plan)');
 if(fault==='quota')assert.equal(r.run('JSON.stringify(save)'),r.run('before'));
 else{assert(r.run('save.progress.tutorial.alchemyLessonCompleted'));assert(r.run('save.instances.some(x=>x.id===TUTORIAL_LUMINA_ALCHEMY.resultId)'));const after=r.run('JSON.stringify(save)');r.run('finalizeAlchemy(plan)');assert.equal(r.run('JSON.stringify(save)'),after);}
 results.push(`tutorial-alchemy/${slot}/${fault}`);
}
{
 const r=h();r.run(seedAlchemy);r.run(`var set=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k===SAVE_KEY)throw Error('quota');return set(k,v)};finalizeAlchemy(plan);var chosen=JSON.stringify(alchemyTransactionRetry);localStorage.setItem=set;rollAlchemySuccess=()=>{throw Error('rerolled')};rollAlchemyResultCandidate=()=>{throw Error('rerolled')};finalizeAlchemy(plan);var after=JSON.stringify(save);finalizeAlchemy(plan);`);
 assert.equal(r.run('JSON.stringify(save)'),r.run('after'));assert.equal(r.run('alchemyDiagnosticsStage'),'completed');results.push('alchemy/retry-cached-result-and-duplicate');
}
console.log(`PASS save transaction boundaries: ${results.length} cases (real profiles, save, contractor-rank and tutorial functions)`);
