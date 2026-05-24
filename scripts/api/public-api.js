import { resolveModifierById } from "../modifiers.js";
import {
    previewModifiersYields,
    previewPolicyYields,
    previewAttributeYields,
    previewCityStateBonusYields,
} from "../preview-yields.js";
import { renderYieldsPreviewBox } from "../ui/render-yields-preview.js";

/**
 * Resolve a list of ModifierIds and compute a combined yields preview.
 *
 * Public entry point: unlike previewModifiersYields (called inside
 * decorator pipelines where a thrown error is acceptable and aborts only
 * that policy preview), this is wrapped in its own try/catch and never
 * throws. On failure it returns a clean YieldsPreviewResult with
 * isValid=false.
 *
 * Missing ids are skipped and reported in the `error` string; the preview
 * is computed on whatever resolved. Returns isValid=false only if no id
 * resolved or an unexpected error was thrown.
 *
 * For a single-id preview, pass a one-element array.
 *
 * @param {string[]} modifierIds
 * @returns {YieldsPreviewResult}
 */
function previewModifierByIds(modifierIds) {
    try {
        if (!Array.isArray(modifierIds) || modifierIds.length === 0) {
            return {
                yields: {},
                modifiers: [],
                isValid: false,
                error: "previewModifierByIds: expected a non-empty array of ModifierId strings",
            };
        }
        /** @type {ResolvedModifier[]} */
        const resolved = [];
        /** @type {string[]} */
        const missing = [];
        for (const id of modifierIds) {
            const m = resolveModifierById(id);
            if (m) resolved.push(m);
            else missing.push(id);
        }
        if (resolved.length === 0) {
            return {
                yields: {},
                modifiers: [],
                isValid: false,
                error: `No modifiers resolved. Missing: ${missing.join(", ")}`,
            };
        }
        const result = previewModifiersYields(resolved, `ModifierIds [${modifierIds.join(", ")}]`);
        if (missing.length > 0) {
            return { ...result, error: `Some modifiers missing: ${missing.join(", ")}` };
        }
        return result;
    } catch (/** @type {any} */ error) {
        console.error(`LfYieldsPreview.previewModifierByIds: failed`);
        console.error(error);
        return {
            yields: {},
            modifiers: [],
            isValid: false,
            error: error?.message ?? String(error),
        };
    }
}

/**
 * Public yields-preview surface attached to `globalThis.LfYieldsPreview`.
 *
 * All functions return a YieldsPreviewResult and never throw: on internal
 * failure they return { yields: {}, modifiers: [...], isValid: false, error }.
 * The object is frozen to prevent monkey-patching.
 */
const LfYieldsPreview = Object.freeze({
    previewModifierByIds,
    previewPolicyYields,
    previewAttributeYields,
    previewCityStateBonusYields,
    renderYieldsPreviewBox,
});

globalThis.LfYieldsPreview = LfYieldsPreview;
