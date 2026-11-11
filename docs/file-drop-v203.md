# Drop files into an open chat

OS file drags over messages/composer get a temporary static scoped overlay. Dropping starts the existing attachment uploader and durable sender, sequentially, up to 10 originals of 20 MiB each. Images are documents/originals in this flow, not recompressed photo albums. Directories and malformed/empty/oversized files are rejected before starting. Dropping elsewhere never opens a local file in the app.

The existing selectFile API accepts an explicit direct flag. Attachment captions are empty for that flag; the durable sender does not clear input/height or consume replyTo. Text, custom emoji entities, a selected reply, and edits typed during upload stay as drafts. Ordinary paperclip/photo/message sends retain their prior semantics. The flag is not serialized into the file descriptor or message payload.

A single in-memory batch owns its account and conversation. New drops while busy are rejected, not queued twice. Existing pending media, photo preparation and active recording are not replaced. Every next file rechecks owner/key/permissions and the existing uploader also cancels on chat/account changes. Failed preparation/upload retains the current file in the composer for a deliberate manual retry; remaining batch files are not silently sent later. Durable delivery keeps owning retry/idempotency after upload handoff.

No new database, background prefetch, polling, file-path reading, compression or parallel uploads. The small drag UI is created only when needed, hidden on leave/drop/blur and does not affect layout. File references are released when the batch finishes/stops; interrupted not-yet-uploaded files are not persisted across restarts.
