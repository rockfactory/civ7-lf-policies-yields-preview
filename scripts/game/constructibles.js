import { calculateMaintenanceEfficiencyToReduction } from "./helpers.js";
import { ConstructibleAdjacencies } from "./adjacency.js";
import { PolicyYieldsCache } from "../cache.js";

/**
 * @param {*} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerBuildingsCountForModifier(player, modifier) {
    return getBuildingsCountForModifier(player.Cities.getCities() || [], modifier);
}


/**
 * 
 * @param {City[]} cities 
 * @param {ResolvedModifier} modifier 
 */
export function getBuildingsCountForModifier(cities, modifier) {
    if (modifier.Arguments.Tag?.Value) {
        return getBuildingsByTag(cities, modifier.Arguments.Tag.Value).length;
    }
    else if (modifier.Arguments.ConstructibleType?.Value) {
        return getBuildingsCountByType(cities, modifier.Arguments.ConstructibleType.Value);
    }
    
    console.warn(`Unhandled ModifierArgument: ${JSON.stringify(modifier.Arguments)}`);
    return 0;
}

/**
 * 
 * @param {City[]} cities 
 * @param {string} tag 
 * @returns any[]
 */
export function getBuildingsByTag(cities, tag) {
    return cities.flatMap(city => {
        const cityConstructibles = city.Constructibles.getIds();
        for (let i = 0; i < cityConstructibles.length; i++) {
            const constructibleId = cityConstructibles[i];
            const constructible = Constructibles.getByComponentID(constructibleId);
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            
            const tags = PolicyYieldsCache.getTagsForConstructibleType(constructibleType.ConstructibleType);
            if (tags?.has(tag)) {
                return [constructible];
            }
        }
    });
}

/**
 * @param {City[]} cities
 * @param {string} type
 */
export function getBuildingsCountByType(cities, type) {
    let count = 0;
    for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        count += city.Constructibles.getIdsOfType(type).length;
    }
    return count;
}

/**
 * @param {City} city
 */
export function findCityConstructibles(city) {
    const constructibles = city.Constructibles.getIds();
    return constructibles
        .map(constructibleId => Constructibles.getByComponentID(constructibleId))
        .map(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            return {
                constructible,
                constructibleType,
            };
        });
}

// MAINTENANCE REDUCTION

/**
 * @param {City} city
 * @param {ConstructibleInstance} constructible
 * @param {Constructible} constructibleType
 * @param {ResolvedModifier} modifier}
 */
export function computeConstructibleMaintenanceEfficiencyReduction(city, constructible, constructibleType, modifier) {
    const maintenances = city.Constructibles.getMaintenance(constructibleType.ConstructibleType);
    let gold = 0;
    let happiness = 0;
    for (const index in maintenances) {
        const cost = maintenances[index] * -1;
        if (cost == 0) {
            continue;
        }

        const yieldType = GameInfo.Yields[index].YieldType;

        if (yieldType == "YIELD_GOLD" && modifier.Arguments.Gold?.Value === 'true') {
            gold += calculateMaintenanceEfficiencyToReduction(modifier, 1, cost);
        }
        if (yieldType == "YIELD_HAPPINESS" && modifier.Arguments.Happiness?.Value === 'true') {
            happiness += calculateMaintenanceEfficiencyToReduction(modifier, 1, cost);
        }
    }

    return { gold, happiness };
}

/**
 * Get all the constructibles in the city that _MAY_ receive adjacency bonuses from 
 * the given adjacency type.
 * Once the constructibles are filtered, the caller should check if the adjacency
 * is actually valid for the constructible.
 * 
 * @param {City} city
 * @param {string} adjacency
 */
export function findCityConstructiblesMatchingAdjacency(city, adjacency) {
    const constructibles = city.Constructibles.getIds();
    return constructibles
        .map(constructibleId => Constructibles.getByComponentID(constructibleId))
        .filter(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            return isConstructibleAdjacencyValid(city, constructible, constructibleType, adjacency);
        });
}

/**
 * @param {City} city
 * @param {ConstructibleInstance} constructible
 * @param {Constructible} constructibleType
 * @param {string} adjacency
 */
function isConstructibleAdjacencyValid(city, constructible, constructibleType, adjacency) {
    const validAdjacencies = ConstructibleAdjacencies.getAdjacencies(constructibleType);
    return validAdjacencies.some(ayc => ayc.ID === adjacency);
}

/**
 * Check if the constructible is ageless
 * @param {string} constructibleType 
 * @returns {boolean}
 */
export function isConstructibleAgeless(constructibleType) {
    return !PolicyYieldsCache.hasConstructibleTypeTag(constructibleType, 'AGELESS');
}

/**
 * @param {Constructible} constructibleType 
 */
export function isConstructibleValidForQuarter(constructibleType) {
    const isIgnored = PolicyYieldsCache.hasConstructibleTypeTag(
        constructibleType.ConstructibleType, 
        'IGNORE_DISTRICT_PLACEMENT_CAP'
    );
    if (isIgnored) return false;

    const isAgeless = isConstructibleAgeless(constructibleType.ConstructibleType);
    const currentAge = GameInfo.Ages.lookup(Game.age).AgeType;
    if (!isAgeless && currentAge != constructibleType.Age) return false;
    
    return true;
}