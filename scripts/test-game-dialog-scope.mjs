import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=file=>readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8');
const hasNative=(file,kind)=>new RegExp(`\\b${kind}\\s*\\(`).test(source(file));

for(const file of ['items','party','skills','skill-gacha','expedition','progression','world-map','world-map-flow','battle-flow','alchemy']){
  assert(!hasNative(file,'alert'),`${file}.js must use in-game notices for gameplay alerts`);
}
for(const file of ['progression','skill-synthesis-ui','alchemy','expedition','items','world-map-flow','tutorial']){
  assert(!hasNative(file,'confirm'),`${file}.js must use the in-game confirmation sheet`);
}

const save=source('save');
for(const phrase of ['セーブデータが破損しています','セーブデータを読み込みますか','直前の正常なバックアップへ戻しますか','セーブデータを削除しますか']){
  assert.match(save,new RegExp(`confirm\\([^\\n]*${phrase}`));
}
assert.match(save,/alert\('セーブデータをクリップボードへコピーしました。'\)/);
assert.match(save,/prompt\('下の内容を長押ししてコピー/);
assert(hasNative('profiles','alert'),'profile setup can still use a native alert');

const contract=source('character-gacha');
for(const [kind,signature] of [
  ['confirm','未確定の契約記録があります'],
  ['confirm','この端末に契約の記録がありません'],
  ['alert','保存記録を読み取れませんでした'],
  ['alert','基準の記録を保存できませんでした'],
  ['alert','このブラウザでは契約を開始できません'],
  ['alert','契約結果の表示を再開できませんでした'],
  ['alert','結果の確認を保存できませんでした']
]){
  assert.match(contract,new RegExp(`${kind}\\([^\\n]*${signature}`));
}
console.log('Game dialogs: gameplay uses in-game UI and required native save/profile/contract dialogs remain');
