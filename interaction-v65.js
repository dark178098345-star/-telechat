/* TELECHAT INTERACTION V65 — live composer activity and full-screen panels. */
(() => {
  'use strict';

  const reducedMotionV65 = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const activityV65 = new Map();
  let activityKeyV65 = '';
  let activityReadyV65 = false;
  let activityPaintTimerV65 = 0;
  let activityFetchTimerV65 = 0;
  let lastActivityModeV65 = '';
  let lastActivitySentAtV65 = 0;
  let lastTypingDbAtV65 = 0;
  let typingDbStopTimerV65 = 0;
  let voicePulseTimerV65 = 0;
  let closingPanelV65 = null;
  let closingTimerV65 = 0;

  const toggleVoiceBeforeV65 = window.toggleVoiceRecording;
  const openPanelBeforeV65 = window.openPanel;
  const closePanelsBeforeV65 = window.closeAllPanels;

  function activeKeyV65() {
    try { return conversationKey() || ''; } catch (error) { return ''; }
  }

  function recordingNowV65() {
    return Boolean(window.mediaRecorderV3 && mediaRecorderV3.state === 'recording');
  }

  function currentActivityLabelV65(entry) {
    const privateChat = !currentRoom;
    const name = userCache?.[entry.nick]?.name || entry.nick;
    if (entry.mode === 'voice') return privateChat ? 'записывает голосовое…' : `${name} записывает голосовое…`;
    return privateChat ? 'печатает…' : `${name} печатает…`;
  }

  function restoreStatusV65() {
    const element = document.getElementById('chat-status-text');
    if (!element) return;
    element.className = 'chat-status-text offline';
    element.textContent = '…';
    Promise.resolve(typeof updateStatusBar === 'function' ? updateStatusBar() : null).catch(() => {});
  }

  function paintActivityV65() {
    clearTimeout(activityPaintTimerV65);
    const key = activeKeyV65();
    if (!key || key !== activityKeyV65) return;
    const now = Date.now();
    for (const [nick, entry] of activityV65) {
      if (entry.expiresAt <= now || nick === me?.nick) activityV65.delete(nick);
    }
    const entries = [...activityV65.values()]
      .sort((a, b) => (a.mode === 'voice' ? -1 : 1) - (b.mode === 'voice' ? -1 : 1) || b.at - a.at);
    const element = document.getElementById('chat-status-text');
    if (!element) return;
    if (!entries.length) { restoreStatusV65();return; }
    const entry = entries[0];
    const icon = entry.mode === 'voice'
      ? '<span class="activity-mic-v65" aria-hidden="true">🎙</span>'
      : '<span class="typing-dots"><span></span><span></span><span></span></span>';
    const extra = entries.length > 1 ? ` и ещё ${entries.length - 1}` : '';
    element.className = `chat-status-text typing activity-v65 activity-${entry.mode}-v65`;
    element.innerHTML = `${icon}<span class="typing-label">${escHtml(currentActivityLabelV65(entry) + extra)}</span>`;
    const nextExpiry = Math.max(180, Math.min(...entries.map(item => item.expiresAt - now)) + 30);
    activityPaintTimerV65 = setTimeout(paintActivityV65, nextExpiry);
  }

  function acceptActivityV65(payload) {
    const key = String(payload?.chat_key || '');
    const nick = String(payload?.nick || '').toLowerCase();
    const mode = payload?.mode === 'voice' ? 'voice' : payload?.mode === 'typing' ? 'typing' : 'idle';
    const at = Number(payload?.ts || Date.now());
    if (!nick || nick === me?.nick || key !== activityKeyV65 || Math.abs(Date.now() - at) > 15000) return;
    if (mode === 'idle') activityV65.delete(nick);
    else activityV65.set(nick, { nick, mode, at, expiresAt: Date.now() + (mode === 'voice' ? 3600 : 3100) });
    paintActivityV65();
  }

  function broadcastActivityV65(mode, force = false) {
    const key = activeKeyV65();
    if (!key || !typingSub || key !== activityKeyV65 || !me?.nick) return;
    if (recordingNowV65() && mode === 'typing') mode = 'voice';
    const now = Date.now();
    if (!force && mode === lastActivityModeV65 && now - lastActivitySentAtV65 < 520) return;
    lastActivityModeV65 = mode;lastActivitySentAtV65 = now;
    Promise.resolve(typingSub.send({
      type: 'broadcast',
      event: 'composer-activity-v65',
      payload: { chat_key: key, nick: me.nick, mode, ts: now }
    })).catch(() => {});
  }

  async function fetchTypingFallbackV65(key) {
    if (!key || key !== activeKeyV65()) return;
    const result = await sb.from('typing').select('nick,ts').eq('chat_key', key).neq('nick', me.nick).gt('ts', Date.now() - 5000).order('ts', { ascending: false });
    if (result.error || key !== activeKeyV65()) return;
    const freshNicks = new Set();
    (result.data || []).forEach(row => {
      const nick = String(row.nick || '').toLowerCase();
      if (!nick) return;
      freshNicks.add(nick);
      const existing = activityV65.get(nick);
      if (!existing || existing.mode !== 'voice') activityV65.set(nick, { nick, mode: 'typing', at: Number(row.ts) || Date.now(), expiresAt: Date.now() + 2900 });
    });
    for (const [nick, entry] of activityV65) {
      if (entry.mode === 'typing' && !freshNicks.has(nick) && Date.now() - entry.at > 2200) activityV65.delete(nick);
    }
    paintActivityV65();
  }

  function scheduleTypingFallbackV65(key, delay = 80) {
    clearTimeout(activityFetchTimerV65);
    activityFetchTimerV65 = setTimeout(() => fetchTypingFallbackV65(key).catch(() => {}), delay);
  }

  window.subscribeTyping = function() {
    if (typingSub) sb.removeChannel(typingSub);
    clearTimeout(activityPaintTimerV65);clearTimeout(activityFetchTimerV65);
    activityV65.clear();activityReadyV65 = false;activityKeyV65 = activeKeyV65();
    const key = activityKeyV65;
    if (!key) return;
    typingSub = sb.channel(`composer-activity-v65-${key}`)
      .on('broadcast', { event: 'composer-activity-v65' }, event => acceptActivityV65(event.payload || event))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing', filter: `chat_key=eq.${key}` }, () => scheduleTypingFallbackV65(key))
      .subscribe(status => {
        activityReadyV65 = status === 'SUBSCRIBED';
        if (activityReadyV65) {
          scheduleTypingFallbackV65(key, 0);
          if (recordingNowV65()) broadcastActivityV65('voice', true);
        }
      });
  };

  window.sendTyping = function(...args) {
    const input = document.getElementById('msg-input');
    const key = activeKeyV65();
    const hasText = !!input?.value.trim();
    broadcastActivityV65(hasText ? 'typing' : 'idle');
    clearTimeout(typingDbStopTimerV65);
    if (!key || !me?.nick) return;
    if (!hasText) {
      Promise.resolve(sb.from('typing').delete().eq('chat_key', key).eq('nick', me.nick)).catch(() => {});
      return;
    }
    const now = Date.now();
    if (now - lastTypingDbAtV65 > 1700) {
      lastTypingDbAtV65 = now;
      Promise.resolve(sb.from('typing').upsert({ chat_key: key, nick: me.nick, ts: now })).catch(() => {});
    }
    typingDbStopTimerV65 = setTimeout(() => {
      Promise.resolve(sb.from('typing').delete().eq('chat_key', key).eq('nick', me.nick)).catch(() => {});
    }, 2600);
  };

  function stopVoicePulseV65() {
    clearInterval(voicePulseTimerV65);voicePulseTimerV65 = 0;
    broadcastActivityV65('idle', true);
  }

  function startVoicePulseV65() {
    clearInterval(voicePulseTimerV65);
    broadcastActivityV65('voice', true);
    voicePulseTimerV65 = setInterval(() => {
      if (!recordingNowV65()) { stopVoicePulseV65();return; }
      broadcastActivityV65('voice', true);
    }, 1500);
    const recorder = window.mediaRecorderV3;
    if (recorder && recorder.datasetActivityV65 !== true) {
      recorder.datasetActivityV65 = true;
      recorder.addEventListener('stop', stopVoicePulseV65, { once: true });
      recorder.addEventListener('error', stopVoicePulseV65, { once: true });
    }
  }

  if (typeof toggleVoiceBeforeV65 === 'function') {
    window.toggleVoiceRecording = async function(...args) {
      const wasRecording = recordingNowV65();
      const value = await toggleVoiceBeforeV65.apply(this, args);
      if (!wasRecording && recordingNowV65()) {
        try { await sb.from('typing').delete().eq('chat_key', activeKeyV65()).eq('nick', me.nick); } catch (error) {}
        startVoicePulseV65();
      } else if (!recordingNowV65()) stopVoicePulseV65();
      return value;
    };
  }

  function panelTriggerV65(id) {
    const target = id === 'settings-panel' ? 'settings' : id === 'profile-panel' ? 'profile' : '';
    return target ? document.querySelector(`.telechat-nav-btn[data-nav="${target}"]`) : null;
  }

  function setPanelOriginV65(panel, trigger) {
    const rect = trigger?.getBoundingClientRect?.();
    const panelRect = panel.getBoundingClientRect();
    const screenX = rect ? rect.left + rect.width / 2 : innerWidth / 2;
    const screenY = rect ? rect.top + rect.height / 2 : innerHeight;
    const x = Math.max(0, Math.min(panelRect.width, screenX - panelRect.left));
    const y = Math.max(0, Math.min(panelRect.height, screenY - panelRect.top));
    panel.style.setProperty('--panel-origin-x-v65', `${Math.round(x)}px`);
    panel.style.setProperty('--panel-origin-y-v65', `${Math.round(y)}px`);
  }

  window.openPanel = function(id, ...args) {
    const panel = document.getElementById(id);
    const full = id === 'settings-panel' || id === 'profile-panel';
    clearTimeout(closingTimerV65);closingPanelV65 = null;
    document.querySelectorAll('.side-panel.v65-closing').forEach(element => element.classList.remove('v65-closing'));
    if (full && panel) {
      document.body.classList.add('telechat-full-panel-open-v65');
      panel.classList.add('v65-full-panel');
      setPanelOriginV65(panel, panelTriggerV65(id));
    } else document.body.classList.remove('telechat-full-panel-open-v65');
    return openPanelBeforeV65.apply(this, [id, ...args]);
  };

  window.closeAllPanels = function(...args) {
    const panel = document.querySelector('#settings-panel.open,#profile-panel.open');
    if (!panel || reducedMotionV65) {
      document.body.classList.remove('telechat-full-panel-open-v65');
      return closePanelsBeforeV65.apply(this, args);
    }
    if (closingPanelV65 === panel) return;
    closingPanelV65 = panel;panel.classList.add('v65-closing');
    closingTimerV65 = setTimeout(() => {
      closePanelsBeforeV65.apply(this, args);
      panel.classList.remove('v65-closing');
      document.body.classList.remove('telechat-full-panel-open-v65');
      closingPanelV65 = null;
    }, 300);
  };

  window.telechatInteractionV65 = {
    activity: () => [...activityV65.values()],
    closePanel: () => closeAllPanels()
  };
})();
