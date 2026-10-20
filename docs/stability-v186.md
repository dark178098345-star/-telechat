# v186: chat stability and bounded UI work

This release changes existing modules, not a new overlay/override layer. No schema,
authentication, message format, uploaded files or database data is changed.

## Changes

- Cold history starts disk hydration and the server request in parallel. The first
  usable result paints; a fresh server result wins over a later disk snapshot.
- IndexedDB opens and reads have 1.5-second limits, failure recovery, late-open
  connection cleanup and version-change handling. Offline cached history remains.
- In-memory history and queued persistence belong to the account. Switching owner
  disposes pending cache timers; old asynchronous results cannot populate the new
  owner's state or write that owner's disk cache.
- Row resizing observes only added/removed direct children. Scroll notifications
  share a frame; button geometry is recomputed on layout changes, not every wheel
  notification. Native scrolling and reader intent remain unchanged.
- Tail grouping processes the new message and its neighbour; full reconciliation
  is retained for history loads, edits, deletions and reordering.
- History painting inspects newly appended siblings rather than rebuilding a set
  of all children for each message. Existing row identities remain intact.
- Pixel-eye reactions inspect at most the last 12 messages using sibling links.
  Artwork, reactions, speech, music dancing and settings are unchanged.

## Measurements

`tests/stability-v186.browser.cjs --baseline` was run on v185 before source edits;
the same fixture was rerun after the changes. These are synthetic work counters,
not a claim that real devices or servers are a fixed number of times faster.

| Scenario | v185 | v186 |
| --- | --- | --- |
| Blocked local DB, healthy fixture server | no request within 500 ms | 30 rows ready in 21–25 ms |
| 20 appends to 1,000 rows: old rows revisited by resize setup | 20,210 | 0 |
| 100 scroll notifications: button rectangle reads | 202 | 0 (geometry already cached) |
| Tail grouping on 20 appends: previous history visits | full traversal | 0 |

## Validation

New regressions cover blocked storage, usable offline cache, slow stale disk versus
fresh network, account ownership, incremental resize/grouping, and scroll batching.
Existing isolated browser suites cover the complete production HTML/script stack
at 390/1440px, send/retry/offline acknowledgement, history lifecycle, scrolling and
late media, keyboard layout, presence/music status, music upload/playback/rooms,
voice permission/send races, reactions, QR encode/decode, photo albums, reduced
motion, startup and per-chat themes. These tests use fixture accounts/backends;
they do not prove every browser, physical keyboard or production network state.
