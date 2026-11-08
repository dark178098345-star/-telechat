# v194: compact desktop rail

The existing navigation module owns the drawer. Its brand becomes an accessible More toggle, with chats/groups/channels/music remaining direct visible entries. Unread and later-added auxiliary buttons are reparented intact into one drawer, retaining their IDs/listeners and existing feature owners. A direct-child observer only handles rail additions, never chat history.

The drawer uses one finite 200ms height/opacity/short-translate animation; the brand rotates 90 degrees. Rapid reversals cancel the prior animation and start from the current measured height. Hidden content is both hidden and inert; Escape restores focus to the toggle. A sticky toggle remains reachable when the rail scrolls.

Reduced-motion, off/lite policy, document background and native background suppress/finish motion. Breakpoint/account transitions collapse the drawer. Existing phone navigation and settings/profile footer placement remain unchanged. Features are not removed, and expanded state is not persisted.

rail-drawer-v194 browser checks compact defaults, preserved action handlers, reveal/close, rapid reversal cleanup, inert content, Escape focus, reduced motion and responsive music placement. The complete runtime test opens the drawer and launches the real My Center button on desktop. Existing rail filtering/read-receipt regression remains covered.
