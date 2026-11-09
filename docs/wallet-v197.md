# Wallet and personal nickname badges

## Product rules

- Virtual Moons only: no purchases for real money, withdrawals or automatic billing.
- Initial 50 Moons for new wallets; old balances imported once without resetting existing wallets.
- Creator has unlimited spending and Premium; unlimited is evaluated on the server.
- Premium costs 2500 Moons / 30 days, or 40000 permanently. Another monthly purchase extends the active term. Permanent purchase does not refund earlier monthly purchases.
- An expired custom badge is hidden publicly, but the saved picture is retained.
- Gifts and historical transactions reuse the existing catalog and collections. Limited gifts retain availability dates and the 21-day sender restriction; creator bypasses the sender restriction.

## Integration

- Apply `supabase-wallet-v197.sql` before deploying the client.
- Uses the application's existing legacy credential model, not a Supabase Auth migration. This does not resolve the wider legacy authentication architecture.
- Wallet tables are private with RLS and no direct client table access. One RPC verifies the actor's credentials. The public badge view contains no balances or passwords.
- Retires the old nickname-only currency RPC grants. Does not delete or overwrite old gifts/history.
- Stable row locking and actor/request UUID deduplication protect concurrent and retried operations. Failed request identifiers are retained locally for seven days; only fingerprints and UUIDs are stored, not passwords, pictures or operation payloads.
- State is fetched on demand. Badge lookups are bounded batches of 40, with a 200-user cache and no history-wide observer or periodic balance polling.
- Explicit nickname hooks preserve existing media nodes. Badges are 64×64 transparent PNGs, at most 32 KiB as data URLs. The server also checks PNG signature and dimensions.
- Profile widths: classic 480px, panel 700px on desktop; phone sizing is unchanged.

## Checks

- SQL fixture on disposable localhost: old balances, authentication, overdraft rollback, atomic transfer, Premium pricing/expiry, retained expired badges, idempotent gift/purchase, creator unlimited, table grants.
- Browser fixture at 320/390/1440: wallet/editor, dark/light, custom transparent crop, stable badge DOM, confirmations, lost-response retry, account isolation and gift collections.
- Existing profile stability/loading/layout, full production runtime and startup cache tests.
- Production SQL verification returned true for balances preserved, wallet ready, private balances, old spending closed, and gifts preserved.
