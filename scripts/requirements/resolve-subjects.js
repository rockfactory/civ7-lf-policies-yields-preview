import { findCityConstructibles } from "../game/constructibles.js";
import { isNotNull } from "../game/helpers.js";
import { resolveRequirementSet } from "../modifiers.js";
import { isRequirementSatisfied } from "./requirement.js";
import { PolicyYieldsCache } from "../cache.js";

/**
 * @param {Player} player
 * @param {ResolvedModifier} modifier 
 * @param {PreviewSubject | null} parentSubject May be a city, a plot, a player, etc. Usually a city for nested modifiers (EFFECT_ATTACH_MODIFIER_TO_CITY)
 * @returns {PreviewSubject[]}
 */
export function resolveSubjectsWithRequirements(player, modifier, parentSubject = null) {
    const baseSubjects = resolveBaseSubjects(modifier, parentSubject);

    const filtered = baseSubjects.filter(subject => {
        return filterSubjectByRequirementSet(player, subject, modifier.SubjectRequirementSet);
    });

    // If the filtered list is empty, but the base list is not, we need to return
    // a single empty subject to make the effects to return a "0" yield
    if (filtered.length === 0 && baseSubjects.length > 0 && baseSubjects[0]) {
        return [ { isEmpty: true, type: baseSubjects[0].type } ];
    }

    return filtered;
}

/**
 * @param {Player} player
 * @param {PreviewSubject} subject
 * @param {ResolvedRequirementSet | null} requirementSet
 */
function filterSubjectByRequirementSet(player, subject, requirementSet) {
    if (!requirementSet) {
        return true;
    }

    const operator = getRequirementSetOperator(requirementSet);

    return requirementSet.Requirements[operator](requirement => {
        let isSatisfied = false;
        if (requirement.Requirement.RequirementType === 'REQUIREMENT_REQUIREMENTSET_IS_MET') {
            // Nested requirement set
            const requirementSetId = requirement.Arguments.getAsserted('RequirementSetId');
            const nestedRequirementSet = resolveRequirementSet(requirementSetId);
            isSatisfied = filterSubjectByRequirementSet(player, subject, nestedRequirementSet);
        }
        else {
            isSatisfied = isRequirementSatisfied(player, subject, requirement);
        }

        return requirement.Requirement.Inverse ? !isSatisfied : isSatisfied;
    });
}

/**
 * @param {ResolvedRequirementSet} requirementSet
 */
function getRequirementSetOperator(requirementSet) {
    switch (requirementSet.RequirementSetType) {
        case "REQUIREMENTSET_TEST_ALL":
            return "every";
        case "REQUIREMENTSET_TEST_ANY":
            return "some";
        default:
            console.warn(`Unhandled RequirementSetType: ${requirementSet.RequirementSetType}`, JSON.stringify(requirementSet));
            return "every";
    }
}

/**
 * @param {City[]} cities 
 * @returns {CitySubject[]}
 */
function wrapCitySubjects(cities) {
    return cities.map(city => {
        return {
            type: "City",
            isEmpty: false,
            city,
            // Some requirements operate both on the city and the plot; in order
            // to make the subject usable in those cases, we need to provide the plot index.
            plot: GameplayMap.getIndexFromLocation(city.location),
            // Some city requirements need to know the city's owner (player)
            player: Players.get(city.owner)            
        };
    });
}

/** 
 * @param {UnitInstance[]} units 
 * @returns {UnitSubject[]}
 */
function wrapUnitSubjects(units) {
    return units.map(unit => {
        return {
            type: "Unit",
            isEmpty: false,
            unit,
            plot: GameplayMap.getIndexFromLocation(unit.location),
            player: Players.get(unit.owner)
        };
    });
}

/**
 * @param {DistrictInstance[]} districts 
 * @returns {DistrictSubject[]}
 */
function wrapDistrictSubjects(districts) {
    return districts.map(district => {
        return {
            type: "District",
            isEmpty: false,
            district,
            city: Cities.get(district.cityId),
            plot: GameplayMap.getIndexFromLocation(district.location),
            player: Players.get(district.owner)
        };
    });
}

/**
 * @param {ResolvedModifier} modifier
 * @param {PreviewSubject | null} parentSubject
 * @returns {PreviewSubject[]}
 */
function resolveBaseSubjects(modifier, parentSubject = null) {
    const player = Players.get(GameContext.localPlayerID);
    switch (modifier.CollectionType) {
        case "COLLECTION_PLAYER_CAPITAL_CITY":
            return wrapCitySubjects([player.Cities.getCapital()]);
        
        case "COLLECTION_PLAYER_CITIES":
            return wrapCitySubjects(player.Cities.getCities());
        
        // We don't care about other players cities, since we need anyway the effect
        // applied to _our_ cities.
        case "COLLECTION_ALL_CITIES":
            return wrapCitySubjects(player.Cities.getCities());

        case "COLLECTION_PLAYER_PLOT_YIELDS": {
            return player.Cities.getCities().flatMap(city => {
                return city.getPurchasedPlots()
                        .filter(plot => {
                            const location = GameplayMap.getLocationFromIndex(plot);
                            return MapConstructibles.getHiddenFilteredConstructibles(location.x, location.y).length > 0
                        })
                        .map(plot => {
                            return {
                                type: "Plot",
                                isEmpty: false,
                                city,
                                plot,
                                player,
                            };
                        });
            });
        }
        
        // We treat the MAJOR_PLAYERS as a special case, since we are interested only
        // in our player
        case "COLLECTION_MAJOR_PLAYERS":
        case "COLLECTION_ALL_PLAYERS":
        case "COLLECTION_OWNER":
            return [{
                type: "Player",
                isEmpty: false,
                player,
            }];

        // Constructibles 
        case "COLLECTION_PLAYER_CONSTRUCTIBLES": {
            return player.Cities.getCities().flatMap(city => {
                return findCityConstructibles(city).flatMap(({ constructible, constructibleType }) => {
                    return {
                        type: "Constructible",
                        isEmpty: false,
                        player,
                        plot: GameplayMap.getIndexFromLocation(constructible.location),
                        constructible,
                        constructibleType
                    };
                });
            });
        }

        // Doesn't exist in the game, but we can handle it
        case "COLLECTION_CITY_CONSTRUCTIBLES": {
            if (parentSubject?.type !== "City") {
                throw new Error("COLLECTION_CITY_CONSTRUCTIBLES requires a parentSubject (City)");
            }

            if (parentSubject.isEmpty === true) {
                return [ { isEmpty: true, type: "Constructible" } ];
            }

            return findCityConstructibles(parentSubject.city).map(({ constructible, constructibleType }) => {
                return {
                    type: "Constructible",
                    isEmpty: false,
                    player,
                    plot: GameplayMap.getIndexFromLocation(constructible.location),
                    constructible,
                    constructibleType
                };
            });
        }

        // Nested (City)
        case "COLLECTION_CITY_PLOT_YIELDS": {
            if (parentSubject?.type !== "City") {
                throw new Error("COLLECTION_CITY_PLOT_YIELDS requires a parentSubject (City)");
            }

            if (parentSubject.isEmpty === true) {
                return [ { isEmpty: true, type: "Plot" } ];
            }

            return parentSubject
                .city
                .getPurchasedPlots()
                .filter(plot => {
                    const location = GameplayMap.getLocationFromIndex(plot);
                    return MapConstructibles.getHiddenFilteredConstructibles(location.x, location.y).length > 0
                })
                .map(plot => {
                    return {
                        type: "Plot",
                        isEmpty: false,
                        city: parentSubject.city,
                        plot,
                        player
                    };
                });
        }
        
        // We are interested only in our units
        case "COLLECTION_ALL_UNITS":
            return wrapUnitSubjects(
                player.Units.getUnitIds().map(unitId => Units.get(unitId))
            );

        case "COLLECTION_PLAYER_UNITS":
            return wrapUnitSubjects(
                player.Units.getUnitIds().map(unitId => Units.get(unitId))
            );

        case "COLLECTION_UNIT_COMBAT": {
            const combatUnits = player.Units.getUnitIds().map(unitId => {
                const unit = Units.get(unitId);
                if (!unit.isCombat) return null;
                return unit; 
            }).filter(isNotNull);
            return wrapUnitSubjects(combatUnits);
        }

        
        // Nested (Unit)
        case "COLLECTION_UNIT_OCCUPIED_CITY":
            console.warn("COLLECTION_UNIT_OCCUPIED_CITY not implemented");
            return [];

        case "COLLECTION_CITIES_FOLLOWING_OWNER_RELIGION": // Technically easy to grab, but no interesting effects applied
        // Recognized, but we can't provide simple yields for these:
        case "COLLECTION_PLAYER_COMBAT":
        // Per-plot bonuses from constructible-modifiers or globals affecting other players.
        // not relevant for our local-player yield preview (atleast, I think)
        case "COLLECTION_SINGLE_PLOT_YIELDS":
        case "COLLECTION_ALL_PLOT_YIELDS":
        case "COLLECTION_ALL_CAPITAL_CITIES":
            return [];

        // Districts
        case "COLLECTION_PLAYER_DISTRICTS": {
            const districts = player.Cities.getCities().flatMap(city => {
                return city.Districts.getIds().map(districtId => Districts.get(districtId));
            });
            return wrapDistrictSubjects(districts);
        }


        default:
            throw new Error(`Unhandled CollectionType: ${modifier.CollectionType}`);
    }
}
