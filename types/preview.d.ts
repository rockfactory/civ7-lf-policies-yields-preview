declare type ResolvedArguments = {
    [key: string]: {
        Value: string;
        Extra?: string;
        SecondExtra?: string;
        Type?: string;
    }
};

declare interface ResolvedRequirementSet extends RequirementSet {
    Requirements: ResolvedRequirement[];
}

declare interface ResolvedRequirement {
    Requirement: Requirement;
    Arguments: ResolvedArguments;
}

declare interface ResolvedModifier {
    Modifier: Modifier;
    Arguments: ResolvedArguments;
    CollectionType: string;
    EffectType: string;
    SubjectRequirementSet: ResolvedRequirementSet | null;
    OwnerRequirementSet: ResolvedRequirementSet | null;
}

declare interface YieldsDelta {
    Amount: {
        [YieldType: string]: number;
    };
    Percent: {
        [YieldType: string]: number;
    };
    AmountNoMultiplier: {
        [YieldType: string]: number;
    };
}

declare interface ResolvedYields {
    [YieldType: string]: number;
}

declare interface UnwrappedPlayerYields {
    [YieldType: string]: {
        /** Amount generated (no negative, e.g. only cities) before percent */
        BaseAmount: number;
        /** Percent applied to base amount */
        Percent: number;
    }
}

declare interface UnitTypeInfo {
    UnitType: Unit;
    Count: number;
    MaintenanceCost: number;
}

declare interface UnitTypesInfo {
    [unitType: string]: UnitTypeInfo;
}