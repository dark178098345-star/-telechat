# In-chat music dock — web v230

This is a web-only release; no installer, native Sites change, database migration or user-data reset is needed.

## Card

music-start-v216.js now mounts the interactive v230 dock on actual playback. It replaces both the old chat strip and the transient v216 notification. One DOM instance moves between the chat list and the open conversation on phones, stays available while paused, hides in the full music section or above an active phone keyboard, and can be collapsed without stopping music.

All controls call the existing music engine. Metadata comes from the same track, with elapsed and remaining time based on the real player. The card updates from playback events rather than a timer. A scrub commits on release/change, so dragging does not send repeated seeks. Artwork is restricted to supported raster data images, credential-free HTTP(S), or same-origin blob URLs; metadata is rendered as text. Reduced motion disables the waveform and title animation.

Local imports now retain the original filename as additive metadata. Old stored File objects can supply their existing name when read; no library schema reset or bulk rewrite is performed. The card does not extract embedded album art from MP3 files.

The user chose to defer notifications for music in native Sites, because those require a Windows-shell update. Those sites remain unchanged.

## Explicit restart

app-restart-v216.js adds Settings → **Перезапустить ExstraChat**, independent of the installer updater. The existing native restart bridge is used only after confirmation; browsers reload their page. No installer/update API is called. The warning explains that music and unfinished native-site downloads/forms will be interrupted.

Current chat drafts, pending attachments, recording, calls, active file/photo work and an unconfirmed/nonempty outgoing queue prevent restart. Queue checks are bounded and capture account/dialog ownership; closing the dialog or changing accounts invalidates delayed replies. No automatic restart or retry is performed. Unsaved forms elsewhere cannot be universally detected; the warning remains explicit.

## Verification

tests/music-start-v216.browser.cjs covers 320/390/1440 layouts, actual local audio, filenames, progress, keyboard-safe placement, collapse, queue/seek actions, metadata and account guards, and the retained explicit restart/draft/outbox/cancel/no-installer checks.

No real account, messages, music catalog or installed app is modified by those tests.
