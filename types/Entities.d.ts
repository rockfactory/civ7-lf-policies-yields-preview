declare interface Location {
    x: number;
    y: number;
}
  
declare interface ID {
    owner: number;
    id: number;
    type: number;
}

declare interface GreatWorkSlot {
    greatWorkIndex: number;
    slotType: number;
  }
  
declare interface GreatWorkBuilding {
    constructibleID: ConstructibleID;
    slots: GreatWorkSlot[];
}
  
declare interface ConstructibleInstance {
    damaged: boolean;
    complete: boolean;
    location: Location;
    cityId: ID;
    owner: number;
    originalOwner: number;
    type: number;
    localId: number;
    id: ID;
}
  
declare interface TradeRouteInstance {
    /** Primitive route id (e.g. 786443). Shared between `city.Trade.routes` and `player.Trade.getCurrentTradeRoutes()`. */
    id: number;
    name: string;
    leftCityID: ID;
    rightCityID: ID;
    leftPayload: {
        resourceValues: ID[];
    };
    rightPayload: {
        resourceValues: ID[];
    };
}

/**
 * Richer view of a current trade route as returned by `player.Trade.getCurrentTradeRoutes()`.
 * Exposes `.domain` (which the thin `TradeRouteInstance` does not). NOTE: does NOT expose
 * a primitive `id` — verified empirically. The two views are linked via the partner city
 * (`TradeRouteInstance.rightCityID` ↔ `CurrentTradeRoute.targetCityId` for outgoing routes).
 */
declare interface CurrentTradeRoute {
    /** Numeric DomainType id (0 = SEA, 1 = AIR, 2 = LAND). */
    domain: number;
    /** Array of TradeRouteStatus codes (e.g. ALREADY_EXISTS for active routes). */
    status: number[];
    /** Destination/partner city. */
    targetCityId: ID;
    /** Origin city (closest in our trade network). */
    nearestCityId: ID;
    importPayloads: unknown[];
}