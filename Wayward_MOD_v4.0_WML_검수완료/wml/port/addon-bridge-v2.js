/* --- Wayward vanilla addon bridge --- */
const waywardAddonApi = Object.assign(globalThis.__WAYWARD_ADDON_API__ || {}, {
  ue: re,
  customerFlow: { version: 1, options: {} },
  /* --- Debug tools bridge (Debug_Decision / Patron_Control / Heroine_Debug) --- */
  decision: {
    build: '2026-09-30',
    get resolve() { return typeof JSe === 'function' ? JSe : null; },
    set resolve(value) { if (typeof value === 'function' && typeof JSe === 'function') JSe = value; },
    // The game's resolver as it was before any external addon wrapped it.
    original: typeof JSe === 'function' ? JSe : null,
    // Addons that pin an outcome for some checks register (state, category, ctx) => outcome | null here,
    // so other decision addons can leave those checks alone.
    pins: [],
    get categories() { return typeof Co === 'object' ? Co : {}; },
    categoryLabel: key => typeof u === 'object' && typeof u?.koLabel === 'function' ? u.koLabel('category', key) : String(key ?? ''),
    contributionLabel: label => typeof ko14Contribution === 'function' ? ko14Contribution(label) : label
  },
  // Her body, as the WW cheat shows it: conditioning tops out at rQ (from libido); zb lists what weighs on her,
  // dT is her worst soreness and bh how worn/sated she is right now.
  heroine: {
    // be: where she is; bt: move her (the game's own move: bath/bathroom side effects, outfit and modesty checks).
    location: state => be(state),
    playerLocation: state => vt(state),
    moveTo: (state, room) => bt(state, room, void 0),
    // Za: her seven drives are not stored; they are computed from other values whenever her own actions are picked.
    get driveCalc() { return typeof Za === 'function' ? Za : null; },
    set driveCalc(value) { if (typeof value === 'function' && typeof Za === 'function') Za = value; },
    conditioningMax: her => rQ(her),
    bodySummary: state => {
      const her = g(state);
      return { condition: zb(state), pain: dT(her), fatigue: bh(her, state.slot) };
    }
  },
  // The player's actions toward her go through Lve(state, actionId, extra). Some are rule-based
  // (no JSe score) and three gates can answer before JSe: Ks (annoyance), ZB (repetition), $s (in public).
  playerAction: {
    build: '2026-09-30',
    get respond() { return typeof Lve === 'function' ? Lve : null; },
    set respond(value) { if (typeof value === 'function' && typeof Lve === 'function') Lve = value; },
    get touchedOut() { return typeof Ks === 'function' ? Ks : null; },
    set touchedOut(value) { if (typeof value === 'function' && typeof Ks === 'function') Ks = value; },
    get topicFatigue() { return typeof ZB === 'function' ? ZB : null; },
    set topicFatigue(value) { if (typeof value === 'function' && typeof ZB === 'function') ZB = value; },
    get publicRefusal() { return typeof $s === 'function' ? $s : null; },
    set publicRefusal(value) { if (typeof value === 'function' && typeof $s === 'function') $s = value; },
    isIntimate: id => (typeof Pve === 'object' && Pve.has(id)) || /^(press_|deceive_)/.test(String(id ?? '')),
    actionLabel: id => (typeof CC !== 'undefined' && Array.isArray(CC) ? CC.find(action => action.id === id)?.label : null) ?? String(id ?? '')
  },
  // A patron's scene with her: Fo starts it; each minute sy(scene, customer, her, state) rolls whether
  // he tries something, and Vae picks the move from Yae's weighted table.
  patronControl: {
    build: '2026-09-30',
    get stages() { return typeof ne !== 'undefined' && Array.isArray(ne) ? [...ne] : []; },
    stageLabel: (stage, name) => typeof kF === 'function' ? kF(stage, name) : String(stage ?? ''),
    start: (state, customerId) => Fo(state, customerId),
    scene: state => Y(state) ?? null,
    wifeLocation: state => be(state),
    customerLocation: (state, customerId) => ht(state, customerId),
    moves: (state, scene, customer) => Yae(state, scene, customer, ge(state)),
    get attemptRoll() { return typeof sy === 'function' ? sy : null; },
    set attemptRoll(value) { if (typeof value === 'function' && typeof sy === 'function') sy = value; },
    get chooseMove() { return typeof Vae === 'function' ? Vae : null; },
    set chooseMove(value) { if (typeof value === 'function' && typeof Vae === 'function') Vae = value; },
    playerAway: state => Lt(state),
    // Lunge (skipping stages without asking): Dae decides it inside Oae; refusals go to N6, which rolls
    // zue (does he push), I6 (does she yield), Ja (strength contest) and Que (does he relent).
    get lungePlan() { return typeof Dae === 'function' ? Dae : null; },
    set lungePlan(value) { if (typeof value === 'function' && typeof Dae === 'function') Dae = value; },
    get refusalResponse() { return typeof N6 === 'function' ? N6 : null; },
    set refusalResponse(value) { if (typeof value === 'function' && typeof N6 === 'function') N6 = value; },
    get pushChance() { return typeof zue === 'function' ? zue : null; },
    set pushChance(value) { if (typeof value === 'function' && typeof zue === 'function') zue = value; },
    get yieldRoll() { return typeof I6 === 'function' ? I6 : null; },
    set yieldRoll(value) { if (typeof value === 'function' && typeof I6 === 'function') I6 = value; },
    get strengthContest() { return typeof Ja === 'function' ? Ja : null; },
    set strengthContest(value) { if (typeof value === 'function' && typeof Ja === 'function') Ja = value; },
    get relentChance() { return typeof Que === 'function' ? Que : null; },
    set relentChance(value) { if (typeof value === 'function' && typeof Que === 'function') Que = value; },
    // Each minute of a scene, before he acts, BW runs exits that skip the acceptance check:
    // kue (she breaks free within 15 minutes of being coerced) and vue (she stops because people are watching).
    get coercionEscape() { return typeof kue === 'function' ? kue : null; },
    set coercionEscape(value) { if (typeof value === 'function' && typeof kue === 'function') kue = value; },
    get shameStop() { return typeof vue === 'function' ? vue : null; },
    set shameStop(value) { if (typeof value === 'function' && typeof vue === 'function') vue = value; },
    // b$e: with her family or friends in the room she re-checks the current act (J5 -> JSe) and stops on a refusal.
    get acquaintanceStop() { return typeof b$e === 'function' ? b$e : null; },
    set acquaintanceStop(value) { if (typeof value === 'function' && typeof b$e === 'function') b$e = value; },
    // n2(state, scene, intent, her) returns an end reason (patron_climax / patron_satisfied / patron_gave_up) or null.
    get naturalEnd() { return typeof n2 === 'function' ? n2 : null; },
    set naturalEnd(value) { if (typeof value === 'function' && typeof n2 === 'function') n2 = value; },
    // R$e: on a quiet minute (he did nothing else) from bold_touch on, he may try to undo her clothes.
    get undressAttempt() { return typeof R$e === 'function' ? R$e : null; },
    set undressAttempt(value) { if (typeof value === 'function' && typeof R$e === 'function') R$e = value; },
    // Small requests (CTe, picked by MTe on a quiet minute, 15%): "sit on my lap", "show me under the dress"...
    // y$e (his tactic for the minute) runs first; MTe only gets a turn when it returns nothing.
    get smallRequest() { return typeof MTe === 'function' ? MTe : null; },
    set smallRequest(value) { if (typeof value === 'function' && typeof MTe === 'function') MTe = value; },
    get patronTactic() { return typeof y$e === 'function' ? y$e : null; },
    set patronTactic(value) { if (typeof value === 'function' && typeof y$e === 'function') y$e = value; },
    requestTable: () => (typeof CTe !== 'undefined' && Array.isArray(CTe) ? CTe : []),
    // His tactics (y$e picks one from c$e); "take_to_back" asks her to the back room.
    tacticTable: () => (typeof c$e !== 'undefined' && Array.isArray(c$e) ? c$e : []),
    // wr: the back room is free and ready and she is in the hall (needed for either back-room proposal).
    backRoomOpen: state => wr(state),
    // yue: in the hall, when it turns mortifying in front of people (Gs witnesses, kT mortifying), she proposes the back room.
    get herBackRoomProposal() { return typeof yue === 'function' ? yue : null; },
    set herBackRoomProposal(value) { if (typeof value === 'function' && typeof yue === 'function') yue = value; },
    get witnessesFor() { return typeof Gs === 'function' ? Gs : null; },
    set witnessesFor(value) { if (typeof value === 'function' && typeof Gs === 'function') Gs = value; },
    get mortifyingCheck() { return typeof kT === 'function' ? kT : null; },
    set mortifyingCheck(value) { if (typeof value === 'function' && typeof kT === 'function') kT = value; },
    // _ue: his own back-room proposal event (18% a minute while the player is there); the scene keeps its stage.
    get patronBackRoomProposal() { return typeof _ue === 'function' ? _ue : null; },
    set patronBackRoomProposal(value) { if (typeof value === 'function' && typeof _ue === 'function') _ue = value; },
    backRoomProposalStages: () => (typeof x6 !== 'undefined' ? [...x6] : []),
    // Qie: during rubbing he slips inside when she is bared; VH/EH decide how she takes it (not her acceptance check).
    get pushIn() { return typeof Qie === 'function' ? Qie : null; },
    set pushIn(value) { if (typeof value === 'function' && typeof Qie === 'function') Qie = value; },
    get pushInReaction() { return typeof VH === 'function' ? VH : null; },
    set pushInReaction(value) { if (typeof value === 'function' && typeof VH === 'function') VH = value; },
    get pushInAnalReaction() { return typeof EH === 'function' ? EH : null; },
    set pushInAnalReaction(value) { if (typeof value === 'function' && typeof EH === 'function') EH = value; },
    bareForPushIn: exposure => I$(exposure),
    // a$e (his "offer_gold" tactic) offers money for one favor from UC; these are the rules it filters by.
    favorTable: () => (typeof UC !== 'undefined' && Array.isArray(UC) ? UC : []),
    favorCheck: (state, scene) => {
      const her = g(state), stageCat = so[scene.stage];
      const floor = Math.max(stageCat ? Nl(stageCat) : -1, ...(scene.given ?? []).map(c => Nl(c)));
      const refused = new Set(scene.refusedExplicitFavorIds ?? []);
      return UC.map(f => {
        const reasons = [];
        if (!f.stages.includes(scene.stage)) reasons.push('stage');
        if (f.wearing && !f.wearing.every(p => yr(her.outfit, her.exposure, p))) reasons.push('wearing');
        if (Nl(f.category) <= floor) reasons.push('too_easy');
        if (refused.has(f.id)) reasons.push('refused');
        return { id: f.id, desc: f.desc, category: f.category, difficulty: Nl(f.category), priceRange: f.priceRange, exposure: f.exposureOnAccept ?? null, stages: f.stages, ok: reasons.length === 0, reasons };
      });
    },
    // lS: each minute one crowd watcher may join in (possessive primary, charm roll, rate, willingness, then a slot she accepts).
    get joinRoll() { return typeof lS === 'function' ? lS : null; },
    set joinRoll(value) { if (typeof value === 'function' && typeof lS === 'function') lS = value; },
    joinInfo: (state, scene) => {
      const primary = scene.kind === 'solo' || scene.kind === 'husband_led' ? null : state.customers.find(c => c.id === scene.customerId);
      const possessive = primary ? Xne(state, primary) : null;
      return {
        stageAllows: !!ZP[scene.stage], coerced: fs(scene, state.slot), hasPrimary: !!primary,
        joinOdds: possessive ? possessive.joinOddsMult : 1, hardBlock: !!possessive?.hardBlock,
        openSlots: bre[scene.stage] ? eH(scene, scene.stage, { ...(scene.joinedPatronSlots ?? {}) }, Om(g(state)).baredBelow) : [],
        rate: yre + state.tavernReputation.notoriety * .0012
      };
    },
    joinerComfort: (state, customer) => Vc(state, customer),
    joinerCharmGate: (state, customer) => customer.charm * .4 + 50 + state.tavernReputation.notoriety * .3,
    sceneLocation: state => et(state),
    // Korean patch only: the speech level a patron's lines are rewritten into (plain · polite · hage · hao).
    voiceProfile: (state, ref) => (typeof koProfile137 === 'function' ? koProfile137(state, ref) : null),
    // y$: during a scene his intent may step up one level (talk → flirt → interested → predatory), 4% × score a minute.
    get intentEvolve() { return typeof y$ === 'function' ? y$ : null; },
    set intentEvolve(value) { if (typeof value === 'function' && typeof y$ === 'function') y$ = value; },
    intentLevels: () => [...hm],
    intentShiftInfo: (state, customer, scene) => {
      const intent = customer.intent ?? 'interested', her = ge(state), bare = Qs(her.outfit, her.exposure);
      const exposure = bare === 3 ? 4 : bare === 2 ? 3 : bare;
      const again = bare >= 2 && hm.indexOf(intent) < hm.indexOf('interested');
      const parts = { comfort: scene.elenaComfort >= 60 ? 1 : 0, rounds: customer.roundsOrdered >= 3 ? 1 : 0, encouraged: scene.playerEncouragements >= 2 ? 1 : 0, exposure };
      const score = parts.comfort + parts.rounds + parts.encouraged + parts.exposure;
      const blocked = intent === 'predatory' ? 'top' : customer.intentEvolved && !again ? 'used' : null;
      return { intent, next: intent === 'predatory' ? null : Pae(intent), parts, score, chance: blocked ? 0 : .04 * score, blocked };
    },
    // Upstairs rooms: G6 (room 1) and n7 (room 2) pick a renter when service opens (chance L6, 35% + renown/190, max 95%).
    // A renter is a resident customer (stays, sleeps upstairs); yfe settles room 1 each morning by nightsRemaining.
    lodging: state => {
      const t = Xa(state), listing = t.roomListing ?? 'closed';
      return {
        listing, chance: listing === 'closed' ? 0 : L6(listing, state.tavernReputation.renown ?? 0),
        rentRange: Zme[listing] ?? [10, 22], personas: efe[listing] ?? efe.respectable ?? [],
        rooms: [
          { key: 'tonightRenter', room: 'upstairs_hall', built: !!t.hasRoom, renter: t.tonightRenter ?? null },
          { key: 'tonightRenter2', room: 'upstairs_room_2', built: !!t.hasRoom2, renter: t.tonightRenter2 ?? null }
        ],
        history: t.renterHistory ?? {}
      };
    },
    // Puts a patron in a room now, the way G6 does: a present customer becomes resident, a name from the records is
    // brought in as a new resident customer; the rent is paid on arrival.
    assignRenter: (state, key, pick) => {
      const t = Xa(state);
      if (key !== 'tonightRenter' && key !== 'tonightRenter2') return state;
      const present = pick.customerId ? state.customers.find(c => c.id === pick.customerId) : null;
      const name = present ? present.name : pick.name;
      if (!name) return state;
      const renter = { name, personaTag: pick.personaTag, rentPaid: Math.max(0, Math.round(pick.rent ?? 0)), nightsRemaining: Math.max(1, Math.round(pick.nights ?? 1)), visitCount: ((t.renterHistory ?? {})[name] ?? 0) + 1 };
      let next = state;
      if (present) {
        next = { ...next, customers: next.customers.map(c => c.id === present.id ? { ...c, isResident: !0, stayTimer: 999, maxRounds: Math.max(8, c.maxRounds ?? 0), personaTags: c.personaTags?.length ? c.personaTags : [pick.personaTag] } : c) };
        renter.customerId = present.id;
      } else {
        const customer = fy(next, renter);
        next = Ga(next, customer, 'taproom');
        renter.customerId = customer.id;
      }
      next = { ...next, tavern: { ...Xa(next), [key]: renter } };
      if (renter.rentPaid > 0) next = Qt(next, 'room_rent', renter.rentPaid);
      return next;
    },
    clearRenter: (state, key) => {
      const t = Xa(state), renter = t[key];
      if (!renter) return state;
      let next = { ...state, tavern: { ...t, [key]: void 0 } };
      if (renter.customerId) next = { ...next, customers: next.customers.map(c => c.id === renter.customerId ? { ...c, isResident: !1, stayTimer: Math.min(c.stayTimer ?? 30, 30) } : c) };
      return next;
    },
    // Kge: during service, while she is in the back room, bathhouse or an upstairs room, a drinking patron in the hall
    // may wander in after her (one per minute, up to 3 people there, 2 upstairs).
    get patronDrift() { return typeof Kge === 'function' ? Kge : null; },
    set patronDrift(value) { if (typeof value === 'function' && typeof Kge === 'function') Kge = value; },
    driftInfo: state => {
      const room = be(state), service = state.phase === 'service' || state.phase === 'last_call';
      const roomOk = room === 'back_room' || room === 'bathhouse' || co(room);
      const privateSession = !!state.locations?.[room]?.meta?.privatePatron;
      const people = roomOk ? lo(state, room).filter(id => id !== Me && id !== 'player').length : 0, cap = co(room) ? 2 : 3;
      const solo = Y(state)?.kind === 'solo' ? 3 : 1, notoriety = state.tavernReputation.notoriety;
      const chanceFor = c => qge * (1 + (c.boldness ?? 30) / 80) * (1 + (c.charm ?? 30) / 120) * (1 + notoriety / 150) * solo;
      const eligible = c => (c.status === 'drinking' || c.status === 'wants_more') && ht(state, c.id) === 'taproom' && c.bathReturnSlot == null && !Ea(state, c) && !C3(state, c.id);
      return { room, active: service && roomOk && !privateSession && people < cap, service, roomOk, privateSession, people, cap,
        chances: state.customers.map(c => ({ id: c.id, eligible: eligible(c), chance: chanceFor(c) })) };
    },
    // E$e: a joined patron (group scene) slipping inside from behind; same reactions as Qie.
    get joinerPushIn() { return typeof E$e === 'function' ? E$e : null; },
    set joinerPushIn(value) { if (typeof value === 'function' && typeof E$e === 'function') E$e = value; },
    // Jie: at groping/intimate, once she is bared, he presses himself against her unasked (her rubbing check decides).
    get lineUp() { return typeof Jie === 'function' ? Jie : null; },
    set lineUp(value) { if (typeof value === 'function' && typeof Jie === 'function') Jie = value; },
    // E1e: whether his next step up is asked out loud first ("말해 봐. 넣으라고 해 줘.").
    get verbalAsk() { return typeof E1e === 'function' ? E1e : null; },
    set verbalAsk(value) { if (typeof value === 'function' && typeof E1e === 'function') E1e = value; },
    // Bae: her own step-up roll (Py), checked every gH(stage) minutes; b$ gives the chance and its terms.
    get selfEscalationRoll() { return typeof Bae === 'function' ? Bae : null; },
    set selfEscalationRoll(value) { if (typeof value === 'function' && typeof Bae === 'function') Bae = value; },
    selfEscalationChance: (state, scene) => {
      const customer = state.customers.find(c => c.id === scene.customerId);
      const every = gH(scene.stage, ge(state));
      return { ...b$(scene, customer, ge(state), state), every, minStage: 'flirting' };
    },
    smallRequests: (state, scene) => {
      const her = ge(state), place = et(state), stageIndex = ne.indexOf(scene.stage);
      return (Array.isArray(CTe) ? CTe : []).map((entry, index) => {
        const gap = stageIndex - ne.indexOf(entry.minStage);
        return {
          index, minStage: entry.minStage, minBoldness: entry.minBoldness, category: entry.category,
          exposure: entry.exposureIfAccepted ?? null, gold: entry.goldIfAccepted ?? 0,
          stageOk: gap >= 0 && gap <= RTe, boldOk: (scene.patronBoldness ?? 50) >= entry.minBoldness, placeOk: LT(place, entry.needs),
          text: entry.request(scene.customerName, her.name)
        };
      });
    },
    // Eue closes a back-room private session after its time (22 minutes, extended while busy).
    get privateSession() { return typeof Eue === 'function' ? Eue : null; },
    set privateSession(value) { if (typeof value === 'function' && typeof Eue === 'function') Eue = value; },
    privateSessionInfo: state => Tw(state) ?? null,
    // An(scene, stage, her, opts) moves a scene to a stage; for sex_patron it sets primarySlot from opts.slot,
    // else "astride" when she led (bySelf) and "inside" otherwise. k$ draws his pick from zae's weights.
    get stageChange() { return typeof An === 'function' ? An : null; },
    set stageChange(value) { if (typeof value === 'function' && typeof An === 'function') An = value; },
    positionWeights: customer => zae(customer),
    // vh: a patron who climaxed recently cannot offer hand/mouth/rubbing/sex acts until rested (Ef >= RP).
    patronStamina: (state, customer) => ({ value: Ef(customer, state.slot), needed: RP, able: vh(customer, state.slot) }),
    // One minute of the scene with the player present (BW), as a pure state -> state step; used for dry runs.
    sceneMinute: state => BW(state),
    slotFree: (scene, slot) => Cx(scene, 'sex_patron', slot),
    // Bring a past patron back from his record, the way Cheat Ledger does: rH rebuilds him, Ga seats him,
    // GM writes the arrival line, wbe adds the regular's flavor and KV syncs who is present.
    invitePatron: (state, name, intent) => {
      const record = (state.patronRecords ?? []).find(r => r.name === name);
      if (!record) return { state, error: 'missing' };
      if (state.phase !== 'service') return { state, error: 'phase' };
      if (typeof koCollector170 === 'function' && koCollector170(record)) return { state, error: 'collector' };
      if (state.customers.some(c => c.name === name && c.status !== 'gone' && c.status !== 'leaving')) return { state, error: 'present' };
      const limit = typeof wwCustomerOption === 'function' ? wwCustomerOption('maxCustomers', aH) : aH;
      if (state.customers.filter(c => c.status !== 'gone' && c.status !== 'leaving').length >= limit) return { state, error: 'full' };
      let customer = rH(record, state.slot, state);
      if (intent && intent !== 'normal') customer = { ...customer, intent, tacticStyle: m$(customer.patronType, intent) };
      let next = Ga(state, customer, 'taproom');
      next = j(next, GM(customer, record, ge(next)?.name ?? '그녀', next.slot));
      try { next = wbe(next, customer); } catch {}
      try { next = KV(next); } catch {}
      return { state: next, customer };
    },
    // Ft moves a customer between rooms and logs "name → room" like the game does.
    moveCustomer: (state, customerId, room) => Ft(state, customerId, room),
    // Why the patron in the scene can or cannot lunge, following Dae and uw step by step.
    lungeInfo: state => {
      const scene = Y(state);
      if (!scene) return null;
      const customer = state.customers.find(c => c.id === scene.customerId), wife = ge(state);
      const stageIndex = ne.indexOf(scene.stage), next = stageIndex + 1, gropingIndex = ne.indexOf('groping');
      const intent = customer?.intent;
      const triggerExposure = $T(wife.outfit, wife.exposure), exposure = Qs(wife.outfit, wife.exposure);
      const norm = customer ? qb(state, customer) : null;
      const intentCap = ne.indexOf(Mae[intent ?? 'interested'] ?? 'sex_patron');
      const ceiling = uw(intent, scene, wife, norm ?? void 0);
      const room = Math.min(ne.length - 1, ceiling) - next;
      let drive = (scene.patronBoldness - 60) / 40;
      intent === 'predatory' && (drive += .35), triggerExposure >= 2 && (drive += .35), drive += Hm(scene, wife).count * .08;
      const target = ne[Math.min(ne.length - 1, next + Math.max(1, room))];
      return {
        stage: scene.stage, stageIndex, nextStage: ne[next] ?? null, early: stageIndex < gropingIndex,
        triggers: { bold: scene.patronBoldness >= 60, predatory: intent === 'predatory', exposed: triggerExposure >= 2 },
        boldness: scene.patronBoldness, intent, intentCap: ne[intentCap], norm: norm == null ? null : ne[norm],
        elenaInitiated: !!scene.elenaInitiated, talkOnly: intent === 'talk_only' || intent === 'drink_only',
        bonuses: { comfort: scene.elenaComfort >= 65, arousal: wife.stats.arousal >= 55, intoxication: (wife.intoxication?.level ?? 0) >= 30, encouraged: scene.playerEncouragements >= 2, exposure },
        ceiling: ne[Math.min(ne.length - 1, ceiling)], room, drive: z(drive, 0, 1),
        cunning: customer ? yd(customer).cunning : null,
        pushChance: customer ? zue(customer, pd(state, customer), target) : 0, pushTarget: target,
        decidedTonight: customer?.forceDecidedTonight ?? null
      };
    },
    // Same candidate rules FW uses when it rolls a random patron event (minus the random pick).
    eventCandidates: (state, customerId) => {
      const e = state, p = e.customers.find(c => c.id === customerId);
      if (!p) return { blocked: 'missing', candidates: [] };
      if (e.pendingEvent) return { blocked: 'pending_event', candidates: [] };
      if (Ye(e)) return { blocked: 'sex_scene', candidates: [] };
      const o = Lt(e), s = !!Y(e), i = vr(g(e));
      if (Y(e)?.customerId === p.id) return { blocked: 'in_scene', candidates: [] };
      const present = ['drinking', 'greeted', 'ordered', 'wants_more'].includes(p.status) && ht(e, p.id) === be(e);
      if (!present) return { blocked: 'absent', candidates: [] };
      if (Ea(e, p) && !s) return { blocked: 'back_room_party', candidates: [] };
      const T = p.intent ?? 'interested', I = T5e(e, i, T);
      const N = T !== 'drink_only' && (!s || I) && !p.hadInteractionThisVisit;
      const E = !o && St(e), R = T !== 'drink_only' && !s && E, B = !s && E, D = B || o;
      const W = p.walletGold > 0, V = be(e) === 'taproom';
      const record = e.patronRecords.find(r => r.name === p.name);
      const J = (p.mistreatmentTonight ?? 0) > 0 || p.forceDecidedTonight != null && p.forceDecidedTonight !== 'none' || (record?.turnedOut?.night ?? -1 / 0) >= go(e.slot) - 1;
      const A = V && !J, C = Zb(e, p), H = z(1 + C, w5e, k5e), q = z(1 - 2 * C, v5e, x5e);
      const O = [...A ? [{ type: 'compliment', weight: 25 * H }] : [], ...A && W ? [{ type: 'generous_tip', weight: 20 * H }] : [], ...V ? [{ type: 'rude', weight: 15 * q }] : [], ...R ? [{ type: 'flirt', weight: 15 }] : [], ...N ? [{ type: 'patron_approach', weight: I ? 35 : 20 }] : [], ...A ? [{ type: 'drink_offer', weight: 12 * H }] : []];
      if (p.roundsOrdered >= 2 && (T !== 'drink_only' && T !== 'talk_only' && !s && E && O.push({ type: 'handsy_drunk', weight: 15 }), N)) {
        const rate = T === 'predatory' ? .4 : T === 'interested' ? .3 : .15, allure = I ? Math.floor(i * .25) : 0, stage = Y(e)?.stage;
        const notoriety = I && stage && ['flirting', 'light_touch', 'bold_touch', 'groping', 'intimate', 'handjob_patron', 'blowjob_patron', 'sex_patron'].includes(stage) ? Math.floor(e.tavernReputation.notoriety * .25) : 0;
        ya(O, 'patron_approach', Math.floor(p.boldness * rate) + allure + notoriety);
      }
      if (V && D && (W && T !== 'drink_only')) {
        let weight = Math.max(2, Math.round(p.boldness * .16));
        p.roundsOrdered >= 1 && (weight += 2), T === 'predatory' ? weight += 4 : T === 'interested' && (weight += 2), p.patronType === 'wealthy_pervert' ? weight += 8 : p.patronType === 'nobleman' ? weight += 6 : p.patronType === 'charmer' && (weight += 2), o && (weight = Math.round(weight * 2.6));
        O.push({ type: 'patron_offer', weight });
      }
      V && B && record && ['groping', 'intimate', 'handjob_patron', 'blowjob_patron', 'sex_patron'].includes(record.maxStageReached) && O.push({ type: 'patron_brag', weight: Math.floor(e.tavernReputation.notoriety * .2) + 5 });
      V && record && record.visitCount > 1 && O.push({ type: 'returning_patron_reference', weight: 22 });
      (p.mood === 'annoyed' || p.mood === 'angry') && ya(O, 'rude', 15);
      (p.mood === 'good' || p.mood === 'great') && (ya(O, 'generous_tip', 10), ya(O, 'compliment', 10));
      e.tavernCleanliness > 70 && ya(O, 'compliment', 10);
      const tipsy = uh(g(e));
      tipsy >= 15 && (ya(O, 'flirt', Math.floor(tipsy * .5)), ya(O, 'generous_tip', Math.floor(tipsy * .2)));
      tipsy >= 40 && (ya(O, 'handsy_drunk', Math.floor(tipsy * .3)), ya(O, 'compliment', Math.floor(tipsy * .15)));
      return { blocked: null, candidates: Ea(e, p) ? O.filter(c => c.type === 'patron_approach') : O };
    },
    // Runs one picked event the way FW and the player-present tick (BEe) would.
    fireEvent: (state, type, customerId) => {
      const e = state, p = e.customers.find(c => c.id === customerId);
      if (!p) return state;
      const U = type;
      if (U === 'patron_approach') return Y(e) ? WW({ ...e, eventsTonight: e.eventsTonight + 1 }, p.id) : Fo({ ...e, eventsTonight: e.eventsTonight + 1 }, p.id);
      if (b5e.includes(U)) {
        const oe = d5e(U, p.id, p.name, e);
        let F = { ...e, eventsTonight: e.eventsTonight + 1 };
        oe.logText && (F = Cn(F, [mo('ambient', oe.logText), ...oe.narrationIds ?? []]));
        Lt(e) ? oe.logText && (F = fo(F, { slot: F.slot, type: 'ambient', text: oe.logText, eventCategory: `ambient:${U}` })) : oe.logText && (F = j(F, oe.logText, `ambient:${U}`));
        // 10-04: resentment only lands when the husband is in the room
        const here = St(e);
        F = at(F, here || !(oe.resentDelta > 0) ? oe : { ...oe, resentDelta: void 0 });
        oe.logText && !Lt(e) && (F = P(F, de => ({ ...de, lastResponse: oe.logText, lastResponseType: oe.response, lastResponseSlot: F.slot })));
        return F;
      }
      const K = N5e(U, p.id, p.name, e);
      let n = K.state;
      const event = K.event;
      if (!event) return n;
      const a = event.type === 'patron_offer' ? n.customers.find(l => l.id === event.customerId) : void 0, i = a ? GH(n, a) : void 0;
      if (a && i?.addressee === 'her') {
        const l = H8(n, a, { husbandPresent: !0 });
        if (l) {
          n = { ...l.state, eventsTonight: l.state.eventsTonight + 1, pendingEvent: void 0 };
          const d = l.outcome === 'eager' || l.outcome === 'hesitant' ? 'taproom_paid_offer_accepted' : 'taproom_paid_offer_self';
          n = l.tier.rank >= c_e ? jt(n, l.combinedText, d) : j(n, l.combinedText, d);
          l.sceneKind && (n = y2(n, l.sceneKind, a.id, a.name, l.gold));
        }
        return n;
      }
      n = { ...n, pendingEvent: event, eventsTonight: n.eventsTonight + 1 };
      n = j(n, event.text);
      i?.addressee === 'player' ? n = yR(n, event.customerName, 'asked_you') : event.type === 'patron_brag' && (n = yR(n, event.customerName, 'brag'));
      return n;
    }
  },
  /* --- End debug tools bridge --- */
  /* --- Maid/Slave/Newwife/Outfit compat (2026-09-30 names, from Install_Addons_Vanilla) --- */
  Aj: bL, of: ub, version: '2026-09-30', wives: Zl, wifeById: tl, wifePreview: _he, imageBackend: ph,
  outfits: eh, imageRoom: hhe, manaMax: rs, re: re, hc: eh,
  g: g,
  B: Y,
  _t: (state, characterId) => characterId === 'player' ? vt(state) : Ce(state, characterId),
  Mt: Qt,
  Ot: Bt,
  vt: Rt, ND: C9, Oe: be, ho: Ft, St: bt,
  Koe: Qhe, Cj: _L, Nj: gL, pp: key => dp(key, { nearest: true }), R0: v0, Ji: wc,
  Va: Xi, uM: f2e, H2: mY, R2: nY,
  brothel: {
    build: '2026-09-30', imageRoom: hhe, roomLabels: o3,
    log: (state, text, workerId) => Va(state, { text, wwWorkerId: workerId }),
    customerBusy: (state, id) => C3(state, id) || gh(state).has(id),
    roomBusy: (state, room) => {
      const meta = state.locations?.[room]?.meta;
      return !!(meta?.privatePatron && state.slot < meta.privatePatron.returnAtSlot) ||
        !!(meta?.party && state.slot < meta.party.endSlot) ||
        (room === 'bathhouse' && !!Vr(state));
    }
  },
  waitress: {
    chooseOrder: Jre,
    available: _d,
    consume: Pb,
    missing: iO,
    alternative: gT,
    price: pT,
    income: Qt,
    recordDrink: Yb,
    recordWord: r8
  }
});
function wwInstallHomeMinuteTick(value) {
  if (typeof value !== 'function') return;
  const previous = Lf;
  // External employee addons own one home-inn roster and one runtime clock.
  // Rival and temporary partner worlds must use the previous native chain.
  Lf = function(state, ...args) {
    return state?.pmCore ? previous(state, ...args) : value(state, ...args);
  };
}
Object.defineProperty(waywardAddonApi, 'minuteTick', {
  get: () => Lf,
  set: wwInstallHomeMinuteTick
});
Object.defineProperty(waywardAddonApi, 'Ol', {
  get: () => Lf,
  set: wwInstallHomeMinuteTick
});
Object.defineProperty(waywardAddonApi, 'Bb', {
  get: () => Ob,
  set: value => { if (typeof value === 'function') Ob = value; }
});
Object.defineProperty(waywardAddonApi, 'imageKey', {
  enumerable: true,
  get: () => _L,
  set: value => { if (typeof value === 'function') _L = value; }
});
Object.defineProperty(waywardAddonApi, 'imagePrompt', {
  enumerable: true,
  get: () => bL,
  set: value => { if (typeof value === 'function') bL = value; }
});
globalThis.__WAYWARD_ADDON_API__ = waywardAddonApi;
