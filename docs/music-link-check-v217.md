# Music link verification — v217

## Behaviour

- A pasted/edited link is checked after a 500 ms debounce; blur and submit reuse the same in-flight check.
- Actual silent media loading verifies finite duration and first decoded data, not the filename extension alone. A check is capped at 15 seconds and releases its media source immediately afterwards.
- SoundCloud uses the existing official widget, with playback disabled and explicit destruction after inspection. A ready widget is not a guarantee against later geographic/account restrictions.
- The composer shows checking, success, warning and error states before publication. A failed check cannot request an upload ticket or publish through this UI. This is client validation, not a new server security boundary.
- Successful results can be shared with submit for 30 monotonic seconds. Older results are checked again. Retry always rechecks.
- Common signed/access-token URL parameters trigger a possible-expiry warning. This is a heuristic: unsigned links can disappear too. All external-link results explicitly say that availability is checked only now and recommend uploading the audio file for storage under the app's existing limits.
- Opening the actions for an existing direct-link track also checks that one link. Uploaded tracks and SoundCloud widgets are not needlessly re-probed there.

## Boundaries and safety

No library-wide crawl, startup requests, polling, proxy, automatic copying of external audio, database/schema change, or native installer. No track URLs, posts, files, likes or playlists are changed by validation. The existing player is not used for probes and keeps playing.

If media loading fails, an optional CORS HEAD request (2 second deadline, omitted credentials and referrer) may explain 404/410, 401/403, 429/server errors, or HTML responses. HEAD/CORS failure is not evidence that otherwise playable audio is broken, so valid media never depends on HEAD. Without readable HTTP details the UI reports an inconclusive playback failure rather than inventing an HTTP status.

Input changes, switching to a file, closing/replacing a sheet and account changes cancel checks. Epoch checks discard late results, including an A→B→A account sequence. No new health status is written to the public catalog, since a local network failure should not mark a track broken for everyone.

This cannot keep a third-party URL alive. A previously published 404 track still needs a working replacement URL or its original audio file.

## Validation

`tests/music-link-check-v217.browser.cjs` uses generated WAV audio and isolated browser fixtures. It covers decode versus metadata, valid non-CORS media, dead/HTML/denied links, signed URL warnings, shared probes, expired results, retry, no publication on failure, timeout, cancellation, account isolation, an unaffected playing track, and 320/390/1440 layouts plus light mode. Existing hub publication, playback recovery and account/cache suites are also run. No production accounts or media are modified.
