// Trusted same-site review: preserve the private Site's authenticated asset requests.
// Save isolation is supplied by memory-only storage before any game script runs.
// Production GitHub Pages has a separate origin; no production save is accessed.
// The generated QA document now exercises the ordinary registered media.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('index.html');
const runtime=read('js/battle-idle-media.js');
const inline=s=>'<script>'+s.replaceAll('</script','<\\/script')+'</script>';
const isolation=`for(const name of ['localStorage','sessionStorage']){
 const data=new Map();Object.defineProperty(window,name,{value:{
 getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),
 removeItem:k=>data.delete(String(k)),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,
 get length(){return data.size;}}});}`;
html=html.replace('<head>','<head><base href="../../">'+inline(isolation));
const engineTag=/<script src="js\/battle-idle-media\.js[^\"]*"><\/script>/g;
if([...html.matchAll(engineTag)].length!==1)throw Error('Expected one media script');
html=html.replace(engineTag,()=>inline(runtime));
html=html.replace('</body>',inline(read('tools/motion-review/gran-volmoog-scenario.js'))+'</body>');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const wrapper=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>グランボルモーグ戦闘確認</title><style>body{margin:0;background:#102647;color:white;font:16px sans-serif}p{padding:8px;margin:0}iframe{width:100%;height:calc(100dvh - 74px);border:0}</style><p>グランボルモーグ：戦闘接続の検証用。通常登録経路の検証用。本編のセーブは使用しません。</p><p id="loadStatus" role="status">戦闘画面を読み込んでいます…</p><iframe style="visibility:hidden" title="グランボルモーグ戦闘確認" sandbox="allow-scripts allow-same-origin" srcdoc="${esc(html)}"></iframe><script>
const frame=document.querySelector('iframe'),status=document.getElementById('loadStatus');
let settled=false;
function checkReview(){
 if(settled)return;
 try{
  const doc=frame.contentDocument;
  if(!doc||!doc.querySelector('#granReviewControls button')||[...doc.querySelectorAll('link[rel=stylesheet]')].some(link=>!link.sheet)||!doc.querySelector('#battle.active'))throw Error('resources');
  settled=true;frame.style.visibility='visible';status.textContent='';frame.contentWindow.dispatchEvent(new Event('resize'));
 }catch{
  settled=true;status.textContent='戦闘画面の読み込みに失敗しました。ページを再読み込みしてください。改善しない場合は、この表示をお知らせください。';
 }
}
frame.addEventListener('load',checkReview);
setTimeout(()=>{if(!settled){status.textContent='読み込みが完了していません。通信状態を確認して再読み込みしてください。';}},20000);
</script></html>`;
fs.writeFileSync(path.join(root,'tools/motion-review/gran-volmoog-review.generated.html'),wrapper);
console.log('Built storage-isolated Gran Volmoog review; normal registry reused.');
