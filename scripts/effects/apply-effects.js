import { resolveModifierById } from "../modifiers.js";
import { addYieldsAmount, addYieldsPercentForCitySubject, addYieldTypeAmount, addYieldTypeAmountNoMultiplier } from "./yields.js";
import { computeConstructibleMaintenanceEfficiencyReduction, findCityConstructibles, findCityConstructiblesMatchingAdjacency, getBuildingsCountForModifier, getPlayerBuildingsCountForModifier } from "../game/constructibles.js";
import { getYieldsForAdjacency, getPlotsGrantingAdjacency, AdjancenciesCache } from "../game/adjacency.js";
import { retrieveUnitTypesMaintenance, isUnitTypeInfoTargetOfArguments, getArmyCommanders } from "../game/units.js";
import { getCityAssignedResourcesCount, getCityGreatWorksCount, getCitySpecialistsCount, getCityYieldHappiness } from "../game/city.js";
import { computeUnitMaintenanceYieldDelta, computeWorkerMaintenanceYieldDelta, parseArgumentsArray } from "../game/helpers.js";
import { resolveSubjectsWithRequirements } from "../requirements/resolve-subjects.js";
import { countPlayerResourcesByClass, countPlayerResourcesByType, countUniqueConqueredCivilizations, getPlayerActiveTraditionsForModifier, getPlayerCityStatesSuzerain, getPlayerCityStatesSuzerainOfType, getPlayerCompletedMasteries, getPlayerOngoingDiplomacyActions, getPlayerRelationshipsCountForModifier, getPlayerUnlockedProgressionTreeNodes } from "../game/player.js";
import { findCityConstructiblesMatchingWarehouse, getYieldsForWarehouseChange } from "../game/warehouse.js";
import { PolicyYieldsContext } from "../core/execution-context.js";
import { assertSubjectCity, assertSubjectConstructible, assertSubjectPlayer, assertSubjectPlot, assertSubjectUnit } from "../requirements/assert-subject.js";
import { PolicyYieldsCache } from "../cache.js";

/**
 * @param {PolicyYieldsContext} yieldsContext 
 * @param {PreviewSubject[]} subjects 
 * @param {ResolvedModifier} modifier 
 * @returns 
 */
export function applyYieldsForSubjects(yieldsContext, subjects, modifier) {
    subjects.forEach(subject => {
        applyYieldsForSubject(yieldsContext, subject, modifier);
    });
}

/**
 * @param {PolicyYieldsContext} context 
 * @param {PreviewSubject} subject
 * @param {ResolvedModifier} modifier
 */
function applyYieldsForSubject(context, subject, modifier) {
    const player = Players.get(GameContext.localPlayerID);

    // We can't apply new-only modifiers here. These are modifiers applied
    // only when the condition is met, dynamically, not constantly.
    // Check `IUS_REFORMANDI` in the Exploration Age
    if (modifier.Modifier.NewOnly) {
        return;
    }

    switch (modifier.EffectType) {
        // ==============================
        // ========== Player ============
        // ==============================
        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            assertSubjectPlayer(subject);
            const count = subject.isEmpty ? 0 : getPlayerActiveTraditionsForModifier(subject.player, modifier);
            return context.addSubjectYieldsTimes(subject, modifier, count);
        }

        case "EFFECT_DIPLOMACY_ADJUST_YIELD_PER_PLAYER_RELATIONSHIP": {
            assertSubjectPlayer(subject);
            const allies = subject.isEmpty ? 0 : getPlayerRelationshipsCountForModifier(subject.player, modifier);
            return context.addSubjectYieldsTimes(subject, modifier, allies);
        }

        // Gain ToYieldType equal to Percent% of trade income in FromYieldType
        // (e.g. THRONE_OF_MY_FATHERS: 25% of YIELD_GOLD trade income → YIELD_CULTURE).
        case "EFFECT_MODIFY_PLAYER_TRADE_YIELD_CONVERSION": {
            assertSubjectPlayer(subject);
            const fromYieldType = modifier.Arguments.getAsserted('FromYieldType');
            const toYieldType = modifier.Arguments.getAsserted('ToYieldType');
            const percent = Number(modifier.Arguments.getAsserted('Percent')) / 100;

            if (subject.isEmpty) return context.addYieldTypeAmount(toYieldType, 0);

            // PolicyYieldsCache.getCityTradeYields only extracts YIELD_GOLD "from trade" steps.
            if (fromYieldType !== "YIELD_GOLD") {
                console.warn(`${modifier.Modifier.ModifierId}: FromYieldType=${fromYieldType} not supported, only YIELD_GOLD`);
                return context.addYieldTypeAmount(toYieldType, 0);
            }

            let totalTradeYield = 0;
            for (const city of subject.player.Cities.getCities()) {
                totalTradeYield += PolicyYieldsCache.getCityTradeYields(city) ?? 0;
            }

            return context.addYieldTypeAmount(toYieldType, totalTradeYield * percent);
        }

        case "EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD": {
            assertSubjectPlayer(subject);
            const buildingsCount = subject.isEmpty ? 0 : getPlayerBuildingsCountForModifier(subject.player, modifier);
            return context.addYieldsAmountTimes(modifier, buildingsCount);
        }

        case "EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD_BY_ATTRIBUTE": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const attributePoints = subject.player.Identity?.getSpentAttributePoints(modifier.Arguments.getAsserted('AttributeType')) || 0;
            const buildingsCount = getPlayerBuildingsCountForModifier(subject.player, modifier);
            return context.addYieldsAmountTimes(modifier, attributePoints * buildingsCount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ATTRIBUTE_AND_ALLIANCES": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const attributePoints = subject.player.Identity?.getSpentAttributePoints(modifier.Arguments.getAsserted('AttributeType')) || 0;
            const allPlayers = Players.getAlive();
            const allies = allPlayers.filter(otherPlayer => 
                otherPlayer.isMajor && 
                otherPlayer.id != GameContext.localPlayerID && 
                player.Diplomacy?.hasAllied(otherPlayer.id)
            ).length;
            return context.addYieldsAmountTimes(modifier, attributePoints * allies);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD": {
            assertSubjectPlayer(subject);
            return context.addSubjectYieldsTimes(subject, modifier, subject.isEmpty ? 0 : 1);
        }

        // TODO This is really complex, like "+1 for each time a disaster provided fertility".
        // We'd need to check disasters, not sure how right now.
        case "EFFECT_PLAYER_ADJUST_YIELD_FROM_DISTATERS": {
            throw new Error("EFFECT_PLAYER_ADJUST_YIELD_FROM_DISTATERS not implemented");
            return;
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_NUM_CITIES": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            let numSettlements = 0;
            if (modifier.Arguments.Cities?.Value === 'true') numSettlements += player.Stats.numCities;            
            if (modifier.Arguments.Towns?.Value === 'true') numSettlements += player.Stats.numTowns;
            return context.addYieldsAmountTimes(modifier, numSettlements);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_NUM_TRADE_ROUTES": {
            assertSubjectPlayer(subject);
            const numTradeRoutes = subject.isEmpty ? 0 : subject.player.Trade.countPlayerTradeRoutes();
            return context.addYieldsAmountTimes(modifier, numTradeRoutes);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_RESOURCE": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const resourcesCount = modifier.Arguments.Imported?.Value === 'true'
                ? player.Resources.getCountImportedResources()
                : player.Resources.getResources().length;
            return context.addYieldsAmountTimes(modifier, resourcesCount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_SUZERAIN": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const cityStates = getPlayerCityStatesSuzerain(player).length;
            return context.addSubjectYieldsTimes(subject, modifier, cityStates);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_COMPLETED_MASTERY": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const completedMasteries = getPlayerCompletedMasteries(player, modifier);
            return context.addSubjectYieldsTimes(subject, modifier, completedMasteries);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_UNIQUE_CIV_CONQUERED_CITY": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const count = countUniqueConqueredCivilizations(subject.player);
            return context.addYieldsAmountTimes(modifier, count);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_RESOURCE_TYPE": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const resourceType = modifier.Arguments.getAsserted('ResourceType');
            const count = countPlayerResourcesByType(subject.player, resourceType);
            return context.addYieldsAmountTimes(modifier, count);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_RESOURCE_CLASS": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const resourceClassType = modifier.Arguments.getAsserted('ResourceClassType');
            const count = countPlayerResourcesByClass(subject.player, resourceClassType);
            return context.addYieldsAmountTimes(modifier, count);
        }

        case "EFFECT_ATTACH_MODIFIERS": {
            // Nested modifiers; they are applied once for each subject from the parent modifier.
            // ModifierId may be a comma-separated list (e.g. Market Cross attaches 3 building-yield modifiers).
            const nestedModifierIds = parseArgumentsArray(modifier.Arguments, 'ModifierId');
            for (const nestedModifierId of nestedModifierIds) {
                const nestedModifier = resolveModifierById(nestedModifierId);
                const nestedSubjects = resolveSubjectsWithRequirements(player, nestedModifier, subject);
                applyYieldsForSubjects(context, nestedSubjects, nestedModifier);
            }
            return;
        }

        // Trade
        case 'EFFECT_ADJUST_PLAYER_ALLIANCE_TRADE': {
            assertSubjectPlayer(subject);

            // These are the yield types which should be "converted" into from Gold.
            const yieldTypeSelf = modifier.Arguments.getAsserted('YieldTypeSelf');
            const percent = Number(modifier.Arguments.getAsserted('SelfPercent')) / 100;

            if (subject.isEmpty) return context.addYieldTypeAmount(yieldTypeSelf, 0);

            const player = subject.player;

            let totalRoutesGold = 0;
            for (const city of _cities) {
                const routes = city.Trade.routes;
                console.warn(`[ALLIANCE_TRADE] ${_modId}   city="${city.name}" cityId={owner:${city.owner},id:${city.id?.id}} routes=${routes.length}`);
                for (const route of routes) {
                    const _l = route.leftCityID;
                    const _r = route.rightCityID;
                    // Check if owned by us (player)
                    if (route.leftCityID.owner !== player.id) {
                        continue;
                    }

                    const otherPlayerID = route.rightCityID.owner;

                    // Check if allied
                    if (!otherPlayerID || otherPlayerID === player.id || !player.Diplomacy?.hasAllied(otherPlayerID)) {
                        continue;
                    }
                    
                    const routeYieldOfGold = Game.Trade.calculateTradeRouteExportYield(route.id, "YIELD_GOLD");
                    totalRoutesGold += routeYieldOfGold;
                }
            }

            return context.addYieldTypeAmount(yieldTypeSelf, totalRoutesGold * percent);
        }


        // Player (Units)
        case "EFFECT_PLAYER_ADJUST_UNIT_MAINTENANCE_EFFICIENCY": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return addYieldTypeAmountNoMultiplier(context.delta, "YIELD_GOLD", 0);

            const unitTypes = retrieveUnitTypesMaintenance(subject.player);
            let totalReduction = 0;
            let totalCost = 0;
            for (let unitType in unitTypes) {
                if (!unitTypes[unitType]) continue; // Just for TS
                
                if (!isUnitTypeInfoTargetOfArguments(unitTypes[unitType].UnitType, modifier.Arguments)) {
                    continue;
                }

                const reduction = computeUnitMaintenanceYieldDelta(
                    modifier,
                    unitTypes[unitType].Count,
                    unitTypes[unitType].MaintenanceCost
                );

                totalReduction += reduction;
                totalCost += unitTypes[unitType].MaintenanceCost;
            }
            
            return addYieldTypeAmountNoMultiplier(context.delta, "YIELD_GOLD", totalReduction);
        }

        // Player (Diplomacy)
        case "EFFECT_DIPLOMACY_ADJUST_YIELD_PER_PLAYER_INVOLVED_ACTION": {
            assertSubjectPlayer(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const ongoingActions = getPlayerOngoingDiplomacyActions(player, modifier);
            return context.addYieldsAmountTimes(modifier, ongoingActions.length);
        }


        // ==============================
        // ========== City ==============
        // ==============================
        case "EFFECT_CITY_ADJUST_YIELD_PER_ATTRIBUTE": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const attributePoints = player.Identity?.getSpentAttributePoints(modifier.Arguments.getAsserted('AttributeType')) || 0;
            return context.addYieldsAmountTimes(modifier, attributePoints);
        }

        case "EFFECT_CITY_ADJUST_YIELD": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            // TODO Check `TRADITION_TIRAKUNA` for `Arguments.Apply` with `Rate` value.
            // TODO Implement `Arguments.PercentMultiplier` (check TRADITION_ASSEMBLY_LINE) 
            if (modifier.Arguments.Percent) {
                return addYieldsPercentForCitySubject(context.delta, modifier, subject.city, Number(modifier.Arguments.Percent.Value)); 
            }
            else if (modifier.Arguments.Amount) {
                // We don't want to use `addYieldsAmount` here, because we would need
                // to calculate the _true_ amount manually.
                // Instead, `addYieldsAmountTimes` will do the job correctly using `context.getAmount`
                // internally.
                return context.addYieldsAmountTimes(modifier, 1);
            }
            else {
                throw new Error(`Unhandled EFFECT_CITY_ADJUST_YIELD (${modifier.Modifier.ModifierId}) ModifierArguments: ${JSON.stringify(modifier.Arguments)}`);
            }
        }

        case "EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_ADJACENCY": {
            assertSubjectCity(subject);
            const adjancencies = parseArgumentsArray(modifier.Arguments, 'ConstructibleAdjacency');
            adjancencies.forEach(adjacencyId => {
                const adjacencyType = AdjancenciesCache.get(adjacencyId);
                if (!adjacencyType) {
                    // Defensive: some modifiers reference adjacency IDs that are gated by
                    // RequiresActivation or not yet loaded in the current age (e.g. JINSI_KAMIL).
                    // Skip silently with a warning instead of crashing the whole preview.
                    console.warn(`${modifier.Modifier.ModifierId}: AdjacencyType not found for ID: ${adjacencyId}`);
                    return;
                }
                // console.warn("EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_ADJACENCY AdjacencyType", adjacencyType.ID, subject.city?.name);
                
                const validConstructibles = findCityConstructiblesMatchingAdjacency(subject.isEmpty ? null : subject.city, adjacencyId);
                if (validConstructibles.length === 0 || subject.isEmpty) {
                    return context.addYieldTypeAmount(adjacencyType.YieldType, 0);
                }

                validConstructibles.forEach(constructible => {
                    const plotIndex = GameplayMap.getIndexFromLocation(constructible.location);
                    const specialists = subject.city.Workers.getNumWorkersAtPlot(plotIndex) || 0;
                    const amount = getYieldsForAdjacency(constructible.location, adjacencyType);                    
                    
                    // Debugging
                    // if (amount > 0) {
                    //     const constructibleType = GameInfo.Constructibles.lookup(constructible.type);
                    //     console.warn("Valid constructible at", `(amount ${amount})`, constructibleType?.ConstructibleType, constructible.location.x, ",", constructible.location.y, "with specialists", specialists);
                    // }

                    context.addYieldTypeAmount(adjacencyType.YieldType, amount + (amount / 2) * specialists);
                });
            });
            return;
        }
        
        case "EFFECT_CITY_ADJUST_ADJACENCY_FLAT_AMOUNT": {
            assertSubjectCity(subject);
            const adjancencies = parseArgumentsArray(modifier.Arguments, 'Adjacency_YieldChange');
            adjancencies.forEach(adjacencyId => {
                const adjacencyType = AdjancenciesCache.get(adjacencyId);
                if (!adjacencyType) {
                    console.warn(`${modifier.Modifier.ModifierId}: AdjacencyType not found for ID: ${adjacencyId}`);
                    return;
                }
                
                const validConstructibles = findCityConstructiblesMatchingAdjacency(subject.isEmpty ? null : subject.city, adjacencyId);
                if (validConstructibles.length === 0 || subject.isEmpty) {
                    return context.addYieldTypeAmount(adjacencyType.YieldType, 0);
                }

                // console.warn("EFFECT_CITY_ADJUST_ADJACENCY_FLAT_AMOUNT AdjacencyType", adjacencyType.ID, subject.city.name);

                validConstructibles.forEach((constructible) => {
                    if (!adjacencyType) {
                        console.error(`AdjacencyType not found for ID: ${adjacencyId}`);
                        return;
                    }

                    const plotIndex = GameplayMap.getIndexFromLocation(constructible.location);
                    const specialists = subject.city.Workers.getNumWorkersAtPlot(plotIndex) || 0;

                    // The granted bonus is fixed (maybe this is the `Flat` in the name). 
                    // It does not depend on the number of adjacent plots, it just requires that
                    // the constructible _may_ receive the bonus (e.g. `RiverFood` is used to indicate
                    // all buildings that can get a Food bonus from being near a river). 
                    const adjacentPlots = 1; // getPlotsGrantingAdjacency(constructible.location, adjacencyType).length;
                    const multiplier = adjacentPlots + (adjacentPlots / 2) * specialists;

                    // Debugging
                    // if (adjacentPlots > 0) {
                    //     const ctype = GameInfo.Constructibles.lookup(constructible.type);
                    //     console.warn("Valid constructible at", `(amount ${adjacentPlots})`, ctype?.ConstructibleType, constructible.location.x, ",", constructible.location.y, "with specialists", specialists);
                    // }

                    // TODO Are we sure about `Divisor`?
                    const amount = Number(modifier.Arguments.Amount?.Value) * multiplier / Number(modifier.Arguments.Divisor?.Value || 1);
                    context.addYieldTypeAmount(adjacencyType.YieldType, amount);
                });
            });
            return;
        }

        case "EFFECT_CITY_GRANT_WAREHOUSE_YIELD": {
            assertSubjectCity(subject);
            const warehousesYieldChanges = parseArgumentsArray(modifier.Arguments, 'WarehouseYieldChange');
            warehousesYieldChanges.forEach(warehouseYield => {
                const warehouseYieldType = GameInfo.Warehouse_YieldChanges.find(wyc => wyc.ID === warehouseYield);
                if (!warehouseYieldType) {
                    throw new Error(`WarehouseYieldType not found for ID: ${warehouseYield}`);
                }

                if (subject.isEmpty) {
                    return context.addYieldTypeAmount(warehouseYieldType.YieldType, 0);
                }
                
                const amount = getYieldsForWarehouseChange(subject.city, warehouseYieldType);
                // console.warn("EFFECT_CITY_GRANT_WAREHOUSE_YIELD", warehouseYieldType.ID, subject.city.name, "amount=", amount);
                context.addYieldTypeAmount(warehouseYieldType.YieldType, amount);
            });
            return;
        }

        case "EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_WAREHOUSE_YIELD": {
            assertSubjectCity(subject);
            const warehousesYields = parseArgumentsArray(modifier.Arguments, 'ConstructibleWarehouseYield');
            warehousesYields.forEach(warehouseYield => {
                const warehouseYieldType = GameInfo.Warehouse_YieldChanges.find(wyc => wyc.ID === warehouseYield);
                if (!warehouseYieldType) {
                    throw new Error(`WarehouseYieldType not found for ID: ${warehouseYield}`);
                }

                const constructibles = findCityConstructiblesMatchingWarehouse(subject.isEmpty ? null : subject.city, warehouseYieldType);
                if (!constructibles.length || subject.isEmpty) {
                    return context.addYieldTypeAmount(warehouseYieldType.YieldType, 0);
                }

                // The amount is the same for each Constructible, since it's a bonus based on all the plots
                // in the city.
                // So we calculate it once and apply it to all the Constructibles.
                // I personally suppose that there is only _one_ Constructible per city that can get this bonus,
                // but I'm not sure.
                const amount = getYieldsForWarehouseChange(subject.city, warehouseYieldType);
                constructibles.forEach(constructible => {
                    context.addYieldTypeAmount(warehouseYieldType.YieldType, amount);
                });
            });
            return;
        }

        case "EFFECT_CITY_ADJUST_BUILDING_MAINTENANCE_EFFICIENCY": {
            assertSubjectCity(subject);
            if (subject.isEmpty) {
                addYieldTypeAmountNoMultiplier(context.delta, "YIELD_GOLD", 0);
                addYieldTypeAmountNoMultiplier(context.delta, "YIELD_HAPPINESS", 0);
                return;
            }

            const constructibles = findCityConstructibles(subject.city);
            let totalGoldReduction = 0;
            let totalHappinessReduction = 0;
            constructibles.forEach(({ constructible, constructibleType }) => {
                if (!constructibleType) return;
                const { gold, happiness } = computeConstructibleMaintenanceEfficiencyReduction(
                    subject.city, 
                    constructible, 
                    constructibleType, 
                    modifier
                );
                totalGoldReduction += gold;
                totalHappinessReduction += happiness;
            });

            addYieldTypeAmountNoMultiplier(context.delta, "YIELD_GOLD", totalGoldReduction);
            addYieldTypeAmountNoMultiplier(context.delta, "YIELD_HAPPINESS", totalHappinessReduction);
            return;
        }

        case "EFFECT_CITY_ADJUST_CONSTRUCTIBLE_YIELD": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const buildingsCount = getBuildingsCountForModifier([subject.city], modifier);
            return context.addYieldsAmountTimes(modifier, buildingsCount);
        }

        // It's just the growth rate, so no food yield
        case "EFFECT_CITY_ADJUST_GROWTH": {
            // throw new Error(`EFFECT_CITY_ADJUST_GROWTH not implemented`);
            return;
        }

        // +X% to Production to overbuild
        case "EFFECT_CITY_ADJUST_OVERBUILD_PRODUCTION_MOD": return;
        // +X% to Production to adjust project production
        case "EFFECT_CITY_ADJUST_PROJECT_PRODUCTION": return;
        // +X% to Production to adjust constructible production
        case "EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION": return;

        case "EFFECT_CITY_ADJUST_TRADE_YIELD": {
            // Hard to find trade yields. Seems a bug in `city.Yields.getTradeYields()`
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            let tradeYield = PolicyYieldsCache.getCityTradeYields(subject.city);
            if (tradeYield == null) {
                console.error(`TradeYield not found for city ${subject.city.name}`);
                tradeYield = 0;
            }

            const percent = Number(modifier.Arguments.getAsserted('Percent'));
            return context.addYieldsAmount(modifier, tradeYield * percent / 100);
        }

        // City (Workers)
        case "EFFECT_CITY_ADJUST_WORKER_YIELD": {
            assertSubjectCity(subject);
            const specialists = subject.isEmpty ? 0 : getCitySpecialistsCount(subject.city);
            return context.addYieldsAmountTimes(modifier, specialists);
        }

        case "EFFECT_CITY_ADJUST_WORKER_MAINTENANCE_EFFICIENCY": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const specialists = getCitySpecialistsCount(subject.city);
            const maintenanceCost = 2 * specialists; // Total Maintenance Cost is 2 per specialist. We could read from `WorkerYields` table where < 0
            const value = computeWorkerMaintenanceYieldDelta(modifier, specialists, maintenanceCost);
            return context.addYieldsAmount(modifier, value);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_COMMANDER_LEVEL": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const commanders = getArmyCommanders(player);
            const totalLevels = commanders.reduce((acc, commander) => acc + commander.Experience.getLevel, 0);
            return context.addYieldsAmountTimes(modifier, totalLevels);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_GREAT_WORK": {
            assertSubjectCity(subject);
            const greatWorks = subject.isEmpty ? 0 : getCityGreatWorksCount(subject.city);
            return context.addYieldsAmountTimes(modifier, greatWorks);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_UNLOCKED_PROGRESSION_TREE_NODE": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const unlockedNodes = getPlayerUnlockedProgressionTreeNodes(player, modifier);
            return context.addYieldsAmountTimes(modifier, unlockedNodes);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_POPULATION": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            if (modifier.Arguments.Urban?.Value === 'true') {
                const urbanFactor = subject.city.urbanPopulation / Number(modifier.Arguments.Divisor?.Value || 1);
                context.addYieldsAmountTimes(modifier, urbanFactor);
            }
            if (modifier.Arguments.Rural?.Value === 'true') {
                const ruralFactor = subject.city.ruralPopulation / Number(modifier.Arguments.Divisor?.Value || 1);
                context.addYieldsAmountTimes(modifier, ruralFactor);
            }

            // Should have at least one of the two
            if (!modifier.Arguments.Urban?.Value && !modifier.Arguments.Rural?.Value) {
                throw new Error(`${modifier.Modifier.ModifierId} - EFFECT_CITY_ADJUST_YIELD_PER_POPULATION, missing arguments: ${JSON.stringify(modifier.Arguments)}`);
            }
            return
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_RESOURCE": {
            assertSubjectCity(subject);
            const assignedResources = subject.isEmpty ? 0 : getCityAssignedResourcesCount(subject.city);
            return context.addYieldsAmountTimes(modifier, assignedResources);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_AVAILABLE_RESOURCE_TYPE": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const resourceType = modifier.Arguments.getAsserted('ResourceType');
            const count = countPlayerResourcesByType(player, resourceType);
            return context.addYieldsAmountTimes(modifier, count);
        }

        // Flat yield/turn given to constructibles matching a Tag, scaled per copy of ResourceType owned.
        // Implemented for both YIELD and PRODUCTION variants (the latter uses YIELD_PRODUCTION and is
        // semantically flat — NOT the % build-time modifier of EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION).
        case "EFFECT_CITY_ADJUST_CONSTRUCTIBLE_YIELD_PER_RESOURCE":
        case "EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION_PER_RESOURCE": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const resourceType = modifier.Arguments.getAsserted('ResourceType');
            const resourcesOwned = countPlayerResourcesByType(player, resourceType);
            if (resourcesOwned === 0) return context.addYieldsAmount(modifier, 0);
            const buildingsCount = getBuildingsCountForModifier([subject.city], modifier);
            return context.addYieldsAmountTimes(modifier, buildingsCount * resourcesOwned);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_SUZERAIN": {
            assertSubjectCity(subject);
            const cityStates = subject.isEmpty ? 0 : getPlayerCityStatesSuzerain(player).length;
            return context.addYieldsAmountTimes(modifier, cityStates);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_SUZERAINED_CITY_STATE_TYPE": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            // TODO verify trait mapping (TRAIT_CITY_STATE_<TYPE>); falls back to full suzerain count if no match
            const csType = modifier.Arguments.getAsserted('CityStateType');
            const count = getPlayerCityStatesSuzerainOfType(player, csType);
            return context.addYieldsAmountTimes(modifier, count);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_SURPLUS_HAPPINESS": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const happiness = getCityYieldHappiness(subject.city);
            const surplusAmount = happiness / Number(modifier.Arguments.Divisor?.Value || 1);
            return context.addYieldsAmountTimes(modifier, surplusAmount);
        }

        case "EFFECT_DIPLOMACY_ADJUST_CITY_YIELD_PER_PLAYER_RELATIONSHIP": {
            assertSubjectCity(subject);
            const allies = subject.isEmpty ? 0 : getPlayerRelationshipsCountForModifier(player, modifier);
            return context.addSubjectYieldsTimes(subject, modifier, allies);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            assertSubjectCity(subject);
            const count = subject.isEmpty ? 0 : getPlayerActiveTraditionsForModifier(player, modifier);
            return context.addYieldsAmountTimes(modifier, count);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_NUM_CITIES": {
            assertSubjectCity(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);

            const numSettlements = modifier.Arguments.Towns?.Value === 'true' 
                ? subject.player.Stats.numTowns 
                : subject.player.Stats.numCities; // Not sure about the latter.
            
            return context.addSubjectYieldsTimes(subject, modifier, numSettlements);
        }

        // City OR Constructible
        case "EFFECT_CITY_ADJUST_SUZERAIN_OF_CONSTRUCTIBLE_YIELD": {
            if (subject.type !== "City" && subject.type !== "Constructible") {
                throw new Error(`Invalid subject type for EFFECT_CITY_ADJUST_SUZERAIN_OF_CONSTRUCTIBLE_YIELD: ${subject.type}`);
            }

            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            const cityStates = getPlayerCityStatesSuzerain(player);

            // If this is a Constructible, we need to check its condition
            if (subject.type === 'Constructible') {
                // By tag
                if (modifier.Arguments.Tag?.Value) {
                    const type = subject.constructibleType?.ConstructibleType;
                    const requiredTag = modifier.Arguments.Tag.Value;
                    if (!PolicyYieldsCache.hasTypeTag(type ?? '', requiredTag)) {
                        return context.addYieldsAmount(modifier, 0);
                    }
                    
                    return context.addYieldsAmountTimes(modifier, cityStates.length);
                }

                // By ConstructibleType
                if (modifier.Arguments.ConstructibleType?.Value) {
                    const type = subject.constructibleType?.ConstructibleType;
                    if (type !== modifier.Arguments.ConstructibleType.Value) {
                        return context.addYieldsAmount(modifier, 0);
                    }

                    return context.addYieldsAmountTimes(modifier, cityStates.length);
                }

                console.warn(`EFFECT_CITY_ADJUST_SUZERAIN_OF_CONSTRUCTIBLE_YIELD: Unhandled modifier arguments: ${JSON.stringify(modifier.Arguments)}`);
                // We don't want to add yields since we don't know the amount, it's not zero
                return;
            }

            // We don't know about specific filters for this modifier type when
            // applied to a city. So we just apply it always.
            if (subject.type === 'City') {
                return context.addYieldsAmountTimes(modifier, cityStates.length);
            }

            throw new Error(`Unhandled subject type for EFFECT_CITY_ADJUST_SUZERAIN_OF_CONSTRUCTIBLE_YIELD: ${JSON.stringify(subject)}`);
        }

        // ==============================
        // ====== Constructible =========
        // ==============================
        // SubjectRequirements (e.g. REQUIREMENT_CONSTRUCTIBLE_TAG_MATCHES,
        // REQUIREMENT_PLOT_FEATURE_TYPE_MATCHES) already filter the constructibles upstream.
        // TODO: support Percent if a real-world modifier requires it.
        case "EFFECT_CONSTRUCTIBLE_ADJUST_YIELD": {
            assertSubjectConstructible(subject);
            return context.addSubjectYieldsTimes(subject, modifier, subject.isEmpty ? 0 : 1);
        }

        // ==============================
        // ========== Plot ==============
        // ==============================
        case "EFFECT_PLOT_ADJUST_YIELD": {
            assertSubjectPlot(subject);
            if (subject.isEmpty) return context.addYieldsAmount(modifier, 0);
            // TODO Percent?
            const amount = Number(modifier.Arguments.getAsserted('Amount'));
            return context.addYieldsAmount(modifier, amount);
        }

        // ==============================
        // ========== Unit ==============
        // ==============================

        case "EFFECT_DIPLOMACY_ADJUST_UNIT_MAINTENANCE_PER_PLAYER_RELATIONSHIP": {
            assertSubjectUnit(subject);
            if (subject.isEmpty) return context.addYieldTypeAmount("YIELD_GOLD", 0);

            const allies = getPlayerRelationshipsCountForModifier(player, modifier);
            const bonus = Number(modifier.Arguments.getAsserted('Amount')) * allies;            
            
            // A way to limit the bonus to the maintenance cost of the unit.
            // not sure if it's correct.
            const unitType = GameInfo.Units.lookup(subject.unit.type);
            const amount = Math.max(bonus, unitType?.Maintenance || 0);
            return context.addYieldTypeAmount("YIELD_GOLD", amount);
        }

        case "EFFECT_UNIT_ADJUST_PLAYER_YIELD": {
            assertSubjectUnit(subject);
            return context.addSubjectYieldsTimes(subject, modifier, subject.isEmpty ? 0 : 1);
        }

        // Ignored effects
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION":
        case "EFFECT_CITY_ADJUST_AVOID_RANDOM_EVENT":
        case "EFFECT_UNIT_ADJUST_MOVEMENT":
        case "EFFECT_ADJUST_PLAYER_OR_CITY_BUILDING_PURCHASE_EFFICIENCY":
        case "EFFECT_ADJUST_PLAYER_OR_CITY_UNIT_PURCHASE_EFFICIENCY":
        case "EFFECT_ADJUST_PLAYER_UNITS_PILLAGE_BUILDING_MODIFIER":
        case "EFFECT_ADJUST_PLAYER_UNITS_PILLAGE_IMPROVEMENT_MODIFIER":
        case "EFFECT_DIPLOMACY_ADJUST_DIPLOMATIC_ACTION_TYPE_EFFICIENCY":
        case "EFFECT_DIPLOMACY_ADJUST_DIPLOMATIC_ACTION_TYPE_EFFICIENCY_PER_GREAT_WORK":
        case "EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE":
        case "EFFECT_DISTRICT_ADJUST_FORTIFIED_COMBAT_STRENGTH":
        case "EFFECT_PLAYER_ADJUST_SETTLEMENT_CAP":
        case "EFFECT_CITY_ADJUST_RESOURCE_CAP":
        case "EFFECT_CITY_ADJUST_TRADE_ROUTE_RANGE":
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION":
        case "EFFECT_CITY_ADJUST_WONDER_PRODUCTION":
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION_MOD_PER_SETTLEMENT":
        case "TRIGGER_PLAYER_GRANT_YIELD_ON_UNIT_CREATED":
        case "EFFECT_CITY_GRANT_UNIT":
        case "TRIGGER_CITY_GRANT_YIELD_ON_CONSTRUCTIBLE_CREATED":
        case "EFFECT_ADJUST_UNIT_POST_COMBAT_YIELD":
        case "EFFECT_ADJUST_UNIT_STRENGTH_MODIFIER":
        case "EFFECT_ADJUST_UNIT_CIV_UNIQUE_TRADITION_COMBAT_MODIFIER":
        case "EFFECT_ADJUST_UNIT_IGNORE_ZOC":     
        case "EFFECT_ADJUST_UNIT_SIGHT":
        case "EFFECT_ADJUST_UNIT_SPREAD_CHARGES":
        case "EFFECT_ARMY_ADJUST_EXPERIENCE_RATE":
        case "EFFECT_ARMY_ADJUST_MOVEMENT_RATE": 
        case "EFFECT_UNIT_ADJUST_ABILITY":
        case "EFFECT_UNIT_ADJUST_COMMAND_AWARD":
        case "EFFECT_UNIT_ADJUST_HEAL_PER_TURN":
        case "EFFECT_UNIT_ADJUST_MOVEMENT":
        case "EFFECT_UNIT_ADJUST_EMBARKATION_TYPE":
        // Ignored attribute effects
        case "EFFECT_PLAYER_ADJUST_PROGRESSION_TREE_MASTERY_EFFICIENCY":
        case "EFFECT_DIPLOMACY_ADJUST_RELATIONSHIP_GAIN_FROM_EVENT":
        case "EFFECT_CITY_ADD_FOOD_AFTER_GROWTH_EVENT":
        case "EFFECT_CITY_ADJUST_TOWN_UPGRADE_DISCOUNT":
        case "EFFECT_DIPLOMACY_ADJUST_DIPLOMATIC_ACTION_TOKEN_BONUS":
        case "EFFECT_ADJUST_CITY_IGNORE_UNHAPPINESS_EFFECT": // Todo we _could_ implement this
        case "EFFECT_ADJUST_CITY_COMMANDER_UNHAPPINESS_REDUCTION":
        case "EFFECT_GRANT_UNIT_PROMOTION":
        case "EFFECT_DIPLOMACY_ADJUST_DIPLOMATIC_RESPONSE_EFFICIENCY":
        case "EFFECT_PLAYER_ADJUST_GOLDEN_AGE_DURATION":
        case "EFFECT_PLAYER_GRANT_TRADITION_SLOTS":
        case "EFFECT_DO_NOTHING":
        case "EFFECT_UNIT_ADJUST_FLANKING_ATTACK_MODIFIER":
        case "EFFECT_PLAYER_ATTRIBUTE":
        case "EFFECT_PLAYER_ADJUST_AGE_PROGRESS":
        case "EFFECT_PLAYER_GRANT_WONDER_PURCHASING":
        case "EFFECT_PLAYER_OPEN_ARCHAEOLOGY":
        case "EFFECT_CITY_ADJUST_WORKER_CAP":
        case "EFFECT_ADJUST_UNIT_EMBARKED_MOVEMENT":
        case "EFFECT_CITY_ADJUST_POPULATION":
        case "EFFECT_PLAYER_ADD_GOLDEN_AGE_CHOICE":
        case "EFFECT_UNITS_EXTRA_RANDOM_EVENT_DAMAGE":
        case "EFFECT_UNITS_IMMUNE_TO_RANDOM_EVENTS":
        case "EFFECT_ADJUST_PLAYER_TRADE_DURING_WAR":
        // Tree
        case "EFFECT_GRANT_GREAT_WORK":
        case "EFFECT_PLAYER_UNLOCK_PANTHEON":
        // City State bonuses
        case "EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION_PER_SUZERAIN_OF":
        case "EFFECT_PLAYER_GRANT_PROGRESSION":
        case "EFFECT_ADJUST_PLAYER_FREE_TECH_ON_CITY_STATE":
        case "EFFECT_ADJUST_PLAYER_VALID_IMPROVEMENT":
        case "EFFECT_CITY_ADD_RESOURCE_TO_PLOT":
        case "EFFECT_CITY_ADJUST_TRADE_ROUTE_RANGE_PER_SUZERAIN_OF":
        // One-time / triggered yield grants — not previewable as steady-state
        case "EFFECT_PLAYER_GRANT_YIELD":
        case "EFFECT_CITY_GRANT_YIELD":
        case "EFFECT_MODIFY_PLAYER_YIELD_FOR_X_TURNS":
        case "EFFECT_MODIFY_CITY_YIELD_FOR_X_TURNS":
        case "EFFECT_PLAYER_GRANT_YIELD_NARRATIVE":
        case "EFFECT_PLAYER_GRANT_YIELD_DISCOVERY":
        case "EFFECT_CITY_GRANT_YIELD_DISCOVERY":
        case "EFFECT_PLAYER_ADD_YIELD_DEBT_NARRATIVE":
        case "EFFECT_PLAYER_ADJUST_YIELD_FOR_COMPLETING_NARRATIVE_EVENTS":
        // Production %/build-time modifiers — coherent with EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION
        case "EFFECT_CITY_ADJUST_FAVORED_WONDER_PRODUCTION":
        case "EFFECT_CITY_ADJUST_BIOME_WONDER_PRODUCTION_PER_RESOURCE":
        case "EFFECT_DAE_GRANT_COOPERATIVE_YIELD_SUPPORT_BASE_PER_TURN":
        // Combat / movement / non-yield unit modifiers (seen in MARAKKALAM, ISA, STRATEGOI nested)
        case "EFFECT_ADJUST_UNIT_TRADE_ROUTE_COMBAT_MODIFIER":
        case "EFFECT_UNIT_ADJUST_IGNORE_MOVEMENT_OBSTACLE":
        case "EFFECT_ADJUST_UNIT_SUZERAIN_OF_COMBAT_MODIFIER":
        // Belief yields are scoped to the Belief Picker UI (not decorated by this mod),
        // age-transition bonuses, and narrative events — none of which are previewed here.
        case "EFFECT_ADD_RELIGIOUS_BELIEF_YIELD":
            return;

        default:
            if (modifier.EffectType?.startsWith('TRIGGER_')) {
                return;
            }
            
            throw new Error(`${modifier.Modifier.ModifierId}: Unhandled EffectType: ${modifier.EffectType}`);
    }
}