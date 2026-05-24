/**
 * Public yields-preview API exposed by lf-policies-yields-preview on
 * `globalThis.LfYieldsPreview`. This ambient declaration also makes the
 * bare identifier `LfYieldsPreview` resolve to the same value, so a
 * consumer can write either `globalThis.LfYieldsPreview.previewModifierByIds(...)`
 * or simply `LfYieldsPreview.previewModifierByIds(...)`.
 *
 * Available at runtime from any game-scope UIScript that runs after the
 * lf-policies-yields-preview ActionGroup (LoadOrder > 500). The consumer
 * should treat the global as optional: always check with
 * `if (globalThis.LfYieldsPreview) { ... }` so the mod degrades cleanly
 * when lf-policies-yields-preview is not installed or has not loaded yet.
 */
declare interface LfYieldsPreviewApi {
    /**
     * Compute combined yields preview for a list of ModifierIds.
     * Never throws; returns { isValid: false, error } on failure.
     * Missing ids are reported in `error` but do not block the preview
     * of the rest. For a single-id preview, pass `[id]`.
     */
    previewModifierByIds(modifierIds: string[]): YieldsPreviewResult;

    /** Compute yields preview for a Tradition (Policy). */
    previewPolicyYields(policy: { TraditionType: string }): YieldsPreviewResult;

    /** Compute yields preview for a Progression Tree node (Attribute). */
    previewAttributeYields(attribute: string): YieldsPreviewResult;

    /** Compute yields preview for a City-State bonus. */
    previewCityStateBonusYields(bonusType: string): YieldsPreviewResult;

    /**
     * Render a YieldsPreviewResult into an HTML element using the same
     * visual style as the mod's built-in decorators (icon glyphs,
     * colored backgrounds, negative-value styling, colorful/no-color
     * mode honoring the user's settings).
     *
     * The mod's CSS is registered lazily on first call, so no extra
     * setup is required. Returns an empty `<div></div>` if the result
     * has no yields and no error.
     *
     * The returned element is detached: append it to a parent container
     * controlled by the consumer.
     *
     * @param result The preview result to render.
     * @returns A detached HTMLDivElement ready to be appended.
     */
    renderYieldsPreviewBox(result: YieldsPreviewResult): HTMLDivElement;
}

declare var LfYieldsPreview: LfYieldsPreviewApi;
