import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const code=fs.readFileSync('js/battle-audio.js','utf8');
function harness({stored=null,unsupported=false,storageFails=false,suspended=false,reject=false}={}){
 const events={},starts=[],sources=[],storage=new Map(stored?[['mb_battle_audio_v1',stored]]:[]);let context;
 class AudioContext{
  constructor(){context=this;this.state=suspended?'suspended':'running';this.currentTime=0;this.sampleRate=48000;}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
  createBuffer(_n,len){return {copyToChannel(data){assert.equal(data.length,len);}};}
  createBufferSource(){const s={connect(){},disconnect(){},stop(){s.stopped=true;},start(t){starts.push({t,source:s});}};sources.push(s);return s;}
  resume(){return reject?Promise.reject(Error('denied')):new Promise(resolve=>{this.finishResume=()=>{this.state='running';resolve();};});}
 }
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,querySelectorAll:()=>[]};
 const c=vm.createContext({Float32Array,Math,Map,Set,Promise,document,window:{AudioContext:unsupported?undefined:AudioContext,addEventListener:(key,fn)=>events[key]=fn},localStorage:{getItem(k){if(storageFails)throw Error();return storage.get(k)||null;},setItem(k,v){if(storageFails)throw Error();storage.set(k,v);}}});
 vm.runInContext(code,c);const a=vm.runInContext('BattleAudio',c);return {a,events,starts,sources,document,storage,ctx:()=>context};
}
let h=harness(),a=h.a;
assert.equal(a.getSettings().volume,.25);assert.equal(a.play('hit'),false);a.unlock();a.navigate('battle');
assert.equal(a.hp(100,80,{impact:true,effectiveness:2}),true);assert.equal(h.starts.length,1);assert.equal(a.hp(80,60,{impact:true}),false);
a.reset();assert.equal(a.hp(100,100),false);assert.equal(a.hp(100,90),false);assert.equal(a.hp(90,100),true);
a.reset();for(let i=0;i<100;i++)a.play('hit');assert.equal(h.sources.filter(s=>!s.stopped).length,1);
a.reset();assert.equal(a.play('hit'),true);assert.equal(a.play('weak'),true);assert.equal(h.sources.filter(s=>!s.stopped).length,1);
a.reset();a.play('heal');a.play('heal');assert.equal(a.play('heal'),false);assert.equal(h.sources.filter(s=>!s.stopped).length,2);
assert.equal(a.victory(),true);assert.equal(a.victory(),false);assert.equal(a.hp(20,40),false);a.reset();assert.equal(a.victory(),true);
a.reset();a.play('heal');a.navigate('home');assert.equal(h.sources.filter(s=>!s.stopped).length,0);assert.equal(a.play('hit'),false);
a.navigate('battle');h.document.hidden=true;h.events.visibilitychange();assert.equal(a.play('hit'),false);h.document.hidden=false;assert.equal(a.play('hit'),false);a.unlock();assert.equal(a.play('heal'),true);
a.setMuted(true);assert.equal(a.play('heal'),false);a.setVolume(.4);h=harness({stored:h.storage.get('mb_battle_audio_v1')});assert.equal(h.a.getSettings().volume,.4);assert.equal(h.a.getSettings().muted,true);
for(const options of [{stored:'broken'},{storageFails:true},{unsupported:true}]){const x=harness(options);x.a.unlock();x.a.setVolume(.3);x.a.setMuted(true);x.a.play('hit');}
h=harness({suspended:true});h.a.unlock();h.a.navigate('battle');assert.equal(h.a.play('hit'),false);h.ctx().finishResume();await Promise.resolve();assert.equal(h.starts.length,0);assert.equal(h.a.play('hit'),true);
h=harness({suspended:true,reject:true});h.a.unlock();await new Promise(r=>setImmediate(r));assert.equal(h.a.play('heal',{preview:true}),false);
// PCM bounds validate clipping, finite samples, short envelopes, and deterministic synthesis.
h=harness();for(const kind of Object.keys(h.a.durations))for(const rate of [44100,48000]){
 const pcm=h.a.synthesize(kind,rate);let peak=0,sum=0;for(const n of pcm){assert.ok(Number.isFinite(n));peak=Math.max(peak,Math.abs(n));sum+=n*n;}assert.ok(peak<.65);assert.ok(sum>0);assert.ok(Math.abs(pcm[0])<.001);assert.ok(Math.abs(pcm.at(-1))<.001);assert.deepEqual(pcm,h.a.synthesize(kind,rate));console.log(`${kind} ${rate}Hz: ${pcm.length/rate}s peak=${peak.toFixed(3)} default output peak=${(peak*.125).toFixed(3)}`);
}
console.log('PASS audio lifecycle, overlap, victory dedup, 0 healing, persistence, failure fallback and PCM bounds (not a listening test)');
