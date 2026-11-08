# Profile layout v196

Two view-only compositions are available in Settings → Appearance → Profile card.

- Classic is the default. No preference migration or automatic opt-in.
- Panel uses the existing banner as a vertical strip on the left, including phones.
- Preference is local and account-scoped; it does not change how other people see profiles.
- Switching changes a scoped body attribute, not profile DOM or media nodes.
- Existing profile loading, cache, permissions and actions remain authoritative. No database changes.
- No timers, image downloads or speculative requests are introduced.

Regression coverage: 320/390/1440 layouts, dark/light, settings access, account isolation, persistence, classic restoration, and the full production script stack.
