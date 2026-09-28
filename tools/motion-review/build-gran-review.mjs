// Build a sandboxed, storage-isolated review using the actual game scripts.
// Only the generated QA document opts this candidate into the real media manager.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('index.html');
const marker='const BATTLE_IDLE_MEDIA=Object.freeze({';
const original=read('js/battle-idle-media.js');
if(original.split(marker).length!==2)throw Error('Media registry changed: review generator needs inspection');
const candidate=read('tools/motion-review/gran-volmoog-candidate.js');
const runtime=original.replace(marker,marker+'...GRAN_REVIEW_MEDIA,');
const inline=s=>'<script>'+s.replaceAll('</script','<\\/script')+'</script>';
const isolation=`for(const name of ['localStorage','sessionStorage']){
 const data=new Map();Object.defineProperty(window,name,{value:{
 getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),
 removeItem:k=>data.delete(String(k)),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,
 get length(){return data.size;}}});}`;
html=html.replace('<head>','<head><base href="../../">'+inline(isolation));
const engineTag=/<script src="js\/battle-idle-media\.js[^\"]*"><\/script>/g;
if([...html.matchAll(engineTag)].length!==1)throw Error('Expected one media script');
html=html.replace(engineTag,()=>inline(candidate+'\n'+runtime));
html=html.replace('</body>',inline(read('tools/motion-review/gran-volmoog-scenario.js'))+'</body>');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const wrapper=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>グランボルモーグ戦闘確認</title><style>body{margin:0;background:#102647;color:white;font:16px sans-serif}p{padding:8px;margin:0}iframe{width:100%;height:calc(100dvh - 74px);border:0}</style><p>グランボルモーグ：戦闘接続の検証用。通常登録は保留。本編のセーブは使用しません。</p><iframe title="グランボルモーグ戦闘確認" sandbox="allow-scripts" srcdoc="${esc(html)}"></iframe></html>`;
fs.writeFileSync(path.join(root,'tools/motion-review/gran-volmoog-review.generated.html'),wrapper);
console.log('Built storage-isolated Gran Volmoog review; normal index and registry unchanged.');
