# ExstraChat v173 — unified interface

- Shared graphite, white and green palettes for the chat shell, navigation, composer, menus, settings and profile surfaces.
- A continuous desktop workspace, quieter navigation, consistent buttons and a new empty-conversation illustration in inline SVG.
- Separate phone shell retained, including keyboard viewport handling, large touch targets, call minimization, attachments and voice controls.
- System typography replaces the external Google Fonts dependency.
- Existing personal wallpaper, message colour/density/radius, profile media and pixel-eye animations remain available.
- Structural surfaces no longer animate their background or use backdrop blur. Hover feedback and existing intentional message/eye animations remain.
- Existing presentation stylesheet was updated and versioned; no additional JavaScript runtime, observer, timer, server request, database migration or new dependency.

Verified at 320, 390, 720, 1024, 1440 and 1920 pixels, dark/light/green, with settings and custom message colour/wallpaper. Regression suites cover the phone shell, short keyboard viewports, profiles, music layout, smooth sending, scroll restoration and v172 delivery.

Screenshots under `outputs/interface-v173-*` use disposable fixture names, conversations and avatars, not live private chats.
