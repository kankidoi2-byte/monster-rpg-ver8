// Reproduce the four original SFX as PCM WAV for the alternative native player.
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({Float32Array,document:{addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:()=>null}});
vm.runInContext(fs.readFileSync('js/battle-audio.js','utf8'),c);
const a=vm.runInContext('BattleAudio',c),rate=44100;
fs.mkdirSync('audio/sfx',{recursive:true});
for(const kind of Object.keys(a.durations)){
 const pcm=a.synthesize(kind,rate),wav=Buffer.alloc(44+pcm.length*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);
 pcm.forEach((v,i)=>wav.writeInt16LE(Math.round(v*32767),44+i*2));fs.writeFileSync(`audio/sfx/${kind}_v1.wav`,wav);
}
