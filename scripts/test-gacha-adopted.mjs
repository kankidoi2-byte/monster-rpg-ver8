import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();for(const file of ['soul-contract','skill-card-art','gacha-ui'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),r.context);
assert.equal(r.run('gachaPromotion(true,()=>.299999)'),true);assert.equal(r.run('gachaPromotion(true,()=>.3)'),false);assert.equal(r.run('gachaPromotion(false,()=>0)'),false);
for(const [id,tier] of [['rainbow_contract_scroll','rainbow'],['gold_contract_scroll','gold'],['silver_contract_scroll','silver'],['contract_scroll','silver'],['giga_data','silver'],['mega_data','normal']])assert.equal(r.run(`gachaItemTier('${id}')`),tier);
// Every catalog card can be rendered without mutation; only fang uses the supplied silhouette.
const before=r.run('JSON.stringify({save,catalog:SKILL110_CATALOG})');
for(const card of r.run('SKILL110_CATALOG')){
 const html=r.run(`tcgSkillCardMarkup(SKILL_BY_ID['${card.id}'])`),small=r.run(`tcgSkillCardMarkup(SKILL_BY_ID['${card.id}'],{compact:true})`);
 assert(html.includes(card.name)&&html.includes(card.desc||card.customDesc));assert.equal(html.includes('tcg-silhouette'),card.form==='fang');
 assert.equal(small.includes('tcg-description'),false);assert(!html.includes('undefined'));assert(html.includes(card.power===0?'補助':`威力 ${card.power}`));
}
assert.equal(r.run('JSON.stringify({save,catalog:SKILL110_CATALOG})'),before);
// The newly added ten-item purchase invokes the unchanged picker ten times and commits once.
r.run(`save=initSave();save.coins=1000;var picked=0,commits=0;pickGachaItem=()=>{picked++;return 'potion'};var originalCommit=commitSaveMutation;commitSaveMutation=fn=>{commits++;return originalCommit(fn)};renderItemGacha=()=>{};updateItems=()=>{};refreshGachaBanner=()=>{};var shown;playGachaCinema=(kind,result,entries)=>{shown={kind,result,entries}};rollItemGacha(10);`);
assert.equal(r.run('picked'),10);assert.equal(r.run('commits'),1);assert.equal(r.run('save.coins'),0);assert.equal(r.run('shown.entries.length'),10);assert.equal(r.run('shown.entries.filter(e=>e.isNew).length'),1);
const insufficient=r.run('JSON.stringify(save)');r.run('rollItemGacha(10)');assert.equal(r.run('JSON.stringify(save)'),insufficient);assert.equal(r.run('picked'),10);
r.run(`save=initSave();save.coins=1000;saveGame=()=>false;shown=null;`);const failure=r.run('JSON.stringify(save)');r.run('rollItemGacha(10)');assert.equal(r.run('JSON.stringify(save)'),failure);assert.equal(r.run('shown'),null);
for(const file of ['gacha-cinematic','soul-contract'])assert(!/\b(saveGame|addInstance|performCharacterGacha|pickCharacterGachaUnit|localStorage)\s*\(/.test(fs.readFileSync(`js/${file}.js`,'utf8')),'visual renderer must not transact');
console.log('PASS adopted gacha: 110 cards, fang/fallback, compact copy, promotion boundary, item tiers, ten-item atomic commit, shortage and save rollback');
