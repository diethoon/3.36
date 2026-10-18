// The installer put one call into the game's image prompt composer (just before the parts are joined):
// WW_PromptManager.applyParts(key, parts, compose, meta) — it saves the parts and swaps in saved rules.
// The composer returns its parts, so here the same thing happens right after it: apply the rules to the
// returned parts, then rebuild the prompt (and the settings read from it) the way the composer does.
const LG = globalThis.__WML_LEGACY__;
api.hook(LG.name('bL'), {
  after(result, args) {
    if (!result || !Array.isArray(result.parts) || !window.WW_PromptManager) return result;
    const [wife, room] = args, scene = wife && wife.sceneOverride;
    const join = list => LG.get('Ile')(room, LG.get('dL')(list.map(p => p.tags).filter(Boolean).join(', ')));
    const archetype = wife && (wife.generatedArchetype ?? (wife.archetypeId ? LG.get('tl')(wife.archetypeId) : undefined));
    const prefix = LG.get('iy');
    const parts = result.parts.map(p => ({ ...p }));
    try {
      window.WW_PromptManager.applyParts(result.key, parts, join, {
        imageBase: archetype?.imageBase ?? LG.get('E$'),
        basicPrefix: scene ? prefix : `${prefix}, solo`,
      });
    } catch (e) { console.warn('[prompt-manager]', e); return result; }
    if (parts.every((p, i) => p.tags === result.parts[i].tags)) return result;
    const prompt = join(parts);
    return { ...result, prompt, parts, genParams: LG.get('iL')(prompt) };
  },
});
