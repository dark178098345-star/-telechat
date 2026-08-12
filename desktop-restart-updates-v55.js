/* TELECHAT DESKTOP RESTART UPDATES V55
   Desktop updates refresh the interface by restarting the app.
   The installed .exe is never downloaded or reinstalled from the update card. */
(() => {
  'use strict';
  const bridge = window.telechatDesktop;
  if (!bridge?.isDesktop || typeof bridge.restartApp !== 'function') return;

  bridge.installUpdate = async function () {
    try {
      const result = await bridge.restartApp();
      if (result?.ok) return { ok: true, restarted: true };
    } catch (error) {}

    // Safe fallback for an older desktop shell: reload the current web app.
    const url = new URL(location.href);
    url.searchParams.set('refresh', String(Date.now()));
    location.replace(url.toString());
    return { ok: true, restarted: false };
  };
})();
