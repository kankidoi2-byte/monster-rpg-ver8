import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('sound-manifest.json','utf8'));
assert.equal(Object.keys(manifest.bgm).length,3);assert.equal(Object.keys(manifest.se).length,10);
const assets=JSON.parse(fs.readFileSync('scripts/sound-pack-01-assets.json','utf8'));
for(const item of assets){const entry=manifest.bgm[item.key]||manifest.se[item.key];assert.equal(entry.source.driveId,item.driveId);assert.equal(entry.file,item.file);const bytes=fs.readFileSync(item.file);assert.equal(bytes.length,item.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);}
// BGM is an explicitly recorded AAC derivative, while all ten SE remain original bytes.
for (const item of assets) {
  if (manifest.bgm[item.key]) {
    assert.equal(item.source.codec, 'opus');
    assert.match(item.source.sha256, /^[a-f0-9]{64}$/);
    assert.notEqual(item.sha256, item.source.sha256);
    assert.equal(item.codec, 'aac'); assert.equal(item.profile, 'LC');
    assert.equal(item.sampleRate, 48000); assert.equal(item.channels, 2);
    assert.equal(item.startTime, 0); assert.equal(item.source.startTime, 0);
    assert.equal(item.conversion.targetBitrate, 192000);
    assert.deepEqual(item.conversion.arguments, ['-c:a','aac','-profile:a','aac_low','-b:a','192k','-ar','48000','-ac','2']);
    assert.deepEqual(item.alignment.windowStartsSeconds, [0,1,5,15,30,60]);
    assert.equal(item.alignment.lagSamples.length, 12);
    assert.ok(item.alignment.lagSamples.every(lag => lag === 0));
    assert.ok(item.alignment.minimumZeroLagCorrelation > .98);
    // Hash above pins the ffprobe-verified AAC-LC bytes; check the MP4 audio entry too.
    const bytes = fs.readFileSync(item.file);
    assert.ok(bytes.includes(Buffer.from('mp4a'))); assert.ok(!bytes.includes(Buffer.from('Opus')));
  } else {
    assert.equal(item.codec, 'mp3'); assert.equal(item.conversion, undefined);
  }
}
assert.equal(manifest.bgm.home.loopStartSec, 85.075);
assert.equal(manifest.bgm.home.loopEndSec, 159.405);
assert.equal(manifest.bgm.battle_grassland.loopStartSec, 14.420);
assert.equal(manifest.bgm.battle_grassland.loopEndSec, 41.425);
const calls=[];const ctx=vm.createContext({GameAudio:{beginBattle:s=>calls.push(['battle',s]),setScene:s=>calls.push(['scene',s]),playSe:(k,d)=>calls.push([k,d])},activeHuntRequest:{source:'hunt'},selectedMap:{id:'grassland'},battleFeedback:{finished:false},tutorialBattleSession:{active:false},skillBattleMotionForMove:move=>({form:move[2],types:[move[3]]})});
vm.runInContext(fs.readFileSync('js/game-audio-ui.js','utf8'),ctx);
vm.runInContext("gameAudioScreenChanged('home');gameAudioScreenChanged('battleChoices');gameAudioScreenChanged('battle');gameAudioScreenChanged('battle');",ctx);
assert.deepEqual(calls,[['scene','home'],['scene','mapSelect'],['battle','battle:grassland']]);
vm.runInContext("gameAudioResetBattle();selectedMap.id='forest';gameAudioScreenChanged('battle');",ctx);assert.deepEqual(calls.at(-1),['battle','otherBattle']);
vm.runInContext("gameAudioResetBattle();selectedMap.id='grassland';activeHuntRequest.source='map_story';gameAudioScreenChanged('battle');",ctx);assert.deepEqual(calls.at(-1),['battle','otherBattle']);
calls.length=0;vm.runInContext("gameAudioMoveImpact(['炎の爪',30,'claw','fire']);gameAudioMoveImpact(['水流',30,'magic','water']);gameAudioMoveImpact(['回復',0,'magic','fire']);gameAudioMoveImpact(['渾身斬り',30,'sword','normal']);",ctx);
assert.deepEqual(calls,[['slashLight',0],['fire',.1],['slashHeavy',0]]);
for(const [text,expected] of [['戻る','cancel'],['閉じる','menuClose'],['メニュー','menuOpen'],['決定','confirm']]){ctx.el={disabled:false,dataset:{},textContent:text,getAttribute:()=>'',matches:()=>false};assert.equal(vm.runInContext('gameAudioUiKey(el)',ctx),expected);}
const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('js/game-audio.js')<html.indexOf('js/game-audio-ui.js'));assert.ok(html.indexOf('js/game-audio-ui.js')<html.indexOf('js/init.js'));assert.ok(!/<audio[^>]*loop/i.test(html));assert.ok(!/src=["'][^"']*sound\.js/.test(html));
console.log('Sound integration: 3 recorded AAC-LC derivatives and 10 exact original SE; scene latching, adopted effects, fire layering, UI keys and script order PASS');
