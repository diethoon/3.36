// What the 9-30 mod manager changed in the game's customer flow for the editor ("방문 · 뒷방 · 숙박 설정"),
// redone as WML hooks. The editor writes its options into __WAYWARD_ADDON_API__.customerFlow.options.
const LG = globalThis.__WML_LEGACY__;
const raw = LG.name, G = LG.get;
function wwCustomerOption(key, fallback) {
  const v = globalThis.__WAYWARD_ADDON_API__?.customerFlow?.options?.[key];
  return v ?? fallback;
}
function wwCustomerCount(state) { return state.customers.filter(customer => customer.status !== 'gone').length; }
function wwCustomerHasSpace(state, size) { return wwCustomerCount(state) + size <= wwCustomerOption('maxCustomers', 8); }
function wwCustomerArrivalAllowed(state) { return state.slot % wwCustomerOption('arrivalInterval', 1) === 0 && wwCustomerHasSpace(state, 1); }
const liveState = () => { try { return G('re').getState().state; } catch { return null; } };

// ordinary arrivals: the editor's cap, interval and arrival multiplier (the game caps at 8)
api.hook(raw('nae'), {
  around(next, slot, service, count, renown = 50, scale = 1) {
    const state = liveState();
    if (state && !wwCustomerArrivalAllowed(state)) return false;
    const n = state ? wwCustomerCount(state) : count;
    if (n >= wwCustomerOption('maxCustomers', 8)) return false;
    return Math.random() < G('f$')(slot) * G('aae')(service) * G('iae')(renown) * scale * wwCustomerOption('arrivalMultiplier', 1);
  },
});
// men who come because of a bill or a hail: same gate and multiplier
api.hook(raw('vpe'), {
  around(next, state, chance) {
    if (!wwCustomerArrivalAllowed(state)) return null;
    return next(state, chance * wwCustomerOption('arrivalMultiplier', 1));
  },
});

// custom patrons from the editor ("사용자 손님") and per-name overrides
function wwCustomerApplyProfile(generated, state, usedNames, reason) {
  const roster = state?.editorCustomers;
  if (!roster || !generated) return generated;
  const ordinaryNewArrival = reason == null && Object.hasOwn(generated, 'drawnBy') &&
    !(state.patronRecords ?? []).some(record => record.name === generated.name);
  const custom = ordinaryNewArrival && Array.isArray(roster?.customs) ? roster.customs.filter(profile =>
    profile && typeof profile.name === 'string' && !usedNames.includes(profile.name) &&
    !(state.patronRecords ?? []).some(record => record.name === profile.name && record.turnedOut?.count > 0) &&
    Number(profile.weight) > 0) : [];
  let profile = null;
  if (custom.length && Math.random() * 100 < Math.max(0, Math.min(100, Number(roster.share) || 0))) {
    const total = custom.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
    let roll = Math.random() * total;
    for (const entry of custom) { roll -= Math.max(0, Number(entry.weight) || 0); if (roll < 0) { profile = entry; break; } }
    profile ??= custom[custom.length - 1];
  }
  if (!profile && roster?.overrides && Object.hasOwn(roster.overrides, generated.name)) profile = roster.overrides[generated.name];
  if (!profile) return generated;
  const min = Math.max(0, Math.min(500, Math.round(Number(profile.walletMin) || 0)));
  const max = Math.max(min, Math.min(500, Math.round(Number(profile.walletMax) || min)));
  return { ...generated, name: profile.name || generated.name,
    patronType: profile.patronType || generated.patronType,
    intent: profile.intent || generated.intent,
    tacticStyle: profile.tacticStyle || generated.tacticStyle,
    boldness: Number.isFinite(profile.boldness) ? profile.boldness : generated.boldness,
    charm: Number.isFinite(profile.charm) ? profile.charm : generated.charm,
    chemistry: Number.isFinite(profile.chemistry) ? profile.chemistry : generated.chemistry,
    walletGold: min + Math.floor(Math.random() * (max - min + 1)),
    attributes: { ...generated.attributes, ...profile.attributes },
    personaTags: Array.isArray(profile.personaTags) ? [...profile.personaTags] : generated.personaTags };
}
api.hook(raw('Pm'), {
  after(generated, [slot, usedNames = [], records, reputation, state, reason]) {
    return state ? wwCustomerApplyProfile(generated, state, usedNames, reason) : generated;
  },
});

// lodgers: room-booking chance x the editor's multiplier, and only when there is room for one more
api.hook(raw('L6'), {
  after(chance) {
    const state = liveState();
    if (state && !wwCustomerHasSpace(state, 1)) return 0;
    return Math.min(1, chance * wwCustomerOption('lodgingMultiplier', 1));
  },
});

// back-room parties and long stays: weight x multiplier, and the whole party must fit
const wwCustomerPartySizes = { town_meeting: 4, merchants_visit: 5, soldiers_billet: 6, noble_visit: 4, smuggler_negotiation: 4, quiet_pair: 2 };
for (const scenario of G('MY') || []) {
  const size = wwCustomerPartySizes[scenario.id];
  const lodging = scenario.id === 'long_term_renter';
  if (!size && !lodging) continue;
  const weight = scenario.weight;
  const eligible = scenario.eligible;
  Object.defineProperty(scenario, 'weight', { configurable: true, get: () => weight * wwCustomerOption(lodging ? 'lodgingMultiplier' : 'backroomMultiplier', 1) });
  scenario.eligible = function (state) { return wwCustomerHasSpace(state, size || 1) && eligible.call(this, state); };
}
api.hook(raw('LIe'), {
  around(next, state, choice) {
    const match = /^scenario_(town_meeting|merchants_visit|soldiers_billet|noble_visit|smuggler_negotiation|quiet_pair)_(agree|charge|welcome|take)$/.exec(choice);
    const size = match ? wwCustomerPartySizes[match[1]] : choice === 'scenario_long_term_renter_accept' ? 1 : 0;
    if (size && !wwCustomerHasSpace(state, size)) return G('j')(state, '손님 정원이 부족합니다. 방문 설정의 한도를 늘리거나 이용 요청을 거절해 주세요.');
    return next(state, choice);
  },
});
