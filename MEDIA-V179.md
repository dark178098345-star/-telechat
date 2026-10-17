# Device-local media auto-download v179

Settings → Data and auto-download. Separate photo/video/file rules and 1–20 MB limits for Wi-Fi/wired and cellular/unknown networks. Defaults: photos only on Wi-Fi, all manual on cellular/unknown. Network Information `effectiveType` is never interpreted as Wi-Fi; unsupported network detection uses conservative cellular rules with an explicit manual override. Save-Data disables automatic preparation unless the user turns respect for it off.

Only intersecting chat/gallery attachments are automatically prepared, one at a time. Manual clicks bypass the auto-download policy but not private file authorization. No autoplay, automatic OS downloads, avatar/music/call changes, timers/polling, new tables, or permission changes.

New photos use the existing private `chat-files` bucket/RPC and shared 250 MB account quota. Messages carry a small existing file descriptor with `view: image`, not base64 or a storage capability. Older clients see an ordinary downloadable file. Legacy inline photos remain supported: their bytes have already arrived with message history, so a display toggle cannot save that historical transfer. They are not automatically migrated or deleted.

The SDK read uses an abortable, no-store fetch with a response-size guard. Photo/file preparation and explicit saving share one flight and an account-scoped 32 MB/24-item memory cache; cache entries contain no storage ticket. Reads validate server size/type before transferring, exact byte size after transfer, and have a 30-second deadline. Account switches cancel all reads and clear the cache; setting/network/visibility changes abort automatic reads only. Video files are cached, never played automatically. Clearing memory does not delete messages or cloud objects.

Tests: `media-policy-v179.test.cjs`, `media-auto-v179.browser.cjs`, attachment upload/download/layout, phone shell, voice-media, engine delivery and existing settings/music utility suites. Browser tests verify network gating before any storage read, offscreen exclusion, manual override, cache reuse, stable image geometry, network abort, account preferences, private photo upload and profile gallery compatibility at phone/desktop sizes.

Only item 5 was implemented. The user cancelled reminders (item 3).
