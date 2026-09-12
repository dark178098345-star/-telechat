/* TELECHAT STORIES V115 — 24-hour photo/video stories with captions and viewers. */
(() => {
  'use strict';

  const BUCKET = 'story-media';
  const STORY_TTL = 24 * 60 * 60 * 1000;
  const MAX_IMAGE = 12 * 1024 * 1024;
  const MAX_VIDEO = 50 * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 60;
  const state = {
    stories: [], users: new Map(), viewed: new Set(), available: true,
    likes: new Map(), liked: new Set(),
    viewerItems: [], viewerIndex: 0, viewerViews: new Map(),
    selectedFile: null, selectedPreviewUrl: '', loading: false, initialized: false,
    realtime: null, refreshTimer: null, viewsRequest: 0, likesRequest: 0
  };

  const byId = id => document.getElementById(id);
  const currentUser = () => { try { return typeof me !== 'undefined' && me ? me : null; } catch (_) { return null; } };
  const safeNick = value => String(value || '').trim().toLowerCase();
  const now = () => Date.now();
  const isStoryMediaUrl = value => {
    const text = String(value || '');
    if (/^data:image\/(jpeg|png|webp);base64,/i.test(text)) return true;
    try {
      const url = new URL(text);
      return url.protocol === 'https:' && url.hostname === 'xvnazoervzccixtfhuaa.supabase.co' && url.pathname.includes('/storage/v1/object/public/' + BUCKET + '/');
    } catch (_) { return false; }
  };
  const storyUser = nick => state.users.get(safeNick(nick)) || { nick: safeNick(nick), name: safeNick(nick), av: 0, status: '' };
  const formatStoryTime = ts => {
    const diff = Math.max(0, now() - Number(ts || 0));
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + ' мин. назад';
    return Math.max(1, Math.floor(diff / 3600000)) + ' ч. назад';
  };
  const formatRemaining = ts => {
    const diff = Math.max(0, Number(ts || 0) - now());
    const h = Math.floor(diff / 3600000), m = Math.max(1, Math.floor((diff % 3600000) / 60000));
    return h ? 'ещё ' + h + ' ч.' : 'ещё ' + m + ' мин.';
  };

  function ensureUi() {
    if (!byId('stories-strip-v115')) {
      const tabs = document.querySelector('.sidebar-tabs');
      const strip = document.createElement('section');
      strip.id = 'stories-strip-v115';
      strip.className = 'stories-strip-v115';
      strip.setAttribute('aria-label', 'Истории');
      strip.innerHTML = '<div class="stories-head-v115"><span class="stories-title-v115">Истории</span><button type="button" class="stories-add-v115" id="stories-add-v115">＋ Добавить</button></div><div class="stories-list-v115" id="stories-list-v115"></div><div class="story-status-v115" id="story-status-v115" hidden></div>';
      if (tabs) tabs.insertAdjacentElement('afterend', strip);
      else byId('sidebar')?.prepend(strip);
      byId('stories-add-v115')?.addEventListener('click', openComposer);
    }
    if (!byId('story-compose-v115')) {
      const overlay = document.createElement('div');
      overlay.id = 'story-compose-v115'; overlay.className = 'story-overlay-v115'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = '<section class="story-card-v115 story-compose-card-v115"><div class="story-compose-title-v115">Новая история</div><div class="story-compose-subtitle-v115">Она будет доступна 24 часа</div><button class="story-close-v115" id="story-compose-close-v115" type="button" aria-label="Закрыть" style="position:absolute;right:14px;top:14px">×</button><label class="story-file-drop-v115" id="story-file-drop-v115" for="story-file-input-v115"><input id="story-file-input-v115" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" hidden><span class="story-file-placeholder-v115"><strong>＋ Выбери фото или видео</strong><span>Фото до 12 МБ · видео до 50 МБ и 60 секунд</span></span></label><textarea id="story-caption-input-v115" class="story-caption-input-v115" maxlength="180" placeholder="Добавь описание к истории…"></textarea><div class="story-compose-hint-v115">Подпись увидят все, кто посмотрит историю.</div><div class="story-compose-actions-v115"><button class="modal-btn secondary" id="story-compose-cancel-v115" type="button">Отмена</button><button class="modal-btn primary" id="story-compose-publish-v115" type="button" disabled>Опубликовать</button></div></section>';
      overlay.addEventListener('click', event => { if (event.target === overlay) closeComposer(); });
      document.body.appendChild(overlay);
      byId('story-compose-close-v115').onclick = closeComposer;
      byId('story-compose-cancel-v115').onclick = closeComposer;
      byId('story-file-input-v115').onchange = handleFile;
    }
    if (!byId('story-viewer-v115')) {
      const overlay = document.createElement('div');
      overlay.id = 'story-viewer-v115'; overlay.className = 'story-overlay-v115'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = '<section class="story-card-v115"><header class="story-head-v115"><div class="story-head-avatar-v115" id="story-head-avatar-v115"></div><div class="story-head-copy-v115"><div class="story-head-name-v115" id="story-head-name-v115"></div><div class="story-head-time-v115" id="story-head-time-v115"></div></div><button class="story-close-v115" id="story-viewer-close-v115" type="button" aria-label="Закрыть">×</button></header><div class="story-progress-v115" id="story-progress-v115"></div><div class="story-stage-v115" id="story-stage-v115"><button class="story-nav-v115 story-nav-prev-v115" id="story-prev-v115" type="button" aria-label="Предыдущая">‹</button><button class="story-nav-v115 story-nav-next-v115" id="story-next-v115" type="button" aria-label="Следующая">›</button></div><div class="story-caption-v115" id="story-caption-v115"></div><div class="story-foot-v115"><div class="story-like-wrap-v116"><button class="story-like-btn-v116" id="story-like-v116" type="button" aria-label="Поставить лайк" aria-pressed="false">♡</button><span class="story-like-count-v116" id="story-like-count-v116">0</span></div><button class="story-action-btn-v115 story-add-more-v115" id="story-add-more-v115" type="button" hidden>＋ Добавить ещё</button><span class="story-foot-spacer-v115"></span><button class="story-views-btn-v115" id="story-views-btn-v115" type="button" hidden></button><button class="story-action-btn-v115 story-delete-btn-v115" id="story-delete-v115" type="button" hidden>🗑 Удалить</button></div><div class="story-viewers-v115" id="story-viewers-v115"></div></section>';
      overlay.addEventListener('click', event => { if (event.target === overlay) closeViewer(); });
      document.body.appendChild(overlay);
      byId('story-viewer-close-v115').onclick = closeViewer;
      byId('story-prev-v115').onclick = () => showStory(state.viewerIndex - 1);
      byId('story-next-v115').onclick = () => showStory(state.viewerIndex + 1);
      byId('story-views-btn-v115').onclick = toggleViewers;
      byId('story-like-v116').onclick = toggleStoryLike;
      byId('story-add-more-v115').onclick = () => { closeViewer(); openComposer(); };
      byId('story-delete-v115').onclick = deleteCurrentStory;
    }
  }

  function renderAvatar(target, user) {
    if (!target) return;
    try { target.innerHTML = typeof avatarMarkup === 'function' ? avatarMarkup(user) : '👤'; }
    catch (_) { target.textContent = '👤'; }
  }

  function renderStories() {
    ensureUi();
    const list = byId('stories-list-v115'); if (!list) return;
    list.replaceChildren();
    const latest = new Map();
    state.stories.forEach(story => { const nick = safeNick(story.author_nick); if (!latest.has(nick)) latest.set(nick, story); });
    const own = latest.get(safeNick(currentUser()?.nick));
    const ownButton = document.createElement('button'); ownButton.type = 'button'; ownButton.className = 'story-chip-v115' + (own && state.viewed.has(String(own.id)) ? ' seen-v115' : ''); ownButton.setAttribute('aria-label', own ? 'Открыть мою историю' : 'Добавить историю');
    ownButton.innerHTML = '<span class="story-chip-ring-v115"><span class="story-chip-avatar-v115">＋</span><span class="story-chip-plus-v115">＋</span></span><span class="story-chip-name-v115">Моя история</span>';
    if (own) { renderAvatar(ownButton.querySelector('.story-chip-avatar-v115'), storyUser(own.author_nick)); ownButton.querySelector('.story-chip-plus-v115').textContent = '＋'; ownButton.onclick = () => showStoryByAuthor(own.author_nick); }
    else ownButton.onclick = openComposer;
    list.appendChild(ownButton);
    [...latest.values()].filter(story => safeNick(story.author_nick) !== safeNick(currentUser()?.nick)).forEach(story => {
      const user = storyUser(story.author_nick), nick = safeNick(story.author_nick), button = document.createElement('button');
      button.type = 'button'; button.className = 'story-chip-v115' + (state.viewed.has(String(story.id)) ? ' seen-v115' : ''); button.setAttribute('aria-label', 'Открыть историю @' + nick);
      button.innerHTML = '<span class="story-chip-ring-v115"><span class="story-chip-avatar-v115"></span></span><span class="story-chip-name-v115"></span>';
      renderAvatar(button.querySelector('.story-chip-avatar-v115'), user); button.querySelector('.story-chip-name-v115').textContent = user.name || nick; button.onclick = () => showStoryByAuthor(nick); list.appendChild(button);
    });
    const status = byId('story-status-v115');
    if (status) { status.hidden = true; status.textContent = ''; }
  }

  async function loadStories(silent = false) {
    const user = currentUser(); if (!user) return;
    ensureUi();
    const result = await sb.from('stories').select('*').gt('expires_at', now()).order('created_at', { ascending: false }).limit(300);
    if (result.error) {
      state.available = false;
      renderStories();
      if (!silent && !/42P01|PGRST204|relation/i.test(String(result.error.code || '') + ' ' + String(result.error.message || ''))) console.warn('Stories unavailable', result.error);
      return;
    }
    state.available = true; state.stories = (result.data || []).filter(story => isStoryMediaUrl(story.media_url));
    const nicks = [...new Set(state.stories.map(story => safeNick(story.author_nick)).filter(Boolean))];
    if (nicks.length) {
      const users = await sb.from('users').select('*').in('nick', nicks);
      (users.data || []).forEach(item => { state.users.set(safeNick(item.nick), item); try { userCache[item.nick] = item; } catch (_) {} });
    }
    const ids = state.stories.map(story => story.id).filter(Boolean);
    state.viewed = new Set();
    if (ids.length) {
      const views = await sb.from('story_views').select('story_id').eq('viewer_nick', user.nick).in('story_id', ids);
      (views.data || []).forEach(item => state.viewed.add(String(item.story_id)));
    }
    await loadStoryLikes(ids, user);
    renderStories();
  }

  async function loadStoryLikes(ids, user = currentUser()) {
    state.likes = new Map(); state.liked = new Set();
    ids.forEach(id => state.likes.set(String(id), 0));
    if (!ids.length || !user) return;
    const request = ++state.likesRequest;
    const result = await sb.from('story_likes').select('story_id,liker_nick').in('story_id', ids);
    if (request !== state.likesRequest || result.error) return;
    (result.data || []).forEach(row => {
      const key = String(row.story_id);
      state.likes.set(key, (state.likes.get(key) || 0) + 1);
      if (safeNick(row.liker_nick) === safeNick(user.nick)) state.liked.add(key);
    });
  }

  function openComposer() {
    if (!currentUser()) { showToast?.('Сначала войди в аккаунт'); return; }
    ensureUi(); resetComposer(); byId('story-compose-v115').classList.add('open-v115'); byId('story-file-input-v115').focus();
  }
  function closeComposer() { byId('story-compose-v115')?.classList.remove('open-v115'); resetComposer(); }
  function resetComposer() {
    state.selectedFile = null; if (state.selectedPreviewUrl) URL.revokeObjectURL(state.selectedPreviewUrl); state.selectedPreviewUrl = '';
    const drop = byId('story-file-drop-v115'); if (drop) { drop.classList.remove('has-file-v115'); drop.innerHTML = '<input id="story-file-input-v115" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" hidden><span class="story-file-placeholder-v115"><strong>＋ Выбери фото или видео</strong><span>Фото до 12 МБ · видео до 50 МБ и 60 секунд</span></span>'; byId('story-file-input-v115').onchange = handleFile; }
    const caption = byId('story-caption-input-v115'); if (caption) caption.value = '';
    const publish = byId('story-compose-publish-v115'); if (publish) { publish.disabled = true; publish.textContent = 'Опубликовать'; publish.onclick = publishStory; }
  }
  async function handleFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (file.type.startsWith('image/')) { if (file.size > MAX_IMAGE) { showToast?.('Фото слишком большое — максимум 12 МБ'); return; } }
    else if (file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO) { showToast?.('Видео слишком большое — максимум 50 МБ'); return; }
      const url = URL.createObjectURL(file); const video = document.createElement('video'); video.preload = 'metadata';
      const valid = await new Promise(resolve => { const done = value => { URL.revokeObjectURL(url); resolve(value); }; video.onloadedmetadata = () => done(Number.isFinite(video.duration) && video.duration <= MAX_VIDEO_SECONDS + .1); video.onerror = () => done(false); video.src = url; });
      if (!valid) { showToast?.('Видео должно быть не длиннее 60 секунд'); return; }
    } else { showToast?.('Выбери фото или видео'); return; }
    state.selectedFile = file; state.selectedPreviewUrl = URL.createObjectURL(file);
    const drop = byId('story-file-drop-v115'); if (!drop) return; drop.classList.add('has-file-v115'); drop.replaceChildren();
    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img'); media.src = state.selectedPreviewUrl; media.alt = 'Предпросмотр истории'; if (media.tagName === 'VIDEO') { media.muted = true; media.loop = true; media.playsInline = true; media.autoplay = true; }
    drop.appendChild(media); const publish = byId('story-compose-publish-v115'); if (publish) publish.disabled = false;
  }

  function fileExtension(file) { const type = String(file.type || '').toLowerCase(); if (type === 'video/webm') return 'webm'; if (type === 'video/quicktime') return 'mov'; if (type === 'video/mp4') return 'mp4'; if (type === 'image/png') return 'png'; if (type === 'image/webp') return 'webp'; return 'jpg'; }
  async function publishStory() {
    const user = currentUser(), file = state.selectedFile, button = byId('story-compose-publish-v115'); if (!user || !file || state.loading) return;
    state.loading = true; button.disabled = true; button.textContent = 'Публикуем…';
    try {
      const path = safeNick(user.nick) + '/' + now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + fileExtension(file);
      const upload = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (upload.error) throw upload.error;
      const publicUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const inserted = await sb.from('stories').insert({ author_nick: user.nick, media_type: file.type.startsWith('video/') ? 'video' : 'image', media_url: publicUrl, caption: String(byId('story-caption-input-v115')?.value || '').trim().slice(0, 180), created_at: now(), expires_at: now() + STORY_TTL }).select('*').single();
      if (inserted.error) { await sb.storage.from(BUCKET).remove([path]); throw inserted.error; }
      closeComposer(); showToast?.('История опубликована ✨'); await loadStories(true);
    } catch (error) {
      const message = String(error?.message || error?.code || ''); showToast?.(/42P01|PGRST204|stories/i.test(message) ? 'Сначала выполни SQL для историй' : 'Не удалось опубликовать историю');
    } finally { state.loading = false; if (button) { button.disabled = !state.selectedFile; button.textContent = 'Опубликовать'; } }
  }

  function showStoryByAuthor(nick) { const items = state.stories.filter(story => safeNick(story.author_nick) === safeNick(nick)); if (!items.length) return; state.viewerItems = items; state.viewerIndex = 0; byId('story-viewer-v115').classList.add('open-v115'); showStory(0); }
  async function showStory(index) {
    if (!state.viewerItems.length) return; state.viewerIndex = Math.max(0, Math.min(state.viewerItems.length - 1, index));
    const story = state.viewerItems[state.viewerIndex], user = storyUser(story.author_nick); renderAvatar(byId('story-head-avatar-v115'), user); byId('story-head-name-v115').textContent = user.name || story.author_nick; byId('story-head-time-v115').textContent = formatStoryTime(story.created_at) + ' · ' + formatRemaining(story.expires_at); byId('story-caption-v115').textContent = story.caption || '';
    const progress = byId('story-progress-v115'); progress.replaceChildren(); state.viewerItems.forEach((_, i) => { const bar = document.createElement('span'); if (i === state.viewerIndex) bar.className = 'active-v115'; progress.appendChild(bar); });
    byId('story-prev-v115').hidden = state.viewerIndex === 0; byId('story-next-v115').hidden = state.viewerIndex === state.viewerItems.length - 1;
    const stage = byId('story-stage-v115'); stage.querySelectorAll('img,video,.story-backdrop-v116').forEach(node => node.remove()); stage.classList.toggle('video-v116', story.media_type === 'video'); const backdrop = document.createElement('div'); backdrop.className = 'story-backdrop-v116'; backdrop.style.backgroundImage = 'url(' + JSON.stringify(story.media_url) + ')'; stage.insertBefore(backdrop, byId('story-prev-v115')); const media = document.createElement(story.media_type === 'video' ? 'video' : 'img'); media.src = story.media_url; media.alt = 'История ' + (user.name || story.author_nick); if (media.tagName === 'VIDEO') { media.controls = true; media.playsInline = true; media.autoplay = true; media.addEventListener('error', () => showToast?.('Видео истории недоступно')); } stage.insertBefore(media, byId('story-prev-v115'));
    const own = safeNick(story.author_nick) === safeNick(currentUser()?.nick); const viewButton = byId('story-views-btn-v115'); viewButton.hidden = !own; byId('story-add-more-v115').hidden = !own; byId('story-delete-v115').hidden = !own; byId('story-viewers-v115').classList.remove('open-v115'); renderLikeControl(story);
    if (own) { const views = await loadViewers(story.id); viewButton.textContent = '👁 ' + views.length + ' просмотров'; }
    else markStoryViewed(story);
  }
  function renderLikeControl(story) {
    const button = byId('story-like-v116'), count = byId('story-like-count-v116'); if (!button || !story) return;
    const key = String(story.id), active = state.liked.has(key), total = state.likes.get(key) || 0;
    button.textContent = active ? '♥' : '♡'; button.classList.toggle('liked-v116', active); button.setAttribute('aria-pressed', String(active)); button.setAttribute('aria-label', active ? 'Убрать лайк' : 'Поставить лайк');
    if (count) count.textContent = String(total);
  }
  async function toggleStoryLike() {
    const story = state.viewerItems[state.viewerIndex], user = currentUser(), button = byId('story-like-v116'); if (!story || !user || !button || button.disabled) return;
    const key = String(story.id), wasLiked = state.liked.has(key), previousCount = state.likes.get(key) || 0;
    if (wasLiked) { state.liked.delete(key); state.likes.set(key, Math.max(0, previousCount - 1)); }
    else { state.liked.add(key); state.likes.set(key, previousCount + 1); }
    renderLikeControl(story); button.disabled = true;
    const result = wasLiked
      ? await sb.from('story_likes').delete().eq('story_id', story.id).eq('liker_nick', user.nick)
      : await sb.from('story_likes').insert({ story_id: story.id, liker_nick: user.nick });
    button.disabled = false;
    if (result.error) {
      if (wasLiked) state.liked.add(key); else state.liked.delete(key);
      state.likes.set(key, previousCount); renderLikeControl(story);
      showToast?.(/42P01|PGRST204|story_likes|relation/i.test(String(result.error.code || '') + ' ' + String(result.error.message || '')) ? 'Лайки ещё не включены на сервере' : 'Не удалось сохранить лайк');
      return;
    }
    showToast?.(wasLiked ? 'Лайк убран' : 'Истории поставлен лайк ❤️');
  }
  function closeViewer() { byId('story-viewer-v115')?.classList.remove('open-v115'); byId('story-stage-v115')?.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); }); }
  function storagePathFromStoryUrl(value) {
    try { const url = new URL(String(value || '')); const marker = '/storage/v1/object/public/' + BUCKET + '/'; const index = url.pathname.indexOf(marker); return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)) : ''; } catch (_) { return ''; }
  }
  async function deleteCurrentStory() {
    const story = state.viewerItems[state.viewerIndex], user = currentUser(); if (!story || !user || safeNick(story.author_nick) !== safeNick(user.nick)) return;
    if (typeof confirm === 'function' && !confirm('Удалить эту историю?')) return;
    const button = byId('story-delete-v115'); if (button) { button.disabled = true; button.textContent = 'Удаляем…'; }
    const result = await sb.from('stories').delete().eq('id', story.id).eq('author_nick', user.nick);
    if (result.error) { if (button) { button.disabled = false; button.textContent = '🗑 Удалить'; } showToast?.('Не удалось удалить историю'); return; }
    const path = storagePathFromStoryUrl(story.media_url); if (path) await sb.storage.from(BUCKET).remove([path]).catch(() => {});
    state.stories = state.stories.filter(item => String(item.id) !== String(story.id));
    state.viewerItems = state.viewerItems.filter(item => String(item.id) !== String(story.id));
    if (!state.viewerItems.length) { closeViewer(); } else { state.viewerIndex = Math.min(state.viewerIndex, state.viewerItems.length - 1); await showStory(state.viewerIndex); }
    renderStories(); showToast?.('История удалена');
  }
  async function markStoryViewed(story) {
    const user = currentUser(); if (!user || safeNick(story.author_nick) === safeNick(user.nick) || state.viewed.has(String(story.id))) return;
    state.viewed.add(String(story.id)); renderStories(); await sb.from('story_views').upsert({ story_id: story.id, viewer_nick: user.nick, viewed_at: now() }, { onConflict: 'story_id,viewer_nick', ignoreDuplicates: true });
  }
  async function loadViewers(storyId) {
    const request = ++state.viewsRequest; const result = await sb.from('story_views').select('viewer_nick,viewed_at').eq('story_id', storyId).order('viewed_at', { ascending: false }).limit(500); if (request !== state.viewsRequest || result.error) return [];
    const nicks = [...new Set((result.data || []).map(row => safeNick(row.viewer_nick)).filter(Boolean))]; if (nicks.length) { const users = await sb.from('users').select('*').in('nick', nicks); (users.data || []).forEach(user => state.users.set(safeNick(user.nick), user)); }
    const rows = (result.data || []).map(row => ({ ...row, user: storyUser(row.viewer_nick) })); state.viewerViews.set(String(storyId), rows); return rows;
  }
  async function toggleViewers() {
    const story = state.viewerItems[state.viewerIndex]; if (!story) return; const box = byId('story-viewers-v115'); if (box.classList.contains('open-v115')) { box.classList.remove('open-v115'); return; }
    const rows = state.viewerViews.get(String(story.id)) || await loadViewers(story.id); box.replaceChildren(); if (!rows.length) { box.innerHTML = '<div class="story-empty-v115">Пока никто не посмотрел</div>'; box.classList.add('open-v115'); return; }
    rows.forEach(row => { const item = document.createElement('div'); item.className = 'story-viewer-row-v115'; const av = document.createElement('div'); av.className = 'av'; renderAvatar(av, row.user); const copy = document.createElement('div'); copy.className = 'story-viewer-copy-v115'; const name = document.createElement('div'); name.className = 'story-viewer-name-v115'; name.textContent = row.user.name || row.viewer_nick; const time = document.createElement('div'); time.className = 'story-viewer-time-v115'; time.textContent = formatStoryTime(row.viewed_at); copy.append(name, time); item.append(av, copy); box.appendChild(item); }); box.classList.add('open-v115');
  }

  function subscribe() { if (state.realtime || !currentUser()) return; state.realtime = sb.channel('stories-v115-' + currentUser().nick).on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => loadStories(true)).on('postgres_changes', { event: '*', schema: 'public', table: 'story_likes' }, () => loadStories(true)).subscribe(); state.refreshTimer = setInterval(() => loadStories(true), 60000); }
  function init() { ensureUi(); if (!currentUser()) return; state.initialized = true; loadStories(false); subscribe(); }
  const previousLogin = window.doLogin;
  if (typeof previousLogin === 'function' && !previousLogin.storiesWrappedV115) { const wrapped = async function (...args) { const result = await previousLogin.apply(this, args); if (currentUser()) init(); return result; }; wrapped.storiesWrappedV115 = true; window.doLogin = wrapped; }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeComposer(); closeViewer(); } });
  window.telechatStoriesV115 = Object.freeze({ init, refresh: loadStories, openComposer, closeComposer, openViewer: showStoryByAuthor });
  ensureUi();
})();
