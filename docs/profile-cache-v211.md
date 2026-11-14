# Profile loading cleanup v211

The request was to find obsolete card code and stale data that interferes with
loading. No database, authentication, user media, credentials, balances or saved
account deletion is included. Classic/panel layouts and profile features remain.

## Reproduced defects

Before changes, the new isolated browser regression reported all five original
checks false: biography/banner invalidation, an A → B → A login race, a local
edit racing a slow full-profile snapshot, account-scoped following state and a
late follow mutation touching the next profile's count. Tests use dummy users
and controllable queries, never production credentials or conversations.

- The shared user cache now emits invalidation for bio/banner/role/verification
  changes too, not only avatar/name fields. A confirmed own-profile/music save
  can notify explicitly even if the caller already changed its in-memory object.
- Full loads capture an account generation and pre-request field snapshot.
  Responses from a previous login cannot enter the cache on return to the same
  nickname. Fields updated since the request began are kept, while unrelated
  full fields still fill in. The fresh shared cache wins over an older full view.
- Reopening one's own card no longer renews its 90-second cache indefinitely.
  Fresh own public profile fields update the own UI model, never credentials,
  role or session flags from an avatar/profile projection.
- Account transitions clear old in-memory peer snapshots and cancel old full
  and light requests. Shared avatar queue slots are freed even if an underlying
  transport ignores cancellation. Owner-scoped IndexedDB photos are retained;
  no whole-cache wipe is performed on startup.
- Following state is keyed by viewer and target; caches are bounded. Read,
  mutation and list continuations validate account generation/target/request.
  Delayed mutations invalidate their original cache without changing the new
  profile. Follower requests have an 8-second hard deadline, not cancellation
  alone; failed reads show unavailable data rather than fabricated zero counts.
- Existing saved account cards refresh public name/avatar metadata after an
  explicit confirmed own-profile save, with a short coalescing timer and the
  existing atomic encrypted-vault writer. They are not rewritten on ordinary
  avatar reads; passwords, order, place counts and old-card retention are intact.

## Removed obsolete code

Retired the inline legacy profile SELECT/render body, the two overwritten banner
and video opening wrappers, two overwritten save implementations, the unused
hidden refresh element and its orbit/logo/refresh styles. The early-parse open
fallback only reports that the controller is not ready; it does not start a
second legacy query. The one current save implementation still handles name,
status, bio, photos, banners and video, and retains existing account guards.

## Validation

`profile-cache-v211.browser.cjs` covers the original failures plus own-card TTL,
preservation of unrelated full fields, prompt cancellation/queue reuse, and a
non-cancellable follower timeout. `profile-save-v211.browser.cjs` exercises the
entire app save pipeline: one write, one confirmed invalidation and fresh data
in both the viewer and encrypted saved-account card. Existing cache/avatars,
loading/media stability, saved-account limits/encryption, classic/panel layouts,
profile music and full app/startup regressions cover integration.

This removes stale-state conflicts and avoidable old work, not all network
latency. Warm/owner-scoped cached data is intentionally retained for fast and
offline display; this is not a promise that all cached data is always current.
