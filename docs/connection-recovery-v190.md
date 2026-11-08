# v190: bounded connection recovery

Changes stay inside the existing transport and message-core modules. No server schema, credentials, user data or message format is changed. This improves recovery bounds, not physical network latency or server capacity.

- RPC requests race a hard deadline in addition to signalling cancellation. A client/query that ignores AbortSignal can no longer hold its send flight indefinitely.
- The same bounded operation covers terminal fetch headers and JSON body, and the health HEAD probe. Late settlement is observed but cannot update delivery or diagnostics after timeout.
- Retries retain client_id_v172. A timeout does not mean the server rejected the original write; the existing idempotent send protocol and delivery queue remain authoritative.
- Missing optional RPC support keeps the existing five-minute fallback cache and no longer counts as a disconnected server.
- Message and poll subscriptions have a single pending handshake owner and a 12-second handshake watchdog. Failure uses existing capped exponential backoff/jitter. Repeated online/foreground events share the pending handshake.
- Offline transitions cancel connection timers. Reconnect is gated while navigator reports offline; a later online event restarts recovery. Stale channel generations remain ignored.
- A history safety probe has a hard eight-second race even without abortSignal support, allowing later probes after a hung query. Healthy/hidden/offline polling frequency remains unchanged.
- Connection-state notifications are dispatched after channel state has been applied; asynchronous stale-channel removal failures are handled.

connection-v190.test.cjs uses isolated fake clocks/queries to cover ignored cancellation, terminal-body hangs, released send/probe flights, nonce preservation, late results, missing-RPC diagnostics, silent subscription replacement, duplicate wake events, stale generations, offline gating and timer cleanup. Existing engine/browser/presence/runtime tests cover surrounding delivery and presence behavior. The smoke test now compares the actual versioned index/worker asset rather than a stale literal v112.
