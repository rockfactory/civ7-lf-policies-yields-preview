import { PolicyYieldsCache } from "../cache.js";
import { isConstructibleFullTile, isConstructibleValidForQuarter } from "./helpers.js";
import { parseArgumentsArray } from "./helpers.js";

export function getPlotDistrict(plot) {
    const location = GameplayMap.getLocationFromIndex(plot);
    const districtId = MapCities.getDistrict(location.x, location.y);
    const district = districtId ? Districts.get(districtId) : null;
    if (!district) {
        return {
            district: null,
            districtType: null,
        }
    }

    const districtType = GameInfo.Districts.lookup(district.type);

    return {
        district,
        districtType,
    };
}

/**
 * @param {number} plot
 * @param {ResolvedRequirement} requirement
 * @returns {boolean}
 */
export function hasPlotDistrictOfClass(plot, requirement) {
    const { districtType } = getPlotDistrict(plot);

    const requiredClasses = parseArgumentsArray(requirement.Arguments, 'DistrictClass');
    return districtType != null && requiredClasses.includes(districtType?.DistrictClass);
}

/**
 * @param {number} plot
 * @param {ResolvedRequirement} requirement
 * @returns {boolean}
 */
export function hasPlotDistrictOfType(plot, requirement) {
    const { districtType } = getPlotDistrict(plot);

    const requiredClasses = parseArgumentsArray(requirement.Arguments, 'DistrictType');
    return districtType != null && requiredClasses.includes(districtType?.DistrictType);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {{ constructible: ConstructibleInstance, constructibleType: Constructible }[]}
 */
export function getPlotConstructiblesByLocation(x, y) {
    const constructibleIDs = MapConstructibles.getHiddenFilteredConstructibles(x, y);
    const constructibles = constructibleIDs.map(id => Constructibles.getByComponentID(id));
    return constructibles
        .map(constructible => {
            const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
            if (!constructibleType) {
                console.warn("getPlotConstructiblesByLocation: Missing constructibleType", constructible.type);
            }
            return {
                constructible,
                constructibleType,
            };
        })
        .filter(isValidConstructibleType);
}

/**
 * @param {{ constructible: ConstructibleInstance, constructibleType: Constructible | undefined }} item
 * @returns {item is { constructible: ConstructibleInstance, constructibleType: Constructible }}
 */
function isValidConstructibleType(item) {
    return item.constructibleType != null;
}

/**
 * @param {number} plot 
 */
export function isPlotQuarter(plot) {
    const location = GameplayMap.getLocationFromIndex(plot);
    const constructibles = getPlotConstructiblesByLocation(location.x, location.y)
        .filter(c => isConstructibleValidForQuarter(c.constructibleType));

    return constructibles.length >= 2 || 
           constructibles.some(c => isConstructibleFullTile(c.constructibleType.ConstructibleType));
}

/**
 * Get the adjacent plots to a location
 * @param {number} plotIndex
 * @param {number} radius
 */

export function getAdjacentPlots(plotIndex, radius = 1) {
    const location = GameplayMap.getLocationFromIndex(plotIndex);
    return GameplayMap
        .getPlotIndicesInRadius(location.x, location.y, radius)
        .filter(plot => plot !== plotIndex);
}

/**
 * @param {Location} location
 * @param {ResolvedArguments} args
 */

export function hasPlotConstructibleByArguments(location, args) {
    const constructibles = getPlotConstructiblesByLocation(location.x, location.y);
    return constructibles.some(c => {
        if (!c.constructibleType) return false;

        if (args.ConstructibleType?.Value) {
            return c.constructibleType?.ConstructibleType === args.ConstructibleType.Value;
        }
        if (args.Tag?.Value) {
            const tags = PolicyYieldsCache.getTypeTags(c.constructibleType.ConstructibleType);
            return tags.has(args.Tag.Value);
        }
        if (args.Age?.Value) {
            return c.constructibleType.Age === args.Age.Value;
        }

        throw new Error(`Unhandled hasPlotConstructibleByArguments: ${JSON.stringify(args)}`);
    });
}

/**
 * The requirement is checked if:
 * - The plot itself is in water, adjacent to land
 * - The plot is land, adjacent to water
 */
export function isPlotAdjacentToCoast(plot) {
    const location = GameplayMap.getLocationFromIndex(plot);
    const isPlotWater = GameplayMap.isWater(location.x, location.y);

    const adjacentPlots = getAdjacentPlots(plot);
    for (const adjacentPlot of adjacentPlots) {
        const adjacentLocation = GameplayMap.getLocationFromIndex(adjacentPlot);
        const isAdjacentPlotWater = GameplayMap.isWater(adjacentLocation.x, adjacentLocation.y);
        
        // The plot is land, adjacent to water
        if (!isPlotWater && isAdjacentPlotWater) {
            // console.warn("isPlotAdjacentToCoast", location.x, location.y, "<-", adjacentLocation.x, adjacentLocation.y);
            return true;
        }
        // The plot is water, adjacent to land
        if (isPlotWater && !isAdjacentPlotWater) {
            // console.warn("isPlotAdjacentToCoast", location.x, location.y, "->", adjacentLocation.x, adjacentLocation.y);
            return true;
        }
    }
    return false;
}
