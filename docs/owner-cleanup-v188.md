# v188: remove competing legacy owners

This is a bounded cleanup of existing modules, not a rewrite or a new override layer. No database schema, credentials, message formats, UI layout or user files change.

## Ownership

- Presence publication, throttling and wake: presence-v120.js.
- Sidebar network single-flight, cached paints and local patches: app-performance-v17.js.
- Batched, scoped badge decoration: moderation-v19.js.
- Decorative avatar playback and visibility: viewport-performance-v124.js.
- Call and music lifecycle: their existing player/call modules.
- performance-v107.js now retains only its calm-mode preference and public preference API.

Removed obsolete generic function wrappers, an unused sidebar queue flag/branch, the old badge-wrapper marker, duplicate legacy presence wake calls and generic pause/resume of every video on visibility changes.

## Reproduced sidebar race

A cached full paint captures the old message preview then awaits user/avatar data. A local message arrives meanwhile. The generic outer single-flight wrapper discarded the local paint; even without that wrapper, the earlier full paint could restore its old preview. Local message application now advances the sidebar paint generation, invalidating older awaited paints. Network single-flight remains in the sidebar owner.

tests/stability-v105.browser.cjs --baseline-v187 reproduces the lost update on commit 5c5193346b8e54f5279c2eb3174320146b2a764c. The current implementation passes both immediate update and no-rollback checks, preserving the avatar node.

## Validation

Updated performance-v107 browser test asserts that legacy calm preferences no longer replace authoritative functions, both badge scopes and local patches reach their owners, and cosmetic visibility changes do not operate on any media or issue duplicate presence requests.

The presence smoke test had pre-existing stale version assertions (including Android 1.2.5 while the source is 1.2.6). It now verifies that the actual versioned index assets match the service-worker shell, plus the existing lifecycle bridge checks.

Regression coverage includes actual production-stack login/chat/send/profile/music, phone layout/keyboard/navigation, multi-client presence/privacy/music lifecycle, scoped badge/media performance, music recovery, My Center, stable history/sidebar and real local WebRTC call messaging. These are isolated automated fixtures, not a claim of physical-device or production-account call testing.
