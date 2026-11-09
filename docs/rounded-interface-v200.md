# Moderate shared geometry

- Shared radius scale: 10px small controls, 15px standard controls/rows, 18px cards, 24px standalone panels. Composer: 20px.
- Desktop shell gets an 8px outer inset and 10px separation. Phone scenes remain full-bleed; keyboard/viewport calculations are untouched.
- Explicit component selectors only. No blanket button/image rules: avatars, badges/crop masks, circular controls, sliders, QR artwork and chosen message bubble shapes remain owned by their existing components.
- Original repeated SVG drawings are ordinary static backgrounds, excluded wherever a personal photo is active. No floating pseudoelement, scrolling transform, blur or new clipping. Existing popovers remain free to overflow their local surfaces.
- Tiny account-local appearance controller: drawings/clean choice, saved by owner. Clean/original background is the default for everyone; drawings require explicit selection. Event-driven only; no network, timers, observers, layout reads or message access. Private photos and data are never read by it.
- Existing profile modes, themes, settings and account data are unchanged. Full-screen phone panels stay full-screen.
- Regression: shared geometry and preferences at 320/390/768/1440, music responsive layout, profile layouts, settings/keyboard, room panel, full production runtime and offline shell.
