import { applyYieldsForSubjects } from "./effects/apply-effects.js";
import { PolicyYieldsCache } from "./cache.js";
import { resolveSubjectsWithRequirements } from "./requirements/resolve-subjects.js";
import { PolicyYieldsContext } from "./core/execution-context.js";
import { getCityStateBonusModifier, getModifiersForAttribute, getModifiersForTradition } from "./fetch-modifiers.js";

export function previewPolicyYields(policy) {
    // console.warn("previewPolicyYields for", policy.TraditionType);
    const modifiers = getModifiersForTradition(policy?.TraditionType);
    return previewModifiersYields(modifiers, "Policy " + policy.TraditionType);
}

/**
 * @param {string} attribute The Attribute Type code
 */
export function previewAttributeYields(attribute) {
    const modifiers = getModifiersForAttribute(attribute);
    return previewModifiersYields(modifiers, "Attribute " + attribute);
}

/**
 * Obtains the modifiers resolved for the given CityStateBonusType.
 * @param {string} bonusType
 * @returns {YieldsPreviewResult}
 */
export function previewCityStateBonusYields(bonusType) {
    const modifiers = getCityStateBonusModifier(bonusType);
    return previewModifiersYields(modifiers, "CityStateBonus " + bonusType);
}

/**
 * Obtains the modifiers resolved yields.
 * @param {ResolvedModifier[] | null} modifiers
 * @param {string} description Used to provide debug information in case of errors.
 * @returns {YieldsPreviewResult}
 */
export function previewModifiersYields(modifiers, description) {
    if (!modifiers) {
        return { yields: {}, modifiers: [], isValid: false };
    }

    try {
        // Context
        const yieldsContext = new PolicyYieldsContext();
        const player = Players.get(GameContext.localPlayerID);
        
        modifiers.forEach(modifier => {
            const subjects = resolveSubjectsWithRequirements(player, modifier);
            applyYieldsForSubjects(yieldsContext, subjects, modifier);
        });
        
        const resolvedYields = resolveYields(player, yieldsContext.delta);
        return { 
            yields: resolvedYields, 
            modifiers, 
            isValid: Object.keys(resolvedYields).length > 0 
        };
    }
    catch (/** @type {any} */ error) {
        console.error("Error in Yields preview:", description);
        console.error(error);
        console.error(error.stack);
        return { yields: {}, modifiers, error: error.message, isValid: false };
    }
}

/**
 * @param {YieldsDelta} yieldsDelta 
 * @returns {ResolvedYields}
 */
export function resolveYields(player, yieldsDelta) {
    /** @type {ResolvedYields} */
    const yields = {};
    const CachedPlayerYields = PolicyYieldsCache.getYields();

    for (const type in YieldTypes) {
        if (yieldsDelta.Amount[type] == null && yieldsDelta.Percent[type] == null && yieldsDelta.AmountNoMultiplier[type] == null) {
            continue;
        }
        yields[type] = yieldsDelta.Amount[type] || 0;
        // yields[type] *= 1 + ((CachedPlayerYields[type]?.Percent || 0) / 100);
    }

    for (const type in yieldsDelta.Percent) {
        const baseYield = CachedPlayerYields[type]?.BaseAmount || 0;        
        const increase = (baseYield + yieldsDelta.Amount[type] || 0) * (yieldsDelta.Percent[type] / 100);
        yields[type] += increase;
    }

    // TODO This is probably wrong, since even the previous net yield is probably
    // already including some multiplied / non-multiplied yields.
    for (const type in yieldsDelta.AmountNoMultiplier) {
        yields[type] += yieldsDelta.AmountNoMultiplier[type];
    }

    for (const type in yields) {
        yields[type] = Math.round(yields[type]);
    }

    return yields;
}