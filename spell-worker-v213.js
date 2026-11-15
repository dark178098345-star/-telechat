/* Local dictionary only. This worker never sends typed words over the network. */
(() => {
  'use strict';
  let graph = null,
    loading = null,
    edgeBase = 0,
    root = 0;
  const cache = new Map(),
    letters = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
  const accepted = new Set(
    'бро имба имбовый имбовая лол ага ок окей крч щас чё че ахах ахаха хаха хахаха смайлик смайлики смайликов смайликами эмодзи аватарка аватарки аватарку аватарок ник ники ника ников онлайн офлайн геймпад геймпады стрим стримы стримить кэш кеш кеша кэша донат донаты донатить телега телеграм экстрачат екстрачат лагает лаги баг баги багов фиксы пофиксить фича фичи скрин скрины скриншот плейлист плейлисты плейлиста плейлистов'.split(
      ' ',
    ),
  );
  const preferred = new Map(
    Object.entries({
      превет: 'привет',
      привед: 'привет',
      привт: 'привет',
      спосибо: 'спасибо',
      спасиба: 'спасибо',
      пожалуста: 'пожалуйста',
      пожалуистa: 'пожалуйста',
      харашо: 'хорошо',
      харошо: 'хорошо',
      хочю: 'хочу',
      мошно: 'можно',
      кароче: 'короче',
      короч: 'короче',
      обнавление: 'обновление',
      обновлние: 'обновление',
      сообшение: 'сообщение',
      сообщние: 'сообщение',
      реакцыя: 'реакция',
      рекация: 'реакция',
      ошыбка: 'ошибка',
      ошыбки: 'ошибки',
      жывет: 'живет',
      жыву: 'живу',
      севодня: 'сегодня',
      сегодн: 'сегодня',
      зделать: 'сделать',
      сделоть: 'сделать',
      зделай: 'сделай',
      здесьь: 'здесь',
      незнаю: 'не знаю',
      нравиться: 'нравиться',
      лудше: 'лучше',
      луьше: 'лучше',
      крассиво: 'красиво',
      красивыйй: 'красивый',
      клавиатруа: 'клавиатура',
      анимацыя: 'анимация',
      практичиски: 'практически',
      приложние: 'приложение',
      компютер: 'компьютер',
      компьютор: 'компьютер',
      обезательно: 'обязательно',
      некокда: 'некогда',
      вобще: 'вообще',
      вообщем: 'в общем',
      вообше: 'вообще',
      потомуста: 'потому что',
      будующий: 'будущий',
      пороль: 'пароль',
      пороля: 'пароля',
      сьемка: 'съемка',
      тяжало: 'тяжело',
      скочать: 'скачать',
      установитьь: 'установить',
    }),
  );
  const normalize = (word) => word.toLowerCase().replaceAll('ё', 'е');
  async function load() {
    if (graph) return;
    if (loading) return loading;
    loading = (async () => {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('./vendor/spell-v213/ru.trie.gz?v=213', {
          signal: controller.signal,
          credentials: 'omit',
          cache: 'force-cache',
        });
        if (!response.ok) throw Error('Dictionary unavailable');
        let bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > 2000000) throw Error('Dictionary too large');
        if (bytes[0] === 31 && bytes[1] === 139) {
          if (typeof DecompressionStream !== 'function')
            throw Error('Dictionary decoder unavailable');
          bytes = new Uint8Array(
            await new Response(
              new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
            ).arrayBuffer(),
          );
        }
        if (bytes.length > 6000000 || bytes.length % 4) throw Error('Invalid dictionary');
        const data = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4),
          states = data[2],
          edges = data[3];
        if (
          data[0] !== 0x45585350 ||
          data[1] !== 1 ||
          states > 200000 ||
          edges > 500000 ||
          data[4] >= states ||
          data.length !== 5 + states * 2 + edges * 2
        )
          throw Error('Invalid dictionary');
        edgeBase = 5 + states * 2;
        root = data[4];
        graph = data;
      } finally {
        clearTimeout(timer);
      }
    })().catch((error) => {
      loading = null;
      throw error;
    });
    return loading;
  }
  function correct(value) {
    const word = normalize(value);
    if (accepted.has(word) || /^ха(ха)+$/.test(word)) return true;
    let state = root;
    for (let at = 0; at < word.length; at++) {
      const offset = 5 + state * 2,
        start = graph[offset],
        count = graph[offset + 1] >>> 1,
        code = word.charCodeAt(at);
      let low = start,
        high = start + count - 1,
        next = -1;
      while (low <= high) {
        const mid = (low + high) >>> 1,
          edge = edgeBase + mid * 2,
          c = graph[edge];
        if (c === code) {
          next = graph[edge + 1];
          break;
        }
        if (c < code) low = mid + 1;
        else high = mid - 1;
      }
      if (next < 0) return false;
      state = next;
    }
    return !!(graph[6 + state * 2] & 1);
  }
  function changedIndices(word, replacement) {
    const a = normalize(word),
      b = normalize(replacement),
      dp = Array.from({ length: a.length + 1 }, () => new Uint8Array(b.length + 1));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]),
        );
    let i = a.length,
      j = b.length;
    const red = [];
    while (i || j) {
      if (i && j && dp[i][j] === dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])) {
        if (a[i - 1] !== b[j - 1]) red.push(i - 1);
        i--;
        j--;
      } else if (i && dp[i][j] === dp[i - 1][j] + 1) {
        red.push(--i);
      } else j--;
    }
    return red.sort((a, b) => a - b);
  }
  function inspect(value) {
    const word = normalize(value);
    if (cache.has(word)) return cache.get(word);
    if (correct(word)) return { correct: true };
    const candidates = new Set(),
      known = preferred.get(word);
    if (known) candidates.add(known);
    const add = (s) => {
      if (s !== word && correct(s)) candidates.add(s);
    };
    for (let i = 0; i < word.length; i++) {
      add(word.slice(0, i) + word.slice(i + 1));
      if (i + 1 < word.length) add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
      for (const letter of letters) {
        if (letter !== word[i]) add(word.slice(0, i) + letter + word.slice(i + 1));
      }
    }
    if (candidates.size < 5)
      for (let i = 0; i <= word.length; i++)
        for (const letter of letters) add(word.slice(0, i) + letter + word.slice(i));
    const suggestions = [...candidates]
        .sort(
          (a, b) =>
            Number(b === known) - Number(a === known) ||
            Math.abs(a.length - word.length) - Math.abs(b.length - word.length) ||
            a.localeCompare(b, 'ru'),
        )
        .slice(0, 5),
      best = known || (candidates.size === 1 ? suggestions[0] : '');
    const result = { correct: false, suggestions, red: best ? changedIndices(word, best) : [] };
    cache.set(word, result);
    while (cache.size > 256) cache.delete(cache.keys().next().value);
    return result;
  }
  self.onmessage = async (event) => {
    const data = event.data;
    if (data?.type !== 'check' || !Number.isSafeInteger(data.id) || !Array.isArray(data.words))
      return;
    try {
      await load();
      const result = [];
      for (const value of data.words.slice(0, 80)) {
        if (
          typeof value !== 'string' ||
          value.length < 2 ||
          value.length > 32 ||
          !/^[а-яё]+$/i.test(value)
        )
          continue;
        result.push({ word: value, ...inspect(value) });
      }
      self.postMessage({ id: data.id, result, bytes: graph.byteLength });
    } catch (_) {
      self.postMessage({
        id: data.id,
        error: 'Проверка слов сейчас недоступна. Набор и отправка работают как обычно.',
      });
    }
  };
})();
