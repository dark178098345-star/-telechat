# Emotions v182

111 original code-native SVG expressions and gestures. The two `photo_3` references
show the same panel and are counted once. The `photo_2` reference shows the other
panel. No third-party sticker images, fonts, runtime downloads or AI bitmap assets
are included. SVG definitions use unique per-instance IDs. The picker renders 24
items at a time, with search, categories and account-scoped recent choices.

## Reference coverage

`photo_2_2026-10-17_20-10-53.jpg`, rows left to right:

1. smile, heart-eyes, laugh, shy, cry, surprise
2. frustrated, point-laugh, cool, joy-tears, please, shush
3. question, nervous, tongue, sad, tearful, smirk
4. blush, eye-roll, sleep, fever, pale, unamused
5. nerd-notes, nerd, couple-hug, big-laugh, afraid, rage-fire
6. adoring, star-eyes, blank, grin, approve, kiss
7. purple-cool, mind-blown, hold-heart, drained, sigh, panic
8. curse, pie, bandage, pout, dizzy, gum
9. puppy-plea, six-seven, fire-cat, rofl (last cells covered by application controls)

`photo_3_2026-10-17_20-09-54.jpg` / duplicate `photo_3_2026-10-17_20-10-53.jpg`:

1. boxing, zip, think, bubble-tea, slay, clown
2. peek, manhole, hot, rainbow, scream, sweat-sad
3. bite-nails, relaxed, devil, money, hearts, cool-grin
4. wine, spa, noodles, party, heart-hands-face, bubble-cry
5. ufo, dining, selfie, ninja, cheer, smoke
6. makeup, flowers, bag, gossip, cheek-smile, worried
7. steam, frog, cool-thumb, sweat-laugh, hug, skull
8. wolf, dog, call, fingers-crossed, fist, heart-hands
9. peace, rock, up, ok (last cells covered by application controls)
10. partially visible: prayer, raise, manicure, thumb, muscle, clap

The standalone red heart supports existing Unicode messages/reactions. Variants
remain separate even if their emotional meaning is similar.

## Compatibility

Ordinary emoji stay Unicode in storage. Bespoke expressions use `[ex182:id]`;
unknown IDs are kept as text, never treated as HTML. Message previews and copying
use the closest portable Unicode fallback. The old renderer/reaction API names
remain compatibility boundaries, but the old artwork and picker are removed.
The textarea displays Unicode with range entities rather than internal IDs;
the actual durable sender serializes those entities. Cursor edits, identical
fallback variants and photo-caption snapshots retain the selected expression.
Caption rendering stays inline, without large standalone-emoji sizing.
Existing messages/reactions are not deleted. Finite send/arrival animations retain
the v128 engine, visibility cancellation and reduced-motion support.

Streak UI, timers, client hooks and service-worker assets are removed. Historical
server migrations/data are not destructively modified.

## Photo send

Camera/gallery images are decoded with the browser's EXIF handling, resized to at
most 1600 px, encoded as JPEG Blobs and sent through existing private attachment
storage. Raw input limit: 32 MB / 60 MP; transmitted attachment limit: 20 MB.
HEIC works only if the browser can decode it; unsupported formats produce a clear
error and can still be sent as ordinary files.

Selection is scoped to account/chat/revision. Decode/compression deadline: 20 s;
reserve/upload deadline: 90 s; best-effort cleanup deadline: 8 s. Cancellation or
failure does not fall back to inline photos. Unsent selected files remain in memory
for retry, not durable across app closure. Once storage accepts a file, the existing
durable message sender owns delivery. Typing during upload is kept as a new draft.

Verification: `tests/emotions-v182.browser.cjs`,
`tests/emoji-composer-v182.browser.cjs`, `tests/photo-send-v182.browser.cjs`,
plus real full-stack custom emoji and photo delivery in
`tests/runtime-v180.browser.cjs` and existing reaction/arrival/media/phone tests.
