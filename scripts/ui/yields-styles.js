let isCSSApplied = false;

export function setupCSSStyles() {
    if (isCSSApplied) return;

    const style = document.createElement('style');
    style.textContent = /* css */ `
    .yields-preview__root div.yields-preview__container {
        font-weight: 700;
        line-height: 1.3333333333rem;
        border-radius: 0.38rem;
        flex-wrap: wrap;
        justify-content: center;
        column-gap: 0.3rem;
    }

    .yields-preview__root.no-color div.yields-preview__container {
        padding: 0.3rem 0.4rem;
        background: linear-gradient(180deg, rgba(19, 20, 21, 0.45) 0%, rgba(27, 27, 30, 0.85) 100%);
    }

    .yields-preview__root div.yields-preview__item {
        margin: 0;
        line-height: 1.3333333333rem;
        border-radius: 0.35rem;
        white-space: nowrap;
    }

    /** Colorful version: symmetric horizontal padding so the +X / icon block has the same
        breathing room on both sides (was asymmetric 0.35 left / 0.15 right originally). */
    .yields-preview__root.color div.yields-preview__item {
        padding: 0.15rem 0.3rem;
    }

    /* Tooltips (from 23.3333) */
    .tech-civic-tooltip.tooltip .tooltip__content {
        width: 25.3333333333rem !important;
    }
    .tree-tooltip.tooltip .tooltip__content {
        width: 25.3333333333rem !important;
    }

    /* UnlockItem rows in any tooltip (icon | divider | description | preview share a flex-row):
       cap the preview width at 50% so wide multi-yield previews wrap instead of squeezing the
       description. max-width is a hard cap that acts on the flex basis, so we don't need
       flex-shrink: 1 + min-width: 0 on the root -- and crucially we DON'T want them: those
       would let the parent flex layout squeeze the box below its (item + padding) natural
       width whenever the description is long, visually eating the container padding so the
       "+X icon" block ends up flush against the pill edges. Without shrink/min-width, the
       basis is just clamped to 50% for big previews and left at natural width for small ones,
       and the fixed CSS padding around the items is always honored. */
    .img-base-ticket-bg > .yields-preview__root {
        max-width: 30%;
    }

    /* City State bonus */
    .suzerain-bonus__choices-container div.yields-preview__container {
        margin-top: 0.3rem;
        margin-right: 0.3rem;
    }

    /** Attributes */
    .policy-yield-previews__small-attribute {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
    }

    /* Empty slot frames behind active policy cards: hide the slot's icon-pod
       only when an opaque PolicyCard sits on top (the data-lf-slot-covered
       marker is toggled by policy-chooser-item-yields-decorator.js — using a
       data-attribute, not a class, because Solid reactively overwrites the
       slot's class attribute via its spread binding on focus changes).
       Without a card on top the slot must keep showing its icon + "Add
       policy/tradition" label, otherwise empty slots look broken.

       Reason for the rule when covered: the card's flex-auto icon row is
       shorter than the slot's size-full row (yields preview steals ~94px),
       so the slot icons end up ~47px lower than the card icons and peek out. */
    .empty-base-card[data-lf-slot-covered="1"] .w-6 {
        visibility: hidden;
    }

    /* Inside policy cards, shrink the preview to its content width.
       I disabled it right now cause I don't like how it renders. */
    /*.policy-base-card > .yields-preview__root {
        align-self: center;
        width: max-content;
    }*/

    /* not sure this is needed. */
    /*.policy-base-card > .yields-preview__root div.yields-preview__container {
        flex-wrap: nowrap;
    }*/
    `;
    document.head.appendChild(style);

    isCSSApplied = true;
}