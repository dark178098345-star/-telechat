# My Center v187

On-demand dashboard, available from the desktop rail, phone More menu and settings. Eight cards reuse existing application APIs; there is no new backend schema or background polling loop.

- Music reflects the current player and delegates transport actions.
- Photos use up to three loaded images from the current private conversation; gallery delegates to shared media.
- Messages show a loaded conversation and open the existing chat.
- Mood only prefills the existing profile editor. Saving remains explicit.
- Search covers loaded contacts and existing section shortcuts; global search remains separate.
- Statistics use an account-owned, whitelisted cached activity snapshot. The graph illustrates the XP progression rule, not daily history.
- Storage reflects browser-origin quota, not physical device free space. Unknown quota is not represented as zero.
- Music invitations delegate to existing actionable incoming message controls; expired invitations are excluded.

Work is bounded while open: player progress is throttled, content updates coalesced, photos traverse at most 60 recent siblings and invitations at most 40. Observers disconnect on close; account changes close the dialog. Reduced-motion policies stop waveform animation.

Validation: my-center-v187.browser.cjs covers widths 320–1440, light mode, player actions, search safety, mood confirmation, media selection, invitation join/ignore/expiry, storage unknown state, account isolation, keyboard viewport, background state and lazy phone navigation. runtime-v180.browser.cjs also exercises the center in the complete production script stack.
