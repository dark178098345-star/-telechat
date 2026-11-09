# Music refresh and scoped optimization

## Presentation

- New quiet home composition: static vector wave, compact library shortcuts, one discovery shelf instead of two overlapping feed shelves.
- Genre chips filter only the currently loaded selection and issue no recommendation/search requests. An explicit refresh updates feed and private library.
- Playback remains owned by the existing core; closing the hub never stops the actual music player.

## Work removed / bounded

- Warm reopens reuse feed for 60s, private library for 45s and device metadata for 60s. Explicit mutations force fresh private data. Device-import events invalidate the local snapshot even while closed.
- Feed/private-library network requests are deduplicated in flight. Catalog/profile reads have 10s deadlines; the read-only private-library RPC has a 12s deadline. Mutation workflows are not given new ambiguous timeouts.
- Feed entries with artist metadata no longer request authors at all. Missing names request only nick/name/avatar index; full photos and banner are loaded only for an explicitly opened music profile.
- Identical content/queue markup is not reinserted. Playback-position events no longer walk every track and cover when playback identity/state and rendered DOM are unchanged.
- Local/profile/feed requests are guarded against account/view changes; restored cached search results invalidate pending incompatible searches.
- Decorative profile video is paused on close. Header avatar is static and reused. No new audio engines, subscriptions, database schema, autoplay media or background recommendation jobs.

## Verification

- Existing music layout tests at 320–1920px, with wave pause, queue, shelves and light theme.
- New tests for zero extra warm-open requests, stable cover nodes on progress/reopen, no automatic author media, local genre filtering, forced refresh, delayed search races, timeout recovery and account close.
- Existing end-to-end library/import/playlist/publish, playback error/retry and full production-stack tests.
