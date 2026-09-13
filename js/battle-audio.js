/* Original procedural SFX. No external samples or gameplay RNG; battle playback never waits. */
const BattleAudio=(()=>{
  const KEY='mb_battle_audio_v1',DEFAULTS={muted:false,volume:0.25};
  let settings={...DEFAULTS},ctx=null,master=null,ready=false,won=false,lastHit=-Infinity,lastKind='',screen='home',generation=0,lastError='';
  const voices=new Set(),buffers=new Map();
  try{const s=JSON.parse(localStorage.getItem(KEY));if(s){settings.muted=s.muted===true;if(Number.isFinite(s.volume))settings.volume=Math.max(0,Math.min(1,s.volume));}}catch(_e){}
  const durations={hit:.115,weak:.165,heal:.38,victory:.68};
  function synthesize(kind,rate){
    const data=new Float32Array(Math.ceil(rate*durations[kind]));let seed=73129;
    for(let i=0;i<data.length;i++){
      const t=i/rate,fade=Math.min(1,t/.004)*Math.min(1,(data.length-i)/rate/.025);
      if(kind==='hit'||kind==='weak'){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const noise=(seed/4294967296*2-1),weak=kind==='weak';
        data[i]=fade*(.46*Math.sin(2*Math.PI*(185*t-350*t*t))*Math.exp(-t*35)+.10*noise*Math.exp(-t*70)+(weak?.20*Math.sin(2*Math.PI*740*t)*Math.exp(-t*23):0));
      }else{
        const notes=kind==='heal'?[523.25,659.25,783.99]:[392,493.88,587.33,783.99];
        const spacing=kind==='heal'?.065:.105,decay=kind==='heal'?15:12;
        let sum=0;notes.forEach((f,n)=>{const dt=t-n*spacing;if(dt>=0)sum+=.24*Math.min(1,dt/.012)*Math.exp(-dt*decay)*Math.sin(2*Math.PI*f*dt);});
        data[i]=fade*sum;
      }
    }
    return data;
  }
  function stop(){generation++;for(const v of voices){try{v.source.stop();v.source.disconnect();v.gain.disconnect();}catch(_e){}}voices.clear();}
  function unlock(){
    if(document.hidden)return Promise.resolve(false);
    const ticket=generation;
    try{
      if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){lastError='この表示環境は効果音の再生に対応していません。';return Promise.resolve(false);}ctx=new Audio({latencyHint:'interactive'});master=ctx.createGain();master.gain.value=settings.muted?0:settings.volume*.5;master.connect(ctx.destination);
        ctx.onstatechange=()=>{if(ctx.state!=='running'){ready=false;stop();}};
      }
      if(ctx.state==='running'){ready=true;lastError='';return Promise.resolve(true);}
      ready=false;
      // Always retry resume in the CURRENT gesture. A promise from a premature
      // touch pointerdown can remain pending forever and must not lock this out.
      return Promise.resolve(ctx.resume()).then(()=>{
        if(ticket!==generation||document.hidden)return false;
        ready=ctx.state==='running';if(ready)lastError='';return ready;
      }).catch(()=>{if(ticket===generation){ready=false;lastError='ブラウザが音声の開始を許可しませんでした。';}return false;});
    }catch(_e){ready=false;lastError='音声を開始できませんでした。';return Promise.resolve(false);}
  }
  function status(){
    if(settings.muted)return 'ミュートがONです。';
    if(settings.volume===0)return '効果音の音量が0%です。';
    if(document.hidden)return '画面が非表示のため停止しています。';
    if(lastError)return lastError;
    if(!ctx||ctx.state!=='running'||!ready)return '音声の開始待ちです。もう一度タップしてください。';
    return '再生処理は動作しています。無音なら下の音声ファイルでも確認できます。';
  }
  async function audition(kind){
    stop();lastHit=-Infinity;lastKind='';
    const ticket=generation;
    // Only an explicit audition may wait briefly for initial resume. Battle
    // events still never wait or queue. Closing/hiding/muting cancels this.
    let timer;
    try{
      const ok=await Promise.race([unlock(),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),300);})]);
      if(!ok||ticket!==generation||document.hidden)return false;
      return play(kind,{preview:true});
    }finally{clearTimeout(timer);}
  }
  async function auditionButton(kind){
    const started=await audition(kind);
    const el=document.getElementById('battleAudioStatus');
    if(el)el.textContent=started?'再生処理を開始しました。':status();
    return started;
  }
  function play(kind,{preview=false}={}){
    // A suspended/hidden event is discarded; never replay it when resume resolves.
    if(!durations[kind]||settings.muted||settings.volume<=0||document.hidden||!ready||!ctx||ctx.state!=='running'||(!preview&&screen!=='battle'))return false;
    try{
      const now=ctx.currentTime,isHit=kind==='hit'||kind==='weak';
      if(isHit&&now-lastHit<.075){
        if(!(kind==='weak'&&lastKind==='hit'))return false;
        for(const v of voices)if(v.kind==='hit'){v.source.stop();v.source.disconnect();v.gain.disconnect();voices.delete(v);}
      }
      if(kind==='victory')stop();
      if(voices.size>=2)return false;
      if(isHit){lastHit=now;lastKind=kind;}
      let buffer=buffers.get(kind);
      if(!buffer){const samples=synthesize(kind,ctx.sampleRate);buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);buffer.copyToChannel(samples,0);buffers.set(kind,buffer);}
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=1;
      source.connect(gain);gain.connect(master);const v={source,gain,kind};voices.add(v);
      source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();};source.start(now);return true;
    }catch(_e){lastError='音声を出力できませんでした。';stop();return false;}
  }
  function hp(before,after,{impact=false,effectiveness=1}={}){
    if(won)return false;
    const delta=Math.max(0,after)-Math.max(0,before);
    if(delta>0)return play('heal');
    if(delta<0&&impact)return play(effectiveness>1?'weak':'hit');
    return false;
  }
  function victory(){if(won)return false;won=true;return play('victory');}
  function reset(){stop();won=false;lastHit=-Infinity;lastKind='';}
  function navigate(id){if(screen!==id)stop();screen=id;}
  function persist(){generation++;try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_e){}if(master)master.gain.value=settings.muted?0:settings.volume*.5;if(settings.muted||settings.volume===0)stop();render();}
  function render(){
    document.querySelectorAll('[data-sfx-volume]').forEach(el=>{el.value=Math.round(settings.volume*100);});
    document.querySelectorAll('[data-sfx-level]').forEach(el=>{el.textContent=`${Math.round(settings.volume*100)}%`;});
    document.querySelectorAll('[data-sfx-mute]').forEach(el=>{el.checked=settings.muted;});
  }
  function background(){ready=false;stop();}
  document.addEventListener('pointerdown',e=>{if(e.isTrusted&&e.pointerType==='mouse')unlock();},{capture:true,passive:true});
  for(const type of ['pointerup','touchend','click'])document.addEventListener(type,e=>{if(e.isTrusted)unlock();},{capture:true,passive:true});
  document.addEventListener('keydown',e=>{if(e.isTrusted)unlock();},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)background();});
  window.addEventListener('pagehide',background);
  window.addEventListener('blur',background);
  return {play,hp,victory,reset,navigate,stop,unlock,audition,auditionButton,status,render,synthesize,durations,
    getSettings:()=>({...settings}),
    setVolume:v=>{if(Number.isFinite(Number(v)))settings.volume=Math.max(0,Math.min(1,Number(v)));persist();},
    setMuted:v=>{settings.muted=!!v;persist();},
    open:()=>{stop();const dialog=document.getElementById('battleAudioSettings');if(dialog&&!dialog.open){render();dialog.showModal();}},
    close:()=>{stop();document.getElementById('battleAudioSettings')?.close();}
  };
})();
