import { PolicyYieldsCache } from "../../cache.js";

// In 1.4.0 the legacy `screen-policies` custom element is still registered as a bridge by
// `defineLegacyComponent("screen-policies", ...)` (see `policies/government-hub.js`), so this
// `Controls.decorate` hook still fires when the screen mounts. The Solid component behind it
// (`GovermentScreenComponent` / `PoliciesAndTraditions`) builds its data via `PoliciesModel`,
// which already exposes `TraditionType` on each card item directly — so the old `createPolicyNode`
// monkey-patch is no longer needed (the method doesn't exist on the new "screen" anyway).
//
// We keep the decorator solely to warm `PolicyYieldsCache` when the user opens the policy screen.

class ScreenPoliciesYieldsDecorator {
    constructor(val) {
        this.screen = val;
    }

    beforeAttach() {
        PolicyYieldsCache.update();
    }

    afterAttach() {}
    beforeDetach() {}
    afterDetach() {}
}

// @ts-ignore
Controls.decorate('screen-policies', (val) => new ScreenPoliciesYieldsDecorator(val));
