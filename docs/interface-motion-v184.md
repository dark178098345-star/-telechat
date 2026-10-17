# Interface motion and incremental work v184

## Visible behavior

- One delegated press owner for pointer and keyboard. A scroll/drag gesture,
  pointer cancellation, blur or background transition releases the pressed state.
- Menus, dialogs, panels and phone account/menu sections have short entrances.
  Settings sections settle with a header/one-content transition, not row-by-row
  staggering. Panels/profile cards use opacity-only transitions to preserve
  positioning and scroll geometry.
- Photos reveal after decode. Album reordering animates existing visible tiles
  from their previous positions. Upload progress does not recreate thumbnails.
- No added history/list animation, scroll interception or delayed close/back.
- New setting under Appearance: Auto / Smooth / No effects. It is account-scoped
  on this device. OS reduced-motion always takes priority. Emoji/pet/music
  animation settings are separate; functional progress indicators remain.

## Budget and ownership

The new coordinator uses finite 110–210 ms opacity/transform effects, no retained
fill mode, no continuous requestAnimationFrame/setInterval or performance polling.
There are at most four simultaneous effects (three for coarse pointers); Auto on
<=2 GiB / <=2 logical cores or Save-Data uses opacity only, 110 ms, one effect.
These device hints are conservative heuristics, not a guarantee of hardware speed.
Animations stop in browser/native background, pagehide, reduced-motion changes,
account switches, and when a tracked surface closes/is removed. There are no
permanent will-change declarations or transform promotions added by this feature.

Only known surface attributes and direct body portals are observed. Message
subtrees are not observed by the motion coordinator. No server work is added.

## Removed work

- Removed both old press delegates in fluid UI / emoji picker, replacing them
  with one handler. Removed the per-button motion tagging observer entirely.
- Removed unconditional translateZ promotion from every contact, message and
  button; removed filter/shadow/backdrop-filter interpolation in the fluid layer.
- Album preview DOM is keyed by object URL. Reorder moves nodes; progress changes
  only the label/lock state. Decoded images and their controls retain identity.
- Media cleanup walks detached subtrees only; normal status/progress icon
  replacements do not sweep every historical photo. Explicit account/history
  scans remain available when genuinely needed.

## Verification

`tests/interface-motion-v184.browser.cjs` compares against committed v183:

| Isolated operation | v183 | v184 |
| --- | ---: | ---: |
| Motion class tags for 600 inserted message buttons | 600 | 0 |
| Media target connection checks for 20 progress replacements with 1000 media targets | 20000 | 0 |

These are deterministic counts in fixtures, not claimed FPS/startup multipliers.
The browser test also checks finite compositor-only frames, budget, idle state,
reduced/off/low-memory modes, native background, account isolation and portal
cleanup at phone/desktop sizes. Album tests assert retained image identity through
progress/reorder. Full production-stack fixtures exercise the actual settings
control, photo/album sends, keyboard/header geometry, viewing and idle behavior.
Existing media/network policy, send/emoji, phone, keyboard and engine regressions
are retained. Actual low-end physical phones still need user testing.
