# Music loading and session cleanup v212

Scope: remove stale music state and conflicting asynchronous continuations while
preserving the current player, libraries, public releases and listening rooms.
No production database/schema/authentication changes or media migration. Private
IndexedDB files and per-account local playlist maps are retained. No native
installer changes are required.

## Player and private library

- SoundCloud creation now owns its returned controller locally until its play
  token and owner are validated. A late ready callback destroys only that old
  controller, not the current player; late end/error/state callbacks cannot
  advance or modify a replacement queue.
- Local reads coalesce per account generation. A → B → A and a new session with
  the same nickname cannot reuse a pending old snapshot. A read begun before a
  confirmed local write cannot replace the newer in-memory list.
- Imports, file reads, link saves and deletion validate ownership before/after
  asynchronous work. Account transitions cancel metadata probes and pending
  local transactions. A committed old write stays in its original owner's
  storage but cannot paint into the new owner. Busy controls have operation
  ownership so an old finally block cannot unlock a newer import.
- Confirmed library changes notify the hub once, not by polling. Closing the
  music section still keeps playback running; a real account-ready transition
  resets private playback and library state.

## Hub data and writes

- Fixed the self-avatar memoization key. Warm reopening/progress updates retain
  existing cover DOM instead of rebuilding images. Existing feed/library/local
  TTLs (60/45/60 seconds) remain; no mass background avatar/banner prefetch.
- Public metadata refreshes in batches for saved, liked and playlist tracks.
  Confirmed missing rows leave the catalog, with per-track revisions preventing
  older reads from undoing newer rows or deletion. Author pages replace their
  result IDs instead of accumulating removed publications. User snapshots have
  a 60-second TTL, bounded 64-profile cache and coalesced reads.
- Confirmed shared profile changes update the cached music author/own avatar
  and invalidate their full-profile freshness. Unaffected track rows are not
  rebuilt for unrelated user events.
- Account generation, open/sheet/form versions and captured target IDs protect
  lookup, sharing, profile assignment, playlist actions, import, publication and
  deletion. Read queries have bounded waits and account cancellation even if a
  fixture/transport ignores AbortSignal. Same-nickname account-ready events also
  invalidate old work.
- Mutation requests are not put on the read timeout and are never automatically
  retried. They can be cancelled for an account change, but that is not proof a
  server operation rolled back. Publication cleans staging files only before
  the publish RPC is dispatched. Unknown outcomes retain audio and disable
  resubmission of that form, offering an explicit check of one's releases.
- Playlist buttons guard repeated clicks. A late local-file prefill cannot
  replace a newer manual file selection. Old cleanup cannot close or re-enable
  a new account's form or stop its player.

## Listening rooms and invitations

- Create/join reserve an owner/generation before asynchronous crypto; old crypto
  or channel subscription callbacks cannot create a room for a newer login.
- Room disposal is identity-scoped. A stale failed connection cannot remove a
  replacement room. Channel track/send/sign work is bounded; leaving does not
  wait forever for a stalled send/removeChannel. Guest cleanup touches only its
  room playback/original preferences, not unrelated new playback.
- Account transitions clear old room/member/invite UI. Member profile updates
  invalidate only that room's member display.
- Invite nickname lookups have an 8-second bound and input/panel/session guards.
  A result for an earlier input cannot send an invitation for that input after
  editing. Join/Ignore remain explicit; signed room state and the invitation
  protocol are unchanged. Chat delivery writes are not auto-retried here.

## Kept intentionally

Older version numbers in filenames are stable integration names, not evidence
that a script is unused. The v96 core still owns the single audio player,
private file store and SoundCloud widget host; its legacy import surface remains
functional. Removing it would break existing features. No libraries, playlists,
settings or user files were deleted as part of this cleanup.

## Validation

New isolated browser regressions:

- `music-core-cache-v212.browser.cjs`: late ready/end callbacks, account playback
  reset, A/B/A local read and post-commit write/UI races.
- `music-hub-cache-v212.browser.cjs`: stable avatar reopening, author deletion,
  fresh/removed saved metadata, A/B/A and same-nickname new-session isolation.
- `music-hub-writes-v212.browser.cjs`: delayed upload/publication/ticket/playlist/
  share/file-prefill/delete, preserved committed media, no read deadline on
  mutations and explicit verification after unknown publication outcome.
- `music-room-session-v212.browser.cjs`: delayed crypto, stale connection cleanup,
  same-session reentry, bounded leave and new-account playback preservation.
- `music-invites-cache-v212.browser.cjs`: newer input wins, old-session lookup/
  join suppression and a bounded non-cancellable lookup.

Existing isolated tests cover private upload/persistence/deletion, SoundCloud,
profile music, failed/hung playback and retry, mixed playlists/publication,
signed room synchronization/invitations, warm cache/request counts, intro,
sleep timer, 320–1920px layout, full app login/chat/profile/music integration and
startup at phone/desktop sizes. Tests use fixture users, local dummy files and
stub services, not production accounts, music or conversations.

This is stale-state/conflict reduction, not a claim of a fixed speed multiplier.
Network latency, third-party media failures, browser autoplay policy and real
device audio/background restrictions still apply.
