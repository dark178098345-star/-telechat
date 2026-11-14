# Saved account places v210

This release limits local saved account cards, not registrations or manual
sign-in. There are 2 standard places or 4 if one of the saved accounts (including
a successfully signed-in candidate being added) has active Premium in the
existing server-owned public subscription view. No balance or role is trusted
from the encrypted card. Subscription checks are bounded and cached; expired,
missing or unverified entitlement cannot grant a new extra place. Saving the
first two accounts and refreshing existing credentials never waits on billing.

Old six-card vaults and accounts over a downgraded limit are retained. No card is
silently evicted. A new card is refused until a place is available; its manual
sign-in still succeeds. Removing an account is an explicit user action. A
subscription check failure does not remove credentials or prevent an existing
card's normal sign-in attempt.

The main encrypted vault and legacy latest-login mirror commit in one IndexedDB
transaction. Failed reads are never mistaken for an empty vault on mutation.
Failed writes do not publish a new cache. Writes are queued; Web Locks serialize
supporting same-origin tabs. Non-extractable AES-GCM keys and existing IDs remain.

Scope is one browser/application profile, not physical-device fingerprinting.
This local UX feature is not server-enforced device authentication. It does not
introduce a login-code gate, register trusted sessions or change database access
policies. The separate authentication migration has not been deployed.

Tests: `node tests/saved-accounts-v75.crypto.js`,
`node tests/remember-login-v70.smoke.js`, and with Playwright available,
`node tests/saved-accounts-v210.browser.cjs` plus the full runtime browser test.
