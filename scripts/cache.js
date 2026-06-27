export const PolicyYieldsCache = new class {
    /** @type {UnwrappedPlayerYields} */
    _yields = {};
    /** @type {Record<string, Set<string>>} */
    _typeTags = {};
    /** @type {Map<number, number>} */
    _cityTradeYields = new Map();
    /** @type {Record<string, Set<string>>} */
    _leaderTraits = {};
    /** @type {Record<string, Set<string>>} */
    _civilizationTraits = {};

    _localeTradeYieldDescription = Locale.compose("LOC_ATTR_YIELD_FROM_TRADE");

    update() {
        this._yields = unwrapCurrentPlayerYields();
    }

    cleanup() {
        this._yields = {};
        this._typeTags = {};
        // Keyed by per-game `city.id.id`, which can collide across saves, so this
        // must be reset too. `_leaderTraits` / `_civilizationTraits` are keyed by
        // stable type strings (static reference data) and intentionally kept.
        this._cityTradeYields = new Map();
    }

    /** @returns {UnwrappedPlayerYields} */
    getYields() {
        return this._yields;
    }

    getYieldsForType(yieldType) {
        return this._yields[yieldType];
    }

    /**
     * @param {string} type 
     * @returns {Set<string>}
     */
    getTypeTags(type) {
        if (!this._typeTags[type]) {
            const tags = GameInfo.TypeTags
                .filter(tag => tag.Type === type)
                .map(tag => tag.Tag);

            this._typeTags[type] = new Set(tags);
        }

        return this._typeTags[type];
    }

    /**
     * Check if the  type has the tag assigned
     * @param {string} type
     * @param {string} tag
     */
    hasTypeTag(type, tag) {
        return this.getTypeTags(type).has(tag);
    }

    /**
     * Since `city.Yields.getTradeYield` seems to be broken, we need to calculate it manually
     * @param {City} city
     */
    getCityTradeYields(city) {
        if (!this._cityTradeYields.has(city.id.id)) {
            if (!city.Yields) return null;
            const yields = city.Yields.getYieldsForType("YIELD_GOLD");
            if (!yields) return null;

            let tradeYield = 0;
            iterateYieldSteps(yields, step => {
                if (step.description === "LOC_ATTR_YIELD_FROM_TRADE" || step.description === this._localeTradeYieldDescription) {
                    tradeYield += step.value;
                }
            });
            this._cityTradeYields.set(city.id.id, tradeYield);
        }

        return this._cityTradeYields.get(city.id.id);
    }

    /**
     * @param {string | null | undefined} leaderType
     * @returns {Set<string>}
     */
    getLeaderTraits(leaderType) {
        if (!leaderType) {
            return new Set();
        }

        if (!this._leaderTraits[leaderType]) {
            const traits = GameInfo.LeaderTraits
                .filter(lt => lt.LeaderType === leaderType)
                .map(lt => lt.TraitType);
            this._leaderTraits[leaderType] = new Set(traits);
        }

        return this._leaderTraits[leaderType];
    }

    /**
     * @param {string | null | undefined} civilizationType
     * @returns {Set<string>}
     */
    getCivilizationTraits(civilizationType) {
        if (!civilizationType) {
            return new Set();
        }

        if (!this._civilizationTraits[civilizationType]) {
            const traits = GameInfo.CivilizationTraits
                .filter(ct => ct.CivilizationType === civilizationType)
                .map(ct => ct.TraitType);

            this._civilizationTraits[civilizationType] = new Set(traits);
        }

        return this._civilizationTraits[civilizationType];
    }
}

/**
 * We don't want to expose the cache directly, so this method is not exported
 * @param {YieldEntry | YieldStep} entry
 * @param {(entry:YieldStep | YieldEntry) => void} callback
 */
function iterateYieldSteps(entry, callback) {
    let queue = [entry];
    while (queue.length) {
        const current = queue.shift();
        if (!current) continue;

        callback(current);
        if (current.base) queue.push(current.base);
        if (current.modifier) queue.push(current.modifier);
        if ('steps' in current) {
            queue.push(...current.steps || []);
        }
    }
}

export function unwrapYieldsOfType(yields) {
    try {
        const rawStep = yields.base.steps[0];
        // if (rawStep.description !== "LOC_ATTR_YIELD_INCOMES") {
        //     console.error("Unexpected yields description", rawStep.description);
        //     return {
        //         BaseAmount: 0,
        //         Percent: 0,
        //     }
        // }
    
        return {
            BaseAmount: rawStep?.base?.value || 0,
            Percent: rawStep?.modifier?.value || 0,
        };
    }
    catch (error) {
        console.error("Error unwrapping yields", yields);
        console.error(error);
        return {
            BaseAmount: 0,
            Percent: 0,
        }
    }
}

/**
 * Returns the unwrapped yields for the current player.
 * This value is useful for previewing the yields of a policy, since
 * we need to calculate _active_ bonuses, like percent modifiers, even
 * to bonuses.
 */
export function unwrapCurrentPlayerYields() {
    /**  @type {UnwrappedPlayerYields} */
    const unwrappedYields = {};
    const player = Players.get(GameContext.localPlayerID);
    const allYields = player.Stats.getYields();
    for (let index = 0; index < allYields.length; index++) {
        const yields = allYields[index];
        if (!yields) {
            console.warn("Missing player yields for index", index);
            unwrappedYields[index] = {
                BaseAmount: 0,
                Percent: 0,
            };
            continue;
        }

        const type = GameInfo.Yields[index]?.YieldType;
        if (!type) {
            console.error("Missing player yield type for index", index);
            unwrappedYields[index] = {
                BaseAmount: 0,
                Percent: 0,
            };
            continue;
        }
        
        unwrappedYields[type] = unwrapYieldsOfType(yields);
    }
    return unwrappedYields;
}

// Repopulate the cache on every game entry (new game or loaded save). 
engine.on('LoadComplete', () => {
    PolicyYieldsCache.cleanup();
    // Avoids reading player stats before they are ready
    setTimeout(() => {
        try {
            PolicyYieldsCache.update();
        } catch (error) {
            console.warn('LFYieldsPreview: cache warm after LoadComplete failed', error);
        }
    }, 50);
});
