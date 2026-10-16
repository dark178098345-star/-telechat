# v174 — reply gesture, unread view and consistency fixes

- Phone: swipe a message right to reply using the same action as the context menu. Short/vertical/cancelled gestures, selection, interactive media controls, read-only conversations, account/chat changes and hidden pages cannot accidentally start a reply. No per-message listener or observer; the existing message viewport owns one delegated gesture handler.
- Phone/desktop: Unread tab/rail entry reuses v62 counters and the cached sidebar. Existing rows are filtered without another query on tab selection. Reading a conversation clears it from the view; an empty state returns to all chats. No new database or polling service.
- Fixed the actual fast-sidebar renderer: it now supplies the canonical contact nickname expected by presence and privacy consumers. Its initial avatar indicator uses exact presence, not a fresh last-seen timestamp. Presence also understands the old data-nick row format and can repaint contacts immediately after a cached sidebar commit.
- Startup follows DOM readiness rather than window.load; removed the one-second minimum splash delay and the up-to-650ms avatar gate. Slow images/videos no longer hold the whole chat list. This does not claim reduced network latency or faster backend queries.
- Old avatar-wait helpers removed. Sending, draft persistence and message storage formats are unchanged.

Verification: real Chromium touch events; actual fast sidebar + existing unread module; private/room unread clearing and no extra filter queries; stale green avatar with offline header; stalled-avatar and stalled-window.load fixtures. Existing presence, mobile, keyboard and v172 transport suites pass.
