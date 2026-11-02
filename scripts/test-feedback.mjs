import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
// Small DOM implements actual form construction and events without a remote service.
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.className='';this.textContent='';this.value='';this.classList={contains:c=>this.className.split(' ').includes(c),toggle:(c,on)=>{this.className=this.className.split(' ').filter(x=>x!==c).concat(on?[c]:[]).join(' ');}};}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(k,v){this.attrs[k]=v;}querySelector(sel){const match=n=>sel.startsWith('#')?n.id===sel.slice(1):sel.startsWith('.')?n.className.split(' ').includes(sel.slice(1)):n.tag===sel;for(const c of this.children){if(match(c))return c;const found=c.querySelector(sel);if(found)return found;}return null;}
}
const code=fs.readFileSync('js/feedback.js','utf8');
function setup(storage=new Map(),which=0){
 const profiles=[0,1].map(n=>({id:'profile-'+n,name:'枠'+n,token:'token-'+n}));let selected=which,mode=200,calls=[];const host=new Node();host.id='feedbackBox';host.className='active';const newTag=new Node(),menu=new Node(),events={};
 const document={createElement:t=>new Node(t),getElementById:id=>id==='feedbackBox'?host:id==='feedbackNew'?newTag:id==='feedbackMenuButton'?menu:null};
 const context=vm.createContext({document,crypto:{randomUUID},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{userAgent:'Android',locks:{request:async(_k,fn)=>fn()}},MonsterProfiles:{current:()=>profiles[selected],available:()=>true},MonsterAnalytics:{feedbackDevice:()=>({model:'SCG30'})},save:{progress:{tutorial:{stepId:'step42'}}},setTimeout,clearTimeout,Date,AbortController,show:()=>{},addEventListener:(k,fn)=>{events[k]=fn;},fetch:async(_url,opts)=>{calls.push(JSON.parse(opts.body));if(mode==='offline')throw Error('offline');return Response.json(mode===429?{retryAt:new Date(Date.now()+86400000).toISOString()}:{accepted:1},{status:mode});}});
 vm.runInContext(code,context);const api=context.MonsterFeedback;const open=(from='battleChoices')=>api.screenChanged('feedbackBox',from);
 const find=sel=>host.querySelector(sel);const submit=async(text='テスト',kind='bug')=>{find('.kinds').children[['bug','idea','praise'].indexOf(kind)].onclick();find('#fb-body').value=text;find('#fb-body').oninput();find('form').onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));};
 return {api,context,storage,host,find,open,submit,calls,events,newTag,setMode:m=>{mode=m;},select:n=>{selected=n;},read:()=>JSON.parse(storage.get('mb_feedback_v1_'+profiles[selected].id)||'null')};
}
const app=setup();app.open();assert.equal(app.find('#fb-send').disabled,true);assert.equal(app.find('#fb-screen').value,'battleChoices');assert.equal(app.newTag.hidden,true);
app.find('#fb-body').value='x';app.find('#fb-body').oninput();app.find('.kinds').children[0].onclick();assert.equal(app.find('#fb-send').disabled,true);
app.find('#fb-body').value='x'.repeat(1001);app.find('#fb-body').oninput();assert.equal(app.find('#fb-send').disabled,true);assert(app.find('#fb-count').classList.contains('over'));
await app.submit('<script>globalThis.pwned=1</script>');assert.equal(app.calls.length,1);assert.equal(app.calls[0].screen,'battleChoices');assert.equal(app.calls[0].device.model,'SCG30');assert.equal(app.calls[0].progress,'序章 step42');assert.equal(app.read().history[0].state,'sent');assert.equal(app.read().queue.length,0);assert(!JSON.stringify(app.read()).includes('token-'));assert.equal(app.context.pwned,undefined);assert.equal(app.find('.hist-item').querySelector('p').textContent,'<script>globalThis.pwned=1</script>');
for(let i=0;i<4;i++){app.open();await app.submit('追加'+i);}app.open();assert.equal(app.find('#fb-send').disabled,true);assert.equal(app.find('.quota').textContent,'今日あと0件送れます');await app.submit('六件目');assert.equal(app.calls.length,5);
const offline=setup();offline.setMode('offline');offline.open();await offline.submit('送信を予約');assert.equal(offline.read().queue.length,1);assert.equal(offline.read().history[0].state,'wait');const id=offline.calls[0].id;
const reloaded=setup(offline.storage);reloaded.api.start();await new Promise(r=>setImmediate(r));assert.equal(reloaded.calls[0].id,id);assert.equal(reloaded.read().queue.length,0);assert.equal(reloaded.read().history[0].state,'sent');await reloaded.api.flush();assert.equal(reloaded.calls.length,1);
reloaded.select(1);reloaded.open();assert.equal(reloaded.read(),null);await reloaded.submit('別枠');assert.equal(reloaded.calls.at(-1).profileId,'profile-1');assert.equal(reloaded.read().history.length,1);
const limited=setup();limited.open();limited.setMode(429);await limited.submit('上限');assert.equal(limited.read().queue.length,0);assert.equal(limited.read().history.length,0);assert.equal(limited.find('#fb-body').value,'上限');const calls=limited.calls.length;await limited.api.flush();assert.equal(limited.calls.length,calls);limited.open();assert.equal(limited.find('.quota').textContent,'今日あと0件送れます');
const rejected=setup();rejected.open();rejected.setMode(401);await rejected.submit('認証拒否');assert.equal(rejected.read().queue.length,0);assert.equal(rejected.read().history.length,0);assert.equal(rejected.find('#fb-body').value,'認証拒否');
const broken=setup();broken.context.localStorage.setItem=()=>{throw Error('満杯');};broken.open();await broken.submit('保存失敗');assert.equal(broken.calls.length,0,'never transmit without durable outbox');

const deferred=setup();deferred.open();deferred.setMode('offline');await deferred.submit('昨日からの予約');deferred.setMode(429);await deferred.api.flush();assert.equal(deferred.read().queue.length,1);assert(deferred.read().queue[0].notBefore);deferred.setMode(401);const retained=deferred.read();retained.queue[0].notBefore=null;deferred.storage.set('mb_feedback_v1_profile-0',JSON.stringify(retained));await deferred.api.flush();assert.equal(deferred.read().queue.length,1,'do not discard previously queued body on auth error');
const afterAck=setup();afterAck.open();const set=afterAck.context.localStorage.setItem;let writes=0;afterAck.context.localStorage.setItem=(k,v)=>{if(k.startsWith('mb_feedback_v1_')&&++writes>1)throw Error('post-ack failure');set(k,v);};await afterAck.submit('応答後に保存できない');assert.equal(afterAck.read().queue.length,1);assert.equal(afterAck.read().history[0].state,'wait');assert(afterAck.find('.done'));

const html=fs.readFileSync('index.html','utf8');assert(html.indexOf('id="feedbackMenuButton"')>html.indexOf('onclick="showNotices()"',html.indexOf('id="moreMenu"')));assert(!code.includes('innerHTML'));assert(!code.includes('saveGame('));assert(!code.includes('mb_v95c'));
console.log('Game feedback: validation/quota/queue/reload/stable UUID/profiles/XSS/storage failure/auth errors PASS');
