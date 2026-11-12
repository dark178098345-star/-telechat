# v206: remove competing connection code and unblock the outbox

Bounded changes to the existing HTML, message core and delivery owner. No new
runtime layer, database migration, credential change, native installer, or design
change. Existing history, media, saved accounts and offline database schema remain.

## Reproduced before changing the source

`tests/stability-v206.browser.cjs --baseline` ran the complete production script
stack with fixture accounts and services. Foreground events created replacement
message/poll channels even when both were healthy. A local outbox database whose
open event never settled prevented a healthy server send altogether.

## Cleanup

- Deleted the two superseded inline Realtime implementations, their old polling
  and retry functions, four obsolete globals, and the inline visibility listener.
- The existing message core is the sole owner of message/poll subscriptions,
  deadlines, incremental recovery and foreground handling. A tiny HTML delegate
  retains the entry point; the core also covers account restoration finishing
  before its parser-loaded script arrives.
- Back navigation clears channel references and handles asynchronous channel
  removal failures. The core invalidates old callbacks before navigation.
- Old message/outbox compatibility is retained deliberately. File age/version
  numbers alone are not evidence that a module is unused.

## Delivery stability

- Outbox database opens and transactions each have a 1.5-second hard deadline.
  Failures permit retry after a short cooldown; a late successful open is closed.
  Version changes close and release the old connection. Healthy storage has no
  artificial delay, and successful writes still wait for transaction completion.
- Failed/unpersisted messages, including explicit-recipient invitations, remain
  in the account-scoped memory queue. Draining merges disk and memory by client
  ID, preserves the nonce and skips already-confirmed items. The existing warning
  explains that closing the app is unsafe if storage is unavailable. Memory is
  not represented as durable storage.
- Legacy inserts and acknowledgement lookups now race a hard ten-second limit,
  even if the query ignores cancellation. An uncertain verification stops the
  immediate second insert. A later accepted legacy row is adopted on retry.
  A late unsupported-RPC result cannot start a fallback write for an account
  that has since been switched out.
- Optimistic rows are not painted in a different chat. Sidebar/typing cleanup
  failures no longer create unhandled promise rejections in the send path.

## Verification

New tests cover the production stack at 390/1440px, healthy foreground reuse,
blocked local storage, one acknowledged row, memory-only retry, database write/
delete/diagnostic stalls, late-open disposal, version changes, account isolation,
stable nonces and uncertain old-protocol delivery. Existing engine, history,
presence, startup, direct-recipient and full-runtime regressions are rerun.

The old v121 recovery fixture failed on the unchanged baseline because it advanced
no clock and fired all timers, including unrelated watchdogs. It now advances a
fake clock and flushes only the intended 120ms UI debounce; its original missed-
arrival, deletion, stale-generation and unique-channel assertions are unchanged.

These are isolated fixtures, not a promise that every physical device, live call
or production-network condition has been tested. No fixed speed multiplier is
claimed.
