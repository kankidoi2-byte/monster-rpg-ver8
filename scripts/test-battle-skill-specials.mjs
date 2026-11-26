import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../js/battle-skill-specials.js',import.meta.url),'utf8');
const special=vm.runInNewContext(code+'\nBATTLE_SKILL_SPECIALS');
const expected=new Map([[95,130],[103,140],[104,165],[105,170],[106,120],[107,150],[108,110],[109,null],[110,null]]);
(async()=>{
  for(const short of [false,true]) for(const reversed of [false,true]) {
    const called=[];
    const P={x:0,y:0,sx:1,sy:1,flash:0,glow:0};
    const EN={...P};
    const fx={
      P,EN,EL:{fire:{c:'fire-light',g:'fire-dark'},dark:{c:'dark-light',g:'dark-dark'}},
      E_:{inOut(){},out(){},inQ(){},back(){},elastic(){}},R:(a,b)=>(a+b)/2,
      center:(e,y=.5)=>({x:(e===P)!==reversed?80:240,y:200*y}),
      dirPE:()=>({x:reversed?-1:1,y:0,L:160}),
      tw:async(o,values)=>Object.assign(o,values),
      wait:async(ms)=>{called.push(['wait',ms]);fx.clock+=ms;},
      hitStop:async(ms)=>called.push(['stop',ms]),
      get gTime(){return fx.clock;},clock:0,active:true,
      impact:async(...args)=>called.push(['impact',...args]),
      backTo:async()=>{},flashO:{},addP:p=>{called.push(['particle',p.type]);fx.parts.push(p);return p;},
      elP:()=>{},burst:(...x)=>called.push(['burst',...x]),ring:()=>{},ringIn:()=>{},slash:()=>{},inward:()=>{},
      tag:(p,label)=>called.push(['tag',label]),cracks:()=>{},orbitP:()=>{},
      spStart:async(...args)=>called.push(['spStart',short,...args]),spEnd:()=>called.push(['spEnd']),
      proj:o=>{called.push(['projectile',o]);return {...o};},unproj:()=>{},parts:[],
      FXS:{recoil:async()=>called.push(['recoil'])}, contact:()=>called.push(['contact']),
      CW:320,CH:400,shake:()=>{},cueHpDelta:label=>called.push(['hpCue',label])
    };
    const all=special(fx);
    assert.deepEqual(Object.keys(all).map(Number),[...expected.keys()]);
    for(const [id,stop] of expected) {
      called.length=0;fx.parts.length=0;fx.clock=0;
      await all[id]({n:id,name:'試験技'});
      const hits=called.filter(x=>x[0]==='impact');
      const contacts=called.filter(x=>x[0]==='contact');
      assert.equal(hits.length+(contacts.length),1);
      if(stop!==null){
        assert.equal(hits[0][4].stop,stop);
        assert.equal(hits[0][3].x,reversed?-1:1);
        assert.equal(hits[0][4].dmg,undefined);
      }
      if(id===106){
        assert.equal(called.filter(x=>x[0]==='projectile').length,16);
        assert.equal(called.filter(x=>x[0]==='particle'&&x[1]==='circle').length,7);
      }
      if(id===108){
        assert.equal(called.filter(x=>x[0]==='projectile').length,14);
        assert.equal(called.at(called.findLastIndex(x=>x[0]==='projectile')+1)[0],'wait');
        const arrival=called.findIndex(x=>x[0]==='hpCue');
        assert.ok(arrival>called.findLastIndex(x=>x[0]==='projectile'));
        assert.equal(called[arrival][1],'drain');
      }
      if(id===110) assert.equal(called.some(x=>x[0]==='particle'&&x[1]==='clock'),true);
      assert.equal(called.filter(x=>x[0]==='spStart').length,1);
      assert.equal(called.filter(x=>x[0]==='spEnd').length,1);
    }
  }
  console.log('9 dedicated choreographies x manual/short x both directions passed');
})().catch(err=>{console.error(err);process.exitCode=1});
