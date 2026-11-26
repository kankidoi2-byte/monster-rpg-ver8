// Structural contract. Browser paint/layout evidence is generated separately in CI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const html=read('index.html'),source=read('js/nonbattle-theme.js'),css=read('css/nonbattle-theme.css');
function registry(name){
 const start=source.match(new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`));
 assert(start,`${name} is declared`);
 const expression=source.slice(start.index+start[0].length).split(';')[0];
 return vm.runInNewContext(expression,{Object});
}
const screens=registry('NONBATTLE_SCREEN_THEMES'),presets=registry('NONBATTLE_THEME_PRESETS');
assert(Object.isFrozen(screens),'screen registry is frozen');
assert(Object.isFrozen(presets),'preset registry is frozen');
const excluded=['battle','battleItemSelect','contractConfirm','skillGachaPresentation','contractAnimation'];
const ids=[...html.matchAll(/<section\b[^>]*\bid="([^"]+)"[^>]*\bclass="([^"]*)"/g)].filter(m=>m[2].split(/\s+/).includes('screen')).map(m=>m[1]);
for(const id of ids.filter(id=>!excluded.includes(id))){
 assert.equal(typeof screens[id],'string',`screen ${id} has a family`);
 assert(presets[screens[id]],`${id} family has a preset`);
}
for(const id of excluded)assert(!(id in screens),`${id} stays outside theme registry`);
assert(Object.keys(presets).length>=3,'multiple distinct monochrome families exist');
// Exercise the actual activation lifecycle without a browser, save or network.
const nodes=Object.fromEntries(ids.map(id=>[id,{id,dataset:{},classes:new Set(),
 classList:{add(value){nodes[id].classes.add(value);}},querySelectorAll(){return [];}}]));
const body={dataset:{},style:{setProperty(){},removeProperty(){}}};
const context=vm.createContext({document:{body,getElementById:id=>nodes[id]||null,querySelector:()=>nodes.home}});
vm.runInContext(source,context);
for(const [id,family] of Object.entries(screens)){
 vm.runInContext(`applyNonbattleTheme(${JSON.stringify(id)})`,context);
 assert.equal(body.dataset.nonbattleTheme,family,`${id} activates its family`);
 assert.equal(nodes[id].dataset.themeFamily,family,`${id} receives stable family metadata`);
 assert(nodes[id].classes.has('nonbattle-screen'),`${id} receives opt-in class`);
}
for(const id of excluded){
 vm.runInContext(`applyNonbattleTheme(${JSON.stringify(id)})`,context);
 assert(!('nonbattleTheme' in body.dataset),`${id} clears body theme inheritance`);
 assert(!nodes[id]?.classes.has('nonbattle-screen'),`${id} does not get opt-in class`);
}

for(const [family,preset] of Object.entries(presets)){
 assert(Object.isFrozen(preset),`${family} preset is immutable`);
 assert.equal(preset.white+preset.black,100,`${family} declares a complete surface ratio`);
 assert(preset.white>=65&&preset.white<=95,`${family} white surface ratio stays in design range`);
 assert(preset.shape,`${family} declares shape`);
}
assert.match(html,/href="css\/nonbattle-theme\.css\?[^"\s]+"/,'versioned theme stylesheet is loaded');
assert.match(html,/src="js\/nonbattle-theme\.js\?[^"\s]+"/,'versioned theme script is loaded');
assert(html.indexOf('css/nonbattle-theme.css')>html.indexOf('css/style.css'),'theme loads after base styles');
assert.match(source,/nonbattle-screen/);assert.match(source,/themeFamily|theme-family/);assert.match(source,/nonbattleTheme|nonbattle-theme/);
assert(!/filter\s*:\s*grayscale/i.test(css),'artwork must not be globally desaturated');
assert.match(css,/:focus-visible/,'keyboard focus is visible');
assert.match(css,/prefers-reduced-motion/,'reduced motion is supported');
console.log(`PASS monochrome theme contract: ${Object.keys(screens).length} routes, ${Object.keys(presets).length} families`);
