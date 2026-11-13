// Deterministic frame scheduler exercises the real renderer without a browser or GPU.
import vm from "node:vm";
import fs from "node:fs";
import assert from "node:assert/strict";
const files=['battle-skill-effects','battle-skill-specials','battle-skill-effect-map'];
const queue=new Map();
let token=0,connected=true,errors=[];
const math=Object.create(Math);
let seed=20261113;
math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient},{get:(o,k)=>o[k]??((...args)=>{if(args.some(x=>typeof x==='number'&&!Number.isFinite(x)))throw Error(k+':'+args);})});
const context=vm.createContext({
 Math:math, console:{error:(...x)=>errors.push(x)}, window:{devicePixelRatio:3}, navigator:{},
 document:{createElement:()=>({style:{},getContext:()=>ctx,setAttribute(){},get isConnected(){return connected;},remove(){connected=false;}})},
 requestAnimationFrame:fn=>{queue.set(++token,fn);return token;},cancelAnimationFrame:id=>queue.delete(id)
});
vm.runInContext(files.map(x=>fs.readFileSync(new URL('../js/'+x+'.js',import.meta.url),'utf8')).join('\n'),context);
const data=Object.entries(vm.runInContext('BATTLE_SKILL_EFFECT_MAP',context))
  .map(([skillId,profile])=>({skillId,...profile}));
assert.equal(data.length,110);
assert.equal(data.filter(x=>x.special).length,9);
const el=x=>({querySelector:()=>null,getBoundingClientRect:()=>({left:x,top:150,width:40,height:40}),style:{},isConnected:true});
const run=vm.runInContext('startBattleSkillEffect',context);
async function play(profile,short,reverse,interrupt=false){
 const stage={clientWidth:360,clientHeight:640,getBoundingClientRect:()=>({left:0,top:0,width:360,height:640}),append(){connected=true;}};
 const cleanupRegistry=new Set(), source=el(reverse?280:60),target=el(reverse?60:280);
 let contact,done=false;
 const fx=run({stage,source,target,profile,rate:short?1.6:1,short,cleanupRegistry});
 fx.contact.then(x=>{contact=x;});fx.tail.then(()=>{done=true;});
 for(let i=0;i<450&&!done;i++){
   if(interrupt&&i===4)fx.cleanup();
   for(const [id,frame] of Array.from(queue)){queue.delete(id);frame(i*16);}
   await new Promise(r=>setImmediate(r));
 }
 assert.equal(done,true,profile.skillId);
 assert.equal(contact,!interrupt,profile.skillId+JSON.stringify(errors));
 assert.equal(cleanupRegistry.size,0);
 assert.equal(queue.size,0);
 assert.equal(connected,false);
 assert.equal(errors.length,0,JSON.stringify(errors));
}
(async()=>{for(const profile of data){await play(profile,false,false);await play(profile,true,true);await play(profile,false,false,true);}console.log('110 skills × manual/reverse-short/interrupted: passed');})().catch(e=>{console.error(e);process.exitCode=1;});
