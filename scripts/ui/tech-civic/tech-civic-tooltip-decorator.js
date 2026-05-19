import { previewModifiersYields, previewPolicyYields } from '../../preview-yields.js';
import { resolveModifierById } from '../../modifiers.js';
import { renderYieldsPreviewBox } from '../render-yields-preview.js';
import { getUnlockTargetDescriptions, getUnlockTargetName } from '/base-standard/ui/utilities/utilities-textprovider.js';
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js';

console.warn('LFYieldsPreview: Tech/Civic Tooltip Decorator (1.4.0)');

// In 1.4.0 both choosers (`tech-chooser-item.js`, `culture-chooser-item.js`) and the full
// tech/civic tree (`tree-card-v2.js`, legacy `tree-card.js`) render the SAME Solid `TechCivicTooltip`
// component, which mounts via a `<Portal>` into `#uinext-tooltips` and has no update()/hoveredNodeID
// hooks. Strategy: track the hovered node via `mouseover` capture, then on a short setTimeout query
// the mounted `.tech-civic-tooltip` and inject yield boxes (re-injecting if the node changes while
// the tooltip stays mounted, since Solid reuses the DOM across hovers).

let _lastHoveredNodeType = null;
let _lastHoveredDepthIndex = null; // null = use nodeData.depthUnlocked

const DEBUG = false;
function dbg(...args) { if (DEBUG) console.warn('[LFYieldsPreview]', ...args); }

// ----------------------------------------------------------------------------------------------------
// Hover tracking (single capture handler on document.body — covers chooser items and tree cards)
// ----------------------------------------------------------------------------------------------------

function trackHover(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    let rawNodeAttr = null;
    let depthIndex = null;
    let triggerSource = null;

    // Choosers: tech-chooser-item / culture-chooser-item set `node-id` on the ChooserItem root.
    const chooserTrigger = target.closest('[node-id]');
    if (chooserTrigger) {
        rawNodeAttr = chooserTrigger.getAttribute('node-id');
        triggerSource = 'chooser';
    } else {
        // Full tree view. Two variants:
        //  - Legacy tree-card.js — `type` and `level` are set on the `.tree-card-hitbox` child
        //    (each mastery tier has its own hitbox with its own `level`).
        //  - Solid tree-card-v2.js — registered via defineLegacyComponent("tree-card-v2", { attrs:
        //    { type, ... } }), so `type` sits directly on the `<tree-card-v2>` custom element.
        const hitbox = target.closest('.tree-card-hitbox[type], tree-card-v2[type]');
        if (hitbox) {
            rawNodeAttr = hitbox.getAttribute('type');
            const levelAttr = hitbox.getAttribute('level');
            depthIndex = levelAttr != null ? Number(levelAttr) : null;
            triggerSource = hitbox.tagName.toLowerCase();
        }
    }

    if (!rawNodeAttr) return;

    // `Game.ProgressionTrees.getNode` expects a numeric hash. The DOM exposes attributes as strings,
    // so we coerce — but keep the original string as a fallback for any callsite that might use it.
    const asNumber = Number(rawNodeAttr);
    const nodeType = Number.isFinite(asNumber) ? asNumber : rawNodeAttr;
    if (nodeType === _lastHoveredNodeType && depthIndex === _lastHoveredDepthIndex) return;

    _lastHoveredNodeType = nodeType;
    _lastHoveredDepthIndex = depthIndex;
    dbg('hover node', nodeType, 'depth', depthIndex, 'from', triggerSource);

    // Re-inject for any mounted tooltip (Solid may reuse the DOM across hovers).
    scheduleInjection();
}

document.body.addEventListener('mouseover', trackHover, true);

// ----------------------------------------------------------------------------------------------------
// Compute per-depth yields data from raw GameInfo
// ----------------------------------------------------------------------------------------------------

function computeYieldsPerDepth(unlockIndices) {
    /** @type {{ visibleUnlocks: { kind: string, targetType: string, displayName: string }[], hiddenModifierIds: string[] }[]} */
    const perDepth = [];
    function ensureDepth(d) {
        while (perDepth.length <= d) perDepth.push({ visibleUnlocks: [], hiddenModifierIds: [] });
        return perDepth[d];
    }

    for (const i of unlockIndices) {
        const unlockInfo = GameInfo.ProgressionTreeNodeUnlocks[i];
        if (!unlockInfo) continue;
        if (unlockInfo.TargetKind !== 'KIND_MODIFIER' && unlockInfo.TargetKind !== 'KIND_TRADITION') continue;

        const depthIndex = Math.max(0, (unlockInfo.UnlockDepth ?? 1) - 1);
        const slot = ensureDepth(depthIndex);

        // Hidden modifiers are not rendered as a tooltip row — they only contribute to the
        // aggregate fallback box. Hidden traditions don't exist in practice, skip them too.
        if (unlockInfo.Hidden) {
            if (unlockInfo.TargetKind === 'KIND_MODIFIER') {
                slot.hiddenModifierIds.push(unlockInfo.TargetType);
            }
            continue;
        }

        const localName = getUnlockTargetName(unlockInfo.TargetType, unlockInfo.TargetKind);
        const localDesc = formatStringArrayAsNewLineText(getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind));
        const displayName = localName?.length ? localName : localDesc;
        if (!displayName) {
            // Modifier with no visible name/description still affects yields — fall back to aggregate.
            if (unlockInfo.TargetKind === 'KIND_MODIFIER') {
                slot.hiddenModifierIds.push(unlockInfo.TargetType);
            }
            continue;
        }

        slot.visibleUnlocks.push({
            kind: unlockInfo.TargetKind,
            targetType: unlockInfo.TargetType,
            displayName,
        });
    }
    return perDepth;
}

// ----------------------------------------------------------------------------------------------------
// DOM injection
// ----------------------------------------------------------------------------------------------------

function normalizeText(s) {
    let str = String(s ?? '');
    // The "displayName" for modifiers comes from getUnlockTargetDescriptions which returns
    // HTML markup wrapped in <p cohinline> with <fxs-font-icon> children and &nbsp; entities.
    // The DOM textContent has tags/icons already stripped, so we strip them here too to match.
    if (str.indexOf('<') !== -1 || str.indexOf('&') !== -1) {
        const div = document.createElement('div');
        div.innerHTML = str;
        str = div.textContent || '';
    }
    return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

function clearPreviousInjection(tooltipEl) {
    const previousBoxes = tooltipEl.querySelectorAll('[data-lf-yields-box]');
    previousBoxes.forEach(box => box.remove());
    delete tooltipEl.dataset.lfYieldsInjected;
    delete tooltipEl.dataset.lfYieldsForNode;
}

function injectYieldsPreview(tooltipEl) {
    const nodeType = _lastHoveredNodeType;
    if (!nodeType) {
        dbg('skip: no hovered node');
        return;
    }

    // Already injected for this exact node? Skip.
    if (tooltipEl.dataset.lfYieldsInjected === '1' && tooltipEl.dataset.lfYieldsForNode === nodeType) {
        return;
    }

    // Hovered node changed: wipe and re-inject.
    if (tooltipEl.dataset.lfYieldsInjected === '1' && tooltipEl.dataset.lfYieldsForNode !== nodeType) {
        clearPreviousInjection(tooltipEl);
    }

    tooltipEl.dataset.lfYieldsInjected = '1';
    tooltipEl.dataset.lfYieldsForNode = nodeType;

    try {
        const localPlayerId = GameContext.localPlayerID;
        const nodeData = Game.ProgressionTrees.getNode(localPlayerId, nodeType);
        if (!nodeData) {
            dbg('skip: nodeData not found for', nodeType);
            return;
        }

        const perDepth = computeYieldsPerDepth(nodeData.unlockIndices);
        const depthIndex = _lastHoveredDepthIndex != null
            ? _lastHoveredDepthIndex
            : (nodeData.depthUnlocked ?? 0);
        const depth = perDepth[depthIndex];
        if (!depth) {
            dbg('skip: no depth data', nodeType, 'depthIndex', depthIndex, 'available', perDepth.length);
            return;
        }
        dbg('injecting for', nodeType, 'depth', depthIndex,
            'visibleUnlocks', depth.visibleUnlocks.length, 'hiddenModifiers', depth.hiddenModifierIds.length);

        // --- Per-unlock box: traditions and visible modifiers both get matched in DOM by name and
        //     get their own box appended on the right of the matching UnlockItem row,
        //     mirroring how vanilla constructible unlocks (e.g. "Felicità +3" on Altare) lay out.
        const unlockItems = Array.from(tooltipEl.querySelectorAll('[class*="img-base-ticket-bg"]'));
        dbg('unlock items in DOM:', unlockItems.length);
        const usedItems = new Set();
        for (const unlock of depth.visibleUnlocks) {
            const normalized = normalizeText(Locale.compose(unlock.displayName) || unlock.displayName);
            let matchedItem = null;
            for (const item of unlockItems) {
                if (usedItems.has(item)) continue;
                if (normalizeText(item.textContent || '').includes(normalized)) {
                    matchedItem = item;
                    break;
                }
            }
            if (!matchedItem) {
                dbg('  unlock not matched in DOM:', unlock.displayName, '(normalized:', normalized, ')');
                continue;
            }
            usedItems.add(matchedItem);

            let result = null;
            if (unlock.kind === 'KIND_TRADITION') {
                result = previewPolicyYields({ TraditionType: unlock.targetType });
            } else if (unlock.kind === 'KIND_MODIFIER') {
                const modifier = resolveModifierById(unlock.targetType);
                result = previewModifiersYields(modifier ? [modifier] : null, 'Tech/Civic single ' + unlock.targetType);
            }
            if (!result) continue;

            const previewBox = renderYieldsPreviewBox(result);
            if (!previewBox) continue;
            
            previewBox.setAttribute('data-lf-yields-box', '1');
            previewBox.classList.add('ml-auto', 'self-center');
            matchedItem.appendChild(previewBox);
        }

        // --- Aggregated fallback box for hidden modifiers only: appended to the tooltip frame ---
        if (depth.hiddenModifierIds.length > 0) {
            const modifiers = depth.hiddenModifierIds.map(id => resolveModifierById(id));
            const result = previewModifiersYields(modifiers, 'Tech/Civic hidden ' + nodeType);
            const previewBox = renderYieldsPreviewBox(result);
            if (previewBox) {
                previewBox.setAttribute('data-lf-yields-box', '1');
                // Insert before the recommendations/cost row, falling back to tooltip root.
                const lastRow = tooltipEl.querySelector('[class*="flex-wrap"][class*="mt-2"]');
                if (lastRow && lastRow.parentNode) {
                    lastRow.parentNode.insertBefore(previewBox, lastRow);
                } else {
                    tooltipEl.appendChild(previewBox);
                }
            }
        }
    } catch (e) {
        console.error('[LFYieldsPreview] Error injecting yields preview', e);
        if (e instanceof Error) console.error(e.stack);
    }
}

// ----------------------------------------------------------------------------------------------------
// Scheduling: setTimeout after hover, plus MutationObserver as a safety net for initial mount
// ----------------------------------------------------------------------------------------------------

let _scheduled = false;
function scheduleInjection() {
    if (_scheduled) return;
    _scheduled = true;
    setTimeout(() => {
        _scheduled = false;
        const tooltips = document.querySelectorAll('.tech-civic-tooltip');
        if (tooltips.length === 0) {
            dbg('scheduled injection: no .tech-civic-tooltip in DOM yet');
            return;
        }
        for (const tooltip of tooltips) injectYieldsPreview(tooltip);
    }, 80);
}

const tooltipObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.classList?.contains('tech-civic-tooltip')) {
                injectYieldsPreview(node);
            } else {
                const nested = node.querySelectorAll?.('.tech-civic-tooltip');
                if (nested) for (const t of nested) injectYieldsPreview(t);
            }
        }
    }
});

tooltipObserver.observe(document.body, { childList: true, subtree: true });
