import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
function visual(classes,style=''){
 const attrs=new Map([['class',classes],...(style?[['style',style]]:[])]);
 return {nodeType:1,nodeName:'DIV',id:'enemy_bVis',innerHTML:'<img src="goblin.webp">',childNodes:[],
 classList:{contains:name=>attrs.get('class').split(' ').includes(name)},
 get attributes(){return [...attrs].map(([name,value])=>({name,value}))},
 hasAttribute:name=>attrs.has(name),getAttribute:name=>attrs.get(name),setAttribute:(name,value)=>attrs.set(name,value),removeAttribute:name=>attrs.delete(name)};
}
function check(source){
 const context=vm.createContext({});vm.runInContext(source,context);
 const node=visual('multi-enemy-visual battle-hit-impact battle-skill-cast','--battle-lunge-x: 14px');
 context.reconcileBattleNode(node,visual('multi-enemy-visual'));
 assert(node.classList.contains('battle-hit-impact'),'impact class survives HP update');
 assert(node.classList.contains('battle-skill-cast'),'cast class survives HP update');
 assert.equal(node.getAttribute('style'),'--battle-lunge-x: 14px');
}
const baseline=execFileSync('git',['show','ae3911ef02f0c0724ec0f2b13baa4d456414060c:js/battle-feedback.js'],{encoding:'utf8'});
assert.throws(()=>check(baseline),/impact class survives/);
check(fs.readFileSync('js/battle-feedback.js','utf8'));
console.log('PASS: baseline loses active impact; current renderer retains motion classes and coordinates');
