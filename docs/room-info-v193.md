# v193: group and channel information

The existing room manager is redesigned rather than replaced. Existing membership checks, paging (50 members), add/edit/remove controls and confirmation dialogs remain authoritative. No schema or stored message changes are needed.

At desktop widths >=1100px the checked room panel docks to the right and reserves chat width instead of covering it. The backdrop is suppressed only while this dock is active. Smaller desktop windows retain an overlay and the phone shell retains a full-height screen. Closing/account switching removes the dock reservation.

Hero, quick settings/add/edit controls, description/access, four material entries and member list share the existing panel. Add/edit remain owner-only. Settings opens the existing per-chat settings, not an unimplemented mute toggle.

Displayed material counts are lower bounds from at most the latest 200 loaded message siblings of this room. Foreign/deleted messages are excluded; unknown counts say Open. The note/tooltip explicitly says these are not full archive totals.

Shared media adds a checked active-room entry point using rooms-model.details, account/epoch/current-room guards and existing 40-row history paging. Photo, file and link support is retained; audio/video attachment tabs delegate saving to the established attachment handler (no autoplay or unvalidated media URL playback). Gallery queries use the selected room chat key. Requests have a hard 12-second deadline; account changes close the gallery.

Validation: room-info-v193 browser covers 320/390/1440px, actual member model, groups/channels, dock/chat non-overlap, counts excluding other rooms, audio archive/save delegation and owner control restrictions. Existing room management, shared media, autoload and full production-stack tests provide regression coverage. No live production-account writes are made by tests.
