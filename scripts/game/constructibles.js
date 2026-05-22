import { computeConstructibleMaintenanceYieldDelta } from "./helpers.js";
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
    else if (modifier.Arguments.ConstructibleClass?.Value) {
        return getBuildingsByClass(cities, modifier.Arguments.ConstructibleClass.Value).length;
    }
    
    throw new Error(`${modifier.Modifier.ModifierId}: getBuildingsCountForModifier Unhandled ModifierArgument: ${JSON.stringify(modifier.Arguments)}`);    
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
        const valids = [];
        for (let i = 0; i < cityConstructibles.length; i++) {
            const constructibleId = cityConstructibles[i];
            const constructible = Constructibles.getByComponentID(constructibleId);
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            if (!constructibleType) {
                continue;
            }
            
            const tags = PolicyYieldsCache.getTypeTags(constructibleType.ConstructibleType);
            if (tags?.has(tag)) {
                valids.push(constructible);
            }
        }
        return valids;
    });
}

/**
 * @param {City[]} cities
 * @param {string} className
 */
export function getBuildingsByClass(cities, className) {
    return cities.flatMap(city => {
        return findCityConstructibles(city).filter(({ constructibleType }) => {
            const classes = className.split(",").map(c => c.trim());
            return classes.includes(constructibleType?.ConstructibleClass || '');
        });
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
        const cost = (maintenances[index] || 0);
        if (cost == 0) {
            continue;
        }

        const yieldType = GameInfo.Yields[index]?.YieldType;

        if (yieldType == "YIELD_GOLD" && modifier.Arguments.Gold?.Value === 'true') {
            gold += computeConstructibleMaintenanceYieldDelta(modifier, cost);
        }
        if (yieldType == "YIELD_HAPPINESS" && modifier.Arguments.Happiness?.Value === 'true') {
            happiness += computeConstructibleMaintenanceYieldDelta(modifier, cost);
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
 * @param {City | null} city
 * @param {string} adjacency
 */
export function findCityConstructiblesMatchingAdjacency(city, adjacency) {
    if (!city) {
        return [];
    }

    const constructibles = city.Constructibles.getIds();
    return constructibles
        .map(constructibleId => Constructibles.getByComponentID(constructibleId))
        .filter(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            if (!constructibleType) {
                return false;
            }
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

