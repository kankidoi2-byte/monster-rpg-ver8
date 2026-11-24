import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8'),context);
const core=fs.readFileSync(new URL('../js/core.js',import.meta.url),'utf8');
vm.runInContext(core.slice(core.indexOf('function itemDexVisual('),core.indexOf('function by(')),context);
const expected={raptor_feather:'猛禽の羽',fine_raptor_feather:'上質な猛禽の羽',venom_carapace:'毒虫の甲殻',fine_venom_carapace:'上質な毒虫の甲殻',golden_land_map:'黄金郷への地図',g_ichor:'G-ICHOR',god_core:'神核'};
for(const [id,name] of Object.entries(expected)){
 const result=vm.runInContext(`(()=>{const it=[...SHOP_ITEMS,...ITEM_DEX_EXTRA].find(x=>x.id==='${id}');return {name:it.name,src:ITEM_IMG[it.id],dex:itemDexVisual(it),locked:itemDexVisual(it,true),inline:itemInlineVisual(it)};})()`,context);
 assert.equal(result.name,name);
 assert.equal(result.src,`images/items/${id}_art_v1.webp`);
 const bytes=fs.readFileSync(new URL('../'+result.src,import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes.length<=300*1024);
 if(id==='god_core'){
  assert.equal(bytes.toString('ascii',12,16),'VP8X');assert.equal(bytes[20]&0x10,0x10);
  assert.equal(bytes.readUIntLE(24,3)+1,768);assert.equal(bytes.readUIntLE(27,3)+1,768);
 }
 for(const html of [result.dex,result.inline]){assert(html.includes(`src="${result.src}"`));assert(html.includes(`alt="${name}"`));}
 assert(!result.locked.includes('<img'));assert.match(result.locked,/aria-label="未登録">未<\/div>/);
}
assert.equal(vm.runInContext("itemInlineVisual({id:'unknown',icon:'📦'})",context),'📦');
console.log('Item artwork: seven exact mappings, WebP budgets, shared visuals, locked entries and fallback passed.');
