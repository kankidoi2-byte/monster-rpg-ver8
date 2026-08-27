import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const itemsSource=fs.readFileSync(new URL('../js/items.js',import.meta.url),'utf8');
const start=itemsSource.indexOf('function renderSingleBattleContractPanel');
const end=itemsSource.indexOf('function refreshContractScrollDisplay',start);
assert(start>=0&&end>start,'post-battle contract renderer must exist');

const actions={innerHTML:''};
const context=vm.createContext({
  document:{getElementById:id=>id==='battleOutcomeActions'?actions:null},
  multiBattle:null,
  battleRewardGranted:true,
  singleBattleContractAttempted:false,
  enemy:{id:'test_monster',name:'テストモンスター',contractable:true},
  SHOP_ITEMS:[{id:'contract_scroll',contract:true}],
  save:{items:{contract_scroll:1}},
  isContractableUnit:unit=>unit?.contractable!==false
});
vm.runInContext(itemsSource.slice(start,end),context,{filename:'post-battle-contract-renderer.js'});

context.renderSingleBattleContractPanel();
assert.match(actions.innerHTML,/テストモンスターと契約/,'a defeated contractable monster must appear after victory');

context.singleBattleContractAttempted=true;
context.renderSingleBattleContractPanel();
assert.match(actions.innerHTML,/契約判定は完了/,'a completed attempt must not offer a retry');

context.singleBattleContractAttempted=false;
context.save.items.contract_scroll=0;
context.renderSingleBattleContractPanel();
assert.match(actions.innerHTML,/契約書を持っていません/,'the result screen must explain when no scroll is available');

context.enemy={id:'character',name:'契約不可',contractable:false};
context.renderSingleBattleContractPanel();
assert.match(actions.innerHTML,/この相手とは契約できません/,'non-contractable opponents must remain excluded');

const tryStart=itemsSource.indexOf('async function tryContractWithScroll');
const tryEnd=itemsSource.indexOf('function tryCatch',tryStart);
const singleAttemptSource=itemsSource.slice(tryStart,tryEnd);
assert.match(singleAttemptSource,/singleBattleContractAttempted = true/,'a normal battle must consume its sole attempt before resolving');
assert.doesNotMatch(singleAttemptSource,/goNextBattleAfterContract\(\)/,'success and failure must remain on the outcome screen');

console.log('Post-battle contract validation passed (victory-only offer, one attempt, exclusions, and no automatic advance).');
