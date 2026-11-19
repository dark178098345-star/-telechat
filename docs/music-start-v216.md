# Music start card — web v216

This is a web-only release. Windows stays at 1.4.8; no installer, native Sites change, database migration or user-data reset is needed.

## Card

music-start-v216.js listens to the existing telechat-music-progress-v117 event. A compact, dark, click-through card appears for 4.2 seconds on actual start/resume or a track change, not on loading, periodic progress updates or seek alone. Metadata comes from the existing player: title, optional cover and artist/filename, actual elapsed time and duration. Missing artwork uses a code-native disc icon; missing duration is visibly indeterminate rather than fabricated.

The card is lazy-mounted. It uses one dismissal timer and a short exit timer, with one animation frame for entry. There is no polling or new audio pipeline. Progress/metadata are only painted while visible; unchanged artwork is retained. Artwork is limited to supported raster data images, credential-free HTTP(S), or same-origin blob URLs; text is inserted with textContent. Background/account changes and errors clear the card, cover source and announcement. Late notifications for another account are ignored. A separate screen-reader status announces starts, not every progress tick. Reduced motion is supported.

Local imports now retain the original filename as additive metadata. Old stored File objects can supply their existing name when read; no library schema reset or bulk rewrite is performed. The card does not extract embedded album art from MP3 files.

The user chose to defer notifications for music in native Sites, because those require a Windows-shell update. Those sites remain unchanged.

## Explicit restart

app-restart-v216.js adds Settings → **Перезапустить ExstraChat**, independent of the installer updater. The existing native restart bridge is used only after confirmation; browsers reload their page. No installer/update API is called. The warning explains that music and unfinished native-site downloads/forms will be interrupted.

Current chat drafts, pending attachments, recording, calls, active file/photo work and an unconfirmed/nonempty outgoing queue prevent restart. Queue checks are bounded and capture account/dialog ownership; closing the dialog or changing accounts invalidates delayed replies. No automatic restart or retry is performed. Unsaved forms elsewhere cannot be universally detected; the warning remains explicit.

## Verification

tests/music-start-v216.browser.cjs covers 320/390/1440 layouts, real local audio import/play/pause, filenames, start/resume/progress/timeout behavior, keyed artwork/no extra requests, unsafe input, click-through, account/background cleanup, and explicit restart/draft/outbox/cancel/no-installer guards. Other release checks include music cache/recovery, the complete production script stack, startup, profile smoke and web update presentation.

No real account, messages, music catalog or installed app is modified by those tests.
