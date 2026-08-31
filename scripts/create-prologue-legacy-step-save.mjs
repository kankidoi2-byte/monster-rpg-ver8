import fs from 'node:fs';

const tutorial=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const redirectsBlock=tutorial.slice(
  tutorial.indexOf('const TUTORIAL_REMOVED_STEP_REDIRECTS'),
  tutorial.indexOf('function tutorialStepIndex')
);
const removedSteps=[...redirectsBlock.matchAll(/(?:\{|,)\s*([a-z0-9_]+):'[^']+'/g)].map(match=>match[1]);
const stepId=process.argv[2];
if(!removedSteps.includes(stepId)){
  console.error('使い方: node scripts/create-prologue-legacy-step-save.mjs <削除済みSTEP ID>');
  console.error(`指定可能: ${removedSteps.join(', ')}`);
  process.exitCode=1;
}else{
  const instance=(uid,id,level=7,extra={})=>({uid,id,level,exp:0,locked:false,...extra});
  const save={
    schemaVersion:4,
    saveMeta:{migrations:[],lastSavedAt:null,integrityHash:null},
    caught:['freigal','aquaron','elna_beginner','alchemion'],
    instances:[
      instance('legacy_freigal','freigal'),
      instance('legacy_aquaron','aquaron'),
      instance('legacy_elna','elna_beginner',7,{tutorialContract:true,tutorialRole:'contract_body'}),
      instance('legacy_alchemion','alchemion',1,{tutorialAlchemyLesson:true})
    ],
    levels:{freigal:7,aquaron:7,elna_beginner:7,alchemion:1},
    exp:{freigal:0,aquaron:0,elna_beginner:0,alchemion:0},
    items:{monster_bone:7,magic_crystal:7,metal_ore:7,unstable_alchemy_matter:7},
    coins:777,
    alchemyResonance:0,
    party:['legacy_freigal','legacy_aquaron','legacy_elna'],
    history:{wins:0,logs:[]},
    skillCards:{skill_elna_middle_01:2},
    equippedSkills:{legacy_elna:['skill_elna_middle_01']},
    itemDex:['monster_bone','magic_crystal','metal_ore','unstable_alchemy_matter'],
    mapDex:['grassland'],
    expeditions:{
      completedCount:4,
      active:[{id:'legacy_short',mapId:'grassland',distanceId:'short',memberUids:['legacy_alchemion'],requiredWins:1,progress:0,status:'active'}]
    },
    goldenLandMapReady:false,
    contractor:{systemVersion:1,exp:0,claimedRankRewards:[],expEventIds:[],unlockedTitleIds:[],equippedTitleId:null,recentExp:[],pendingRankUps:[],legacyMigrationVersion:0,legacyMigrationSummary:null},
    progress:{
      chapterId:'prologue',storyFlags:{},
      tutorial:{
        id:'prologue',version:2,status:'in_progress',stepId,completed:false,skipped:false,replaying:false,
        playerName:'移行確認',playerNamed:true,starterContractsGranted:true,elnaGuestActive:false,
        elnaContractGranted:true,stellaSkillCardGranted:true,alchemySuppliesGranted:true,
        alchemyLessonPrepared:true,alchemyLessonCompleted:true,expeditionDispatched:true,
        prologueCompleted:false,firstContractGuaranteeUsed:true,starterContractScrollGranted:true,guides:{}
      },
      missions:{version:1,states:{}}
    },
    quarantine:{unknownInstances:[],unknownCaughtIds:[],invalidExpeditions:[]}
  };
  process.stdout.write(`${JSON.stringify(save,null,2)}\n`);
}
