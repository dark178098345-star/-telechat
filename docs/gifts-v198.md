# Gift illustrations and recipient avatars

- 37 original full-color SVG miniatures, matched by catalog ID, with distinct silhouettes and layered fills. No system emoji, network artwork, SVG filters or animations.
- Shared illustration renderer for both catalog and owned collections; unknown IDs receive a gift-box fallback.
- Static avatar chips show cached chat contacts by name and nickname. Exact nicknames resolve through the existing shared user loader with debounce, timeout and stale/account/closed-dialog guards.
- Raster profile photos only; video avatars never autoplay in the picker. Missing or failed photos show initials.
- Applied to transfer, gift and creator balance fields. Only the recipient nickname is sent in the existing transaction payload.
- No database migration, price, wallet or Premium changes.
