import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tokenizer} from 'acorn';

const oldCopy=/契約者Rank|受領|混乱を治す|眠りを治す|控えのモンスター|待機中のモンスター/u;
const read=path=>fs.readFileSync(path,'utf8');
const html=read('index.html').replace(/<!--[\s\S]*?-->/g,'');
assert.doesNotMatch(html,oldCopy);
for(const file of fs.readdirSync('js').filter(file=>file.endsWith('.js')&&file!=='notices-data.js')){
  const tokens=tokenizer(read('js/'+file),{ecmaVersion:'latest'});
  for(let token=tokens.getToken();token.type.label!=='eof';token=tokens.getToken()){
    if(!['string','template'].includes(token.type.label))continue;
    // The save migration report and the unrelated prologue reward title are scoped exceptions.
    if(file==='save.js'&&token.value==='契約者Rank・称号データの保存領域を追加')continue;
    if(file==='tutorial.js'&&token.value==='報酬受領完了')continue;
    assert.doesNotMatch(token.value||'',oldCopy,'old display wording in js/'+file);
  }
}
assert.equal(html.match(/控えの仲間を派遣/g)?.length,2);
assert.match(html,/モンスター・キャラクター・技・マップ・アイテムの記録/);
assert.match(html,/aria-label="次の契約者ランクまで"/);
assert.match(html,/id="contractorRankView">Rank 1</);
assert.equal(read('js/gifts.js').match(/受け取り日 /g)?.length,2);
assert.match(read('js/data.js'),/id:'awakening'.*desc:'ねむりを治す。'/);
assert.match(read('js/data.js'),/id:'confusion_heal'.*desc:'こんらんを治す。'/);
assert.match(read('js/tutorial.js'),/id:'rank_progress'.*契約者ランクは冒険全体の記録/);
console.log('PASS scoped player wording, preserved Rank badge, and exact wording exceptions.');
