/**
 * Please, always use ModSettingsManager to save and read settings in your mod.
 * Right now if you try to use **multiple** keys in localStorage, it will break reading
 * from localStorage for **every mod**. This is a workaround to avoid this issue, while
 * keeing a namespace to give each mod its own settings.
 */
const ModSettingsManager = {
    save(key, data) {
        if (localStorage.length > 1) {
            console.warn("[ModSettingsManager] erasing previous storage..", localStorage.length);
            localStorage.clear();
        }  
        const modSettings = JSON.parse(localStorage.getItem("modSettings") || '{}');
        modSettings[key] = data;
        localStorage.setItem("modSettings", JSON.stringify(modSettings));
    },
    read(key) {
        const modSettings = localStorage.getItem("modSettings");
        try {
            if (modSettings) {
                const data = JSON.parse(modSettings || '{}')[key];
                if (data) {
                    return data;
                }
            }
            return null;
        }
        catch (e) {
            console.error(`[ModSettingsManager][${key}] Error loading settings`, e);
        }
        return null;
    }
}

/**
 * Whether the debug cheat option is offered in the Options menu.
 *
 * - `true` (dev): the "Show debug cheat panel" checkbox appears in
 *   Options → Mods → LF Yields, so you can toggle the panel from in-game.
 * - `false` (release): the option is hidden from the menu, but if `IsDebugMode`
 *   was already persisted as true from a previous session the panel will
 *   STILL show: flipping this back to false is safe and won't make your
 *   panel disappear.
 */
export const LF_DEBUG_CHEATS_ENABLED = false;

export const PolicyYieldsSettings = new class {
    _data = {
        IsColorful: false,
        IsDebugMode: false
    };

    /** @type {Array<(value: boolean) => void>} */
    _debugListeners = [];

    constructor() {
        const modSettings = ModSettingsManager.read("LFPolicyYieldsSettings");
        if (modSettings) {
            this._data = { ...this._data, ...modSettings };
        }
    }

    save() {
        console.warn("[LFPolicyYieldsSettings] saving..", JSON.stringify(this._data));
        ModSettingsManager.save("LFPolicyYieldsSettings", this._data);
    }

    get IsColorful() {
        return this._data.IsColorful;
    }

    set IsColorful(value) {
        this._data.IsColorful = value;
        this.save();
    }

    /**
     * Follows the persisted value only — independent of `LF_DEBUG_CHEATS_ENABLED`.
     * That way flipping the master flag back to false (to hide the menu option for
     * release) doesn't make the panel disappear if the dev already enabled it.
     */
    get IsDebugMode() {
        return !!this._data.IsDebugMode;
    }

    set IsDebugMode(value) {
        this._data.IsDebugMode = !!value;
        this.save();
        for (const listener of this._debugListeners) {
            try { listener(this.IsDebugMode); }
            catch (e) { console.error("[LFPolicyYieldsSettings] debug listener error", e); }
        }
    }

    /** @param {(value: boolean) => void} listener */
    onDebugModeChange(listener) {
        this._debugListeners.push(listener);
    }
}