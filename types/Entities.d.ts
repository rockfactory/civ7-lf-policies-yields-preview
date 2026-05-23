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
 * Exposes `.domain` (which the thin `TradeRouteInstance` does not), plus same-id linkage.
 */
declare interface CurrentTradeRoute {
    id: number;
    /** Numeric DomainType id (0 = SEA, etc.). */
    domain: number;
    status: number[];
    targetCityId: ID;
    nearestCityId: ID;
    importPayloads: unknown[];
}