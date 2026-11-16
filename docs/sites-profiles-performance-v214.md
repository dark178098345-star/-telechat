# Sites profiles and idle-work cleanup — v214 / Windows 1.4.7

## Scope

The Sites window now has separate local profiles. These are not ExstraChat accounts and are not synced between computers. Each profile has its own persistent website session, shortcuts, favicon cache, avatar, accent, optional home page and lock-on-return setting.

The existing partition `persist:exstra-sites-v202`, `sites-shortcuts.json` and `sites-favicons-v1.json` remain the **Основной** profile. App identity and the existing Windows user-data path are unchanged. No chats, saved accounts, music, website cookies or old files are deleted by this migration.

## Storage and privacy

- A versioned, size-limited manifest uses atomic writes. Invalid or newer manifests are not overwritten. If creating the initial manifest fails, the legacy profile remains usable read-only.
- New UUID profile IDs determine storage paths and Electron partitions; renderer input cannot choose filesystem paths.
- Passwords are salted scrypt hashes in the main process. KDF work is serialized and bounded, failed attempts are throttled, and credentials never enter renderer state.
- This password is a local UI lock, **not disk encryption** or protection against another process running as the same Windows user. There is no password recovery in this version.
- Protected profiles do not load page sessions or stores before unlock. Chooser state excludes private home pages and tab URLs. Remote pages retain sandboxing, no Node/preload, denied device permissions, and HTTP(S)-only navigation.
- Switching profiles closes old page renderers, including background audio. Temporary tab snapshots stay in RAM only; inactive tabs load lazily after unlock, and a full close clears snapshots. Returning to chats otherwise preserves the existing background-media behavior unless lock-on-return is enabled.
- Shortcut commands require the captured profile owner. Lock/switch clears the editor and its draft; delayed open/save/close results cannot reopen old content, modify another profile or dismiss a new editor.

## Optimization

- Removed the native notification module's permanent 900 ms UI/account polling. Account and page events plus narrow screen-class observers now drive synchronization.
- Membership refreshes share one request flight with a single follow-up after an event burst. Reads have an 8 s bound, cancellation and session-generation checks; the 60 s recovery refresh remains.
- Delayed sender lookups cannot notify a later account session.
- The mobile media observer skips SVG-only changes and batches nested roots once using ancestor membership checks, instead of pairwise `contains()` comparisons and a pre-scan plus full scan.
- Active Sites updates omit the inactive profile-card/avatar list. Profile sessions are configured once, and redundant layout calls and unreachable legacy command branches were removed.

Synthetic baseline-to-current counters (not a promised wall-clock speed multiplier):

| Scenario | Before | After |
| --- | ---: | ---: |
| Native push-button writes in the idle clock fixture | 2 | 0 |
| Eight membership-change events | 8 concurrent reads | 1 read + 1 follow-up |
| Notification from an obsolete A→B→A session | 1 | 0 |
| Media searches under SVG-only churn | 201 | 0 |
| Media searches for 20 nested additions | 40 | 20 |
| Pairwise media-root `contains()` calls | 1180 | 0 |

## Verification

Tests cover manifest migration/corruption/failed writes, password limits and changes, partition isolation, legacy cookies and shortcuts, locked startup, stale async work, renderer teardown, destroyed-chrome recovery, local UI layouts at 420/540/1440, and existing browser shortcuts/layout behavior.

Real hidden Electron tests use isolated temporary user-data directories, never the installed app's profile. They verify distinct cookies/localStorage, no page bridge, background audio continuity, docking and topmost controls. The OS-specific hidden topmost flag assertion is explicitly skipped if a capability probe says the host cannot expose it; app state and media continuity are still checked.

The production web stack is tested with fake services at 390/1440, including login, history, optimistic send, profiles, actual fixture audio, startup under delayed scripts, and idle DOM work. Installer preflight, updater ownership/hash/redirect rules and final packaged source checks are retained. No production account, database, chat or reaction is mutated by these tests.

Windows profiles require the 1.4.7 application update. Web optimization is delivered in the v214 service-worker shell.
