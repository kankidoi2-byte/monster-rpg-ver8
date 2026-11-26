import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
// Do not use Emoji alone: Unicode assigns that property to plain digits, * and #.
const decorated=/[0-9#*]\uFE0F?\u20E3|\p{Regional_Indicator}{1,2}|\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?|[✿❀♜⌂✦✧⌁✓✔✕✖✎✏◆◇▪▫●○◎△▲▼▶◀◉]/gu;
const escapes=/\\u\{([\da-f]+)\}|\\u([\da-f]{4})|&#(?:x([\da-f]+)|(\d+));?/giu;
function decode(value){
  return value.replace(escapes,(raw,hex,long,entity,decimal)=>{
    const code=decimal?Number(decimal):parseInt(hex||long||entity,16);
    return code<=0x10ffff?String.fromCodePoint(code):raw;
  }).replace(/&(?:check|checkmark);/gi,'✓');
}

function jsLiterals(source,add,origin=0){
  let i=0;
  const peek=()=>source[i];
  const emit=(start,end,quote)=>add(source.slice(start,end),origin+start,quote);
  const lineComment=()=>{while(i<source.length&&peek()!=='\n')i++;};
  const lexical=()=>{
    let regexAllowed=true, depth=0;
    while(i<source.length){
      const c=peek();
      if(/\s/u.test(c)){i++;continue;}
      if(source.startsWith('//',i)){lineComment();continue;}
      if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+2;continue;}
      if(c==="'"||c==='"'){
        const start=++i;
        while(i<source.length&&peek()!==c)i+=peek()==='\\'?2:1;
        emit(start,i,c);i++;regexAllowed=false;continue;
      }
      if(c==='`'){
        let start=++i;
        while(i<source.length){
          if(peek()==='\\'){i+=2;continue;}
          if(peek()==='`'){emit(start,i,c);i++;break;}
          if(source.startsWith('${',i)){emit(start,i,c);i+=2;lexical();start=i;continue;}
          i++;
        }
        regexAllowed=false;continue;
      }
      if(c==='/'&&regexAllowed){
        const start=i++;let bracket=false, closed=false;
        while(i<source.length&&peek()!=='\n'){
          if(peek()==='\\'){i+=2;continue;}
          if(peek()==='/'&&!bracket){i++;while(/[a-z]/i.test(peek()||''))i++;closed=true;break;}
          if(peek()==='[')bracket=true;else if(peek()===']')bracket=false;
          i++;
        }
        if(closed){regexAllowed=false;continue;}
        i=start;
      }
      if(c==='{'){depth++;i++;regexAllowed=true;continue;}
      if(c==='}'){i++;if(!depth)return;depth--;regexAllowed=false;continue;}
      const word=/^[\p{ID_Start}$_][\p{ID_Continue}$]*/u.exec(source.slice(i));
      if(word){
        i+=word[0].length;
        regexAllowed=/^(?:return|throw|case|void|typeof|delete|yield|await|in|of|instanceof|new|else|do)$/.test(word[0]);
        continue;
      }
      if(source.startsWith('++',i)||source.startsWith('--',i)){i+=2;continue;}
      i++;regexAllowed=!/[\])\d.]/u.test(c);
    }
  };
  lexical();
}

function allowedItemIcon(path,source,offset,glyph){
  if(path==='js/data.js'){
    // Only icon property values in these two item arrays, not item name/description,
    // not a monster's icon, and not a generic 'icon' anywhere in data.js.
    const before=source.slice(0,offset), icon=/\bicon\s*:\s*["']$/.test(before.slice(-32));
    return icon&&['SHOP_ITEMS','ITEM_DEX_EXTRA'].some(table=>{
      const start=source.indexOf('const '+table+' = [');
      return start>=0&&offset>start&&offset<source.indexOf('\n];',start);
    });
  }
  if(path==='js/core.js'&&glyph==='📦'){
    const before=source.slice(0,offset);
    const start=Math.max(before.lastIndexOf('function itemInlineVisual('),before.lastIndexOf('function itemDexVisual('));
    return start>=0&&before.lastIndexOf('\nfunction ')<start&&/(?:\bit\.icon\s*\|\|\s*|\breturn\s*)["']$/.test(before.slice(-48));
  }
  const itemFallbacks={
    'js/alchemy.js':['📦',/\bitem\??\.icon\s*\|\|\s*['"]$/],
    'js/expedition.js':['📦',/ITEM_BY_ID\[id\]\?\.icon\s*\|\|\s*['"]$/],
    'js/gacha-ui.js':['✦',/\bitem\.icon\s*\|\|\s*['"]$/],
    'js/gifts.js':['◇',/ITEM_DEX_BY_ID\[r\.id\]\?\.icon\s*\|\|\s*['"]$/],
    'js/tutorial.js':['📦',/\bitem\?\.icon\s*\|\|\s*['"]$/],
    'js/ui.js':['🎁',/(?:\bitem\.icon\s*\|\|\s*|\{id:itemId,name:itemId,icon:)['"]$/]
  };
  const fallback=itemFallbacks[path];
  return !!fallback&&glyph===fallback[0]&&fallback[1].test(source.slice(Math.max(0,offset-90),offset));
}

function scan(path,source){
  const issues=[];
  function inspect(value,offset){
    // A match on decoded text may follow a long escape; use the closest kept
    // source line when it contains an escape, never silently drop the match.
    const changed=decode(value.replace(/<!--[\s\S]*?-->/g,comment=>comment.replace(/[^\n]/g,' ')));
    for(const hit of changed.matchAll(decorated)){
      // Japanese episode-number placeholders are typography, not an icon.
      if(hit[0]==='○'&&changed[hit.index-1]==='第'&&changed[hit.index+1]==='話')continue;
      const relative=value===changed?hit.index:Math.min(value.length,hit.index);
      const index=offset+relative;
      if(allowedItemIcon(path,source,offset,hit[0]))continue;
      const line=source.slice(0,index).split('\n').length;
      issues.push({path,line,glyph:hit[0],text:source.split('\n')[line-1].trim().slice(0,180)});
    }
  }
  if(path==='index.html'){
    const special=/<!--[\s\S]*?-->|<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
    let end=0;
    for(const part of source.matchAll(special)){
      inspect(source.slice(end,part.index),end);
      if(part[1])jsLiterals(part[1],inspect,part.index+part[0].indexOf('>')+1);
      end=part.index+part[0].length;
    }
    inspect(source.slice(end),end);
  }else jsLiterals(source,inspect);
  return issues;
}

const glyphs=(source,path='js/demo.js')=>scan(path,source).map(x=>x.glyph);
assert.deepEqual(glyphs('/* 🔥 */ // ♜\nconst t="★ ‹ › 20# *"; const re=/🔥[✓]/gu;'),[]);
assert.deepEqual(glyphs('const t=`<!-- 🔥 --><a aria-label="♜">${b?"⌁":"✧"}</a>`;'),['♜','⌁','✧']);
assert.deepEqual(glyphs('const t="第○話 ※注意 "; const b="○";'),['○']);
assert.deepEqual(glyphs('const x="\\u{1F525} 1️⃣ 🇯🇵";'),['🔥','1️⃣','🇯🇵']);
assert.deepEqual(glyphs('<!-- ♜ --><button title="✿">&#x1F525;</button><script>const a="✦";</script>','index.html'),['✿','🔥','✦']);
assert.deepEqual(glyphs("const SHOP_ITEMS = [\n{id:'a', icon:'📦', name:'✧'}\n];\nconst monster={icon:'🔥'};",'js/data.js'),['✧','🔥']);

assert.deepEqual(glyphs("const art=item.icon||'✦'; const label='✦';",'js/gacha-ui.js'),['✦']);

// Rank-up notification decorations can also come from CSS pseudo-elements.
const rankUpStyles=read('css/ui-redesign.css').replace(/\/\*[\s\S]*?\*\//g,'');
assert.doesNotMatch(rankUpStyles,/\.contractor-rank-up-card\s*::?(?:before|after)\b/i,
  'Rank-up notification must not generate decorative pseudo-elements');

const paths=['index.html',...readdirSync(new URL('../js/',import.meta.url)).filter(path=>path.endsWith('.js')).sort().map(path=>'js/'+path)];
const violations=paths.flatMap(path=>scan(path,read(path)));
if(violations.length){
  for(const {path,line,glyph,text} of violations)console.error(`${path}:${line} ${JSON.stringify(glyph)} ${text}`);
  throw Error(`${violations.length} non-allowlisted emoji or symbols in game display sources`);
}
console.log(`PASS no display emoji in ${paths.length} HTML/JS files (item artwork fallback, comments, rarity stars and navigation chevrons are preserved)`);
