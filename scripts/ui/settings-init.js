import { Options, OptionType, CategoryType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';
import { PolicyYieldsSettings, LF_DEBUG_CHEATS_ENABLED } from '../core/settings.js';

// We add a dependency on the Options module to ensure default options are loaded before we add our own
import '/core/ui/options/screen-options.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType["Mods"]] = {
    title: "LOC_UI_CONTENT_MGR_SUBTITLE",
    description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

const onOptionColorfulInit = (optionInfo) => {
    optionInfo.currentValue = PolicyYieldsSettings.IsColorful;
};
const onOptionColorfulUpdate = (optionInfo, value) => {
    PolicyYieldsSettings.IsColorful = value;
}

const onOptionDebugInit = (optionInfo) => {
    optionInfo.currentValue = PolicyYieldsSettings.IsDebugMode;
};
const onOptionDebugUpdate = (optionInfo, value) => {
    PolicyYieldsSettings.IsDebugMode = value;
}

// fix Options initialization
Options.addInitCallback = function(callback) {
    if (this.optionsReInitCallbacks.length && !this.optionsInitCallbacks.length) {
        throw new Error("Options already initialized, cannot add init callback");
    }
    this.optionsInitCallbacks.push(callback);
    this.optionsReInitCallbacks.push(callback);
}

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType["Mods"],
        // @ts-ignore
        group: 'lf_yields',
        type: OptionType.Checkbox,
        id: "lf-yields-colorful",
        initListener: onOptionColorfulInit,
        updateListener: onOptionColorfulUpdate,
        label: "LOC_MOD_LF_YIELDS_OPTION_COLORFUL",
        description: "LOC_MOD_LF_YIELDS_OPTION_COLORFUL_DESC"
    });
    
    if (LF_DEBUG_CHEATS_ENABLED) {
        Options.addOption({
            category: CategoryType["Mods"],
            // @ts-ignore
            group: 'lf_yields',
            type: OptionType.Checkbox,
            id: "lf-yields-debug",
            initListener: onOptionDebugInit,
            updateListener: onOptionDebugUpdate,
            label: "LOC_MOD_LF_YIELDS_OPTION_DEBUG",
            description: "LOC_MOD_LF_YIELDS_OPTION_DEBUG_DESC"
        });
    }
});
