/* WAYWORKS bridges that the installer put inside the 9-30 game module, in install order. */
window.WWWaywardAdapter.bind({store:re,settings:Rt,gameVersion:"2026-10-04",saveVersion:Xg});
/* CP20260930 game-only bridge. Original availability selector and original dispatch are reused. */
(function(){'use strict';const api=window.WWGameKeybinds;if(!api)return;
  const root=()=>document.getElementById('root');
  const visible=node=>!!node?.isConnected&&!!node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';
  const overlays=()=>[...(root()?.querySelectorAll('.fixed.inset-0')||[])].filter(visible);
  // WML: 10-04 — anchors by markup, not by game text: desktop ☰ is "fixed top-2 right-2", mobile ☰ sits in the sticky header
  const MENU_LABELS='button[aria-label="메뉴 열기"],button[aria-label="메뉴"],button[aria-label="Open menu"],button[aria-label="Menu"]';
  const menuButtons=()=>{const r=root();if(!r)return[];return[...new Set([...r.querySelectorAll('button[class~="fixed"][class~="top-2"][class~="right-2"],[class~="sticky"][class~="top-0"] button'),...r.querySelectorAll(MENU_LABELS)])]
    .filter(n=>!n.closest('[data-ww-header]')&&(n.textContent.trim()==='☰'||n.matches(MENU_LABELS)));};
  const menuButton=()=>menuButtons().find(visible);
  // pause panel: the title is followed by the button list that starts with the amber Resume button
  const RESUME='h2 + [class~="flex-col"][class~="gap-2"] > button:first-child[class~="bg-amber-700"]';
  const pause=()=>overlays().find(o=>o.querySelector(RESUME)||[...o.querySelectorAll('h2')].some(n=>['일시 정지','Paused'].includes(n.textContent.trim())));
  const resume=panel=>panel.querySelector(RESUME)||[...panel.querySelectorAll('button')].find(n=>['재개하기','Resume'].includes(n.textContent.trim()));
  function isolated(ctx){return ctx.document!==document||!!ctx.event?.target?.closest?.('.ww-window,.ww-window-menu-host,.ww-window-menu,.ww-group-tabs,.ww-workspace-toolbar,.ww-window-taskbar,.ww-divider,.ww-auto-hide-rail,.ww-tab-context,.ww-legacy')||!!window.WWWindow?.debug().drag||[...document.querySelectorAll('.ww-peek-overlay')].some(visible);}
  // WML: 10-04 — same order as the game's own key handler (errand time is plain 'wait'; Enter finishes errands and bench work)
  const MINUTES={1:1,2:5,3:15};
  const quick=(key,state)=>(key==='enter'||MINUTES[key])&&typeof __E.N4e==='function'?__E.N4e(state)||null:null;   // single-choice event / interrupted errand
  function command(key,state){const q=quick(key,state);if(q)return q;
    if(state.pendingEvent||Ye(state)||Y(state)&&Y(state).playerEngaged||state.activeShoppingSession||state.gameOver)return null;
    if(state.errandSession&&(key==='w'||key==='s'||key==='n'))return{type:'wait'};
    if(MINUTES[key])return{type:'wait',minutes:MINUTES[key]};
    if(key==='enter')return{type:'wait',until:typeof __E.X0==='function'&&__E.X0(state)?'done':'customer'};
    return state.errandSession?null:_F(state,key)||null;
  }
  function canRun(key,ctx){if(isolated(ctx)||!menuButton())return false;const layers=overlays();
    if(key==='escape'){const panel=pause();return panel?layers.length===1:layers.length===0&&ctx.context!=='BLOCKING_MODAL';}
    return ctx.context==='NORMAL'&&layers.length===0&&!!command(key,re.getState().state);
  }
  function run(key,ctx){if(!canRun(key,ctx))return false;
    if(key==='escape'){const panel=pause(),button=panel?resume(panel):menuButton();if(!button)return false;button.click();return true;}
    const store=re.getState(),q=quick(key,store.state),next=q||command(key,store.state);if(!next)return false;store.dispatch(next);
    // after a quick resolve, 1/2/3 still wait when nothing else holds the clock
    if(q&&MINUTES[key]){const f=re.getState().state;if(!f.pendingEvent&&!f.gameOver&&!Ye(f)&&!f.errandSession?.interrupted&&!Y(f)?.playerEngaged)re.getState().dispatch({type:'wait',minutes:MINUTES[key]});}
    return true;
  }
  api.connect(Object.freeze({canRun,run}));
  wwKeysReady=()=>menuButtons().length>0;   // the game's own key handlers stay on while the bridge cannot find the game screen
  // Only the original hotkey badge / underline presentation is adapted; button behavior is untouched.
  const originalBadge=vm,originalLabel=gF;
  vm=function(props){const [,refresh]=Z.useState(0);Z.useEffect(()=>{const rerender=()=>refresh(n=>n+1),off=['bindings-changed','owner-changed'].map(name=>WWKeybind.events.on(name,rerender));return()=>off.forEach(fn=>fn());},[]);
    // WML: 10-04 — the game's event modal (state.pendingEvent) answers only its own keys, so its badges stay as drawn
    const nativeKey=props.hotkey==='↵'?'enter':props.hotkey;if(!api.actionId(nativeKey)||re.getState().state?.pendingEvent)return originalBadge(props);
    const first=api.firstNative(nativeKey),label=first?WWKeybind.displayBinding(first):null,badge=originalBadge({...props,hotkey:props.hotkey==='↵'&&label==='Enter'?'↵':label});
    return badge?Z.cloneElement(badge,{title:api.displayNative(nativeKey),className:badge.props.className.replace('w-[1.05rem]','min-w-[1.05rem] px-1')}):null;
  };
  gF=function(label,key){if(!api.actionId(key))return originalLabel(label,key);const first=api.firstNative(key),plain=first&&!first.ctrl&&!first.alt&&!first.meta&&/^Key[A-Z]$/.test(first.code)?first.code.slice(3):null;return originalLabel(label,plain);};
  const titles=new WeakMap();
  // WML: 10-04 — Korean titles read "1분 기다리기1" or "1분 기다리기 (1)" and "…시간 보내기…"; English titles are matched too
  const WAIT_TITLES=[/^((?:1|5|15)분 기다리기.*?)\s*\(?([123])\)?$/,/^(Wait (?:1|5|15) minutes?) \(([123])\)$/],UNTIL_TITLES=[/^(새 손님이 들어올 때까지 시간 (?:경과|보내기).*?) — Enter$/,/^(Tick until a new patron walks in.*?) — Enter$/];
  const firstMatch=(list,text)=>list.reduce((hit,re)=>hit||text.match(re),null);
  function updateMenuHint(){const menus=menuButtons(),keys=api.displayNative('escape');
    // the menu title keeps the game's own wording ("메뉴" / "Menu") and only swaps the key in brackets
    for(const button of menus){let memo=titles.get(button);if(!memo||button.title!==memo.applied){memo={base:button.title.replace(/\s*\([^)]*\)$/,''),applied:null};titles.set(button,memo);}
      const title=keys?memo.base+' ('+keys+')':memo.base;memo.applied=title;if(button.title!==title)button.title=title;}
    for(const n of root()?.querySelectorAll('button[title]')||[]){if(menus.includes(n))continue;let memo=titles.get(n);if(!memo||n.title!==memo.applied){const raw=n.title,match=firstMatch(WAIT_TITLES,raw),customer=firstMatch(UNTIL_TITLES,raw);if(!match&&!customer){titles.delete(n);continue;}memo={base:(match||customer)[1],key:match?match[2]:'enter',applied:raw};titles.set(n,memo);}
      const id=api.actionId(memo.key),first=api.firstNative(memo.key),key=first?WWKeybind.displayBinding(first):'',next=memo.base+(id&&key?' ('+key+')':'');memo.applied=next;if(n.title!==next)n.title=next;
    }
  }
  const observer=new MutationObserver(updateMenuHint);observer.observe(root(),{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
  const off=['bindings-changed','owner-changed'].map(name=>WWKeybind.events.on(name,updateMenuHint));updateMenuHint();
  window.addEventListener('pagehide',()=>{observer.disconnect();off.forEach(fn=>fn());},{once:true});
})();

/* One original-store adapter. Ordered transforms execute BEFORE native day autosave. */
{
  const wwRuntimeStore=re,wwRuntimeTransforms=new Map(),wwRuntimeNativeUndo=re.getState().undo;
  let wwRuntimeCommand=null,wwRuntimeClosedDay=null,wwRuntimeUndoRoute=null;
  const wwRuntimeOriginalReducer=$1,wwRuntimeOriginalComplete=koCompleteTurn175;
  const wwRuntime={version:'1.0.0',apiVersion:1,root:()=>wwRuntimeStore.getState(),lastCommand:()=>wwRuntimeCommand,
    subscribe:fn=>wwRuntimeStore.subscribe(fn),
    registerTransform(id,priority,fn){if(wwRuntimeTransforms.has(id))throw Error('Duplicate game transaction transform');wwRuntimeTransforms.set(id,{priority,fn});return()=>wwRuntimeTransforms.delete(id);},
    noteDayClose(state){wwRuntimeClosedDay=state;},
    commit(mutator){const before=wwRuntimeStore.getState().state,draft=structuredClone(before);if(mutator(draft)===false)return false;if(!koValidSaveState175(draft))throw Error('게임 저장 상태 검사를 통과하지 못했습니다.');if(wwRuntimeStore.getState().state!==before)throw Error('수정 도중 게임 상태가 변경되었습니다.');wwRuntimeStore.setState({state:draft});return true;},
    canUndoNative:()=>wwRuntimeStore.getState().undoStack?.length>0,
    undoNative(){if(!this.canUndoNative())return false;wwRuntimeNativeUndo();return true;},
    routeUndo(fn){wwRuntimeUndoRoute=fn;},
    diagnose:()=>({originalStore:true,transforms:[...wwRuntimeTransforms].sort((a,b)=>a[1].priority-b[1].priority).map(([id,v])=>({id,priority:v.priority})),undoRoute:!!wwRuntimeUndoRoute})};
  // WML: 10-04 — the reducer calls itself for tavern work; only the outermost call is the player's command
  let wwRuntimeDepth=0;
  $1=function(before,command){if(!wwRuntimeDepth){wwRuntimeCommand=command;wwRuntimeClosedDay=null;}wwRuntimeDepth++;try{return wwRuntimeOriginalReducer.apply(this,arguments);}finally{wwRuntimeDepth--;}};
  // WML: 10-04 — the store has already committed when this runs, so the caller passes the state from before the action
  koCompleteTurn175=function(result,newDay,prior){try{const before=prior??wwRuntimeStore.getState().state;for(const [id,transform]of [...wwRuntimeTransforms].sort((a,b)=>a[1].priority-b[1].priority))try{const next=transform.fn(before,result.state,wwRuntimeCommand,wwRuntimeClosedDay);if(next&&next!==result.state)result={...result,state:next};}catch(error){console.error('[WW domain transform]',id,error);}return wwRuntimeOriginalComplete.call(this,result,newDay);}finally{wwRuntimeClosedDay=null;/* command retained until the store observer records its native undo token */}};
  wwRuntimeStore.setState({undo(){return wwRuntimeUndoRoute?wwRuntimeUndoRoute():wwRuntimeNativeUndo();}});
  Object.defineProperty(window,'WWGameRuntime',{configurable:true,value:Object.freeze(wwRuntime)});
  window.dispatchEvent(new Event('WWGameRuntimeReady'));
}

if (WW_FEATURES.cheat) {
/* Inject only inside the verified 2026-09-30 game module before its bootstrap. */
{
  const wwCheatStore30=re,wwOriginalAllure30=true?vr:null;
  let wwAllure30=null,wwBridgeDisposed30=false,wwSubscriptions30=0;
  const wwClone30=value=>{try{return structuredClone(value);}catch(_){return JSON.parse(JSON.stringify(value));}};
  const wwWrappedAllure30=function(character){return wwAllure30&&character?.id===wwAllure30?100:wwOriginalAllure30(character);};
  if(wwOriginalAllure30)vr=wwWrappedAllure30;
  const wwBridge30={
    version:'2.0.0',checkpoint:'Wayward 2026-09-30 ko-v1.3',
    capabilities:Object.freeze({read:true,subscribe:true,commit:true,validate:true,mana:true,allure:true,gameUndo:true,portraitRefresh:false}),
    read(){const root=wwCheatStore30.getState(),state=root.state;let spouse=null;try{spouse=g(state);}catch(_){}return {state,spouse,wife:spouse,started:!!root.started};},
    subscribe(fn){if(wwBridgeDisposed30)throw Error('Bridge disposed');wwSubscriptions30++;const off=wwCheatStore30.subscribe(fn);let active=true;return()=>{if(active){active=false;wwSubscriptions30--;off();}};},
    clone:wwClone30,validate:state=>koValidSaveState175(state),manaMax:magic=>true?rs(magic):null,
    commitState(mutator){if(wwBridgeDisposed30)throw Error('Bridge disposed');const current=wwCheatStore30.getState().state,draft=wwClone30(current);if(mutator(draft)===false)return false;
      if(!koValidSaveState175(draft))throw Error('게임 저장 상태 검사를 통과하지 못했습니다.');if(wwCheatStore30.getState().state!==current)throw Error('수정 도중 게임 상태가 변경되었습니다.');wwCheatStore30.setState({state:draft});return true;},
    canUndoGame(){const root=wwCheatStore30.getState();return Array.isArray(root.undoStack)&&root.undoStack.length>0&&typeof root.undo==='function';},
    undoGame(){if(!this.canUndoGame())return false;wwCheatStore30.getState().undo();return true;},
    setAllure(id){if(!wwOriginalAllure30)return false;if(id!=null&&typeof id!=='string')throw Error('Invalid character ID');wwAllure30=id||null;this.refresh();return true;},
    getAllure:()=>wwAllure30,allureFor:character=>wwOriginalAllure30?vr(character):null,
    refresh(){const state=wwCheatStore30.getState().state;if(state&&koValidSaveState175(state))wwCheatStore30.setState({state:{...state}});},
    diagnose:()=>({checkpoint:'2026-09-30',originalStore:true,saveSchema:Xg,activeSubscriptions:wwSubscriptions30,allureSession:wwAllure30,portraitRefresh:'REPLACED: original store subscription',disposed:wwBridgeDisposed30}),
    dispose(){wwBridgeDisposed30=true;wwAllure30=null;if(wwOriginalAllure30&&vr===wwWrappedAllure30)vr=wwOriginalAllure30;}
  };
  Object.defineProperty(window,'WWCheatBridge',{configurable:true,value:Object.freeze(wwBridge30)});
  window.dispatchEvent(new Event('WWCheatBridgeReady'));
}

}
if (WW_FEATURES.stats) {
/* WW_OBSERVER_ADAPTER: installed inside 2026-09-30; the save and API namespace stays stable. */
{
  const wwObserverGuestLabels2109 = false
    ? Object.freeze(Object.fromEntries(Object.entries(({}))
      .filter(([, label]) => typeof label === 'string' && label.trim()))) : Object.freeze({});
  const wwObserverTopic2107 = id => Array.isArray(CC)
    ? CC.find(topic => topic.id === id) : null;
  const wwObserverLabel2107 = (id, event) => {
    if (id?.startsWith('dare_') && typeof rd === 'function') {
      const dare = rd(id);
      if (typeof dare?.label === 'string') return dare.label;
    }
    const choice = Array.isArray(event?.choices) ? event.choices.find(item => item.id === id) : null;
    if (typeof choice?.label === 'string') return choice.label;
    const topic = wwObserverTopic2107(id);
    if (typeof topic?.label === 'string') return topic.label;
    if (id?.startsWith('dir_say_') && typeof lW === 'function') {
      const directive = lW(id.slice(8));
      if (typeof directive?.label === 'string') return directive.label;
    }
    if (typeof es === 'function') {
      const act = es(id);
      if (typeof act?.name === 'string') return act.name;
    }
    return '기타 행동';
  };
  const wwObserverRelationship2107 = state => {
    const wife = state?.characters?.[state.primaryCharacterId];
    let resentment = null;
    if (wife) { try { resentment = Ve(wife); } catch (_) {} }
    return { trust: wife?.relationship?.trust ?? null,
      openness: wife?.attributes?.openness ?? null, confidence: wife?.attributes?.confidence ?? null,
      mood: wife?.stats?.mood ?? null, resentment };
  };
  const wwObserverGameActLabels2107 = (() => {
    try {
      if (!(Gc instanceof Map) || typeof ts !== 'function') return {};
      return Object.fromEntries([...Gc.keys()].map(id => [id, es(id)?.name])
        .filter(([, label]) => typeof label === 'string' && label.trim()));
    } catch (_) { return {}; }
  })();
  const wwObserverCommand2107 = (action, before, after) => {
    if (!action || typeof action.type !== 'string' || !before || !after || before === after) return null;
    const direct = { resolve_remark: '상황에 반응하기', fix_wife_up: '옷매무새 다듬기',
      have_elena_bathe: '배우자 목욕', join_bath: '목욕에 함께하기', engage_patron: '손님 대화에 함께하기' };
    if (!['wife_topic', 'scene_action', 'patron_interaction_choice', 'resolve_event'].includes(action.type) &&
      !Object.hasOwn(direct, action.type)) return null;
    const id = action.topicId ?? action.actionId ?? action.choiceId ?? action.remarkId ?? action.type;
    if (typeof id !== 'string' || /^(cat_|umbrella_)/.test(id) ||
      ['back', 'cancel', 'dismiss'].includes(id)) return null;
    const event = before.pendingEvent;
    const prior = before.characters?.[before.primaryCharacterId];
    const wife = after.characters?.[after.primaryCharacterId];
    if (!prior || !wife || before.primaryCharacterId !== after.primaryCharacterId) return null;
    const valuesBefore = wwObserverRelationship2107(before), valuesAfter = wwObserverRelationship2107(after);
    const changes = Object.fromEntries(Object.keys(valuesBefore).filter(key =>
      Number.isFinite(valuesBefore[key]) && Number.isFinite(valuesAfter[key]))
      .map(key => [key, valuesAfter[key] - valuesBefore[key]]));
    const responseChanged = wife.lastResponseSlot !== prior.lastResponseSlot ||
      wife.lastResponse !== prior.lastResponse;
    return { day: before.day, slot: before.slot, endSlot: after.slot,
      wifeId: before.primaryCharacterId, type: action.type, id,
      label: direct[action.type] || wwObserverLabel2107(id, event),
      category: event?.category || (action.type === 'scene_action' ? 'scene' :
        action.type === 'wife_topic' ? wwObserverTopic2107(id)?.category || 'conversation' : 'event'),
      targetId: typeof action.targetCustomerId === 'string' ? action.targetCustomerId : null,
      targetName: (before.customers || []).find(customer => customer.id === action.targetCustomerId)?.name ?? null,
      response: responseChanged && typeof wife.lastResponseType === 'string' ? wife.lastResponseType : null,
      changes };
  };
  const wwObserverCommandsEnabled2107=true;
  const wwObserverEncounterIndexes2107=new WeakMap();
  const wwObserverSnapshot2107 = root => {
    const state = root.state || {};
    const economy = state.economy || {};
    const breakdown = state.incomeBreakdownToday || {};
    const wifeId = state.primaryCharacterId;
    const wife = wifeId && state.characters?.[wifeId];
    // Preserve the old current-customer total, including guests already leaving.
    // Collectors also carry isResident; classify them first so they are not lodgers.
    const currentCustomers = (Array.isArray(state.customers) ? state.customers : [])
      .filter(customer => customer && customer.status !== 'gone');
    const customerPresence = { total: currentCustomers.length, regular: 0, residents: 0, collectors: 0 };
    for (const customer of currentCustomers) {
      if (customer.isCollector === true) customerPresence.collectors++;
      else if (customer.isResident === true) customerPresence.residents++;
      else customerPresence.regular++;
    }
    const studio = state.modData?.guestStudio;
    const customs = Array.isArray(studio?.customs) ? new Set(studio.customs
      .filter(entry => entry && typeof entry.name === 'string').map(entry => entry.name)) : new Set();
    const retired = Array.isArray(studio?.retired) ? new Set(studio.retired
      .filter(name => typeof name === 'string')) : new Set();
    const overrides = studio?.overrides && typeof studio.overrides === 'object' &&
      !Array.isArray(studio.overrides) ? studio.overrides : {};
    const attributeNames = ['strength', 'deftness', 'vigor', 'wit', 'composure', 'charm',
      'openness', 'confidence', 'honesty'];
    const rawIntimateEncounters = (Array.isArray(wife?.intimateHistory) ? wife.intimateHistory : [])
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({
        actId: typeof entry.actId === 'string' ? entry.actId : null,
        partner: typeof entry.partner === 'string' ? entry.partner : null,
        partnerType: typeof entry.partnerType === 'string' ? entry.partnerType : null,
        day: Number.isInteger(entry.day) ? entry.day : null,
        slot: Number.isFinite(entry.slot) ? entry.slot : null,
        reception: typeof entry.reception === 'string' ? entry.reception : null,
        orgasmed: typeof entry.orgasmed === 'boolean' ? entry.orgasmed : null,
        husbandWitnessed: typeof entry.husbandWitnessed === 'boolean' ? entry.husbandWitnessed : null,
        herPleasure: Number.isFinite(entry.herPleasure) ? entry.herPleasure : null
      }));
    const intimacyArchive=state.modData?.wwObserver?.intimacyArchive;
    const intimateEncounters=window.WWObserverArchive?.valid(intimacyArchive)?intimacyArchive.detail:rawIntimateEncounters;
    const intimateByPatron = wwObserverEncounterIndexes2107.get(intimateEncounters)||new Map();
    if(!wwObserverEncounterIndexes2107.has(intimateEncounters)){
    for (const encounter of intimateEncounters) {
      if (encounter.partnerType !== 'patron' || encounter.partner === null) continue;
      if (!intimateByPatron.has(encounter.partner)) intimateByPatron.set(encounter.partner, []);
      intimateByPatron.get(encounter.partner).push(encounter);
    }
    for (const encounters of intimateByPatron.values()) encounters.sort((a, b) =>
      (b.day ?? -1) - (a.day ?? -1) || (b.slot ?? -1) - (a.slot ?? -1));
    wwObserverEncounterIndexes2107.set(intimateEncounters,intimateByPatron);}
    let resentment = null;
    if (wife) { try { resentment = Ve(wife); } catch (_) {} }
    return {
      started: !!root.started,
      day: Number.isInteger(state.day) ? state.day : null,
      slot: Number.isFinite(state.slot) ? state.slot : null,
      gold: Number.isFinite(economy.gold) ? economy.gold : null,
      debt: Number.isFinite(economy.debt) ? economy.debt : null,
      incomeToday: Number.isFinite(state.goldEarnedToday) ? state.goldEarnedToday : null,
      servedToday: Number.isFinite(state.customersServedToday) ? state.customersServedToday : null,
      lostToday: Number.isFinite(state.customersLostToday) ? state.customersLostToday : null,
      breakdown: Object.fromEntries(Object.entries(breakdown).filter(([, value]) => Number.isFinite(value))),
      recentDailyEarnings: Array.isArray(state.recentDailyEarnings)
        ? state.recentDailyEarnings.filter(Number.isFinite).slice(0, 3) : [],
      intimateEncounters,
      rawIntimateEncounters,
      intimacyArchive,
      intimateActLabels: wwObserverGameActLabels2107,
      patronDisplayLabels: wwObserverGuestLabels2109,
      customerPresence,
      commandTracking: wwObserverCommandsEnabled2107,
      relationshipCommands: (state.modData?.wwObserver?.commands?.version === 1 &&
        Array.isArray(state.modData.wwObserver.commands.history) ? state.modData.wwObserver.commands.history : [])
        .filter(row => row && typeof row.id === 'string' && Number.isInteger(row.day) && Number.isFinite(row.slot))
        .map(row => ({ day: row.day, slot: row.slot, endSlot: Number.isFinite(row.endSlot) ? row.endSlot : null,
          id: row.id, label: typeof row.label === 'string' ? row.label : row.id,
          category: typeof row.category === 'string' ? row.category : null,
          type: typeof row.type === 'string' ? row.type : null,
          wifeId: typeof row.wifeId === 'string' ? row.wifeId : null,
          targetName: typeof row.targetName === 'string' ? row.targetName : null,
          response: typeof row.response === 'string' ? row.response : null,
          changes: row.changes && typeof row.changes === 'object' ? Object.fromEntries(
            Object.entries(row.changes).filter(([, value]) => Number.isFinite(value))) : {} })),
      actionExperience: [
        ...Object.entries(wife?.actionAffinity || {}).filter(([, value]) =>
          value && Number.isFinite(value.exposures) && value.exposures > 0).map(([id, value]) => ({
            id, label: wwObserverLabel2107(id), count: value.exposures,
            valence: Number.isFinite(value.valence) ? value.valence : null,
            lastSlot: Number.isFinite(value.lastSlot) ? value.lastSlot : null,
            category: wwObserverTopic2107(id)?.category || null
          })),
        ...(Array.isArray(wife?.directivesSpoken) ? wife.directivesSpoken : []).filter(item =>
          item && typeof item.id === 'string' && Number.isFinite(item.times) && item.times > 0).map(item => ({
            id: 'dir_say_' + item.id, label: wwObserverLabel2107('dir_say_' + item.id),
            count: item.times, valence: null, lastSlot: null, category: 'behavior'
          }))
      ],
      relationship: wife ? {
        id: wifeId, name: typeof wife.name === 'string' ? wife.name : '배우자',
        trust: Number.isFinite(wife.relationship?.trust) ? wife.relationship.trust : null,
        openness: Number.isFinite(wife.attributes?.openness) ? wife.attributes.openness : null,
        confidence: Number.isFinite(wife.attributes?.confidence) ? wife.attributes.confidence : null,
        mood: Number.isFinite(wife.stats?.mood) ? wife.stats.mood : null,
        resentment: Number.isFinite(resentment) ? resentment : null
      } : null,
      patrons: (Array.isArray(state.patronRecords) ? state.patronRecords : [])
        .filter(record => record && typeof record.name === 'string')
        .map(record => ({
          name: record.name,
          type: typeof record.patronType === 'string' ? record.patronType : null,
          visits: Number.isFinite(record.visitCount) ? record.visitCount : null,
          tips: Number.isFinite(record.totalTipped) ? record.totalTipped : null,
          lastDay: Number.isInteger(record.lastVisitDay) ? record.lastVisitDay : null,
          maxStage: typeof record.maxStageReached === 'string' ? record.maxStageReached : null,
          intent: typeof record.intent === 'string' ? record.intent : null,
          tacticStyle: typeof record.tacticStyle === 'string' ? record.tacticStyle : null,
          boldness: Number.isFinite(record.boldness) ? record.boldness : null,
          charm: Number.isFinite(record.charm) ? record.charm : null,
          chemistry: Number.isFinite(record.chemistry) ? record.chemistry : null,
          attributes: record.attributes && typeof record.attributes === 'object' &&
            !Array.isArray(record.attributes) ? Object.fromEntries(attributeNames
              .filter(key => Number.isFinite(record.attributes[key]))
              .map(key => [key, record.attributes[key]])) : null,
          personaTags: Array.isArray(record.personaTags) ? record.personaTags
            .filter(tag => typeof tag === 'string') : null,
          platonic: Number.isFinite(record.platonic) ? record.platonic : null,
          romantic: Number.isFinite(record.romantic) ? record.romantic : null,
          sexual: Number.isFinite(record.sexual) ? record.sexual : null,
          kindnessCount: Number.isFinite(record.kindnessCount) ? record.kindnessCount : null,
          mistreatmentCount: Number.isFinite(record.mistreatmentCount) ? record.mistreatmentCount : null,
          lastMistreatmentDay: Number.isInteger(record.lastMistreatmentDay) ? record.lastMistreatmentDay : null,
          maxOfferTierAccepted: Number.isFinite(record.maxOfferTierAccepted) ? record.maxOfferTierAccepted : null,
          source: customs.has(record.name) || retired.has(record.name) ? 'custom' :
            Object.hasOwn(overrides, record.name) ? 'override' : 'original',
          retired: retired.has(record.name) && !customs.has(record.name),
          encounters: intimateByPatron.get(record.name) || []
        })),
      currentCustomers: currentCustomers.length,
      undoDepth: Array.isArray(root.undoStack) ? root.undoStack.length : 0,
      observerData: state.modData?.wwObserver ?? null
    };
  };

  const store=re;let subscriptions=0;
  const wwObserverBridge2107={version:'1.0.0',checkpoint:'2026-09-30',snapshot:wwObserverSnapshot2107,command:wwObserverCommand2107,
    read:()=>wwObserverSnapshot2107(store.getState()),getState:()=>store.getState().state,getModData:()=>store.getState().state.modData||{},
    subscribe(listener){subscriptions++;const off=store.subscribe((next,prior)=>listener({...wwObserverSnapshot2107(next),loadReset:next.undoStack!==prior.undoStack&&next.undoStack?.length===0&&next.state!==prior.state},wwObserverSnapshot2107(prior)));let live=true;return()=>{if(live){live=false;subscriptions--;off();}};},
    noteDayClose(state){window.WWGameRuntime?.noteDayClose(state);},
    writeObserver(update){const state=store.getState().state,current=state.modData?.wwObserver;
      if(current?.schemaVersion&&current.schemaVersion!==1)return false;const next=update(current);
      if(next===current)return false;if(!next||next.schemaVersion!==1||!Array.isArray(next.daily))throw Error('Invalid Observer namespace');
      const draft={...state,modData:{...state.modData,wwObserver:next}};if(!koValidSaveState175(draft))throw Error('Invalid original game state');
      store.setState({state:draft});return true;},
    diagnose:()=>({originalStore:true,saveSchema:Xg,namespace:'state.modData.wwObserver',activeSubscriptions:subscriptions,commandTracking:true})
  };
  const originalImport=zCe;
  zCe=function(text){const state=originalImport.apply(this,arguments);if(!state||state.modData?.wwObserver)return state;
    try{const parsed=JSON.parse(text),legacy=parsed.modData?.wwObserver||parsed.state?.modData?.wwObserver;
      if(legacy&&typeof legacy==='object'&&!Array.isArray(legacy))return{...state,modData:{...state.modData,wwObserver:JSON.parse(JSON.stringify(legacy))}};
    }catch(_){}return state;};
  Object.defineProperty(window,'WWObserverBridge',{configurable:true,value:Object.freeze(wwObserverBridge2107)});
  window.WW_Observer_CP2107_Bridge=window.WWObserverBridge;window.dispatchEvent(new Event('WWObserverBridgeReady'));
}

}
