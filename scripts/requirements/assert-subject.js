/**
 * @param {PreviewSubject} subject
 * @returns {asserts subject is CitySubject}
 */
export function assertSubjectCity(subject) {
    if (subject.type !== 'City') {
        throw new Error(`Expected City subject, got ${subject.type}`);
    }
}

/**
 * @param {PreviewSubject} subject
 * @returns {asserts subject is PlotSubject | CitySubject | UnitSubject | ConstructibleSubject}
 */
export function assertSubjectPlot(subject) {
    if (subject.type !== 'Plot' && subject.type !== 'City' && subject.type !== 'Unit' && subject.type !== 'Constructible') {
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