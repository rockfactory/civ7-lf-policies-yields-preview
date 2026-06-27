// Stub for Civilization VII base-game modules (e.g. /core/*, /base-standard/*).
// These modules are provided by the game at runtime and cannot be redistributed,
// so in CI every absolute import is routed here by the "/*" paths mapping in
// jsconfig.ci.json and resolved to `any`. Local development is unaffected: it keeps
// using the real base-game types via the paths mapping in jsconfig.json.
//
// Because all base-game specifiers resolve to this single file, every symbol that
// the mod imports from a base-game module must be declared below. If you add a new
// base-game `import { Foo } from '/core/...'` and CI reports
// "Module ... has no exported member 'Foo'", add `export const Foo: any;` here.

declare const baseGameModule: any;

/** Default export (e.g. `import DiplomacyManager from '/base-standard/...'`). */
export default baseGameModule;

// Named exports currently imported from base-game modules.
// NOTE: If you add a new base-game `import { Foo } from '/core/...'` and 
// CI reports "Module ... has no exported member 'Foo'", 
// add `export const Foo: any;` here.
export const Options: any; // /core/ui/options/model-options.js
export const OptionType: any; // /core/ui/options/model-options.js
export const CategoryType: any; // /core/ui/options/model-options.js
export const CategoryData: any; // /core/ui/options/options-helpers.js
export const formatStringArrayAsNewLineText: any; // /core/ui/utilities/utilities-core-textprovider.js
export const getUnlockTargetDescriptions: any; // /base-standard/ui/utilities/utilities-textprovider.js
export const getUnlockTargetName: any; // /base-standard/ui/utilities/utilities-textprovider.js
