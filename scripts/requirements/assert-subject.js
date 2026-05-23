/**
 * Accepts any subject that carries a `city` field, since `REQUIREMENT_CITY_*` handlers
 * read `subject.city`. The game routinely attaches CITY requirements to PLOT-emitting
 * collections (e.g. PITHI_CHRAT_II / AWISAN_DALEM_II / NORMAN_SYNCRETISM_MODERN /
 * AMERICA_SYNCRETISM_*: COLLECTION_PLAYER_PLOT_YIELDS + REQUIREMENT_CITY_IS_TOWN/IS_CITY/
 * IS_ORIGINAL_OWNER/CONQUERED_ANY_AGE) — the plot's owning city is the implicit subject.
 * @param {PreviewSubject} subject
 * @returns {asserts subject is CitySubject | PlotSubject | DistrictSubject}
 */
export function assertSubjectCity(subject) {
    if (subject.type !== 'City' && subject.type !== 'Plot' && subject.type !== 'District') {
        throw new Error(`Expected City subject, got ${subject.type}`);
    }
}

/**
 * @param {PreviewSubject} subject
 * @returns {asserts subject is PlotSubject | CitySubject | UnitSubject | ConstructibleSubject | DistrictSubject}
 */
export function assertSubjectPlot(subject) {
    if (subject.type !== 'Plot' && subject.type !== 'City' && subject.type !== 'Unit' && subject.type !== 'Constructible' && subject.type !== 'District') {
        throw new Error(`Expected Plot subject, got ${subject.type}`);
    }
}

/**
 * @param {PreviewSubject} subject
 * @returns {asserts subject is UnitSubject}
 */
export function assertSubjectUnit(subject) {
    if (subject.type !== 'Unit') {
        throw new Error(`Expected Unit subject, got ${subject.type}`);
    }
}

/**
 * For now, it should always be possible to match any subject against player data.
 * @param {PreviewSubject} subject
 * @returns {asserts subject is PlayerSubject | CitySubject | UnitSubject | PlotSubject | ConstructibleSubject | TradeRouteSubject}
 */
export function assertSubjectPlayer(subject) {
    if (subject.type !== 'Player'
        && subject.type !== 'City'
        && subject.type !== 'Unit'
        && subject.type !== 'Plot'
        && subject.type !== 'Constructible'
        && subject.type !== 'TradeRoute'
    ) {
        throw new Error(`Expected Player subject, got N/A: ${JSON.stringify(subject)}`);
    }
}

/**
 * @param {PreviewSubject} subject
 * @returns {asserts subject is TradeRouteSubject}
 */
export function assertSubjectTradeRoute(subject) {
    if (subject.type !== 'TradeRoute') {
        throw new Error(`Expected TradeRoute subject, got ${subject.type}`);
    }
}

/**
 * Asserts that the subject is a constructible
 * @param {PreviewSubject} subject
 * @returns {asserts subject is ConstructibleSubject}
 */
export function assertSubjectConstructible(subject) {
    if (subject.type !== 'Constructible') {
        throw new Error(`Expected Constructible subject, got ${subject.type}`);
    }
}