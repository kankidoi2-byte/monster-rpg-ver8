import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
const store=new Map(),requests=[],callbacks={};let tick;
const p={id:webcrypto.randomUUID(),token:'private-profile-token',name:'テスト',consent:false};
const ctx=vm.createContext({crypto:webcrypto,console,Date,AbortController,setTimeout,clearTimeout,navigator:{userAgentData:{getHighEntropyValues:async keys=>{assert.deepEqual(Array.from(keys),['model']);return {model:'SCG30'};}}},MonsterProfiles:{current:()=>p},save:{party:['unit'],instances:[{uid:'unit',id:'freigal',level:5}],equippedSkills:{unit:['skill_test']},history:{wins:3},progress:{tutorial:{stepId:'first_step',completed:false}}},selectedMap:{id:'grassland'},activeHuntRequest:{difficultyId:'normal'},battleTurnCount:4,multiBattle:null,enemy:{id:'slime'},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},document:{visibilityState:'visible',getElementById:()=>null,addEventListener:(k,v)=>callbacks[k]=v},addEventListener:(k,v)=>callbacks[k]=v,setInterval:f=>{tick=f;return 1;},show:()=>{},showBattleOutcome:()=>{},fetch:async(url,options)=>{requests.push({url,options});return {ok:true};}});
vm.runInContext(fs.readFileSync(new URL('../js/analytics.js',import.meta.url),'utf8'),ctx);
ctx.MonsterAnalytics.start();await new Promise(r=>setImmediate(r));
assert.equal(requests.length,1,'startup reports even with legacy consent=false');
assert.equal(JSON.parse(requests[0].options.body).events[0].type,'session_start');
assert.equal(typeof ctx.MonsterAnalytics.consentChanged,'undefined','no reporting off API');
ctx.show('home');ctx.showBattleOutcome({kind:'victory'});await new Promise(r=>setImmediate(r));
const batch=JSON.parse(requests.at(-1).options.body);
const battle=batch.events.find(e=>e.type==='battle_result');
assert.equal(battle.data.party[0].skills[0],'skill_test');assert.equal(battle.data.map,'grassland');assert.equal(batch.device.model,'SCG30');
assert(!('save' in batch));assert.equal(requests[0].options.credentials,'omit');
assert(!requests.some(r=>r.options.body.includes('RECORDS_READ_KEY')));
assert.equal(requests[0].url,'https://monster-battle-records.kanki-doi-2.chatgpt.site/api/events');
ctx.fetch=async()=>{throw Error('offline');};ctx.show('party');tick();await new Promise(r=>setImmediate(r));
const pending=JSON.parse(store.get(`mb_analytics_queue_${p.id}`));assert(pending.some(e=>e.type==='screen'&&e.data.screen==='party'),'offline queue retains activity');
ctx.fetch=async(url,options)=>{requests.push({url,options});return {ok:true};};await new Promise(r=>setTimeout(r,1));ctx.Date=class extends Date{static now(){return Date.now()+31000;}};tick();await new Promise(r=>setImmediate(r));
assert.equal(JSON.parse(store.get(`mb_analytics_queue_${p.id}`)).length,0,'successful retry drains queue');
const count=requests.length;ctx.MonsterProfiles.current=()=>null;tick();assert.equal(requests.length,count,'no upload without valid profile');
console.log('Automatic analytics: startup, legacy OFF, payload bounds, no off API, offline queue and retry PASS');

// Deterministic time, network and shared-storage regressions. No external requests.
const source=fs.readFileSync(new URL('../js/analytics.js',import.meta.url),'utf8');
const drain=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function tab(shared=new Map(),locks){
  let now=0,next=0,interval;const timers=new Map(),listeners={},calls=[];
  const user={id:'shared-profile',token:'test-token',name:'test'};
  const c=vm.createContext({
    crypto:webcrypto,AbortController,console,navigator:{locks},
    Date:class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},
    MonsterProfiles:{current:()=>user},save:{instances:[],history:{},progress:{}},
    localStorage:{getItem:k=>shared.get(k)??null,setItem:(k,v)=>shared.set(k,v)},
    document:{visibilityState:'visible',addEventListener:(k,f)=>listeners[k]=f},
    addEventListener:(k,f)=>listeners[k]=f,
    setInterval:f=>{interval=f;return 1;},
    setTimeout:(f,ms)=>{timers.set(++next,{f,at:now+ms});return next;},
    clearTimeout:id=>timers.delete(id),show(){},showBattleOutcome(){},
    fetch:(url,options)=>{calls.push({url,options,at:now});return Promise.reject(Error('offline'));},
  });
  vm.runInContext(source,c);
  return {c,calls,shared,listeners,get queue(){return JSON.parse(shared.get('mb_analytics_queue_shared-profile')||'[]');},
    async start(){c.MonsterAnalytics.start();await drain();},
    async advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.f();}await drain();},
    async tick(){interval();await drain();},
    async screen(name){c.show(name);await drain();},
    async visibility(value){c.document.visibilityState=value;listeners.visibilitychange();await drain();},
    async input(){listeners.pointerdown();await drain();},
    success(){c.fetch=(url,options)=>{calls.push({url,options,at:now});return Promise.resolve({ok:true});};},
  };
}
{
  const t=tab();t.c.fetch=(url,options)=>{t.calls.push({url,options});return new Promise(()=>{});};
  await t.start();assert.equal(t.calls.length,1);
  await t.advance(9999);assert.equal(t.calls[0].options.signal.aborted,false);
  await t.advance(1);assert.equal(t.calls[0].options.signal.aborted,true);
  assert(t.queue.length);t.success();await t.advance(30000);await t.tick();
  assert.equal(t.queue.length,0);assert.equal(t.calls.length,2);
  assert(t.calls.every(x=>x.options.keepalive));
}
{
  const t=tab();await t.start();
  for(const delay of [30000,60000,120000,240000,300000,300000]){
    const n=t.calls.length;await t.advance(delay-1);await t.tick();assert.equal(t.calls.length,n);
    await t.advance(1);await t.tick();assert.equal(t.calls.length,n+1);
  }
  t.success();await t.advance(300000);await t.tick();
  // Reset after successful transmission: a new failure waits only 30 seconds.
  t.c.fetch=(url,options)=>{t.calls.push({url,options});return Promise.reject(Error('offline'));};
  await t.screen('after-success');await t.tick();const n=t.calls.length;
  await t.advance(30000);await t.tick();assert.equal(t.calls.length,n+1);
}
for(const withLocks of [false,true]){
  const shared=new Map();let work=Promise.resolve(),lockCalls=0;
  const locks=withLocks?{request:(_key,f)=>{lockCalls++;return work=work.then(f);}}:undefined;
  const a=tab(shared,locks),b=tab(shared,locks);
  await a.start();await b.start();await b.screen('B');await a.screen('A');
  assert(a.queue.some(e=>e.data.screen==='A'));assert(a.queue.some(e=>e.data.screen==='B'));
  // Snapshot A's sent batch, then append B's record before A receives success.
  let resolve;
  a.c.fetch=(url,options)=>{a.calls.push({url,options});return new Promise(r=>resolve=r);};
  await a.advance(30000);await a.tick();await b.screen('B-unsent');resolve({ok:true});await drain();
  assert(a.queue.some(e=>e.data.screen==='B-unsent'));
  const sent=new Set(JSON.parse(a.calls.at(-1).options.body).events.map(e=>e.id));
  assert(a.queue.every(e=>!sent.has(e.id)));
  for(let i=0;i<110;i++){await b.advance(1);await b.screen('item-'+i);}
  assert.equal(b.queue.length,100);assert.equal(b.queue[0].data.screen,'item-10');
  assert.equal(new Set(b.queue.map(x=>x.id)).size,100);
  if(withLocks)assert(lockCalls>0);
}
{
  const t=tab();await t.start();await t.advance(20000);await t.visibility('hidden');
  assert.equal(t.queue.filter(e=>e.type==='active_time').reduce((n,e)=>n+e.data.seconds,0),20);
  await t.advance(50000);await t.tick();
  assert.equal(t.queue.filter(e=>e.type==='active_time').reduce((n,e)=>n+e.data.seconds,0),20);
  await t.visibility('visible');await t.input();await t.advance(10000);await t.visibility('hidden');
  assert.equal(t.queue.filter(e=>e.type==='active_time').reduce((n,e)=>n+e.data.seconds,0),30);
}
{
  const t=tab();await t.start();await t.advance(90000);await t.visibility('hidden');
  // Each settlement is capped at 30 seconds, and idle time after 60 seconds is excluded.
  assert.deepEqual(t.queue.filter(e=>e.type==='active_time').map(e=>e.data.seconds),[30]);
}
{
  const t=tab();await t.start();
  for(let i=0;i<3;i++){await t.advance(30000);await t.tick();}
  assert.equal(t.queue.filter(e=>e.type==='active_time').reduce((n,e)=>n+e.data.seconds,0),60);
  await t.visibility('hidden');
  assert.equal(t.queue.filter(e=>e.type==='active_time').reduce((n,e)=>n+e.data.seconds,0),60);
}
{
  const t=tab();await t.start();
  for(let i=0;i<20;i++){await t.advance(1000);await t.input();}
  assert.equal(t.queue.filter(e=>e.type==='active_time').length,0,'input does not flood the queue');
  t.listeners.pagehide();await drain();
  assert.equal(t.queue.filter(e=>e.type==='active_time').at(-1).data.seconds,20);
  await t.advance(50000);t.listeners.pageshow();await t.input();
  await t.advance(10000);await t.visibility('hidden');
  assert.equal(t.queue.filter(e=>e.type==='active_time').reduce((n,e)=>n+e.data.seconds,0),30,'pagehide/BFCache excludes time away');
}
console.log('SEC-03 A/B, SEC-04 A/B/C (with and without Web Locks), SEC-05 A/B/C PASS');
