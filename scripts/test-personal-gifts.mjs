import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const p={id:'p1',token:'t1'},calls=[];
let response={gifts:[]},fail=false,hold=null;
const c=vm.createContext({console,Math,Date,Intl,AbortController,setTimeout,clearTimeout,setInterval(){},addEventListener(){},window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null}},MonsterProfiles:{current:()=>({...p}),available:()=>true,beforeSave:()=>true},fetch:async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});if(hold)await hold;if(fail)throw Error('offline');return Response.json(url.endsWith('/pending')?response:{ok:true});}});
for(const path of ['js/data.js','js/core.js','js/gifts-data.js','js/gifts.js','js/personal-gifts.js'])vm.runInContext(fs.readFileSync(path,'utf8'),c,{filename:path});
const run=s=>vm.runInContext(s,c);
run("globalThis.save={coins:0,items:{},giftClaimedIds:[],giftHistory:[],progress:{tutorial:{completed:true}}}; DEV_GIFTS.splice(0); globalThis.pendingLifeQuestRewards=()=>[]; globalThis.saveTransactionIdentity=()=> 'id'; globalThis.captureSaveTransaction=()=>JSON.stringify(save); globalThis.rollbackSaveTransaction=raw=>{save=JSON.parse(raw);}; globalThis.saveGame=()=>true;");
const gift={id:'pg-test',profileId:'p1',feedbackId:'fb1',type:'auto',title:'お礼<script>',letter:'<script>never</script>',rewards:[{kind:'coins',amount:500}],createdAt:'2026-11-13T00:00:00Z',claimedAt:null};
assert.equal(c.PersonalGifts.accept(gift,'p1'),true);assert.equal(run('pendingGifts().length'),1);
for(const changed of [{profileId:'p2'},{id:'global-id'},{title:'x'.repeat(201)},{letter:'x'.repeat(5001)},{claimedAt:'2026-11-13'},{rewards:[{kind:'skill',id:'missing',count:1}]},{rewards:[{kind:'bless',amount:1}]},{rewards:[{kind:'coins',amount:0}]},{rewards:[null]},{rewards:[3]},{rewards:[]},{createdAt:'invalid'}])assert.equal(c.PersonalGifts.accept({...gift,...changed},'p1'),false);
assert(run('giftDeveloperErrors({id:"pg-forbidden"}).includes("id")'));
const before=run('JSON.stringify(save)');run('saveGame=()=>false');assert.equal(run('commitGiftClaim(["developer:pg-test"],"id",save).ok'),false);assert.equal(run('JSON.stringify(save)'),before);assert.equal(run('pendingGifts().length'),1);
run('saveGame=()=>true');assert.equal(run('commitGiftClaim(["developer:pg-test"],"id",save).ok'),true);assert.equal(run('save.coins'),500);assert.equal(run('save.giftClaimedIds[0]'),'pg-test');assert.equal(run('commitGiftClaim(["developer:pg-test"],"id",save).ok'),false);
run('save.giftHistory=[]');assert.equal(run('pendingGifts().length'),0,'history purge never removes receipt');
response={gifts:[gift]};fail=true;await c.PersonalGifts.sync();assert.equal(run('save.coins'),500);fail=false;await c.PersonalGifts.sync();assert(calls.some(x=>x.url.endsWith('/claimed')&&x.body.ids[0]==='pg-test'));
assert(calls.every(x=>x.body.profileId==='p1'&&x.body.token==='t1'));assert.equal(run('pendingGifts().length'),0);
// Late network response and feedback success from a previous profile cannot pollute the new one.
let release;hold=new Promise(r=>{release=r});const job=c.PersonalGifts.sync();p.id='p2';p.token='t2';run('save={coins:9,giftClaimedIds:[],giftHistory:[]}');release();await job;hold=null;assert.equal(c.PersonalGifts.entries().length,0);assert.equal(c.PersonalGifts.accept(gift,'p1'),false);assert.equal(run('save.coins'),9);
response={gifts:[{...gift,profileId:'p2'},{...gift,profileId:'p2'}]};await c.PersonalGifts.sync();assert.equal(c.PersonalGifts.entries().length,0,'duplicate server rows not accepted');
response={gifts:[{...gift,id:'pg-invalid',profileId:'p2',rewards:[null]},{...gift,profileId:'p2'}]};await c.PersonalGifts.sync();assert.equal(c.PersonalGifts.entries().length,1);
response={gifts:[]};await c.PersonalGifts.sync();assert.equal(c.PersonalGifts.entries().length,0,'authoritative empty inbox clears stale gifts');
assert(c.PersonalGifts.accept({...gift,profileId:'p2'},'p2'));
run('save={coins:9,giftClaimedIds:[],giftHistory:[]}');assert.equal(c.PersonalGifts.entries().length,0,'replaced save invalidates transient inbox');
// A pending request begun before feedback acceptance must not erase that new gift.
response={gifts:[]};hold=new Promise(r=>{release=r});const older=c.PersonalGifts.sync();assert(c.PersonalGifts.accept({...gift,id:'pg-new',profileId:'p2'},'p2'));release();await older;hold=null;assert.equal(c.PersonalGifts.entries()[0].id,'pg-new');
const catalog=JSON.parse(fs.readFileSync('data/gift-catalog.json'));assert.equal(catalog.schemaVersion,1);assert.equal(new Set(catalog.rewards.map(r=>r.kind+':'+r.id)).size,catalog.rewards.length);
for(const r of catalog.rewards){c.reward=r;assert(run(`giftRewardValid(reward.kind==='coins'?{kind:'coins',amount:1}:['monster','character'].includes(reward.kind)?{...reward,level:1}:{...reward,count:1})`));assert.equal(r.name,run('giftRewardName(reward)'));}
console.log('PASS personal gifts: schema, profile isolation, stale fetch, permanent receipts, failed save rollback, repeat claim, ACK retry, catalog names/IDs.');
