# v195: reduce transfer and remove sidebar loading dependencies

This release changes actual transfer/work, not presentation delays. No database schema, image migration or paid server changes are made.

## Repeated message payloads

Sidebar refresh previously downloaded id/text for every latest conversation message on every network refresh, including embedded image payloads. Metadata now includes edited_at. A previously compacted preview is reused only when id, conversation, sender, timestamp and edit version all match. New or edited IDs alone need text retrieval. Deleted messages drop out of the metadata selection. Legacy schemas without edited_at use the former text-fetch behavior rather than risking stale edits.

The compact snapshot retains edited_at for safe reuse after restarts; no raw media payload is persisted there. A changed account resets the sidebar snapshot/local patches/paint generation, and old request cleanup cannot clear a newer request flight.

## First paint

The user-cache warm entry point initiates normal bounded/shared disk/network loading without making sidebar row creation await avatars. Existing user-updated notifications repaint the affected cached sidebar state. Placeholder initials/nicks can appear briefly on cold loads. Fully merged memory profiles bypass unnecessary disk restores; stripped startup snapshots still restore cached photos normally.

Automatic full profile/banner preparation on every chat-header change has been removed so it cannot compete with chat opening. Intentional hover/focus preparation remains. This does not relocate legacy avatars out of profile status or compress already stored original attachments.

## Validation

loading-speed-v195.browser.cjs uses a 2 MiB embedded photo as a latest message. First retrieval is about 2 MiB; an unchanged refresh downloads zero additional text payload bytes. It also checks edit invalidation, legacy schema fallback, non-blocking avatar work and account isolation. The measured fixture paint latency is not a claim about production network speed. Existing user-cache, stable sidebar/history, profile loading and full runtime tests cover surrounding behavior.
