# Gift detail cards

- One lazily created native dialog for catalog previews and owned gift details.
  Existing SVG illustrations get a private gradient namespace so a hidden catalog
  cannot affect the detail artwork. Static themed surfaces, no remote artwork,
  video avatars, continuous animation, blur, polling or whole-page observers.
- Owned gifts use the actual record ID, sender, owner, timestamp, original price,
  rarity and message. No invented supply counts, NFT properties or resale value.
  Names and static photos reuse the existing user cache and safe avatar renderer.
  Optional user resolution is limited to five seconds with stale-view/account
  guards; a missing photo falls back to an initial immediately.
- Catalog tiles open a preview instead of purchasing. Recipient and note are
  captured for that preview, then passed unchanged to the existing confirmation
  and retry-safe wallet API. Cancel does nothing. Errors leave the card open;
  success closes it only after server acknowledgement. Prices, Premium, limited
  gift rules and SQL are unchanged.
- Owned collection entries are keyboard-accessible buttons. Escape/close returns
  focus to the original tile. Profile links close the wallet before opening the
  person. The recipient action returns focus to the input. Parent/account changes
  close child dialogs; rapid close/reopen cannot clear the next card's state.
- Collection reads now have their own generation as well as the wallet epoch, so
  an older collection response cannot replace a newer view in the same wallet.
- Light/dark, 320/390/1440px and short screens are covered. Reduced-motion and the
  existing interface motion owner are respected. Text is inserted as text, unknown
  gift IDs use the existing fallback illustration, and missing details are not
  fabricated.

`tests/gift-card-v207.browser.cjs` covers previews, received details, confirmation,
cancel, server errors/retry nonce, exact target/note, focus and profile navigation,
safe fallback/XSS, static photos, short layouts, reduced motion and stale/account
isolation. `tests/gift-card-runtime-v207.browser.cjs` also verifies the actual
production entry point, shared motion owner and confirmed payload at 390/1440px.
Existing wallet, gift art, full runtime and offline-shell regressions
also remain in scope. Tests use isolated fixture accounts and services; no real
gift is purchased or sent during verification. No device-ban work is included.
