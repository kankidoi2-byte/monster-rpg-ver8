import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const saveSource=read('js/save.js');
const data=read('js/data.js');
const index=read('index.html');
const css=read('css/tutorial.css');
const manifest=JSON.parse(read('images/tutorial/characters/manifest.json'));
const portrait=fs.readFileSync(new URL('../images/tutorial/characters/gnosis-dialogue-transparent-final.png',import.meta.url));

const signature=Buffer.from([137,80,78,71,13,10,26,10]);
assert.ok(portrait.subarray(0,8).equals(signature),'Gnosis portrait must be a decoded PNG');
assert.equal(portrait.readUInt32BE(16),384,'Gnosis portrait width must be optimized for dialogue use');
assert.equal(portrait.readUInt32BE(20),576,'Gnosis portrait height must be optimized for dialogue use');
assert.equal(portrait[25],6,'Gnosis portrait must use RGBA and retain real alpha');
assert.ok(portrait.length<=600*1024,'Gnosis portrait must stay within the mobile asset budget');

const gnosis=manifest.characters.find(asset=>asset.id==='gnosis');
assert.ok(manifest.runtimeReferenced,'the portrait manifest must describe runtime assets');
assert.ok(gnosis,'Gnosis portrait must be registered in the tutorial asset manifest');
assert.equal(gnosis.usage,'tutorial-story-only');
assert.equal(gnosis.dexRegistered,false,'Gnosis must not be added to the character or monster dex');
assert.ok(!Object.hasOwn(gnosis,'characterNo'),'Gnosis must not receive a character-dex number');
assert.equal(crypto.createHash('sha256').update(portrait).digest('hex'),gnosis.cutoutSha256,'manifest hash must identify the deployed transparent PNG');
assert.ok(gnosis.validation.rgba&&gnosis.validation.transparentPixels>0&&gnosis.validation.partialAlphaPixels>0,'the deployed portrait must contain real transparent and antialiased pixels');
assert.ok(!new RegExp("\\bid\\s*:\\s*['\"]gnosis['\"]").test(data),'Gnosis must remain outside gameplay and dex records');

const introIds=['intro_gnosis','gnosis_call_2','gnosis_call_3','gnosis_reveal','gnosis_name','gnosis_contract_power','gnosis_descent'];
let previous=-1;
for(const id of introIds){
  const current=tutorial.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`missing or out-of-order Gnosis intro step: ${id}`);
  previous=current;
}
const intro=tutorial.slice(tutorial.indexOf("id:'intro_gnosis'"),tutorial.indexOf("id:'elna_encounter'"));
assert.ok(intro.includes("text:'ーい……'")&&intro.includes("text:'おーい……'")&&intro.includes("text:'おーい！'"),'the three-part opening call must match the approved wording');
assert.ok(intro.indexOf("text:'ーい……'")<intro.indexOf("text:'おーい……'")&&intro.indexOf("text:'おーい……'")<intro.indexOf("text:'おーい！'"),'the three-part opening call must keep its order');
assert.ok(intro.includes('やっと起きた！')&&intro.includes('案内するぞ！'),'Gnosis must sound cheerful and direct');
assert.ok(!intro.includes('カナタ'),'Kanata must not appear in the prologue');
assert.equal((intro.match(/gnosis-dialogue-transparent-final\.png/g)||[]).length,7,'every Gnosis dialogue step must use the transparent portrait');
assert.ok(intro.includes("id:'gnosis_name'")&&intro.includes("input:'player_name'")&&intro.includes("mode:'external_action'"),'name entry must be a blocking external-action step');
assert.ok(intro.includes('{{playerName}}')&&intro.includes('契約した相手の力を「契約体」として呼び出せる'),'the contract explanation must use the entered name and explain contract bodies');
assert.ok(intro.includes("id:'gnosis_descent'")&&intro.includes("scene:'world_descent'")&&intro.includes("persistAs:'elna_encounter'")&&intro.includes("nextStepId:'elna_encounter'"),'world descent must checkpoint the next prologue encounter without marking the tutorial complete');

['tutorialStoryBackdrop','tutorialCharacterLayer','tutorialCharacterPortrait','tutorialNameForm','tutorialPlayerNameInput']
  .forEach(id=>assert.ok(index.includes(`id="${id}"`),`missing layered story UI contract: #${id}`));
assert.ok(index.indexOf('tutorialStoryBackdrop')<index.indexOf('tutorialCharacterLayer')&&index.indexOf('tutorialCharacterLayer')<index.indexOf('tutorialBubble'),'background, transparent portrait, and dialogue must be separate layers');
assert.match(css,/\.tutorial-story-backdrop\{/,'story backdrop styling is missing');
assert.match(css,/\.tutorial-character-layer\{/,'transparent character layer styling is missing');
assert.match(css,/@media\(max-width:719px\)/,'portrait-phone story layout is missing');
assert.match(css,/\.tutorial-overlay\.is-story-step \.tutorial-bubble\{max-height:calc\(100svh - 20px\)/,'mobile story dialogue must expose its full natural content height');
assert.ok(tutorial.includes('function renderTutorialStoryStep')&&tutorial.includes('function confirmTutorialPlayerName'),'story rendering and name confirmation contracts are missing');
assert.ok(tutorial.includes('setTutorialPlayerName(value)')&&tutorial.includes('saveGame()')&&tutorial.includes('tutorialNext(true)'),'confirmed names must persist before the story advances');

const resumeStart=tutorial.indexOf('function resumeTutorialIfNeeded');
const resumeEnd=tutorial.indexOf('function handleTutorialScreenChange',resumeStart);
const entryContext=vm.createContext({
  document:{body:{classList:{contains:()=>false}}},
  TUTORIAL_MAIN_FLOW_ID:'prologue',state:{status:'not_started',stepId:null,replaying:false},starts:[],
  currentTutorialState:()=>entryContext.state,
  tutorialShouldAutoStart:()=>entryContext.state.status==='not_started',
  startTutorialFlow:(flow,options)=>{entryContext.starts.push({flow,options});return true;}
});
vm.runInContext(tutorial.slice(resumeStart,resumeEnd),entryContext);
assert.equal(vm.runInContext('resumeTutorialIfNeeded()',entryContext),true);
assert.equal(entryContext.starts[0].options.persist,true,'a new save must enter the persistent prologue');
entryContext.state={status:'completed',stepId:null,replaying:false};entryContext.starts=[];
assert.equal(vm.runInContext('resumeTutorialIfNeeded()',entryContext),false,'an existing completed save must not be forced into the new prologue');
entryContext.state={status:'in_progress',stepId:'gnosis_contract_power',replaying:false};entryContext.starts=[];
assert.equal(vm.runInContext('resumeTutorialIfNeeded()',entryContext),true);
assert.equal(entryContext.starts[0].options.stepId,'gnosis_contract_power','an interrupted Gnosis scene must resume at its saved step');
assert.ok(saveSource.includes('playerName')&&saveSource.includes('setTutorialPlayerName'),'the entered player name must remain in the v2 tutorial save contract');

console.log('Tutorial Phase 4A validation passed (transparent Gnosis portrait, approved call, name entry, contract explanation, world descent, resume, and no dex registration).');
