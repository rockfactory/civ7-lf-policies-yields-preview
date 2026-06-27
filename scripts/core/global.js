// ====================================================================================================
// ==== GLOBAL PARAMETERS =============================================================================
// ====================================================================================================
//
// Small shared helpers to read GameInfo.GlobalParameters (name-keyed tuning values such as appeal
// thresholds). Values are cached after the first read.

/**
 * Raw GlobalParameter string values cached by name.
 * @type {Map<string, string>}
 */
const globalParamCache = new Map();

/**
 * Read a GlobalParameter raw string value (parameters are name-keyed).
 * @param {string} name the GlobalParameter name (e.g. "APPEAL_FOR_HAPPINESS_TILE_YIELD")
 * @returns {string} the parameter's raw Value
 */
export function getGlobalParam(name) {
    const cached = globalParamCache.get(name);
    if (cached !== undefined) return cached;

    const row = GameInfo.GlobalParameters.lookup(name);
    if (!row) throw new Error(`getGlobalParam: missing GlobalParameter ${name}`);
    globalParamCache.set(name, row.Value);
    return row.Value;
}

/**
 * Read a numeric GlobalParameter value.
 * @param {string} name the GlobalParameter name (e.g. "APPEAL_FOR_DOUBLE_HAPPINESS_TILE_YIELD")
 * @returns {number} the parameter's Value parsed as an integer
 */
export function getGlobalParamNumber(name) {
    return parseInt(getGlobalParam(name));
}
