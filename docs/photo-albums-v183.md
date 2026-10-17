# Photo albums v183

An album is one durable message with 2–10 private photo descriptors, in the
selected order, and one shared caption. It uses the existing `chat-files`
storage/RPC, access checks, quota and idempotent message sender. No database
migration, public bucket, new service or external dependency is required.

## Composer

- Photo chooser accepts multiple files on phones and desktop.
- Preparation is sequential to avoid decoding ten camera photos at once.
- Each source: up to 32 MiB / 60 MP; browser-supported JPG, PNG, WebP, GIF,
  AVIF, HEIC/HEIF. The browser must support decoding the selected format.
- EXIF-aware browser decode; JPEG output at up to 1600 px, quality .84.
- 20 seconds per preparation; total compressed album limit 40 MiB, each file
  remains under the existing 20 MiB storage cap.
- Preview strip has touch/keyboard-accessible move-left/right, remove and
  add-more controls. One remaining photo switches to the existing single path.
- Invalid/over-limit/failed selections do not replace a valid earlier draft.
- Object URLs are selection-owned and revoked on replacement, cancel and send.
- Keyboard reduces the reading viewport; album controls are not clipped by the
  legacy 50 px pending-preview rule.

## Upload and retry

Photos upload sequentially, with progress by photo. Only after all uploads
succeed is one small album message handed to the durable sender. An album has
a 180 second upload deadline (single file/photo keeps 90 seconds), duplicate
send guard, explicit cancellation, account/chat isolation and best-effort
cleanup of allocations after partial failure. An unsuccessful attempt keeps
the compressed photo selection and caption for retry; no partial album is sent.
Typing a new draft during upload does not alter the captured album caption.

Selected files are still **memory-only until upload/handoff**: closing or
reloading the app loses an unsent selection. Persistent attachment drafts were
not part of this change. Cleanup cannot guarantee removal after a lost reserve
response or an extended network outage; existing server quota still applies.

## Receive and view

`kind: album`, `data: JSON.stringify({v:1,items:[descriptor,...]})`. The strict
parser bounds counts, size, MIME, unique UUIDs and names; only sanitized
`id,name,size,mime,view` fields survive. No capability tokens/URLs are stored in
the message. History, contacts and copied previews show an album summary.

The reserved-size grid reuses visible-only auto-download and per-network rules.
The previous generic phone image optimizer no longer marks managed hidden
photos `loading=lazy`: that could deadlock their decode and the download queue.
Explicit viewer navigation is manual download; photos can be saved individually.
Arrow keys, buttons and horizontal swipe navigate without altering message order.
Profile shared-media history expands the album into individual photos. Existing
cross-chat private-file forwarding restriction also covers albums.

## Verification

- `tests/photo-album-v183.browser.cjs`: real browser decode, multiple picker,
  reorder/add/remove, limits, atomic selection, partial upload cleanup/retry,
  deadline, double-send, caption isolation, object URL cleanup, strict parsing,
  cold-cache policy/manual download/save, chat change, 320/390/1440 preview.
- `tests/runtime-v180.browser.cjs`: full production scripts in an isolated
  account fixture, single-photo and album sends, one album row/three uploads,
  viewer and shared gallery, real phone CSS/keyboard bounds, desktop regression.
- Existing photo-send, attachment, auto-media, phone/keyboard, delivery-engine,
  emoji, performance and release-notes regression tests.

No real user messages or production account credentials are used by these tests.
