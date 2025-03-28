import { hasUnitTag, isUnitTypeInfoTargetOfArguments } from "../game/units.js";
import { getCityGreatWorksCount, hasCityBuilding, hasCityOpenResourcesSlots, hasCityResourcesAmountAssigned, hasCityTerrain } from "../game/city.js";
import { hasPlotConstructibleByArguments, getPlotConstructiblesByLocation, hasPlotDistrictOfClass, isPlotQuarter, getAdjacentPlots, isPlotAdjacentToCoast, hasPlotDistrictOfType } from "../game/plot.js";
import { isPlayerAtPeaceWithMajors, isPlayerAtWarWithOpposingIdeology } from "../game/player.js";
import { assertSubjectCity, assertSubjectPlayer, assertSubjectPlot, assertSubjectUnit } from "./assert-subject.js";
import { PolicyExecutionContext } from "../core/execution-context.js";

/**
 * @param {Player} player
 * @param {PreviewSubject} subject
 * @param {ResolvedRequirement} requirement
 * @returns
 */
export function isRequirementSatisfied(player, subject, requirement) {
    // This should never happen at this level, but just in case.
    // Empty subjects are for effects, and they're generated _after_ requirements are resolved.
    if (subject.isEmpty === true) return false;

    switch (requirement.Requirement.RequirementType) {
        case "REQUIREMENT_CITY_IS_CAPITAL": {
            assertSubjectCity(subject);        
            return subject.city.isCapital;
        }
        case "REQUIREMENT_CITY_IS_CITY": {
            assertSubjectCity(subject);
            return !subject.city.isTown;
        }
        case "REQUIREMENT_CITY_IS_TOWN": {
            assertSubjectCity(subject);
            return subject.city.isTown;
        }
        case "REQUIREMENT_CITY_IS_ORIGINAL_OWNER": {
            assertSubjectCity(subject); 
            return subject.city.originalOwner === player.id;
        }
        case "REQUIREMENT_CITY_HAS_BUILDING": {
            assertSubjectCity(subject); 
            return hasCityBuilding(subject.city, requirement.Arguments);
        }
        case "REQUIREMENT_CITY_HAS_PROJECT": {
            assertSubjectCity(subject); 
            if (requirement.Arguments.HasAnyProject?.Value === "true") {
                return subject.city.Growth.projectType !== -1;
            }

            if (subject.city.Growth.projectType === -1) return false;

            const projectTypeName = GameInfo.Projects.lookup(subject.city.Growth.projectType)?.ProjectType;
            return projectTypeName === requirement.Arguments.getAsserted('ProjectType');
        }
        case "REQUIREMENT_CITY_HAS_TERRAIN": {
            assertSubjectCity(subject);
            return hasCityTerrain(subject.city, requirement.Arguments);
        }
        case "REQUIREMENT_CITY_IS_DISTANT_LANDS": {
            assertSubjectCity(subject);
            return subject.city.isDistantLands;
        }
        case "REQUIREMENT_CITY_POPULATION": {
            assertSubjectCity(subject);
            if (requirement.Arguments.MinUrbanPopulation?.Value) {
                return subject.city.urbanPopulation >= Number(requirement.Arguments.MinUrbanPopulation.Value);
            }
            throw new Error(`Unhandled RequirementType: ${requirement.Requirement.RequirementType} with Arguments: ${JSON.stringify(requirement.Arguments)}`);            
        }

        case "REQUIREMENT_CITY_HAS_X_OPEN_RESOURCE_SLOTS": {
            assertSubjectCity(subject);
            const amount = Number(requirement.Arguments.getAsserted('Amount'));
            return hasCityOpenResourcesSlots(subject.city, amount);
        }

        case "REQUIREMENT_CITY_HAS_X_RESOURCES_ASSIGNED": {
            assertSubjectCity(subject);
            const amount = Number(requirement.Arguments.getAsserted('Amount'));
            return hasCityResourcesAmountAssigned(subject.city, amount);
        }

        case "REQUIREMENT_CITY_IS_INFECTED": {
            assertSubjectCity(subject);
            return subject.city.isInfected;
        }

        case "REQUIREMENT_CITY_HAS_BUILD_QUEUE": {
            assertSubjectCity(subject);
            // Old comment: I'm not sure about the sense of this.
            // Update: It can be seen in REQSET_ONLY_TOWNS, which is the Inverse of this requirement, so it's just towns
            return !subject.city.isTown;
        }

        case "REQUIREMENT_CITY_HAS_GARRISON_UNIT": {
            assertSubjectCity(subject);
            const loc = subject.city.location;
            const units = MapUnits.getUnits(loc.x, loc.y);
            return units.some(unit => unit.owner == player.id);
        }

        case "REQUIREMENT_CITY_HAS_GREAT_WORK": {
            assertSubjectCity(subject);
            return getCityGreatWorksCount(subject.city) > 0;
        }

        case "REQUIREMENT_CITY_IS_PRODUCING_PROJECT": {
            assertSubjectCity(subject);
            if (subject.city.Growth.projectType === -1) return false;
            const projectTypeName = GameInfo.Projects.lookup(subject.city.Growth.projectType)?.ProjectType;
            return projectTypeName === requirement.Arguments.getAsserted('ProjectType');
        }

        // City (Religion)
        case "REQUIREMENT_CITY_FOLLOWS_RELIGION": {
            assertSubjectCity(subject);
            const playerReligion = Players.Religion?.get(player.id);
            const hasPlayerReligion = playerReligion != null && playerReligion.getReligionType() != -1; 
            if (!hasPlayerReligion && requirement.Arguments.hasReligion?.Value === 'true') {
                return false;
            }
            
            const cityReligion = subject.city.Religion?.majorityReligion;
            if (cityReligion == -1 && requirement.Arguments.cityReligion?.Value === 'true') {
                return false;
            }

            return cityReligion === playerReligion.getReligionType();
        }

        case "REQUIREMENT_CITY_HAS_ANY_WONDER": {
            assertSubjectCity(subject);
            return subject.city.Constructibles.getNumWonders() > 0;
        }

        // Plot
        case "REQUIREMENT_PLOT_DISTRICT_CLASS": {
            assertSubjectPlot(subject);
            return hasPlotDistrictOfClass(subject.plot, requirement);
        }

        case "REQUIREMENT_PLOT_RESOURCE_VISIBLE": {
            assertSubjectPlot(subject);            
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const resource = GameplayMap.getResourceType(loc.x, loc.y);
			if (resource == ResourceTypes.NO_RESOURCE) return false;

            const isVisible = GameplayMap.getRevealedState(GameContext.localPlayerID, loc.x, loc.y) != RevealedStates.HIDDEN;
            if (!isVisible) return false;

            return true;
        }

        case "REQUIREMENT_PLOT_IS_COASTAL_LAND": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.isCoastalLand(loc.x, loc.y);
        }

        case "REQUIREMENT_PLOT_ADJACENT_TO_COAST": {
            assertSubjectPlot(subject);
            return isPlotAdjacentToCoast(subject.plot);
        }

        case "REQUIREMENT_PLOT_HAS_CONSTRUCTIBLE": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return hasPlotConstructibleByArguments(loc, requirement.Arguments);
        }

        case "REQUIREMENT_PLOT_HAS_NUM_CONSTRUCTIBLES": {
            assertSubjectPlot(subject);
            const amount = Number(requirement.Arguments.getAsserted('Amount'));
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
            return constructibles.length >= amount;
        }

        case "REQUIREMENT_PLOT_IS_QUARTER": {
            assertSubjectPlot(subject);
            return isPlotQuarter(subject.plot);
        }

        case "REQUIREMENT_PLOT_IS_LAKE": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.isLake(loc.x, loc.y);
        }

        case "REQUIREMENT_PLOT_IS_RIVER": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.isRiver(loc.x, loc.y);
        }

        case "REQUIREMENT_PLOT_BIOME_TYPE_MATCHES": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const biomeType = GameplayMap.getBiomeType(loc.x, loc.y);
            const biome = GameInfo.Biomes.lookup(biomeType);
            return biome?.BiomeType == requirement.Arguments.getAsserted('BiomeType');
        }

        case "REQUIREMENT_PLOT_TERRAIN_TYPE_MATCHES": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
            const terrain = GameInfo.Terrains.lookup(terrainType);
            return terrain?.TerrainType == requirement.Arguments.getAsserted('TerrainType');
        }

        case "REQUIREMENT_PLOT_FEATURE_TYPE_MATCHES": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
            const feature = GameInfo.Features.lookup(featureType);

            if (requirement.Arguments.FeatureClassType?.Value) {
                return feature?.FeatureClassType == requirement.Arguments.getAsserted('FeatureClassType');
            }
            if (requirement.Arguments.FeatureType?.Value) {
                return feature?.FeatureType == requirement.Arguments.getAsserted('FeatureType');
            }

            throw new Error(`Unhandled REQUIREMENT_PLOT_FEATURE_TYPE_MATCHES: ${requirement.Requirement.RequirementId} with Arguments: ${JSON.stringify(requirement.Arguments)}`);
        }

        case "REQUIREMENT_PLOT_ADJACENT_TO_LAKE": {
            assertSubjectPlot(subject);
            return getAdjacentPlots(subject.plot).some(plot => {
                const loc = GameplayMap.getLocationFromIndex(plot);
                return GameplayMap.isLake(loc.x, loc.y);
            });
        }

        case "REQUIREMENT_PLOT_ADJACENT_TERRAIN_TYPE_MATCHES": {
            assertSubjectPlot(subject);
            return getAdjacentPlots(subject.plot).some(plot => {
                const loc = GameplayMap.getLocationFromIndex(plot);
                const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
                const terrain = GameInfo.Terrains.lookup(terrainType);
                return terrain?.TerrainType == requirement.Arguments.getAsserted('TerrainType');
            });
        }

        case "REQUIREMENT_PLOT_ADJACENT_CONSTRUCTIBLE_TYPE_MATCHES": {
            assertSubjectPlot(subject);
            const range = Number(requirement.Arguments.MaxRange?.Value || 1);
            return getAdjacentPlots(subject.plot, range).some(plot => {
                const loc = GameplayMap.getLocationFromIndex(plot);
                return hasPlotConstructibleByArguments(loc, requirement.Arguments);
            });
        }

        case "REQUIREMENT_PLOT_IS_OWNER": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.getOwner(loc.x, loc.y) == player.id;
        }  

        case "REQUIREMENT_PLOT_RESOURCE_TAG_MATCHES": {
            assertSubjectPlot(subject);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const resource = GameplayMap.getResourceType(loc.x, loc.y);
			if (resource == ResourceTypes.NO_RESOURCE) return false;
            // No arguments present on DB
            return true;
        }

        // Units
        case "REQUIREMENT_UNIT_TAG_MATCHES": {
            assertSubjectUnit(subject);
            return hasUnitTag(subject.unit, requirement.Arguments.getAsserted('Tag'));
        }

        case "REQUIREMENT_UNIT_IS_IN_HOMELANDS": {
            assertSubjectUnit(subject);
            return !player.isDistantLands(subject.unit.location);
        }

        case "REQUIREMENT_UNIT_DOMAIN_MATCHES": {
            assertSubjectUnit(subject);
            const unitType = GameInfo.Units.lookup(subject.unit.type);
            return unitType?.Domain == requirement.Arguments.getAsserted('UnitDomain');
        }

        case "REQUIREMENT_UNIT_CLASS_MATCHES": {
            assertSubjectUnit(subject);
            const unitTypeInfo = GameInfo.Units.lookup(subject.unit.type);
            if (!unitTypeInfo) return false;
            return isUnitTypeInfoTargetOfArguments(unitTypeInfo, requirement.Arguments);
        }

        case "REQUIREMENT_UNIT_CORE_CLASS_MATCHES": {
            assertSubjectUnit(subject);
            const unitTypeInfo = GameInfo.Units.lookup(subject.unit.type);
            if (!unitTypeInfo) return false;
            return unitTypeInfo.CoreClass == requirement.Arguments.getAsserted('UnitCoreClass');
        }

        case "REQUIREMENT_UNIT_DOMAIN_MATCHES": {
            assertSubjectUnit(subject);
            const unitTypeInfo = GameInfo.Units.lookup(subject.unit.type);
            if (!unitTypeInfo) return false;
            return unitTypeInfo.Domain == requirement.Arguments.getAsserted('UnitDomain');
        }

        case "REQUIREMENT_UNIT_IN_OWNER_TERRITORY": {
            assertSubjectUnit(subject);
            return GameplayMap.getOwner(subject.unit.location.x, subject.unit.location.y) == player.id;
        }

        case "REQUIREMENT_UNIT_ON_DISTRICT": {
            assertSubjectUnit(subject);

            if (requirement.Arguments.Friendly) {
                const requiresFriendly = requirement.Arguments.Friendly.Value === 'true';
                const plotOwner = GameplayMap.getOwner(subject.unit.location.x, subject.unit.location.y);
                if (requiresFriendly && plotOwner != player.id) return false;
                if (!requiresFriendly && plotOwner == player.id) return false;
            }

            if (requirement.Arguments.DistrictType) {
                if (!hasPlotDistrictOfType(subject.plot, requirement)) return false;
            }
            
            return true;
        }

        // Player (Owner)
        case "REQUIREMENT_PLAYER_IS_AT_WAR_WITH_OPPOSING_IDEOLOGY": {
            assertSubjectPlayer(subject);
            return isPlayerAtWarWithOpposingIdeology(subject.player);
        }

        case "REQUIREMENT_PLAYER_IS_AT_PEACE_WITH_ALL_MAJORS": {
            assertSubjectPlayer(subject);
            return isPlayerAtPeaceWithMajors(subject.player);
        }

        case "REQUIREMENT_PLAYER_HAS_X_SETTLEMENTS": {
            assertSubjectPlayer(subject);
            let totalSettlements = 0;

            const ownSettlementIncrement = Number(requirement.Arguments.CountPerOwnSettlement?.Value || '1');
            const conqueredSettlementIncrement = Number(requirement.Arguments.CountPerConqueredSettlement?.Value || '1');

            const onlyCities = requirement.Arguments.OnlyCities?.Value === 'true';
            const onlyTowns = requirement.Arguments.OnlyTowns?.Value === 'true';
            const onlyHomelands = requirement.Arguments.OnlyHomelands?.Value === 'true';

            for (const city of subject.player.Cities.getCities()) {
                if (onlyCities && city.isTown) continue;
                if (onlyTowns && !city.isTown) continue;
                if (onlyHomelands && city.isDistantLands) continue;
                
                const increment = city.originalOwner == subject.player.id
                    ? ownSettlementIncrement
                    : conqueredSettlementIncrement;

                totalSettlements += increment;
            }
            return totalSettlements >= Number(requirement.Arguments.getAsserted('RequiredCount'));
        }

        case "REQUIREMENT_PLAYER_HAS_X_WAR_SUPPORT": {
            assertSubjectPlayer(subject);
            throw new Error(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
        }

        case "REQUIREMENT_PLAYER_IS_MAJOR": {
            assertSubjectPlayer(subject);
            return subject.player.isMajor;
        }

        case "REQUIREMENT_PLAYER_ELIGIBLE_CS_BONUS": {
            // These modifiers are visible in the UI only when you can
            // choose them, so if you can _see_ them, you're eligible.
            return true;
        }

        // Ignored requirements. Usually because they relate to _combat_ bonuses, and we don't display those.
        case "REQUIREMENT_COMMANDER_HAS_X_PROMOTIONS":
        case "REQUIREMENT_PLOT_IS_SUZERAIN":
        case "REQUIREMENT_ENGAGED_TARGET_OF_TARGET_MATCHES":
        case "REQUIREMENT_OPPONENT_IS_DISTRICT":
        case "REQUIREMENT_PLOT_IN_COMMAND_RADIUS": // IRON_CROSS
        case "REQUIREMENT_PLAYER_IS_ATTACKING": {
            return false;
        }

        default:
            throw new Error(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
    }
}
