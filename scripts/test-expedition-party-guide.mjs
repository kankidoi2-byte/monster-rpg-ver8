import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('js/tutorial.js');
const names=new Set(['tutorialMonsterInLineage','tutorialExpeditionPartyReady','tutorialExpeditionPartyGuide']);
const helpers=parse(source,{ecmaVersion:'latest'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.has(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
const c=vm.createContext({save:null});
vm.runInContext(read('js/data.js'),c);
vm.runInContext(`function by(id){return M.find(m=>m.id===id)}
function getPartyInstances(){return save.party.map(uid=>save.instances.find(x=>x.uid===uid))}
function isInstanceOnExpedition(uid){return save.away.includes(uid)}
${helpers}`,c);
const guide=()=>vm.runInContext('tutorialExpeditionPartyGuide()',c);
let count=0;
for(const f of ['freigal','freiwolf'])for(const a of ['aquaron','highaquaron','shenhairon','tienhairon'])for(const e of ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen']){
 c.save={instances:[{uid:'f',id:f},{uid:'a',id:a},{uid:'e',id:e},{uid:'g',id:'galdra'},{uid:'x',id:'slime'},{uid:'a2',id:a}],party:['f','a','e'],away:[]};
 const before=JSON.stringify(c.save);assert.equal(guide().uid,'f');assert.equal(JSON.stringify(c.save),before,'guidance must not mutate the save');
 c.save.party=['a','e'];c.save=JSON.parse(JSON.stringify(c.save));assert.equal(guide().uid,'g','resume after removal');
 c.save.party.push('g');assert.equal(guide().uid,undefined);assert.equal(guide().blocked,undefined,'already ready');
 for(const wrong of [['f','x','a'],['a','a2','e'],[],['g'],['g','e']]){
  c.save.party=wrong.slice();let operations=0;
  while(guide().uid&&operations++<8){const uid=guide().uid;if(c.save.party.includes(uid))c.save.party=c.save.party.filter(x=>x!==uid);else{assert.ok(c.save.party.length<3);c.save.party.push(uid)}}
  assert.ok(operations<=6,'must converge without asking the player to dismiss the guide');
  assert.equal(vm.runInContext('tutorialExpeditionPartyReady()',c),true);
 }
 c.save.party=['a','e'];c.save.away=['g'];assert.equal(guide().blocked,true,'do not highlight an unavailable member');
 c.save.instances.push({uid:'g2',id:'galdra'});assert.equal(guide().uid,'g2','choose an available individual');
 c.save.instances=c.save.instances.filter(x=>x.id!=='galdra');assert.equal(guide().blocked,true,'do not invent missing members');
 count++;
}
console.log(`PASS ${count} evolution combinations: remove/add/save guidance, resume, wrong parties, duplicate lineages, unavailable and missing members, no save mutation.`);
