# Sites utilities — Windows 1.4.8 / web v215

## User-visible changes

- Site copy buttons may write to the clipboard after an actual mouse/key/touch input in the selected, foreground page. Clipboard reads and unrelated permissions remain denied. The check also matches the requesting main frame or focused subframe; the gesture expires after five seconds and is cleared on blur/navigation.
- Downloads use Electron's native **Save As** routine. The application does not set a save path, silently overwrite files, open executables or run installers. The downloaded-file list offers cancellation and **Show in folder**, not execution.
- The **⋯** menu contains background playback, topmost, sound, shortcuts, docking, external browser, downloads (Ctrl+J) and history (Ctrl+H). Existing buttons and handlers are reused. Native page views are hidden while the menu/history/download panel is open, then restored without reloading.
- The native right-click menu provides back/forward/reload, safe HTTP(S) link actions, image saving and explicit native text editing actions. Clipboard reads are not exposed to website scripts to implement paste. Menu callbacks capture profile and navigation lifecycle ownership.
- History is local to each Sites profile: at most 500 entries for 90 days, newest first, with a confirmed clear action. It starts with the update, not retroactively. Fragments and common secret-bearing URL parameters are omitted/skipped; this is not a universal secret detector. Local profile passwords are UI locks, not encryption of the history file.

## Boundaries and data preservation

Default history lives at `sites-history-v1.json`; UUID profiles use `sites-profiles-v1/<uuid>/history.json`. Existing cookies, bookmarks, passwords, partitions and ExstraChat data are unchanged. History is loaded only after profile unlock. Closed history is not sent in ordinary chrome-state updates. Malformed files are not overwritten.

Downloads accept supported web/file sources only from the active profile's selected page, with same-origin initiation or a focused subframe's explicit gesture. Opaque initiators and unknown WebContents are rejected. Filenames are normalised for Windows; the actual location is chosen by the user. There is a single pending save dialog, a maximum of three active transfers and bounded in-memory records. Switching/locking a profile cancels its unfinished downloads. Closing a tab does not grant a different tab ownership of its records. Progress updates are event-driven and coalesced to 200 ms; no permanent polling loop is added.

Clipboard, history, context-menu and download commands do not expose Node, a new preload or filesystem APIs to remote pages. Chrome commands use the existing exact local-file/main-frame IPC gate; record actions also require the captured profile ID. User-provided paths are never accepted by the renderer API for revealing a file.

## Verification

- `tests/sites-utilities-v215.test.cjs`: gesture/frame/origin permission policy, read denial, unsafe sources/filenames, ownership, download limits, no autorun, cancellation, reveal lookup, bounded/atomic history persistence, corrupt-file preservation and stale context-menu callbacks.
- `tests/sites-utilities-native-v215.cjs`: real isolated hidden Electron 45, Chromium Clipboard API permission checks (no system clipboard touched), real HTTP attachment and Blob downloads into a temporary test directory, no installation, native-view masking and separate profile history/download state. The harness alone chooses temporary save paths to avoid displaying real OS dialogs; production continues to use native Save As.
- `tests/sites-utilities-v215.browser.cjs`: actual bundled chrome at 420/540/1220, menu actions, keyed progress rows, text-safe file names, ordering/clear confirmation, keyboard/focus restoration and locked-state cleanup.
- Existing profile, shortcut, native media, chrome and updater/preflight/package regressions remain part of release checks.

Native changes require updating Windows ExstraChat to 1.4.8. Downloading an installer is separate from installing it: installation must still be started by the user.
