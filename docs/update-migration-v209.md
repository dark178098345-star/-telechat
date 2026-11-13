# v209: do not dispatch the old installer handoff

The report concerns another user's Windows update, not chat attachments. The
user asked to proceed without more version questions; the exact remote failure
was not observed directly. This release covers the confirmed legacy handoff and
adds native preflight protection instead of assuming one unverified cause.

## Confirmed code path

The legacy helper (source before 854868b) is started as the installed Electron
executable with a script inside its app.asar. Its parent-exit loop also returns
after 30 seconds even if the parent is still alive. The current web UI still
called that legacy `installUpdate` API when updaterVersion 2 was absent. Shipping
the independent PowerShell helper inside a newer installer cannot retroactively
replace the helper in an already-installed old app.

`tests/update-legacy-v209.browser.cjs --baseline` reproduced that dispatch against
the unchanged v208 UI, using a fake bridge and without running any installer.

## Change and limits

- Only a bridge advertising updaterVersion >= 2 with both checkUpdate and
  installUpdate is allowed to start automatic installation.
- Legacy/missing bridges open the validated release URL after a deliberate click
  and display a one-time manual migration: download, fully quit (not tray hide),
  then run the installer. No attempt is made to kill another user's app, invoke
  its old helper, delete files manually, or bypass Windows prompts.
- The old bridge's delayed status messages cannot falsely report installation
  progress in the manual flow. Capable current bridges keep automatic updates.
- Windows 1.4.6 embeds a read-only preflight in the installer and uninstaller,
  including the elevated inner-installer path. It checks the selected target and
  registered old installation directories before the old uninstaller is invoked.
  Any remaining executable in those directories blocks the transition; no
  process is force-killed. It waits up to 12 seconds for ordinary exit/lock release.
- Every regular installation file (except the running uninstaller) is probed with
  Windows DELETE access and compatible read/write/delete sharing. This tests the
  access needed for rename without renaming/deleting the file or requiring an
  unnecessarily exclusive read handle. See [Microsoft CreateFile documentation](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew).
- Drive roots, reparse points and unexpectedly large directory trees are rejected.
  Paths cross NSIS/PowerShell as environment data, never interpolated source.
  The static embedded program is compressed/encoded at build time with a checked
  NSIS command-string budget and a source SHA256. No execution-policy/UAC change.
- Busy/check-failure exits occur before old-version removal. Manual installs offer
  Retry/Cancel with a specific message; silent installs fail closed. The new
  helper records a small reason code for the next startup's update UI. This is
  still not a claim of a transaction against all possible external filesystem
  races after the preflight completes.
- Application identity, installer GUID and profile path are unchanged. No chat
  attachment code, database, accounts, local music or settings are migrated.

This closes a confirmed unsafe legacy dispatch. It does not prove the other
user's installer error was caused by it, and is not a blanket claim that file
locks, antivirus, ACL, or all-users/per-user installation problems are resolved.
Tests cover old/missing and modern UI at 360/540/1440, the current public manifest,
no forced install/download, modern progress/retry, IPC ownership and browser
exclusion. `installer-preflight-v146.cjs` checks real Windows sharing locks and a
real running test executable in an owned Unicode/apostrophe temp path, both
directly and through a compiled NSIS harness using the exact production macro.
It verifies lock release, compatible sharing, no force-kill/data change, root and
junction rejection. The harness installs nothing and changes no registry keys.
The actual production installer/uninstaller are built and packaged source is
verified. Neither the user's active installation nor another person's computer
is replaced during these tests; the full remote upgrade is not claimed tested.
