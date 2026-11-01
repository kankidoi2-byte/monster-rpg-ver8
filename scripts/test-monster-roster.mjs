import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const storage=new Map(),nodes=new Map();let failStorage=false,throwStorage=false,writes=0;
const node=()=>({innerHTML:'',scrollTop:0,classList:{toggle(){},remove(){},add(){},contains(){return false}},querySelector(){return null;},querySelectorAll(){return [];}});
for(const id of ['partyList','rosterSheetHost','rosterActions','rosterControls','rosterCount','party','expeditionNav','expedition'])nodes.set(id,node());
const ctx=vm.createContext({console:{log(){},error(){}},Math,Date,JSON,structuredClone,vis:()=>'<img loading="lazy">',typesHtml:()=>'',document:{getElementById:id=>nodes.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},setTimeout(){},clearTimeout(){},alert(){},confirm(){throw Error('native confirm is forbidden');},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(k==='mb_v95c'){writes++;if(failStorage||throwStorage)throw Error('quota');}storage.set(k,v);},removeItem:k=>storage.delete(k)}});
for(const file of ['data','core','save','state','skills','items','party','progression','expedition','alchemy','character-gacha'])vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
run(`function showUiNotice(){};function refreshContractorRankUi(){};function updateItems(){};
function reset(){save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.party=[];pendingEvolutions=[];currentEvolution=null;selectedAlchemyCatalystUid='';alchemyBusy=false;expeditionSelectedUids=[];ensureRosterState();rosterUi.filter='all';rosterUi.sort='newest';rosterUi.selected.clear();rosterUi.confirmation=null;rosterUi.detailUid=null;}
reset();var keep=addInstance('aquaron'),a=addInstance('freigal'),b=addInstance('freiwolf'),c=addInstance('elna_beginner');c.locked=false;
save.party=[keep.uid];save.homeFavoriteId=a.id;editingSkillUid=a.uid;expeditionSelectedUids=[a.uid,b.uid];save.equippedSkills[a.uid]=['s110_001'];save.items.kilo_data=3;save.items.mega_data=2;save.coins=10;saveGame();`);
const before=json('save');writes=0;
run('openRosterConfirmation([a.uid,b.uid,c.uid])');
assert.match(nodes.get('rosterSheetHost').innerHTML,/最後の1体/);assert.match(nodes.get('rosterSheetHost').innerHTML,/変換する/);
assert.equal(json('save').coins,10,'preview never changes resources');
assert(run('confirmRosterRecycle()'));assert.equal(writes,1,'exactly one primary save for all individuals');
assert.equal(json('save').items.kilo_data,7);assert.equal(json('save').coins,22);
assert.equal(json('save').instances.length,1);assert.equal(run('save.homeFavoriteId'),run('keep.id'));assert.equal(run('editingSkillUid'),null);assert.deepEqual(json('expeditionSelectedUids'),[]);
assert(!run('save.equippedSkills[a.uid]'));assert.deepEqual(json('save.skillCards'),before.skillCards);assert(run('save.caught.includes(a.id)&&save.itemDex.includes("kilo_data")'));
const committed=run('JSON.stringify(save)');assert(!run('performRosterRecycle([a.uid]).ok'));assert.equal(run('JSON.stringify(save)'),committed);
assert.equal(JSON.parse(storage.get('mb_v95c')).instances.length,1,'durable payload contains complete conversion');
assert.equal(run('parseAndPrepareSave(localStorage.getItem(SAVE_KEY),[]).coins'),22);
// Roll back the entire save, including item-dex registration and favourite changes.
for(const mode of ['quota','throw']){
 run(`reset();var keep=addInstance('aquaron'),a=addInstance('freigal'),b=addInstance('freiwolf');save.homeFavoriteId='freigal';save.equippedSkills[a.uid]=['s110_001'];editingSkillUid=a.uid;expeditionSelectedUids=[a.uid];saveGame();`);
 const raw=run('JSON.stringify(save)'),disk=storage.get('mb_v95c');writes=0;failStorage=mode==='quota';throwStorage=mode==='throw';
 assert(!run('performRosterRecycle([a.uid,b.uid]).ok'));failStorage=false;throwStorage=false;
 assert.equal(run('JSON.stringify(save)'),raw);assert.equal(storage.get('mb_v95c'),disk);assert.equal(run('editingSkillUid'),run('a.uid'));assert.deepEqual(json('expeditionSelectedUids'),[run('a.uid')]);assert.equal(writes,1);
 assert(run('performRosterRecycle([a.uid,b.uid]).ok'),'retry succeeds once storage recovers');
}
run(`reset();var a=addInstance('freigal'),b=addInstance('freigal'),c=addInstance('freigal',5),d=addInstance('freiwolf');`);
for(const setup of ['a.locked=true','save.party=[a.uid]','save.expeditions.active=[{memberUids:[a.uid],status:"complete"}]','selectedAlchemyCatalystUid=a.uid','alchemyBusy=true','pendingEvolutions=[{uid:a.uid}]','currentEvolution={uid:a.uid}','save.mapStories.grassland_whose.resume={phase:"battle",participantUids:[a.uid]}']){
 run(`a.locked=false;save.party=[];save.expeditions.active=[];selectedAlchemyCatalystUid='';alchemyBusy=false;pendingEvolutions=[];currentEvolution=null;save.mapStories.grassland_whose.resume=null;${setup}`);
 const raw=run('JSON.stringify(save)');writes=0;assert(!run('performRosterRecycle([b.uid,a.uid]).ok'),setup);assert.equal(writes,0);assert.equal(run('JSON.stringify(save)'),raw);
}
run(`save.mapStories.grassland_whose.resume=null;save.progress.tutorial.status='in_progress';save.progress.tutorial.completed=false;a.tutorialContract=true;`);
assert.match(run('rosterRecycleError(a)'),/チュートリアル/);run(`save.progress.tutorial.status='completed';save.progress.tutorial.completed=true;`);assert.equal(run('rosterRecycleError(a)'),'');
assert(!run('performRosterRecycle([b.uid,b.uid]).ok'));assert(!run('performRosterRecycle(["missing"]).ok'));assert(!run('performRosterRecycle([]).ok'));assert(!run('performRosterRecycle([b.uid],{identity:"other-profile"}).ok'));
run(`startRosterSelection();rosterUi.selected=new Set(save.instances.map(i=>i.uid));openRosterConfirmation();`);
assert.match(nodes.get('rosterSheetHost').innerHTML,/手持ちを0体にはできません/);assert.match(nodes.get('rosterSheetHost').innerHTML,/onclick="confirmRosterRecycle\(\)" disabled/);
assert(!run('confirmRosterRecycle()'));
run(`openRosterConfirmation([b.uid]);b.locked=true;`);assert(!run('confirmRosterRecycle()'),'confirmation never consumes a newly protected individual');
run(`b.locked=false;openRosterConfirmation([b.uid]);save.coins++;`);assert(!run('confirmRosterRecycle()'),'state changes require a fresh preview');
run(`startRosterSelection();setRosterView('filter','duplicates');rosterSelectVisible();`);
assert.deepEqual(json('[...rosterUi.selected]'),[run('b.uid'),run('a.uid')],'highest-level copy remains; newest sort only affects presentation');
run(`endRosterSelection();c.level=1;startRosterSelection();rosterUi.filter='duplicates';rosterSelectVisible();`);
assert(!run('rosterUi.selected.has(a.uid)'),'oldest copy survives a level tie');assert(run('rosterUi.selected.has(b.uid)&&rosterUi.selected.has(c.uid)'));
run('rosterSelectVisible()');assert.equal(run('rosterUi.selected.size'),0);
run(`setRosterView('sort','level');setRosterView('filter','star2');`);assert.deepEqual(json('rosterVisibleInstances().map(i=>i.id)'),['freiwolf']);
run(`rosterUi.identity=null;ensureRosterState();`);assert.equal(run('rosterUi.sort'),'level');assert.equal(run('rosterUi.filter'),'star2');
run(`rosterUi.filter='all';rosterUi.sort='oldest';`);assert.deepEqual(json('rosterVisibleInstances().map(i=>i.uid)'),json('save.instances.map(i=>i.uid)'));
const exp=run('Object.keys(MONSTER_RECYCLE_REWARDS).map(star=>{const r=MONSTER_RECYCLE_REWARDS[star];return r.count*ITEM_BY_ID[r.itemId].expAmount})');assert.deepEqual(Array.from(exp),[20,40,100,200,500]);
assert.deepEqual(json('Object.values(MONSTER_RECYCLE_REWARDS).map(r=>r.coins)'),[2,5,10,20,40]);
// A committed result remains committed if rendering the success UI fails.
run(`reset();addInstance('aquaron');var displayTarget=addInstance('freigal');openRosterConfirmation([displayTarget.uid]);var realRosterRender=renderParty;renderParty=()=>{throw Error('display failure')};`);
writes=0;assert(run('confirmRosterRecycle()'));assert.equal(writes,1);assert.equal(run('getInstance(displayTarget.uid)'),null);assert(!run('confirmRosterRecycle()'));assert.equal(writes,1);
run('renderParty=realRosterRender');
console.log('PASS monster roster: approved rewards, mixed batch/single confirmation, 1 save, quota rollback/retry, retained skill cards/dex, favourite and UID cleanup, protection checks, stale preview, 0-owned prevention, duplicates/ties, sorting/filter persistence/reload.');
