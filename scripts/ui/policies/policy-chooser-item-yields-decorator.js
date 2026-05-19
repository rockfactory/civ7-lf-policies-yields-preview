import { previewPolicyYields } from "../../preview-yields.js";
import { renderYieldsPreviewBox } from "../render-yields-preview.js";

console.warn('LFYieldsPreview: Policy Chooser Item Decorator (1.4.0)');

// ====================================================================================================
// Background
// ----------------------------------------------------------------------------------------------------
// In 1.4.0 the legacy `policy-chooser-item` custom element is gone. The new `PolicyCard` is a Solid
// component in `/base-standard/ui/policies/policy-card.js`. It renders a root element with class
// `.policy-base-card` and the localized policy/tradition name inside an L10n.Stylize span with class
// `font-title uppercase ... text-sm font-bold`. There's no DOM attribute exposing the TraditionType.
//
// Approach: MutationObserver watches for `.policy-base-card` mounts; for each card we read the
// localized name from the DOM and match it against `GameInfo.Traditions` (which contains both
// traditions and policies, differentiated by `CultureSlotType`) by comparing normalized
// `Locale.compose(t.Name)`. When matched, we compute the yields preview via `previewPolicyYields`
// and append a box at the bottom of the card. Idempotency via `data-lf-yields-injected` flag.
// ====================================================================================================

function normalizeText(s) {
    return String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** @type {Map<string, string> | null} */
let _traditionByName = null;

function getTraditionTypeByName(displayedName) {
    if (_traditionByName == null) {
        _traditionByName = new Map();
        for (const t of GameInfo.Traditions) {
            const composed = normalizeText(Locale.compose(t.Name));
            if (composed) _traditionByName.set(composed, t.TraditionType);
        }
    }
    return _traditionByName.get(normalizeText(displayedName));
}

function injectYieldsIntoCard(card) {
    if (card.dataset.lfYieldsInjected === '1') return;

    // Find the displayed name. L10n.Stylize for the name is rendered with this class set in
    // `policy-card.js` lines 119-124: "flex flex-auto font-title uppercase tracking-100 break-words text-sm font-bold".
    const nameEl = card.querySelector('.font-title.uppercase.text-sm.font-bold');
    const displayedName = nameEl?.textContent?.trim();
    if (!displayedName) return;

    const traditionType = getTraditionTypeByName(displayedName);
    if (!traditionType) {
        // Mark anyway so we don't re-scan empty/slot cards on every observer firing.
        card.dataset.lfYieldsInjected = '1';
        return;
    }

    try {
        const result = previewPolicyYields({ TraditionType: traditionType });
        const previewBox = renderYieldsPreviewBox(result);
        if (previewBox) {
            // Nudge up via negative margin-top: the box overlaps the previous sibling by 4px,
            // pulling the box visually higher while keeping the card height roughly unchanged.
            previewBox.style.marginTop = '-4px';
            card.appendChild(previewBox);
        }
        card.dataset.lfYieldsInjected = '1';
    } catch (e) {
        console.error('[LFYieldsPreview] Error injecting policy yields for', traditionType, e);
        if (e instanceof Error) console.error(e.stack);
    }
}

function scanForCards(root) {
    if (!(root instanceof HTMLElement)) return;
    if (root.classList?.contains('policy-base-card')) {
        injectYieldsIntoCard(root);
    }
    const nested = root.querySelectorAll?.('.policy-base-card');
    if (nested) {
        for (const card of nested) injectYieldsIntoCard(card);
    }
}

const cardObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            scanForCards(node);
        }
    }
});

cardObserver.observe(document.body, { childList: true, subtree: true });
