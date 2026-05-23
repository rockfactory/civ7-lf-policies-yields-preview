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
    }

    .yields-preview__root.no-color div.yields-preview__container {
        padding: 0.3rem;
        background: linear-gradient(180deg, rgba(19, 20, 21, 0.45) 0%, rgba(27, 27, 30, 0.85) 100%);
    }

    .yields-preview__root div.yields-preview__item {
        margin: 0;
        line-height: 1.3333333333rem;                    
        border-radius: 0.35rem;
        margin-left: 0.3rem;
    }

    /** Colorful version */
    .yields-preview__root.color div.yields-preview__item {
        padding-top: 0.15rem;
        padding-bottom: 0.15rem;
        padding-right: 0.15rem;
        padding-left: 0.35rem;  
    }


    .yields-preview__item:first-child {
        /*border-top-left-radius: 0.65rem;
        border-bottom-left-radius: 0.65rem;*/
        padding-left: 0.123rem;
        margin-left: 0 !important;
    }

    .yields-preview__item:last-child {
        /*border-top-right-radius: 0.65rem;
        border-bottom-right-radius: 0.65rem;*/
    }   


    /* Tooltips (from 23.3333) */
    .tech-civic-tooltip.tooltip .tooltip__content {
        width: 25.3333333333rem !important;
    }
    .tree-tooltip.tooltip .tooltip__content {
        width: 25.3333333333rem !important;
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