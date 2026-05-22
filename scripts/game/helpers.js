import { PolicyYieldsCache } from "../cache.js";

// MAINTENANCE EFFICIENCY HELPERS
//
// Civilization VII has three distinct effects that all read `Amount` / `Percent`
// from a modifier but with DIFFERENT semantics. We expose one helper per effect,
// each returning the *yield delta for the player* (positive = bonus, negative = malus),
// so call sites can pass the result straight to the delta without further sign juggling.
//
//   1. EFFECT_PLAYER_ADJUST_UNIT_MAINTENANCE_EFFICIENCY   → computeUnitMaintenanceYieldDelta
//        positive Amount = cost reduction      (e.g. LEVIES Amount=1 → "-1 Gold Maintenance")
//        negative Amount = cost increase       (e.g. IMPOVERISHED_NOBILITY Amount=-1)
//
//   2. EFFECT_CITY_ADJUST_WORKER_MAINTENANCE_EFFICIENCY   → computeWorkerMaintenanceYieldDelta
//        positive Amount = cost increase       (e.g. PATRONAGE Amount=1 → "+1 Happiness Maintenance")
//        negative Amount = cost reduction      (e.g. COMPUTATION tech Amount=-1)
//
//   3. EFFECT_CITY_ADJUST_BUILDING_MAINTENANCE_EFFICIENCY → computeConstructibleMaintenanceYieldDelta
//        positive Amount = % cost reduction    (game mislabels Percent as Amount in XML;
//                                                e.g. LIVING_STANDARDS Amount=25 → -25% maintenance)
//
// `Percent` is interpreted uniformly across all three: positive Percent is read as
// "yield-bonus formula" (e.g. FREE_SPEECH Percent=50), negative Percent as direct cost change.

/**
 * Bound a maintenance *bonus* so it can't exceed the cost being reduced.
 * Malus values (negative) pass through unchanged.
 * @param {number} value Yield delta for the player (positive = bonus)
 * @param {number} maintenanceCost Total positive maintenance cost
 */
function clampMaintenanceBonus(value, maintenanceCost) {
    return Math.min(value, maintenanceCost);
}

/**
 * Shared percent-based formula used by all three maintenance effects.
 * Returns a yield delta with positive = bonus.
 *
 * Positive percent: interpreted as a yield multiplier on the maintenance burden,
 *   so a +50% modifier on a cost of 10 effectively pays 6.67, saving 3.33.
 * Negative percent: applied directly to the cost as a malus.
 *
 * @param {ResolvedModifier} modifier
 * @param {number} maintenanceCost Total positive maintenance cost
 * @returns {number}
 */
function computePercentMaintenanceYieldDelta(modifier, maintenanceCost) {
    const arg = modifier.Arguments.Percent ?? modifier.Arguments.Amount;
    if (!arg?.Value) {
        throw new Error(`Maintenance modifier has neither Amount nor Percent: ${JSON.stringify(modifier.Arguments)}`);
    }
    if (maintenanceCost < 0) {
        console.warn(`Maintenance cost is negative: ${maintenanceCost}. Cannot calculate maintenance reduction.`);
        return 0;
    }

    const percent = Number(arg.Value) / 100;
    const value = percent > 0
        ? maintenanceCost - maintenanceCost / (1 + percent)
        : maintenanceCost * percent;
    return clampMaintenanceBonus(value, maintenanceCost);
}

/**
 * Yield delta for `EFFECT_PLAYER_ADJUST_UNIT_MAINTENANCE_EFFICIENCY`.
 * Positive Amount *REDUCES* the unit maintenance cost (player _bonus_ → positive return).
 * @param {ResolvedModifier} modifier
 * @param {number} count Number of units affected
 * @param {number} maintenanceCost Total positive maintenance cost
 * @returns {number} Yield delta (positive = bonus).
 */
export function computeUnitMaintenanceYieldDelta(modifier, count, maintenanceCost) {
    if (modifier.Arguments.Amount?.Value) {
        const value = Number(modifier.Arguments.Amount.Value) * count;
        return clampMaintenanceBonus(value, maintenanceCost);
    }
    return computePercentMaintenanceYieldDelta(modifier, maintenanceCost);
}

/**
 * Yield delta for `EFFECT_CITY_ADJUST_WORKER_MAINTENANCE_EFFICIENCY`.
 * Positive Amount *INCREASES* the specialist maintenance cost (player _malus_ → negative return).
 * @param {ResolvedModifier} modifier
 * @param {number} specialists Number of specialists in the city
 * @param {number} maintenanceCost Total positive maintenance cost (2 per specialist)
 * @returns {number} Yield delta (positive = bonus, negative = malus).
 */
export function computeWorkerMaintenanceYieldDelta(modifier, specialists, maintenanceCost) {
    if (modifier.Arguments.Amount?.Value) {
        const costDelta = Number(modifier.Arguments.Amount.Value) * specialists;
        return clampMaintenanceBonus(-costDelta, maintenanceCost);
    }
    return computePercentMaintenanceYieldDelta(modifier, maintenanceCost);
}

/**
 * Yield delta for `EFFECT_CITY_ADJUST_BUILDING_MAINTENANCE_EFFICIENCY`.
 * For constructibles the game mislabels percent efficiency as `Amount`; both `Amount`
 * and `Percent` are interpreted as a percentage reduction.
 * @param {ResolvedModifier} modifier
 * @param {number} maintenanceCost Total positive maintenance cost (for ONE constructible)
 * @returns {number} Yield delta (positive = bonus).
 */
export function computeConstructibleMaintenanceYieldDelta(modifier, maintenanceCost) {
    return computePercentMaintenanceYieldDelta(modifier, maintenanceCost);
}

/**
 * E.g. "YIELD_FOOD, YIELD_PRODUCTION" -> ["YIELD_FOOD", "YIELD_PRODUCTION"]
 * @param {ResolvedArguments} args
 * @param {string} name The name of the argument
 * @returns {string[]}
 */
export function parseArgumentsArray(args, name) {
    return args.getAsserted(name).split(",").map(type => type.trim());
}

/**
 * Check if the constructible is ageless
 * @param {string} constructibleType 
 * @returns {boolean}
 */
export function isConstructibleAgeless(constructibleType) {
    return PolicyYieldsCache.hasTypeTag(constructibleType, 'AGELESS');
}

/**
 * Check if the constructible could receive adjacency bonuses
 * @param {Constructible} constructibleType
 */
export function isConstructibleValidForCurrentAge(constructibleType) {
    const isAgeless = isConstructibleAgeless(constructibleType.ConstructibleType);
    const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType;
    if (currentAge == null) {
        console.error(`Cannot find age ${Game.age}`);
        return false;
    }
    if (!isAgeless && currentAge != constructibleType.Age) return false;
    
    return true;
}


/**
 * Check if the constructible is a full tile
 * @param {string} constructibleType
 * @returns {boolean}
 */
export function isConstructibleFullTile(constructibleType) {
    return PolicyYieldsCache.hasTypeTag(constructibleType, 'FULL_TILE');
}

/**
 * @param {Constructible} constructibleType 
 */
export function isConstructibleValidForQuarter(constructibleType) {
    const isIgnored = PolicyYieldsCache.hasTypeTag(
        constructibleType.ConstructibleType, 
        'IGNORE_DISTRICT_PLACEMENT_CAP'
    );
    if (isIgnored) return false;

    return isConstructibleValidForCurrentAge(constructibleType);
}

/**
 * @template T
 * @param {T | null | undefined} value 
 * @returns {value is T}
 */
export function isNotNull(value) {
    return value !== null;
}
