/* Explicit interface/app restart, independent of the installer updater. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id),
    nav = $('settings-home-v160');
  if (!nav) return;
  let dialog,
    generation = 0,
    busy = false,
    trigger;
  const account = () => {
    try {
      return typeof me !== 'undefined' ? String(me?.nick || '') : '';
    } catch {
      return '';
    }
  };
  function blocked() {
    if (
      document.querySelector('#voice-call-overlay.show,#voice-call-mini.show') ||
      document.body.classList.contains('voice-call-full-v32')
    )
      return 'Сначала заверши звонок.';
    if (
      window.mediaRecorder?.state === 'recording' ||
      $('voice-recording')?.classList.contains('active') ||
      ['recording', 'requesting'].includes($('record-btn')?.dataset.voiceState)
    )
      return 'Сначала закончи запись голосового сообщения.';
    if (
      window.exstraFileDropV203?.getState?.().busy ||
      window.exstraPhotoComposeV182?.isPreparing?.() ||
      $('send-btn')?.disabled ||
      document.querySelector('.send-btn:disabled')
    )
      return 'Дождись завершения отправки.';
    try {
      if (typeof pendingMedia !== 'undefined' && pendingMedia)
        return 'Сначала отправь или убери подготовленное вложение.';
    } catch {}
    if ($('msg-input')?.value.trim())
      return 'В поле сообщения есть черновик. Сначала отправь или сохрани его.';
    return '';
  }
  function mount() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'app-restart-v216';
    dialog.setAttribute('aria-labelledby', 'app-restart-title-v216');
    dialog.innerHTML =
      '<h2 id="app-restart-title-v216">Перезапустить ExstraChat?</h2><p>Это обновит интерфейс без установщика. Аккаунты, чаты и настройки сохранятся.</p><p>Музыка и незавершённые загрузки во встроенных сайтах прервутся. Сохрани важные формы и черновики перед перезапуском.</p><p id="app-restart-status-v216" role="status"></p><footer><button type="button" id="app-restart-cancel-v216">Отмена</button><button type="button" id="app-restart-confirm-v216">Перезапустить</button></footer>';
    document.body.append(dialog);
    $('app-restart-cancel-v216').onclick = close;
    $('app-restart-confirm-v216').onclick = restart;
    dialog.addEventListener('close', () => {
      if (dialog.open) return;
      generation++;
      busy = false;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('cancel', () => {
      generation++;
      busy = false;
    });
  }
  function close() {
    generation++;
    busy = false;
    dialog.close();
  }
  function open() {
    mount();
    generation++;
    busy = false;
    $('app-restart-confirm-v216').disabled = false;
    $('app-restart-status-v216').textContent = blocked();
    if (!dialog.open) dialog.showModal();
    $('app-restart-cancel-v216').focus();
  }
  async function restart() {
    if (busy) return;
    let reason = blocked();
    if (reason) {
      $('app-restart-status-v216').textContent = reason;
      return;
    }
    const owner = account(),
      stamp = generation;
    busy = true;
    $('app-restart-confirm-v216').disabled = true;
    $('app-restart-status-v216').textContent = 'Проверяем очередь отправки…';
    let timer;
    try {
      if (typeof window.telechatDeliveryV72?.diagnostics === 'function') {
        const result = await Promise.race([
          window.telechatDeliveryV72.diagnostics(),
          new Promise((resolve) => {
            timer = setTimeout(() => resolve(null), 2500);
          }),
        ]);
        clearTimeout(timer);
        if (stamp !== generation || !dialog.open || owner !== account()) return;
        if (!result)
          throw Error('Не удалось проверить очередь отправки. Закрой окно и попробуй позже.');
        if (!Number.isFinite(result.queued) || result.queued < 0)
          throw Error('Не удалось подтвердить состояние очереди. Закрой окно и попробуй позже.');
        if (result.queued > 0)
          throw Error(
            'Есть неотправленные сообщения. Дождись доставки или проверь их перед перезапуском.',
          );
      }
      reason = blocked();
      if (reason) throw Error(reason);
      if (stamp !== generation || !dialog.open || owner !== account()) return;
      $('app-restart-status-v216').textContent = 'Перезапускаем…';
      if (
        window.telechatDesktop?.isDesktop &&
        typeof window.telechatDesktop.restartApp === 'function'
      ) {
        const result = await window.telechatDesktop.restartApp();
        if (result?.ok !== true)
          throw Error('Приложение не подтвердило перезапуск. Закрой окно и попробуй ещё раз.');
      } else location.reload();
    } catch (error) {
      if (stamp === generation && dialog.open)
        $('app-restart-status-v216').textContent =
          error.message || 'Нет подтверждения перезапуска. Проверь приложение перед повтором.';
    } finally {
      clearTimeout(timer);
      if (stamp === generation) {
        busy = false; /* Unknown restart results are never retried automatically. */
      }
    }
  }
  trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'app-restart-open-v216';
  trigger.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10a8 8 0 1 0-1.4 7M20 3v7h-7"/></svg><span><strong>Перезапустить ExstraChat</strong></span><small>Без установщика</small>';
  trigger.onclick = open;
  nav.append(trigger);
  window.addEventListener('telechat-account-ready-v175', () => {
    generation++;
    if (dialog?.open) dialog.close();
  });
})();
