declare type EngineEventListener = (...args: any[]) => void;
declare var engine: {
    on(event: string, listener: EngineEventListener): void;
    off(event: string, listener: EngineEventListener): void;
    trigger(event: string, ...args: any[]): void;
    [key: string]: any;
};
declare class Component {}
declare var Controls: any;

declare var Locale: {
    compose(key: string, ...args: any[]): string;
    [key: string]: any;
};

declare var GameContext: {
    localPlayerID: number;
    localObserverID: number;
    [key: string]: any;
};

declare var PlayerOperationTypes: {
    readonly GRANT_TREE_NODE: number;
    readonly SET_TECH_TREE_NODE: number;
    readonly SET_TECH_TREE_TARGET_NODE: number;
    readonly SET_CULTURE_TREE_NODE: number;
    readonly SET_CULTURE_TREE_TARGET_NODE: number;
    readonly [key: string]: number;
};

declare var CultureSlotTypes: {
    readonly TRADITION_CULTURE_SLOT: number;
    readonly POLICY_CULTURE_SLOT: number;
    readonly CRISIS_CULTURE_SLOT: number;
    readonly [key: string]: number;
};

declare interface PlayerOperationResult {
    Success: boolean;
    [key: string]: any;
}

declare interface PlayerOperationsApi {
    sendRequest(playerId: number, operationType: number, args: Record<string, any>): void;
    canStart(playerId: number, operationType: number, args: Record<string, any>, isTest: boolean): PlayerOperationResult;
}

declare interface ProgressionResearchingNode {
    type: number;
    progress?: number;
    depth?: number;
}

declare interface PlayerTechs {
    getResearched(): ProgressionResearchedNode[];
    getResearching(): ProgressionResearchingNode | null;
    getTargetNode(): number;
    getTreeType(): number;
    getNodeCost(nodeType: number): number;
    getLastCompletedNodeType(): number;
}
declare interface PlayerReligion {
    getReligionType: () => number; // -1 if no religion
    getReligionName: () => string;
    getBeliefs: () => number[];
    getPantheonType: () => number;
}

/**
 * Player-scoped trade API. Members observed at runtime on the local player's `Trade`
 * prototype (Object.getPrototypeOf(player.Trade)) — see `screen-policies-yields-decorator.js`
 * diagnostic dump. Signatures inferred from Trade.ltp tuner panel and commerce-screen-model.js.
 */
declare interface PlayerTrade {
    /** Returns a TradeRouteStatus code (numeric) — SUCCESS, AT_WAR, DISTANCE, OVER_OCEAN, NO_URBAN_SEA_ROUTE, NO_RESOURCES, NEED_MORE_FRIENDSHIP, ALREADY_EXISTS, ... */
    canStartTradeRouteToCity(cityId: ID, domainType: number): number;
    /** Number of trade routes currently terminating in the given city. */
    countPlayerCityRoutes(cityId: ID): number;
    /** Total current trade routes for this player (in + out). */
    countPlayerTradeRoutes(): number;
    /** Count of routes between this player and the given other player. */
    countPlayerTradeRoutesTo(playerId: number): number;
    /** Per-partner trade route capacity. */
    getTradeCapacityFromPlayer(playerId: number): number;
    /** Relationship gain (influence) from establishing a route with the given player. */
    getPotentialRelationshipGainFromTradeRouteWith(playerId: number): number;
    /** Find the city in our trade network closest to the given target. */
    getNearestCityInTradeNetwork(targetCityId: ID): ID | null;
    /**
     * All trade routes currently incident to this player, with full per-route info
     * (notably `.domain` — which `city.Trade.routes` / `TradeRouteInstance` lacks).
     * Match against `TradeRouteInstance.id` (same numeric id space).
     */
    getCurrentTradeRoutes(): CurrentTradeRoute[];
    /** Project all possible routes given a bitmask of `TradeRouteSearchOptions`. */
    projectPossibleTradeRoutes(searchOptions?: number): ProjectedTradeRoute[];
    /** Variant scoped to a subset of other players. */
    projectPossibleTradeRoutesToPlayers(playerIds: number[], searchOptions?: number): ProjectedTradeRoute[];
    /** Variant scoped to a subset of target cities. */
    projectPossibleTradeRoutesToCities(cityIds: ID[], searchOptions?: number): ProjectedTradeRoute[];
    /** Async variant of projectPossibleTradeRoutes. */
    projectPossibleTradeRoutesAsync(searchOptions?: number): Promise<ProjectedTradeRoute[]>;
}

/**
 * Output of `player.Trade.projectPossibleTradeRoutes()` — hypothetical/possible routes from
 * a candidate trader's perspective. Has its own shape distinct from active `TradeRouteInstance`
 * (e.g. uses `targetCityId`/`nearestCityId` instead of `leftCityID`/`rightCityID`).
 */
declare interface ProjectedTradeRoute {
    /** Numeric DomainType id (0 = SEA, 1 = AIR, 2 = LAND). */
    domain: number;
    /** Bitmask / array of TradeRouteStatus codes. */
    status: number[];
    targetCityId: ID;
    nearestCityId: ID;
    importPayloads: unknown[];
    exportYields?: { yieldType: number; amount: number }[];
    pathPlots?: number[];
}

/**
 * Game-scoped (global) trade API. Members observed at runtime on `Game.Trade`'s prototype
 * (see screen-policies-yields-decorator.js diagnostic dump).
 */
declare interface GameTrade {
    /** Sum of route export yield (e.g. `YIELD_GOLD`) for a single route. `routeId` is the primitive `TradeRouteInstance.id`. */
    calculateTradeRouteExportYield(routeId: number, yieldType: string): number;
    /** Lookup a single route by its primitive numeric id; returns the same thin shape as `city.Trade.routes`. */
    findTradeRouteByID(routeId: number): TradeRouteInstance | null;
    /** Find a route between two specific cities (if any). */
    findTradeRouteBetween(cityIdA: ID, cityIdB: ID): TradeRouteInstance | null;
    /** All current routes incident to a city (same thin shape as `city.Trade.routes`, no `.domain`). */
    getCityRoutes(cityId: ID): TradeRouteInstance[];
    /** Localization key / display name for a route. */
    getTradeRouteName(routeId: number): string;
    /** Hypothetical payloads if the route were established. */
    projectTradeRoutePayloads(originCityId: ID, targetCityId: ID, domainType: number): unknown[];
    /** Hypothetical path plot indices for a route. */
    projectTradeRoutePathPlots(originCityId: ID, targetCityId: ID, domainType: number): number[];
    /** Hypothetical export yields for a route. */
    projectTradeRouteExportYields(originCityId: ID, targetCityId: ID, domainType: number): { yieldType: number; amount: number }[];
    /**
     * Returns the trade graph edge IDs incident to the given city (one per domain × partner).
     * Counter-intuitive: takes a ComponentID `{owner, id, type}` even though the engine logs
     * "Argument conversion failed: expected <Number or BigInt>, got Object" — the call still
     * returns the correct iterable. Passing a real bigint bitfield instead returns nothing.
     */
    getCityGraphEdges(cityId: ID): number[];
    /** Resolve a graph edge id to its full record (domain + active route count + vertices). */
    getGraphEdge(edgeId: number): TradeGraphEdge | null;
}

/** Trade graph edge between two vertices (cities or plot locations), per domain. */
declare interface TradeGraphEdge {
    /** Numeric DomainType id (0 = SEA, 1 = AIR, 2 = LAND — confirmed in Trade.ltp tuner). */
    domain: number;
    /** Don't filter on this: empirically 0 even when the route is active. Semantics unclear. */
    numActiveRoutes: number;
    fromVertex: TradeGraphVertex;
    toVertex: TradeGraphVertex;
    path: number[];
}

declare interface TradeGraphVertex {
    cityId?: ID;
    location?: Location;
}

declare var Players: {
    get: (playerId: number) => Player;
    getAlive: () => Player[];
    Religion?: {
        get: (playerId: number) => PlayerReligion | null;
    }
};
declare var MapCities: any;
declare var Loading: any;
declare var RevealedStates: any;
declare var WorldUI;

/** Runtime enum: maps DOMAIN_SEA/DOMAIN_AIR/DOMAIN_LAND strings to numeric ids the engine uses on TradeRouteInstance.domain. */
declare var DomainType: { [domainType: string]: number };

declare interface Constructibles {
    getByComponentID: (componentId: ID) => ConstructibleInstance;
}
declare var Constructibles: Constructibles;

interface City {
    turn: number;
    maxTurns: number;
    age: number;
    isJustConqueredFrom: boolean;
    getTurnsUntilRazed: number;
    isBeingRazed: boolean;
    isInfected: boolean;
    isDistantLands: boolean;
    isTown: boolean;
    isCapital: boolean;
    ruralPopulation: number;
    urbanPopulation: number;
    pendingPopulation: number;
    population: number;
    location: Location;
    name: string;
    owner: number;
    originalOwner: number;
    localId: number;
    id: ID;
    getConnectedCities: () => ID[]; // ??
    getPurchasedPlots: () => number[];
    Religion?: {
        majorityReligion: number;
        urbanReligion: number;
        ruralReligion: number;
    };
    Growth: {
        projectType: number;
        growthType: number;        
    };
    Yields: {
        getNetYield: (yieldType: string) => number;
        getYieldsForType: (yieldType: string) => YieldEntry;
    };
    Resources: {
        getTotalCountAssignedResources: () => number;
        getAssignedResourcesCap(): number;
        /**
         * Returns entries for resources currently assigned to this city.
         *
         * IMPORTANT: `value` is the resource's per-instance LOCATION id, NOT the ResourceType
         * hash. `GameInfo.Resources.lookup(value)` returns undefined. To resolve the definition,
         * map via the owning player: `player.Resources.getResources()` → match by `.value`, then
         * `GameInfo.Resources.lookup(entry.uniqueResource.resource)` on the matched entry.
         * See `countCityResourcesByClass` in scripts/game/city.js.
         */
        getAssignedResources: () => { value: number }[];
    };
    Constructibles: {
        getIds: () => ID[];
        /** Returns an array of **positive** amounts, mainteneance cost for each yield type */
        getMaintenance: (type: string) => number[];
        getIdsOfType: (type: string) => ID[];
        hasConstructible: (type: string, unknownArg: boolean) => boolean;
        getGreatWorkBuildings: () => GreatWorkBuilding[];
        getNumWonders: () => number;
    };
    Workers: {
        getNumWorkersAtPlot: (plotIndex: number) => number;
        hasMaxWorkersAtPlot: (plotIndex: number) => boolean;
        getNumWorkers: () => number;
        getCityWorkerCap: () => number;
    };
    Trade: {
        routes: TradeRouteInstance[];
    };
    Districts: {
        cityCenter: ID;
        getIds: () => ID[];
        getIdsOfType: (type: number) => ID[]; /* see DistrictTypes */
        // getIdsOfTypes: (types: string[]) => ID[];
        // removeDistrict: (districtId: ID) => void;
        // getNumDistricts: () => number;
        // getNumDistrictsOfType: (type: string) => number;
        // hasDistrict: (type: string) => boolean;
    };
}

declare type YieldStep = {
    value: number;
    type: number;
    id: number;
    description?: string;
    base?: YieldStep;
    steps?: YieldStep[];
    modifier?: YieldStep;
};
  
declare type YieldEntry = {
    value: number;
    type: number;
    id: number;
    description: string;
    base: YieldStep;
    modifier?: YieldStep;
};

interface PlayerCities {
    numCities: number;
    getCities: () => City[];
    getCityIds: () => ID[];
    getCapital: () => any;
    // findClosest: (x: number, y: number) => any; // Returns the closest city to given coordinates
    destroy: (cityId: ID) => void;     
}

interface PlayerUnits {
    getUnitIds: () => ID[];
    getNumUnitsOfType: (unitType: number) => number;
    getUnits: () => UnitInstance[];
}

interface PlayerCulture {
    getNumWorksInArchive: () => number;
    getArchivedGreatWork: (numInArchive: number) => number;
    getGreatWorkType: (index: number) => number;
    getActiveTraditions: (slotType: number) => number[];
    isTraditionActive: (traditionHash: number) => boolean;
    getResearched(): ProgressionResearchedNode[];
    getResearching(): ProgressionResearchingNode | null;
    getTargetNode(): number;
    getAvailableTrees(): number[];
    getNodeCost(nodeType: number): number;
    getLastCompletedNodeType(): number;
    /** Make a single tradition (policy card) slottable, by tradition `$index`. */
    unlockTradition(traditionIndex: number): void;
    /** Whether a tradition (policy card) is currently unlocked, by `$index`. */
    isTraditionUnlocked(traditionIndex: number): boolean;
}

declare interface ProgressionResearchedNode {
    type: number;
    depth: number; // 1 = normal, 2 = mastery
    maxDepth: number;
    state: number;
    progress: number;
}

declare interface PlayerResourceEntry {
    value: number;
    uniqueResource: {
        resource: number; // numeric ResourceType hash; lookup with GameInfo.Resources.lookup(...)
    };
}

declare interface PlayerResources {
    getResources: () => PlayerResourceEntry[];
    getCountImportedResources: () => number;
    isRessourceAssignmentLocked: () => boolean; // base game typo preserved
}

declare interface PlayerInfluence {
    hasSuzerain: boolean;
    getSuzerain: () => number; // playerId of suzerain, -1 if none
}

declare interface PlayerHappiness {
    isInGoldenAge: () => boolean;
    getGoldenAgeDuration: () => number;
    getGoldenAgeTurnsLeft: () => number;
    nextGoldenAgeThreshold: number;
}

declare interface Player {
    Units: PlayerUnits;
    Cities: PlayerCities;
    Culture: PlayerCulture;
    Identity: any;
    Diplomacy: {
        getIdeology: () => number; // -1 if no ideology
        getRelationshipEnum: (otherPlayerId: number) => number;
        hasAllied: (otherPlayerId: number) => boolean;
        isAtWarWith: (otherPlayerId: number) => boolean;
        /**
         * War-support bonus accumulated by THIS player against `targetPlayerId`.
         * `isFormalWar` toggles formal vs surprise-war computation rules.
         * See `base-standard/ui/diplomacy/diplomacy-manager.js` for the canonical
         * call pattern: `canDeclareWarOn(target, WarTypes.FORMAL_WAR).Success` is
         * passed as the boolean. For an ongoing war, `true` is the safe default.
         */
        getTotalWarSupportBonusForPlayer: (targetPlayerId: number, isFormalWar: boolean) => number;
        /** War-support bonus accumulated by `targetPlayerId` against THIS player. Same semantics as the For variant. */
        getTotalWarSupportBonusForTarget: (targetPlayerId: number, isFormalWar: boolean) => number;
    };
    Stats: {
        getYields(): YieldEntry[]; // index is the yield type,e.g. 0 = food/gold
        getNetYield: (yieldType: string) => number;
        getLifetimeYield: (yieldType: string) => number;
        /**
         * Number of settlements following the given religion type.
         * @param religionType numeric religion type from PlayerReligion.getReligionType()
         * @param isTown true to count only towns, false to count only cities
         */
        getNumMyCitiesFollowingSpecificReligion: (religionType: number, isTown: boolean) => number;
        numCities: number;
        numTowns: number;
        numSettlements: number;
        numImprovedTiles: number;
        settlementCap: number;
        totalPopulation: number;
    };
    Treasury: {
        /** Returns a **positive** amount (e.g. 20) */
        getMaintenanceForAllUnitsOfType: (unitType: number) => number;
        /** Add (positive) or remove (negative) gold from the player. `reason` is an enum hash, pass -1 when unknown. */
        changeGoldBalance: (amount: number, reason: number) => void;
        goldBalance: number;
    };
    DiplomacyTreasury: {
        /** Add (positive) or remove (negative) influence from the player. */
        changeDiplomacyBalance: (amount: number) => void;
        diplomacyBalance: number;
    };
    Trade: PlayerTrade;
    Techs: PlayerTechs;
    Happiness?: PlayerHappiness;
    Influence?: PlayerInfluence;
    Resources: PlayerResources;
    isMinor: boolean;
    isMajor: boolean;
    id: number;
    isDistantLands(coord: Location): boolean;
    civilizationType: number;
    leaderType: number;
    isHuman: boolean;
    isAI: boolean;
    isIndependent: boolean;
    isBarbarian: boolean;
    wasEverAlive: boolean;
    level: number; // Hash
    isValid: boolean;
}

declare var Player: Player;

declare interface Units {
    get(id: ID): UnitInstance;
    hasTag: (unitId: ID, tag: string) => boolean;
}

declare var Units: Units;

declare interface UnitExperience {
    getStoredCommendations: number;
    getStoredPromotionPoints: number;
    spentExperience: number;
    experienceToNextLevel: number;
    experiencePoints: number;
    canEarnExperience: boolean;
    getTotalPromotionsEarned: number;
    getLevel: number;
    getNumCommendations: number;
    getNumPromotions: number;
    canPromote: boolean;
}

declare interface UnitInstance {
    Experience: UnitExperience;
    activityType: number;
    operationQueueSize: number;
    hasPendingOperations: boolean;
    sightRange: number;
    canSeeThroughTerrain: boolean;
    canSeeThroughFeatures: boolean;
    isCombat: boolean;
    age: number;
    formationID: number;
    formationUnitCount: number;
    hasHiddenVisibility: boolean;
    noDefensiveBonusCount: number;
    noDefensiveBonus: boolean;
    isFortified: boolean;
    isReadyToAutomate: boolean;
    isAutomated: boolean;
    hasAdjacentMove: boolean;
    canCyclePast: boolean;
    isReadyToMove: boolean;
    isReadyToSelect: boolean;
    buildCharges: number;
    sightModifiers: any;
    hasMoved: boolean;
    movementDisabledThisTurn: boolean;
    canMove: boolean;
    needsMovementCompletion: boolean;
    embarkationType: number;
    isEmbarked: boolean;
    needsAttention: boolean;
    isOnMap: boolean;
    isBusy: boolean;
    isDead: boolean;
    operationTimer: number;
    isBarbarian: boolean;
    isGreatPerson: boolean;
    isCommanderUnit: boolean;
    isAerodromeCommander: boolean;
    isSquadronCommander: boolean;
    isFleetCommander: boolean;
    isArmyCommander: boolean;
    originCityId: number;
    location: Location;
    armyId: ID;
    name: string;
    owner: number;
    type: number;
    originalOwner: number;
    localId: number;
    id: ID;
}

declare interface Game {
    VictoryManager: Record<string, unknown>;
    Unlocks: Record<string, unknown>;
    UnitOperations: Record<string, unknown>;
    UnitCommands: Record<string, unknown>;
    Trade: GameTrade;
    Summary: Record<string, unknown>;
    Resources: Record<string, unknown>;
    Religion: Record<string, unknown>;
    RandomEvents: {
        stormPercentChance: number;
        eruptionPercentChance: number;
        floodPercentChance: number;
    };
    ProgressionTrees: {
        getNode(playerId: number, type: number): any;
    }
    PlayerOperations: PlayerOperationsApi;
    Notifications: Record<string, unknown>;
    PlacementRules: Record<string, unknown>;
    IndependentPowers: Record<string, unknown>;
    EconomicRules: Record<string, unknown>;
    DiplomacyDeals: Record<string, unknown>;
    DiplomacySessions: Record<string, unknown>;
    Diplomacy: {
        getPlayerEvents(playerId: number): DiplomacyAction[];
    }
    Culture: {
        getGreatWorkType: (index: number) => number;
    }
    CrisisManager: Record<string, unknown>;
    Combat: Record<string, unknown>;
    CityStates: Record<string, unknown>;
    CityOperations: Record<string, unknown>;
    CityCommands: Record<string, unknown>;
    AgeProgressManager: {
        isAgeOver: number;
        isFinalAge: boolean;
        isSingleAge: boolean;
    };
    turn: number;
    maxTurns: number;
    age: number;
}

declare interface DiplomacyAction {
    uniqueID: number;
    actionType: number;
    actionGroup: number;
    initialPlayer: number;
    targetPlayer: number;
    support: number;
    progressScore: number;
    completionScore: number;
    level: number;
    actionTypeName: string;
    name: string;
    canOppose: boolean;
    description: string;
    gameTurnStart: number;
    gameTurnEnd: number;
    hidden: boolean;
    revealed: boolean;
    failed: boolean;
    lastStageDuration: number;
    responseType: number;
  }
  
      
declare var Game: Game;

declare interface GameplayMap {
    getIndexFromLocation: (location: Location) => number;
    getLocationFromIndex: (index: number) => Location;
    getPlotIndicesInRadius: (x: number, y: number, radius: number) => number[];
    
    getAdjacentPlotLocation: (x: number, y: number, direction: string) => { x: number; y: number };
    getProperty: (x: number, y: number, propertyName: string) => any;
    findSecondContinent: () => number;
    getBiomeType: (x: number, y: number) => number;
    getAreaId: (x: number, y: number) => number;
    getLandmassId: (x: number, y: number) => number;
    getRegionId: (x: number, y: number) => number;
    getAreaIsWater: (x: number, y: number) => boolean;
    getContinentType: (x: number, y: number) => string;
    getDirectionToPlot: (x1: number, y1: number, x2: number, y2: number) => string;
    getElevation: (x: number, y: number) => number;
    getRouteType: (x: number, y: number) => number;
    getRouteAgeType: (x: number, y: number) => string;
    getFeatureType: (x: number, y: number) => number;
    getFeatureClassType: (x: number, y: number) => number;
    getFertilityType: (x: number, y: number) => string;
    getGridWidth: () => number;
    getGridHeight: () => number;
    getPlotCount: () => number;
    getMapSize: () => number;
    getRandomSeed: () => number;
    getIndexFromXY: (x: number, y: number) => number;
    isValidLocation: (loc: Location) => boolean;
    isValidXY: (x: number, y: number) => boolean;
    getOwner: (x: number, y: number) => number;
    getOwnerName: (x: number, y: number) => string;
    getOwnerHostility: (x: number, y: number) => number;
    getOwningCityFromXY: (x: number, y: number) => number;
    getHemisphere: (x: number, y: number) => string;
    getPrimaryHemisphere: (x: number, y: number) => string;
    getPlotDistance: (x1: number, y1: number, x2: number, y2: number) => number;
    getPlotLatitude: (x: number, y: number) => number;
    getRainfall: (x: number, y: number) => number;
    getResourceType: (x: number, y: number) => number;
    getRevealedState: (playerId: number, x: number, y: number) => string;
    getRevealedStates: (playerId: number) => number[];
    getRiverType: (x: number, y: number) => string;
    getTerrainType: (x: number, y: number) => number;
    getYield: (x: number, y: number, yieldType: string, playerId: number) => number;
    getYields: (x: number, y: number) => Record<string, number>;
    getYieldWithCity: (x: number, y: number, cityId: number, yieldType: string) => number;
    getYieldsWithCity: (x: number, y: number, cityId: number) => Record<string, number>;
    isCoastalLand: (x: number, y: number) => boolean;
    isAdjacentToLand: (x: number, y: number) => boolean;
    isCityWithinMinimumDistance: (x: number, y: number) => boolean;
    isFreshWater: (x: number, y: number) => boolean;
    isNaturalWonder: (x: number, y: number) => boolean;
    isNavigableRiver: (x: number, y: number) => boolean;
    isFerry: (x: number, y: number) => boolean;
    isAdjacentToRivers: (x: number, y: number) => boolean;
    isAdjacentToAnotherBiome: (x: number, y: number) => boolean;
    isAdjacentToFeature: (x: number, y: number, featureType: string) => boolean;
    isAdjacentToShallowWater: (x: number, y: number) => boolean;
    isVolcano: (x: number, y: number) => boolean;
    isVolcanoActive: (x: number, y: number) => boolean;
    getVolcanoName: (x: number, y: number) => string;
    isImpassable: (x: number, y: number) => boolean;
    isLake: (x: number, y: number) => boolean;
    isMountain: (x: number, y: number) => boolean;
    isCliffCrossing: (x: number, y: number) => boolean;
    isRiver: (x: number, y: number) => boolean;
    getRiverName: (x: number, y: number) => string;
    getAppeal: (x: number, y: number) => number;
    isWater: (x: number, y: number) => boolean;
    getPlotTag: (x: number, y: number, tag: string) => string;
    hasPlotTag: (x: number, y: number, tag: string) => boolean;
    isPlotInAdvancedStartRegion: (x: number, y: number) => boolean;      
}

declare var GameplayMap: GameplayMap;

declare interface MapConstructibles {
    getConstructibles(x: number, y: number): ID[];
    getHiddenFilteredConstructibles(x: number, y: number): ID[];
}

declare var MapConstructibles: MapConstructibles;

declare var MapUnits: {
    getUnits: (x: number, y: number) => ID[];
}

declare var ResourceTypes = {
    NO_RESOURCE: -1,
}

declare var FeatureTypes = {
    NO_FEATURE: -1,
}

declare var Configuration: {
    getUser(): {
        setValue(key: string, value: any): void;
        getValue(key: string): any;
        saveCheckpoint(): void;
    }
}

declare var UI: {
    getApplicationOption(cat: string, option: string): string;
    setApplicationOption(cat: string, option: string, value: string): void;
    commitApplicationOptions(): void;
}

declare var GrowthTypes: {
    EXPAND: number; // Hash
}

declare var DistrictTypes: {
    URBAN: number; // Hash
    RURAL: number; // Hash
    CITY_CENTER: number; // Hash
    WONDER: number; // Hash
    WILDERNESS: number; // Hash
    INVALID: -1; // Hash
}

declare interface DistrictInstance {
    getMaxDamage: () => number;
    getDamage: () => number;
    isUniqueQuarter: boolean;
    isQuarter: boolean;
    isUrbanCore: boolean;
    cityId: ID;
    location: Location;
    owner: number;
    controllingPlayer: number;
    originalOwner: number;
    type: number;
    localId: number;
    id: ID;
    isValid: boolean;
    getConstructibleIds: () => ID[];
    getConstructibleIdsOfType: (type: number) => ID[];
    getConstructibleIdsOfClass: (classType: number) => ID[];
    getOverbuildableConstructibleTypes: () => number[];
    getNumRefundedPopulationIfOverbuilt: () => number;
    changeDamage: (amount: number) => void;
}

declare interface Districts {
    get: (districtId: ID) => DistrictInstance;
    getAtLocation: (plotIndex: number) => DistrictInstance;
    getIdAtLocation: (plotIndex: number) => ID;
    getLocations: () => Location[];
    // getFreeConstructible: (districtId: ID, constructibleType: number) => ID | null;
}

declare var Districts: Districts;

declare interface Cities {
    get(cityId: ID): City;
    getAtLocation(plotIndex: number): City;
}

declare var Cities: Cities;