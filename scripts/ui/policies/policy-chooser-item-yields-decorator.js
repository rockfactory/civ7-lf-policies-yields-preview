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
            // Positioning (negative margin-top + translateY) lives in yields-styles.js,
            // scoped to `.policy-base-card > .yields-preview__root` so it can be tuned
            // there alongside the rest of the policy-card styling.
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

// Mark each .empty-base-card with data-lf-slot-covered="1" iff the
// .policy-base-card at the same positional index is opaque (i.e., not the
// empty placeholder emitted by activeTraditionsWithEmpties, which carries
// `opacity-0`). The CSS rule that hides the slot's icon-pod is scoped to this
// marker so empty slots keep their "Add policy/tradition" icon visible.
//
// Why data-attribute and not a class: the slot's CardSlot component (see
// policy-card.js around line 213-217) binds `class` through Solid's `spread`
// with a reactive getter that depends on policiesFocus()/traditionsFocus(), so
// any class we add gets wiped the next time the focus signal changes. Data
// attributes are not touched by that binding.
//
// Layout reference (policies-and-traditions.js _tmpl$7):
//   .policies-2-col
//     > .relative.flex-wrap                              (cards container)
//         > .absolute.pointer-events-none.flex-wrap      (slots container)
//         > .policy-base-card ...                        (cards, in DOM order)
function refreshSlotCoverage(col) {
    const cardContainer = col.firstElementChild;
    if (!cardContainer) return;
    const slotContainer = cardContainer.firstElementChild;
    if (!slotContainer || !slotContainer.classList?.contains('pointer-events-none')) return;

    const slots = Array.from(slotContainer.children).filter(el => el.classList?.contains('empty-base-card'));
    const cards = Array.from(cardContainer.children).filter(el => el.classList?.contains('policy-base-card'));

    slots.forEach((slot, i) => {
        const card = cards[i];
        const isCovered = !!card && !card.classList.contains('opacity-0');
        if (isCovered) {
            slot.dataset.lfSlotCovered = '1';
        } else {
            delete slot.dataset.lfSlotCovered;
        }
    });
}

function refreshAllSlotCoverage() {
    document.querySelectorAll('.policies-2-col').forEach(refreshSlotCoverage);
}

const cardObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            scanForCards(node);
        }
    }
    refreshAllSlotCoverage();
});

cardObserver.observe(document.body, { childList: true, subtree: true });
