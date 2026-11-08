# v191: calmer loading, bounded preparation

Existing profile, user-cache and motion modules are modified directly. No database schema or user payload changes. No blanket delayed reveal, mass prefetch, artificial minimum wait or new history observer is introduced.

Profiles retain immediate cache-first painting and selective media/text updates. Cold profiles clear the previous identity and use a static skeleton rather than the old animated spinner. The close button remains accessible; the underlying body is inert until ready to prevent stale actions. An adaptive minimum card height, reserved identity dimensions and 140ms skeleton fade reduce layout shifts. Motion policy/reduced-motion opt-outs are respected; shared surface reveals use 160ms (photos retain 200ms).

Full-profile requests are single-flight, have an eight-second hard deadline and ignore late results after timeout/account changes. Image decode preparation covers up to two embedded images with a maximum 120ms budget after new data arrives, never before showing a cached profile. Full-profile memory uses account scope, 90-second freshness, LRU promotion, at most 24 entries and an 8 MiB estimated data budget. It is not persisted to disk.

Speculative preparation considers only the active chat peer or a focused/hovered contact after 500ms. It is single-flight for speculative work, limited to one start per ten seconds, skipped while hidden/offline, on 2G/3G or Save-Data, and shares real opens' full-profile request/cache. No original media library or video is prefetched. Availability/speed estimates depend on browser network reporting.

The existing private device avatar cache now bounds IndexedDB open (800ms) and reads (750ms), closes late database handles, retries failed opens and ignores expired read callbacks. User network batches have a hard eight-second race even when cancellation is ignored. Existing owner/version guards and photo-cache quotas remain.

Tests cover cold/close/late responses, immediate warm opens, single-flight prepare+open, account isolation, responsive layouts and blocked disk fallback, alongside existing shared user cache, profile/media stability, reduced motion and full production-stack regressions. This reduces avoidable waiting/jumps; it cannot make an uncached slow network response instantaneous.
