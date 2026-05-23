import { PolicyYieldsCache } from "../cache.js";

/**
 * @param {Player} player 
 * @returns {UnitTypesInfo}
 */
export function retrieveUnitTypesMaintenance(player) {
    const units = player.Units?.getUnits() || [];
    /** @type {UnitTypesInfo} */
    const unitTypes = {};

    for (const unit of units) {
        if (unitTypes[unit.type]) continue;

        const unitTypeInfo = GameInfo.Units.lookup(unit.type);
        if (!unitTypeInfo) {
            console.warn(`Unit type not found: ${unit.type}`);
            continue;
        }

        const count = player?.Units.getNumUnitsOfType(unit.type);
        // Use the unit's *base* maintenance × count rather than
        // player.Treasury.getMaintenanceForAllUnitsOfType, which reflects already-active
        // modifiers: so when the policy being previewed is itself slotted, the live cost
        // is already reduced and clamping against it would zero out the displayed savings.
        const maintenance = (unitTypeInfo.Maintenance || 0) * count;

        unitTypes[unit.type] = {
            UnitType: unitTypeInfo,
            Count: count,
            MaintenanceCost: maintenance,
        };
    }

    return unitTypes;
}

/**
 * @param {Unit} unitType
 * @param {ResolvedArguments} args
 */
export function isUnitTypeInfoTargetOfArguments(unitType, args) {
    if (args.UnitTag?.Value || args.Tag?.Value) {
        const tagStr = args.UnitTag?.Value || args.Tag?.Value || "";
        const tags = tagStr.split(",").map(tag => tag.trim());
        if (!tags.some(tag => PolicyYieldsCache.hasTypeTag(unitType.UnitType, tag))) {
            return false;
        }
    }
    if (args.UnitClass?.Value) {
        if (!PolicyYieldsCache.hasTypeTag(unitType.UnitType, args.UnitClass.Value)) {
            return false;
        }
    }
    if (args.UnitDomain?.Value) {
        if (unitType.Domain !== args.UnitDomain.Value) {
            return false;
        }
    }
    return true;
}

/**
 * @param {Player} player 
 */
export function getArmyCommanders(player) {
    const unitIds = player.Units.getUnitIds();
    const commanders = unitIds
        .map(id => Units.get(id))
        .filter(unit => unit.Experience.canEarnExperience && unit.isArmyCommander);

    return commanders;
}

/**
 * 
 * @param {UnitInstance} unit
 * @param {string} tag 
 */
export function hasUnitTag(unit, tag) {
    return Units.hasTag(unit.id, tag);
}

// TRADE (TODO Move to trade.js)
/**
 * @param {TradeRouteInstance} route 
 */
export function calculateRouteGoldYield(route) {
    // const ageMultiplier = GameInfo.Ages.lookup(Game.age).TradeSystemParameterSet
}

