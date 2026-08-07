let editingSkillUid = null;
let player, enemy, pHp, eHp;
let busy = false, pAtk = 1, eAtk = 1, pGuard = false, eGuard = false;
let pStatus = null, eStatus = null;
let pParalysisTurns = 0, eParalysisTurns = 0;
let pConfusionTurns = 0, eConfusionTurns = 0;
let pSleepTurns = 0, eSleepTurns = 0;
let pFlareCharge = false, eFlareCharge = false;
let pAquaShield = false, eAquaShield = false;
let activeInstance = null;
let partyBattle = [], activePartyIdx = 0, selectedMap = null;
let pendingEvolutions = [], currentEvolution = null;
let bossCautionPlaying = false;
let bossCautionTimer = null;


let pendingContractItemId = 'contract_scroll';
const TITLE_LAST_MAP_KEY='mb_title_last_map_v7';
let titleStarted=false;
