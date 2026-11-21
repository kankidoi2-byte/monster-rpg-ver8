import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,setInterval(){},window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null}}});
for(const f of ['data','core','update-releases','gifts-data','gifts'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),context,{filename:f});
const run=source=>vm.runInContext(source,context);
assert(run('UPDATE_RELEASES.length>=1'));
assert(run(`UPDATE_RELEASES.every((r,i,rows)=>UpdateReleases.parts(r.version)&&
  Number.isFinite(giftDateStart(r.date))&&typeof r.change==='string'&&r.change.trim()&&!/[\\r\\n]/.test(r.change)&&
  (r.extraRewards===undefined||Array.isArray(r.extraRewards)&&r.extraRewards.every(giftRewardValid))&&
  (!i||UpdateReleases.compare(rows[i-1].version,r.version)<0&&rows[i-1].date<=r.date))`),
  'release history needs increasing unique versions, non-decreasing JST dates, one-line notes and valid reward IDs');
assert(run(`[{kind:'item',id:'max_potion',count:1},{kind:'item',id:'revive_drop',count:1}].every(giftRewardValid)`));
const index=fs.readFileSync('index.html','utf8');
assert.equal(index.match(/js\/update-releases\.js\?v=([^"]+)/)?.[1],run('UpdateReleases.current'),'bump the cache version in index.html to match the last release');
assert(index.indexOf('js/update-releases.js')<index.indexOf('js/save.js'));
assert.equal(run("UpdateReleases.compare('9.0','9.0.0')"),0);
assert(run("UpdateReleases.compare('8.0.10','8.0.9')>0"));
assert.equal(run("UpdateReleases.parts('8.0.01')"),null);
const future=run("UpdateReleases.advance({delivered:'100.0.1',pending:['100.0.1']})");
assert.equal(future.delivered,'100.0.1');assert.equal(future.pending[0],'100.0.1');
console.log('PASS update release history: version order, date, one-line notice, official items, optional rewards, cache version and downgrade.');

// Exercise the actual save and receipt paths at several artificial versions,
// each time using a fresh JS context over the same isolated storage map.
const read=f=>fs.readFileSync('js/'+f+'.js','utf8');
const currentBaseline=run('UPDATE_RELEASES[0].version');
const march=Array.from({length:24},(_,i)=>'9.0.'+(i+1));
const seed={schemaVersion:4,coins:37,gBless:{reserve:3}};
const storage=new Map([['mb_v95c',JSON.stringify(seed)]]);
function boot(versions,store=storage){
  let blockWrite=false;
  const c=vm.createContext({console,structuredClone,setInterval(){},alert(){},
    window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null;}},
    localStorage:{getItem:key=>store.get(key)??null,setItem(key,value){if(blockWrite&&key==='mb_v95c')throw Error('blocked');store.set(key,value);}}});
  const evalIn=s=>vm.runInContext(s,c);
  const rows=versions.map(version=>({version,date:'2026-11-21',change:'変更 '+version,
    ...(version==='8.1.0'?{extraRewards:[{kind:'coins',amount:25}]}:{})}));
  for(const f of ['data','core','update-releases','save','gifts-data','gifts']){
    evalIn(f==='update-releases'?read(f).replace(/const UPDATE_RELEASES = \[[\s\S]*?\n\];/,'const UPDATE_RELEASES = '+JSON.stringify(rows)+';'):read(f));
  }
  return {evalIn,writeFail:value=>blockWrite=value,json:s=>JSON.parse(evalIn('JSON.stringify('+s+')'))};
}
let h=boot([currentBaseline]);
assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('[save.updateRewards.delivered,save.updateRewards.pending,save.coins]'),[currentBaseline,[],37]);

const versions=[currentBaseline,'8.0.3','8.1.0','9.0'];
const newPlayer=boot(versions,new Map());
assert(newPlayer.evalIn('saveStartupState()'));
assert.deepEqual(newPlayer.json('save.updateRewards'),{delivered:'9.0',pending:[]});

h=boot(versions);h.writeFail(true);
assert.equal(h.evalIn('saveStartupState()'),false);
assert.deepEqual(h.json('save.updateRewards'),{delivered:currentBaseline,pending:[]});
h.writeFail(false);assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('save.updateRewards.pending'),versions.slice(1));
assert.deepEqual(h.json('UpdateReleases.gifts(save.updateRewards).map(g=>[g.tier,g.until])'),[['large',null],['medium',null],['small',null]]);
h.evalIn('save.progress.tutorial=tutorialSaveDefaults({legacy:true})');
h.writeFail(true);assert.equal(h.evalIn("commitGiftClaim(['update:9.0'],saveTransactionIdentity(),save).ok"),false);
assert.deepEqual(h.json('[save.coins,save.gBless.reserve,save.updateRewards.pending]'),[37,3,versions.slice(1)]);
h.writeFail(false);
assert(h.evalIn("commitGiftClaim(UpdateReleases.gifts(save.updateRewards).map(g=>g.key),saveTransactionIdentity(),save).ok"));
assert.deepEqual(h.json('[save.coins,save.gBless.reserve,save.items.max_potion,save.items.revive_drop,save.giftClaimedIds,save.lifeQuestClaimedIds]'),[2662,263,1,1,[],[]]);
h=boot(versions);assert(h.evalIn('saveStartupState()'));assert.deepEqual(h.json('save.updateRewards.pending'),[]);

h=boot([...versions,...march]);assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('save.updateRewards.pending'),march.slice(-20));
assert(h.evalIn("commitGiftClaim(['update:9.0.24'],saveTransactionIdentity(),save).ok"));
h=boot([...versions,...march]);assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('save.updateRewards.pending'),march.slice(4,-1));
assert.equal(h.evalIn("developerGiftEntries(Date.parse('2026-11-21T12:00:00+09:00')).length"),1);
console.log('PASS update reward save/claim: fresh and legacy profiles, skipped updates, failed writes, exact rewards, cap and no redelivery.');
