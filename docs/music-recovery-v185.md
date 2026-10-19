# Music recovery v185

## Diagnosis and limits

The report was "tracks are visible but do not play"; the affected device and exact track were not supplied. Read-only checks found the public catalog reachable, sampled uploaded MP3s and image2url MP3 links returning audio, and one real uploaded MP3 plus one external MP3 playing in headless Edge. That does not prove every URL, codec, region or user device works.

Two reproducible client failures were confirmed against v184:

1. `playTrack` and profile-link playback awaited a full IndexedDB library read even for public URLs. With blocked storage, no audio source was assigned and public playback failed before reaching the network.
2. An unresolved HTML audio `play()` promise left `loading=true` indefinitely with no error or recovery action.

`tests/music-recovery-v185.browser.cjs --baseline` reads the old core from commit `902a830`. It reports both failures; the current-source run asserts their recovery.

## Changes

- Public URL and SoundCloud selection synchronously initialize account/queue state and no longer depend on IndexedDB. Device-local files still use private storage and verify their metadata owner before reading the blob.
- HTML-audio startup is bounded to 20 seconds and is cancelled by pause, stop, or a newer track. Late completion of an old promise cannot change the new selection. Explicit cancellation is not shown as a playback error.
- Retry performs a fresh source load instead of calling `play()` again on a failed media resource. A separate, responsive banner under the music header shows the error and Retry button; unrelated library notices cannot erase it. Existing mini-player and profile-link controls also recover from a failed source.
- Local database open/read attempts have deadlines and transaction-abort/error handling. Rejected opens do not poison the connection cache forever. No stored tracks, preferences or files are deleted.
- Playback progress includes loading/error state, and the hub's busy attribute is updated only when changed. No new background polling, proxying, downloading, stream extraction, or autoplay of unrelated media was added.
- The two edited script URLs, music stylesheet and service-worker cache are versioned together.

## Verification

- New real-browser regression: disabled IDB, hung media startup, 404 then successful retry, pause cancellation, track replacement, hub error/retry, and continued music after closing the hub.
- Existing local-library, public music hub, official SoundCloud widget fixture, room sync, sleep timer, responsive music layout and full application-stack tests.
- Live diagnostic media probes use public catalog data only, with no real login, publication, backend mutation or temporary upload.

This change cannot repair a third-party link that expired, an unsupported device codec, regional SoundCloud restrictions, or an OS audio output problem. Those now remain distinguishable from a client that silently waits forever.
