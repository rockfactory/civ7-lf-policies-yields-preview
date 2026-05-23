import { PolicyYieldsSettings } from '../../core/settings.js';

const PANEL_ID = 'lf-debug-cheat-panel';
const STYLE_ID = 'lf-debug-cheat-panel-style';

let isCollapsed = false;
/** @type {number | null} */
let refreshTimer = null;
let engineListenersAttached = false;

console.log('[LFDebug] cheat-panel.js module loaded');

function setupStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = /* css */ `
    #${PANEL_ID} {
        position: fixed;
        top: calc(5rem + 150px);
        right: 1rem;
        z-index: 99999;
        background: linear-gradient(180deg, rgba(19, 20, 21, 0.85) 0%, rgba(27, 27, 30, 0.95) 100%);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 0.4rem;
        padding: 0.5rem;
        font-family: sans-serif;
        font-size: 0.85rem;
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        min-width: 14rem;
        pointer-events: auto;
        box-shadow: 0 0.2rem 0.6rem rgba(0,0,0,0.5);
    }
    #${PANEL_ID} .lf-debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        opacity: 0.85;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05rem;
    }
    #${PANEL_ID} .lf-debug-toggle {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 0.2rem;
        color: #fff;
        cursor: pointer;
        padding: 0 0.4rem;
        font-size: 0.85rem;
        line-height: 1.1rem;
        opacity: 0.7;
    }
    #${PANEL_ID} .lf-debug-toggle:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
    }
    #${PANEL_ID} button.lf-debug-action {
        background: rgba(80, 110, 160, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 0.25rem;
        color: #fff;
        padding: 0.3rem 0.5rem;
        cursor: pointer;
        font-size: 0.8rem;
        text-align: left;
    }
    #${PANEL_ID} button.lf-debug-action:hover {
        background: rgba(120, 160, 220, 0.8);
    }
    #${PANEL_ID} button.lf-debug-action.lf-debug-disabled {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
    }
    #${PANEL_ID} button.lf-debug-action.lf-debug-bulk {
        background: rgba(180, 110, 60, 0.6);
    }
    #${PANEL_ID} button.lf-debug-action.lf-debug-bulk:hover {
        background: rgba(220, 140, 80, 0.85);
    }
    #${PANEL_ID}.lf-debug-collapsed {
        min-width: 0;
        gap: 0;
    }
    #${PANEL_ID}.lf-debug-collapsed button.lf-debug-action {
        display: none;
    }
    `;
    document.head.appendChild(style);
}

/** @returns {Player | null} */
function getLocalPlayer() {
    const id = GameContext.localPlayerID;
    if (id == null || id < 0) return null;
    return Players.get(id);
}

/** @returns {number | null} */
function getCurrentTechNode() {
    const player = getLocalPlayer();
    const research = player?.Techs.getResearching();
    const node = research?.type;
    return (node != null && node !== -1) ? node : null;
}

/** @returns {number | null} */
function getCurrentCivicNode() {
    const player = getLocalPlayer();
    const research = player?.Culture.getResearching();
    const node = research?.type;
    return (node != null && node !== -1) ? node : null;
}

/**
 * @param {number | null} nodeType
 * @returns {string | null}
 */
function nodeLabel(nodeType) {
    if (nodeType == null) return null;
    try {
        const info = GameInfo.ProgressionTreeNodes.lookup(nodeType);
        if (info?.Name) {
            return Locale.compose(info.Name);
        }
    } catch (e) {
        console.warn('[LFDebug] nodeLabel lookup failed', e);
    }
    return null;
}

/**
 * @param {number | null} nodeType
 * @returns {boolean}
 */
function grantNode(nodeType) {
    if (nodeType == null) return false;
    const args = { ProgressionTreeNodeType: nodeType, FullyUnlock: 1 };
    try {
        Game.PlayerOperations.sendRequest(
            GameContext.localPlayerID,
            PlayerOperationTypes.GRANT_TREE_NODE,
            args
        );
        return true;
    } catch (e) {
        console.error('[LFDebug] GRANT_TREE_NODE failed', e);
        return false;
    }
}

/**
 * @param {number} amount
 * @returns {boolean}
 */
function grantGold(amount) {
    const player = getLocalPlayer();
    if (!player?.Treasury) return false;
    try {
        player.Treasury.changeGoldBalance(amount, -1);
        return true;
    } catch (e) {
        console.error('[LFDebug] changeGoldBalance failed', e);
        return false;
    }
}

/**
 * @param {number} amount
 * @returns {boolean}
 */
function grantInfluence(amount) {
    const player = getLocalPlayer();
    if (!player?.DiplomacyTreasury) return false;
    try {
        player.DiplomacyTreasury.changeDiplomacyBalance(amount);
        return true;
    } catch (e) {
        console.error('[LFDebug] changeDiplomacyBalance failed', e);
        return false;
    }
}

/**
 * Make every tradition (policy card) in the game directly slottable,
 * bypassing the civic-tree unlock path. Iterates GameInfo.Traditions and
 * calls `Culture.unlockTradition` for each one not already unlocked.
 * @returns {{ unlocked: number; skipped: number; failed: number }}
 */
function unlockAllTraditions() {
    const player = getLocalPlayer();
    if (!player?.Culture) {
        console.warn('[LFDebug] no local player culture');
        return { unlocked: 0, skipped: 0, failed: 0 };
    }

    let unlocked = 0;
    let skipped = 0;
    let failed = 0;
    for (const tradition of GameInfo.Traditions) {
        try {
            if (player.Culture.isTraditionUnlocked(tradition.$index)) {
                skipped++;
                continue;
            }
            player.Culture.unlockTradition(tradition.$index);
            unlocked++;
        } catch (e) {
            failed++;
            console.warn('[LFDebug] failed to unlock', tradition.TraditionType, e);
        }
    }
    console.log(`[LFDebug] unlockAllTraditions: unlocked=${unlocked} skipped=${skipped} failed=${failed}`);
    return { unlocked, skipped, failed };
}

/** @returns {HTMLElement | null} */
function ensurePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) return existing;
    if (!document.body) return null;

    setupStyles();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
        <div class="lf-debug-header">
            <span>LF Debug Cheats</span>
            <button class="lf-debug-toggle" type="button" title="Collapse / expand">&times;</button>
        </div>
        <button class="lf-debug-action" data-action="tech" type="button"></button>
        <button class="lf-debug-action" data-action="civic" type="button"></button>
        <button class="lf-debug-action lf-debug-bulk" data-action="all-policies" type="button">Unlock All Policies (All Civs)</button>
        <button class="lf-debug-action" data-action="gold" type="button">+500 Gold</button>
        <button class="lf-debug-action" data-action="influence" type="button">+500 Influence</button>
    `;
    document.body.appendChild(panel);

    const techBtn = /** @type {HTMLButtonElement} */ (panel.querySelector('[data-action="tech"]'));
    const civicBtn = /** @type {HTMLButtonElement} */ (panel.querySelector('[data-action="civic"]'));
    const allBtn = /** @type {HTMLButtonElement} */ (panel.querySelector('[data-action="all-policies"]'));
    const goldBtn = /** @type {HTMLButtonElement} */ (panel.querySelector('[data-action="gold"]'));
    const influenceBtn = /** @type {HTMLButtonElement} */ (panel.querySelector('[data-action="influence"]'));
    const toggleBtn = /** @type {HTMLButtonElement} */ (panel.querySelector('.lf-debug-toggle'));

    techBtn.addEventListener('click', () => {
        const node = getCurrentTechNode();
        if (grantNode(node)) {
            console.log('[LFDebug] granted tech node', node);
        }
        setTimeout(updatePanel, 100);
    });
    civicBtn.addEventListener('click', () => {
        const node = getCurrentCivicNode();
        if (grantNode(node)) {
            console.log('[LFDebug] granted civic node', node);
        }
        setTimeout(updatePanel, 100);
    });
    allBtn.addEventListener('click', () => {
        const result = unlockAllTraditions();
        allBtn.textContent = `Unlocked ${result.unlocked} (skipped ${result.skipped})`;
        setTimeout(() => { allBtn.textContent = 'Unlock All Policies (All Civs)'; }, 2000);
        setTimeout(updatePanel, 100);
    });
    goldBtn.addEventListener('click', () => {
        if (grantGold(500)) {
            console.log('[LFDebug] +500 gold');
        }
    });
    influenceBtn.addEventListener('click', () => {
        if (grantInfluence(500)) {
            console.log('[LFDebug] +500 influence');
        }
    });
    toggleBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        updatePanel();
    });

    return panel;
}

function updatePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const techNode = getCurrentTechNode();
    const civicNode = getCurrentCivicNode();

    const techBtn = /** @type {HTMLButtonElement | null} */ (panel.querySelector('[data-action="tech"]'));
    const civicBtn = /** @type {HTMLButtonElement | null} */ (panel.querySelector('[data-action="civic"]'));
    const toggleBtn = /** @type {HTMLButtonElement | null} */ (panel.querySelector('.lf-debug-toggle'));
    if (!techBtn || !civicBtn || !toggleBtn) return;

    const techText = nodeLabel(techNode) ?? '(none)';
    const civicText = nodeLabel(civicNode) ?? '(none)';

    techBtn.textContent = `Unlock Tech: ${techText}`;
    civicBtn.textContent = `Unlock Civic: ${civicText}`;
    const techDisabled = techNode == null;
    const civicDisabled = civicNode == null;
    techBtn.disabled = techDisabled;
    techBtn.classList.toggle('lf-debug-disabled', techDisabled);
    civicBtn.disabled = civicDisabled;
    civicBtn.classList.toggle('lf-debug-disabled', civicDisabled);

    panel.classList.toggle('lf-debug-collapsed', isCollapsed);
    toggleBtn.innerHTML = isCollapsed ? '+' : '&times;';
    toggleBtn.title = isCollapsed ? 'Expand panel' : 'Collapse panel';
}

function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
}

function attachEngineListenersOnce() {
    if (engineListenersAttached) return;
    engineListenersAttached = true;
    engine.on('TechNodeCompleted', () => setTimeout(updatePanel, 50));
    engine.on('CultureNodeCompleted', () => setTimeout(updatePanel, 50));
    engine.on('PlayerTurnActivated', () => setTimeout(updatePanel, 50));
}

let visibilityAttempts = 0;
function applyVisibility() {
    if (PolicyYieldsSettings.IsDebugMode) {
        if (!document.body) {
            visibilityAttempts++;
            if (visibilityAttempts < 300) {
                requestAnimationFrame(applyVisibility);
            } else {
                console.warn('[LFDebug] gave up waiting for document.body');
            }
            return;
        }
        try {
            const panel = ensurePanel();
            if (!panel) {
                console.warn('[LFDebug] ensurePanel returned null');
                return;
            }
            updatePanel();
            console.log('[LFDebug] panel mounted', panel);
        } catch (e) {
            console.error('[LFDebug] panel mount failed', e);
            return;
        }
        if (refreshTimer == null) {
            refreshTimer = setInterval(() => {
                if (document.getElementById(PANEL_ID)) updatePanel();
            }, 1500);
        }
        attachEngineListenersOnce();
    } else {
        removePanel();
        if (refreshTimer != null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }
}

function init() {
    PolicyYieldsSettings.onDebugModeChange(() => applyVisibility());
    applyVisibility();

    // @ts-ignore — augmenting globalThis for manual debugging only
    globalThis.lfDebugPanel = {
        show: () => { ensurePanel(); updatePanel(); },
        hide: () => removePanel(),
        refresh: updatePanel,
        grantTech: () => grantNode(getCurrentTechNode()),
        grantCivic: () => grantNode(getCurrentCivicNode()),
        grantAllPolicies: () => unlockAllTraditions(),
        grantGold: (/** @type {number} */ amount = 500) => grantGold(amount),
        grantInfluence: (/** @type {number} */ amount = 500) => grantInfluence(amount),
    };
}

init();
