import { PolicyYieldsCache } from "../cache.js";
import { getGlobalParamNumber } from "../core/global.js";
import { isConstructibleValidForCurrentAge } from "./helpers.js";
import { getPlotConstructiblesByLocation, getPlotDistrict, isPlotQuarter } from "./plot.js";

// ====================================================================================================
// ==== CACHE ==========================================================================================
// ====================================================================================================

export const AdjancenciesCache = new class {
    /** @type {Record<string, AdjacencyYieldChange | undefined>} */
    _adjacencies = {};

    /**
     * @param {string} adjacencyId
     * @returns {AdjacencyYieldChange | undefined}
     */
    get(adjacencyId) {
        if (!this._adjacencies[adjacencyId]) {
            this._adjacencies[adjacencyId] = GameInfo.Adjacency_YieldChanges.find(ayc => ayc.ID === adjacencyId);
        }
        return this._adjacencies[adjacencyId];
    }
};

export const ConstructibleAdjacencies = new class {
    /**
     * @type {Record<string, AdjacencyYieldChange[]>}
     */
    _adjacencies = {};

    /**
     * @param {Constructible} constructibleType
     */
    getAdjacencies(constructibleType) {
        const type = constructibleType.ConstructibleType;

        if (!this._adjacencies[type]) {
            const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType;

            // If the constructible is not valid for the current age, all the adjacencies are
            // invalid. This is _not_ true for WildcardAdjacencies, which are always valid and
            // have a flag to check if they are only valid for the current age.
            const adjacencies = isConstructibleValidForCurrentAge(constructibleType)
                ? GameInfo.Constructible_Adjacencies
                    .filter(ca => ca.ConstructibleType === type)
                    .map(ca => ca.YieldChangeId)
                : [];

            const tags = PolicyYieldsCache.getTypeTags(constructibleType.ConstructibleType);

            const wildcardAdjacencies = GameInfo.Constructible_WildcardAdjacencies
                .filter(ca => {
                    // I'm not sure why, but all wildcard adjacencies applies to buildings only.
                    // E.g. tried with City of Peace. Improvements near the city center are not
                    // affected by the adjacency.
                    // if this is true, what's the point of having `ConstructibleClass` in the
                    // Constructible_WildcardAdjacencies table?
                    if (constructibleType.ConstructibleClass !== "BUILDING") {
                        return false;
                    }

                    // Walls are not affected by wildcard adjacencies
                    if (tags.has("IGNORE_DISTRICT_PLACEMENT_CAP")) {
                        return false;
                    }

                    if (ca.ConstructibleClass && constructibleType.ConstructibleClass !== ca.ConstructibleClass) {
                        return false;
                    }
                    if (ca.ConstructibleTag && !tags.has(ca.ConstructibleTag)) {
                        return false;
                    }
                    if (ca.CurrentAgeConstructiblesOnly && constructibleType.Age !== currentAge) {
                        return false;
                    }
                    return true;

                    // TODO Not used in modern, we'd need to understand better what they represent anyway
                    // if (ca.HasNavigableRiver && ...) {
                })
                .map(ca => ca.YieldChangeId);

            const availableAdjacenciesIds = new Set(adjacencies.concat(wildcardAdjacencies));

            this._adjacencies[type] = GameInfo.Adjacency_YieldChanges
                .filter(ayc => availableAdjacenciesIds.has(ayc.ID));
           
            // console.warn("ConstructibleAdjacencies", constructibleType.ConstructibleType, JSON.stringify(this._adjacencies[type].map(a => a.ID)));
        }

        return this._adjacencies[type];
    }
};

/**
 * Given an AdjacencyYieldChange, return the plots indexes activating the adjacency
 * @param {Location} location
 * @param {AdjacencyYieldChange} adjacency
 */
export function getPlotsGrantingAdjacency(location, adjacency) {
    const adjacentPlots = GameplayMap.getPlotIndicesInRadius(location.x, location.y, 1);
    let plots = [];
    for (const plot of adjacentPlots) {
        const loc = GameplayMap.getLocationFromIndex(plot);
        if (loc.x === location.x && loc.y === location.y) continue;
        if (!isPlotGrantingAdjacency(adjacency, plot)) continue;

        plots.push(plot);
    }

    return plots;
}

/**
 * Check if a plot meets the adjacency requirements
 *
 * @param {AdjacencyYieldChange} adjacency
 * @param {number} plot
 */
export function isPlotGrantingAdjacency(adjacency, plot) {
    const loc = GameplayMap.getLocationFromIndex(plot);

    if (adjacency.AdjacentLake && !GameplayMap.isLake(loc.x, loc.y)) return false;
    if (adjacency.AdjacentNaturalWonder && !GameplayMap.isNaturalWonder(loc.x, loc.y)) return false;
    if (adjacency.AdjacentRiver && !GameplayMap.isRiver(loc.x, loc.y)) return false;
    if (adjacency.AdjacentNavigableRiver && !GameplayMap.isNavigableRiver(loc.x, loc.y)) return false;

    if (adjacency.AdjacentTerrain) {
        const terrain = GameplayMap.getTerrainType(loc.x, loc.y);
        const terrainType = GameInfo.Terrains.lookup(terrain);
        if (terrainType?.TerrainType !== adjacency.AdjacentTerrain) return false;
    }

    if (adjacency.AdjacentConstructible) {
        const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
        if (!constructibles.some(c => c.constructibleType?.ConstructibleType === adjacency.AdjacentConstructible)) return false;
    }

    if (adjacency.AdjacentConstructibleTag) {
        const neededTag = adjacency.AdjacentConstructibleTag;
        const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
        const hasSomeTag = constructibles.some(c => {
            const tags = PolicyYieldsCache.getTypeTags(c.constructibleType?.ConstructibleType);
            return tags.has(neededTag);
        });
        if (!hasSomeTag) return false;
    } 

    if (adjacency.AdjacentDistrict) {
        const district = getPlotDistrict(plot);
        if (district.districtType?.DistrictType !== adjacency.AdjacentDistrict) return false;
    }

    if (adjacency.AdjacentQuarter) {
        if (!isPlotQuarter(plot)) return false;
    }

    if (adjacency.AdjacentResource) {
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        if (resourceType == ResourceTypes.NO_RESOURCE) return false;
    }

    if (adjacency.AdjacentResourceClass && adjacency.AdjacentResourceClass !== "NO_RESOURCECLASS") {
        // TODO Are we sure about "NO_RESOURCECLASS" being treated as "allow any resource class"?
        // Or should we filter by _no_ resource class?
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        const resource = GameInfo.Resources.lookup(resourceType);
        if (resource?.ResourceClassType !== adjacency.AdjacentResourceClass) return false;
    }

    if (adjacency.AdjacentFeature) {
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature?.FeatureType !== adjacency.AdjacentFeature) return false;
    }

    if (adjacency.AdjacentFeatureClass) {
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature?.FeatureClassType !== adjacency.AdjacentFeatureClass) return false;
    }

    if (adjacency.AdjacentBiome) {
        const biomeType = GameplayMap.getBiomeType(loc.x, loc.y);
        const biome = GameInfo.Biomes.lookup(biomeType);
        if (biome?.BiomeType !== adjacency.AdjacentBiome) return false;
    }

    if (adjacency.AdjacentSeaResource) {
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        if (resourceType == ResourceTypes.NO_RESOURCE) return false;
        // const resource = GameInfo.Resources.lookup(resourceType);
        if (!GameplayMap.isWater(loc.x, loc.y)) return false;
    }

    // Appeal-tier adjacencies (Heian JO_BO_SYSTEM / MONOGATARI). The plot's appeal
    // must reach the tier threshold; tiers are cumulative (a Breathtaking tile also
    // satisfies Charming), matching the appeal tile-yield system and the base-game
    // appeal lens thresholds (general-appeal-layer.js).
    if (adjacency.AdjacentBreathtakingAppeal) {
        const threshold = getGlobalParamNumber("APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD");
        if (GameplayMap.getAppeal(loc.x, loc.y) < threshold) return false;
    }
    if (adjacency.AdjacentCharmingAppeal) {
        const threshold = getGlobalParamNumber("APPEAL_FOR_HAPPINESS_TILE_YIELD");
        if (GameplayMap.getAppeal(loc.x, loc.y) < threshold) return false;
    }

    if (adjacency.AdjacentUniqueQuarter) {
        throw new Error(`AdjacencyYieldChange.AdjacentUniqueQuarter not implemented (plot ${plot}, adjacency ${adjacency.ID})`);
    }
    if (adjacency.AdjacentUniqueQuarterType) {
        throw new Error(`AdjacencyYieldChange.AdjacentUniqueQuarterType not implemented (plot ${plot}, adjacency ${adjacency.ID})`);
    }

    if (adjacency.Age) {
        // TODO What do we need to check? Constructible age? Or game age?
    }

    // TODO Implement missing checks
    return true;
}

/**
 * Given an AdjacencyYieldChange, return the amount of yields granted by the adjacency
 * This amount is the number of adjacent plots that meet the adjacency requirements,
 * multiplied by the YieldChange of the adjacency.
 *
 * @param {Location} location
 * @param {AdjacencyYieldChange} adjacency
 */
export function getYieldsForAdjacency(location, adjacency) {
    const adjacentGrantingPlots = getPlotsGrantingAdjacency(location, adjacency);
    const tilesRequired = adjacency.TilesRequired || 1;
    if (adjacentGrantingPlots.length < tilesRequired) return 0;
    // Every `TilesRequired` qualifying tiles grant `YieldChange`. E.g. Heian
    // JoboSystemBreathtakingAdjacencyCulture (YieldChange=1, TilesRequired=2) is
    // +1 culture per 2 breathtaking tiles, not +1 per tile.
    // TODO adjacency.ProjectMaxYield ?
    return Math.floor(adjacentGrantingPlots.length / tilesRequired) * adjacency.YieldChange;
}

