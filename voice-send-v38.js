/* TELECHAT VOICE SEND V38 — send the active recording with one click */
(() => {
  'use strict';

  let voiceSendBusyV38 = false;
  const sendBeforeV38 = sendMsg;
  const toggleVoiceBeforeV38 = toggleVoiceRecording;

  function recordingNowV38() {
    return Boolean(mediaRecorderV3 && mediaRecorderV3.state === 'recording');
  }

  function finishRecordingV38() {
    const recorder = mediaRecorderV3;
    if (!recorder || recorder.state !== 'recording') {
      return Promise.resolve(Boolean(pendingMedia && pendingMedia.kind === 'voice'));
    }

    return new Promise(resolve => {
      const originalOnStop = recorder.onstop;
      let settled = false;
      let timeoutId = 0;
      const finish = ready => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(Boolean(ready));
      };

      recorder.onstop = async event => {
        try {
          if (typeof originalOnStop === 'function') {
            await originalOnStop.call(recorder, event);
          }
          finish(pendingMedia && pendingMedia.kind === 'voice');
        } catch (error) {
          try { stopVoiceUi(); } catch (uiError) {}
          finish(false);
        }
      };

      try {
        recorder.stop();
      } catch (error) {
        recorder.onstop = originalOnStop;
        finish(false);
      }

      timeoutId = setTimeout(() => finish(pendingMedia && pendingMedia.kind === 'voice'), 12000);
    });
  }

  sendMsg = async function(...args) {
    if (voiceSendBusyV38) return;
    if (!recordingNowV38()) return sendBeforeV38(...args);

    voiceSendBusyV38 = true;
    const button = document.querySelector('.send-btn');
    if (button) button.setAttribute('aria-label', 'Подготовка голосового');

    try {
      const ready = await finishRecordingV38();
      if (!ready) {
        showToast('Не удалось подготовить голосовое');
        return;
      }
      return await sendBeforeV38(...args);
    } finally {
      voiceSendBusyV38 = false;
      if (button) button.setAttribute('aria-label', 'Отправить');
    }
  };

  toggleVoiceRecording = async function(...args) {
    try {
      return await toggleVoiceBeforeV38(...args);
    } finally {
      const recordButton = document.getElementById('record-btn');
      const input = document.getElementById('msg-input');
      if (input && document.activeElement === recordButton) {
        try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); }
      }
    }
  };
})();
