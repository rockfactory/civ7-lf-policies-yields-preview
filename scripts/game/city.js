import { doesConstructibleGrantsWarehouseYields } from "./warehouse.js";


const BuildingsByTagCache = new class {
    /** @type {Map<string, string[]>} */
    _cache = new Map();

    /**
     * @param {string} tag
     * @returns {string[]}
     */
    getValidBuildingTypesByTag(tag) {
        if (this._cache.has(tag)) {
            return this._cache.get(tag) || [];
        }

        const buildingTypes = GameInfo.TypeTags
            .filter(typeTag => typeTag.Tag === tag)
            .map(typeTag => typeTag.Type)
            .filter(type => {
                const constructibleType = GameInfo.Constructibles.find(c => c.ConstructibleType === type);
                return constructibleType?.ConstructibleClass == 'BUILDING' && doesConstructibleGrantsWarehouseYields(constructibleType);
            });

        this._cache.set(tag, buildingTypes);
        return buildingTypes;
    }
}

/**
 * Check if the city has a certain building.
 * Supported arguments:
 * - BuildingType: BuildingType
 * - Tag: Tag (checks if the city has any building with the tag)
 * 
 * @param {City} city
 * @param {ResolvedArguments} args
 */
export function hasCityBuilding(city, args) {
    if (args.BuildingType) {
        return city.Constructibles?.hasConstructible(args.BuildingType.Value, false);
    }
    else if (args.Tag) {
        const buildingTypes = BuildingsByTagCache.getValidBuildingTypesByTag(args.Tag.Value);
        return buildingTypes.some(type => city.Constructibles?.hasConstructible(type, false));
    }

    console.warn(`Unhandled ModifierArgument: ${args}`);
    return false;
}

/**
 * Check if the city has a certain terrain type.
 * Supported arguments:
 * - TerrainType: TerrainType
 * - Amount: minimum number of tiles with the terrain type
 * @param {City} city
 * @param {ResolvedArguments} args
 */
export function hasCityTerrain(city, args) {
    if (args.TerrainType) {
        const amount = Number(args.Amount?.Value || 1); // TODO Not sure about this
        return city.getPurchasedPlots().filter(plot => {
            const location = GameplayMap.getLocationFromIndex(plot);
            const terrainType = GameplayMap.getTerrainType(location.x, location.y);
		    const terrain = GameInfo.Terrains.lookup(terrainType);
            return terrain?.TerrainType === args.TerrainType?.Value;
        }).length >= amount;
    }

    console.warn(`Unhandled ModifierArgument in hasCityTerrain: ${JSON.stringify(args)}`);
    return false;
}

/**
 * Check if the city has a certain number of resources
 * @param {City} city
 * @param {number} amount
 */
export function hasCityResourcesAmountAssigned(city, amount) {
    return city.Resources.getTotalCountAssignedResources() >= amount;
}

/**
 * Check if the city has a certain number of open resource slots
 * @param {City} city
 * @param {number} amount
 */
export function hasCityOpenResourcesSlots(city, amount) {
    const openSlots = city.Resources.getAssignedResourcesCap() - city.Resources.getTotalCountAssignedResources();
    return openSlots >= amount;
}

/**
 * Get the number of specialists in a city.
 * @param {City} city
 */
export function getCitySpecialistsCount(city) {
    const specialists = city.population - city.urbanPopulation - city.ruralPopulation;
    return specialists;
}

/**
 * Get the number of assigned resources in a city.
 * @param {City} city
 */
export function getCityAssignedResourcesCount(city) {
    return city.Resources.getTotalCountAssignedResources();
}

/**
 * Count resources assigned to this city by ResourceClassType. `entry.value` from
 * `getAssignedResources()` is a location id, not the ResourceType hash.
 * Resolve via `player.Resources.getResources()` (see base-standard model-resource-allocation.js)
 * 
 * @param {City} city
 * @param {string} resourceClassType
 */
export function countCityResourcesByClass(city, resourceClassType) {
    const assigned = city.Resources?.getAssignedResources() || [];
    if (assigned.length === 0) return 0;

    const owner = Players.get(city.owner);
    const ownerResources = owner?.Resources?.getResources() || [];
    /** @type {Map<number, string | undefined>} */
    const valueToClass = new Map();
    for (const entry of ownerResources) {
        const def = GameInfo.Resources.lookup(entry.uniqueResource?.resource);
        if (def) valueToClass.set(entry.value, def.ResourceClassType);
    }

    let count = 0;
    for (const entry of assigned) {
        if (valueToClass.get(entry.value) === resourceClassType) count++;
    }
    return count;
}

/**
 * Get the number of great works in a city.
 * @param {City} city
 */
export function getCityGreatWorksCount(city) {
    const buildings = city.Constructibles.getGreatWorkBuildings();
    if (!buildings || buildings.length === 0) return 0;

    let count = 0;
    buildings.forEach(greatWorkBuilding => {
        // TODO Maybe we should skip damanged buildings? Not sure about this
        const buildingInstance = Constructibles.getByComponentID(greatWorkBuilding.constructibleID);
        // const building = GameInfo.Constructibles.lookup(buildingInstance.type);
        
        count += greatWorkBuilding.slots
            .filter(slot => slot.greatWorkIndex != -1)
            .length;
    });
    return count;
}

/**
 * @param {City} city 
 */
export function getCityYieldHappiness(city) {
    return city.Yields.getNetYield("YIELD_HAPPINESS");
}

/**
 * @param {City} city
 * @param {number} districtType
 */
export function getCityDistricts(city, districtType) {
    const ids = city.Districts.getIdsOfType(districtType); // e.g. DistrictTypes.URBAN
    return ids.map(id => {
        return {
            district: Districts.get(id),
        }
    });
}

/**
 * Returns all districts in the city that have walls. It includes Wonders.
 * 
 * @param {City} city
 */
export function getCityWalledDistricts(city) {
    return getCityDistricts(city, DistrictTypes.URBAN)
        .filter(({ district }) => {
            // We need a Wall
            const constructiblesIds = district.getConstructibleIds();
            const constructibles = constructiblesIds.map(id => Constructibles.getByComponentID(id));
            const constructibleTypes = constructibles.map(c => GameInfo.Constructibles.lookup(c.type));
            return constructibleTypes.some(type => type?.DistrictDefense);
        });
}