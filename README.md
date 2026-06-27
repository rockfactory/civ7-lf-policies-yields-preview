# civ7-lf-policies-yields-preview
 Civ7 Mod to show policies Yields in the policy selection screen 

## Debugging yields with FireTuner

When the preview total doesn't match what the game actually applies, dump the recursive yield tree from a live game before/after activating the policy and diff the two trees to find which leaves changed.

1. Launch **FireTuner** from Steam → *Sid Meier's Civilization VII SDK*, then open the *Scripting Console* tab
2. In the FireTuner console, paste the snippet below to return the full yield breakdown tree for one yield (e.g. `YIELD_CULTURE`):
   ```js
   (function(){
     const p = Players.get(GameContext.localPlayerID);
     const ay = p?.Stats?.getYields?.();
     if (!ay) return null;
     for (let i = 0; i < GameInfo.Yields.length; i++) {
       if (GameInfo.Yields[i].YieldType === "YIELD_CULTURE") return JSON.stringify(ay[i]);
     }
   })()
   ```
   Or, as a **one-liner**: FireTuner's input is single-line, so copy-paste this verbatim:
   ```js
   (function(){const p=Players.get(GameContext.localPlayerID),ay=p?.Stats?.getYields?.();if(!ay)return null;for(let i=0;i<GameInfo.Yields.length;i++)if(GameInfo.Yields[i].YieldType==="YIELD_CULTURE")return JSON.stringify(ay[i]);})()
   ```
3. Select the printed JSON in the output pane and press `Ctrl+C` twice to copy it, then save it to `before.json`. Activate the policy in-game, re-run the snippet, save as `after.json`.
4. Diff the two trees to locate the leaves the policy added or changed. Each node has the shape `{ value, type, id, description?, steps?, base?, modifier? }`; non-leaf node values are derived from their children, so real changes show up as new/removed `steps` entries or as changed atomic leaves (no `steps`/`base`/`modifier`).

## Public API

A read-only yields-preview API is exposed on `globalThis.LfYieldsPreview`
so other mods can compute and render previews programmatically. Five
methods are available; see `types/extension-api.d.ts` for full JSDoc /
TypeScript signatures.

### Load order and optional integration

The API is attached by the `game-lf-policies-ui` ActionGroup
(`<LoadOrder>500</LoadOrder>`, game scope). Consumer mods must run later,
i.e. with `<LoadOrder>` greater than 500 in a game-scope ActionGroup.

- **Hard dependency**: list `lf-policies-yields-preview` in
  `<Dependencies>`; the global is guaranteed to exist when your scripts
  run.
- **Optional enhancement**: no `<Dependencies>` entry needed; just gate
  every call with `if (globalThis.LfYieldsPreview)` and fall back when
  the user hasn't installed the mod.

### Methods

Gate every call with an availability check so the consumer works whether
or not the user has lf-policies-yields-preview installed:

```js
const yieldsApi = globalThis.LfYieldsPreview;
if (yieldsApi) {
    // One or more ModifierIds in a single call (combined preview).
    // For a single id, just pass a one-element array.
    const r1 = yieldsApi.previewModifierByIds(["QUIPU_MOD_URBAN_GOLD"]);
    const r2 = yieldsApi.previewModifierByIds([
        "QUIPU_MOD_URBAN_GOLD",
        "QUIPU_MOD_RURAL_PRODUCTION",
    ]);

    // High-level entry points (same functions the in-mod decorators use).
    // Inca "Quipu" tradition (Exploration age):
    const r3 = yieldsApi.previewPolicyYields({ TraditionType: "TRADITION_QUIPU" });
    // First node of the Cultural attribute tree:
    const r4 = yieldsApi.previewAttributeYields("NODE_ATTRIBUTE_CULTURAL_01");
    // First bonus of the Modern-age Militaristic city-state:
    const r5 = yieldsApi.previewCityStateBonusYields("CITY_STATE_BONUS_MODERN_1");
}
```

All methods return a `YieldsPreviewResult`:

```ts
{
    yields: { [YieldType: string]: number };
    modifiers: ResolvedModifier[];
    isValid: boolean;
    error?: string;
}
```

### Error handling

These methods never throw. On an internal failure they return
`{ yields: {}, modifiers: [...], isValid: false, error: "..." }` and log
the underlying exception to `UI.log`. Callers can safely chain calls
without try/catch.

### Rendering

To draw a `YieldsPreviewResult` with the same look the mod uses in the
policy chooser, attribute tree, and city-state bonus panel (icon glyphs,
colored backgrounds per yield type, negative-value styling, and the
user's colorful / no-color setting), pass it to `renderYieldsPreviewBox`:

```js
const yieldsApi = globalThis.LfYieldsPreview;
if (yieldsApi) {
    // Combined preview for both modifiers of the Inca "Quipu" tradition.
    const result = yieldsApi.previewModifierByIds([
        "QUIPU_MOD_URBAN_GOLD",
        "QUIPU_MOD_RURAL_PRODUCTION",
    ]);
    // result.yields, e.g. {"YIELD_PRODUCTION":105,"YIELD_GOLD":97}

    const box = yieldsApi.renderYieldsPreviewBox(result);
    myContainer.appendChild(box);
}
```

`renderYieldsPreviewBox` returns a detached `HTMLDivElement`. Append it
to any parent container you control. The mod's CSS is registered lazily
on the first call, so no extra setup is required. If the result has no
yields and no error, the returned element is an empty `<div></div>`
(safe to append unconditionally; it will not affect layout).

If you want your own visual style instead, ignore this helper and read
the `result.yields` map directly (it's a plain `{ YIELD_GOLD: 5, ... }`
object) to build whatever DOM your mod prefers.

### Typed access from a consumer mod

The mod ships a TypeScript ambient declaration at
`types/extension-api.d.ts`. There are two ways to get IntelliSense in a
consumer mod's `jsconfig.json` / `tsconfig.json`:

1. **Reference the file by path** (no copy, picks up future updates):

   ```jsonc
   {
       "compilerOptions": { "allowJs": true, "checkJs": true },
       "include": [
           "scripts/**/*.js",
           "<path-to-mods-folder>/lf-policies-yields-preview/types/extension-api.d.ts"
       ]
   }
   ```

   Replace `<path-to-mods-folder>` with the actual Mods folder on disk
   (typically `%LOCALAPPDATA%/Firaxis Games/Sid Meier's Civilization VII/Mods`).
   The path is editor-only and never shipped with the mod build.

2. **Copy the file** into the consumer's own `types/` folder and add it
   to its `include`. Simpler and self-contained, at the cost of having
   to re-copy when the API surface evolves.

In both cases, `LfYieldsPreview` becomes a typed global. Access it at
runtime as `globalThis.LfYieldsPreview` (or just `LfYieldsPreview`,
which the ambient declaration covers).

## Release

Version bumps are automated by `ci/bump-version.mjs`. It updates the version in
`package.json` and the `.modinfo` `<Version>`, refreshes `package-lock.json` via
`npm install`, and commits the three files as `Version bump vX.Y.Z`.

```bash
npm run bump -- --patch          # 1.4.1 -> 1.4.2
npm run bump -- --minor          # 1.4.1 -> 1.5.0
npm run bump -- --major          # 1.4.1 -> 2.0.0
npm run bump -- --target 1.5.0   # explicit version (v1.5.0 also accepted)
npm run bump -- --minor --dry-run  # preview only, no writes or commit
```

The commit includes only `package.json`, `package-lock.json`, and the `.modinfo`,
so any other working-tree changes stay out of it.
