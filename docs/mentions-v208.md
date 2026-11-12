# Inline mention suggestions

Updates the existing v106 mention owner, not a second completion wrapper.

- `@` opens up to eight context-appropriate rows: static circular photo, display
  name and nickname on one line. Desktop width is capped; the phone list uses
  the composer area's width and is clamped to the visual viewport. Native list
  scrolling, resize observation and frame-batched positioning replace no wheel
  or touch scrolling behavior.
- Existing options and loaded image nodes are reconciled by nickname rather than
  being rebuilt on each keystroke. Photos use the existing profile format/shared
  loader; only visible missing profiles are hydrated (at most eight). Raster data
  images and this project's public storage are accepted; video, SVG and arbitrary
  third-party avatar URLs are not started. Missing/failed photos use initials.
- Private chats prioritize the current peer and current contacts. Groups keep
  their membership-scoped query/cache, with the existing 500-member lookup bound.
  Cached members and local names are searchable immediately; global server
  lookup remains a nickname-prefix lookup. No claim of global name search or
  unlimited group enumeration is made.
- Complete mention IDs and clickable rendered mentions support 1–64 characters,
  consistent with the app's nickname consumers. Emails and URL path mentions are
  not rewritten. Selection replaces only the current token and preserves suffix
  text, caret, draft and custom emoji entity positions using a replacement edit.
- Enter/Tab selects without sending; Shift+Enter retains a newline, Escape closes,
  and touch selection retains composer focus. Profile clicks keep the existing
  behavior. No new database writes, schema change, notification rules or mass
  account/device feature is introduced.
- Search jobs have an eight-second hard bound, including clients that ignore
  AbortSignal. Account generations isolate pending results and caches; late
  query, chat, photo and account responses cannot repaint another context.

`tests/mentions-v208.browser.cjs` covers rows/photos, node reuse, touch/keyboard,
Russian local names, long IDs, safe links, custom emoji entity preservation,
group scope, stale search/account results, timeout recovery and 320/390/1440px
dark/light/short layouts. `tests/mentions-runtime-v208.browser.cjs` tests actual
production script order and message sending at 390/1440px with isolated accounts
and services. Existing v106 completion tests remain applicable. No live message
or profile data is used during automated verification.
