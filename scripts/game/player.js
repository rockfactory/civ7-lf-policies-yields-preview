import DiplomacyManager from "/base-standard/ui/diplomacy/diplomacy-manager.js";
import { PolicyYieldsCache } from "../cache.js";

/**
 * Return all the city states that are tributaries of the player
 * @param {Player} player
 */
export function getPlayerCityStatesSuzerain(player) {
    const cityStates = Players.getAlive().filter(otherPlayer =>
        otherPlayer.isMinor &&
        otherPlayer.Influence?.hasSuzerain &&
        otherPlayer.Influence.getSuzerain() === player.id
    );
    return cityStates;
}

/**
 * Return the city states suzerained by the player whose civilization carries
 * the TRAIT_CITY_STATE_<csType> trait (e.g. EXPANSIONIST, MILITARISTIC, ...).
 * Falls back to the full suzerain count if no city-state matches the trait
 * lookup (defensive: avoids returning 0 if the trait naming changes).
 * @param {Player} player
 * @param {string} csType
 */
export function getPlayerCityStatesSuzerainOfType(player, csType) {
    const suzerains = getPlayerCityStatesSuzerain(player);
    const requiredTrait = `TRAIT_CITY_STATE_${csType}`;
    let matched = 0;
    let lookupSucceeded = false;
    for (const cs of suzerains) {
        const civType = GameInfo.Civilizations.lookup(cs.civilizationType)?.CivilizationType;
        if (!civType) continue;
        const traits = PolicyYieldsCache.getCivilizationTraits(civType);
        if (traits.size > 0) lookupSucceeded = true;
        if (traits.has(requiredTrait)) matched++;
    }
    return lookupSucceeded ? matched : suzerains.length;
}

/**
 * Count distinct civilization types of cities the player has conquered.
 * Used by EFFECT_PLAYER_ADJUST_YIELD_PER_UNIQUE_CIV_CONQUERED_CITY.
 * @param {Player} player
 */
export function countUniqueConqueredCivilizations(player) {
    const uniqueCivs = new Set();
    for (const city of player.Cities.getCities()) {
        if (city.originalOwner === player.id) continue;
        const originalPlayer = Players.get(city.originalOwner);
        if (!originalPlayer || !originalPlayer.isMajor) continue;
        uniqueCivs.add(originalPlayer.civilizationType);
    }
    return uniqueCivs.size;
}

/**
 * Count copies of a specific ResourceType owned (allocated) by the player.
 * @param {Player} player
 * @param {string} resourceTypeName
 */
export function countPlayerResourcesByType(player, resourceTypeName) {
    const resources = player.Resources?.getResources() || [];
    let count = 0;
    for (const entry of resources) {
        const def = GameInfo.Resources.lookup(entry.uniqueResource.resource);
        if (def?.ResourceType === resourceTypeName) count++;
    }
    return count;
}

/**
 * Count resources owned by the player that belong to a specific ResourceClassType.
 * @param {Player} player
 * @param {string} resourceClassType
 */
export function countPlayerResourcesByClass(player, resourceClassType) {
    const resources = player.Resources?.getResources() || [];
    let count = 0;
    for (const entry of resources) {
        const def = GameInfo.Resources.lookup(entry.uniqueResource.resource);
        if (def?.ResourceClassType === resourceClassType) count++;
    }
    return count;
}

/**
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerRelationshipsCountForModifier(player, modifier) {
    const allPlayers = Players.getAlive();
    let allies = 0;
    allPlayers.forEach(otherPlayer => {
        if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
            return;
        }

        if (modifier.Arguments.UseAlliances?.Value === 'true' &&
            player.Diplomacy?.hasAllied(otherPlayer.id)) {
            allies++;
        }

        if (modifier.Arguments.RelationshipType?.Value) {
            // Engine expects the target player ID, not the Player object (runtime
            // "Wrong type - expected Number or BigInt" otherwise).
            const relationship = player.Diplomacy?.getRelationshipEnum(otherPlayer.id);
            const relationshipType = DiplomacyManager.getRelationshipTypeString(relationship);
            if (relationshipType == modifier.Arguments.RelationshipType.Value) {
                allies++;
            }
        }
    });
    return allies;
}

/**
 * @param {Player} player
 */
export function isPlayerAtWarWithOpposingIdeology(player) {
    const allPlayers = Players.getAlive();
    for (const otherPlayer of allPlayers) {
        if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
            continue;
        }

        if (!player.Diplomacy?.isAtWarWith(otherPlayer.id)) {
            continue;
        }

        const playerIdeology = player.Diplomacy?.getIdeology();
        const otherPlayerIdeology = otherPlayer.Diplomacy?.getIdeology();
        if (playerIdeology == -1 || otherPlayerIdeology == -1) continue;
        
        // Same ideology
        if (playerIdeology == otherPlayerIdeology) continue;

        return true;
    }

    return false;
}

/**
 * @param {Player} player
 */
export function isPlayerAtPeaceWithMajors(player) {
    const allPlayers = Players.getAlive();
    for (const otherPlayer of allPlayers) {
        if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
            continue;
        }

        if (player.Diplomacy?.isAtWarWith(otherPlayer.id)) {
            return false;
        }
    }

    return true;
}

/**
 * Count active Government-slotted items selected by the modifier's filter.
 *
 * Naming note: `GameInfo.Traditions` (and the engine API `getActiveTraditions`)
 * cover BOTH actual Traditions (CultureSlotType=TRADITION_CULTURE_SLOT) AND
 * Social Policies (CultureSlotType=POLICY_CULTURE_SLOT). The EFFECT name
 * `_PER_ACTIVE_TRADITION` is generic — what's counted depends on the modifier's
 * arguments:
 *
 *   - `CivUnique=true` (no Invert)  → keep items WITH a `TraitType` set
 *                                     → in practice, civ-unique Traditions
 *   - `CivUnique=true, Invert=true` → keep items WITHOUT a `TraitType`
 *                                     → in practice, Social Policies
 *   - `CivUnique=false`             → no filter, count all slotted items
 *
 * Examples:
 *   ORDER_AND_PROGRESS_I (CivUnique=true)                       → Mexican Traditions
 *   FRENCH_EMPIRE_SYNCRETISM_*_POLICY_HAPPINESS (Invert=true)   → Social Policies
 *     (description: "+X Happiness for every Social Policy slotted")
 *   MEMENTO_LAFAYETTE_LETTER_ADRIENNE_MODIFIER_2 (Invert=true)  → Social Policies
 *   TRAIT_MOD_*_LOSE_SCIENCE_PER_NON_UNIQUE_TRADITION (Ming)    → Social Policies
 *     (modifier ID says "non-unique tradition" but means Policies)
 *
 * Also: the engine's `getActiveTraditions(slotType)` requires a slot type
 * argument (see Base/modules/base-standard/ui/policies/model-policies.js);
 * without it, the call returns nothing and the count silently collapses to 0.
 *
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 * @param {string | null} [previewedTraditionType] PK of the item being previewed.
 *     When it's a Tradition and not yet slotted, it's counted as +1 so the
 *     tooltip shows the "if you slot this" value.
 */
export function getPlayerActiveTraditionsForModifier(player, modifier, previewedTraditionType = null) {
    const requireCivUnique = modifier.Arguments.CivUnique?.Value === 'true';
    const invertFilter = modifier.Arguments.Invert?.Value === 'true';

    // Pool both slot types: Traditions live in TRADITION_CULTURE_SLOT, Policies
    // in POLICY_CULTURE_SLOT, and let the filter pick which contribute.
    const allItems = [
        ...player.Culture.getActiveTraditions(CultureSlotTypes.TRADITION_CULTURE_SLOT),
        ...player.Culture.getActiveTraditions(CultureSlotTypes.POLICY_CULTURE_SLOT),
    ];

    /** @param {Tradition | null | undefined} itemInfo */
    const matchesFilter = (itemInfo) => {
        if (!requireCivUnique) return true;
        const hasTrait = !!itemInfo?.TraitType;
        return invertFilter ? !hasTrait : hasTrait;
    };

    let count = 0;
    for (const item of allItems) {
        const itemInfo = GameInfo.Traditions.lookup(item);
        if (matchesFilter(itemInfo)) count++;
    }

    if (previewedTraditionType) {
        // GameInfoArray<T>.lookup only accepts a hash; use .find() for the PK string.
        const previewedInfo = GameInfo.Traditions.find(t => t.TraditionType === previewedTraditionType);
        // Self-include the previewed card iff this modifier would count it:
        //   - it lives in a slot the modifier pools (TRADITION/POLICY, not Crisis), AND
        //   - it satisfies the CivUnique/Invert filter, AND
        //   - it isn't already slotted (would double-count).
        // The filter check makes this slot-aware automatically: e.g. previewing a
        // Tradition on a modifier with Invert=true won't self-add, because the
        // modifier counts only Policies in that case.
        const isInPool = previewedInfo?.CultureSlotType === 'TRADITION_CULTURE_SLOT'
                      || previewedInfo?.CultureSlotType === 'POLICY_CULTURE_SLOT';
        if (isInPool && previewedInfo) {
            const alreadyActive = player.Culture.isTraditionActive(previewedInfo.$hash);
            if (!alreadyActive && matchesFilter(previewedInfo)) count++;
        }
    }

    return count;
}

/**
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerCompletedMasteries(player, modifier) {
    /** @type {ProgressionResearchedNode[]} */
    let nodes = [];

    switch (modifier.Arguments.SystemType.Value) {
        case "SYSTEM_TECH": nodes = player.Techs.getResearched(); break;
        case "SYSTEM_CULTURE": nodes = player.Culture.getResearched(); break;
        default: throw new Error(`${modifier.Modifier.ModifierId}: getPlayerCompletedMasteries Unsupported SystemType: ${modifier.Arguments.SystemType.Value}`);
    }

    return nodes.filter(node => node.depth >= 2).length;
}

/**
 * Count of "unlocked" nodes in the player's progression tree, used by
 * EFFECT_CITY_ADJUST_YIELD_PER_UNLOCKED_PROGRESSION_TREE_NODE (DURANI,
 * DURANI_II, ADA_LOVELACE). All in-game tooltips referencing this effect
 * describe the count as "Mastery completed" — depth 2 nodes (see
 * ProgressionResearchedNode in types/engine.d.ts: "1 = normal, 2 = mastery").
 * Kept separate from getPlayerCompletedMasteries because the EffectType
 * differs and the engine may eventually diverge.
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerUnlockedProgressionTreeNodes(player, modifier) {
    /** @type {ProgressionResearchedNode[]} */
    let nodes = [];

    switch (modifier.Arguments.SystemType?.Value) {
        case "SYSTEM_TECH": nodes = player.Techs.getResearched(); break;
        case "SYSTEM_CULTURE": nodes = player.Culture.getResearched(); break;
        default: throw new Error(`${modifier.Modifier.ModifierId}: getPlayerUnlockedProgressionTreeNodes Unsupported SystemType: ${modifier.Arguments.SystemType?.Value}`);
    }

    return nodes.filter(node => node.depth >= 2).length;
}

/**
 * Count the player's outgoing trade routes whose destination city is owned by a minor
 * (city-state) player. Used by EFFECT_CITY_ADJUST_YIELD_PER_CITY_STATE_TRADE_ROUTE
 * (TONGA_SYNCRETISM, QUARTER_TOFI_A).
 * @param {Player} player
 */
export function countPlayerTradeRoutesToCityStates(player) {
    let count = 0;
    for (const city of player.Cities.getCities()) {
        const routes = city.Trade?.routes ?? [];
        for (const route of routes) {
            if (route.leftCityID.owner !== player.id) continue;
            const otherId = route.rightCityID.owner;
            if (otherId == null || otherId === player.id) continue;
            const otherPlayer = Players.get(otherId);
            if (!otherPlayer?.isMinor) continue;
            count++;
        }
    }
    return count;
}

/**
 * Resolve a trade route's domain. `TradeRouteInstance` from `city.Trade.routes` does NOT expose
 * a `.domain` field (verified empirically: only id/name/cityIDs/payloads are present).
 *
 * We tried `player.Trade.getCurrentTradeRoutes()` (exposes `.domain` but with `targetCityId/
 * nearestCityId` semantics flipped relative to outgoing routes — `targetCityId.owner` always
 * appears to be the local player, so matching a city.Trade.routes outgoing route by partner
 * doesn't work in practice).
 *
 * The trade graph (Game.Trade.getCityGraphEdges + getGraphEdge) IS the authoritative source.
 * It's what the Trade.ltp tuner panel uses to read `edge.domain` and `edge.numActiveRoutes`.
 * Each edge connects two vertices (cities) for a specific domain (SEA=0/AIR=1/LAND=2); we find
 * the active edge that connects our route's two cities and return its domain.
 * 
 * In the end, it's really counter-intuitive that the engine doesn't expose 
 * the domain directly on the route instance, but this is what it is. Or 
 * maybe I didn't find it. It seems to be working right now, se I'll take it.
 *
 * @param {TradeRouteInstance} route
 * @returns {number} Numeric DomainType id (compare against `DomainType.DOMAIN_SEA`, etc.).
 */
export function getTradeRouteDomain(route) {
    // NOTE Some warnings, but they seems to be wrong. We don't care?
    const edgeIds = Game.Trade.getCityGraphEdges(route.leftCityID);
    for (const edgeId of edgeIds) {
        const edge = Game.Trade.getGraphEdge(edgeId);
        if (!edge) continue;
        const from = edge.fromVertex.cityId;
        const to = edge.toVertex.cityId;
        if (!from || !to) continue;
        const matchesForward =
            from.owner === route.leftCityID.owner && from.id === route.leftCityID.id
            && to.owner === route.rightCityID.owner && to.id === route.rightCityID.id;
        const matchesReverse =
            from.owner === route.rightCityID.owner && from.id === route.rightCityID.id
            && to.owner === route.leftCityID.owner && to.id === route.leftCityID.id;
        if (matchesForward || matchesReverse) return edge.domain;
    }
    throw new Error(`getTradeRouteDomain: no graph edge found for route ${route.id} (${route.name}) between ${route.leftCityID.owner}:${route.leftCityID.id} and ${route.rightCityID.owner}:${route.rightCityID.id}`);
}

/**
 * Group player's outgoing trade routes by the other player they go to, and return the maximum count.
 * Used by `REQUIREMENT_PLAYER_HAS_X_TRADE_ROUTES_WITH_PLAYER {AllPlayers=true}`: the requirement is
 * satisfied if AT LEAST ONE other player has ≥ Amount routes from us (OR semantics across players).
 * @param {Player} player
 */
export function getMaxTradeRoutesPerOtherPlayer(player) {
    const counts = new Map();
    for (const city of player.Cities.getCities()) {
        const routes = city.Trade?.routes ?? [];
        for (const route of routes) {
            if (route.leftCityID.owner !== player.id) continue;
            const otherId = route.rightCityID.owner;
            if (otherId == null || otherId === player.id) continue;
            counts.set(otherId, (counts.get(otherId) ?? 0) + 1);
        }
    }
    let max = 0;
    for (const count of counts.values()) {
        if (count > max) max = count;
    }
    return max;
}

/**
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerOngoingDiplomacyActions(player, modifier) {
    let ongoingActions = Game.Diplomacy
        .getPlayerEvents(player.id)
        .filter(action => {
            const isValid = action.initialPlayer == player.id || (action.targetPlayer == player.id && action.revealed);
            if (!isValid) return false;

            if (modifier.Arguments.ActionGroupType?.Value) {
                const actionGroupType = GameInfo.DiplomacyActionGroups.lookup(action.actionGroup);
                if (!actionGroupType) return false;
                const actionGroupTypeName = actionGroupType.Name;
                if (actionGroupTypeName != modifier.Arguments.ActionGroupType.Value) return false;
            }

            return true;
        });

    return ongoingActions;
}