# v192: softer original emoji artwork

Edits stay in the existing code-native SVG renderer. Catalog IDs, Unicode/custom tokens, search labels and animation part hooks are unchanged, including all 111 entries. Message, reaction and composer protocols are untouched.

- Larger round head geometry with a warmer, lower-contrast skin gradient, restrained cheek colour and a small highlight rather than a hard bottom shadow.
- Smaller friendly oval eyes, retained wide/tender eyes where the expression requires them, curved angry brows, less geometric sunglasses, and softer mouth/teeth/tongue shapes.
- Curved heart and star silhouettes, rounded flowing tear streams and mouth, a rounded thumb/cuff and organic flame contours.
- All shared filled path contours use round-cap/round-join matching-colour edge strokes to soften accessory seams. A small viewBox safety margin avoids clipping edge decorations.

No raster sheets, external downloads, SVG blur filters or new animation loops are introduced. Existing finite animation limits and reduced-motion behavior are preserved.

emoji-soft-v192.browser.cjs validates preserved catalog size/revision, unique gradient IDs, round path joins and absence of bitmap/filter dependencies. It renders dark/light full galleries and a focused comparison against c1468bb. Existing emotions, animation, composer and full production-stack browser tests cover the actual integration.
