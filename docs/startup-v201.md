# Startup sequencing, not a longer intro

Reproduced with the real production script/style stack and a delayed phone-shell script: after 4.2s, document.readyState was still loading and the phone class was absent, but the old 3.5s timer had already hidden the splash. That exposed an unfinished scene, late CSS/font/theme changes and subsequent structural moves.

- The existing inline startup controller now waits for DOMContentLoaded, then two frames to settle queued layout work. It never uses a wall-clock escape during parsing. There is no minimum intro duration; the 650ms RAF safety budget is only after DOM readiness, for background/throttled windows.
- Local encrypted account cards may settle within a maximum 200ms budget after parsing. A blocked local database cannot hold startup indefinitely; avatars, story responses and chat network requests are not part of this wait.
- Splash fade is 160ms; removal follows its actual opacity transition rather than removing the element at 220ms during a 550ms fade. Reduced-motion/off settings are respected. Fake random progress intervals were removed.
- The SDK download is preloaded in the head but evaluated after the startup DOM. A slow SDK no longer blocks creation of the splash itself. Script dependency order remains unchanged.
- The legacy second blurred full-screen chat loader and its shimmer/timers are retired. Cold first-list loading uses a static list-scoped placeholder and aria-busy, which disappears when actual children arrive. Warm rows are not replaced or covered.
- Own story and phone structure are prepared synchronously on the existing account-ready event before showing chats; the story fetch no longer creates the initial extra row after the list is visible.
- The active moderation login implementation replaced the base login but omitted its account-ready dispatch. Restored the same event after successful credential/ban checks and online update, before screen activation. This lets theme/layout/account-scoped modules synchronize together rather than discovering the account on later observer passes. Authentication and ban rules are unchanged.
- Versioned URLs were bumped for every modified external asset, including release notes, to invalidate old service-worker copies correctly. User data, message storage and database schema are unchanged.

Tests hold an actual parser dependency for over 4s, hold the SDK, stall the optional local readiness promise, check stable auth geometry, and hold first sidebar/story responses across login at 390/1440. Broader runtime, phone, saved-account crypto and offline-cache regressions cover surrounding behavior.

The existing Windows 1.3.4 wrapper still clears its HTTP/service-worker caches at process startup. These web fixes apply there too, but changing that native launch policy would require rebuilding and distributing the Windows executable; this release does not claim to update that binary.
