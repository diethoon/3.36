
/* ========================================================================
   BEGIN CHEAT LEDGER — Sanguine / ChatGPT
   Target build: Wayward 2026-09-30

   Removal:
     Delete everything from this BEGIN marker through the matching END marker.

   Porting:
     Copy this complete block to a later game build. Build-sensitive hooks and
     minified engine symbols are intentionally grouped in the ENGINE ADAPTER
     section so they can be re-mapped without rewriting the interface.
   ======================================================================== */
;(()=>{try{
  if(typeof re==='undefined'||!re||typeof re.getState!=='function'||globalThis.__SANGUINE_CHATGPT_CHEAT_LEDGER__)return;
  globalThis.__SANGUINE_CHATGPT_CHEAT_LEDGER__=true;

  const WC_ID='cheat-ledger-launcher';
  const WC_OVERLAY='cheat-ledger-overlay';
  const WC_REVIEW='cheat-ledger-final-review';
  const LS={
    infiniteMana:'cheat-ledger.infinite-mana',
    infiniteStorage:'cheat-ledger.infinite-storage',
    safeSlip:'cheat-ledger.safe-slip',
    magicOutcome:'cheat-ledger.magic-outcome',
    brewOutcome:'cheat-ledger.brew-outcome',
    autoReview:'cheat-ledger.auto-review',
    favorites:'cheat-ledger.favorites'
  };
  const bool=(key,def=false)=>{try{const v=localStorage.getItem(key);return v==null?def:v==='1'}catch(_){return def}};
  const textPref=(key,def='')=>{try{return localStorage.getItem(key)??def}catch(_){return def}};
  const setBool=(key,v)=>{try{localStorage.setItem(key,v?'1':'0')}catch(_){}};
  const setText=(key,v)=>{try{localStorage.setItem(key,String(v))}catch(_){}};

  globalThis.__CHEAT_LEDGER_INFINITE_MANA__=bool(LS.infiniteMana,false);
  globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__=bool(LS.infiniteStorage,false);
  globalThis.__CHEAT_LEDGER_SAFE_SLIP__=bool(LS.safeSlip,false);
  globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__=textPref(LS.magicOutcome,'normal');
  globalThis.__CHEAT_LEDGER_BREW_OUTCOME__=textPref(LS.brewOutcome,'normal');

const LEDGER_STATE_KEY='cheatLedger';
const LEGACY_LEDGER_STATE_KEY='wayward'+'Mod';
const ledgerData=s=>(s&&s[LEDGER_STATE_KEY])||(s&&s[LEGACY_LEDGER_STATE_KEY])||{};
function migrateLedgerState(s){
  if(!s||!s[LEGACY_LEDGER_STATE_KEY])return s;
  const next={...s,[LEDGER_STATE_KEY]:{...s[LEGACY_LEDGER_STATE_KEY],...(s[LEDGER_STATE_KEY]||{})}};
  delete next[LEGACY_LEDGER_STATE_KEY];
  return next
}

/* ----------------------------- ENGINE ADAPTER -----------------------------
   These are the build-sensitive bindings for Wayward 2026-09-30.
   When moving Cheat Ledger to another build, verify/remap this section first.
   ------------------------------------------------------------------------ */
const ENGINE={
  makeReturningCustomer:rH,
  addCustomer:Ga,
  arrivalText:GM,
  syncPatronPresence:KV,
  returningFlavor:wbe,
  chooseTactic:m$,
  maxPatrons:aH
};
const ENGINE_ORIGINAL={
  availableMana:po,
  storageCapacity:Jf,
  magicOutcome:Ww,
  slipDetection:c7,
  applyPotion:hx,
  potionLabel:qw,
  namedArrival:eae,
  resolveBrew:ibe,
  brewChance:k5,
  brewEffects:Kw
};
po=function(magic){
  return globalThis.__CHEAT_LEDGER_INFINITE_MANA__?rs(magic):ENGINE_ORIGINAL.availableMana(magic)
};
Jf=function(state){
  return globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__?1e9:ENGINE_ORIGINAL.storageCapacity(state)
};
Ww=function(a,b,c){
  const forced=globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__;
  return forced&&forced!=='normal'&&['clean','partial','overload','sideways','backlash'].includes(forced)
    ?forced:ENGINE_ORIGINAL.magicOutcome(a,b,c)
};
c7=function(state,cup,targetId){
  return globalThis.__CHEAT_LEDGER_SAFE_SLIP__?0:ENGINE_ORIGINAL.slipDetection(state,cup,targetId)
};
hx=function(state,cup,targetId,hidden){
  const next=ENGINE_ORIGINAL.applyPotion(state,cup,targetId,hidden);
  return cup&&cup.cheatPreset?applyPresetPotion(next,cup,targetId):next
};
qw=function(cup){
  const label=ENGINE_ORIGINAL.potionLabel(cup);
  return cup&&cup.customName?`${cup.customName} · ${label}`:label
};
eae=function(def,record,slot,state){
  const name=state?.namedPatronNames?.[def.id]??def.name;
  const type=ledgerData(state).patronTypeOverrides?.[name];
  return ENGINE_ORIGINAL.namedArrival(type?{...def,patronType:type}:def,record,slot,state)
};
let brewResolutionMode=null;
ibe=function(state,ingredients,batch){const previous=brewResolutionMode;const mode=globalThis.__CHEAT_LEDGER_BREW_OUTCOME__;brewResolutionMode=['success','strong'].includes(mode)?mode:null;try{return ENGINE_ORIGINAL.resolveBrew(state,ingredients,batch)}finally{brewResolutionMode=previous}};
k5=function(...args){return brewResolutionMode?1:ENGINE_ORIGINAL.brewChance(...args)};
Kw=function(...args){const effects=ENGINE_ORIGINAL.brewEffects(...args);return brewResolutionMode==='strong'?effects.map(e=>({...e,units:e.units*2})):effects};
/* --------------------------- END ENGINE ADAPTER -------------------------- */

  const TRAIT_LABELS={
    true_prude:'극도로 보수적',self_protective:'자기보호적',latent_dominant:'지배 성향',romance_starved:'애정에 굶주림',
    likes_cheating:'외도 성향',cold_pragmatist:'냉정한 실리주의자',breaks_under_pressure:'압박에 약함',guilt_eroticizer:'죄책감에서 흥분',
    latent_exhibitionist:'노출 성향',public_thrill_seeker:'공개 스릴 추구',latent_submissive:'복종 성향',easily_intoxicated:'술에 쉽게 취함',
    enjoys_making_him_jealous:'질투 유발을 즐김',wants_to_be_corrupted:'타락 욕구',latent_masochist:'피학 성향',latent_voyeur:'관음 성향',
    curious_about_women:'여성에게 호기심',jealousy_kindled:'질투로 자극받음',wary_of_drinks:'술을 경계함',latent_self_pleasure:'숨겨진 자기쾌락 성향'
  };
  const TRAIT_DESCS={
    true_prude:'싫어하거나 선을 넘는 행동에 강하게 저항합니다.',self_protective:'자신을 지키려는 성향이 강해 손님의 제안과 압박에 쉽게 넘어가지 않습니다.',latent_dominant:'주도권을 잡고 상대를 이끄는 상황에 더 잘 반응합니다.',romance_starved:'정서적 외로움이 커서 다정한 말과 로맨틱한 관심에 더 쉽게 흔들립니다.',
    likes_cheating:'배신의 위험과 금지된 상황 자체가 흥분을 높여 몰래 선을 넘는 행동에 끌리기 쉽습니다.',cold_pragmatist:'돈 걱정이 클수록 감정보다 실리를 택하고 금전이 걸린 제안을 받아들이기 쉬워집니다.',breaks_under_pressure:'여러 사람의 압박이나 강한 분위기 속에서 버티는 힘이 더 빨리 약해집니다.',guilt_eroticizer:'죄책감이 생길 때 그 감정이 흥분으로 이어질 수 있습니다.',
    latent_exhibitionist:'몸을 드러내거나 남의 시선을 받는 상황에서 숨은 즐거움을 느낄 수 있습니다.',public_thrill_seeker:'들킬 위험이 있는 공개적인 상황의 긴장감 자체를 즐깁니다.',latent_submissive:'상대에게 주도권을 넘기고 따르는 상황에 더 잘 반응합니다.',easily_intoxicated:'술에 더 쉽게 취하며 취기가 오르면 자제력과 저항이 약해지기 쉽습니다.',
    enjoys_making_him_jealous:'당신의 질투를 끌어내기 위해 눈앞에서 다른 사람과의 행동을 더 밀어붙일 수 있습니다.',wants_to_be_corrupted:'자신이 달라지고 금기를 넘는 과정 자체에 숨은 욕구를 가집니다.',latent_masochist:'거친 자극·고통·굴욕이 쾌감과 연결될 수 있습니다.',latent_voyeur:'다른 사람의 은밀한 행동을 지켜보는 데 강한 호기심을 가집니다.',
    curious_about_women:'여성 손님과의 친밀하거나 성적인 상황에 호기심을 가집니다.',jealousy_kindled:'질투가 생기면 감정과 욕구가 오히려 더 강해질 수 있습니다.',wary_of_drinks:'근무 중 술을 마시는 일에 특히 조심스럽고 권유를 더 강하게 경계합니다.',latent_self_pleasure:'혼자 있는 밤에 스스로 욕구를 해소하는 행동이 나타날 수 있습니다.'
  };
  const SKILL_LABELS={hunting:'사냥',foraging:'채집',brewing:'물약 제조',cooking:'요리',serving:'서빙'};
  const ATTR_LABELS={strength:'힘',deftness:'손재주',vigor:'활력',wit:'재치',composure:'침착성',charm:'매력',honesty:'솔직함',libido:'성욕',loyalty:'정절',openness:'개방성',confidence:'자신감'};
  const AFFINITY_LABELS={romantic:'로맨스',oral:'구강',vaginal:'성관계',anal:'항문',breast:'가슴',exhibition:'노출',dominance:'지배/주도',submission:'복종',domination:'지배',prostitution:'금전 관계',drinking:'음주',taboo:'금기'};
  const LIMIT_LABELS={sex_vaginal:'성관계',sex_rough:'거친 성관계',sex_anal:'항문',oral_giving:'구강 · 해주기',oral_receiving:'구강 · 받기',genital_rubbing:'마찰',cum_in_mouth:'입 안에 사정',cum_swallow:'삼키기',manual_giving:'손 · 해주기',manual_receiving:'손 · 받기',watch_him:'그를 보기',touch_over_clothes:'옷 위로 만지기',touch_skin:'피부 만지기',visual_thigh:'허벅지 노출',visual_undergarments:'속옷 노출',visual_explicit:'노골적 노출',visual_topless:'상반신 노출',visual_bottomless:'하반신 노출',visual_full_nude:'전라',kiss_real:'진한 키스'};
  const NEGATIVE_EMOTIONS=new Set(['contempt','anger','disgust','shame','guilt','regret','sadness','humiliation']);
  const BELIEF_LABELS={nothing:'아무것도 모름',the_house:'집에 관한 소문을 들음',about_her:'그녀에 관한 소문을 들음',specific:'구체적인 일을 들음',saw:'직접 목격'};
  const MAGIC_OUTCOMES=[['normal','본래 판정'],['clean','정상 시전 (Clean)'],['partial','불완전 시전 (Partial)'],['overload','과부하 (Overload)'],['sideways','빗나감 (Sideways)'],['backlash','역류 (Backlash)']];
  const PATRON_INTENTS=[['drink_only','술만 마심'],['talk_only','대화 위주'],['flirt_curious','가벼운 유혹'],['interested','적극적인 관심'],['predatory','강압적 접근']];
  const PATRON_SUMMON_INTENTS=[['normal','평소대로'],...PATRON_INTENTS];
  const PATRON_TACTICS=[['warm_builder','친근하게 신뢰 쌓기'],['drink_pusher','술 권하기'],['smooth_charmer','능숙한 유혹'],['lap_grabber','직접적인 신체 접촉'],['transactional','금전 거래 제안']];
  const PRESETS=[
    {id:'centaur_extract',name:'켄타우로스의 고환 농축액',tag:'구매자용 · 육체 강화',durationSlots:1440,chemistryBonus:5,desc:'힘과 활력을 크게 끌어올리고 기력을 회복합니다. 손님이 마시면 그녀와의 케미스트리도 하루 동안 소폭 좋아집니다.',effects:[['fortify_strength',3.25],['fortify_vigor',3.25],['fortify_composure',2],['restore_energy',2]],extra:[['성욕',18]]},
    {id:'casanova_draught',name:'카사노바의 물약',tag:'구매자용 · 유혹과 기교',durationSlots:1440,chemistryBonus:12,desc:'재치·손재주·매력과 침착성을 강화합니다. 손님이 마시면 그녀와의 케미스트리가 하루 동안 뚜렷하게 좋아지지만, 영구적인 관계값을 바꾸지는 않습니다.',effects:[['fortify_wit',3],['fortify_deftness',3],['fortify_charm',3],['fortify_composure',2]],extra:[['자신감',15]]},
    {id:'succubus_elixir',name:'서큐버스의 엘릭서',tag:'히로인 취약 · 개방과 욕구',durationSlots:1440,desc:'개방성과 욕구를 크게 끌어올리고 약 와인 세 잔 정도의 취기를 더합니다. 침착성·자신감·솔직함과 정절을 하루가량 낮추지만 기본 성격을 영구적으로 바꾸지는 않습니다.',effects:[['open',4],['kindle',7],['befuddle',1.2],['cow',3],['sap_composure',2.5]],extra:[['성욕',18],['솔직함',-14],['정절',-18]]},
    {id:'holy_water',name:'축복받은 성수',tag:'히로인 방어 · 절제와 정화',durationSlots:1440,desc:'술기운과 흥분을 가라앉히고 침착성·솔직함·자신감을 회복합니다. 정절을 하루가량 보강하며 기본 성격은 그대로 유지됩니다.',effects:[['sober',1.2],['candor',3],['fortify_composure',3],['embolden',2],['quell',5],['restore_energy',2]],extra:[['정절',24]]},
    {id:'archmage_blue',name:'현자의 엘릭서',tag:'마법 학습 · 회복과 집중',durationSlots:1440,desc:'마나와 기력을 넉넉히 되찾고 피로를 걷어냅니다. 재치와 침착성을 오래 높여 공부·수련·연속 시전에 알맞습니다.',effects:[['restore_mana',3],['clear_fatigue',3],['restore_energy',2],['fortify_wit',3],['fortify_composure',3]],extra:[]}
  ];

  const clone=v=>{try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
  const fmt=(v,d=2)=>Number.isFinite(Number(v))?(Number(v)%1===0?String(Number(v)):String(Number(Number(v).toFixed(d)))):'0';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wifeOf=s=>s&&s.characters?s.characters[s.primaryCharacterId]:null;
  const pathGet=(obj,path)=>{let x=obj;for(const k of path){if(x==null)return undefined;x=x[k]}return x};
  const pathSet=(obj,path,value,idx=0)=>{if(idx>=path.length)return value;const src=obj&&typeof obj==='object'?obj:{};const out=Array.isArray(src)?src.slice():{...src};out[path[idx]]=pathSet(src[path[idx]],path,value,idx+1);return out};
  const setPath=(s,path,value)=>pathSet(s,path,value);
  const traitIds=()=>{try{return [...new Set([...Object.keys(typeof sh==='object'&&sh?sh:{}),...Object.keys(TRAIT_LABELS)])]}catch(_){return Object.keys(TRAIT_LABELS)}};
  const skillIds=()=>{try{return Array.isArray(V6)&&V6.length?[...V6]:Object.keys(SKILL_LABELS)}catch(_){return Object.keys(SKILL_LABELS)}};
  const ingredientCatalog=()=>{try{return Array.isArray(nd)?nd.filter(x=>x&&x.id&&x.id!=='wine'):[]}catch(_){return []}};
  const effectLabel=id=>{try{return typeof Nd==='function'?Nd(id):id}catch(_){return id}};
  const effectText=(id,u)=>{try{return typeof Hw==='function'?Hw(id,u):`${effectLabel(id)} ${Math.round(u*100)}%`}catch(_){return `${effectLabel(id)} ${Math.round(u*100)}%`}};
  const stillroom=s=>{try{return typeof yo==='function'?yo(s):(s.stillroom||{ingredients:{},cups:[],known:{},brewsToday:0,dosesToday:{}})}catch(_){return s.stillroom||{ingredients:{},cups:[],known:{},brewsToday:0,dosesToday:{}}}};
  const officialCapacity=s=>{const sr=stillroom(s);try{return typeof sye==='function'?sye(sr.storage??[]):40}catch(_){return 40}};
  const usedCapacity=s=>{const sr=stillroom(s);return Object.values(sr.ingredients||{}).reduce((a,b)=>a+(Number(b)||0),0)+(sr.cups?.length||0)};
  const limitIds=()=>{try{return typeof Vq==='object'&&Vq?Object.keys(Vq):Object.keys(LIMIT_LABELS)}catch(_){return Object.keys(LIMIT_LABELS)}};
  function resentmentValue(w){let n=0;for(const f of w?.feelings||[])if(f?.target?.kind==='husband'&&NEGATIVE_EMOTIONS.has(f.emotion))n=Math.max(n,Number(f.intensity)||0);return n}
  function setResentment(s,value){const w=wifeOf(s);if(!w)return s;const feelings=(w.feelings||[]).filter(f=>!(f?.target?.kind==='husband'&&NEGATIVE_EMOTIONS.has(f.emotion)));if(value>0)feelings.push({emotion:'contempt',intensity:clamp(value,0,100),source:'cheats panel',target:{kind:'husband'},class:'persistent'});return setPath(s,['characters',s.primaryCharacterId,'feelings'],feelings)}
  function latitudeValue(s,id,key){const w=wifeOf(s),e=w?.latitude?.byCategory?.[id];return Number(e?.[key]??0)||0}
  function setLatitudeValue(s,id,key,value){const w=wifeOf(s);if(!w)return s;const latitude=w.latitude&&typeof w.latitude==='object'?w.latitude:{byCategory:{},byPatron:{}};const byCategory={...(latitude.byCategory||{})},entry={...(byCategory[id]||{})},sources={...(entry.sources||{})};entry[key]=clamp(value,0,100);const side=key.startsWith('restriction')?'restriction':'encouragement';sources[side]=['cheats'];entry[side+'LastDay']=s.day??entry[side+'LastDay']??1;entry.sources=sources;byCategory[id]=entry;return setPath(s,['characters',s.primaryCharacterId,'latitude'],{...latitude,byCategory,byPatron:latitude.byPatron||{}})}

  const presetName=id=>PRESETS.find(p=>p.id===id)?.name||id;
  function durationText(slots){slots=Math.max(0,Math.round(Number(slots)||0));if(slots>=1440){const d=Math.floor(slots/1440),h=Math.floor(slots%1440/60);return h?`${d}일 ${h}시간 남음`:`${d}일 남음`}if(slots>=60){const h=Math.floor(slots/60),m=slots%60;return m?`${h}시간 ${m}분 남음`:`${h}시간 남음`}return `${slots}분 남음`}
  function effectSourceLabel(src){src=String(src||'');if(src.startsWith('special:'))return presetName(src.slice(8));if(src.startsWith('philtre:'))return `물약 · ${effectLabel(src.slice(8))}`;if(src.startsWith('spell:'))return src.includes('raise')?'마법 · 상승':src.includes('lower')?'마법 · 하강':'마법';return src||'임시 효과'}
  function activeAttributeEffects(s,person,key){const slot=Number(s?.slot)||0;return (person?.attributeEffects||[]).filter(e=>e&&e.attribute===key&&Number(e.expiresAtSlot)>slot)}
  function activeAffinityEffects(s,person,key){const slot=Number(s?.slot)||0;return (person?.affinityEffects||[]).filter(e=>e&&e.category===key&&Number(e.expiresAtSlot)>slot)}
  function attributeEffective(person,key){try{return typeof L==='function'?Number(L(person)?.[key]):Number(person?.attributes?.[key])}catch(_){return Number(person?.attributes?.[key])}}
  function influenceLine(s,base,current,effects){if(!effects.length&&Math.abs(Number(current)-Number(base))<.001)return'';const chips=effects.map(e=>{const d=Number(e.currentDelta??e.delta)||0;return `<span class="wc-influence-chip ${d<0?'down':'up'}">${esc(effectSourceLabel(e.source))} ${d>=0?'+':''}${fmt(d,2)} · ${esc(durationText(Number(e.expiresAtSlot)-(Number(s.slot)||0)))}</span>`}).join('');return `<div class="wc-influence"><div class="wc-influence-summary"><span>기본 <b>${fmt(base,3)}</b></span><span>현재 유효 <b>${fmt(current,3)}</b></span></div>${chips?`<div class="wc-influence-list">${chips}</div>`:''}</div>`}
  function affinityInfo(s,w,key){const current=Number(w?.affinities?.[key]??0),effects=activeAffinityEffects(s,w,key),sum=effects.reduce((a,e)=>a+(Number(e.delta)||0),0),base=clamp(current-sum,-2,2);return{base,current,effects,sum}}
  function chemistryEffects(s,name){const slot=Number(s?.slot)||0;return ((ledgerData(s).patronChemistryEffects||{})[name]||[]).filter(e=>e&&Number(e.expiresAtSlot)>slot)}
  function chemistryInfo(s,name){const rec=(s.patronRecords||[]).find(p=>p?.name===name),cus=(s.customers||[]).find(p=>p?.name===name),current=Number(rec?.chemistry??cus?.chemistry??50),effects=chemistryEffects(s,name),sum=effects.reduce((a,e)=>a+(Number(e.delta)||0),0),base=clamp(current-sum,0,100);return{base,current,effects,sum}}
  function addTemporaryChemistry(s,name,delta,until,source,id){if(!name||!delta)return s;const rec=(s.patronRecords||[]).find(p=>p?.name===name),cus=(s.customers||[]).find(p=>p?.name===name),current=Number(rec?.chemistry??cus?.chemistry??50),next=clamp(current+delta,0,100),actual=next-current;if(Math.abs(actual)<.001)return s;const mod={...(ledgerData(s))},map={...(mod.patronChemistryEffects||{})},arr=[...(map[name]||[]),{id,delta:actual,source,expiresAtSlot:until}];map[name]=arr;mod.patronChemistryEffects=map;const records=(s.patronRecords||[]).map(p=>p?.name===name?{...p,chemistry:next}:p),customers=(s.customers||[]).map(p=>p?.name===name?{...p,chemistry:next}:p);return{...s,[LEDGER_STATE_KEY]:mod,patronRecords:records,customers}}
  function setPatronBaseChemistry(s,name,base){const info=chemistryInfo(s,name),target=clamp(Number(base)+info.sum,0,100);return updatePatron(s,name,'chemistry',target,false)}
  function expireTemporaryChemistry(s){const map=ledgerData(s).patronChemistryEffects;if(!map||typeof map!=='object')return s;const slot=Number(s.slot)||0;let changed=false,records=s.patronRecords||[],customers=s.customers||[],nextMap={};for(const [name,list] of Object.entries(map)){const active=[],expired=[];for(const e of list||[])(Number(e.expiresAtSlot)>slot?active:expired).push(e);if(expired.length){changed=true;const d=expired.reduce((a,e)=>a+(Number(e.delta)||0),0);records=records.map(p=>p?.name===name?{...p,chemistry:clamp(Number(p.chemistry??50)-d,0,100)}:p);customers=customers.map(p=>p?.name===name?{...p,chemistry:clamp(Number(p.chemistry??50)-d,0,100)}:p)}if(active.length)nextMap[name]=active}if(!changed)return s;const mod={...(ledgerData(s)),patronChemistryEffects:nextMap};return{...s,[LEDGER_STATE_KEY]:mod,patronRecords:records,customers}}

  let panelOpen=false,activeTab='quick',heroineView='profile',alchemyView='materials',alchemyFilter='all',alchemySearch='',materialBulk=3,relationView='people',selectedPersonId='',selectedPatronName='',patronSummonIntent='normal',history=[],future=[],renderTimer=null,previousRoot=re.getState(),reviewOpen=false,reviewDraft=null,reviewOriginal=null,reviewWifeId=null,reviewTab='base',searchResults=[],searchPick=-1;
  const MAX_HISTORY=15;

  const style=document.createElement('style');
  style.textContent=`
    #${WC_ID}{position:fixed;top:max(.5rem,env(safe-area-inset-top));right:max(15.5rem,calc(env(safe-area-inset-right) + 15rem));z-index:46;height:2.25rem;padding:0 .85rem;display:none;align-items:center;gap:.35rem;border:1px solid #a16207;border-radius:.4rem;background:rgba(120,53,15,.96);color:#fef3c7;box-shadow:0 3px 12px rgba(0,0,0,.4);font:600 .76rem/1 system-ui,sans-serif;cursor:pointer}
    #${WC_ID}:hover{background:#92400e;border-color:#f59e0b}
    #${WC_OVERLAY}[hidden],#${WC_REVIEW}[hidden]{display:none!important}
    #${WC_OVERLAY}{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.76);display:flex;align-items:center;justify-content:center;padding:max(.65rem,env(safe-area-inset-top)) max(.65rem,env(safe-area-inset-right)) max(.65rem,env(safe-area-inset-bottom)) max(.65rem,env(safe-area-inset-left));font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    #${WC_OVERLAY} *{box-sizing:border-box}
    .wc-shell{width:min(88rem,98vw);height:min(58rem,94vh);display:grid;grid-template-columns:13.5rem minmax(0,1fr);grid-template-rows:auto 1fr auto;overflow:hidden;color:#e7e5e4;background:#1c1917;border:1px solid #57534e;border-radius:.75rem;box-shadow:0 28px 90px rgba(0,0,0,.72)}
    .wc-header{grid-column:1/-1;display:flex;align-items:center;gap:.75rem;padding:.75rem .9rem;border-bottom:1px solid #44403c;background:#1c1917}
    .wc-titlebox{min-width:12rem}.wc-title{font-size:1.08rem;font-weight:800;color:#fcd34d}.wc-sub{margin-top:.1rem;font-size:.72rem;color:#a8a29e}
    .wc-search{flex:1;min-width:8rem;height:2.2rem;padding:0 .7rem;color:#f5f5f4;background:#0c0a09;border:1px solid #57534e;border-radius:.4rem;font-size:.8rem}.wc-search:focus{outline:1px solid #f59e0b;border-color:#f59e0b}
    .wc-head-actions{display:flex;gap:.4rem}.wc-btn,.wc-icon{border:1px solid #57534e;background:#292524;color:#e7e5e4;border-radius:.4rem;cursor:pointer;font-weight:650}.wc-btn{min-height:2rem;padding:.45rem .7rem;font-size:.76rem}.wc-icon{width:2.1rem;height:2.1rem;font-size:.95rem}.wc-btn:hover,.wc-icon:hover{background:#44403c;border-color:#78716c}.wc-btn:disabled,.wc-icon:disabled{opacity:.35;cursor:not-allowed}.wc-btn.gold{color:#fef3c7;background:#78350f;border-color:#a16207}.wc-btn.green{color:#dcfce7;background:#14532d;border-color:#16a34a}.wc-btn.red{color:#fee2e2;background:#7f1d1d;border-color:#b91c1c}.wc-btn.ghost{background:transparent}
    .wc-sidebar{overflow-y:auto;padding:.65rem;border-right:1px solid #44403c;background:#171412}.wc-tab{width:100%;display:flex;align-items:center;gap:.55rem;padding:.62rem .7rem;margin-bottom:.25rem;border:1px solid transparent;border-radius:.42rem;background:transparent;color:#a8a29e;text-align:left;font-size:.8rem;font-weight:650;cursor:pointer}.wc-tab:hover{color:#e7e5e4;background:#292524}.wc-tab.active{color:#fef3c7;background:#422006;border-color:#92400e}.wc-tab .ico{width:1.25rem;text-align:center}
    .wc-main{overflow:auto;padding:1rem;background:#1c1917}.wc-footer{grid-column:1/-1;display:flex;justify-content:space-between;gap:.8rem;align-items:center;padding:.48rem .85rem;border-top:1px solid #44403c;color:#a8a29e;font-size:.7rem;background:#171412}.wc-status-on{color:#86efac}.wc-status-off{color:#a8a29e}
    .wc-page-title{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin:0 0 .85rem}.wc-page-title h2{margin:0;color:#f5f5f4;font-size:1.05rem}.wc-page-title p{margin:.15rem 0 0;color:#a8a29e;font-size:.75rem}.wc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;align-items:stretch}.wc-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.wc-grid>.wc-card{align-self:stretch}.wc-span2{grid-column:1/-1}
    .wc-card{align-self:stretch;padding:.75rem;background:rgba(41,37,36,.72);border:1px solid #44403c;border-radius:.55rem}.wc-card-title{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin:0 0 .55rem;color:#e7e5e4;font-size:.77rem;font-weight:800;letter-spacing:.025em}.wc-card-note{margin:-.25rem 0 .55rem;color:#a8a29e;font-size:.7rem;line-height:1.45}.wc-divider{height:1px;background:#44403c;margin:.65rem 0}.wc-actions{display:flex;flex-wrap:wrap;gap:.4rem}.wc-chip{display:inline-flex;align-items:center;padding:.22rem .42rem;border:1px solid #57534e;border-radius:999px;background:#292524;color:#d6d3d1;font-size:.68rem}.wc-chip.good{border-color:#166534;color:#bbf7d0;background:#052e16}.wc-chip.warn{border-color:#92400e;color:#fde68a;background:#451a03}
    .wc-field{display:grid;grid-template-columns:minmax(7.2rem,1fr) minmax(8rem,1.25fr) 5.2rem;gap:.55rem;align-items:center;min-height:2.45rem;padding:.27rem .32rem;border-radius:.35rem;font-size:.76rem}.wc-field:nth-child(even){background:rgba(12,10,9,.24)}.wc-label{min-width:0;color:#d6d3d1}.wc-label small{display:block;margin-top:.12rem;color:#78716c;font-size:.64rem;line-height:1.2}.wc-range{width:100%;accent-color:#d97706}.wc-num,.wc-select,.wc-text{width:100%;height:2rem;padding:0 .45rem;color:#f5f5f4;background:#0c0a09;border:1px solid #57534e;border-radius:.35rem;font:500 .75rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.wc-select,.wc-text{font-family:system-ui,sans-serif}.wc-num:focus,.wc-select:focus,.wc-text:focus{outline:1px solid #f59e0b;border-color:#f59e0b}
    .wc-step{display:grid;grid-template-columns:2rem minmax(3.2rem,1fr) 2rem;gap:.25rem;align-items:center}.wc-step button{height:2rem;border:1px solid #57534e;border-radius:.35rem;background:#292524;color:#e7e5e4;cursor:pointer}.wc-step .wc-num{text-align:center;padding:0 .15rem}
    .wc-switch-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;min-height:2.65rem;padding:.35rem .4rem;border-radius:.4rem}.wc-switch-row:hover{background:rgba(12,10,9,.25)}.wc-switch-title{color:#e7e5e4;font-size:.78rem;font-weight:650}.wc-switch-desc{margin-top:.13rem;color:#78716c;font-size:.66rem;line-height:1.35}.wc-switch{position:relative;width:2.7rem;height:1.45rem}.wc-switch input{opacity:0;width:0;height:0}.wc-slider{position:absolute;inset:0;border-radius:999px;background:#44403c;border:1px solid #57534e;cursor:pointer;transition:.15s}.wc-slider:before{content:'';position:absolute;width:1.02rem;height:1.02rem;left:.15rem;top:.15rem;border-radius:50%;background:#d6d3d1;transition:.15s}.wc-switch input:checked+.wc-slider{background:#166534;border-color:#22c55e}.wc-switch input:checked+.wc-slider:before{transform:translateX(1.2rem);background:#dcfce7}
    .wc-quick-stat{display:grid;grid-template-columns:minmax(6rem,1fr) 5.2rem auto;gap:.45rem;align-items:center;padding:.32rem .2rem}.wc-quick-stat .name{color:#d6d3d1;font-size:.76rem}.wc-quick-stat .val{height:2rem;text-align:right}.wc-quick-buttons{display:flex;gap:.25rem}.wc-quick-buttons button{height:2rem;padding:0 .4rem;border:1px solid #57534e;border-radius:.35rem;background:#292524;color:#d6d3d1;font-size:.67rem;cursor:pointer}
    .wc-subtabs{display:flex;gap:.3rem;overflow-x:auto;margin:-.15rem 0 .8rem;padding:.15rem 0 .55rem;border-bottom:1px solid #44403c}.wc-subtab{flex:0 0 auto;min-height:2rem;padding:0 .65rem;border:1px solid #57534e;border-radius:.38rem;background:#292524;color:#a8a29e;font-size:.72rem;font-weight:700;cursor:pointer}.wc-subtab.active{background:#78350f;border-color:#d97706;color:#fef3c7}
    .wc-material-toolbar{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.65rem}.wc-material-toolbar .wc-text{flex:1;min-width:12rem}.wc-filter{height:2rem;padding:0 .55rem;border:1px solid #57534e;border-radius:.35rem;background:#292524;color:#a8a29e;font-size:.7rem;cursor:pointer}.wc-filter.active{color:#fef3c7;background:#78350f;border-color:#d97706}
    .wc-table{width:100%;border-collapse:collapse;font-size:.73rem}.wc-table th{position:sticky;top:-1rem;z-index:2;padding:.45rem .4rem;text-align:left;color:#a8a29e;background:#292524;border-bottom:1px solid #57534e}.wc-table td{padding:.38rem .4rem;border-bottom:1px solid rgba(87,83,78,.45);vertical-align:middle}.wc-table tr:hover td{background:rgba(68,64,60,.22)}.wc-matname{font-weight:650;color:#e7e5e4}.wc-muted{color:#78716c;font-size:.66rem}.wc-known{display:flex;flex-wrap:wrap;gap:.22rem;margin-top:.22rem}.wc-known .wc-chip{font-size:.61rem;padding:.14rem .32rem}
    .wc-preset{display:flex;flex-direction:column;gap:.48rem;height:100%}.wc-preset h4{margin:0;color:#fef3c7;font-size:.84rem}.wc-preset .tag{color:#f59e0b;font-size:.68rem;font-weight:700}.wc-preset p{margin:0;color:#a8a29e;font-size:.69rem;line-height:1.45}.wc-effects{display:flex;flex-wrap:wrap;gap:.25rem}.wc-effects .wc-chip{white-space:normal}.wc-preset .wc-actions{margin-top:auto;padding-top:.15rem}
    .wc-traits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.wc-trait{padding:.55rem;background:#211e1c;border:1px solid #44403c;border-radius:.45rem}.wc-trait-name{margin-bottom:.4rem;color:#e7e5e4;font-size:.73rem;font-weight:700}.wc-segment{display:grid;grid-template-columns:repeat(3,1fr);gap:.2rem}.wc-segment button{min-height:1.8rem;padding:.2rem;border:1px solid #57534e;border-radius:.3rem;background:#292524;color:#78716c;font-size:.63rem;cursor:pointer}.wc-segment button.sel{color:#fef3c7;background:#78350f;border-color:#d97706}.wc-segment button.owned-hidden.sel{color:#dbeafe;background:#1e3a8a;border-color:#3b82f6}.wc-segment button.revealed.sel{color:#dcfce7;background:#14532d;border-color:#22c55e}
    .wc-rel-card{padding:.65rem;border:1px solid #44403c;border-radius:.5rem;background:#211e1c}.wc-rel-head{display:flex;justify-content:space-between;gap:.5rem;margin-bottom:.45rem}.wc-rel-name{font-weight:800;color:#f5f5f4}.wc-rel-meta{color:#78716c;font-size:.65rem}
    .wc-empty{padding:1.2rem;text-align:center;color:#78716c;font-size:.78rem;border:1px dashed #57534e;border-radius:.5rem}
    .wc-toast{position:fixed;left:50%;bottom:max(1.2rem,env(safe-area-inset-bottom));z-index:150;transform:translateX(-50%) translateY(1rem);opacity:0;pointer-events:none;max-width:min(34rem,90vw);padding:.65rem .85rem;border:1px solid #57534e;border-radius:.5rem;background:#0c0a09;color:#e7e5e4;box-shadow:0 8px 35px rgba(0,0,0,.6);font-size:.76rem;transition:.18s}.wc-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.wc-toast.good{border-color:#166534;color:#dcfce7}.wc-toast.warn{border-color:#b45309;color:#fef3c7}
    #${WC_REVIEW}{position:fixed;inset:0;z-index:140;display:flex;align-items:center;justify-content:center;padding:max(.5rem,env(safe-area-inset-top)) max(.5rem,env(safe-area-inset-right)) max(.5rem,env(safe-area-inset-bottom)) max(.5rem,env(safe-area-inset-left));background:#15120f;color:#e7e5e4;font-family:Inter,ui-sans-serif,system-ui,sans-serif}#${WC_REVIEW} *{box-sizing:border-box}.wcr-shell{width:min(78rem,100%);height:min(58rem,100%);display:grid;grid-template-rows:auto auto 1fr auto;overflow:hidden;border:1px solid #57534e;border-radius:.75rem;background:#1c1917;box-shadow:0 28px 90px rgba(0,0,0,.72)}.wcr-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1rem;border-bottom:1px solid #44403c}.wcr-head h2{margin:0;color:#fcd34d;font-size:1.15rem}.wcr-head p{margin:.15rem 0 0;color:#a8a29e;font-size:.72rem}.wcr-tabs{display:flex;gap:.25rem;overflow-x:auto;padding:.55rem .75rem;border-bottom:1px solid #44403c;background:#171412}.wcr-tab{flex:0 0 auto;padding:.45rem .7rem;border:1px solid transparent;border-radius:.35rem;background:transparent;color:#a8a29e;font-size:.72rem;font-weight:650;cursor:pointer}.wcr-tab.active{color:#fef3c7;background:#78350f;border-color:#a16207}.wcr-main{overflow:auto;padding:1rem}.wcr-foot{display:flex;justify-content:space-between;gap:.5rem;padding:.7rem .9rem;border-top:1px solid #44403c;background:#171412}.wcr-foot .right{display:flex;gap:.45rem}

    .wc-help{display:inline-flex;align-items:center;justify-content:center;width:1.05rem;height:1.05rem;margin-left:.28rem;border:1px solid #57534e;border-radius:50%;color:#a8a29e;font-size:.62rem;cursor:help;vertical-align:middle}.wc-help:hover{color:#fef3c7;border-color:#a16207}
    .wc-tone-ntr,.wc-num.wc-tone-ntr{color:#f0a6c4}.wc-num.wc-tone-ntr{border-color:#754052;background:#120c0f}.wc-chip.ntr{color:#f2b3cb;background:#4a2332;border-color:#7a415b}.wc-btn.ntr{color:#f7c4d8;background:#4a2332;border-color:#7a415b}.wc-btn.ntr:hover{background:#5b293c;border-color:#a85578}
    .wc-quick-slots{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem;margin-bottom:.8rem}.wc-slot{min-height:3.25rem;padding:.55rem .65rem;text-align:left;border:1px solid #57534e;border-radius:.5rem;background:#292524;color:#e7e5e4;cursor:pointer}.wc-slot b{display:block;font-size:.74rem}.wc-slot small{display:block;margin-top:.18rem;color:#78716c;font-size:.61rem;line-height:1.25}.wc-slot:hover{border-color:#a16207;background:#332c28}.wc-slot.ntr{border-color:#754052;background:#341923;color:#f3bfd2}.wc-slot.defense{border-color:#365f51;background:#16342a;color:#c6f6df}
    .wc-quick-card .wc-quick-stat{grid-template-columns:6.4rem 5.35rem 6.9rem}.wc-quick-card .wc-quick-buttons{justify-content:flex-end}.wc-quick-card .wc-quick-buttons button{min-width:3rem}.wc-quick-card .wc-quick-stat .val{text-align:right}
    .wc-name-row{display:grid;grid-template-columns:minmax(8rem,1fr) auto;gap:.45rem;align-items:center}.wc-name-row .wc-text{height:2.15rem}.wc-effective{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem}.wc-effective .changed{color:#f0a6c4;border-color:#754052;background:#3b1e29}
    .wc-boundary-note{padding:.6rem .7rem;margin-bottom:.65rem;border:1px solid #44403c;border-radius:.45rem;background:#211e1c;color:#a8a29e;font-size:.7rem;line-height:1.45}.wc-boundary-note b{color:#e7e5e4}
    .wc-rel-layout{display:grid;grid-template-columns:18rem minmax(0,1fr);gap:.75rem}.wc-picker{padding:.7rem;border:1px solid #44403c;border-radius:.5rem;background:#211e1c}.wc-picker .wc-text,.wc-picker .wc-select{margin-top:.45rem}.wc-rel-detail{min-width:0}.wc-inline-note{margin:.4rem 0;color:#a8a29e;font-size:.69rem;line-height:1.45}
    .wc-upgrades{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.wc-upgrade{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.55rem .6rem;border:1px solid #44403c;border-radius:.45rem;background:#211e1c}.wc-upgrade b{font-size:.73rem}.wc-upgrade small{display:block;margin-top:.12rem;color:#78716c;font-size:.62rem}.wc-upgrade.installed{border-color:#365f51}.wc-upgrade.installed b{color:#bbf7d0}
    .wc-footer-actions{display:flex;align-items:center;gap:.35rem}.wc-footer-actions .wc-btn{height:1.8rem;padding:0 .55rem}.wc-footer-center{flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#78716c}
    @media(max-width:900px){#${WC_ID}{top:auto;right:max(.5rem,env(safe-area-inset-right));bottom:max(.5rem,env(safe-area-inset-bottom))}.wc-shell{height:calc(100dvh - 1rem);grid-template-columns:1fr;grid-template-rows:auto auto 1fr auto}.wc-header{padding:.55rem}.wc-titlebox{min-width:auto}.wc-sub{display:none}.wc-sidebar{display:flex;overflow-x:auto;overflow-y:hidden;padding:.4rem;border-right:0;border-bottom:1px solid #44403c}.wc-tab{flex:0 0 auto;width:auto;margin:0 .2rem 0 0;padding:.48rem .58rem}.wc-main{padding:.65rem}.wc-grid,.wc-grid.three{grid-template-columns:1fr}.wc-quick-slots{grid-template-columns:repeat(2,minmax(0,1fr))}.wc-rel-layout{grid-template-columns:1fr}.wc-upgrades{grid-template-columns:1fr}.wc-span2{grid-column:auto}.wc-field{grid-template-columns:minmax(6.4rem,1fr) minmax(6rem,1fr) 4.6rem}.wc-traits{grid-template-columns:1fr}.wc-footer{font-size:.62rem}.wc-search{display:none}.wc-table{min-width:44rem}}
    @media(max-width:520px){.wc-head-actions .wc-icon:not([data-close]){display:none}.wc-title{font-size:.95rem}.wc-main{padding:.45rem}.wc-card{padding:.55rem}.wc-field{grid-template-columns:minmax(5.8rem,1fr) 5.5rem}.wc-field .wc-range{display:none}.wc-field .wc-num{grid-column:2}.wc-quick-stat{grid-template-columns:minmax(5.5rem,1fr) 4.6rem auto}.wcr-main{padding:.55rem}}
  `;
  document.head.appendChild(style);
  style.textContent+=`\n    /* Layout, responsive behavior, tooltips, and dense editor refinements. */
    #${WC_OVERLAY} .wc-select{min-width:0;max-width:100%}
    #${WC_OVERLAY} .wc-select-field{grid-template-columns:minmax(0,1fr);align-items:stretch;gap:.35rem}
    #${WC_OVERLAY} .wc-select-field .wc-label{grid-column:1}
    #${WC_OVERLAY} .wc-select-field .wc-select{grid-column:1!important;width:100%}
    #${WC_OVERLAY} .wc-field-number-only{grid-template-columns:minmax(8rem,1fr) minmax(0,2fr)}
    #${WC_OVERLAY} .wc-number-tools{grid-column:2/4;display:flex;align-items:center;gap:.4rem;min-width:0}
    #${WC_OVERLAY} .wc-number-tools .wc-num{flex:1 1 7rem;min-width:5.5rem}
    #${WC_OVERLAY} .wc-number-tools .wc-btn{flex:0 0 auto;white-space:nowrap;padding:.4rem .52rem}
    .wc-tooltip{position:fixed;z-index:500;max-width:min(24rem,calc(100vw - 1rem));padding:.55rem .65rem;color:#e7e5e4;background:rgba(12,10,9,.98);border:1px solid #57534e;border-radius:.42rem;box-shadow:0 8px 28px rgba(0,0,0,.55);font:500 .72rem/1.45 system-ui,sans-serif;pointer-events:none;white-space:normal}
    .wc-tooltip[hidden]{display:none!important}
    @media(max-width:1180px){#${WC_OVERLAY} .wc-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:900px){#${WC_OVERLAY} .wc-grid.three{grid-template-columns:1fr}#${WC_OVERLAY} .wc-field-number-only{grid-template-columns:minmax(6.5rem,1fr) minmax(0,2fr)}}
    .wc-searchbox{position:relative;flex:1;min-width:8rem}.wc-searchbox .wc-search{width:100%}.wc-search-results{position:absolute;left:0;right:0;top:calc(100% + .35rem);z-index:220;max-height:24rem;overflow:auto;padding:.3rem;background:#171412;border:1px solid #57534e;border-radius:.45rem;box-shadow:0 14px 40px rgba(0,0,0,.62)}.wc-search-results[hidden]{display:none!important}.wc-search-hit{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem;padding:.5rem .55rem;border:0;border-radius:.35rem;background:transparent;color:#e7e5e4;text-align:left;cursor:pointer}.wc-search-hit:hover,.wc-search-hit.sel{background:#292524}.wc-search-hit small{display:block;color:#78716c;margin-top:.08rem}.wc-search-hit .where{align-self:center;color:#f59e0b;font-size:.66rem}
    #${WC_OVERLAY} .wc-quick-panels{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.7rem;align-items:stretch}#${WC_OVERLAY} .wc-quick-panels>.wc-card{height:100%}
    #${WC_OVERLAY} .wc-hero-core{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:.7rem;align-items:stretch}#${WC_OVERLAY} .wc-hero-core>.wc-card{height:100%;margin:0}#${WC_OVERLAY} .wc-hero-status-card,#${WC_OVERLAY} .wc-hero-relation-card,#${WC_OVERLAY} .wc-hero-attrs-card,#${WC_OVERLAY} .wc-hero-aff-card{grid-column:span 6}#${WC_OVERLAY} .wc-hero-skills-card{grid-column:span 4}#${WC_OVERLAY} .wc-hero-inner-card{grid-column:span 8}
    #${WC_OVERLAY} .wc-hero-subtabs{margin-top:-.15rem;margin-bottom:.8rem}#${WC_OVERLAY} .wc-traits{grid-template-columns:repeat(3,minmax(0,1fr))}#${WC_OVERLAY} .wc-trait{display:flex;flex-direction:column;min-height:5.15rem}#${WC_OVERLAY} .wc-trait-name{line-height:1.3}#${WC_OVERLAY} .wc-trait-desc{margin:-.12rem 0 .42rem;color:#8f8883;font-size:.62rem;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#${WC_OVERLAY} .wc-trait .wc-segment{margin-top:auto}
    #${WC_OVERLAY} .wc-boundary-wrap{overflow-x:auto;overflow-y:visible}#${WC_OVERLAY} .wc-boundary-table{table-layout:fixed;min-width:58rem}#${WC_OVERLAY} .wc-boundary-table th:first-child,#${WC_OVERLAY} .wc-boundary-table td:first-child{width:28%}#${WC_OVERLAY} .wc-boundary-table th:not(:first-child),#${WC_OVERLAY} .wc-boundary-table td:not(:first-child){width:18%}#${WC_OVERLAY} .wc-boundary-table .wc-num{min-width:0;text-align:center}
    #${WC_OVERLAY} .wc-hero-dashboard{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:.65rem;align-items:start;grid-auto-flow:dense}#${WC_OVERLAY} .wc-hero-dashboard>.wc-card{margin:0}#${WC_OVERLAY} .wc-hero-profile{grid-column:span 5}#${WC_OVERLAY} .wc-hero-status{grid-column:span 7}#${WC_OVERLAY} .wc-hero-relation{grid-column:span 5}#${WC_OVERLAY} .wc-hero-attrs{grid-column:span 7}#${WC_OVERLAY} .wc-hero-skills{grid-column:span 4}#${WC_OVERLAY} .wc-hero-aff{grid-column:span 8}#${WC_OVERLAY} .wc-hero-inner{grid-column:span 5}#${WC_OVERLAY} .wc-hero-traits{grid-column:span 7}#${WC_OVERLAY} .wc-hero-boundaries{grid-column:1/-1}#${WC_OVERLAY} .wc-hero-dashboard .wc-field{min-height:2.15rem;padding:.2rem .28rem}#${WC_OVERLAY} .wc-hero-dashboard .wc-traits{grid-template-columns:repeat(2,minmax(0,1fr))}
    .wc-effect-field{padding:.18rem 0;border-radius:.38rem}.wc-effect-field:nth-child(even){background:rgba(12,10,9,.2)}.wc-effect-field>.wc-field{background:transparent!important}.wc-influence{margin:-.05rem .32rem .35rem;padding:.36rem .45rem;border-left:2px solid #754052;background:rgba(59,30,41,.38);border-radius:.25rem;font-size:.65rem}.wc-influence-summary{display:flex;gap:.7rem;flex-wrap:wrap;color:#d6d3d1}.wc-influence-summary b{color:#f0a6c4}.wc-influence-list{display:flex;gap:.28rem;flex-wrap:wrap;margin-top:.25rem}.wc-influence-chip{padding:.14rem .3rem;border-radius:999px;border:1px solid #57534e;background:#292524;color:#d6d3d1}.wc-influence-chip.down{border-color:#754052;color:#f0a6c4}.wc-influence-chip.up{border-color:#3f6212;color:#d9f99d}.wc-search-flash{outline:2px solid #f59e0b!important;box-shadow:0 0 0 3px rgba(245,158,11,.13)!important}
    @media(max-width:1180px){#${WC_OVERLAY} .wc-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}#${WC_OVERLAY} .wc-hero-profile,#${WC_OVERLAY} .wc-hero-status,#${WC_OVERLAY} .wc-hero-relation,#${WC_OVERLAY} .wc-hero-attrs,#${WC_OVERLAY} .wc-hero-skills,#${WC_OVERLAY} .wc-hero-aff,#${WC_OVERLAY} .wc-hero-inner,#${WC_OVERLAY} .wc-hero-traits{grid-column:span 6}}
    @media(max-width:1200px){#${WC_OVERLAY} .wc-quick-panels{grid-template-columns:repeat(3,minmax(0,1fr))}#${WC_OVERLAY} .wc-traits{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:900px){#${WC_OVERLAY} .wc-grid.three{grid-template-columns:1fr}#${WC_OVERLAY} .wc-quick-panels{grid-template-columns:repeat(2,minmax(0,1fr))}#${WC_OVERLAY} .wc-field-number-only{grid-template-columns:minmax(6.5rem,1fr) minmax(0,2fr)}#${WC_OVERLAY} .wc-hero-core>*{grid-column:1/-1!important}#${WC_OVERLAY} .wc-hero-dashboard>*{grid-column:1/-1!important}#${WC_OVERLAY} .wc-hero-dashboard .wc-traits,#${WC_OVERLAY} .wc-traits{grid-template-columns:1fr}}
    @media(max-width:520px){#${WC_OVERLAY} .wc-field-number-only{grid-template-columns:minmax(5.8rem,1fr) minmax(0,1fr)}#${WC_OVERLAY} .wc-number-tools{grid-column:2;flex-wrap:wrap}#${WC_OVERLAY} .wc-number-tools .wc-num{flex-basis:100%}}
  `;

  style.textContent+=`\n    /* Layout hierarchy and interaction-state refinements. */
#${WC_OVERLAY}{background:rgba(3,10,12,.48)}
    #${WC_OVERLAY} .wc-shell{color:#e8f0f1;background:#20282a;border-color:#4a5c5f;box-shadow:0 24px 72px rgba(0,0,0,.5)}
    #${WC_OVERLAY} .wc-header{background:#253033;border-color:#46585b}
    #${WC_OVERLAY} .wc-sidebar{background:#1b2325;border-color:#46585b}
    #${WC_OVERLAY} .wc-main{background:#20282a}
    #${WC_OVERLAY} .wc-footer{background:#1b2325;border-color:#46585b;color:#9daaad}
    #${WC_OVERLAY} .wc-title{color:#99f6e4}
    #${WC_OVERLAY} .wc-sub,#${WC_OVERLAY} .wc-page-title p,#${WC_OVERLAY} .wc-card-note{color:#9daaad}
    #${WC_OVERLAY} .wc-card{background:#283235;border-color:#46585b}
    #${WC_OVERLAY} .wc-card-title,#${WC_OVERLAY} .wc-page-title h2{color:#edf7f7}
    #${WC_OVERLAY} .wc-search,#${WC_OVERLAY} .wc-num,#${WC_OVERLAY} .wc-select,#${WC_OVERLAY} .wc-text{background:#13191b;border-color:#4b5e61;color:#f2f7f7}
    #${WC_OVERLAY} .wc-search:focus,#${WC_OVERLAY} .wc-num:focus,#${WC_OVERLAY} .wc-select:focus,#${WC_OVERLAY} .wc-text:focus{outline-color:#2dd4bf;border-color:#2dd4bf}
    #${WC_ID}{border-color:#2a9d8f;background:rgba(18,67,65,.96);color:#d8fffa}
    #${WC_ID}:hover{background:#17615d;border-color:#5eead4}
    #${WC_OVERLAY} .wc-tab{color:#aab6b8}
    #${WC_OVERLAY} .wc-tab:hover{color:#edf7f7;background:#2b3739}
    #${WC_OVERLAY} .wc-tab.active{color:#d7fffa;background:#123c3b;border-color:#2dd4bf}
    #${WC_OVERLAY} .wc-btn,#${WC_OVERLAY} .wc-icon{background:#2a3436;border-color:#506164;color:#e4eeee}
    #${WC_OVERLAY} .wc-btn:hover,#${WC_OVERLAY} .wc-icon:hover{background:#334346;border-color:#5f777a}
    #${WC_OVERLAY} .wc-btn.gold,#${WC_OVERLAY} .wc-btn.green{color:#d8fffa;background:#145b57;border-color:#2dd4bf}
    #${WC_OVERLAY} .wc-btn.gold:hover,#${WC_OVERLAY} .wc-btn.green:hover{background:#18716b;border-color:#5eead4}
    #${WC_OVERLAY} .wc-subtab.active,#${WC_OVERLAY} .wc-filter.active{color:#d8fffa;background:#145b57;border-color:#2dd4bf}
    #${WC_OVERLAY} .wc-subtab:hover,#${WC_OVERLAY} .wc-filter:hover{border-color:#5f777a;background:#303c3f}
    #${WC_OVERLAY} .wc-range{accent-color:#22c7b8}
    #${WC_OVERLAY} .wc-switch input:checked+.wc-slider{background:#176f68;border-color:#2dd4bf}
    #${WC_OVERLAY} .wc-switch input:checked+.wc-slider:before{background:#d9fff9}
    #${WC_OVERLAY} .wc-chip{background:#303a3d;border-color:#536568;color:#d8e3e4}
    #${WC_OVERLAY} .wc-chip.good{background:#103e39;border-color:#2d8f82;color:#c8fff6}
    #${WC_OVERLAY} .wc-chip.warn{background:#3c3320;border-color:#827047;color:#f2dfaa}
    #${WC_OVERLAY} .wc-slot{background:#2a3436;border-color:#4c5d60}
    #${WC_OVERLAY} .wc-slot:hover{background:#304143;border-color:#2dd4bf}
    #${WC_OVERLAY} .wc-slot.defense{background:#123d39;border-color:#2a8f82;color:#d2fff6}
    #${WC_OVERLAY} .wc-step button,#${WC_OVERLAY} .wc-quick-buttons button{background:#2a3436;border-color:#506164;color:#e4eeee}
    #${WC_OVERLAY} .wc-step button:hover,#${WC_OVERLAY} .wc-quick-buttons button:hover{background:#334346;border-color:#2dd4bf}
    #${WC_OVERLAY} .wc-boundary-note,#${WC_OVERLAY} .wc-picker{background:#252e31;border-color:#46585b}
    #${WC_OVERLAY} .wc-table th{background:#2a3436;border-color:#536568;color:#b4c0c2}
    #${WC_OVERLAY} .wc-table td{border-color:rgba(83,101,104,.5)}
    #${WC_OVERLAY} .wc-table tr:hover td{background:rgba(49,67,70,.45)}
    #${WC_OVERLAY} .wc-search-flash{outline-color:#2dd4bf!important;box-shadow:0 0 0 3px rgba(45,212,191,.14)!important}

    #${WC_OVERLAY} .wc-quick-slot-card{margin-bottom:1rem}
    #${WC_OVERLAY} .wc-quick-slots{margin-bottom:0}
    #${WC_OVERLAY} .wc-quick-row{display:grid;gap:.85rem;align-items:stretch;margin-top:.85rem}
    #${WC_OVERLAY} .wc-quick-primary{grid-template-columns:repeat(3,minmax(0,1fr))}
    #${WC_OVERLAY} .wc-quick-secondary{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:.95rem}
    #${WC_OVERLAY} .wc-quick-row>.wc-card{height:100%;min-width:0}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-stat{grid-template-columns:minmax(5.8rem,1fr) minmax(5rem,6.2rem) minmax(6.2rem,auto);column-gap:.5rem}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons{min-width:0;flex-wrap:nowrap}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons button{min-width:2.7rem;white-space:nowrap}
    #${WC_OVERLAY} .wc-quick-wide .wc-select-field{margin-top:.35rem}

    #${WC_OVERLAY} .wc-preset-card{display:flex;flex-direction:column;min-height:20.5rem;overflow:hidden}
    #${WC_OVERLAY} .wc-preset-card>.wc-preset{display:flex;flex-direction:column;flex:1 1 auto;height:auto;min-height:0}
    #${WC_OVERLAY} .wc-preset .wc-actions.wc-preset-actions{margin-top:auto;padding-top:.75rem;position:static;transform:none}
    #${WC_OVERLAY} .wc-preset-actions .wc-btn{min-width:5.3rem}
    #${WC_OVERLAY} .wc-preset .tag{color:#67e8f9}

    @media(max-width:1120px){
      #${WC_OVERLAY} .wc-quick-primary{grid-template-columns:repeat(3,minmax(0,1fr))}
      #${WC_OVERLAY} .wc-quick-card .wc-quick-stat{grid-template-columns:minmax(4.8rem,1fr) minmax(4.7rem,5.5rem) auto}
      #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons button{padding:0 .32rem;min-width:2.45rem}
    }
    @media(max-width:900px){
      #${WC_OVERLAY} .wc-quick-primary{grid-template-columns:1fr}
      #${WC_OVERLAY} .wc-quick-secondary{grid-template-columns:1fr}
      #${WC_OVERLAY} .wc-quick-slots{grid-template-columns:repeat(2,minmax(0,1fr))}
      #${WC_OVERLAY} .wc-preset-card{min-height:0}
    }
  `;

  style.textContent+=`\n    /* Neutral control hierarchy and accent-state refinements. */
#${WC_OVERLAY}{background:rgba(8,8,7,.34)}
    #${WC_OVERLAY} .wc-shell{color:#ECEAE4;background:#242321;border-color:#55524D;box-shadow:0 24px 72px rgba(0,0,0,.42)}
    #${WC_OVERLAY} .wc-header{background:#2B2A27;border-color:#55524D}
    #${WC_OVERLAY} .wc-sidebar{background:#252421;border-color:#504D48}
    #${WC_OVERLAY} .wc-main{background:#292825}
    #${WC_OVERLAY} .wc-footer{background:#242321;border-color:#504D48;color:#A9A9A9}
    #${WC_OVERLAY} .wc-title{color:#A2E1DB}
    #${WC_OVERLAY} .wc-sub,#${WC_OVERLAY} .wc-page-title p,#${WC_OVERLAY} .wc-card-note,#${WC_OVERLAY} .wc-muted{color:#A9A9A9}
    #${WC_OVERLAY} .wc-card{background:#302F2C;border-color:#55524D;box-shadow:inset 0 1px 0 rgba(255,255,255,.018)}
    #${WC_OVERLAY} .wc-card-title,#${WC_OVERLAY} .wc-page-title h2{color:#ECEAE4}
    #${WC_OVERLAY} .wc-search,#${WC_OVERLAY} .wc-num,#${WC_OVERLAY} .wc-select,#${WC_OVERLAY} .wc-text{background:#191816;border-color:#5D5953;color:#ECEAE4}
    #${WC_OVERLAY} .wc-search::placeholder,#${WC_OVERLAY} .wc-text::placeholder{color:#77746F}
    #${WC_OVERLAY} .wc-search:focus,#${WC_OVERLAY} .wc-num:focus,#${WC_OVERLAY} .wc-select:focus,#${WC_OVERLAY} .wc-text:focus{outline-color:#A2E1DB;border-color:#A2E1DB;box-shadow:0 0 0 2px rgba(162,225,219,.08)}

    #${WC_ID}{border-color:#8FCFC9;background:#34332F;color:#ECEAE4;box-shadow:0 2px 8px rgba(0,0,0,.28)}
    #${WC_ID}:hover{background:#45423D;border-color:#A2E1DB;color:#F7F6F2}

    #${WC_OVERLAY} .wc-tab{color:#C1BFBA;border-color:transparent}
    #${WC_OVERLAY} .wc-tab:hover{color:#F2F1ED;background:#353430}
    #${WC_OVERLAY} .wc-tab.active{color:#F5F4EF;background:#393B37;border-color:#A2E1DB;box-shadow:inset 3px 0 0 #A2E1DB}

    /* Normal controls are visibly filled neutral buttons. */
    #${WC_OVERLAY} .wc-btn,#${WC_OVERLAY} .wc-icon,
    #${WC_OVERLAY} .wc-step button,#${WC_OVERLAY} .wc-quick-buttons button,
    #${WC_OVERLAY} .wc-subtab,#${WC_OVERLAY} .wc-filter,
    #${WC_OVERLAY} .wc-segment button{
      background:#44413C;border-color:#68635C;color:#F1F0EC;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 1px 2px rgba(0,0,0,.18);
    }
    #${WC_OVERLAY} .wc-btn:hover,#${WC_OVERLAY} .wc-icon:hover,
    #${WC_OVERLAY} .wc-step button:hover,#${WC_OVERLAY} .wc-quick-buttons button:hover,
    #${WC_OVERLAY} .wc-subtab:hover,#${WC_OVERLAY} .wc-filter:hover,
    #${WC_OVERLAY} .wc-segment button:hover{
      background:#514E48;border-color:#7C766E;color:#FFF;
    }
    #${WC_OVERLAY} .wc-btn:active,#${WC_OVERLAY} .wc-step button:active,#${WC_OVERLAY} .wc-quick-buttons button:active{background:#3A3834;transform:translateY(1px)}

    /* Primary/selected states use pale mint sparingly. */
    #${WC_OVERLAY} .wc-btn.gold,#${WC_OVERLAY} .wc-btn.green{
      background:#A2E1DB;border-color:#BDEAE6;color:#20302E;font-weight:750;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.42),0 2px 6px rgba(0,0,0,.16)
    }
    #${WC_OVERLAY} .wc-btn.gold:hover,#${WC_OVERLAY} .wc-btn.green:hover{background:#B5E8E3;border-color:#D0F1EE;color:#172624}
    #${WC_OVERLAY} .wc-subtab.active,#${WC_OVERLAY} .wc-filter.active,#${WC_OVERLAY} .wc-segment button.sel{
      color:#20302E;background:#A2E1DB;border-color:#BDEAE6;font-weight:720;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.35)
    }
    #${WC_OVERLAY} .wc-range{accent-color:#A2E1DB}
    #${WC_OVERLAY} .wc-switch input:checked+.wc-slider{background:#7FC8C1;border-color:#A2E1DB}
    #${WC_OVERLAY} .wc-switch input:checked+.wc-slider:before{background:#F4F2ED}

    #${WC_OVERLAY} .wc-chip{background:#3B3935;border-color:#5F5B55;color:#D8D6D1}
    #${WC_OVERLAY} .wc-chip.good{background:rgba(162,225,219,.13);border-color:#78BDB6;color:#C9F0EC}
    #${WC_OVERLAY} .wc-chip.warn{background:#40392C;border-color:#7A6A4A;color:#E8D7AA}

    /* Quick slots are clearly clickable cards, not flat information panels. */
    #${WC_OVERLAY} .wc-slot{
      cursor:pointer;background:#403E39;border:1px solid #69645D;color:#F0EFEB;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 2px 5px rgba(0,0,0,.18);
      transition:background .12s,border-color .12s,transform .12s,box-shadow .12s
    }
    #${WC_OVERLAY} .wc-slot:hover{background:#4B4842;border-color:#8A847B;transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 4px 10px rgba(0,0,0,.20)}
    #${WC_OVERLAY} .wc-slot:active{transform:translateY(0);background:#383632}
    #${WC_OVERLAY} .wc-slot.defense{background:rgba(162,225,219,.12);border-color:#8CCFC8;color:#DCF5F2}
    #${WC_OVERLAY} .wc-slot.defense:hover{background:rgba(162,225,219,.19);border-color:#A2E1DB}
    #${WC_OVERLAY} .wc-slot.ntr{background:rgba(244,161,189,.12);border-color:#C87591;color:#F6CEDB}
    #${WC_OVERLAY} .wc-slot.ntr:hover{background:rgba(244,161,189,.18);border-color:#F4A1BD}

    /* Soft pink is reserved for NTR / vulnerability / downward influence. */
    #${WC_OVERLAY} .wc-btn.ntr{background:#704257;border-color:#A86480;color:#FBE2EA}
    #${WC_OVERLAY} .wc-btn.ntr:hover{background:#825069;border-color:#F4A1BD}
    #${WC_OVERLAY} .wc-chip.ntr,#${WC_OVERLAY} .wc-tone-ntr{border-color:#9E6179!important;color:#F4A1BD!important}
    #${WC_OVERLAY} .wc-influence{border-left-color:#9E6179;background:rgba(85,50,63,.30)}
    #${WC_OVERLAY} .wc-influence-summary b,#${WC_OVERLAY} .wc-influence-chip.down{color:#F4A1BD}
    #${WC_OVERLAY} .wc-influence-chip.down{border-color:#9E6179;background:rgba(244,161,189,.07)}
    #${WC_OVERLAY} .wc-influence-chip.up{border-color:#78BDB6;background:rgba(162,225,219,.07);color:#BFE9E5}

    #${WC_OVERLAY} .wc-boundary-note,#${WC_OVERLAY} .wc-picker{background:#2B2A27;border-color:#55524D}
    #${WC_OVERLAY} .wc-table th{background:#373530;border-color:#5B5751;color:#C9C7C2}
    #${WC_OVERLAY} .wc-table td{border-color:rgba(91,87,81,.58)}
    #${WC_OVERLAY} .wc-table tr:hover td{background:rgba(255,255,255,.025)}
    #${WC_OVERLAY} .wc-search-results{background:#242321;border-color:#5D5953}
    #${WC_OVERLAY} .wc-search-hit:hover,#${WC_OVERLAY} .wc-search-hit.sel{background:#3B3935}
    #${WC_OVERLAY} .wc-search-hit .where{color:#A2E1DB}
    #${WC_OVERLAY} .wc-search-flash{outline-color:#A2E1DB!important;box-shadow:0 0 0 3px rgba(162,225,219,.13)!important}

    /* Keep actions legible even in dense rows. */
    #${WC_OVERLAY} .wc-step button,#${WC_OVERLAY} .wc-quick-buttons button{min-width:3rem}
    #${WC_OVERLAY} .wc-quick-buttons button{padding-inline:.58rem}
    #${WC_OVERLAY} .wc-preset .tag{color:#BFE9E5}
    #${WC_OVERLAY} .wc-preset-actions .wc-btn:not(.ntr){background:#44413C;border-color:#68635C;color:#F1F0EC}
    #${WC_OVERLAY} .wc-preset-actions .wc-btn.gold{background:#A2E1DB;border-color:#BDEAE6;color:#20302E}

    .wc-tooltip{color:#ECEAE4;background:rgba(31,30,28,.98);border-color:#5D5953;box-shadow:0 8px 28px rgba(0,0,0,.42)}
  `;

  style.textContent+=`\n    /* Warm/dove-gray surface and control system. */
#${WC_OVERLAY}{background:rgba(10,9,9,.27)}
    #${WC_OVERLAY} .wc-shell{background:#35322F;border-color:#625C57;color:#ECEAE4;box-shadow:0 24px 72px rgba(0,0,0,.36)}
    #${WC_OVERLAY} .wc-header{background:#3A3633;border-color:#625C57}
    #${WC_OVERLAY} .wc-sidebar{background:#302E2B;border-color:#5B5651}
    #${WC_OVERLAY} .wc-main{background:#3C3936}
    #${WC_OVERLAY} .wc-footer{background:#302E2B;border-color:#5B5651;color:#B6B0AC}
    #${WC_OVERLAY} .wc-title{color:#ECEAE4}
    #${WC_OVERLAY} .wc-sub,#${WC_OVERLAY} .wc-page-title p,#${WC_OVERLAY} .wc-card-note,#${WC_OVERLAY} .wc-muted{color:#B6B0AC}
    #${WC_OVERLAY} .wc-card{background:#47423F;border-color:#68615C;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
    #${WC_OVERLAY} .wc-card-title,#${WC_OVERLAY} .wc-page-title h2{color:#F1EFEA}
    #${WC_OVERLAY} .wc-divider{background:#625C57}
    #${WC_OVERLAY} .wc-field:nth-child(even){background:rgba(30,27,25,.18)}
    #${WC_OVERLAY} .wc-label{color:#ECEAE4}

    #${WC_OVERLAY} .wc-search,#${WC_OVERLAY} .wc-num,#${WC_OVERLAY} .wc-select,#${WC_OVERLAY} .wc-text{background:#24211F;border-color:#6A635E;color:#F2F0EB}
    #${WC_OVERLAY} .wc-search::placeholder,#${WC_OVERLAY} .wc-text::placeholder{color:#918B86}
    #${WC_OVERLAY} .wc-search:focus,#${WC_OVERLAY} .wc-num:focus,#${WC_OVERLAY} .wc-select:focus,#${WC_OVERLAY} .wc-text:focus{outline-color:#A2E1DB;border-color:#A2E1DB;box-shadow:0 0 0 2px rgba(162,225,219,.10)}

    /* Button hierarchy: neutral filled controls, off-white primary actions, mint only for selected/active state. */
    #${WC_OVERLAY} .wc-btn,#${WC_OVERLAY} .wc-icon,
    #${WC_OVERLAY} .wc-step button,#${WC_OVERLAY} .wc-quick-buttons button,
    #${WC_OVERLAY} .wc-subtab,#${WC_OVERLAY} .wc-filter,
    #${WC_OVERLAY} .wc-segment button{
      background:#59534F;border-color:#77706A;color:#F1EFEA;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.055),0 1px 2px rgba(0,0,0,.17)
    }
    #${WC_OVERLAY} .wc-btn:hover,#${WC_OVERLAY} .wc-icon:hover,
    #${WC_OVERLAY} .wc-step button:hover,#${WC_OVERLAY} .wc-quick-buttons button:hover,
    #${WC_OVERLAY} .wc-subtab:hover,#${WC_OVERLAY} .wc-filter:hover,
    #${WC_OVERLAY} .wc-segment button:hover{background:#69615C;border-color:#8C837C;color:#FFF}
    #${WC_OVERLAY} .wc-btn:active,#${WC_OVERLAY} .wc-step button:active,#${WC_OVERLAY} .wc-quick-buttons button:active{background:#4C4743;transform:translateY(1px)}
    #${WC_OVERLAY} .wc-btn.ghost{background:#413D39;border-color:#625C57;color:#D8D4CF}
    #${WC_OVERLAY} .wc-btn.gold{background:#ECEAE4;border-color:#D3CEC7;color:#302D2A;font-weight:760}
    #${WC_OVERLAY} .wc-btn.gold:hover{background:#F5F3EE;border-color:#E5E1DA;color:#24211F}
    #${WC_OVERLAY} .wc-btn.green{background:#C9E9E4;border-color:#D8F0ED;color:#243531}
    #${WC_OVERLAY} .wc-btn.red{background:#6F4747;border-color:#946060;color:#F8E3E3}

    #${WC_OVERLAY} .wc-tab{color:#D0CBC6}
    #${WC_OVERLAY} .wc-tab:hover{color:#FFF;background:#45413D}
    #${WC_OVERLAY} .wc-tab.active{color:#E9FFFC;background:rgba(162,225,219,.13);border-color:#A2E1DB;box-shadow:inset 3px 0 0 #A2E1DB}
    #${WC_OVERLAY} .wc-subtab.active,#${WC_OVERLAY} .wc-filter.active,#${WC_OVERLAY} .wc-segment button.sel{background:#A2E1DB;border-color:#C0ECE8;color:#273835;font-weight:750;box-shadow:none}
    #${WC_OVERLAY} .wc-range{accent-color:#A2E1DB}
    #${WC_OVERLAY} .wc-switch input:checked+.wc-slider{background:#86CFC8;border-color:#A2E1DB}
    #${WC_OVERLAY} .wc-switch input:checked+.wc-slider:before{background:#F4F1EB}

    /* Traits retain semantic distinction without turning the whole interface blue/green. */
    #${WC_OVERLAY} .wc-segment button.owned-hidden.sel{background:#B7C7D9;border-color:#CFDAE6;color:#28313B}
    #${WC_OVERLAY} .wc-segment button.revealed.sel{background:#A2E1DB;border-color:#C0ECE8;color:#273835}
    #${WC_OVERLAY} .wc-trait{background:#403C39;border-color:#625C57}

    /* Quick actions should read as buttons at a glance. */
    #${WC_OVERLAY} .wc-slot{background:#56504C;border-color:#79716B;color:#F4F1ED;box-shadow:inset 0 1px 0 rgba(255,255,255,.055),0 2px 5px rgba(0,0,0,.17)}
    #${WC_OVERLAY} .wc-slot:hover{background:#665E59;border-color:#8D837C;transform:translateY(-1px)}
    #${WC_OVERLAY} .wc-slot:active{background:#4A4541;transform:none}
    #${WC_OVERLAY} .wc-slot.defense{background:rgba(162,225,219,.16);border-color:#9DD8D2;color:#E1F7F4}
    #${WC_OVERLAY} .wc-slot.defense:hover{background:rgba(162,225,219,.23);border-color:#BCEAE6}
    #${WC_OVERLAY} .wc-slot.ntr{background:rgba(244,161,189,.15);border-color:#D487A1;color:#F9D7E2}
    #${WC_OVERLAY} .wc-slot.ntr:hover{background:rgba(244,161,189,.22);border-color:#F4A1BD}

    /* NTR / vulnerability remains the only pink action family. */
    #${WC_OVERLAY} .wc-btn.ntr{background:#7A4D60;border-color:#A86B83;color:#FBE2EA}
    #${WC_OVERLAY} .wc-btn.ntr:hover{background:#8B586D;border-color:#F4A1BD}
    #${WC_OVERLAY} .wc-chip.ntr,#${WC_OVERLAY} .wc-tone-ntr{border-color:#B16C87!important;color:#F4A1BD!important}

    #${WC_OVERLAY} .wc-chip{background:#4A4541;border-color:#6E6761;color:#E0DDD8}
    #${WC_OVERLAY} .wc-chip.good{background:rgba(162,225,219,.10);border-color:#8CC9C3;color:#D3F0ED}
    #${WC_OVERLAY} .wc-chip.warn{background:#51483C;border-color:#7A6B55;color:#ECD9B7}
    #${WC_OVERLAY} .wc-boundary-note,#${WC_OVERLAY} .wc-picker{background:#403C39;border-color:#625C57}

    /* Materials: give each column a stable proportion and use the effects column instead of piling chips on its left edge. */
    #${WC_OVERLAY} .wc-table{table-layout:fixed}
    #${WC_OVERLAY} .wc-table th{background:#4B4642;border-color:#6D6660;color:#D7D2CC}
    #${WC_OVERLAY} .wc-table th:nth-child(1){width:29%}
    #${WC_OVERLAY} .wc-table th:nth-child(2){width:18%;text-align:center}
    #${WC_OVERLAY} .wc-table th:nth-child(3){width:34%;text-align:center}
    #${WC_OVERLAY} .wc-table th:nth-child(4){width:19%;text-align:center}
    #${WC_OVERLAY} .wc-table td{border-color:rgba(105,98,92,.58)}
    #${WC_OVERLAY} .wc-table td:nth-child(2),#${WC_OVERLAY} .wc-table td:nth-child(3),#${WC_OVERLAY} .wc-table td:nth-child(4){text-align:center}
    #${WC_OVERLAY} .wc-table td:nth-child(2) .wc-step{max-width:10.6rem;margin-inline:auto}
    #${WC_OVERLAY} .wc-table td:nth-child(4) .wc-actions{justify-content:center}
    #${WC_OVERLAY} .wc-known{display:grid;grid-template-columns:repeat(auto-fit,minmax(5.4rem,1fr));gap:.32rem;width:100%;margin:.34rem auto 0;align-items:stretch}
    #${WC_OVERLAY} .wc-known .wc-chip{width:100%;min-width:0;min-height:1.55rem;justify-content:center;text-align:center;white-space:normal;line-height:1.15;padding:.2rem .32rem}
    #${WC_OVERLAY} .wc-table tr:hover td{background:rgba(255,255,255,.028)}

    #${WC_OVERLAY} .wc-search-results{background:#35322F;border-color:#6A635E}
    #${WC_OVERLAY} .wc-search-hit:hover,#${WC_OVERLAY} .wc-search-hit.sel{background:#514B47}
    #${WC_OVERLAY} .wc-search-hit .where{color:#BDE8E4}
    #${WC_OVERLAY} .wc-search-flash{outline-color:#A2E1DB!important;box-shadow:0 0 0 3px rgba(162,225,219,.13)!important}
    #${WC_OVERLAY} .wc-preset .tag{color:#D9D4CE}
    #${WC_OVERLAY} .wc-preset-actions .wc-btn:not(.ntr):not(.gold){background:#59534F;border-color:#77706A;color:#F1EFEA}
    #${WC_OVERLAY} .wc-preset-actions .wc-btn.gold{background:#ECEAE4;border-color:#D3CEC7;color:#302D2A}

    /* The pre-game review follows the same neutral warm-gray system. */
    #${WC_REVIEW}{background:rgba(10,9,9,.40);color:#ECEAE4}
    #${WC_REVIEW} .wcr-shell{background:#35322F;border-color:#625C57;box-shadow:0 24px 72px rgba(0,0,0,.38)}
    #${WC_REVIEW} .wcr-head{background:#3A3633;border-color:#625C57}
    #${WC_REVIEW} .wcr-head h2{color:#ECEAE4}
    #${WC_REVIEW} .wcr-head p{color:#B6B0AC}
    #${WC_REVIEW} .wcr-tabs,#${WC_REVIEW} .wcr-foot{background:#302E2B;border-color:#5B5651}
    #${WC_REVIEW} .wcr-main{background:#3C3936}
    #${WC_REVIEW} .wcr-tab{color:#D0CBC6}
    #${WC_REVIEW} .wcr-tab:hover{background:#45413D;color:#FFF}
    #${WC_REVIEW} .wcr-tab.active{background:#A2E1DB;border-color:#C0ECE8;color:#273835}
    #${WC_REVIEW} .wc-card{background:#47423F;border-color:#68615C}
    #${WC_REVIEW} .wc-btn{background:#59534F;border-color:#77706A;color:#F1EFEA}
    #${WC_REVIEW} .wc-btn:hover{background:#69615C;border-color:#8C837C}
    #${WC_REVIEW} .wc-btn.gold{background:#ECEAE4;border-color:#D3CEC7;color:#302D2A}
    #${WC_REVIEW} .wc-num,#${WC_REVIEW} .wc-select,#${WC_REVIEW} .wc-text{background:#24211F;border-color:#6A635E;color:#F2F0EB}
    #${WC_REVIEW} .wc-range{accent-color:#A2E1DB}

    .wc-tooltip{background:rgba(46,43,40,.985);border-color:#6A635E;color:#ECEAE4}
  `;

  style.textContent+=`\n    /* Crisp neutral-dark surfaces and quick-action hierarchy. */
#${WC_OVERLAY}{background:rgba(8,7,7,.31)}
    #${WC_OVERLAY} .wc-shell{
      background:#2A2826;border-color:#5B5651;color:#ECEAE4;
      box-shadow:0 24px 72px rgba(0,0,0,.34)
    }
    #${WC_OVERLAY} .wc-header{background:#242220;border-color:#514C48}
    #${WC_OVERLAY} .wc-sidebar{background:#262421;border-color:#514C48}
    #${WC_OVERLAY} .wc-main{background:#302D2A}
    #${WC_OVERLAY} .wc-footer{background:#242220;border-color:#514C48;color:#AAA39D}
    #${WC_OVERLAY} .wc-card{background:#3A3633;border-color:#625C57}
    #${WC_OVERLAY} .wc-card:nth-child(even){background:#393532}
    #${WC_OVERLAY} .wc-card-title,#${WC_OVERLAY} .wc-page-title h2{color:#F2EFE9}
    #${WC_OVERLAY} .wc-card-note,#${WC_OVERLAY} .wc-page-title p,#${WC_OVERLAY} .wc-sub{color:#AAA39D}
    #${WC_OVERLAY} .wc-title{color:#F2EFE9;letter-spacing:.01em}
    #${WC_OVERLAY} .wc-search,#${WC_OVERLAY} .wc-num,#${WC_OVERLAY} .wc-select,#${WC_OVERLAY} .wc-text{
      background:#1F1D1B;border-color:#625C57;color:#F6F3EE
    }
    #${WC_OVERLAY} .wc-search::placeholder{color:#88817B}

    /* Quick slots: action cards must be readable as actions before hover. */
    #${WC_OVERLAY} .wc-quick-slot-card{background:#35312F;border-color:#5D5752}
    #${WC_OVERLAY} .wc-quick-slot-card .wc-card-title{margin-bottom:.7rem}
    #${WC_OVERLAY} .wc-slot{
      background:#4D4743;border-color:#756C65;color:#F5F1EB;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 2px 5px rgba(0,0,0,.18)
    }
    #${WC_OVERLAY} .wc-slot b{color:#FFFDF8;font-size:.77rem;letter-spacing:.005em}
    #${WC_OVERLAY} .wc-slot small{color:#B5ADA6;font-size:.64rem;line-height:1.32}
    #${WC_OVERLAY} .wc-slot:hover{background:#5B534E;border-color:#91857C;box-shadow:0 4px 12px rgba(0,0,0,.22)}
    #${WC_OVERLAY} .wc-slot:focus-visible{outline:2px solid #A2E1DB;outline-offset:2px}
    #${WC_OVERLAY} .wc-slot.defense{background:#445653;border-color:#7FB9B4;color:#F0FBF9}
    #${WC_OVERLAY} .wc-slot.defense b{color:#E9FFFC}
    #${WC_OVERLAY} .wc-slot.defense small{color:#B9D8D4}
    #${WC_OVERLAY} .wc-slot.ntr{background:#59424B;border-color:#A06B7E;color:#FCECF1}
    #${WC_OVERLAY} .wc-slot.ntr b{color:#FFEAF1}
    #${WC_OVERLAY} .wc-slot.ntr small{color:#DBB7C3}

    /* Neutral action buttons stay warm-gray; mint is reserved for selected state. */
    #${WC_OVERLAY} .wc-btn,#${WC_OVERLAY} .wc-icon,
    #${WC_OVERLAY} .wc-step button,#${WC_OVERLAY} .wc-quick-buttons button,
    #${WC_OVERLAY} .wc-subtab,#${WC_OVERLAY} .wc-filter,
    #${WC_OVERLAY} .wc-segment button{
      background:#57504B;border-color:#766D66;color:#F1EDE7
    }
    #${WC_OVERLAY} .wc-btn:hover,#${WC_OVERLAY} .wc-icon:hover,
    #${WC_OVERLAY} .wc-step button:hover,#${WC_OVERLAY} .wc-quick-buttons button:hover,
    #${WC_OVERLAY} .wc-subtab:hover,#${WC_OVERLAY} .wc-filter:hover,
    #${WC_OVERLAY} .wc-segment button:hover{background:#665D57;border-color:#8C8178;color:#FFF}
    #${WC_OVERLAY} .wc-btn.gold{background:#ECEAE4;border-color:#D3CEC7;color:#2C2926}
    #${WC_OVERLAY} .wc-btn.green{background:#D3EAE7;border-color:#B9DDD8;color:#263735}
    #${WC_OVERLAY} .wc-subtab.active,#${WC_OVERLAY} .wc-filter.active,#${WC_OVERLAY} .wc-segment button.sel{
      background:#A2E1DB;border-color:#C8EFEB;color:#273835
    }
    #${WC_OVERLAY} .wc-tab.active{background:rgba(162,225,219,.12);border-color:#A2E1DB;color:#F3FFFD}
    #${WC_OVERLAY} .wc-range{accent-color:#A2E1DB}

    /* Tables/cards retain warm dove-gray separation without the previous haze. */
    #${WC_OVERLAY} .wc-table th{background:#46413D;border-color:#69615B;color:#DDD7D1}
    #${WC_OVERLAY} .wc-table td{border-color:rgba(105,97,91,.64)}
    #${WC_OVERLAY} .wc-picker,#${WC_OVERLAY} .wc-boundary-note{background:#35312F;border-color:#5E5852}
    #${WC_OVERLAY} .wc-trait{background:#373330;border-color:#5F5954}
    #${WC_OVERLAY} .wc-effect-field:nth-child(even){background:rgba(255,255,255,.025)}

    /* The in-game launcher must look clickable even before hover. */
    #${WC_ID}{
      background:#B9DAEA!important;border-color:#D4EAF4!important;color:#263842!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 2px 8px rgba(0,0,0,.28)!important;
      font-weight:750
    }
    #${WC_ID}:hover{background:#CAE5F0!important;border-color:#E7F5FA!important;color:#1F3038!important}
    #${WC_ID}:active{background:#AFCFDF!important;transform:translateY(1px)}

    /* Keep the pre-game review visually consistent. */
    #${WC_REVIEW}{background:rgba(8,7,7,.31)}
    #${WC_REVIEW} .wcr-shell{background:#2A2826;border-color:#5B5651}
    #${WC_REVIEW} .wcr-head{background:#242220;border-color:#514C48}
    #${WC_REVIEW} .wcr-tabs,#${WC_REVIEW} .wcr-foot{background:#262421;border-color:#514C48}
    #${WC_REVIEW} .wcr-main{background:#302D2A}
    #${WC_REVIEW} .wc-card{background:#3A3633;border-color:#625C57}
  `;

  const button=document.createElement('button');
  style.textContent+=`
/* Boundary table has four equal numeric columns. */
    #${WC_OVERLAY} .wc-boundary-table th:first-child,#${WC_OVERLAY} .wc-boundary-table td:first-child{width:28%;text-align:left}
    #${WC_OVERLAY} .wc-boundary-table th:nth-child(n+2),#${WC_OVERLAY} .wc-boundary-table td:nth-child(n+2){width:18%;text-align:center}
    #${WC_OVERLAY} .wc-boundary-table td:nth-child(n+2) .wc-num{width:100%;max-width:none;min-width:0;box-sizing:border-box;text-align:center}
  `;
  style.textContent+=`
    #${WC_OVERLAY} .wc-sidebar{display:flex;flex-direction:column;gap:.2rem}
    #${WC_OVERLAY} .wc-sidebar .wc-tab{flex-shrink:0}
    #${WC_OVERLAY} .wc-credit{margin-top:auto;padding:1.1rem .5rem .4rem;text-align:center;color:#9A9289;font-size:.66rem;letter-spacing:.02em;opacity:.7}
    #${WC_OVERLAY} .wc-material-table{min-width:40rem;width:100%;table-layout:fixed}
    #${WC_OVERLAY} .wc-material-table th:nth-child(1){width:26%}
    #${WC_OVERLAY} .wc-material-table th:nth-child(2){width:22%}
    #${WC_OVERLAY} .wc-material-table th:nth-child(3){width:32%}
    #${WC_OVERLAY} .wc-material-table th:nth-child(4){width:20%}
    #${WC_OVERLAY} .wc-material-table td:nth-child(3)>b{display:block;text-align:center;color:#ECEAE4}
    #${WC_OVERLAY} .wc-material-table td{padding:.6rem;overflow-wrap:anywhere}
    #${WC_OVERLAY} .wc-material-table .wc-step{grid-template-columns:2.1rem minmax(0,1fr) 2.1rem;gap:.35rem;width:100%;max-width:10rem;box-sizing:border-box;margin-inline:auto}
    #${WC_OVERLAY} .wc-material-table .wc-step button{min-width:0;width:100%;height:2rem;padding:0;box-sizing:border-box}
    #${WC_OVERLAY} .wc-material-table .wc-step .wc-num{min-width:0;width:100%;height:2rem;padding:0 .15rem;box-sizing:border-box}
    #${WC_OVERLAY} .wc-material-table .wc-known{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,5.4rem),1fr));width:100%;gap:.35rem;margin:.35rem 0 0;padding:0;box-sizing:border-box}
    #${WC_OVERLAY} .wc-material-table .wc-known .wc-chip{width:100%;min-width:0;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}
    #${WC_OVERLAY} .wc-material-table .wc-actions{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center}
    #${WC_OVERLAY} .wc-material-table .wc-actions .wc-btn{min-width:0;max-width:100%;white-space:normal;padding:.3rem .5rem}
    #${WC_OVERLAY} [data-material-scroll]{max-width:100%;min-width:0}
    #${WC_OVERLAY} .wc-patron-sidebar{align-self:start;min-width:0}
    #${WC_OVERLAY} .wc-patron-sidebar>.wc-card{margin-top:.85rem;padding:.7rem 0 0;border:0;border-top:1px solid #5E5852;border-radius:0;background:transparent}
    #${WC_OVERLAY} .wc-patron-sidebar .wc-field{grid-template-columns:minmax(0,1fr) 5rem;gap:.4rem}
    #${WC_OVERLAY} .wc-patron-sidebar .wc-field .wc-range{display:none}
    #${WC_OVERLAY} .wc-patron-sidebar .wc-field .wc-num{grid-column:2;min-width:0;width:100%;box-sizing:border-box}
    #${WC_OVERLAY} .wc-patron-sidebar [data-action="summon-patron"]{width:100%}
    #${WC_OVERLAY} .wc-storage-list{display:grid;gap:.6rem;margin:.7rem 0}
    #${WC_OVERLAY} .wc-storage-item{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.55rem .65rem;border:1px solid #5E5852;border-radius:.4rem}
    #${WC_OVERLAY} .wc-storage-item>div{min-width:0}
    #${WC_OVERLAY} .wc-storage-item b{font-size:.8rem}
    #${WC_OVERLAY} .wc-storage-item p{font-size:.72rem;color:#ADA69C;margin:.2rem 0 0;line-height:1.4}
    #${WC_OVERLAY} .wc-storage-item .wc-btn{flex-shrink:0}
    #${WC_OVERLAY} .wc-section-header{position:sticky;top:-1rem;z-index:12;background:#302D2A;padding:.35rem 0 .3rem;margin:0 0 .65rem;box-shadow:0 4px 6px -5px #000}
    #${WC_OVERLAY} .wc-section-header .wc-page-title{margin:0 0 .35rem;gap:.4rem}
    #${WC_OVERLAY} .wc-section-header .wc-page-title h2{font-size:1rem;margin:0}
    #${WC_OVERLAY} .wc-section-header .wc-page-title p{font-size:.72rem;margin:.15rem 0 0;line-height:1.35}
    #${WC_OVERLAY} .wc-section-header .wc-subtabs{margin:0;padding:.15rem 0 .3rem;gap:.35rem}
    @media(max-width:900px){#${WC_OVERLAY} .wc-sidebar{flex-direction:row;align-items:center}#${WC_OVERLAY} .wc-credit{margin:0 0 0 auto;padding:.35rem;white-space:nowrap}#${WC_OVERLAY} .wc-section-header{top:-.65rem}}
    @media(max-width:520px){#${WC_OVERLAY} .wc-section-header{top:-.45rem}#${WC_OVERLAY} .wc-section-header .wc-page-title p{font-size:.68rem}}
`;
  style.textContent+=`
    #${WC_OVERLAY} .wc-section-header .wc-page-title>div:first-child{display:flex;align-items:baseline;flex-wrap:wrap;gap:.25rem .85rem}
    #${WC_OVERLAY} .wc-section-header .wc-page-title h2{flex:0 0 auto}
    #${WC_OVERLAY} .wc-section-header .wc-page-title p{margin:0;color:#B4ACA3}
    #${WC_OVERLAY} .wc-section-header .wc-subtabs{gap:1.1rem;border-bottom:1px solid #625A54;padding:.25rem 0 0;overflow-y:hidden}
    #${WC_OVERLAY} .wc-section-header .wc-subtab{background:transparent;border:0;border-radius:0;border-bottom:3px solid transparent;color:#ADA69D;padding:.5rem .15rem .45rem;min-height:0;box-shadow:none}
    #${WC_OVERLAY} .wc-section-header .wc-subtab:hover{color:#ECE6DD;background:transparent}
    #${WC_OVERLAY} .wc-section-header .wc-subtab.active{color:#ADE1DD;border-bottom-color:#94D6D0;background:transparent}
    #${WC_OVERLAY} .wc-grid,#${WC_OVERLAY} .wc-card{min-width:0}
    #${WC_OVERLAY} .wc-material-table{min-width:44rem}
    #${WC_OVERLAY} .wc-material-table th:nth-child(1){width:24%}
    #${WC_OVERLAY} .wc-material-table th:nth-child(2){width:19%}
    #${WC_OVERLAY} .wc-material-table th:nth-child(3){width:39%}
    #${WC_OVERLAY} .wc-material-table th:nth-child(4){width:18%}
    #${WC_OVERLAY} .wc-effect-count{display:block;white-space:nowrap;color:#D9D1C7;font-size:.7rem;font-variant-numeric:tabular-nums;line-height:1.3;margin-bottom:.3rem}
    #${WC_OVERLAY} .wc-material-table .wc-known{display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:.3rem;margin:.2rem 0 0;width:100%;padding:0}
    #${WC_OVERLAY} .wc-effect{display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;box-sizing:border-box;width:auto;min-width:0;white-space:nowrap;border:1px solid;border-radius:.3rem;padding:.15rem .3rem;font-size:.68rem;line-height:1.25;font-weight:600;letter-spacing:-.02em}
    #${WC_OVERLAY} .wc-effect-restore{color:#A8D9BC;background:#30443A;border-color:#587664}
    #${WC_OVERLAY} .wc-effect-harm{color:#F0AB96;background:#4B332F;border-color:#925F50}
    #${WC_OVERLAY} .wc-effect-sensory{color:#E6AFE5;background:#48354C;border-color:#8B6591}
    #${WC_OVERLAY} .wc-effect-mental{color:#ACCEFA;background:#303F53;border-color:#5B7EA7}
    #${WC_OVERLAY} .wc-brew-section{margin-top:1.15rem;padding-top:.85rem;border-top:1px solid #5E5852}
    #${WC_OVERLAY} .wc-brew-section h3{font-size:.85rem;margin:0 0 .6rem;color:#E8E0D5}
`;
  style.textContent+=`
    #${WC_OVERLAY} .wc-section-header .wc-subtabs{gap:.45rem;padding:.45rem 0 0;border-bottom:1px solid #746B62}
    #${WC_OVERLAY} .wc-section-header .wc-subtab{font-size:.86rem;font-weight:700;letter-spacing:.015em;min-height:2.55rem;min-width:4.5rem;padding:.55rem .85rem .5rem;color:#D3CBC1;border-radius:.35rem .35rem 0 0;border-bottom:3px solid transparent;transition:background .12s,color .12s;cursor:pointer}
    #${WC_OVERLAY} .wc-section-header .wc-subtab:hover{background:#48433D;color:#FFF5E9;border-bottom-color:#867D71}
    #${WC_OVERLAY} .wc-section-header .wc-subtab.active{background:#394B47;color:#C2F2E9;border-bottom-color:#A5E7D9}
    #${WC_OVERLAY} .wc-section-header .wc-subtab:focus-visible{outline:2px solid #A5E7D9;outline-offset:-2px;background:#435A53;color:#E2FFF6}
`;
  style.textContent+=`
    #${WC_OVERLAY} .wc-card-title,#${WC_OVERLAY} .wc-brew-section h3{background:#433F39;border:1px solid #58524B;border-left:3px solid #78958B;border-radius:.3rem;padding:.5rem .65rem;margin:0 0 .7rem;font-size:.85rem;font-weight:700;line-height:1.35;color:#EEE8DF;box-sizing:border-box}
    #${WC_OVERLAY} .wc-card-title>span:first-child{font-weight:700}
    #${WC_OVERLAY} .wc-quick-stat{padding:.5rem .55rem;border-radius:.3rem;margin:.2rem 0;box-sizing:border-box}
    #${WC_OVERLAY} .wc-quick-stat:nth-of-type(even){background:#302D29}
    #${WC_OVERLAY} .wc-quick-stat:nth-of-type(odd){background:#3A3631}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-stat{grid-template-columns:minmax(2.8rem,1fr) minmax(3rem,4.8rem) auto;gap:.35rem}
    #${WC_OVERLAY} .wc-quick-stat .val{min-width:0;width:100%;box-sizing:border-box}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons button{min-width:2.4rem;padding:0 .3rem}
    #${WC_OVERLAY} .wc-quick-stat .name{font-weight:600;color:#DAD3CA}
    #${WC_OVERLAY} .wc-brew-section{margin-top:.9rem;padding-top:.8rem}
    #${WC_OVERLAY} .wc-patron-sidebar>.wc-card-title{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
    #${WC_OVERLAY} .wc-patron-favorite{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:1.9rem;height:1.9rem;padding:0;border:1px solid #827567;border-radius:.3rem;background:#322E29;color:#C4B7A6;font-size:1.2rem;line-height:1;cursor:pointer}
    #${WC_OVERLAY} .wc-patron-favorite:hover{background:#55472E;color:#FFE0A0}
    #${WC_OVERLAY} .wc-patron-favorite.is-favorite{background:#57472C;border-color:#BE9754;color:#FFD781}
    #${WC_OVERLAY} .wc-patron-favorite:focus-visible{outline:2px solid #FFE0A0;outline-offset:2px}
`;
  style.textContent+=`
    #${WC_OVERLAY} .wc-quick-card .wc-quick-stat{grid-template-columns:minmax(0,1fr) 4.8rem 5.25rem;gap:.4rem}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.25rem;width:5.25rem;justify-content:initial}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons button{min-width:0;width:100%;padding:0 .2rem;box-sizing:border-box;font-size:.7rem}
    #${WC_OVERLAY} .wc-quick-card .wc-quick-buttons button:only-child{grid-column:2}
    #${WC_OVERLAY} button[data-number-tone="increase"]{color:#7BC3FF;border-color:#7BC3FF;background:#293C4C}
    #${WC_OVERLAY} button[data-number-tone="decrease"]{color:#ff4646;border-color:#ff4646;background:#422C2B}
    #${WC_OVERLAY} button[data-number-tone="full"]{color:#64bc61;border-color:#64bc61;background:#2C402C}
    #${WC_OVERLAY} button[data-number-tone]:hover{filter:brightness(1.18)}
    #${WC_OVERLAY} button[data-number-tone]:focus-visible{outline:2px solid currentColor;outline-offset:2px}
    @media(max-width:520px){#${WC_OVERLAY} .wc-quick-card .wc-quick-stat{grid-template-columns:minmax(0,1fr) 4.4rem 5.25rem}}
`;
  style.textContent+=`
    /* Shared compact quantity control: identical geometry in tables and cards. */
    #${WC_OVERLAY} input[type="number"],#${WC_REVIEW} input[type="number"]{text-align:center!important;text-indent:0!important;padding-inline:.35rem!important;box-sizing:border-box;font-variant-numeric:tabular-nums;appearance:textfield;-moz-appearance:textfield}
    #${WC_OVERLAY} input[type="number"]::-webkit-inner-spin-button,#${WC_OVERLAY} input[type="number"]::-webkit-outer-spin-button,#${WC_REVIEW} input[type="number"]::-webkit-inner-spin-button,#${WC_REVIEW} input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    #${WC_OVERLAY} .wc-field-stepper{grid-template-columns:minmax(0,1fr) auto;gap:.75rem}
    #${WC_OVERLAY} .wc-step,#${WC_OVERLAY} .wc-material-table .wc-step{display:grid;grid-template-columns:2.25rem 4.5rem 2.25rem;gap:.4rem;width:9.8rem;max-width:100%;align-items:center;box-sizing:border-box}
    #${WC_OVERLAY} .wc-field-stepper .wc-step{grid-column:2;justify-self:end;margin:0}
    #${WC_OVERLAY} .wc-step button,#${WC_OVERLAY} .wc-step .wc-num,#${WC_OVERLAY} .wc-material-table .wc-step button,#${WC_OVERLAY} .wc-material-table .wc-step .wc-num{grid-column:auto;min-width:0;width:100%;height:2.25rem;margin:0;padding:0;box-sizing:border-box;border-radius:.4rem}
    #${WC_OVERLAY} .wc-number-tools .wc-num{flex:0 1 7rem;width:7rem;min-width:4.5rem}
    #${WC_OVERLAY} button[data-number-tone="increase"]{background:#A8D4FF;border-color:#A8D4FF;color:#17364F}
    #${WC_OVERLAY} button[data-number-tone="decrease"]{background:#FFB3B3;border-color:#FFB3B3;color:#542727}
    #${WC_OVERLAY} button[data-number-tone="full"]{background:#AFE0B0;border-color:#AFE0B0;color:#244427}
    #${WC_OVERLAY} button[data-number-tone]{font-weight:700;box-shadow:none;transition:filter .12s ease,transform .12s ease}
    #${WC_OVERLAY} button[data-number-tone]:hover{filter:brightness(1.06)}
    #${WC_OVERLAY} button[data-number-tone]:active{filter:brightness(.94);transform:translateY(1px)}
    #${WC_OVERLAY} button[data-number-tone]:focus-visible{outline:2px solid #F4F7FA;outline-offset:3px}
    #${WC_OVERLAY} .wc-card-title,#${WC_OVERLAY} .wc-brew-section h3{background:#3E4247;border-color:#555B62;border-left-color:#A2B8C7;color:#F1F4F7}
    @media(max-width:520px){#${WC_OVERLAY} .wc-field-stepper{grid-template-columns:minmax(0,1fr) auto;gap:.4rem}#${WC_OVERLAY} .wc-number-tools .wc-num{flex-basis:7rem}}
`;
  style.textContent+=`
    #${WC_OVERLAY} .wc-tavern-economy .wc-field,#${WC_OVERLAY} .wc-tavern-stock .wc-field{grid-template-columns:minmax(0,1fr) 14.55rem;gap:.5rem}
    #${WC_OVERLAY} .wc-tavern-economy .wc-number-tools{grid-column:2;display:grid;grid-template-columns:4.5rem 3.3rem 3.3rem;gap:.4rem;padding-left:2.65rem;box-sizing:border-box;width:14.55rem}
    #${WC_OVERLAY} .wc-tavern-economy .wc-number-tools .wc-num{grid-column:1;width:4.5rem;min-width:0;height:2.25rem}
    #${WC_OVERLAY} .wc-tavern-economy .wc-number-tools .wc-btn{min-width:0;width:100%;height:2.25rem;padding:0 .15rem;font-size:.7rem;box-sizing:border-box}
    #${WC_OVERLAY} .wc-tavern-stock .wc-step{justify-self:start;grid-template-columns:2.25rem 4.5rem 2.25rem;margin:0}
`;
  button.id=WC_ID;button.type='button';button.innerHTML='⚙ Cheats';button.title='Cheat Ledger 열기';
  document.body.appendChild(button);

  const overlay=document.createElement('div');
  overlay.id=WC_OVERLAY;overlay.hidden=true;
  overlay.innerHTML=`<div class="wc-shell" role="dialog" aria-modal="true" aria-label="Cheat Ledger">
    <header class="wc-header"><div class="wc-titlebox"><div class="wc-title">Cheat Ledger</div><div class="wc-sub">Wayward 09-30-2026 / 한글 패치 v1.4 대응</div></div><div class="wc-searchbox"><input class="wc-search" type="search" placeholder="전체 치트 기능 검색…" autocomplete="off"><div class="wc-search-results" hidden></div></div><div class="wc-head-actions"><button class="wc-icon" type="button" data-close title="닫기">✕</button></div></header>
    <nav class="wc-sidebar"></nav><main class="wc-main"></main><footer class="wc-footer"><span data-status></span><span class="wc-footer-center" data-history></span><span class="wc-footer-actions"><button class="wc-btn" type="button" data-footer-undo>↶ Undo</button><button class="wc-btn" type="button" data-footer-redo>↷ Redo</button></span></footer></div>`;
  document.body.appendChild(overlay);

  const review=document.createElement('div');
  review.id=WC_REVIEW;review.hidden=true;
  review.innerHTML=`<div class="wcr-shell"><header class="wcr-head"><div><h2 data-review-title>최종 캐릭터 조정</h2><p>처음 정해진 성향과 수치를 확인하고, 원하는 부분만 손본 뒤 이야기를 시작하세요.</p></div></header><nav class="wcr-tabs"></nav><main class="wcr-main"></main><footer class="wcr-foot"><button type="button" class="wc-btn ghost" data-review-reset>처음 정해진 값으로 되돌리기</button><div class="right"><button type="button" class="wc-btn" data-review-section-reset>이 탭 초기화</button><button type="button" class="wc-btn gold" data-review-save>이 설정으로 시작</button></div></footer></div>`;
  document.body.appendChild(review);

  const toastEl=document.createElement('div');toastEl.className='wc-toast';document.body.appendChild(toastEl);
  const tooltipEl=document.createElement('div');tooltipEl.className='wc-tooltip';tooltipEl.hidden=true;document.body.appendChild(tooltipEl);
  function hideTooltip(){tooltipEl.hidden=true}
  function showTooltip(el){const msg=el?.dataset?.tip;if(!msg)return;tooltipEl.textContent=msg;tooltipEl.hidden=false;const r=el.getBoundingClientRect(),pad=8;let left=r.right+8,top=r.top-6;const box=tooltipEl.getBoundingClientRect();if(left+box.width>innerWidth-pad)left=Math.max(pad,r.left-box.width-8);if(top+box.height>innerHeight-pad)top=Math.max(pad,innerHeight-box.height-pad);tooltipEl.style.left=left+'px';tooltipEl.style.top=top+'px'}
  function bindTooltipHost(host){host.addEventListener('mouseover',e=>{const el=e.target.closest?.('.wc-help[data-tip]');if(el&&host.contains(el))showTooltip(el)});host.addEventListener('mouseout',e=>{const el=e.target.closest?.('.wc-help[data-tip]');if(el&&(!e.relatedTarget||!el.contains(e.relatedTarget)))hideTooltip()});host.addEventListener('focusin',e=>{const el=e.target.closest?.('.wc-help[data-tip]');if(el)showTooltip(el)});host.addEventListener('focusout',e=>{if(e.target.closest?.('.wc-help[data-tip]'))hideTooltip()})}
  bindTooltipHost(overlay);bindTooltipHost(review);window.addEventListener('resize',hideTooltip);window.addEventListener('scroll',hideTooltip,true);
  let toastTimer=null;
  function toast(msg,type='') {toastEl.textContent=msg;toastEl.className='wc-toast show '+type;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.className='wc-toast',2600)}

  const tabs=[['quick','⚡','빠른 치트'],['player','🧑','플레이어'],['heroine','♥','히로인'],['tavern','🍺','선술집'],['alchemy','⚗','재료 · 조제'],['magic','✦','마법'],['relations','👥','인물 관계'],['advanced','⚙','고급']];
  const sidebar=overlay.querySelector('.wc-sidebar'),main=overlay.querySelector('.wc-main'),searchInput=overlay.querySelector('.wc-search'),searchBox=overlay.querySelector('.wc-search-results');
  main.addEventListener('input',updateNumericButtonTones);
  sidebar.innerHTML=tabs.map(([id,ico,label])=>`<button type="button" class="wc-tab" data-tab="${id}"><span class="ico">${ico}</span>${label}</button>`).join('')+'<div class="wc-credit">Sanguine/ChatGPT</div>';

  function mainGameVisible(){return !!document.querySelector('#root button[title^="Menu"]')||!!document.querySelector('#root')}
  function refreshButton(){const root=re.getState();button.style.display=root&&root.started&&root.state&&mainGameVisible()?'inline-flex':'none';if(!root.started&&panelOpen)closePanel()}
  function setPanel(open){panelOpen=open;overlay.hidden=!open;button.setAttribute('aria-expanded',open?'true':'false');if(open){history=[];future=[];render()}else{history=[];future=[]}}
  function closePanel(){setPanel(false)}
  function current(){return re.getState().state}
  function updateHistoryFooter(){const ub=overlay.querySelector('[data-footer-undo]'),rb=overlay.querySelector('[data-footer-redo]'),h=overlay.querySelector('[data-history]');if(ub)ub.disabled=!history.length;if(rb)rb.disabled=!future.length;if(h)h.textContent=history.length?`최근 변경: ${history[history.length-1].label}`:'변경 대기 중'}
  function commit(label,fn){const root=re.getState();if(!root||!root.state)return;const before=root.state;let after;try{after=fn(before)}catch(e){console.warn('[Cheat] change failed',e);toast('변경에 실패했습니다.','warn');return}if(!after||after===before)return;history.push({label,before,after});if(history.length>MAX_HISTORY)history.shift();future=[];updateHistoryFooter();re.setState(r=>({...r,state:after}));scheduleRender();}
  function undo(){const item=history.pop();if(!item)return;future.push(item);updateHistoryFooter();re.setState(r=>({...r,state:item.before}));toast(`되돌림: ${item.label}`);scheduleRender()}
  function redo(){const item=future.pop();if(!item)return;history.push(item);updateHistoryFooter();re.setState(r=>({...r,state:item.after}));toast(`다시 적용: ${item.label}`);scheduleRender()}
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{if(panelOpen&&!overlay.querySelector('input:focus,select:focus'))render()},80)}

  function help(text){return text?`<span class="wc-help" tabindex="0" aria-label="설명" data-tip="${esc(text)}">?</span>`:''}
  function card(title,body,note='',cls=''){return `<section class="wc-card ${cls}" data-search="${esc(title+' '+note)}"><div class="wc-card-title"><span>${title}</span></div>${note?`<div class="wc-card-note">${note}</div>`:''}${body}</section>`}
  function pageTitle(title,desc,actions=''){return `<div class="wc-page-title"><div><h2>${title}</h2><p>${desc}</p></div>${actions}</div>`}
  function action(label,act,cls=''){return `<button type="button" class="wc-btn ${cls}" data-action="${act}">${label}</button>`}
  function switchHtml(id,title,desc,on){return `<div class="wc-switch-row" data-search="${esc(title+' '+desc)}"><div><div class="wc-switch-title">${title}</div><div class="wc-switch-desc">${desc}</div></div><label class="wc-switch"><input type="checkbox" data-switch="${id}" ${on?'checked':''}><span class="wc-slider"></span></label></div>`}
  function selectHtml(id,title,value,options,desc=''){return `<div class="wc-field wc-select-field" data-search="${esc(title+' '+desc)}"><div class="wc-label">${title}${desc?help(desc):''}</div><select class="wc-select" data-select="${id}">${options.map(([v,l])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${l}</option>`).join('')}</select></div>`}
  function numberField(s,label,path,min=0,max=9999999,step=1,desc='',buttons=[]){const v=Number(pathGet(s,path)??0),key=path.join('.');return `<div class="wc-field wc-field-number-only" data-search="${esc(label+' '+desc)}"><div class="wc-label">${label}${desc?help(desc):''}</div><div class="wc-number-tools"><input class="wc-num" type="number" min="${min}" max="${max}" step="${step}" value="${fmt(v,3)}" data-path="${esc(key)}" data-min="${min}" data-max="${max}" data-step="${step}">${buttons.map(([l,op,val])=>`<button type="button" class="wc-btn" data-number-path="${esc(key)}" data-number-op="${op}" data-number-value="${val}">${l}</button>`).join('')}</div></div>`}
  function pathField(s,label,path,min=0,max=100,step=1,desc='',tone=''){const v=Number(pathGet(s,path)??0);const id='p:'+path.join('.');return `<div class="wc-field" data-search="${esc(label+' '+desc)}"><div class="wc-label">${label}${desc?help(desc):''}</div><input class="wc-range" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-range-for="${esc(id)}"><input class="wc-num ${tone==='ntr'?'wc-tone-ntr':''}" type="number" min="${min}" max="${max}" step="${step}" value="${fmt(v,3)}" data-path="${esc(path.join('.'))}" data-min="${min}" data-max="${max}" data-step="${step}"></div>`}
  function customField(id,label,value,min=0,max=100,step=1,desc='',tone=''){return `<div class="wc-field" data-search="${esc(label+' '+desc)}"><div class="wc-label">${label}${desc?help(desc):''}</div><input class="wc-range" type="range" min="${min}" max="${max}" step="${step}" value="${Number(value)||0}" data-range-for="c:${id}"><input class="wc-num ${tone==='ntr'?'wc-tone-ntr':''}" type="number" min="${min}" max="${max}" step="${step}" value="${fmt(Number(value)||0,3)}" data-custom="${id}" data-min="${min}" data-max="${max}" data-step="${step}"></div>`}
  function stepper(id,label,value,min=0,max=999,desc=''){return `<div class="wc-field wc-field-stepper" data-search="${esc(label+' '+desc)}"><div class="wc-label">${label}${desc?help(desc):''}</div><div class="wc-step"><button type="button" data-stepper="${id}" data-delta="-1">−</button><input class="wc-num" type="number" min="${min}" max="${max}" step="1" value="${Math.round(Number(value)||0)}" data-stepper-input="${id}" data-min="${min}" data-max="${max}"><button type="button" data-stepper="${id}" data-delta="1">+</button></div></div>`}
  function quickStat(id,name,value,buttons=[],tone=''){return `<div class="wc-quick-stat" data-search="${esc(name)}"><div class="name">${name}</div><input class="wc-num val ${tone==='ntr'?'wc-tone-ntr':''}" type="number" value="${fmt(value,2)}" data-quick="${id}"><div class="wc-quick-buttons">${buttons.map(([l,v])=>`<button type="button" data-quick-set="${id}" data-value="${v}">${l}</button>`).join('')}</div></div>`}
  function subtabs(items,active,attr){return `<div class="wc-subtabs">${items.map(([id,l])=>`<button type="button" class="wc-subtab ${active===id?'active':''}" data-${attr}="${id}">${l}</button>`).join('')}</div>`}

  function heroAttributeField(s,w,key,desc='',tone=''){const path=['characters',s.primaryCharacterId,'attributes',key],base=Number(w.attributes?.[key]??50),current=attributeEffective(w,key),effects=activeAttributeEffects(s,w,key),row=pathField(s,ATTR_LABELS[key]||key,path,0,100,1,desc,tone);return `<div class="wc-effect-field" data-search="${esc((ATTR_LABELS[key]||key)+' '+key+' '+desc)}">${row}${influenceLine(s,base,current,effects)}</div>`}
  function heroAffinityField(s,w,key,desc='',tone=''){const info=affinityInfo(s,w,key),id=`hero-affinity:${key}`,row=customField(id,AFFINITY_LABELS[key]||key,info.base,-2,2,.1,desc,tone);return `<div class="wc-effect-field" data-search="${esc((AFFINITY_LABELS[key]||key)+' '+key+' '+desc)}">${row}${influenceLine(s,info.base,info.current,info.effects)}</div>`}
  function patronChemistryField(s,name){const info=chemistryInfo(s,name),row=customField('patron-base-chemistry','케미스트리 / Chemistry',info.base,0,100,1,'손님과 그녀 사이의 즉각적인 호흡과 끌림입니다. 입력값은 기본 케미스트리를 바꾸며, 물약으로 생긴 임시 보너스는 별도로 유지됩니다.','ntr');return `<div class="wc-effect-field" data-search="케미스트리 Chemistry">${row}${influenceLine(s,info.base,info.current,info.effects)}</div>`}

  const BREW_OUTCOMES=[['normal','원래대로'],['success','성공 보장'],['strong','강화 성공 · 효능 2배']];
  function brewControls(){return selectHtml('brew-outcome','물약 제조 결과',globalThis.__CHEAT_LEDGER_BREW_OUTCOME__||'normal',BREW_OUTCOMES,'제조 완료 시 선택한 성공률과 효능 배율을 적용합니다.')+'<div class="wc-inline-note">성공 보장: 제조 실패를 방지합니다. 강화 성공: 성공한 조합의 모든 효능을 2배로 만듭니다. 부작용도 함께 강해집니다. 공통 효능이 없는 조합은 물약이 되지 않습니다.</div>'}
  function effectTone(id){const data=typeof vo==='object'?vo[id]:null;if(['befuddle','kindle','drowse'].includes(id))return 'sensory';if(data?.sign==='harm'||id==='cow'||id==='weary'||id==='nausea'||id.startsWith('sap_')||id==='drain_energy')return 'harm';if(['restore_mana','open','embolden','candor'].includes(id))return 'mental';return 'restore'}
  function effectChip(id){const tone=effectTone(id),label=effectLabel(id).replace(/\s*([+−-])$/,'$1'),group={sensory:'취기·흥분·수면',harm:'능력 저하·불리한 효과',mental:'마나·정신·사회 능력',restore:'회복·신체 강화·진정'}[tone];return `<span class="wc-effect wc-effect-${tone}" title="${esc(group+' · '+effectText(id,1))}">${esc(label)}</span>`}
  function renderQuick(s){const w=wifeOf(s),m=s.player?.magic||{};return pageTitle('빠른 치트','자주 쓰는 상태와 규칙을 한 번에 조정합니다. 세밀한 값은 각 전용 탭에서 다룰 수 있습니다.')+`
    <section class="wc-card wc-span2 wc-quick-slot-card"><div class="wc-card-title"><span>퀵 슬롯</span></div><div class="wc-quick-slots">
      <button class="wc-slot" data-action="quick-player-recover"><b>플레이어 전체회복</b><small>기력 FULL · 피로 0 · 마나 FULL</small></button>
      <button class="wc-slot" data-action="quick-wife-recover"><b>${esc(w?.name||'히로인')} 회복</b><small>기력 FULL · 피로가 있다면 0</small></button>
      <button class="wc-slot" data-action="quick-tavern-tidy"><b>여관 정리</b><small>청결 100 · 비어 있는 준비 음식/맥주/와인을 3으로</small></button>
      <button class="wc-slot ntr" data-action="quick-wife-vulnerable"><b>${esc(w?.name||'히로인')} NTR 취약</b><small>취한 상태 · 흥분도 80, 정신을 잃는 단계는 피함</small></button>
      <button class="wc-slot defense" data-action="quick-wife-defense"><b>${esc(w?.name||'히로인')} NTR 방어</b><small>취기 0 · 흥분 0 · 기분 최소 80</small></button>
    </div></section>
    <div class="wc-quick-row wc-quick-primary">
      ${card('플레이어',[quickStat('player-energy','기력',s.player?.stats?.energy??0,[['FULL',100]]),quickStat('player-fatigue','피로',s.player?.fatigue??0,[['0',0]]),quickStat('player-mood','기분',s.player?.stats?.mood??0,[['80',80],['100',100]])].join(''),'','wc-quick-card')}
      ${card(esc(w?.name||'히로인'),[quickStat('wife-energy','기력',w?.stats?.energy??0,[['FULL',100]]),quickStat('wife-intox','취기',w?.intoxication?.level??0,[['0',0]],'ntr'),quickStat('wife-arousal','흥분도',w?.stats?.arousal??0,[['0',0],['80',80]],'ntr'),quickStat('wife-mood','기분',w?.stats?.mood??0,[['80',80],['100',100]])].join(''),'','wc-quick-card')}
      ${card('선술집',[quickStat('gold','골드',s.economy?.gold??0,[['+100','+100'],['+1000','+1000']]),quickStat('clean','청결',s.tavernCleanliness??0,[['100',100]]),quickStat('readyFood','준비 음식',s.readyFood??0,[['+3','+3']]),quickStat('beer','맥주',s.supplies?.beer??0,[['+3','+3']]),quickStat('wine','와인',s.supplies?.wine??0,[['+3','+3']])].join(''),'','wc-quick-card')}
    </div>
    <div class="wc-quick-row wc-quick-secondary">
      ${card('마법 · 위험 제어',switchHtml('infiniteMana','무한 마나','주문을 써도 마나가 모자라지 않습니다. 현재 마나 표시는 유지되지만 시전 시 항상 충분한 것으로 판정합니다.',!!globalThis.__CHEAT_LEDGER_INFINITE_MANA__)+switchHtml('safeSlip','몰래 물약 타기 발각 없음','잔에 물약을 섞어도 그녀가 눈치채지 않습니다. 발각 확률은 0%가 됩니다.',!!globalThis.__CHEAT_LEDGER_SAFE_SLIP__)+selectHtml('magicOutcome','마법 시전 결과',globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__,MAGIC_OUTCOMES,'선택한 결과가 시전 판정에 우선합니다. 본래 판정을 고르면 원래 확률로 돌아갑니다.'),'','wc-quick-wide')}
      ${card('보관 · 조제',`<div class="wc-card-note">현재 사용량 <b>${usedCapacity(s)}</b> / 공식 용량 <b>${officialCapacity(s)}</b>${globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__?' · 실효 용량 ∞':''}</div>`+switchHtml('infiniteStorage','무한 보관 공간','보관 공간이 가득 차도 재료와 물약을 더 놓을 수 있습니다. 설치한 시설과 공식 용량은 그대로 유지됩니다.',!!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__)+`<div class="wc-actions">${action('재료 · 조제 열기','go-alchemy')}</div><div class="wc-brew-section"><h3>물약 제조</h3>${brewControls()}</div>`,'','wc-quick-wide')}
</div>`}

  function renderPlayer(s){const p=s.player||{},attrs=p.attributes||{},skills=(()=>{try{return typeof Ya==='function'?Ya(s):(p.skills||{})}catch(_){return p.skills||{}}})();let a='';for(const k of Object.keys(attrs))if(Number.isFinite(Number(attrs[k])))a+=pathField(s,ATTR_LABELS[k]||k,['player','attributes',k],0,100,1);let sk='';for(const k of skillIds())sk+=customField('player-skill:'+k,SKILL_LABELS[k]||k,Number(skills[k]??0),0,100,1);return pageTitle('플레이어','상태, 성격, 능력치와 숙련도를 세부 조정합니다.')+`<div class="wc-grid">
    ${card('상태',pathField(s,'기력',['player','stats','energy'],0,100,1)+pathField(s,'기분',['player','stats','mood'],0,100,1)+pathField(s,'흥분도',['player','stats','arousal'],0,100,1)+pathField(s,'피로',['player','fatigue'],0,100,1))}
    ${card('성격',pathField(s,'지배성',['player','personality','dominance'],0,100,1)+pathField(s,'카리스마',['player','personality','charisma'],0,100,1)+pathField(s,'교활함',['player','personality','cunning'],0,100,1))}
    ${card('능력치',a,'현재 세이브에 실제로 존재하는 숫자 능력치를 동적으로 표시합니다.')}
    ${card('숙련도',sk,'사냥 · 채집 · 물약 제조 · 요리 · 서빙. 숙련도가 높을수록 해당 작업의 성과가 좋아집니다.')}
  </div>`}

  function traitGrid(s){const w=wifeOf(s);if(!w)return '<div class="wc-empty">히로인을 찾을 수 없습니다.</div>';const active=new Set(w.latentTraits||[]),noticed=new Set(w.noticedLatentTraits||[]);return `<div class="wc-traits">${traitIds().map(id=>{const mode=!active.has(id)?'none':noticed.has(id)?'revealed':'hidden',desc=TRAIT_DESCS[id]||'';return `<div class="wc-trait" data-search="${esc((TRAIT_LABELS[id]||id)+' '+id+' '+desc)}"><div class="wc-trait-name">${esc(TRAIT_LABELS[id]||id)} <span class="wc-muted">${esc(id)}</span>${help(desc)}</div>${desc?`<div class="wc-trait-desc">${esc(desc)}</div>`:''}<div class="wc-segment" data-trait="${esc(id)}"><button class="${mode==='none'?'sel':''}" data-mode="none">미보유</button><button class="owned-hidden ${mode==='hidden'?'sel':''}" data-mode="hidden">보유(미공개)</button><button class="revealed ${mode==='revealed'?'sel':''}" data-mode="revealed">보유(발견)</button></div></div>`}).join('')}</div>`}
  function boundaryTable(s){const rows=limitIds().map(id=>`<tr data-search="${esc((LIMIT_LABELS[id]||id)+' '+id+' 경계 금지 허용')}"><td><div class="wc-matname">${esc(LIMIT_LABELS[id]||id)}</div><div class="wc-muted">${esc(id)}</div></td><td><input class="wc-num" type="number" min="0" max="100" value="${fmt(latitudeValue(s,id,'restriction'))}" data-latitude="${id}" data-kind="restriction"></td><td><input class="wc-num" type="number" min="0" max="100" value="${fmt(latitudeValue(s,id,'restrictionClarity'))}" data-latitude="${id}" data-kind="restrictionClarity"></td><td><input class="wc-num wc-tone-ntr" type="number" min="0" max="100" value="${fmt(latitudeValue(s,id,'encouragement'))}" data-latitude="${id}" data-kind="encouragement"></td><td><input class="wc-num" type="number" min="0" max="100" value="${fmt(latitudeValue(s,id,'encouragementClarity'))}" data-latitude="${id}" data-kind="encouragementClarity"></td></tr>`).join('');return `<div class="wc-boundary-note"><b>금지/허용 신호</b>는 당신이 보낸 의사의 강도이고, <b>확신</b>은 그녀가 그 뜻을 얼마나 분명하게 이해했는지입니다. 신호 100 / 확신 20은 강한 기색을 느꼈지만 뜻을 확신하지 못한 상태이고, 신호 20 / 확신 100은 약한 뜻이라는 점을 정확히 이해한 상태입니다.</div><div class="wc-boundary-wrap"><table class="wc-table wc-boundary-table"><thead><tr><th>행동</th><th>금지 신호</th><th>금지 확신</th><th>허용 신호</th><th>허용 확신</th></tr></thead><tbody>${rows}</tbody></table></div><div class="wc-actions" style="margin-top:.55rem">${action('모든 경계 정보 초기화','reset-boundaries')}${action('모든 금지 신호 0','clear-limits')}${action('모든 허용 신호·확신 100','max-encouragement','ntr')}</div>`}
  function heroineSubtabs(){return `<div class="wc-subtabs wc-hero-subtabs">${[['profile','상태 · 능력 · 취향'],['traits','숨은 성향'],['boundaries','정해진 선 · 허용 신호']].map(([id,l])=>`<button type="button" class="wc-subtab ${heroineView===id?'active':''}" data-heroine-view="${id}">${l}</button>`).join('')}</div>`}
  function renderHeroine(s){const w=wifeOf(s);if(!w)return pageTitle('히로인','')+'<div class="wc-empty">현재 히로인 데이터가 없습니다.</div>';const base=['characters',s.primaryCharacterId];
    if(heroineView==='traits')return pageTitle(esc(w.name||'히로인'),'실제 성향 보유 여부와 플레이어가 그 성향을 알아냈는지를 따로 관리합니다.')+heroineSubtabs()+card('숨은 성향',traitGrid(s),'미보유는 성향 자체가 없음, 보유(미공개)는 실제 성향은 작동하지만 플레이어가 아직 파악하지 못함, 보유(발견)는 성향이 존재하고 플레이어도 알고 있는 상태입니다.','wc-span2');
    if(heroineView==='boundaries')return pageTitle(esc(w.name||'히로인'),'당신이 보낸 금지·허용 신호와 그녀가 그 뜻을 얼마나 확실히 이해했는지를 행동별로 조정합니다.')+heroineSubtabs()+card('정해진 선 · 허용 신호',boundaryTable(s),'모든 행동을 한 번에 펼쳐 표시합니다. 이 목록에는 별도의 세로 스크롤 영역을 두지 않습니다.','wc-span2');
    const optional=[];for(const [k,l,max,d] of [['identityStrain','정체성 긴장',100,'자신이 알고 있던 모습과 실제 행동 사이의 괴리가 쌓인 정도입니다.'],['derangement','마법 후유증',100,'마법으로 인한 정신적 흔들림의 현재 강도입니다.'],['derangementPeak','마법 후유증 최고치',100,'이번 후유증 동안 도달한 가장 높은 강도입니다.'],['annoyance','짜증',100,'당신이나 상황에 대한 당장의 불쾌감입니다.']])if(w[k]!=null&&Number.isFinite(Number(w[k])))optional.push(pathField(s,l,[...base,k],0,max,1,d));
    let attrs='';for(const [k,v] of Object.entries(w.attributes||{}))if(Number.isFinite(Number(v))){const d=k==='loyalty'?'관계에 대한 헌신과 정절 성향입니다. 높을수록 외도나 선을 넘는 제안에 더 오래 버티는 경향이 있습니다.':k==='honesty'?'자신의 행동과 감정을 숨기지 않고 말하는 성향입니다.':k==='openness'?'새로운 경험과 변화에 마음을 여는 성향입니다. 새로운 행동을 받아들이는 폭에도 관여합니다.':k==='confidence'?'자기 판단을 믿고 압박 속에서도 자기 입장을 지키는 힘입니다.':'';attrs+=heroAttributeField(s,w,k,d,['openness','libido'].includes(k)?'ntr':'')}
    let skills='';for(const k of skillIds())skills+=pathField(s,SKILL_LABELS[k]||k,[...base,'skills',k],0,100,1);
    let aff='';for(const [k,v] of Object.entries(w.affinities||{}))if(Number.isFinite(Number(v)))aff+=heroAffinityField(s,w,k,'',['romantic','oral','vaginal','anal','exhibition','prostitution','taboo'].includes(k)?'ntr':'');
    const inner=pathField(s,'개방성 Self Concept',[...base,'selfConcept','openness'],0,100,1,'스스로를 얼마나 개방적인 사람이라고 여기고 있는지 나타냅니다. 실제 행동이 반복되면 자기 인식도 변할 수 있습니다.','ntr')+pathField(s,'자신감 Self Concept',[...base,'selfConcept','confidence'],0,100,1,'스스로를 얼마나 자신감 있는 사람이라고 여기는지 나타냅니다. 기본 자신감 능력치와 별도로 변화할 수 있습니다.')+pathField(s,'변동성',[...base,'volatility'],0,1,.01,'감정과 자기 인식이 사건에 따라 얼마나 크게 흔들리는지와 연결됩니다.')+pathField(s,'개방성 증가율',[...base,'growthRates','openness','increase'],0,3,.01)+pathField(s,'개방성 감소율',[...base,'growthRates','openness','decrease'],0,3,.01)+pathField(s,'자신감 증가율',[...base,'growthRates','confidence','increase'],0,3,.01)+pathField(s,'자신감 감소율',[...base,'growthRates','confidence','decrease'],0,3,.01);
    const status=`<div class="wc-name-row"><input class="wc-text" type="text" maxlength="40" value="${esc(w.name||'')}" data-heroine-name><button class="wc-btn gold" data-action="apply-heroine-name">이름 적용</button></div><div class="wc-divider"></div>`+pathField(s,'기력',[...base,'stats','energy'],0,100,1)+pathField(s,'기분',[...base,'stats','mood'],0,100,1)+pathField(s,'흥분도',[...base,'stats','arousal'],0,100,1,'현재 욕구와 자극 수준입니다. 높을수록 성적 상황에 더 강하게 반응합니다.','ntr')+pathField(s,'취기',[...base,'intoxication','level'],0,100,1,'술기운의 현재 강도입니다. 약 55를 넘기면 상당히 취한 상태, 80 전후부터는 판단과 행동이 크게 무너질 수 있습니다.','ntr')+pathField(s,'오늘 마신 잔',[...base,'intoxication','drinksToday'],0,999,1)+pathField(s,'오늘 최고 취기',[...base,'intoxication','peakToday'],0,100,1);
    const relation=pathField(s,'개인 지갑',[...base,'purse'],0,999999,1)+pathField(s,'신뢰',[...base,'relationship','trust'],0,100,1,'당신을 얼마나 믿고 의지하는지 나타냅니다. 존중·보호·화해로 오르고, 배신·무시·강요로 떨어질 수 있으며 관계 반응과 갈등 회복에 영향을 줍니다.')+customField('wife-resentment','원망 / Resentment',resentmentValue(w),0,100,1,'당신을 향한 지속적인 분노·경멸·상처 같은 부정 감정의 강도입니다. 갈등과 배신, 반복적인 무시가 누적될수록 커질 수 있고 높을수록 정서적으로 멀어집니다.')+pathField(s,'손님 상호작용 장려',[...base,'relationship','patronInteractionsEncouraged'],0,100,1,'당신이 손님과의 친밀한 상호작용을 얼마나 허용하거나 밀어준다고 그녀가 받아들이는지 나타냅니다.','ntr')+optional.join('');
    return pageTitle(esc(w.name||'히로인'),'기본값을 편집하면서 물약·마법 등으로 달라진 현재 유효값과 남은 시간을 함께 확인합니다.')+heroineSubtabs()+`<div class="wc-hero-core">
      ${card('상태 · 표시 이름',status,'내부 캐릭터 ID는 유지하고 대사와 화면에 표시되는 이름만 바꿉니다.','wc-hero-status-card')}
      ${card('관계 · 감정',relation,'','wc-hero-relation-card')}
      ${card('능력치',attrs,'입력창은 항상 기본 능력치를 바꿉니다. 임시 효과는 그대로 유지되며 만료되면 새 기본값으로 돌아갑니다.','wc-hero-attrs-card')}
      ${card('취향 / Affinities',aff,'입력값은 기본 취향입니다. 마법으로 생긴 임시 변화가 있으면 현재 유효값과 남은 시간을 바로 아래에 따로 표시합니다. -2는 강한 기피, +2는 강한 선호입니다.','wc-hero-aff-card')}
      ${card('숙련도',skills,'사냥 · 채집 · 물약 제조 · 요리 · 서빙의 기본 숙련도입니다.','wc-hero-skills-card')}
      ${card('내면 · 성장',inner,'행동과 사건이 장기적으로 성격을 바꾸는 속도와 자기 인식을 조정합니다.','wc-hero-inner-card')}
    </div>`}


  function tavernUpgradeRows(s){const t=s.tavern||{},up=new Set(t.qualityUpgrades||[]),rows=[['room1','객실 1',!!t.hasRoom,'첫 번째 숙박 객실'],['room2','객실 2',!!t.hasRoom2,'두 번째 숙박 객실'],['bathhouse','목욕탕',!!t.hasBathhouse,'손님과 생활에 영향을 주는 목욕 시설'],['interior','인테리어',up.has('upgrade_interior'),'의자·바·바닥·조명 등 선술집 내부 개선'],['backroom','뒷방',!!t.backRoomReady,'사적인 대화와 사건에 쓰이는 뒷방']];return `<div class="wc-upgrades">${rows.map(([id,l,on,d])=>`<div class="wc-upgrade ${on?'installed':''}"><div><b>${l}</b><small>${d}</small></div><button class="wc-btn ${on?'green':''}" data-upgrade="${id}" ${on?'disabled':''}>${on?'설치됨':'설치'}</button></div>`).join('')}</div>`}
  const STORAGE_FACILITIES=[['kitchen_shelves','선반 추가','보관 공간 +40.'],['drying_rack','건조대 추가','보관 공간 +10. 약초·꽃·버섯·열매를 3배 오래 보관합니다.'],['larder','지하 저장고 추가','보관 공간 +60. 지방·골수·과일을 3배 오래 보관합니다.']];
  function storageControls(s){const installed=new Set(stillroom(s).storage||[]);return `<div class="wc-storage-list">${STORAGE_FACILITIES.map(([id,label,desc])=>`<div class="wc-storage-item"><div><b>${label}</b><p>${desc}</p></div><button class="wc-btn" type="button" data-storage-install="${id}" ${installed.has(id)?'disabled':''}>${installed.has(id)?'설치됨':'설치'}</button></div>`).join('')}</div><div class="wc-actions">${action('보관 시설 모두 설치','all-storage')}</div>`}
  function installStorageFacility(id){if(!STORAGE_FACILITIES.some(([key])=>key===id))return;commit('보관 시설 설치',s=>{const sr=stillroom(s);if((sr.storage||[]).includes(id))return s;return {...s,stillroom:{...sr,storage:[...(sr.storage||[]),id]}}})}
  function renderTavern(s){return pageTitle('선술집','경제, 평판, 재고와 시설을 한곳에서 관리합니다.',`<div class="wc-actions">${action('준비 음식·식량·맥주·와인 +10','stock-plus10')}${action('재고 모두 50','stock-50')}</div>`)+`<div class="wc-grid">
    ${card('경제',numberField(s,'골드',['economy','gold'],0,9999999,1,'물품·시설 구매, 임대료와 각종 지출에 쓰이는 현재 보유금입니다.',[['+100G','add',100],['+500G','add',500]])+numberField(s,'부채',['economy','debt'],0,9999999,1,'임대료나 청구액을 제때 내지 못하면 남은 금액이 빚으로 쌓입니다. 주간 정산에서 이자가 붙을 수 있고 금전 압박의 원인이 됩니다.')+numberField(s,'주간 임대료',['economy','weeklyRent'],0,9999999,1,'매주 정산 때 집주인에게 청구되는 기본 임대료입니다. 보유 골드로 모자라면 부족분이 부채로 넘어갑니다.'),'','wc-tavern-economy')}
    ${card('평판 · 상태',pathField(s,'서비스 평판',['tavernReputation','service'],0,100,1,'손님을 제대로 응대하고 음식·술을 잘 제공하면 좋아지고, 손님을 놓치거나 약속한 서비스를 못 하면 떨어집니다. 하루가 끝날 때 응대한 비율과 품질이 반영되며, 시설 수준보다 지나치게 높은 서비스 평판은 서서히 현실적인 수준으로 내려옵니다.')+pathField(s,'악명',['tavernReputation','notoriety'],0,100,1,'홀에서 벌어진 노골적인 성적 행동이나 목격된 위험한 마법 등 소문날 만한 일이 쌓이면 오릅니다. 높을수록 찾아오는 손님들이 그녀에게 더 대담한 행동을 기대하고, 선술집 자체도 음식과 술보다 추문으로 유명해집니다. 90을 넘는 극단적인 악명은 서비스 평판에도 악영향을 줍니다.','ntr')+pathField(s,'명성',['tavernReputation','renown'],0,100,1,'첫 주문을 한 손님들이 퍼뜨리는 입소문이 매일 누적되어 오릅니다. 마을 손님뿐 아니라 길손을 통해 먼 곳까지 소문이 퍼질수록 더 높은 명성에 가까워집니다. 전단·호객 같은 홍보도 손님 유입을 통해 명성 확산을 돕습니다.')+pathField(s,'청결',['tavernCleanliness'],0,100,1,'홀의 청결 상태입니다. 낮아지면 청소가 필요해지고 영업의 인상과 운영 흐름이 나빠집니다. 그녀는 상황이 허락하면 지저분한 선술집을 스스로 청소하려 들 수 있습니다.')+(s.tavern?.quality!=null?pathField(s,'시설 품질',['tavern','quality'],0,100,1,'객실·뒷방·목욕탕·인테리어 같은 시설이 쌓이면서 높아지는 물리적인 가게 수준입니다. 유지 가능한 서비스 평판의 기준에도 영향을 줍니다.') : ''))}
    ${card('식량 · 주류',stepper('readyFood','준비된 음식',s.readyFood??0)+stepper('food','식량',s.supplies?.food??0)+stepper('beer','맥주',s.supplies?.beer??0)+stepper('wine','와인',s.supplies?.wine??0),'일괄 버튼과 개별 수량 조절을 함께 제공합니다.','wc-tavern-stock')}
    ${card('보관',`<div class="wc-card-note">공식 저장 용량: <b>${officialCapacity(s)}</b> · 현재 사용: <b>${usedCapacity(s)}</b></div>${switchHtml('infiniteStorage','무한 보관 공간','보관 공간이 가득 차도 재료와 물약을 더 놓을 수 있습니다.',!!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__)}${storageControls(s)}`)}
    ${card('업그레이드',tavernUpgradeRows(s),'시설을 즉시 설치합니다. 골드는 차감하지 않으며 이미 설치된 시설은 다시 적용하지 않습니다.','wc-span2')}
  </div>`}

  function materialKind(x){return x.ground==='quarry'?'hunt':x.ground==='cellar'?'other':'forage'}
  function materialRows(s){const sr=stillroom(s),q=alchemySearch.trim().toLowerCase();return ingredientCatalog().filter(x=>{const count=Number(sr.ingredients?.[x.id]??0),known=(sr.known?.[x.id]??[]).length,total=(x.properties||[]).length;if(alchemyFilter==='forage'&&materialKind(x)!=='forage')return false;if(alchemyFilter==='hunt'&&materialKind(x)!=='hunt')return false;if(alchemyFilter==='owned'&&count<=0)return false;if(alchemyFilter==='unknown'&&total>0&&known>=total)return false;if(q&&!`${x.name} ${x.id}`.toLowerCase().includes(q))return false;return true}).map(x=>{const count=Number(sr.ingredients?.[x.id]??0),knownIds=sr.known?.[x.id]??[],total=x.properties?.length??0;return `<tr data-search="${esc(x.name+' '+x.id)}"><td><div class="wc-matname">${esc(x.name)}</div><div class="wc-muted">${esc(x.id)} · ${materialKind(x)==='hunt'?'사냥 부산물':'채집물'}</div></td><td>${`<div class="wc-step"><button data-mat-step="${x.id}" data-delta="-1">−</button><input class="wc-num" type="number" min="0" max="999" value="${count}" data-material="${x.id}"><button data-mat-step="${x.id}" data-delta="1">+</button></div>`}</td><td><span class="wc-effect-count">${knownIds.length} / ${total}</span>${knownIds.length?`<div class="wc-known">${knownIds.map(effectChip).join('')}</div>`:''}</td><td><div class="wc-actions"><button class="wc-btn" data-discover-one="${x.id}" ${total===0||knownIds.length>=total?'disabled':''}>효능 +1</button><button class="wc-btn" data-discover-all="${x.id}" ${total===0||knownIds.length>=total?'disabled':''}>전부 공개</button></div></td></tr>`}).join('')}
  function potionList(s){const sr=stillroom(s),cups=sr.cups||[];if(!cups.length)return '<div class="wc-empty">보유한 물약이 없습니다.</div>';return `<table class="wc-table"><thead><tr><th>물약</th><th>효과</th><th>제조일</th><th></th></tr></thead><tbody>${cups.map(c=>`<tr><td><div class="wc-matname">${esc(c.customName||'조제 물약')}</div><div class="wc-muted">${esc(c.id)}</div></td><td>${(c.effects||[]).map(e=>`<span class="wc-chip">${esc(effectText(e.property,e.units))}</span>`).join(' ')||'효과 없음'}</td><td>Day ${c.day??'-'}</td><td><div class="wc-actions"><button class="wc-btn" data-cup-copy="${esc(c.id)}">복제</button><button class="wc-btn red" data-cup-delete="${esc(c.id)}">삭제</button></div></td></tr>`).join('')}</tbody></table>`}
  function alchemySubtabs(){return `<div class="wc-subtabs">${[['materials','재고'],['potions','물약'],['knowledge','지식']].map(([id,l])=>`<button type="button" class="wc-subtab ${alchemyView===id?'active':''}" data-alchemy-view="${id}">${l}</button>`).join('')}</div>`}
  function renderAlchemy(s){const used=usedCapacity(s),cap=officialCapacity(s),effective=globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__?'∞':cap;let content='';if(alchemyView==='materials'){content=`<div class="wc-grid">
      ${card('보관 현황',`<div class="wc-card-note"><b>${used}</b> / 공식 ${cap} · 실효 ${effective}</div>${switchHtml('infiniteStorage','무한 보관 공간','보관 공간이 가득 차도 재료와 물약을 더 놓을 수 있습니다. 공식 시설은 그대로 유지됩니다.',!!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__)}${storageControls(s)}`)}
      ${card('재료 일괄 설정',`<div class="wc-card-note">모든 채집·사냥 재료를 지정한 개수로 맞춥니다. 정상 보관 한도를 넘으면 무한 보관이 꺼진 상태에서는 실행하지 않습니다.</div><div class="wc-actions"><input class="wc-num" style="width:5rem" type="number" min="0" max="99" value="${materialBulk}" data-bulk-material><button class="wc-btn" data-bulk-set="1">각 1</button><button class="wc-btn" data-bulk-set="3">각 3</button><button class="wc-btn" data-bulk-set="5">각 5</button><button class="wc-btn" data-bulk-set="10">각 10</button><button class="wc-btn gold" data-bulk-run>적용</button></div><div class="wc-brew-section"><h3>물약 제조</h3>${brewControls()}</div>`,'각 10개는 재료 수에 따라 정상 최대 보관량을 크게 초과할 수 있습니다.')}
      <section class="wc-card wc-span2"><div class="wc-card-title"><span>재료 재고</span><span class="wc-chip">${ingredientCatalog().length}종</span></div><div class="wc-material-toolbar"><input class="wc-text" type="search" value="${esc(alchemySearch)}" placeholder="재료 이름 검색" data-alchemy-search>${[['all','전체'],['forage','채집'],['hunt','사냥'],['owned','보유중']].map(([v,l])=>`<button class="wc-filter ${alchemyFilter===v?'active':''}" data-alchemy-filter="${v}">${l}</button>`).join('')}</div><div data-material-scroll style="overflow:auto;max-height:31rem"><table class="wc-table wc-material-table"><thead><tr><th>재료</th><th>재고</th><th>알려진 효능</th><th>지식 조작</th></tr></thead><tbody data-material-rows>${materialRows(s)}</tbody></table></div></section>
    </div>`}else if(alchemyView==='potions'){const presetCards=PRESETS.map(p=>card(esc(p.name),`<div class="wc-preset"><div class="tag">${esc(p.tag)}</div><p>${esc(p.desc)}</p><div class="wc-effects">${p.effects.map(([id,u])=>`<span class="wc-chip ${p.id==='succubus_elixir'?'ntr':''}">${esc(effectText(id,u))}</span>`).join('')}${(p.extra||[]).map(([l,d])=>`<span class="wc-chip ${p.id==='succubus_elixir'?'ntr':'changed'}">${esc(l)} ${d>0?'+':''}${d}</span>`).join('')}</div><div class="wc-actions wc-preset-actions"><button type="button" class="wc-btn ${p.id==='succubus_elixir'?'ntr':'gold'}" data-preset="${p.id}">+ 1병</button><button type="button" class="wc-btn" data-preset3="${p.id}">+ 3병</button></div></div>`,'','wc-preset-card')).join('');content=`<div class="wc-grid">${card('물약 제조',brewControls(),'','wc-span2')}<div class="wc-span2"><div class="wc-page-title" style="margin:.05rem 0 .55rem"><div><h2 style="font-size:.9rem">특제 물약</h2><p>구매자의 능력을 끌어올리는 비약, 그녀의 경계를 무너뜨리는 엘릭서, 정화용 성수, 마법 학습용 비약으로 용도를 나눴습니다. 장기 효과는 대체로 하루 안팎 지속됩니다.</p></div></div><div class="wc-grid three">${presetCards}</div></div><section class="wc-card wc-span2"><div class="wc-card-title"><span>보유 물약</span><span class="wc-chip">${(stillroom(s).cups||[]).length}병</span></div>${potionList(s)}<div class="wc-actions" style="margin-top:.65rem">${action('오늘 반복 복용 감쇠 초기화','reset-doses')}</div></section></div>`}else{if(alchemyFilter!=='unknown'&&alchemyFilter!=='all'&&alchemyFilter!=='forage'&&alchemyFilter!=='hunt')alchemyFilter='all';content=`<section class="wc-card"><div class="wc-card-title"><span>효능 지식</span><span class="wc-chip">연구와 거래로 얻는 지식</span></div><div class="wc-card-note">재료별로 효능 하나만 밝혀 진행감을 유지하거나, 필요한 재료만 전부 알아낼 수 있습니다.</div><div class="wc-material-toolbar"><input class="wc-text" type="search" value="${esc(alchemySearch)}" placeholder="재료 이름 검색" data-alchemy-search>${[['all','전체'],['forage','채집'],['hunt','사냥'],['unknown','효능 미확인']].map(([v,l])=>`<button class="wc-filter ${alchemyFilter===v?'active':''}" data-alchemy-filter="${v}">${l}</button>`).join('')}<button class="wc-btn gold" data-reveal-all>모든 효능 공개</button></div><div data-material-scroll style="overflow:auto;max-height:38rem"><table class="wc-table wc-material-table"><thead><tr><th>재료</th><th>재고</th><th>알려진 효능</th><th>지식 조작</th></tr></thead><tbody data-material-rows>${materialRows(s)}</tbody></table></div></section>`}return pageTitle('재료 · 조제','채집·사냥 재료, 완성 물약, 효능 지식을 각각 필요한 만큼 조정합니다.')+alchemySubtabs()+content}


  const SPELL_LABELS={assay_purse:'주머니 감정',strengthen:'강화',weaken:'약화',sway_affinity:'성향 흔들기',kindle_quell:'흥분 점화/진정',heartsight:'마음의 눈'};
  function renderMagic(s){const m=s.player?.magic||{};const spells=m.spells||{};let spellRows='';for(const id of [...new Set([...Object.keys(SPELL_LABELS),...Object.keys(spells)])])spellRows+=customField('spell:'+id,SPELL_LABELS[id]||id,Number(spells[id]?.proficiency??0),0,100,1);return pageTitle('마법','마나와 주문 숙련도, 시전 안정성과 위험을 조정합니다.')+`<div class="wc-grid">
    ${card('마법 기반',pathField(s,'이해도',['player','magic','understanding'],0,100,1,'모든 주문에 공통으로 쓰이는 이론 이해입니다. 주문의 기본 위력 계산에서 40%를 차지하고, 시전 안정성 계산에서는 이해도가 60% 비중으로 들어갑니다. 낮을수록 같은 주문 숙련도라도 불완전 시전·과부하·빗나감·역류가 늘어납니다.')+pathField(s,'동조율',['player','magic','attunement'],0,100,1,'마법과 몸의 적응도입니다. 주문의 기본 위력 계산에서 35%를 차지하며, 시전 안정성에서는 해당 주문 숙련도와 절반씩 합쳐 제어력을 만듭니다. 동조율이 높을수록 최대 마나도 30에서 최대 100까지 증가합니다.')+pathField(s,'마나',['player','magic','mana','current'],0,100,1,'주문에 소비되는 비축 마력입니다. 최대치는 동조율에 따라 약 30~100 사이로 늘어납니다. 무한 마나를 켜면 표시값은 그대로 두고 시전 판정에서 항상 현재 최대치만큼 있는 것으로 취급합니다.')+pathField(s,'오늘 학습/수련 횟수',['player','magic','sessionsToday'],0,99,1,'같은 날 공부나 수련을 몇 번 했는지 기록합니다. 이 횟수는 반복 학습의 기력 소모 계산에 쓰이며, 하루가 바뀌면 다시 시작됩니다.')+`<div class="wc-actions">${action('마도서 발견','find-grimoire')}${action('마나 FULL','mana-full')}</div>`)}
    ${card('위험 제어',switchHtml('infiniteMana','무한 마나','주문을 써도 마나 부족으로 막히지 않습니다. 현재 마나 표시는 유지되며, 시전할 때는 동조율에 따른 최대 마나가 가득 찬 것으로 판정합니다.',!!globalThis.__CHEAT_LEDGER_INFINITE_MANA__)+selectHtml('magicOutcome','시전 결과',globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__,MAGIC_OUTCOMES,'선택한 결과를 모든 시전에 적용합니다. 본래 판정은 이해도·제어력과 주문 강도, 대상의 불안정성 등을 이용한 원래 확률 계산을 그대로 사용합니다.')+switchHtml('safeSlip','몰래 물약 타기 발각 없음','그녀의 잔에 물약을 몰래 섞었을 때 발각 확률을 0%로 만듭니다. 물약 자체의 효과와 복용 여부는 정상적으로 처리됩니다.',!!globalThis.__CHEAT_LEDGER_SAFE_SLIP__))}
    ${card('주문 숙련도',spellRows,'해당 주문의 숙련도는 위력 계산의 25%를 차지하고, 동조율과 함께 시전 제어력을 구성해 안정성에도 관여합니다.','wc-span2')}
  </div>`}

  function personIndex(s){const ps=s.circles?.[s.primaryCharacterId]?.persons||[];if(!ps.length)return -1;if(!selectedPersonId||!ps.some(p=>p.id===selectedPersonId))selectedPersonId=ps[0].id;return ps.findIndex(p=>p.id===selectedPersonId)}
  function patronFavorites(s){const names=ledgerData(s).patronFavorites;return new Set(Array.isArray(names)?names.filter(n=>typeof n==='string'):[])}
  function togglePatronFavorite(){const name=selectedPatronName;if(!name)return;commit('손님 즐겨찾기 변경',s=>{const favorites=patronFavorites(s);favorites.has(name)?favorites.delete(name):favorites.add(name);return {...s,[LEDGER_STATE_KEY]:{...ledgerData(s),patronFavorites:[...favorites]}}});render()}
  function patronFavoriteButton(s){const on=patronFavorites(s).has(selectedPatronName);return `<button class="wc-patron-favorite ${on?'is-favorite':''}" type="button" data-patron-favorite aria-pressed="${on}" aria-label="${esc(selectedPatronName)} 즐겨찾기 ${on?'해제':'추가'}" title="즐겨찾기 ${on?'해제':'추가'}">${on?'★':'☆'}</button>`}
  function patronNames(s){const favorites=patronFavorites(s);return [...new Set([...(s.patronRecords||[]).map(p=>p?.name),...(s.customers||[]).map(p=>p?.name)].filter(Boolean))].sort((a,b)=>Number(favorites.has(b))-Number(favorites.has(a))||String(a).localeCompare(String(b),'ko'))}
  function patronRecord(s,name){return (s.patronRecords||[]).find(p=>p?.name===name)||(s.customers||[]).find(p=>p?.name===name)||null}
  const PATRON_TYPES=[['regular','일반 손님 / regular'],['charmer','매력적인 손님 / charmer'],['drunk_bold','대담한 술꾼 / drunk_bold'],['rogue','불량배 / rogue'],['nobleman','귀족 / nobleman'],['wealthy_pervert','부유한 호색한 / wealthy_pervert']];
  const PATRON_NAME_FIELDS=new Set(['customerName','patronName','recentPatronName','patronAName','patronBName','askerName','requesterName','focusPartnerName','withName','himName']);
  const PATRON_NAME_MAPS=new Set(['byPatron','renterHistory','patronChemistryEffects','patronTypeOverrides']);
  function isProtectedPatron(s,name){const p=patronRecord(s,name);return !!p&&(typeof koCollector170==='function'&&koCollector170(p))}
  function remapPatronName(value,oldName,newName,key=''){
    if(value===null||typeof value!=='object'){
      return typeof value==='string'&&value===oldName&&(PATRON_NAME_FIELDS.has(key)||['namedPatronNames','patronNameHints','crowdNames','facesTonightNames','patronFavorites'].includes(key))?newName:value
    }
    if(Array.isArray(value)){let changed=false;const out=value.map(v=>{const next=remapPatronName(v,oldName,newName,key);changed ||= next!==v;return next});return changed?out:value}
    let changed=false;const out={};
    for(const [field,v] of Object.entries(value)){
      const renamedKey=PATRON_NAME_MAPS.has(key)&&field===oldName?newName:field;
      if(renamedKey!==field&&Object.hasOwn(value,newName))throw Error('새 이름에 연결된 기존 관계 기록이 있습니다. 다른 이름을 사용하세요.');
      let next=v;
      if(field==='id'&&v===oldName&&value.kind==='patron')next=newName;
      else if(field==='name'&&v===oldName&&(key==='customers'||key==='patronRecords'||key==='tonightRenter'||key==='tonightRenter2'||value.patronType||value.isResident||value.customerId))next=newName;
      else if(field!=='log')next=remapPatronName(v,oldName,newName,key==='namedPatronNames'||key==='patronNameHints'?key:key==='facesTonight'&&field==='names'?'facesTonightNames':field);
      out[renamedKey]=next;changed ||= renamedKey!==field||next!==v;
    }
    return changed?out:value
  }
  function editPatronIdentity(state,oldName,newName,type){
    newName=String(newName??'').trim();
    if(!patronRecord(state,oldName))throw Error('손님 기록을 찾지 못했습니다.');
    if(isProtectedPatron(state,oldName))throw Error('수금원은 이름과 유형을 편집할 수 없습니다.');
    if(['__proto__','constructor','prototype'].includes(newName))throw Error('다른 이름을 사용하세요.');
    if(!newName||newName.length>80||/[\u0000-\u001f\u007f]/.test(newName))throw Error('이름은 공백만으로 입력할 수 없으며 80자 이내여야 합니다.');
    if(!PATRON_TYPES.some(([id])=>id===type))throw Error('올바른 손님 유형을 선택하세요.');
    if(newName!==oldName){
      const folded=newName.toLocaleLowerCase();
      if(patronNames(state).some(n=>n!==oldName&&n.toLocaleLowerCase()===folded)||newName==='수금원'||newName==='The Collector')throw Error('이미 사용 중인 손님 이름입니다. 다른 이름을 사용하세요.');
      const reserved=typeof Fc!=='undefined'?Fc.find(p=>p.name===newName||state.namedPatronNames?.[p.id]===newName):null;
      const named=typeof kh==='function'?kh(oldName,state.namedPatronNames):null;
      if(reserved&&reserved.id!==named?.id)throw Error('다른 고정 손님이 사용하는 이름입니다.');
    }
    const oldRecord=patronRecord(state,oldName),named=typeof kh==='function'?kh(oldName,state.namedPatronNames):null;
    let next=newName===oldName?state:remapPatronName(state,oldName,newName);
    if(named&&newName!==oldName)next={...next,namedPatronNames:{...(next.namedPatronNames||{}),[named.id]:newName}};
    if(type!==oldRecord.patronType){
      const change=p=>p?.name===newName?{...p,patronType:type}:p;
      next={...next,patronRecords:(next.patronRecords||[]).map(change),customers:(next.customers||[]).map(change)};
      const mod=ledgerData(next);next={...next,[LEDGER_STATE_KEY]:{...mod,patronTypeOverrides:{...(mod.patronTypeOverrides||{}),[newName]:type}}};
    }
    return next
  }
  function patronIdentityCard(s,p){const locked=isProtectedPatron(s,selectedPatronName);return card('이름 · 손님 유형',`<label class="wc-label" for="wc-patron-edit-name">이름</label><input id="wc-patron-edit-name" class="wc-text" type="text" maxlength="80" value="${esc(selectedPatronName)}" data-patron-edit-name ${locked?'disabled':''}><label class="wc-label" for="wc-patron-edit-type">손님 유형</label><select id="wc-patron-edit-type" class="wc-select" data-patron-edit-type ${locked?'disabled':''}>${PATRON_TYPES.map(([id,label])=>`<option value="${id}" ${p.patronType===id?'selected':''}>${label}</option>`).join('')}</select><p class="wc-inline-note">${locked?'수금원은 고유 사건과 연결되어 편집할 수 없습니다.':'이름과 유형을 현재 손님 및 재방문 기록에 함께 적용합니다. 능력치·접근 방식은 각 항목에서 조정할 수 있습니다.'}</p><div class="wc-actions"><button type="button" class="wc-btn gold" data-patron-edit-apply ${locked?'disabled':''}>이름·유형 적용</button></div>`,'','wc-span2')}
  function renderRelations(s){const w=wifeOf(s);let content='';if(relationView==='people'){const circle=s.circles?.[s.primaryCharacterId],ps=circle?.persons||[];if(!ps.length)content='<div class="wc-empty">이 세이브에는 가족·친구 관계망이 아직 없습니다.</div>';else{const i=personIndex(s),p=ps[i],belief=p?.belief||{};content=`<div class="wc-rel-layout"><aside class="wc-picker"><div class="wc-card-title"><span>가족 · 친구</span></div><select class="wc-select" data-person-select>${ps.map(x=>`<option value="${esc(x.id)}" ${x.id===p.id?'selected':''}>${esc(x.name)} · ${esc(x.past||x.lives||'')}</option>`).join('')}</select><div class="wc-inline-note">한 사람씩 선택해 성격과 소문 인지 상태를 조정합니다.</div></aside><section class="wc-rel-detail wc-card"><div class="wc-rel-head"><div><div class="wc-rel-name">${esc(p.name)}</div><div class="wc-rel-meta">${esc(p.sex==='f'?'여성':'남성')} · ${esc(p.lives||'')} · ${esc(p.past||'')}</div></div><span class="wc-chip ${p.alive?'good':''}">${p.alive?'생존':'사망'}</span></div>${customField('rel:'+i+':warmth','호감 / Warmth',p.warmth??0,0,1,.01,'그녀에게 얼마나 따뜻하고 호의적인 사람인지 나타냅니다.')+customField('rel:'+i+':strictness','엄격함 / Strictness',p.strictness??0,0,1,.01,'소문이나 행동을 얼마나 엄격한 기준으로 바라보는지 나타냅니다.')+customField('rel:'+i+':presence','개입도 / Presence',p.presence??0,0,1,.01,'가족·친구로서 그녀의 삶에 얼마나 자주 관여하는지 나타냅니다.')+customField('rel:'+i+':regard','평가 / Regard',p.regard??0,-1,1,.01,'현재 그녀와 집안을 좋게 보는지 나쁘게 보는지에 가까운 평가입니다.')+selectHtml('rel-belief:'+i,'알고 있는 내용',belief.rung||'nothing',Object.entries(BELIEF_LABELS),'소문이 어느 단계까지 구체화되었는지 나타냅니다. 집에 관한 막연한 소문 → 그녀에 관한 소문 → 특정 사건 → 직접 목격 순으로 강해집니다.')+switchHtml('rel-knows:'+i,'당신의 태도를 안다고 여김','그 일이 당신의 허용·관여 아래 벌어졌다고 받아들이는지에 가깝습니다. 같은 소문이라도 이 판단에 따라 가족·친구가 상황을 보는 방식이 달라질 수 있습니다.',!!belief.thinksHeKnows)}</section></div>`}}else{const names=patronNames(s);if(!names.length)content='<div class="wc-empty">아직 기록된 손님이 없습니다.</div>';else{if(!selectedPatronName||!names.includes(selectedPatronName))selectedPatronName=names[0];const p=patronRecord(s,selectedPatronName)||{},attrs=p.attributes||{};content=`<div class="wc-rel-layout"><aside class="wc-picker wc-patron-sidebar"><div class="wc-card-title"><span>손님 찾기</span>${patronFavoriteButton(s)}</div><input class="wc-text" list="wc-patron-list" value="${esc(selectedPatronName)}" placeholder="이름 검색" data-patron-name><datalist id="wc-patron-list">${names.map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist><select class="wc-select" data-patron-select>${names.map(n=>`<option value="${esc(n)}" ${n===selectedPatronName?'selected':''}>${patronFavorites(s).has(n)?'★ ':''}${esc(n)}</option>`).join('')}</select><div class="wc-inline-note">손님이 많아져도 이름을 검색하거나 목록에서 바로 선택할 수 있습니다.</div>${card('이번 방문',selectHtml('patron-summon-intent','이번 방문 의도',patronSummonIntent,PATRON_SUMMON_INTENTS,'평소대로는 이 손님에게 저장된 의도와 접근 방식을 유지합니다. 다른 선택은 이번 방문에만 적용되고, 다음 방문의 기본 성향은 바꾸지 않습니다.')+`<div class="wc-inline-note">${patronIsPresent(s,selectedPatronName)?'현재 여관에 있습니다.':s.phase==='service'?'지금 불러오면 홀에 들어온 뒤 기존 행동 규칙에 따라 주문·대화·상호작용을 이어갑니다.':'현재는 영업시간이 아니므로 새로운 손님을 받을 수 없습니다.'}</div><div class="wc-actions"><button type="button" class="wc-btn gold" data-action="summon-patron">여관으로 부르기</button></div>`)}${card('방문 기록',customField('patron:visitCount','방문 횟수',p.visitCount??0,0,999,1)+customField('patron:totalTipped','총 팁',p.totalTipped??0,0,999999,1)+`<div class="wc-inline-note">최근 방문: Day ${esc(p.lastVisitDay??'-')} · 최고 진전 단계: ${esc(p.maxStageReached??'-')}</div>`)}</aside><div class="wc-rel-detail wc-grid">
        ${patronIdentityCard(s,p)}
        ${card(esc(selectedPatronName)+' · 관계',customField('patron:platonic','친밀감 / Platonic',p.platonic??0,-100,100,1,'그녀와 쌓인 비성적 친밀감과 우호 관계입니다.')+customField('patron:romantic','로맨스 / Romantic',p.romantic??0,-100,100,1,'감정적·연애적인 끌림의 정도입니다.','ntr')+customField('patron:sexual','성적 관계 / Sexual',p.sexual??0,-100,100,1,'성적 관계가 얼마나 진전되었는지를 나타냅니다.','ntr')+patronChemistryField(s,selectedPatronName))}
        ${card('접근 성향',customField('patron:boldness','대담함 / Boldness',p.boldness??0,0,100,1,'얼마나 빠르고 적극적으로 선을 넘으려 하는지 나타냅니다.','ntr')+customField('patron:charm','매력 / Charm',p.charm??0,0,100,1,'대화와 유혹에서 발휘하는 사회적 매력입니다.')+selectHtml('patron-intent','의도 / Intent',p.intent||'interested',PATRON_INTENTS)+selectHtml('patron-tactic','접근 방식 / Tactic',p.tacticStyle||'warm_builder',PATRON_TACTICS))}
        ${card('능력치',Object.entries(attrs).filter(([,v])=>Number.isFinite(Number(v))).map(([k,v])=>customField('patron-attr:'+k,ATTR_LABELS[k]||k,v,0,100,1)).join('')||'<div class="wc-empty">저장된 능력치가 없습니다.</div>','','wc-span2')}
      </div></div>`}}return pageTitle('인물 관계',`${esc(w?.name||'히로인')} 주변의 가족·친구와 손님 관계를 각각 관리합니다.`)+subtabs([['people','가족 · 친구'],['patrons','손님']],relationView,'relation-view')+content}

  function renderAdvanced(s){const auto=bool(LS.autoReview,true);const w=wifeOf(s);return pageTitle('고급','새 게임 최종 조정과 상태 정리처럼 자주 손대지 않는 기능을 모았습니다.')+`<div class="wc-grid">
    ${card('새 게임',switchHtml('autoReview','새 게임 최종 조정 화면','처음 성향을 정한 뒤 실제로 만들어진 능력치·취향·숙련도·숨은 성향을 한 번 더 확인하고 수정합니다.',auto))}
    ${card('상태 정리',`<div class="wc-actions">${action('취기·오늘 음주 0','reset-intox')}${action('마법 후유증 정리','reset-derangement')}${action('짜증 0','reset-annoyance')}${action('오늘 반복 복용 감쇠 초기화','reset-doses')}</div>`,'현재 '+esc(w?.name||'히로인')+'와 조제 기록에 존재하는 값만 정리합니다.')}
  </div>`}

  let renderedViewKey='';
  function render(){const s=current();if(!s||main.querySelector('[data-ime-composing]'))return;const viewKey=[activeTab,heroineView,alchemyView,relationView].join(':');const keepScroll=renderedViewKey===viewKey;const scroll={top:keepScroll?main.scrollTop:0,left:keepScroll?main.scrollLeft:0,nested:[...main.querySelectorAll('[data-material-scroll],.wc-boundary-wrap')].map(el=>({top:el.scrollTop,left:el.scrollLeft}))};renderedViewKey=viewKey;for(const b of sidebar.querySelectorAll('.wc-tab'))b.classList.toggle('active',b.dataset.tab===activeTab);main.innerHTML=activeTab==='quick'?renderQuick(s):activeTab==='player'?renderPlayer(s):activeTab==='heroine'?renderHeroine(s):activeTab==='tavern'?renderTavern(s):activeTab==='alchemy'?renderAlchemy(s):activeTab==='magic'?renderMagic(s):activeTab==='relations'?renderRelations(s):renderAdvanced(s);bindMain(s);updateNumericButtonTones();mountSectionHeader();overlay.querySelector('[data-status]').innerHTML=`Day ${s.day??'?'} · <span class="${globalThis.__CHEAT_LEDGER_INFINITE_MANA__||globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__||globalThis.__CHEAT_LEDGER_SAFE_SLIP__||globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__!=='normal'||['success','strong'].includes(globalThis.__CHEAT_LEDGER_BREW_OUTCOME__)?'wc-status-on':'wc-status-off'}">규칙 치트 ${globalThis.__CHEAT_LEDGER_INFINITE_MANA__||globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__||globalThis.__CHEAT_LEDGER_SAFE_SLIP__||globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__!=='normal'||['success','strong'].includes(globalThis.__CHEAT_LEDGER_BREW_OUTCOME__)?'활성':'꺼짐'}</span>`;updateHistoryFooter();main.scrollTop=scroll.top;main.scrollLeft=scroll.left;if(keepScroll)[...main.querySelectorAll('[data-material-scroll],.wc-boundary-wrap')].forEach((el,i)=>{const saved=scroll.nested[i];if(saved){el.scrollTop=saved.top;el.scrollLeft=saved.left}})}

  function mountSectionHeader(){if(!['heroine','alchemy','relations'].includes(activeTab))return;const title=main.querySelector(':scope > .wc-page-title'),tabs=main.querySelector(':scope > .wc-subtabs');if(!title||!tabs)return;const header=document.createElement('div');header.className='wc-section-header';main.prepend(header);header.append(title,tabs)}
  function searchEntriesFor(s){const out=[
    ['빠른 치트','quick','회복 퀵 슬롯 NTR 취약 방어 무한 마나 보관 몰래 물약'],['플레이어 · 능력치','player','플레이어 능력치 성격 숙련 기력 피로'],['히로인 · 상태와 관계','heroine','히로인 상태 관계 신뢰 원망 취기 흥분 이름','profile'],['히로인 · 능력치','heroine','능력치 정절 솔직함 개방성 자신감 성욕','profile'],['히로인 · 취향','heroine','취향 affinity 로맨스 구강 성관계 노출 금기','profile'],['히로인 · 숨은 성향','heroine','숨은 성향 보유 미공개 발견 trait','traits'],['히로인 · 정해진 선','heroine','경계 limits encouragement 금지 허용 확신','boundaries'],['선술집 · 경제와 평판','tavern','골드 부채 임대료 서비스 평판 악명 명성 청결 업그레이드'],['재료 · 조제','alchemy','재료 채집 사냥 부산물 효능 물약 보관'],['마법 · 이해도와 동조율','magic','마법 이해도 동조율 마나 숙련도 overload 과부하'],['인물 관계 · 가족 친구','relations','가족 친구 소문 알고 있는 내용'],['인물 관계 · 손님','relations','손님 케미스트리 로맨스 성적 관계 대담함 매력 소환 방문 의도 여관으로 부르기'],['고급','advanced','새 게임 최종 조정 상태 정리']
  ].map(([label,tab,keys,view])=>({label,tab,keys,view,focus:label}));for(const [k,l] of Object.entries(TRAIT_LABELS))out.push({label:`성향 · ${l}`,tab:'heroine',view:'traits',keys:`${k} ${l} 숨은 성향`,focus:l});for(const [k,l] of Object.entries(LIMIT_LABELS))out.push({label:`경계 · ${l}`,tab:'heroine',view:'boundaries',keys:`${k} ${l} 금지 허용 경계`,focus:l});for(const [k,l] of Object.entries(SKILL_LABELS))out.push({label:`숙련도 · ${l}`,tab:'heroine',view:'profile',keys:`${k} ${l} 숙련`,focus:l});for(const [k,l] of Object.entries(AFFINITY_LABELS))out.push({label:`취향 · ${l}`,tab:'heroine',view:'profile',keys:`${k} ${l} 취향 affinity`,focus:l});for(const [k,l] of Object.entries(ATTR_LABELS))out.push({label:`능력치 · ${l}`,tab:'heroine',view:'profile',keys:`${k} ${l} 능력치`,focus:l});for(const [k,l] of Object.entries(SPELL_LABELS||{}))out.push({label:`마법 · ${l}`,tab:'magic',keys:`${k} ${l} 주문 숙련도`,focus:l});for(const x of ingredientCatalog())out.push({label:`재료 · ${x.name}`,tab:'alchemy',view:'materials',keys:`${x.id} ${x.name} 재료`,focus:x.name});for(const p of PRESETS)out.push({label:`특제 물약 · ${p.name}`,tab:'alchemy',view:'potions',keys:`${p.id} ${p.name} 물약`,focus:p.name});for(const n of patronNames(s))out.push({label:`손님 · ${n}`,tab:'relations',view:'patrons',patron:n,keys:`${n} 손님 관계 케미스트리`,focus:n});return out}
  function closeSearchResults(){searchBox.hidden=true;searchResults=[];searchPick=-1}
  function renderSearchResults(){const q=(searchInput.value||'').trim().toLowerCase();if(!q){closeSearchResults();return}const s=current();searchResults=searchEntriesFor(s).map(x=>({...x,hay:(x.label+' '+x.keys).toLowerCase()})).filter(x=>x.hay.includes(q)).slice(0,12);searchPick=searchResults.length?0:-1;if(!searchResults.length){searchBox.innerHTML='<div class="wc-inline-note" style="padding:.55rem">일치하는 치트 기능이 없습니다.</div>';searchBox.hidden=false;return}searchBox.innerHTML=searchResults.map((x,i)=>`<button type="button" class="wc-search-hit ${i===searchPick?'sel':''}" data-search-hit="${i}"><span><b>${esc(x.label)}</b><small>${esc(x.keys)}</small></span><span class="where">${esc(tabs.find(t=>t[0]===x.tab)?.[2]||x.tab)}</span></button>`).join('');searchBox.hidden=false}
  function paintSearchPick(){for(const b of searchBox.querySelectorAll('[data-search-hit]'))b.classList.toggle('sel',Number(b.dataset.searchHit)===searchPick);const hit=searchBox.querySelector(`[data-search-hit="${searchPick}"]`);if(hit)hit.scrollIntoView({block:'nearest'})}
  function focusSearchTarget(term){const q=String(term||'').toLowerCase();let hit=[...main.querySelectorAll('[data-search]')].find(el=>(el.dataset.search||'').toLowerCase().includes(q));if(!hit)hit=[...main.querySelectorAll('[data-search]')].find(el=>(el.textContent||'').toLowerCase().includes(q));if(!hit)return;hit.scrollIntoView({block:'center',behavior:'smooth'});hit.classList.add('wc-search-flash');setTimeout(()=>hit.classList.remove('wc-search-flash'),1500)}
  function activateSearchResult(item){if(!item)return;activeTab=item.tab;if(item.tab==='heroine'&&item.view)heroineView=item.view;if(item.tab==='alchemy'&&item.view)alchemyView=item.view;if(item.tab==='relations'&&item.view)relationView=item.view;if(item.patron){selectedPatronName=item.patron;patronSummonIntent='normal'}const focus=item.focus||searchInput.value;searchInput.value='';closeSearchResults();render();requestAnimationFrame(()=>focusSearchTarget(focus))}

  function setQuick(s,id,val){let n=Number(val);switch(id){case'player-energy':return setPath(s,['player','stats','energy'],clamp(n,0,100));case'player-fatigue':return setPath(s,['player','fatigue'],clamp(n,0,100));case'player-mood':return setPath(s,['player','stats','mood'],clamp(n,0,100));case'wife-energy':return setPath(s,['characters',s.primaryCharacterId,'stats','energy'],clamp(n,0,100));case'wife-intox':return setPath(s,['characters',s.primaryCharacterId,'intoxication','level'],clamp(n,0,100));case'wife-arousal':return setPath(s,['characters',s.primaryCharacterId,'stats','arousal'],clamp(n,0,100));case'wife-mood':return setPath(s,['characters',s.primaryCharacterId,'stats','mood'],clamp(n,0,100));case'gold':return setPath(s,['economy','gold'],Math.max(0,n));case'clean':return setPath(s,['tavernCleanliness'],clamp(n,0,100));case'readyFood':return setPath(s,['readyFood'],Math.max(0,n));case'food':return setPath(s,['supplies','food'],Math.max(0,n));case'beer':return setPath(s,['supplies','beer'],Math.max(0,n));case'wine':return setPath(s,['supplies','wine'],Math.max(0,n));default:return s}}
  function quickValue(s,id){const w=wifeOf(s);return ({'player-energy':s.player?.stats?.energy,'player-fatigue':s.player?.fatigue,'player-mood':s.player?.stats?.mood,'wife-energy':w?.stats?.energy,'wife-intox':w?.intoxication?.level,'wife-arousal':w?.stats?.arousal,'wife-mood':w?.stats?.mood,gold:s.economy?.gold,clean:s.tavernCleanliness,readyFood:s.readyFood,food:s.supplies?.food,beer:s.supplies?.beer,wine:s.supplies?.wine})[id]??0}
  function setStepper(s,id,v){v=Math.max(0,Math.round(Number(v)||0));if(id==='readyFood')return setPath(s,['readyFood'],v);return setPath(s,['supplies',id],v)}
  function updatePatron(s,name,key,value,isAttr=false){const syncKeys=new Set(['boldness','charm','intent','tacticStyle','chemistry']);const records=(s.patronRecords||[]).map(p=>p?.name===name?(isAttr?{...p,attributes:{...(p.attributes||{}),[key]:value}}:{...p,[key]:value}):p);const customers=(s.customers||[]).map(p=>p?.name===name?(isAttr?{...p,attributes:{...(p.attributes||{}),[key]:value}}:syncKeys.has(key)?{...p,[key]:value}:p):p);return {...s,patronRecords:records,customers}}
function patronIsPresent(s,name){
  return (s.customers||[]).some(c=>c?.name===name&&!['gone','leaving'].includes(c.status))
}
function patronIntentLabel(id){
  return PATRON_SUMMON_INTENTS.find(x=>x[0]===id)?.[1]||id
}
function summonSelectedPatron(){
  const s=current(),name=selectedPatronName,record=patronRecord(s,name);
  if(!record){toast('소환할 손님 기록을 찾지 못했습니다.','warn');return}
  if(s.phase!=='service'){
    if(s.phase==='prep')toast('아직 여관 영업 전입니다.','warn');
    else if(s.phase==='last_call')toast('마감 주문이 끝났습니다. 새로운 손님은 받을 수 없습니다.','warn');
    else toast('지금은 여관이 영업 중이 아닙니다.','warn');
    return
  }
  if(typeof koCollector170==='function'&&koCollector170(record)){
    toast('수금원은 일반 손님처럼 불러올 수 없습니다.','warn');return
  }
  if(patronIsPresent(s,name)){toast(`${name}은(는) 이미 여관에 있습니다.`,'warn');return}
  const active=(s.customers||[]).filter(c=>c&&!['gone','leaving'].includes(c.status)).length;
  if(active>=Number(ENGINE.maxPatrons||8)){toast('홀에 손님이 너무 많아 더 받을 수 없습니다.','warn');return}
  const visitIntent=patronSummonIntent;
  commit(`${name} 방문`,state=>{
    const rec=patronRecord(state,name);
    if(!rec||patronIsPresent(state,name)||state.phase!=='service')return state;
    let customer=ENGINE.makeReturningCustomer(rec,state.slot,state);
    if(visitIntent!=='normal'){
      customer={...customer,intent:visitIntent,tacticStyle:ENGINE.chooseTactic(customer.patronType,visitIntent)}
    }
    let next=ENGINE.addCustomer(state,customer,'taproom');
    next=j(next,ENGINE.arrivalText(customer,rec,wifeOf(next)?.name||'그녀',next.slot));
    try{next=ENGINE.returningFlavor(next,customer)}catch(_){}
    try{next=ENGINE.syncPatronPresence(next)}catch(_){}
    return next
  });
  toast(`${name}을(를) 여관으로 불렀습니다${visitIntent==='normal'?'':` · ${patronIntentLabel(visitIntent)}`}.`,'good');
  patronSummonIntent='normal';
  render()
}

  function setCustom(s,id,v){v=Number(v)||0;if(id==='wife-resentment')return setResentment(s,v);if(id.startsWith('player-skill:')){const k=id.split(':')[1];return setPath(s,['player','skills',k],clamp(v,0,100))}if(id.startsWith('spell:')){const spell=id.slice(6),m=s.player?.magic||{},sp={...(m.spells||{})},cur=sp[spell]||{proficiency:0,casts:0};sp[spell]={...cur,proficiency:clamp(v,0,100)};return setPath(s,['player','magic'],{...m,spells:sp})}if(id.startsWith('rel:')){const [,i,key]=id.split(':');return setPath(s,['circles',s.primaryCharacterId,'persons',Number(i),key],v)}if(id.startsWith('hero-affinity:')){const k=id.slice('hero-affinity:'.length),w=wifeOf(s),info=affinityInfo(s,w,k),stored=clamp(v+info.sum,-2,2);return setPath(s,['characters',s.primaryCharacterId,'affinities',k],stored)}if(id==='patron-base-chemistry')return setPatronBaseChemistry(s,selectedPatronName,v);if(id.startsWith('patron-attr:'))return updatePatron(s,selectedPatronName,id.slice('patron-attr:'.length),v,true);if(id.startsWith('patron:'))return updatePatron(s,selectedPatronName,id.slice(7),v,false);return s}

  function toggleSwitch(id,on){switch(id){case'infiniteMana':globalThis.__CHEAT_LEDGER_INFINITE_MANA__=on;setBool(LS.infiniteMana,on);toast(`무한 마나 ${on?'ON':'OFF'}`,on?'good':'');break;case'infiniteStorage':globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__=on;setBool(LS.infiniteStorage,on);toast(`무한 보관 ${on?'ON':'OFF'}`,on?'good':'');break;case'safeSlip':globalThis.__CHEAT_LEDGER_SAFE_SLIP__=on;setBool(LS.safeSlip,on);toast(`몰래 물약 타기 발각 없음 ${on?'ON':'OFF'}`,on?'good':'');break;case'autoReview':setBool(LS.autoReview,on);toast(`새 게임 최종 조정 ${on?'ON':'OFF'}`);break;default:if(id.startsWith('rel-knows:')){const i=Number(id.split(':')[1]);commit('관계 인식 상태',s=>setPath(s,['circles',s.primaryCharacterId,'persons',i,'belief','thinksHeKnows'],on))}}
  }
  function doAction(act){const s=current();if(!s)return;switch(act){case'summon-patron':summonSelectedPatron();break;case'go-alchemy':activeTab='alchemy';render();break;case'apply-heroine-name':{const input=main.querySelector('[data-heroine-name]'),name=String(input?.value||'').trim();if(!name){toast('이름을 입력하세요.','warn');break}commit('히로인 이름 변경',x=>setPath(x,['characters',x.primaryCharacterId,'name'],name));toast(`${name}(으)로 이름을 바꿨습니다.`,'good');break}case'quick-player-recover':commit('플레이어 전체회복',x=>{let n=setPath(x,['player','stats','energy'],100);n=setPath(n,['player','fatigue'],0);const m=n.player?.magic;if(m){let max=100;try{max=typeof rs==='function'?rs(m):100}catch(_){}n=setPath(n,['player','magic','mana','current'],max)}return n});break;case'quick-wife-recover':commit('히로인 회복',x=>{let n=setPath(x,['characters',x.primaryCharacterId,'stats','energy'],100),w=wifeOf(n);if(w&&w.fatigue!=null)n=setPath(n,['characters',x.primaryCharacterId,'fatigue'],0);return n});break;case'quick-tavern-tidy':commit('여관 정리',x=>{let n=setPath(x,['tavernCleanliness'],100);if((n.readyFood||0)<=0)n=setPath(n,['readyFood'],3);for(const k of ['beer','wine'])if((n.supplies?.[k]||0)<=0)n=setPath(n,['supplies',k],3);return n});break;case'quick-wife-vulnerable':commit('히로인 NTR 취약',x=>{let n=setPath(x,['characters',x.primaryCharacterId,'intoxication','level'],52);n=setPath(n,['characters',x.primaryCharacterId,'intoxication','peakToday'],Math.max(Number(wifeOf(x)?.intoxication?.peakToday||0),52));n=setPath(n,['characters',x.primaryCharacterId,'intoxication','drinksToday'],Math.max(Number(wifeOf(x)?.intoxication?.drinksToday||0),3));n=setPath(n,['characters',x.primaryCharacterId,'stats','arousal'],80);return n});break;case'quick-wife-defense':commit('히로인 NTR 방어',x=>{const w=wifeOf(x);let n=setPath(x,['characters',x.primaryCharacterId,'intoxication','level'],0);n=setPath(n,['characters',x.primaryCharacterId,'intoxication','drinksToday'],0);n=setPath(n,['characters',x.primaryCharacterId,'stats','arousal'],0);n=setPath(n,['characters',x.primaryCharacterId,'stats','mood'],Math.max(Number(w?.stats?.mood||0),80));return n});break;case'both-energy':commit('둘 다 기력 FULL',x=>setPath(setPath(x,['player','stats','energy'],100),['characters',x.primaryCharacterId,'stats','energy'],100));break;case'wife-sober':commit('히로인 취기 0',x=>setPath(x,['characters',x.primaryCharacterId,'intoxication','level'],0));break;case'wife-calm':commit('히로인 흥분 0',x=>setPath(x,['characters',x.primaryCharacterId,'stats','arousal'],0));break;case'mana-full':commit('마나 FULL',x=>{const m=x.player?.magic;if(!m)return x;let max=100;try{max=typeof rs==='function'?rs(m):100}catch(_){}return setPath(x,['player','magic','mana','current'],max)});break;case'clean-full':commit('청결 100',x=>setPath(x,['tavernCleanliness'],100));break;case'stock-plus10':commit('준비 음식·식량·맥주·와인 +10',x=>{let n=setPath(x,['readyFood'],(x.readyFood||0)+10);for(const k of ['food','beer','wine'])n=setPath(n,['supplies',k],(n.supplies?.[k]||0)+10);return n});break;case'stock-50':commit('준비 음식·식량·맥주·와인 50',x=>{let n=setPath(x,['readyFood'],50);for(const k of ['food','beer','wine'])n=setPath(n,['supplies',k],50);return n});break;case'all-storage':commit('보관 시설 모두 설치',x=>{const sr=stillroom(x),ids=['kitchen_shelves','drying_rack','larder'],storage=[...new Set([...(sr.storage||[]),...ids])];return {...x,stillroom:{...sr,storage}}});break;case'find-grimoire':commit('마도서 발견',x=>{const m=x.player?.magic||{grimoireFound:false,understanding:0,attunement:0,mana:{current:0},spells:{},sessionsToday:0};return setPath(x,['player','magic'],{...m,grimoireFound:true})});break;case'reset-doses':commit('오늘 반복 복용 감쇠 초기화',x=>{const sr=stillroom(x);return {...x,stillroom:{...sr,dosesToday:{}}}});break;case'reset-intox':commit('히로인 음주 상태 초기화',x=>{let n=setPath(x,['characters',x.primaryCharacterId,'intoxication','level'],0);n=setPath(n,['characters',x.primaryCharacterId,'intoxication','drinksToday'],0);n=setPath(n,['characters',x.primaryCharacterId,'intoxication','peakToday'],0);return n});break;case'reset-annoyance':commit('히로인 짜증 0',x=>setPath(x,['characters',x.primaryCharacterId,'annoyance'],0));break;case'clear-limits':commit('모든 금지 신호 0',x=>{let n=x;for(const id of limitIds())n=setLatitudeValue(n,id,'restriction',0);return n});break;case'reset-boundaries':commit('모든 경계 정보 초기화',x=>{let n=x;for(const id of limitIds())for(const k of ['restriction','restrictionClarity','encouragement','encouragementClarity'])n=setLatitudeValue(n,id,k,0);return n});break;case'max-encouragement':commit('모든 허용 신호·확신 100',x=>{let n=x;for(const id of limitIds()){n=setLatitudeValue(n,id,'encouragement',100);n=setLatitudeValue(n,id,'encouragementClarity',100)}return n});break;case'go-knowledge':alchemyView='knowledge';render();break;case'reset-derangement':commit('마법 후유증 정리',x=>{let n=x;const w=wifeOf(x);for(const k of ['derangement','derangementPeak','identityStrain','mindBreaks'])if(w&&w[k]!=null)n=setPath(n,['characters',x.primaryCharacterId,k],0);if(w&&w.hollowed!=null)n=setPath(n,['characters',x.primaryCharacterId,'hollowed'],false);return n});break;case'undo':undo();break;case'redo':redo();break}}
  function installTavernUpgrade(id){commit('선술집 시설 설치',s=>{const t={...(s.tavern||{})};if(id==='room1'){if(t.hasRoom)return s;t.hasRoom=true;t.roomListing=t.roomListing||'discreet';t.tonightRenter=void 0}else if(id==='room2'){if(t.hasRoom2)return s;t.hasRoom=true;t.hasRoom2=true;t.roomListing=t.roomListing||'discreet';t.quality=Math.min(100,Number(t.quality??70)+12)}else if(id==='bathhouse'){if(t.hasBathhouse)return s;t.hasBathhouse=true}else if(id==='interior'){const q=new Set(t.qualityUpgrades||[]);if(q.has('upgrade_interior'))return s;q.add('upgrade_interior');t.qualityUpgrades=[...q];t.quality=Math.min(100,Number(t.quality??70)+30)}else if(id==='backroom'){if(t.backRoomReady)return s;t.backRoomReady=true}else return s;return {...s,tavern:t}})}

  function addPreset(id,count=1){const p=PRESETS.find(x=>x.id===id),s=current();if(!p||!s)return;const used=usedCapacity(s),cap=officialCapacity(s);if(!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__&&used+count>cap){toast(`보관공간 부족: ${used+count}/${cap}. 무한 보관을 켜거나 공간을 비우세요.`,'warn');return}commit(`${p.name} ${count}병 추가`,x=>{const sr=stillroom(x),cups=[...(sr.cups||[])];for(let i=0;i<count;i++)cups.push({id:`cheat-${p.id}-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,customName:p.name,cheatPreset:p.id,presetDurationSlots:p.durationSlots||1440,effects:p.effects.map(([property,units])=>({property,units})),from:[],day:x.day??0});return {...x,stillroom:{...sr,cups}}});toast(`${p.name} ${count}병을 재고에 추가했습니다.`,'good')}
  function setMaterial(id,val){const s=current(),sr=stillroom(s),old=Number(sr.ingredients?.[id]??0),next=Math.max(0,Math.round(Number(val)||0)),delta=next-old,cap=officialCapacity(s),used=usedCapacity(s);if(delta>0&&!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__&&used+delta>cap){toast(`보관공간 부족: 예상 ${used+delta}/${cap}`,'warn');render();return}commit(`${id} 재고 ${next}`,x=>{const r=stillroom(x),ingredients={...(r.ingredients||{})};if(next<=0)delete ingredients[id];else ingredients[id]=next;return {...x,stillroom:{...r,ingredients}}})}
  function bulkMaterials(n){n=Math.max(0,Math.round(Number(n)||0));const s=current(),items=ingredientCatalog(),sr=stillroom(s),currentMat=items.reduce((a,x)=>a+(Number(sr.ingredients?.[x.id]??0)),0),other=usedCapacity(s)-currentMat,projected=other+items.length*n,cap=officialCapacity(s);if(!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__&&projected>cap){toast(`실행 취소: 예상 보관량 ${projected}/${cap}. 무한 보관을 켜거나 수량을 낮추세요.`,'warn');return}commit(`모든 재료 각 ${n}개`,x=>{const r=stillroom(x),ingredients={...(r.ingredients||{})};for(const it of items){if(n<=0)delete ingredients[it.id];else ingredients[it.id]=n}return {...x,stillroom:{...r,ingredients}}});toast(`모든 재료를 각 ${n}개로 맞췄습니다.`,'good')}
  function discoverOne(id){commit(`${id} 효능 하나 발견`,s=>{const sr=stillroom(s),mat=ingredientCatalog().find(x=>x.id===id);if(!mat)return s;const known=[...(sr.known?.[id]||[])],next=(mat.properties||[]).find(p=>!known.includes(p));if(!next)return s;return {...s,stillroom:{...sr,known:{...(sr.known||{}),[id]:[...known,next]}}}})}
  function discoverAll(id){commit(`${id} 효능 전부 공개`,s=>{const sr=stillroom(s),mat=ingredientCatalog().find(x=>x.id===id);if(!mat)return s;return {...s,stillroom:{...sr,known:{...(sr.known||{}),[id]:[...(mat.properties||[])]}}}})}
  function revealAll(){commit('모든 재료 효능 공개',s=>{const sr=stillroom(s),known={...(sr.known||{})};for(const m of ingredientCatalog())if(m.properties?.length)known[m.id]=[...m.properties];return {...s,stillroom:{...sr,known}}});toast('모든 재료의 효능을 공개했습니다.','good')}

  function bindMaterialRows(host){for(const b of host.querySelectorAll('[data-mat-step]'))b.addEventListener('click',()=>{const id=b.dataset.matStep,inp=main.querySelector(`[data-material="${CSS.escape(id)}"]`);setMaterial(id,(Number(inp?.value)||0)+Number(b.dataset.delta||0))});for(const inp of host.querySelectorAll('[data-material]'))inp.addEventListener('change',()=>setMaterial(inp.dataset.material,inp.value));for(const b of host.querySelectorAll('[data-discover-one]'))b.addEventListener('click',()=>discoverOne(b.dataset.discoverOne));for(const b of host.querySelectorAll('[data-discover-all]'))b.addEventListener('click',()=>discoverAll(b.dataset.discoverAll));}
  function refreshMaterialRows(){const rows=main.querySelector('[data-material-rows]');if(!rows)return;rows.innerHTML=materialRows(current());bindMaterialRows(rows);updateNumericButtonTones()}
  function bindPatronIdentity(){const button=main.querySelector('[data-patron-edit-apply]'),name=main.querySelector('[data-patron-edit-name]'),type=main.querySelector('[data-patron-edit-type]');if(!button||!name||!type)return;name.addEventListener('compositionstart',()=>{name.dataset.imeComposing='1'});name.addEventListener('compositionend',()=>{delete name.dataset.imeComposing});const apply=()=>{if(name.dataset.imeComposing)return;const oldName=selectedPatronName;let next;try{next=editPatronIdentity(current(),oldName,name.value,type.value)}catch(e){toast(e.message,'warn');return}if(next===current()){toast('변경된 내용이 없습니다.');return}const newName=name.value.trim();commit('손님 이름·유형 변경',()=>next);selectedPatronName=newName;render();toast('손님 이름과 유형을 적용했습니다.','good')};button.addEventListener('click',apply);name.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!name.dataset.imeComposing){e.preventDefault();apply()}})}
  function updateNumericButtonTones(){
    for(const b of main.querySelectorAll('[data-quick-set],[data-number-path],[data-delta],[data-bulk-set],[data-preset],[data-preset3],[data-cup-copy],[data-cup-delete]')){
      let tone='increase';const d=b.dataset;
      if(b.textContent.trim().toUpperCase()==='FULL')tone='full';
      else if(d.delta!==undefined)tone=Number(d.delta)<0?'decrease':'increase';
      else if(d.cupDelete!==undefined)tone='decrease';
      else if(d.quickSet!==undefined){const n=main.querySelector('[data-quick="'+CSS.escape(d.quickSet)+'"]'),v=Number(d.value);tone=v===0||(!String(d.value).startsWith('+')&&v<Number(n?.value||0))?'decrease':'increase'}
      else if(d.numberPath!==undefined){const n=main.querySelector('[data-path="'+CSS.escape(d.numberPath)+'"]'),v=Number(d.numberValue);tone=d.numberOp==='add'?(v<0?'decrease':'increase'):(v===0||v<Number(n?.value||0)?'decrease':'increase')}
      b.dataset.numberTone=tone
    }
  }
  function bindMain(){bindPatronIdentity();const favorite=main.querySelector('[data-patron-favorite]');if(favorite)favorite.addEventListener('click',togglePatronFavorite);for(const b of main.querySelectorAll('[data-storage-install]'))b.addEventListener('click',()=>installStorageFacility(b.dataset.storageInstall));for(const b of main.querySelectorAll('[data-heroine-view]'))b.addEventListener('click',()=>{heroineView=b.dataset.heroineView;render()});for(const b of main.querySelectorAll('[data-relation-view]'))b.addEventListener('click',()=>{relationView=b.dataset.relationView;render()});for(const b of main.querySelectorAll('[data-alchemy-view]'))b.addEventListener('click',()=>{alchemyView=b.dataset.alchemyView;alchemySearch='';alchemyFilter='all';render()});for(const el of main.querySelectorAll('[data-latitude]'))el.addEventListener('change',()=>commit(`${LIMIT_LABELS[el.dataset.latitude]||el.dataset.latitude} ${el.dataset.kind}`,s=>setLatitudeValue(s,el.dataset.latitude,el.dataset.kind,el.value)));for(const el of main.querySelectorAll('[data-path]')){let t=null;const apply=()=>{clearTimeout(t);const path=el.dataset.path.split('.'),v=clamp(el.value,Number(el.dataset.min),Number(el.dataset.max)),key=String(v);if(el.dataset.lastCommitted===key)return;const cur=Number(pathGet(current(),path));if(Number.isFinite(cur)&&Math.abs(cur-v)<1e-9){el.dataset.lastCommitted=key;return}el.dataset.lastCommitted=key;commit(el.closest('.wc-field')?.querySelector('.wc-label')?.textContent.trim()||path.join('.'),s=>setPath(s,path,v))};el.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(apply,320)});el.addEventListener('change',apply);el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();el.blur()}})}for(const r of main.querySelectorAll('[data-range-for]'))r.addEventListener('input',()=>{const id=r.dataset.rangeFor;if(id.startsWith('p:')){const path=id.slice(2),n=main.querySelector(`[data-path="${CSS.escape(path)}"]`);if(n)n.value=r.value}else if(id.startsWith('c:')){const n=main.querySelector(`[data-custom="${CSS.escape(id.slice(2))}"]`);if(n)n.value=r.value}});for(const r of main.querySelectorAll('[data-range-for^="p:"]'))r.addEventListener('change',()=>{const path=r.dataset.rangeFor.slice(2).split('.'),v=clamp(r.value,Number(r.min),Number(r.max));commit(r.closest('.wc-field')?.querySelector('.wc-label')?.textContent.trim()||path.join('.'),s=>setPath(s,path,v))});for(const b of main.querySelectorAll('[data-number-path]'))b.addEventListener('click',()=>{const path=b.dataset.numberPath.split('.'),cur=Number(pathGet(current(),path))||0,raw=Number(b.dataset.numberValue)||0,next=b.dataset.numberOp==='set'?raw:cur+raw;commit(b.closest('.wc-field')?.querySelector('.wc-label')?.textContent.trim()||b.dataset.numberPath,s=>setPath(s,path,Math.max(0,next)))});for(const el of main.querySelectorAll('[data-custom]')){let t=null;const apply=()=>{clearTimeout(t);const v=clamp(el.value,Number(el.dataset.min),Number(el.dataset.max)),key=String(v);if(el.dataset.lastCommitted===key)return;el.dataset.lastCommitted=key;commit(el.closest('.wc-field')?.querySelector('.wc-label')?.textContent.trim()||el.dataset.custom,s=>setCustom(s,el.dataset.custom,v))};el.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(apply,320)});el.addEventListener('change',apply);el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();el.blur()}})};for(const r of main.querySelectorAll('[data-range-for^="c:"]'))r.addEventListener('change',()=>{const id=r.dataset.rangeFor.slice(2),v=clamp(r.value,Number(r.min),Number(r.max));commit(r.closest('.wc-field')?.querySelector('.wc-label')?.textContent.trim()||id,s=>setCustom(s,id,v))});for(const el of main.querySelectorAll('[data-quick]')){let t=null;const apply=()=>{clearTimeout(t);const key=String(el.value);if(el.dataset.lastCommitted===key)return;el.dataset.lastCommitted=key;commit(el.closest('.wc-quick-stat')?.querySelector('.name')?.textContent||el.dataset.quick,s=>setQuick(s,el.dataset.quick,el.value))};el.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(apply,320)});el.addEventListener('change',apply);el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();el.blur()}})};for(const b of main.querySelectorAll('[data-quick-set]'))b.addEventListener('click',()=>{const id=b.dataset.quickSet,raw=b.dataset.value;commit(`빠른 치트: ${id}`,s=>{const cur=Number(quickValue(s,id))||0,n=String(raw).startsWith('+')?cur+Number(raw):Number(raw);return setQuick(s,id,n)})});for(const sw of main.querySelectorAll('[data-switch]'))sw.addEventListener('change',()=>{toggleSwitch(sw.dataset.switch,sw.checked);render()});for(const sel of main.querySelectorAll('[data-select]'))sel.addEventListener('change',()=>{const id=sel.dataset.select;if(id==='magicOutcome'){globalThis.__CHEAT_LEDGER_MAGIC_OUTCOME__=sel.value;setText(LS.magicOutcome,sel.value);toast(`마법 결과: ${MAGIC_OUTCOMES.find(x=>x[0]===sel.value)?.[1]||sel.value}`);render()}else if(id.startsWith('rel-belief:')){const i=Number(id.split(':')[1]);commit('가족/친구 인지 단계',s=>setPath(s,['circles',s.primaryCharacterId,'persons',i,'belief','rung'],sel.value))}else if(id==='brew-outcome'){globalThis.__CHEAT_LEDGER_BREW_OUTCOME__=sel.value;setText(LS.brewOutcome,sel.value);toast('물약 제조 결과 설정을 변경했습니다.');render()}else if(id==='patron-intent')commit('손님 의도',s=>updatePatron(s,selectedPatronName,'intent',sel.value));else if(id==='patron-tactic')commit('손님 접근 방식',s=>updatePatron(s,selectedPatronName,'tacticStyle',sel.value));else if(id==='patron-summon-intent')patronSummonIntent=sel.value});for(const b of main.querySelectorAll('[data-action]'))b.addEventListener('click',()=>doAction(b.dataset.action));for(const b of main.querySelectorAll('[data-upgrade]'))b.addEventListener('click',()=>installTavernUpgrade(b.dataset.upgrade));for(const b of main.querySelectorAll('[data-stepper]'))b.addEventListener('click',()=>{const id=b.dataset.stepper,inp=main.querySelector(`[data-stepper-input="${CSS.escape(id)}"]`),next=Math.max(0,(Number(inp?.value)||0)+Number(b.dataset.delta||0));commit(`${id} ${next}`,s=>setStepper(s,id,next))});for(const inp of main.querySelectorAll('[data-stepper-input]'))inp.addEventListener('change',()=>commit(`${inp.dataset.stepper} 재고`,s=>setStepper(s,inp.dataset.stepper,inp.value)));for(const b of main.querySelectorAll('[data-trait] button'))b.addEventListener('click',()=>{const wrap=b.closest('[data-trait]'),id=wrap.dataset.trait,mode=b.dataset.mode;commit(`${TRAIT_LABELS[id]||id} ${mode}`,s=>{const w=wifeOf(s);if(!w)return s;const a=new Set(w.latentTraits||[]),n=new Set(w.noticedLatentTraits||[]);if(mode==='none'){a.delete(id);n.delete(id)}else if(mode==='hidden'){a.add(id);n.delete(id)}else{a.add(id);n.add(id)}let x=setPath(s,['characters',s.primaryCharacterId,'latentTraits'],[...a]);x=setPath(x,['characters',s.primaryCharacterId,'noticedLatentTraits'],[...n]);return x})});for(const b of main.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>addPreset(b.dataset.preset,1));for(const b of main.querySelectorAll('[data-preset3]'))b.addEventListener('click',()=>addPreset(b.dataset.preset3,3));bindMaterialRows(main);const search=main.querySelector('[data-alchemy-search]');if(search){search.addEventListener('compositionstart',()=>{search.dataset.imeComposing='1'});search.addEventListener('compositionend',()=>{delete search.dataset.imeComposing;alchemySearch=search.value;refreshMaterialRows()});search.addEventListener('input',e=>{alchemySearch=search.value;if(!e.isComposing&&!search.dataset.imeComposing)refreshMaterialRows()})};for(const b of main.querySelectorAll('[data-alchemy-filter]'))b.addEventListener('click',()=>{alchemyFilter=b.dataset.alchemyFilter;render()});const bulk=main.querySelector('[data-bulk-material]');if(bulk)bulk.addEventListener('change',()=>{materialBulk=Math.max(0,Math.round(Number(bulk.value)||0))});for(const b of main.querySelectorAll('[data-bulk-set]'))b.addEventListener('click',()=>{materialBulk=Number(b.dataset.bulkSet);bulkMaterials(materialBulk)});const br=main.querySelector('[data-bulk-run]');if(br)br.addEventListener('click',()=>bulkMaterials(materialBulk));const ra=main.querySelector('[data-reveal-all]');if(ra)ra.addEventListener('click',revealAll);for(const b of main.querySelectorAll('[data-cup-delete]'))b.addEventListener('click',()=>commit('물약 삭제',s=>{const sr=stillroom(s);return {...s,stillroom:{...sr,cups:(sr.cups||[]).filter(c=>c.id!==b.dataset.cupDelete)}}}));for(const b of main.querySelectorAll('[data-cup-copy]'))b.addEventListener('click',()=>{const id=b.dataset.cupCopy,s=current(),sr=stillroom(s),cup=(sr.cups||[]).find(c=>c.id===id);if(!cup)return;const cap=officialCapacity(s),used=usedCapacity(s);if(!globalThis.__CHEAT_LEDGER_INFINITE_STORAGE__&&used+1>cap){toast('보관공간이 부족합니다.','warn');return}commit('물약 복제',x=>{const r=stillroom(x),copy={...clone(cup),id:`copy-${Date.now()}-${Math.random().toString(36).slice(2,7)}`};return {...x,stillroom:{...r,cups:[...(r.cups||[]),copy]}}})});const person=main.querySelector('[data-person-select]');if(person)person.addEventListener('change',()=>{selectedPersonId=person.value;render()});const psel=main.querySelector('[data-patron-select]');if(psel)psel.addEventListener('change',()=>{selectedPatronName=psel.value;patronSummonIntent='normal';render()});const psearch=main.querySelector('[data-patron-name]');if(psearch)psearch.addEventListener('change',()=>{const names=patronNames(current()),hit=names.find(n=>n.toLowerCase()===psearch.value.trim().toLowerCase());if(hit){selectedPatronName=hit;patronSummonIntent='normal';render()}else toast('해당 이름의 손님 기록을 찾지 못했습니다.','warn')})}



  function applyPresetPotion(state,cup,targetId){try{
    if(!state||!cup?.cheatPreset)return state;
    let n=state;const duration=Math.max(60,Number(cup.presetDurationSlots)||1440),until=(Number(state.slot)||0)+duration,id=cup.cheatPreset,preset=PRESETS.find(p=>p.id===id);
    const extend=list=>(list||[]).map(e=>String(e?.id||'').startsWith(String(cup.id)+'-')?{...e,expiresAtSlot:Math.max(Number(e.expiresAtSlot)||0,until)}:e);
    const addEffects=(list,defs)=>{const base=extend(list),ids=new Set(base.map(e=>e?.id));for(const [attribute,delta] of defs){const eid=`${cup.id}-special-${attribute}-${targetId}`;if(ids.has(eid))continue;base.push({id:eid,attribute,delta,source:`special:${id}`,expiresAtSlot:until,onsetSlots:0,rampSlots:90})}return base};
    let extras=[];if(id==='centaur_extract')extras=[['libido',18]];else if(id==='casanova_draught')extras=[['confidence',15]];else if(id==='succubus_elixir')extras=[['libido',18],['honesty',-14],['loyalty',-18]];else if(id==='holy_water')extras=[['loyalty',24]];
    if(targetId===Mn)n={...n,player:{...n.player,attributeEffects:addEffects(n.player?.attributeEffects,extras)}};
    else if(n.characters?.[targetId])n={...n,characters:{...n.characters,[targetId]:{...n.characters[targetId],attributeEffects:addEffects(n.characters[targetId]?.attributeEffects,extras)}}};
    else{const i=(n.customers||[]).findIndex(c=>c.id===targetId);if(i>=0){const cs=n.customers.slice(),name=cs[i]?.name;cs[i]={...cs[i],attributeEffects:addEffects(cs[i].attributeEffects,extras)};n={...n,customers:cs};if(name&&Number(preset?.chemistryBonus)>0)n=addTemporaryChemistry(n,name,Number(preset.chemistryBonus),until,`special:${id}`,`${cup.id}-chemistry-${name}`)}}
    if(targetId!==state.primaryCharacterId)return n;
    const w=wifeOf(n);if(!w)return n;
    if(id==='succubus_elixir'){
      const anticip=(w.anticipations||[]).map(a=>a?.label==='philtre:kindle'?{...a,expiresAtSlot:Math.max(Number(a.expiresAtSlot)||0,until)}:a);
      n=setPath(n,['characters',state.primaryCharacterId,'anticipations'],anticip);
      n=setPath(n,['characters',state.primaryCharacterId,'stats','arousal'],Math.min(85,Math.max(Number(w.stats?.arousal||0)+24,72)));
    }else if(id==='holy_water'){
      const anticip=(w.anticipations||[]).filter(a=>a?.label!=='philtre:kindle');
      n=setPath(n,['characters',state.primaryCharacterId,'anticipations'],anticip);
      n=setPath(n,['characters',state.primaryCharacterId,'stats','arousal'],Math.min(Number(w.stats?.arousal||0),8));
      n=setPath(n,['characters',state.primaryCharacterId,'stats','mood'],Math.max(Number(w.stats?.mood||0),85));
    }
    return n
  }catch(_){return state}}

  // ---- Final Character Review ------------------------------------------------
  const reviewTabs=[['base','핵심'],['attributes','능력치'],['affinities','취향'],['skills','숙련도'],['traits','숨은 성향'],['inner','내면 · 성장']];
  const rTabs=review.querySelector('.wcr-tabs'),rMain=review.querySelector('.wcr-main');
  rTabs.innerHTML=reviewTabs.map(([id,l])=>`<button type="button" class="wcr-tab" data-rtab="${id}">${l}</button>`).join('');
  function reviewTraitMode(id){const a=new Set(reviewDraft.latentTraits||[]),n=new Set(reviewDraft.noticedLatentTraits||[]);return !a.has(id)?'none':n.has(id)?'revealed':'hidden'}
  function reviewField(path,label,min,max,step=1,desc=''){const v=pathGet(reviewDraft,path)??0,id=path.join('.');return `<div class="wc-field"><div class="wc-label">${label}${desc?`<small>${desc}</small>`:''}</div><input class="wc-range" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-rreview="${esc(id)}"><input class="wc-num" type="number" min="${min}" max="${max}" step="${step}" value="${fmt(Number(v),3)}" data-rnum="${esc(id)}"></div>`}
  function renderReview(){if(!reviewDraft)return;for(const b of rTabs.querySelectorAll('.wcr-tab'))b.classList.toggle('active',b.dataset.rtab===reviewTab);let html='';if(reviewTab==='base'){const attrs=reviewDraft.attributes||{};html=pageTitle('핵심 성향','처음 정해진 핵심 값을 확인하고 원하는 부분만 바꿉니다.')+`<div class="wc-grid">${card('표기 이름',`<div class="wc-name-row"><input class="wc-text" type="text" maxlength="40" value="${esc(reviewDraft.name||'')}" data-review-name></div>`,'내부 캐릭터 ID는 유지한 채 표시 이름만 바꿉니다.')}${card('주요 수치',['openness','confidence','honesty','loyalty','libido'].filter(k=>attrs[k]!=null).map(k=>reviewField(['attributes',k],ATTR_LABELS[k]||k,0,100,1)).join(''))}${card('내면',reviewField(['selfConcept','openness'],'Self Concept · 개방성',0,100,1)+reviewField(['selfConcept','confidence'],'Self Concept · 자신감',0,100,1)+reviewField(['volatility'],'변동성',0,1,.01))}</div>`}else if(reviewTab==='attributes'){html=pageTitle('능력치','처음 정해진 값을 숫자로 미세 조정합니다.')+`<div class="wc-grid">${card('Attributes',Object.entries(reviewDraft.attributes||{}).filter(([,v])=>Number.isFinite(Number(v))).map(([k])=>reviewField(['attributes',k],ATTR_LABELS[k]||k,0,100,1)).join(''),'','wc-span2')}</div>`}else if(reviewTab==='affinities'){html=pageTitle('취향','-2 ~ +2 범위의 선호도를 조정합니다.')+`<div class="wc-grid">${card('Affinities',Object.entries(reviewDraft.affinities||{}).filter(([,v])=>Number.isFinite(Number(v))).map(([k])=>reviewField(['affinities',k],AFFINITY_LABELS[k]||k,-2,2,.1)).join(''),'','wc-span2')}</div>`}else if(reviewTab==='skills'){html=pageTitle('숙련도','사냥 · 채집 · 물약 제조 · 요리 · 서빙을 시작 전에 조정합니다.')+`<div class="wc-grid">${card('Skills',skillIds().map(k=>reviewField(['skills',k],SKILL_LABELS[k]||k,0,100,1)).join(''),'','wc-span2')}</div>`}else if(reviewTab==='traits'){html=pageTitle('숨은 성향','성향의 실제 보유 여부와 플레이어에게 공개되었는지를 따로 정합니다. 보유(미공개)는 성향이 존재하지만 아직 파악하지 못한 상태입니다.')+`<div class="wc-traits">${traitIds().map(id=>{const mode=reviewTraitMode(id);return `<div class="wc-trait"><div class="wc-trait-name">${esc(TRAIT_LABELS[id]||id)} <span class="wc-muted">${esc(id)}</span>${help(TRAIT_DESCS[id]||'')}</div><div class="wc-segment" data-rtrait="${esc(id)}"><button class="${mode==='none'?'sel':''}" data-mode="none">미보유</button><button class="owned-hidden ${mode==='hidden'?'sel':''}" data-mode="hidden">보유(미공개)</button><button class="revealed ${mode==='revealed'?'sel':''}" data-mode="revealed">보유(발견)</button></div></div>`}).join('')}</div>`}else{html=pageTitle('내면 · 성장','Self Concept, 성장률, 변동성을 직접 조정합니다.')+`<div class="wc-grid">${card('Self Concept',reviewField(['selfConcept','openness'],'개방성',0,100,1)+reviewField(['selfConcept','confidence'],'자신감',0,100,1)+reviewField(['volatility'],'변동성',0,1,.01))}${card('Growth Rates',reviewField(['growthRates','openness','increase'],'개방성 증가율',0,3,.01)+reviewField(['growthRates','openness','decrease'],'개방성 감소율',0,3,.01)+reviewField(['growthRates','confidence','increase'],'자신감 증가율',0,3,.01)+reviewField(['growthRates','confidence','decrease'],'자신감 감소율',0,3,.01))}</div>`}rMain.innerHTML=html;bindReview()}
  function bindReview(){const rn=rMain.querySelector('[data-review-name]');if(rn)rn.addEventListener('input',()=>{reviewDraft.name=rn.value});for(const r of rMain.querySelectorAll('[data-rreview]'))r.addEventListener('input',()=>{const n=rMain.querySelector(`[data-rnum="${CSS.escape(r.dataset.rreview)}"]`);if(n)n.value=r.value});for(const r of rMain.querySelectorAll('[data-rreview]'))r.addEventListener('change',()=>{const path=r.dataset.rreview.split('.'),n=clamp(r.value,Number(r.min),Number(r.max));reviewDraft=pathSet(reviewDraft,path,n);const num=rMain.querySelector(`[data-rnum="${CSS.escape(r.dataset.rreview)}"]`);if(num)num.value=fmt(n,3)});for(const n of rMain.querySelectorAll('[data-rnum]'))n.addEventListener('change',()=>{const path=n.dataset.rnum.split('.'),v=clamp(n.value,Number(n.min),Number(n.max));reviewDraft=pathSet(reviewDraft,path,v);n.value=fmt(v,3);const r=rMain.querySelector(`[data-rreview="${CSS.escape(n.dataset.rnum)}"]`);if(r)r.value=String(v)});for(const b of rMain.querySelectorAll('[data-rtrait] button'))b.addEventListener('click',()=>{const id=b.closest('[data-rtrait]').dataset.rtrait,mode=b.dataset.mode,a=new Set(reviewDraft.latentTraits||[]),n=new Set(reviewDraft.noticedLatentTraits||[]);if(mode==='none'){a.delete(id);n.delete(id)}else if(mode==='hidden'){a.add(id);n.delete(id)}else{a.add(id);n.add(id)}reviewDraft.latentTraits=[...a];reviewDraft.noticedLatentTraits=[...n];renderReview()})}
  function openReview(root){if(!bool(LS.autoReview,true)||reviewOpen)return;const s=root.state,w=s?.characters?.[s.primaryCharacterId];if(!w)return;reviewWifeId=s.primaryCharacterId;reviewOriginal={name:w.name||'',attributes:clone(w.attributes||{}),affinities:clone(w.affinities||{}),skills:clone(w.skills||{}),selfConcept:clone(w.selfConcept||{openness:50,confidence:50}),growthRates:clone(w.growthRates||{openness:{increase:1,decrease:1},confidence:{increase:1,decrease:1}}),latentTraits:[...(w.latentTraits||[])],noticedLatentTraits:[...(w.noticedLatentTraits||[])],volatility:Number(w.volatility)||0};reviewDraft=clone(reviewOriginal);reviewTab='base',searchResults=[],searchPick=-1;reviewOpen=true;review.hidden=false;review.querySelector('[data-review-title]').textContent=`${w.name||'히로인'} — 최종 캐릭터 조정`;renderReview()}
  function closeReviewSave(){if(!reviewDraft||!reviewWifeId)return;const d=clone(reviewDraft),wid=reviewWifeId;re.setState(root=>{const s=root.state,w=s?.characters?.[wid];if(!w)return root;const nw={...w,name:d.name||w.name,attributes:{...(w.attributes||{}),...d.attributes},affinities:{...(w.affinities||{}),...d.affinities},skills:{...(w.skills||{}),...d.skills},selfConcept:{...(w.selfConcept||{}),...d.selfConcept},growthRates:clone(d.growthRates),latentTraits:[...d.latentTraits],noticedLatentTraits:[...d.noticedLatentTraits],volatility:d.volatility,traitsAtGeneration:{...(w.traitsAtGeneration||{}),openness:d.attributes?.openness??w.traitsAtGeneration?.openness,confidence:d.attributes?.confidence??w.traitsAtGeneration?.confidence}};return {...root,state:{...s,characters:{...s.characters,[wid]:nw}}}});reviewOpen=false;review.hidden=true;reviewDraft=reviewOriginal=reviewWifeId=null;toast('최종 캐릭터 설정을 적용했습니다.','good')}
  function resetReviewTab(){if(!reviewDraft||!reviewOriginal)return;const keys=reviewTab==='base'?['name','attributes','selfConcept','volatility']:reviewTab==='attributes'?['attributes']:reviewTab==='affinities'?['affinities']:reviewTab==='skills'?['skills']:reviewTab==='traits'?['latentTraits','noticedLatentTraits']:['selfConcept','growthRates','volatility'];for(const k of keys)reviewDraft[k]=clone(reviewOriginal[k]);renderReview()}

  // ---- top-level events ------------------------------------------------------
  button.addEventListener('click',()=>setPanel(true));overlay.querySelector('[data-close]').addEventListener('click',closePanel);overlay.querySelector('[data-footer-undo]').addEventListener('click',undo);overlay.querySelector('[data-footer-redo]').addEventListener('click',redo);overlay.addEventListener('click',e=>{if(e.target===overlay)closePanel();if(!e.target.closest('.wc-searchbox'))closeSearchResults()});sidebar.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;activeTab=b.dataset.tab;searchInput.value='';closeSearchResults();render()});searchInput.addEventListener('input',renderSearchResults);searchInput.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&searchResults.length){e.preventDefault();searchPick=Math.min(searchResults.length-1,searchPick+1);paintSearchPick()}else if(e.key==='ArrowUp'&&searchResults.length){e.preventDefault();searchPick=Math.max(0,searchPick-1);paintSearchPick()}else if(e.key==='Enter'&&searchResults.length){e.preventDefault();activateSearchResult(searchResults[Math.max(0,searchPick)])}else if(e.key==='Escape')closeSearchResults()});searchBox.addEventListener('click',e=>{const b=e.target.closest('[data-search-hit]');if(b)activateSearchResult(searchResults[Number(b.dataset.searchHit)])});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panelOpen&&!reviewOpen&&searchBox.hidden)closePanel()});rTabs.addEventListener('click',e=>{const b=e.target.closest('[data-rtab]');if(!b)return;reviewTab=b.dataset.rtab;renderReview()});review.querySelector('[data-review-reset]').addEventListener('click',()=>{reviewDraft=clone(reviewOriginal);renderReview();toast('처음 정해진 값으로 되돌렸습니다.')});review.querySelector('[data-review-section-reset]').addEventListener('click',resetReviewTab);review.querySelector('[data-review-save]').addEventListener('click',closeReviewSave);

  let chemistryCleanupGuard=false;
  function rootChanged(next,prev){refreshButton();const before=prev||previousRoot;previousRoot=next;if(!chemistryCleanupGuard&&next?.started&&next.state){const migrated=migrateLedgerState(next.state),cleaned=expireTemporaryChemistry(migrated);if(cleaned!==next.state){chemistryCleanupGuard=true;re.setState(r=>({...r,state:cleaned}));chemistryCleanupGuard=false;return}}const cameFromCreator=!!before&&!before.started&&!!next.started&&(!!before.selectingBuilder||!!before.selectingPicks||!!before.selectingArchetype);if(cameFromCreator)requestAnimationFrame(()=>openReview(re.getState()));if(panelOpen&&!overlay.querySelector('input:focus,select:focus'))scheduleRender();if(reviewOpen&&!next.started){reviewOpen=false;review.hidden=true;reviewDraft=reviewOriginal=reviewWifeId=null}}
  try{re.subscribe(rootChanged)}catch(e){console.warn('[Cheat Ledger] store subscribe failed',e)}
  const visibilityTimer=setInterval(refreshButton,700);window.addEventListener('beforeunload',()=>clearInterval(visibilityTimer));
  try{re.setState(root=>root?.state?{...root,state:migrateLedgerState(root.state)}:root)}catch(_){}
  refreshButton();
}catch(e){console.error('[Cheat Ledger] install failed',e)}})();
/* ========================================================================
   END CHEAT LEDGER — Sanguine / ChatGPT
   ======================================================================== */
