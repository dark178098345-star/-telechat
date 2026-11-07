# v189: sender avatars and bubble styles

Existing message presentation and per-conversation preferences are extended directly. No new message renderer, observer over history, backend schema or message payload is introduced.

## Sender avatars

The existing grouping sync adds an accessible profile button at the end of a sender group, without hidden avatar copies on every row. Cached profile photos use safe image sources, lazy loading and a letter fallback; videos are not started. Photo/name updates are scoped to that sender. Stable rows preserve their avatar nodes; deleted rows remove controls. A scoped containment override permits the avatar gutter without removing containment from unrelated UI.

## Bubbles

Seven allowlisted choices (original plus six skins) use original static SVG art and CSS gradients. A choice grid and live preview live in the existing chat settings dialog. Settings retain the existing account/conversation/device scope, save-error behavior, reset and scroll anchoring. Old saved settings default to the original appearance. Skin palettes take precedence while active; previous custom colours remain available when returning to the original skin.

Text has reserved space for ornaments. Emoji-only, gift and call-history cards are excluded from decorative overlays. Density cannot collapse ornament space. No per-message animations or polling are added.

## Validation

bubble-styles-v189.browser.cjs covers 320/390/1440px, the seven choices, real computed styles, grouping, avatar profile action/photo update, no-op stability, long text, light mode, emoji exclusion, reset and deletion. Existing preferences, grouping, long-history stability and complete production-stack tests remain in use.
