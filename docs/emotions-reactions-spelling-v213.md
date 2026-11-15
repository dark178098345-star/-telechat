# Expressions, reactions and local spelling v213

## Artwork

Redrew the shared SVG face, eye, eyebrow, mouth, heart, hand and finger geometry;
sculpted warmer shading without filters, bitmaps or third-party sticker art.
Laughing/crying eyes are distinct, sunglasses and tongue/teeth are curved, hands
have rounded anatomy rather than polygon blocks. Animal hoods, hugging hands and
flowers are revised too. A standalone local flame now replaces the system emoji
fallback in reactions and messages. The 111 catalog IDs/tokens remain unchanged;
the old renderer API is an integration name, not another active artwork layer.
Finite semantic animations and reduced-motion limits are retained.

## Reactions

- The six quick choices are heart, laughter, surprise, thumb, fire and heart-eyes.
  Existing valid Unicode/custom reactions outside that row can also be toggled;
  the old six-value write gate silently rejected their clicks.
- Selected pills are rounded, quiet, readable in both themes and retain their
  DOM/SVG nodes on unchanged refresh. Existing Unicode heart variants are grouped
  together. Duplicate rows per sender are folded by newest timestamp.
- Holding for 300 ms opens one large semantic animated preview. Releasing closes
  it without changing the reaction. Normal taps still add/remove; move, scroll,
  pointer cancel, blur, Escape, background and account transition clean it up.
- Account/chat generations scope reads and pending writes, including A → A new
  login. A late finally cannot unlock or roll back a newer operation. Subscriptions
  follow the current owner; unrelated message events do not refetch this chat.
- Temporary/non-server IDs are not queried or offered reactions. Reads are
  batched (80 IDs) with 8-second bounds, a single DOM lookup map and preserved
  last-good state on failure. Writes have a 30-second response bound, no automatic
  write retry, explicit error feedback and a read-back refresh. A timeout does
  not claim that the server rolled back: later Realtime/read state wins.

No database policies, schema, authentication or production messages/reactions
are modified by deployment/tests. The existing upsert/delete protocol remains.
Server denial is surfaced, not bypassed or treated as a successful save.

## Spelling

The user's requested presentation is a wavy underline under the entire misspelt
Russian word plus red replacement/extra characters when the correction is
confident. The textarea, cursor, draft value, emoji entities and sender remain
unchanged. An omission has no existing letter to colour; ambiguous words have
only an underline. This is spelling assistance, not contextual grammar analysis.
English words, links, mentions and custom emoji tokens are not checked as Russian.

The original Russian Hunspell word forms are expanded only during the vendor
build, then compiled into a minimal flat-integer word graph. Runtime dictionary
storage is about 2.1 MB rather than a 1.4-million-entry JavaScript object table.
The 652 KB gzip download is lazy, same-origin and cached after first use. A worker
checks bounded/debounced batches, generates single-edit suggestions and keeps a
bounded word cache. It terminates after two minutes idle or on account/background
transition. There are no external spelling API requests or stored draft text.

An input overlay mirrors font, padding, size and scroll without intercepting
pointer events. IME composition suspends decoration; stale results validate
owner, conversation, request and exact draft. A toggle in Settings → message
appearance is account-scoped on this device. Unsupported/failed dictionary work
does not prevent typing or sending. Before the first dictionary download,
offline spelling may be unavailable; ordinary chat still works.

## Validation

New browser tests render dark/light galleries, test quick and historic reaction
clicks, hold enlargement/animation/no accidental write, stale same-account
operations, duplicate counts, timeout recovery, actual offline word graph,
replacement-letter positions, inflections, links/tokens, unchanged draft,
multiline overlay alignment, lazy loading and settings at 320/390/1440 px.
Existing reaction, semantic motion, custom composer, send, picker, full-runtime
and startup suites provide regression coverage. All accounts/messages are local
fixtures; no production write is used to validate a reaction.
