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

const confirmBody={textContent:''};
const scrollIds=['contract_scroll','silver_contract_scroll','gold_contract_scroll','rainbow_contract_scroll'];
const scrollNames=['契約書','銀の契約書','金の契約書','虹の契約書'];
context.document.getElementById=id=>id==='contractConfirmText'?confirmBody:null;
context.ensureContractScrollItem=()=>{};
context.updateItemText=()=>{};
context.ITEM_BY_ID=Object.fromEntries(scrollIds.map((id,i)=>[id,{id,name:scrollNames[i],contract:true}]));
context.save.items=Object.fromEntries(scrollIds.map((id,i)=>[id,i+1]));
context.shouldGuaranteeTutorialContract=()=>false;
context.itemInlineVisual=()=>{throw Error('a plain text prompt must not request icon markup');};
vm.runInContext(itemsSource.slice(end),context,{filename:'contract-confirmation-copy.js'});
for(const [i,id] of scrollIds.entries()){
 context.pendingContractItemId=id;
 context.refreshContractScrollDisplay();
 assert.equal(confirmBody.textContent,`${scrollNames[i]}を1枚使用しますか？（所持：${i+1}枚）`);
}
context.shouldGuaranteeTutorialContract=()=>true;
context.pendingContractItemId='contract_scroll';
context.save.items.contract_scroll=0;
context.refreshContractScrollDisplay();
assert.match(confirmBody.textContent,/^契約書を1枚使用しますか？（所持：0枚） .*1枚支給.*必ず成功/);
console.log('PASS contract scroll confirmation: four selected names/counts, plain text only, tutorial grant preserved');
