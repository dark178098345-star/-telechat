# Sites workspace / Windows 1.4.0

User-approved final behavior: a Music-like section first, with its own start page and tabs. A deliberate button moves it into a standalone window; the same WebContentsView instances move back into the app without reloading forms/history. Returning to chats keeps tabs hidden; closing the standalone window destroys all page renderers. The section never launches or loads websites on app startup.

## Boundaries

- Local trusted browser chrome is a sandboxed WebContentsView with a tiny dedicated preload and CSP denying network/frames/objects. Browser commands accept only that exact WebContents and its main frame, at the exact bundled file URL.
- External pages have no preload or Node integration, context isolation and sandbox enabled, ordinary web security enforced, and no webview attachment. A separate persistent session keeps website logins/cookies separate from all chat state. Chat-native IPC also requires the actual main app WebContents/main frame, not merely a matching URL.
- Only HTTP(S) top-level URLs; credentials-in-URL, file/data/javascript/custom schemes and control characters rejected. Unsafe redirects/frame navigations are blocked; no certificate exceptions or insecure-content overrides are introduced.
- New-window requests are denied by default and exposed as one pending user-confirmation button. Max eight tabs prevents popup growth. Downloads and all device/permission requests are denied in this first version. A deliberate external-browser action is available for incompatible sites.
- No browsing-history service or server sync. Tab addresses remain in native memory; website cookies/storage persist locally in their own partition. Sites naturally receive normal navigation traffic/IP as in any browser.
- Inactive/hidden content views are not painted and use Chromium background throttling; no promise of zero background work or OS-level suspension. No mass page preload, polling loop or automatic form-discard timer.

## Distribution

Electron updated to stable 45.3.0 and builder 26.18.0, locked by pnpm. Desktop version 1.4.0 keeps package identity, appId, and legacy userData path. Old per-launch cache erasure is removed; versioned web assets and network-first entry continue handling updates. Ctrl+R uses normal reload; Shift+reload remains explicit hard reload.

Unsigned NSIS Setup and portable EXE are built locally. Do not run the installer over the user's active installation during QA. Test with a disposable dev profile; inspect the packaged ASAR and compute SHA-256 before handing it over.
