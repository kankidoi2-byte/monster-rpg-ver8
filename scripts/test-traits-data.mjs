import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({console});
for(const file of ['data','traits-data','monster-status'])vm.runInContext(fs.readFileSync(`js/${file}.js`,'utf8'),context);
const expected={};
const add=(id,...traits)=>expected[id]=traits;
const line=(ids,a,b)=>{add(ids[0],a);add(ids[1],a,b);add(ids[2],b+'+');};
line(['grassbeat','thornbeat','granbeat'],'芽吹き','重甲殻');
line(['volteck','spaquinn','voltax'],'帯電','雷鳴の一番槍');
line(['nocle','noclaid','noxvelg'],'夜滑り','月喰らい');
line(['luxseed','luxiard','lux_galdion'],'朝光の分け与え','守護の光翼');
line(['sylphin','zephyray','tempestray'],'ひらり','暴風翼');
line(['orcana','orca_stream','orca_abyss'],'蒼海の流れ','深海の主');
line(['nemes','nemesia','nemesion'],'星の芽','銀河裂き');
add('doom_nemesion','銀河裂き');
for(const [a,b,name] of [['freigal','freiwolf','燃える闘志'],['rikasheef','seralphia','若葉の生命力'],['volmoog','gran_volmoog','大地砕き'],['kimeragna','kimeragna_apex','猛毒の翼']]){add(a,name);add(b,name+'+');}
add('aquaron','水辺の構え');add('highaquaron','水辺の構え','竜の水脈');add('shenhairon','神海の王威+');add('tienhairon','天海の恵み+');
line(['elysia','elysia_prayer','hikari'],'やさしい光','祈りの加護');
line(['stella_apprentice','stella_wizard','stella_sorcerer'],'ひらめき詠唱','星辰の知識');
line(['lumina_apprentice','lumina_wizard','lumina_sorcerer'],'静かな詠唱','星の術式');
for(const [id,a,b] of [
 ['brigitte','大盾の構え','城塞の誓い'],['tobia','逃げ足','天路の脚'],['roden','武器の手直し','炉の熱'],['selene','診たて','命泉'],
 ['safira','熱風の一突き','旅路を守る槍'],['bordo','台所の知恵','司厨の腕'],['lize','小銭好き','契約の札'],['regus','呪鉄の代償','断呪の刃'],
 ['remnes','借り物の記憶','星鎧'],['nico','試作の罠','蒼雷の仕掛け'],['mireille','華やかな舞台','幻惑の幕']
])line([2,3,4].map(r=>`character_${id}_${r}`),a,b);
line(['elna_beginner','elna_middle','elna_advanced'],'駆け出しの心得','磨いた剣技');
add('elna_water','流水の型+');add('elna_kaen','華炎の型+');
add('character_vera_3','起動');add('character_vera_4','起動','黒炎');add('character_vera_5','黒炎');
for(const [id,name] of [['slime','ぷるぷるボディ'],['goblin','どこにでもいる'],['slime_gold','黄金のしずく'],['nightmare','影潜み'],['icegolem','凍てつく体'],['proto_icegolem','魔力核'],['suiren','水鏡'],['tsubaki','火花の舞'],['ignaros','溶岩の鎧'],['astralepis','星集め'],['galdra','懸命な翼'],['alchemion','錬成核'],['ashleia','上昇気流'],['morglum','菌糸の根']])add(id,name);
add('elixion');add('false_dragon_alfa');
const read=expr=>JSON.parse(vm.runInContext(`JSON.stringify(${expr})`,context));
assert.equal(Object.keys(expected).length,100);
assert.deepEqual(read('M.map(m=>m.id).sort()'),Object.keys(expected).sort());
for(const [id,names] of Object.entries(expected)){
 const traits=read(`traitsForSpecies(${JSON.stringify(id)})`);
 assert.deepEqual(traits.map(t=>t.name),names,id);
 assert(traits.length<=2,id);
 for(const t of traits){
  assert.equal(typeof t.description,'string');assert(!/[0-9０-９%％×]/.test(t.description),id);
  assert(Number.isFinite(t.value),id);assert(read(`Boolean(TRAIT_TYPES[${JSON.stringify(t.type)}])`),id);
 }
}
for(const id of ['unknown_future_species','__proto__','constructor'])assert.deepEqual(read(`traitsForSpecies(${JSON.stringify(id)})`),[]);
assert.deepEqual(read('traitsForSpecies(null)'),[]);
assert.equal(read('traitValue("unknown","regen",0)'),0);
assert.equal(read('traitValue("granbeat","hard_guard",1)'),.85);
assert.equal(read('traitValue("hikari","purify")'),2);
assert.equal(read('traitsForSpecies("doom_nemesion")[0].remnant'),true);
assert.equal(read('traitsForSpecies("character_vera_5")[0].remnant'),true);
assert.equal(read('traitsForSpecies("volteck")[0].status'),'paralysis');
assert.equal(read('traitsForSpecies("kimeragna_apex")[0].status'),'poison');
assert.equal(read('traitsForSpecies("character_mireille_4")[0].status'),'confusion');
vm.runInContext(`function rosterEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}`,context);
for(const id of Object.keys(expected)){
 const html=vm.runInContext(`monsterStatusTraitsHtml({id:${JSON.stringify(id)}})`,context);
 if(!expected[id].length)assert.equal(html,'');else {assert.match(html,/特性/);assert(!/[0-9０-９%％×]/.test(html.replace(/<[^>]*>/g,'')));}
}
const oldSave=JSON.stringify({instances:[{uid:'old',id:'grassbeat',level:1,exp:0}]});
context.oldSave=oldSave;
assert.equal(vm.runInContext(`const loaded=JSON.parse(oldSave);monsterStatusTraitsHtml(loaded.instances[0]);JSON.stringify(loaded)`,context),oldSave);
assert.match(vm.runInContext('monsterStatusTraitsHtml({id:"doom_nemesion"})',context),/名残/);
vm.runInContext(`traitsForSpecies=()=>[{name:'<img src=x>',description:'<script>bad</script>',remnant:false}]`,context);
const escaped=vm.runInContext('monsterStatusTraitsHtml({id:"x"})',context);assert(!escaped.includes('<img'));assert(!escaped.includes('<script>'));
const status=fs.readFileSync('js/monster-status.js','utf8');assert(status.indexOf('monsterStatusTraitsHtml(ins)}')<status.indexOf('<div class="status-skill-heading">'));
const roadmap=vm.createContext({});vm.runInContext(fs.readFileSync('js/roadmap-data.js','utf8'),roadmap);
assert.match(fs.readFileSync('js/roadmap-data.js','utf8'),/id:'traits',lane:'sys',stage:'now',wip:true,title:'特性'/);
console.log('Traits: all 100 adopted assignments, current-form lookup, names/remnants, safe number-free status UI, unchanged old saves.');
