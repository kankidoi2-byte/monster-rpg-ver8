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
assert(run(`UpdateReleases.notices().every(n=>n.title==='アップデート（'+n.date.slice(5).split('-').map(Number).join('/')+'）')`));
assert.equal(run("UpdateReleases.giftTitle('8.0.6','2026-10-31T15:00:00Z')"),'アップデート報酬（11/22）','catalog date takes precedence');
assert.equal(run("UpdateReleases.giftTitle('99.0','2026-11-20T15:00:00Z')"),'アップデート報酬（11/21）','unknown receipt uses JST date');
assert.equal(run("UpdateReleases.giftTitle('99.0','2026-11-20T15:00:00')"),'アップデート報酬','timestamp without zone is not reliable');
assert.equal(run("UpdateReleases.giftTitle('99.0','2026-02-30T00:00:00Z')"),'アップデート報酬');
assert.equal(run("UpdateReleases.giftTitle('99.0',null)"),'アップデート報酬');
const index=fs.readFileSync('index.html','utf8');
const cacheVersion=index.match(/js\/update-releases\.js\?v=([^"]+)/)?.[1];
assert.equal(cacheVersion?.replace(/-hide-version-20261123$/,''),run('UpdateReleases.current'),'keep the latest internal release number in the cache token, allowing the one-time display migration suffix');
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
    ...(version==='8.1.0'?{extraRewards:[{kind:'coins',amount:25},{kind:'item',id:'max_potion',count:2}]}:{})}));
  for(const f of ['data','core','update-releases','save','gifts-data','gifts']){
    evalIn(f==='update-releases'?read(f).replace(/const UPDATE_RELEASES = \[[\s\S]*?\n\];/,'const UPDATE_RELEASES = '+JSON.stringify(rows)+';'):read(f));
  }
  return {evalIn,writeFail:value=>blockWrite=value,json:s=>JSON.parse(evalIn('JSON.stringify('+s+')'))};
}
let h=boot([currentBaseline]);
assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('[save.updateRewards.delivered,save.updateRewards.pending,save.coins]'),[currentBaseline,[],37]);

const versions=[currentBaseline,'8.0.6','8.1.0','9.0'];
const newPlayer=boot(versions,new Map());
assert(newPlayer.evalIn('saveStartupState()'));
assert.deepEqual(newPlayer.json('save.updateRewards'),{delivered:'9.0',pending:[]});

h=boot(versions);h.writeFail(true);
assert.equal(h.evalIn('saveStartupState()'),false);
assert.deepEqual(h.json('save.updateRewards'),{delivered:currentBaseline,pending:[]});
h.writeFail(false);assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('save.updateRewards.pending'),versions.slice(1));
assert.deepEqual(h.json('UpdateReleases.gifts(save.updateRewards).map(g=>[g.tier,g.until])'),[['small',null],['small',null],['small',null]]);
h.evalIn('save.progress.tutorial=tutorialSaveDefaults({legacy:true})');
h.writeFail(true);assert.equal(h.evalIn("commitGiftClaim(['update:9.0'],saveTransactionIdentity(),save).ok"),false);
assert.deepEqual(h.json('[save.coins,save.gBless.reserve,save.updateRewards.pending]'),[37,3,versions.slice(1)]);
h.writeFail(false);
const smallGift=[{kind:'coins',amount:100},{kind:'bless',amount:10}];
assert.deepEqual(h.json('UpdateReleases.gifts(save.updateRewards).map(g=>[g.key,g.title,g.rewards])'),[
  ['update:9.0','アップデート報酬（11/21）',smallGift],
  ['update:8.1.0','アップデート報酬（11/21）',[...smallGift,{kind:'coins',amount:25},{kind:'item',id:'max_potion',count:2}]],
  ['update:8.0.6','アップデート報酬（11/21）',smallGift]
]);
assert(h.evalIn("commitGiftClaim(UpdateReleases.gifts(save.updateRewards).map(g=>g.key),saveTransactionIdentity(),save).ok"));
assert.deepEqual(h.json('[save.coins,save.gBless.reserve,save.items.max_potion,save.items.revive_drop,save.giftClaimedIds,save.lifeQuestClaimedIds]'),[362,33,2,0,[],[]]);
h=boot(versions);assert(h.evalIn('saveStartupState()'));assert.deepEqual(h.json('save.updateRewards.pending'),[]);

// Pre-change receipt data remains byte-for-byte intact. Only views adapt its title.
const oldReceipt={key:'update:8.1.0',id:'8.1.0',source:'update',title:'Ver8.1.0 アップデート報酬',
  tier:'medium',letter:'既存の報酬',createdAt:'2026-11-20T15:00:00.000Z',receivedAt:new Date().toISOString(),
  until:null,rewards:[{kind:'coins',amount:500},{kind:'bless',amount:50}]};
h.evalIn('save.giftHistory='+JSON.stringify([oldReceipt])+';saveGame()');
h=boot(versions);
const legacyMarkup=h.evalIn('giftRow(giftHistoryEntries()[0],true)');
assert.match(legacyMarkup,/aria-label="アップデート報酬（11\/21）の詳細"/);
assert.match(legacyMarkup,/<strong>アップデート報酬（11\/21）<\/strong>/);
assert.doesNotMatch(legacyMarkup,/Ver\d/);
assert.deepEqual(h.json('save.giftHistory'),[oldReceipt]);
assert.deepEqual(h.json('save.updateRewards.pending'),[]);
assert.deepEqual(h.json('[save.coins,save.gBless.reserve]'),[362,33]);

h=boot([...versions,...march]);assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('save.updateRewards.pending'),march.slice(-20));
assert(h.evalIn("commitGiftClaim(['update:9.0.24'],saveTransactionIdentity(),save).ok"));
h=boot([...versions,...march]);assert(h.evalIn('saveStartupState()'));
assert.deepEqual(h.json('save.updateRewards.pending'),march.slice(4,-1));
assert.equal(h.evalIn("developerGiftEntries(Date.parse('2026-11-21T12:00:00+09:00')).length"),1);
console.log('PASS update reward save/claim: fresh and legacy profiles, skipped updates, failed writes, exact rewards, cap and no redelivery.');
