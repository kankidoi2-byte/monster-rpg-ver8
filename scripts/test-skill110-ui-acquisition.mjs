import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context=vm.createContext({console,Math});
for(const file of ['data','core','skill-gacha','skill-dex'])vm.runInContext(read(`js/${file}.js`),context,{filename:file});
context.save={coins:1000000,skillCards:{}};
const run=code=>vm.runInContext(code,context);
const cards=run("skillGachaPool('monster')");
assert.equal(cards.length,106);
assert.equal(run("skillGachaPool('character').map(s=>s.id).join(',')"),cards.map(s=>s.id).join(','));
assert(cards.every(card=>card.cost<=20&&card.acquisition!=='synthesis'));
const rates=run("skillGachaRates('monster')");
for(const [min,max,expected] of [[1,5,.8],[6,10,.17],[11,20,.03]])assert(Math.abs(rates.filter(r=>r.cost>=min&&r.cost<=max).reduce((n,r)=>n+r.rate,0)-expected)<1e-10);
// Every normal card can be deterministically selected, including all 16 super skills.
for(const row of rates)for(let index=0;index<row.cards.length;index++){
 const previous=rates.filter(r=>r.cost<row.cost).reduce((n,r)=>n+r.rate,0);
 context.draws=[previous+row.rate/2,(index+.5)/row.cards.length];
 assert.equal(run("pickSkillGachaCard('monster',1,()=>draws.shift()).id"),row.cards[index].id);
}
const ten=run("performSkillGacha('monster',10,()=>0)");assert(ten.ok);assert.equal(ten.cards.length,10);assert(ten.cards.some(s=>s.cost>=6));assert.equal(context.save.coins,999100);
context.save.coins=0;const before=JSON.stringify(context.save);assert.equal(run("performSkillGacha('monster',1).ok"),false);assert.equal(JSON.stringify(context.save),before);
assert.equal(run('skillDexEntries().length'),110);
for(const [tier,n] of [['低級',60],['上級',30],['超級',16],['最強',4]]){context.tier=tier;assert.equal(run('skillDexQueryEntries({tier}).length'),n);}
assert.equal(run("skillDexQueryEntries({cost:'25'}).length"),4);
const html=read('index.html'),css=read('css/skill-dex.css');
assert(html.includes('id="skillSynthesis"'));assert(html.includes('<option value="25">25</option>'));
assert(html.indexOf('src="js/skill-synthesis.js?')<html.indexOf('src="js/skill-synthesis-ui.js?'));
assert(css.includes('minmax(min(100%,300px),1fr)'));assert(css.includes('min-height:48px'));
console.log('PASS skill110 acquisition reachability, exclusion, exact rates, guarantee, dex tiers and mobile layout contracts (not browser visual verification)');
