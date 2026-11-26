/* Species traits are derived from the current form. Never persist them on a save. */
const TRAIT_TYPES=Object.freeze(Object.fromEntries(Object.entries({
  adversity:{values:[1.2,1.35],description:'HPが半分以下になると、与えるダメージが上がる'},
  first_strike:{values:[1.4,1.6],description:'戦闘で最初の攻撃が強くなる'},
  stab:{values:[1.15,1.25],description:'自分と同じ属性の技が強くなる'},
  pursuit:{values:[1.2,1.35],description:'弱っている相手に、より大きなダメージを与える'},
  combo:{values:[.15,.25],description:'ときどき、もう一度攻撃する'},
  pierce:{values:[.15,.25],description:'相手の守りを貫いて攻撃する'},
  uplift:{values:[1.2,1.3],description:'戦いが長引くほど、調子が上がる'},
  sturdy:{values:[1,2],description:'HPが満タンなら、一撃では倒れない'},
  hard_guard:{values:[.9,.85],description:'受けるダメージを減らす',lowerIsStronger:true},
  regen:{values:[.04,.06],description:'ターンの終わりに、少しずつHPが回復する'},
  guardian:{values:[1.3,1.5],description:'守りの技の効果が上がる'},
  purify:{values:[1,2],description:'状態異常を防ぐことがある'},
  counter:{values:[.1,.15],description:'攻撃を受けると、相手にもダメージを返す'},
  swift:{values:[1,1.2],description:'交代で出るとき、すきを見せない'},
  parting_gift:{values:[1.2,1.3],description:'倒れても、次の仲間に力を託す'},
  insight:{values:[1,2],description:'相手の強化を見切って打ち消す'},
  inflict:{values:[.1,.18],description:'攻撃で相手を{status}にすることがある'},
  intimidate:{values:[.92,.88],description:'相手をひるませ、攻撃を弱める',lowerIsStronger:true},
  retreat:{values:[1,2],description:'撤退しても、経験を持ち帰る',plusDescription:'撤退しても、経験や素材を持ち帰る'},
  resonance:{values:[1.3,1.5],description:'ココロリンクの力を強める'},
  cheer:{values:[1.08,1.12],description:'控えから、場の仲間を励ます'},
  devotion:{values:[.95,.92],description:'控えから、場の仲間を守る',lowerIsStronger:true},
  healer:{values:[1.25,1.4],description:'回復の技の効果が上がる'},
  fortune:{values:[.15,.25],description:'手に入るコインが増える'},
  learner:{values:[.15,.25],description:'経験値を多くもらえる'},
  bond:{values:[.03,.05],description:'契約が成功しやすくなる'},
  appraiser:{values:[.15,.25],description:'素材が手に入りやすくなる'},
  party_learner:{values:[.1],description:'一緒にいる仲間が、経験値を多くもらえる'},
  scavenger:{values:[.2],description:'素材が手に入りやすくなる'},
  golden_fortune:{values:[.3],description:'手に入るコインが大きく増える'},
  shadow_hide:{values:[.5],description:'戦闘の始めは、影に潜んで攻撃をかわしやすい'},
  frost_body:{values:[.1],description:'触れた相手の動きを鈍らせる'},
  magic_core:{values:[.7],description:'HPが満タンのとき、受けるダメージを大きく減らす'},
  water_mirror:{values:[1],description:'受けた状態異常を、相手に跳ね返す'},
  spark_dance:{values:[.15],description:'炎の技で、相手の攻撃を弱めることがある'},
  lava_armor:{values:[.15],description:'攻撃してきた相手を焼く'},
  star_gather:{values:[.05],description:'力をためるほど、次の攻撃が強くなる'},
  desperate_wings:{values:[1],description:'控えから、仲間の危機を一度だけ救う'},
  alchemy_core:{values:[1.5],description:'錬成の力を引き出す'},
  rising_wind:{values:[.05],description:'戦うほど、速くなっていく'},
  mycelium_root:{values:[.05],description:'少しずつ回復し、毒にかからない'}
}).map(([id,definition])=>[id,Object.freeze({...definition,values:Object.freeze(definition.values)})])));
// Secondary rule values stay beside the definitions so balance changes have one home.
const TRAIT_RULES=Object.freeze({
  lowHpRate:.5,upliftStartTurn:3,comboPowerRate:.5,sturdyGuardRate:.5,
  partingGiftTurns:2,retreatRewardRate:.5,frostBodyMax:.3,
  sparkDanceAttackRate:.85,sparkDanceTurns:2,starGatherMax:.25,risingWindMax:.25
});
const SPECIES_TRAITS=(()=>{
  const out={};
  const trait=(id,name,type,{plus=false,remnant=false,status}={})=>{
    const def=TRAIT_TYPES[type];
    const description=(plus&&def.plusDescription||def.description).replace('{status}',({poison:'毒',paralysis:'麻痺',confusion:'こんらん'})[status]||'状態異常');
    return Object.freeze({id,type,name:name+(plus?'+':''),description,plus,remnant,value:def.values[plus?1:0],...(status?{status}:{})});
  };
  const one=(species,id,name,type,options)=>{out[species]=Object.freeze([trait(id,name,type,options)]);};
  const line=(species,a,b)=>{
    out[species[0]]=Object.freeze([trait(...a)]);
    out[species[1]]=Object.freeze([trait(...a),trait(...b)]);
    out[species[2]]=Object.freeze([trait(...b.slice(0,3),{...b[3],plus:true})]);
  };
  line(['grassbeat','thornbeat','granbeat'],['budding','芽吹き','regen'],['heavy_shell','重甲殻','hard_guard']);
  line(['volteck','spaquinn','voltax'],['electric_charge','帯電','inflict',{status:'paralysis'}],['thunder_spear','雷鳴の一番槍','first_strike']);
  line(['nocle','noclaid','noxvelg'],['night_glide','夜滑り','swift'],['moon_eater','月喰らい','pursuit']);
  line(['luxseed','luxiard','lux_galdion'],['morning_light','朝光の分け与え','cheer'],['protective_wings','守護の光翼','devotion']);
  line(['sylphin','zephyray','tempestray'],['flutter','ひらり','retreat'],['storm_wings','暴風翼','combo']);
  line(['orcana','orca_stream','orca_abyss'],['sea_current','蒼海の流れ','stab'],['deep_sea_lord','深海の主','intimidate']);
  line(['nemes','nemesia','nemesion'],['star_seed','星の芽','learner'],['galaxy_rend','銀河裂き','pierce']);
  one('doom_nemesion','galaxy_rend','銀河裂き','pierce',{remnant:true});
  for(const [ids,id,name,type,options] of [
    [['freigal','freiwolf'],'burning_spirit','燃える闘志','adversity'],
    [['rikasheef','seralphia'],'young_leaf','若葉の生命力','healer'],
    [['volmoog','gran_volmoog'],'earth_breaker','大地砕き','pierce'],
    [['kimeragna','kimeragna_apex'],'poison_wings','猛毒の翼','inflict',{status:'poison'}]
  ]){one(ids[0],id,name,type,options);one(ids[1],id,name,type,{...options,plus:true});}
  one('aquaron','waterside_guard','水辺の構え','guardian');
  out.highaquaron=Object.freeze([trait('waterside_guard','水辺の構え','guardian'),trait('dragon_water','竜の水脈','stab')]);
  one('shenhairon','divine_sea_king','神海の王威','stab',{plus:true});
  one('tienhairon','heavenly_sea_gift','天海の恵み','healer',{plus:true});
  line(['elysia','elysia_prayer','hikari'],['gentle_light','やさしい光','healer'],['prayer_blessing','祈りの加護','purify']);
  line(['stella_apprentice','stella_wizard','stella_sorcerer'],['inspired_chant','ひらめき詠唱','first_strike'],['astral_knowledge','星辰の知識','stab']);
  line(['lumina_apprentice','lumina_wizard','lumina_sorcerer'],['quiet_chant','静かな詠唱','uplift'],['star_formula','星の術式','pierce']);
  for(const [person,a,b] of [
    ['brigitte',['greatshield','大盾の構え','guardian'],['fortress_oath','城塞の誓い','devotion']],
    ['tobia',['quick_escape','逃げ足','retreat'],['skyward_steps','天路の脚','swift']],
    ['roden',['weapon_care','武器の手直し','cheer'],['forge_heat','炉の熱','counter']],
    ['selene',['diagnosis','診たて','healer'],['life_spring','命泉','regen']],
    ['safira',['hotwind_thrust','熱風の一突き','first_strike'],['journey_spear','旅路を守る槍','parting_gift']],
    ['bordo',['kitchen_wisdom','台所の知恵','appraiser'],['cooks_skill','司厨の腕','healer']],
    ['lize',['small_change','小銭好き','fortune'],['contract_slip','契約の札','bond']],
    ['regus',['cursed_iron','呪鉄の代償','adversity'],['curse_breaker','断呪の刃','insight']],
    ['remnes',['borrowed_memory','借り物の記憶','learner'],['star_armor','星鎧','hard_guard']],
    ['nico',['prototype_trap','試作の罠','inflict',{status:'paralysis'}],['blue_thunder_trap','蒼雷の仕掛け','pursuit']],
    ['mireille',['brilliant_stage','華やかな舞台','intimidate'],['illusion_curtain','幻惑の幕','inflict',{status:'confusion'}]]
  ])line([2,3,4].map(r=>'character_'+person+'_'+r),a,b);
  line(['elna_beginner','elna_middle','elna_advanced'],['beginner_spirit','駆け出しの心得','learner'],['polished_sword','磨いた剣技','combo']);
  one('elna_water','flowing_style','流水の型','insight',{plus:true});
  one('elna_kaen','floral_flame_style','華炎の型','stab',{plus:true});
  one('character_vera_3','activation','起動','first_strike');
  out.character_vera_4=Object.freeze([trait('activation','起動','first_strike'),trait('black_flame','黒炎','pierce')]);
  one('character_vera_5','black_flame','黒炎','pierce',{remnant:true});
  for(const [species,type,name] of [
    ['slime','party_learner','ぷるぷるボディ'],['goblin','scavenger','どこにでもいる'],['slime_gold','golden_fortune','黄金のしずく'],
    ['nightmare','shadow_hide','影潜み'],['icegolem','frost_body','凍てつく体'],['proto_icegolem','magic_core','魔力核'],
    ['suiren','water_mirror','水鏡'],['tsubaki','spark_dance','火花の舞'],['ignaros','lava_armor','溶岩の鎧'],
    ['astralepis','star_gather','星集め'],['galdra','desperate_wings','懸命な翼'],['alchemion','alchemy_core','錬成核'],
    ['ashleia','rising_wind','上昇気流'],['morglum','mycelium_root','菌糸の根']
  ])one(species,type,name,type);
  out.elixion=Object.freeze([]);out.false_dragon_alfa=Object.freeze([]);
  return Object.freeze(out);
})();
const EMPTY_SPECIES_TRAITS=Object.freeze([]);
function traitsForSpecies(idOrIns){
  const id=typeof idOrIns==='string'?idOrIns:idOrIns?.id;
  return Object.prototype.hasOwnProperty.call(SPECIES_TRAITS,id)?SPECIES_TRAITS[id]:EMPTY_SPECIES_TRAITS;
}
function traitValue(insOrId,type,fallback=0){
  const matches=traitsForSpecies(insOrId).filter(t=>t.type===type);
  if(!matches.length)return fallback;
  return (TRAIT_TYPES[type]?.lowerIsStronger?Math.min:Math.max)(...matches.map(t=>t.value));
}
