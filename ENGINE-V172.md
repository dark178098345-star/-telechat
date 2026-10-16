# Engine v172

Additive deployment: apply `supabase-engine-v172.sql`, then publish the web files.
No auth migration, RLS policy changes, deletion of chats or media, or new paid service.
Existing moderation INSERT triggers remain authoritative.

## Delivery

- Stable client nonce and partial unique index prevent duplicate inserts, including concurrent retries.
- Concurrent delivery/retry/drain calls share one flight. Realtime may confirm a lost HTTP acknowledgement.
- IndexedDB keeps the existing account-scoped outbox. Retries use bounded exponential backoff and jitter; no offline retry loop.
- Old-protocol pending items first look up their original timestamp before using the nonce endpoint.
- Timeout and storage failures are explicit. A single sent check is not a read receipt.

## Presence and connection

- One snapshot RPC replaces three parallel REST reads per batch of at most 80 users.
- One transactional heartbeat covers presence, music state and throttled last-seen updates.
- Conditional timestamp writes reject reordered stale state. Multiple devices retain independent leases.
- Expired Realtime payloads cannot keep a user online forever; last-seen alone is not live proof.
- Lifecycle bursts coalesce, hidden/offline safety probes stop, healthy Realtime safety probes run no more often than every 30 seconds (7-second scheduling tick).
- Diagnostics expose numeric counters only: `telechatTransportV172.diagnostics()`.

## Verification

`tests/engine-v172.test.cjs`: shared requests, timeout cleanup, missing-RPC compatibility, account checks; 20 scheduled healthy ticks cause 4 queries instead of 20 over a 140-second fixture.

`tests/engine-v172.browser.cjs`: real browser/IndexedDB, lost response, Realtime ack, simultaneous retries, offline recovery, account isolation, old queue adoption, read receipts, actual modern presence path.

`tests/engine-v172.sql` and `tests/engine-v172.concurrent.cjs`: **disposable localhost only**, fixed port 54568/database engine_v172. The SQL fixture checks its target before creating dummy data. Tests cover authorization, channel/group access, atomic batch rollback, nonce collision, merged snapshots and monotonic presence/music. Eight concurrent sends produce one row/ID.

Regression suites: presence browser/model, Realtime, phone sends, smooth send, chat scroll, attachments and voice recording.

Request-count reductions are not an end-to-end latency benchmark. Legacy password-based authentication is unchanged and remains a separate security limitation. A suspended/killed phone cannot continuously publish presence; leases expire instead of displaying permanent online state.
