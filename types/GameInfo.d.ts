/**
 * Base interface for all table entries in the Civ7 modding toolkit.
 * Every entry includes:
 * - `$index`: A unique index within the table.
 * - `$hash`: A unique identifier for fast lookups.
 */
declare interface BaseTableEntry {
  /** Unique index within the table */
  $index: number;
  /** Unique identifier for fast lookups */
  $hash: number;
}

/**
 * Represents a Tradition in the game.
 * @property {string} TraditionType - Unique identifier for the tradition (PK)
 * @property {string} AgeType - Age category for the tradition
 * @property {string} Description - Localization key for the description
 * @property {boolean} IsCrisis - Whether this is a crisis tradition
 * @property {string} Name - Localization key for the name
 */
declare interface Tradition extends BaseTableEntry {
  TraditionType: string;
  AgeType: string;
  Description: string;
  IsCrisis: boolean;
  Name: string;
  TraitType?: string | null;
}

/**
 * Represents a Modifier that alters game mechanics.
 */
declare interface Modifier extends BaseTableEntry {
  ModifierId: string;
  ModifierType: string;
  OwnerRequirementSetId?: string | null;
  SubjectRequirementSetId?: string | null;
  NewOnly?: boolean;
  Permanent: boolean;
  RunOnce: boolean;
}

/**
 * Represents a DynamicModifier that applies an effect to a collection of objects.
 */
declare interface DynamicModifier extends BaseTableEntry {
  ModifierType: string;
  CollectionType: string;
  EffectType: string;
}

/**
 * Represents an argument for a Modifier.
 */
declare interface ModifierArgument extends BaseTableEntry {
  ModifierId: string;
  Name: string;
  Value: string;
  Extra?: string | null;
  SecondExtra?: string | null;
  Type?: string | null;
}

/**
 * Links a Tradition to a Modifier.
 */
declare interface TraditionModifier extends BaseTableEntry {
  TraditionType: string;
  ModifierId: string;
}

/**
 * Represents an EffectType from GameEffects.
 */
declare interface GameEffect extends BaseTableEntry {
  Type: string;
  ContextInterfaces?: string | null;
  Description?: string | null;
  GameCapabilities?: string | null;
  SubjectInterfaces?: string | null;
  SupportsRemove?: boolean;
}

/**
 * Represents a set of requirements.
 */
declare interface RequirementSet extends BaseTableEntry {
  RequirementSetId: string;
  RequirementSetType: string;
}

/**
 * Links a RequirementSet to individual Requirements.
 */
declare interface RequirementSetRequirement extends BaseTableEntry {
  RequirementSetId: string;
  RequirementId: string;
}

/**
 * Represents a Requirement in the game.
 */
declare interface Requirement extends BaseTableEntry {
  RequirementId: string;
  RequirementType: string;
  AiWeighting?: number;
  BehaviorTree?: string | null;
  Impact?: number;
  Inverse?: boolean;
  Likeliness?: number;
  Persistent?: boolean;
  ProgressWeight?: number;
  Reverse?: boolean;
  Triggered?: boolean;
}

/**
 * Represents an argument for a Requirement.
 */
declare interface RequirementArgument extends BaseTableEntry {
  RequirementId: string;
  Name: string;
  Value: string;
  Extra?: string | null;
  SecondExtra?: string | null;
  Type?: string | null;
}

/**
 * Represents a terrain type in the game.
 * 
 * @property {string} TerrainType - Unique identifier or type of the terrain.
 * @property {number} Appeal - Appeal value affecting attractiveness.
 * @property {number} DefenseModifier - Defensive modifier provided by the terrain.
 * @property {boolean} Hills - Whether the terrain has hills.
 * @property {boolean} Impassable - Whether the terrain is impassable.
 * @property {number} InfluenceCost - Cost required to claim or utilize the terrain.
 * @property {boolean} Mountain - Whether the terrain is classified as a mountain.
 * @property {number} MovementCost - Cost of moving through this terrain.
 * @property {string} Name - Display name of the terrain.
 * @property {number} SightModifier - Modifier affecting visibility from this terrain.
 * @property {number} SightThroughModifier - Modifier affecting visibility through this terrain.
 * @property {boolean} Water - Whether the terrain contains water.
 */
declare interface Terrain {
  TerrainType: string;
  Appeal: number;
  DefenseModifier: number;
  Hills: boolean;
  Impassable: boolean;
  InfluenceCost: number;
  Mountain: boolean;
  MovementCost: number;
  Name: string;
  SightModifier: number;
  SightThroughModifier: number;
  Water: boolean;
}

/**
 * Represents a Constructible in the game.
 * @property {string} ConstructibleType - Unique identifier for the constructible (PK)
 * @property {string | null} AdjacentDistrict - Identifier for the adjacent district, if applicable
 * @property {boolean} AdjacentLake - Whether the constructible must be adjacent to a lake
 * @property {boolean} AdjacentRiver - Whether the constructible must be adjacent to a river
 * @property {string | null} AdjacentTerrain - Identifier for the adjacent terrain, if applicable
 * @property {string | null} Age - Age category for the constructible
 * @property {boolean} Archaeology - Whether the constructible is related to archaeology
 * @property {boolean} CanBeHidden - Whether the constructible can be hidden
 * @property {string} ConstructibleClass - Class type of the constructible
 * @property {number} Cost - Base cost of the constructible
 * @property {string} CostProgressionModel - Progression model for cost calculation
 * @property {number} CostProgressionParam1 - Parameter for cost progression calculation
 * @property {number} Defense - Defense value of the constructible
 * @property {string | null} Description - Localization key for the description
 * @property {boolean} Discovery - Whether the constructible is related to discovery
 * @property {boolean} DistrictDefense - Whether the constructible provides district defense
 * @property {boolean} ExistingDistrictOnly - Whether the constructible requires an existing district
 * @property {boolean} ImmuneDamage - Whether the constructible is immune to damage
 * @property {boolean} InRailNetwork - Whether the constructible is part of the rail network
 * @property {string} MilitaryDomain - Military domain classification
 * @property {string} Name - Localization key for the name
 * @property {boolean} NoFeature - Whether the constructible cannot be placed on features
 * @property {boolean} NoRiver - Whether the constructible cannot be placed on a river
 * @property {number} Population - Population requirement for the constructible
 * @property {number} ProductionBoostOverRoute - Production boost when placed over a route
 * @property {boolean} Repairable - Whether the constructible can be repaired
 * @property {boolean} RequiresAppealPlacement - Whether the constructible requires appeal placement
 * @property {boolean} RequiresDistantLands - Whether the constructible requires distant lands
 * @property {boolean} RequiresHomeland - Whether the constructible requires homeland
 * @property {boolean} RequiresUnlock - Whether the constructible requires an unlock condition
 * @property {string | null} RiverPlacement - Specific river placement requirement, if any
 * @property {string | null} Tooltip - Localization key for the tooltip
 * @property {boolean} VictoryItem - Whether the constructible is a victory condition item
 */
declare interface Constructible extends BaseTableEntry {
  ConstructibleType: string;
  AdjacentDistrict?: string | null;
  AdjacentLake: boolean;
  AdjacentRiver: boolean;
  AdjacentTerrain?: string | null;
  Age?: string | null;
  Archaeology: boolean;
  CanBeHidden: boolean;
  ConstructibleClass: string;
  Cost: number;
  CostProgressionModel: string;
  CostProgressionParam1: number;
  Defense: number;
  Description?: string | null;
  Discovery: boolean;
  DistrictDefense: boolean;
  ExistingDistrictOnly: boolean;
  ImmuneDamage: boolean;
  InRailNetwork: boolean;
  MilitaryDomain: string;
  Name: string;
  NoFeature: boolean;
  NoRiver: boolean;
  Population: number;
  ProductionBoostOverRoute: number;
  Repairable: boolean;
  RequiresAppealPlacement: boolean;
  RequiresDistantLands: boolean;
  RequiresHomeland: boolean;
  RequiresUnlock: boolean;
  RiverPlacement?: string | null;
  Tooltip?: string | null;
  VictoryItem: boolean;
}


/**
 * Represents a tag associated with a specific type.
 * 
 * @property {string} Tag - The tag identifier.
 * @property {string} Type - The associated type for the tag.
 */
declare interface TypeTag {
  Tag: string;
  Type: string;
}

declare interface GlobalParameter {
  Name: string;
  Value: string;
}

declare interface ConstructibleYieldChange {
  ConstructibleType: string;
  YieldType: string;
  YieldChange: number;
}

/**
 * Represents a Unit in the game.
 * @property {string} UnitType - Unique identifier for the unit (PK)
 * @property {number} AirSlots - Number of air slots available for the unit
 * @property {boolean} AllowBarbarians - Whether the unit can be used by barbarians
 * @property {boolean} AllowTeleportToOtherPlayerCapitals - Whether the unit can teleport to other player capitals
 * @property {number} AntiAirCombat - Anti-air combat strength of the unit
 * @property {number} BaseMoves - Number of base movement points
 * @property {number} BaseSightRange - Base sight range of the unit
 * @property {number} BuildCharges - Number of build charges available
 * @property {boolean} CanBeDamaged - Whether the unit can take damage
 * @property {boolean} CanCapture - Whether the unit can capture cities or other units
 * @property {boolean} CanEarnExperience - Whether the unit can earn experience
 * @property {boolean} CanPurchase - Whether the unit can be purchased
 * @property {boolean} CanRetreatWhenCaptured - Whether the unit can retreat when captured
 * @property {boolean} CanTargetAir - Whether the unit can target air units
 * @property {boolean} CanTrain - Whether the unit can be trained
 * @property {boolean} CanTriggerDiscovery - Whether the unit can trigger a discovery
 * @property {string} CoreClass - Core class of the unit
 * @property {string} CostProgressionModel - Model for cost progression
 * @property {number} CostProgressionParam1 - Parameter for cost progression
 * @property {string | null} Description - Localization key for the description
 * @property {string} Domain - Domain type of the unit
 * @property {boolean} EnabledByReligion - Whether the unit is enabled by religion
 * @property {boolean} EvangelizeBelief - Whether the unit can evangelize beliefs
 * @property {boolean} ExtractsArtifacts - Whether the unit can extract artifacts
 * @property {string} FormationClass - Formation class of the unit
 * @property {boolean} FoundCity - Whether the unit can found a city
 * @property {boolean} FoundReligion - Whether the unit can found a religion
 * @property {boolean} IgnoreMoves - Whether the unit ignores movement rules
 * @property {number} InitialLevel - Initial level of the unit
 * @property {boolean} LaunchInquisition - Whether the unit can launch an inquisition
 * @property {number} Maintenance - Maintenance cost of the unit
 * @property {boolean} MakeTradeRoute - Whether the unit can establish trade routes
 * @property {boolean} MustPurchase - Whether the unit must be purchased
 * @property {string} Name - Localization key for the name
 * @property {number} NumRandomChoices - Number of random choices available to the unit
 * @property {number} PrereqPopulation - Population requirement for the unit
 * @property {string | null} PromotionClass - Promotion class of the unit
 * @property {string | null} PseudoYieldType - Pseudo-yield type associated with the unit
 * @property {string | null} PurchaseYield - Yield type used for purchasing the unit
 * @property {number} ReligionEvictPercent - Percentage of religious eviction by the unit
 * @property {number} ReligiousHealCharges - Number of religious heal charges
 * @property {number} ReligiousStrength - Religious strength of the unit
 * @property {boolean} RequiresInquisition - Whether the unit requires an inquisition
 * @property {number} SpreadCharges - Number of religious spread charges
 * @property {boolean} Spy - Whether the unit is a spy
 * @property {boolean} Stackable - Whether the unit can be stacked with others
 * @property {string | null} StrategicResource - Required strategic resource for the unit
 * @property {boolean} TeamVisibility - Whether the unit has team visibility
 * @property {boolean} Teleport - Whether the unit can teleport
 * @property {number | null} Tier - Tier level of the unit
 * @property {boolean} TrackReligion - Whether the unit tracks religion
 * @property {string | null} TraitType - Trait type associated with the unit
 * @property {string} UnitMovementClass - Movement class of the unit
 * @property {string | null} VictoryType - Victory type associated with the unit
 * @property {boolean} VictoryUnit - Whether the unit contributes to victory conditions
 * @property {boolean} WMDCapable - Whether the unit is capable of using weapons of mass destruction
 * @property {boolean} ZoneOfControl - Whether the unit has a zone of control
 */
declare interface Unit extends BaseTableEntry {
  UnitType: string;
  AirSlots: number;
  AllowBarbarians: boolean;
  AllowTeleportToOtherPlayerCapitals: boolean;
  AntiAirCombat: number;
  BaseMoves: number;
  BaseSightRange: number;
  BuildCharges: number;
  CanBeDamaged: boolean;
  CanCapture: boolean;
  CanEarnExperience: boolean;
  CanPurchase: boolean;
  CanRetreatWhenCaptured: boolean;
  CanTargetAir: boolean;
  CanTrain: boolean;
  CanTriggerDiscovery: boolean;
  CoreClass: 'CORE_CLASS_RECON' | 'CORE_CLASS_MILITARY' | 'CORE_CLASS_CIVILIAN' | 'CORE_CLASS_SUPPORT' | string;
  CostProgressionModel: string;
  CostProgressionParam1: number;
  Description?: string | null;
  Domain: string;
  EnabledByReligion: boolean;
  EvangelizeBelief: boolean;
  ExtractsArtifacts: boolean;
  FormationClass: string;
  FoundCity: boolean;
  FoundReligion: boolean;
  IgnoreMoves: boolean;
  InitialLevel: number;
  LaunchInquisition: boolean;
  Maintenance: number;
  MakeTradeRoute: boolean;
  MustPurchase: boolean;
  Name: string;
  NumRandomChoices: number;
  PrereqPopulation: number;
  PromotionClass?: string | null;
  PseudoYieldType?: string | null;
  PurchaseYield?: string | null;
  ReligionEvictPercent: number;
  ReligiousHealCharges: number;
  ReligiousStrength: number;
  RequiresInquisition: boolean;
  SpreadCharges: number;
  Spy: boolean;
  Stackable: boolean;
  StrategicResource?: string | null;
  TeamVisibility: boolean;
  Teleport: boolean;
  Tier?: number | null;
  TrackReligion: boolean;
  TraitType?: string | null;
  UnitMovementClass: string;
  VictoryType?: string | null;
  VictoryUnit: boolean;
  WMDCapable: boolean;
  ZoneOfControl: boolean;
}

declare interface District extends BaseTableEntry {
  DistrictType: string;
  AirSlots: number;
  AutoPlace: boolean;
  AutoRemove: boolean;
  CanAttack: boolean;
  CaptureRemovesBuildings: boolean;
  CaptureRemovesCityDefenses: boolean;
  CaptureRemovesDistrict: boolean;
  CitizenSlots: number;
  CityStrengthModifier: number;
  Description?: string | null;
  DistrictClass: string;
  FreeEmbark: boolean;
  HitPoints: number;
  Maintenance: number;
  MaxConstructibles: number;
  MilitaryDomain: string;
  Name: string;
  NatureYields: boolean;
  OnePerCity: boolean;
  OverwritePreviousAge: boolean;
  ResourceBlocks: boolean;
  Roads: boolean;
  TravelTime: number;
  UrbanCoreType: string;
  Water: boolean;
  Workable: boolean;
}

declare interface Yield extends BaseTableEntry {
  YieldType: string;
  DefaultValue: number;
  IconString: string;
  Name: string;
  OccupiedCityChange: number;
}

declare interface Project extends BaseTableEntry {
  ProjectType: string;
  AdvisorType?: string | null;
  CanPurchase: boolean;
  CityOnly: boolean;
  Cost?: number | null;
  CostProgressionModel: string;
  CostProgressionParam1: number;
  Description: string;
  ExclusiveSpecialization: boolean;
  Food: boolean;
  MaxPlayerInstances?: number | null;
  Name: string;
  OuterDefenseRepair: boolean;
  PopupText?: string | null;
  PrereqAnyCity: boolean;
  PrereqConstructible?: string | null;
  PrereqPopulation: number;
  PrereqResource?: string | null;
  ProjectVictoryCinematicLocation: string;
  RequireCompletedLegacyPathType?: string | null;
  RequiresUnlock: boolean;
  ShortName: string;
  SpaceRace: boolean;
  TownDefault: boolean;
  TownOnly: boolean;
  UpgradeToCity: boolean;
  WMD: boolean;
}

declare interface AdjacencyYieldChange extends BaseTableEntry {
  ID: string;
  AdjacentBiome?: string | null;
  AdjacentConstructible?: string | null;
  AdjacentConstructibleTag?: string | null;
  AdjacentDistrict?: string | null;
  AdjacentFeature?: string | null;
  AdjacentFeatureClass?: string | null;
  AdjacentLake: boolean;
  AdjacentNaturalWonder: boolean;
  AdjacentNavigableRiver: boolean;
  AdjacentQuarter: boolean;
  AdjacentResource: boolean;
  AdjacentResourceClass: string;
  AdjacentRiver: boolean;
  AdjacentSeaResource: boolean;
  AdjacentTerrain?: string | null;
  AdjacentUniqueQuarter: boolean;
  AdjacentUniqueQuarterType?: string | null;
  Age?: string | null;
  ProjectMaxYield: boolean;
  Self: boolean;
  TilesRequired: number;
  YieldChange: number;
  YieldType: string;
}
declare interface ConstructibleAdjacency extends BaseTableEntry {
  ConstructibleType: string;
  YieldChangeId: string;
  Name: string;
  RequiresActivation: boolean;
}

declare interface ConstructibleWildcardAdjacency extends BaseTableEntry {
  YieldChangeId: string;
  ConstructibleClass?: string | null;
  ConstructibleTag?: string | null;
  CurrentAgeConstructiblesOnly?: boolean;
  HasBiome?: string | null;
  HasNavigableRiver?: boolean;
  HasTerrain?: string | null;
  HasYield?: string | null;
  RequiresActivation: boolean;
}

declare interface Age extends BaseTableEntry {
  AgeType: string;
  AgeTechBackgroundTexture?: string | null;
  AgeTechBackgroundTextureOffsetX: number;
  ChronologyIndex: number;
  Description?: string | null;
  EmbarkedUnitStrength: number;
  GenerateDiscoveries: boolean;
  GreatPersonBaseCost: number;
  HumanPlayersPrimaryHemisphere: boolean;
  MainCultureProgressionTreeType?: string | null;
  MainTechProgressionTreeType?: string | null;
  Name: string;
  NoVictoriesSecondaryHemisphere: boolean;
  NumDefenders: number;
  SettlementCountOnTransition: number;
  StartingTraditionSlots: number;
  TechTreeLayoutMethod?: number | null;
  TradeSystemParameterSet?: string | null;
}

declare interface WarehouseYieldChange extends BaseTableEntry {
  ID: string;
  Age?: string;
  BiomeInCity?: string;
  ConstructibleInCity?: string;
  DistrictInCity?: string;
  FeatureClassInCity?: string;
  FeatureInCity?: string;
  LakeInCity: boolean;
  MinorRiverInCity: boolean;
  NaturalWonderInCity: boolean;
  NavigableRiverInCity: boolean;
  Overbuilt: boolean;
  ResourceInCity: boolean;
  RouteInCity: boolean;
  TerrainInCity?: string;
  TerrainTagInCity?: string;
  YieldChange: number;
  YieldType: string;
}


declare interface ConstructibleWarehouseYield extends BaseTableEntry {
  ConstructibleType: string;
  YieldChangeId: string;
  RequiresActivation: boolean;
}

declare interface ConstructibleWildcardWarehouseYield extends BaseTableEntry {
  YieldChangeId: string;
  ConstructibleTag?: string | null; // Optional because it's not marked as NOT NULL
  RequiresActivation: boolean;
}

declare interface Biome {
  BiomeType: string;
  Description?: string;
  MaxLatitude?: number;
  Name: string;
}

declare interface Feature {
  FeatureType: string;
  AddsFreshWater: boolean;
  AllowSettlement: boolean;
  AntiquityPriority: number;
  Appeal: number;
  DefenseModifier: number;
  Description?: string;
  FeatureClassType?: string;
  Impassable: boolean;
  MaximumElevation: number;
  MaxLatitude: number;
  MinimumElevation: number;
  MinLatitude: number;
  MovementChange: number;
  Name: string;
  NoLake: boolean;
  PlacementClass: string;
  PlacementDensity: number;
  Removable: boolean;
  SightThroughModifier: number;
  Tooltip?: string;
}

declare interface FeatureClass {
  FeatureClassType: string;
  Adjective: string;
  Description: string;
  Name: string;
}
declare interface Resource extends BaseTableEntry {
  ResourceType: string;
  AdjacentToLand: boolean;
  AssignCoastal: boolean;
  AssignInland: boolean;
  BonusResourceSlots: number;
  Clumped: boolean;
  Hemispheres: number;
  LakeEligible: boolean;
  Name: string;
  NoRiver: boolean;
  RequiresRiver: boolean;
  ResourceClassType: string;
  Tooltip: string;
  Tradeable: boolean;
  Weight: number;
}

interface ProgressionTreeNodeUnlocks {
  ProgressionTreeNodeType: string;
  TargetType: string;
  AIIgnoreUnlockValue: boolean;
  Hidden?: boolean;
  IconString?: string;
  RequiredTraitType?: string;
  TargetKind: string;
  UnlockDepth: number;
}

interface ProgressionTreeNodes extends BaseTableEntry {
  ProgressionTreeNodeType: string;
  CanBoost: boolean;
  CanSteal: boolean;
  Cost: number;
  Description?: string;
  IconString?: string;
  Name: string;
  ProgressionTree: string;
  Repeatable: boolean;
  RepeatableCostProgressionModel: string;
  RepeatableCostProgressionParam1: number;
  StartingUnlockDepth: number;
  UILayoutColumn?: number;
  UILayoutRow?: number;
}

declare interface ProgressionTree extends BaseTableEntry {
  ProgressionTreeType: string;
  AgeType?: string;
  SystemType: string;
  Name: string;
  CostProgressionModel?: string;
  CostProgressionParam1?: number;
  PrereqFormat?: string;
}

declare interface Improvement extends BaseTableEntry {
  ConstructibleType: string;
  AdjacentSeaResource: number;
  AirSlots: number;
  BarbarianCamp: number;
  BuildInLine: number;
  BuildOnFrontier: number;
  CanBuildOnNonDistrict: number;
  CanBuildOutsideTerritory: number;
  CityBuildable: number;
  DefenseModifier: number;
  DisableTurns: number;
  EmbarkCostMultiplier: number;
  EnableTurns: number;
  Energy: number;
  ExclusionZone: number;
  FeatureClassValid: string | null;
  FeatureValid: string | null;
  FloodplainValid: number;
  FreeOnRepair: number;
  Housing: number;
  ImprovementOnRemove: string | null;
  MustBeAppealing: number;
  OnePerSettlement: number;
  RemoveOnEntry: number;
  ResourceTier: number;
  SameAdjacentValid: number;
  TraitType: string | null;
  UnitBuildable: number;
  WeaponSlots: number;
  Workable: number;
}

declare interface DistrictFreeConstructible extends BaseTableEntry {
  BiomeType?: string; // Campo opzionale, tipo TEXT
  ConstructibleType: string; // Campo obbligatorio, tipo TEXT
  DistrictType: string; // Campo obbligatorio, tipo TEXT
  FeatureType?: string; // Campo opzionale, tipo TEXT
  Priority: number; // Campo obbligatorio, tipo INTEGER con valore predefinito 1
  ResourceType?: string; // Campo opzionale, tipo TEXT
  RiverType?: string; // Campo opzionale, tipo TEXT
  TerrainType?: string; // Campo opzionale, tipo TEXT
  Tier: number; // Campo obbligatorio, tipo INTEGER con valore predefinito 1
}

declare interface CityStateBonus extends BaseTableEntry {
  CityStateBonusType: string;
  CityStateType: string;
  Description: string;
  Name: string;
}

declare interface CityStateBonusModifier {
  CityStateBonusType: string;
  ModifierID: string;
}

declare interface DiplomacyActionGroup extends BaseTableEntry {
  DiplomacyActionGroupType: string;
  Name: string;
}

declare interface DiplomacyActionGroupSubtype extends BaseTableEntry {
  DiplomacyActionGroupSubtypeType: string;
  Name: string;
}

declare interface DiplomacyActionTag extends BaseTableEntry {
  DiplomacyActionTagType: string;
  Name: string;
}

declare interface DiplomacyAction extends BaseTableEntry {
  DiplomacyActionType: string;
  AllyOnly: boolean;
  AlwaysNotifyTarget: boolean;
  BaseDuration: number;
  BaseTokenCost: number;
  BlocksTargetProject: boolean;
  CancelPenalty: number;
  ChangeSupportMsg?: string;
  Description: string;
  DiplomacyActionTag?: string;
  EnvoysInfluenceProgress: boolean;
  IsMutualSupport: boolean;
  MaxThirdPartySupport: number;
  Momentum: number;
  MustStartFromUnit: boolean;
  Name: string;
  NegativeProgressAllowed: boolean;
  NumTimesPerPlayer: number;
  Opposable: boolean;
  Opposed: boolean;
  OpposeDesc?: string;
  OpposeRemovedDesc?: string;
  RandomInitialProgress: number;
  RejectionRefundsInfluence: boolean;
  RelativeZero: number;
  RequestString?: string;
  RequiresUnlock: boolean;
  RevealChance: number;
  RevealPenaltyRelationshipHit: number;
  SingleInstanceProject: boolean;
  SuccessChance: number;
  Supportable: boolean;
  SupportDesc?: string;
  SupportFavors: number;
  SupportRemovedDesc?: string;
  SupportWindow: number;
  Symmetrical: boolean;
  TargetFavors: number;
  TargetFavorsFreq: number;
  UIIconPath: string;
  UnsupportPenalty: number;
  WarOnly: boolean;
}

declare interface CivilizationTrait extends BaseTableEntry {
  CivilizationType: string;
  TraitType: string;
}

declare interface Civilization extends BaseTableEntry {
  CivilizationType: string;
  Adjective: string;
  CapitalName: string;
  Description: string;
}

declare interface Leader extends BaseTableEntry {
  LeaderType: string;
  AITargetCityPercentage: number;
  BasePersonaType?: string | null;
  DiscountRate: number;
  InheritFrom: string;
  IsBarbarianLeader: boolean;
  IsIndependentLeader: boolean;
  IsMajorLeader: boolean;
  Name: string;
  OperationList?: string | null;
}

declare interface LeaderTrait extends BaseTableEntry {
  LeaderType: string;
  TraitType: string;
}

declare type GameInfoArray<T> = T[] & {
  lookup(hash: number): T | undefined;
};

/**
 * Name-keyed engine table (GlobalParameters): engine accepts the parameter name as a
 * string in `lookup`, unlike the hash-keyed `GameInfoArray<T>`.
 */
declare type GameInfoNameKeyedArray<T> = T[] & {
  lookup(name: string): T | undefined;
};

/**
 * Represents the entire GameInfo structure in Civ7's modding toolkit.
 */
declare interface IGameInfo {
  Traditions: GameInfoArray<Tradition>;
  Modifiers: GameInfoArray<Modifier>;
  DynamicModifiers: GameInfoArray<DynamicModifier>;
  ModifierArguments: GameInfoArray<ModifierArgument>;
  TraditionModifiers: GameInfoArray<TraditionModifier>;
  GameEffects: GameInfoArray<GameEffect>;
  RequirementSets: GameInfoArray<RequirementSet>;
  RequirementSetRequirements: GameInfoArray<RequirementSetRequirement>;
  Requirements: GameInfoArray<Requirement>;
  RequirementArguments: GameInfoArray<RequirementArgument>;
  Terrains: GameInfoArray<Terrain>;
  TypeTags: GameInfoArray<TypeTag>;
  GlobalParameters: GameInfoNameKeyedArray<GlobalParameter>;
  Yields: GameInfoArray<Yield>;
  Projects: GameInfoArray<Project>;
  Constructibles: GameInfoArray<Constructible>;
  Units: GameInfoArray<Unit>;
  Districts: GameInfoArray<District>;
  Adjacency_YieldChanges: GameInfoArray<AdjacencyYieldChange>;
  Constructible_Adjacencies: GameInfoArray<ConstructibleAdjacency>;
  Constructible_WildcardAdjacencies: GameInfoArray<ConstructibleWildcardAdjacency>;
  Constructible_YieldChanges: GameInfoArray<ConstructibleYieldChange>;
  Warehouse_YieldChanges: GameInfoArray<WarehouseYieldChange>;
  Constructible_WarehouseYields: GameInfoArray<ConstructibleWarehouseYield>;
  Constructible_WildcardWarehouseYields: GameInfoArray<ConstructibleWildcardWarehouseYield>;
  Ages: GameInfoArray<Age>;
  Biomes: GameInfoArray<Biome>;
  Features: GameInfoArray<Feature>;
  FeatureClasses: GameInfoArray<FeatureClass>;
  Resources: GameInfoArray<Resource>;
  ProgressionTreeNodeUnlocks: GameInfoArray<ProgressionTreeNodeUnlocks>;
  ProgressionTreeNodes: GameInfoArray<ProgressionTreeNodes>;
  ProgressionTrees: GameInfoArray<ProgressionTree>;
  Improvements: GameInfoArray<Improvement>;
  District_FreeConstructibles: GameInfoArray<DistrictFreeConstructible>;
  CityStateBonuses: GameInfoArray<CityStateBonus>;
  CityStateBonusModifiers: GameInfoArray<CityStateBonusModifier>;
  DiplomacyActionGroups: GameInfoArray<DiplomacyActionGroup>;
  DiplomacyActionGroupSubtypes: GameInfoArray<DiplomacyActionGroupSubtype>;
  DiplomacyActionTags: GameInfoArray<DiplomacyActionTag>;
  DiplomacyActions: GameInfoArray<DiplomacyAction>;
  CivilizationTraits: GameInfoArray<CivilizationTrait>;
  Civilizations: GameInfoArray<Civilization>;
  LeaderTraits: GameInfoArray<LeaderTrait>;
  Leaders: GameInfoArray<Leader>;
}

declare type IYieldTypes = {
  [key: string]: number;
} 

declare var GameInfo: IGameInfo;
declare var YieldTypes: IYieldTypes;