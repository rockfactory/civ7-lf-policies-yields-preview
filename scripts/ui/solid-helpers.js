/**
 * Walks the DOM ancestor chain from `start` upwards (inclusive of `stopAt`) and returns the value
 * of the first ancestor that has the given JavaScript expando property defined.
 *
 * ## Why this exists
 *
 * Solid's web compiler (`solid-js/web`) sometimes generates DOM bindings as plain JavaScript
 * expando properties on the DOM node, NOT as HTML attributes. For example, in Civ VII's
 * `tree-card-v2.js` the compiled `NodeCard` sets:
 *
 * ```js
 * _el$.dataLevel = props.level;   // tree-card-v2.js:156
 * _el$.dataType  = props.type;    // tree-card-v2.js:157
 * ```
 *
 * Despite the `data*` naming, these are NOT `data-*` HTML attributes. They are plain JS property
 * assignments on the DOM node. Consequences:
 *
 * | access                                          | result    |
 * |-------------------------------------------------|-----------|
 * | `el.getAttribute('data-level')`                 | `null`    |
 * | `document.querySelector('[data-level]')`        | no match  |
 * | `el.dataset.level`                              | undefined |
 * | `el.dataLevel`                                  | `'0'`  |
 *
 * The only way to read these from outside is to walk the parent chain and read the property
 * directly via `element[propName]`. This helper does that.
 *
 * ## Use it for
 *
 * - Mod decorators that need to identify which Solid sub-component the user is hovering, when
 *   that component sets identifying state as a JS property (component instance, item index,
 *   depth/level, type id, etc).
 * - Any time you spot `_el$.someProp = ...` in a compiled Solid bundle and want to read it back
 *   from a DOM event handler.
 *
 * ## Don't use it for
 *
 * - Reading real HTML attributes — use `getAttribute(...)` / `closest('[attr]')`.
 * - Reading the standard `dataset` — use `el.dataset.xxx`.
 *
 * @param {EventTarget | null | undefined} start - Starting node, typically `event.target` from a
 *   mouseover/mouseenter capture handler.
 * @param {string} propertyName - Name of the expando property to look for (e.g. `'dataLevel'`,
 *   `'__solidComponent'`, anything Solid put on the node).
 * @param {Element | null} [stopAt=null] - Optional upper boundary. The walk reads the property on
 *   `stopAt` itself and then stops. Pass `null` (default) to walk all the way to the document root.
 * @returns {any} The first defined value found (anything except `undefined`/`null`), or `null`.
 *
 * @example
 * // Solid component source:
 * //   const NodeCard = (props) => {
 * //     const el = <div class="node-card">...</div>;
 * //     el.dataLevel = props.level;   // expando, not an HTML attribute
 * //     el.itemIndex = props.index;
 * //     return el;
 * //   };
 *
 * // Reading from outside the component, in a global mouseover handler:
 * document.body.addEventListener('mouseover', (event) => {
 *     const treeCard = event.target.closest('tree-card-v2');
 *     if (!treeCard) return;
 *     const level = findExpandoOnAncestor(event.target, 'dataLevel', treeCard);
 *     // → '0' for the main NodeCard, '1' for the first mastery tier, etc.
 *     const index = findExpandoOnAncestor(event.target, 'itemIndex', treeCard);
 * }, true);
 */
export function findExpandoOnAncestor(start, propertyName, stopAt = null) {
    /** @type {any} */
    let el = start;
    while (el) {
        const value = el[propertyName];
        if (value !== undefined && value !== null) {
            return value;
        }
        if (el === stopAt) return null; // searched stopAt itself; do not climb past it
        el = el.parentElement;
    }
    return null;
}
