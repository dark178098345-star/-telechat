# v180 — incremental interface work

No features, design, animations, message history or user files were removed. No database migration is needed.

## Changes

- A single role-badge observer replaces two competing whole-body observers. Timer/text updates unrelated to names no longer scan the chat. Added or edited sender names are processed in a frame-sized batch; nested roots are deduplicated by ancestor lookup, not pairwise subtree comparisons.
- Sidebar/profile refreshes explicitly scope badge work to their own container. Modern message rows carry sender identity, so badge lookup does not search users by display name. Legacy markup uses one name index per batch instead of `messages × cached users` matching.
- Unchanged badges keep the same DOM node. Role changes and verification removal still reconcile correctly; the eight-second moderation poll no longer removes all badges on every successful response.
- Moderation checks are single-flight, have a seven-second request deadline, and reject stale responses after account changes. The existing ban, mute and remote-session-revocation checks remain. Repeated login owns/replaces its fallback heartbeat timer; the shared presence service does not get an extra legacy heartbeat interval.
- Avatar-video tracking batches added subtrees and only checks detached videos after element removals. Music and calls are outside this controller and remain untouched.
- Media preparation scans added subtrees rather than all history after every new message. Element removals still clean up observers/object URLs; explicit gallery/account scans remain supported. Network policy, private-file cache limits and manual downloads are unchanged.
- Five changed script URLs and the service-worker cache are versioned together to avoid loading old/new implementations together.

## Reproducible browser benchmark

`tests/performance-v180.browser.cjs --baseline` reads the exact v179 sources from commit `4c320f8549af369909067af51b9841db0bdae79e`. Without the flag it tests current sources. The fixture has 1,000 messages, 500 cached users and 80 video avatars. It performs 60 timer-label updates, then appends 20 messages in separate animation frames.

| Work performed | v179 | v180 |
| --- | ---: | ---: |
| Whole-document badge queries during 60 timer updates | 120 | 0 |
| Badge candidates visited during those updates | 62,400 | 0 |
| Video connectivity checks during those updates | 4,800 | 0 |
| Whole-document badge queries while appending 20 messages | 44 | 0 |
| Badge candidates visited while appending | 23,114 | 20 |
| Full-history media scans while appending | 19 | 0 |
| Unchanged badge node retained across moderation polls | No | Yes |

One sequential headless Edge run measured browser task time at 573.5 → 226.3 ms for the timer scenario and 244.1 → 109.0 ms for appending. These are synthetic browser-fixture measurements, not a claim about every device, total startup, server latency or global application speed. Timing varies with machine load; structural counters are the regression assertions.

## Verification

- `tests/performance-v180.browser.cjs`: incremental work, badge identity/role changes, explicit sender identity, single-flight checks, relogin timers, detached/reinserted avatars, stale account response.
- `tests/moderation-v180.test.cjs`: bans, session revocation, mute enforcement during failures, recovery, hidden state, deadline cleanup, shared heartbeat ownership.
- `tests/runtime-v180.browser.cjs`: the entire production HTML/script stack with isolated fake services; login, history, optimistic send, profile, idle role work and composer at 390/1440 px. No real accounts or backend writes.
- Existing media-auto, phone-shell, viewport, engine, presence, send/scroll, mouse-wheel, MediaRecorder, call-card, startup and precache regressions.

The old activity/follow integration assertion assumed followers must immediately follow the nickname, even though the unchanged activity module intentionally inserts the level badge there. The assertion now permits that one badge while retaining duplicate-removal and observer-settling checks; no activity/follow runtime code changed.

Use the configured Node runtime and its `NODE_PATH` for Playwright. CSS and chat scroll geometry were not changed; offscreen message height estimates/virtualization were not introduced.
