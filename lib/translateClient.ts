const memoryCache = new Map<string, Map<string, string>>();
const CACHE_KEY = 'elk_translations_v1';

function loadLocalStorageCache(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalStorageCache(store: Record<string, Record<string, string>>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch (e) {}
}

export async function translateTextClient(text: string, target: string): Promise<string> {
  if (!text) return '';
  const key = text;
  const inner = memoryCache.get(key);
  if (inner && inner.get(target)) return inner.get(target)!;

  // check localStorage
  try {
    const store = loadLocalStorageCache();
    if (store[text] && store[text][target]) {
      const m = memoryCache.get(key) || new Map();
      m.set(target, store[text][target]);
      memoryCache.set(key, m);
      return store[text][target];
    }
  } catch (e) {}

  // call server translate route
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    });
    const json = await res.json();
    const translated = (json && (json.translated || json.translatedText)) || text;

    // cache
    const m = memoryCache.get(key) || new Map();
    m.set(target, translated);
    memoryCache.set(key, m);

    try {
      const store = loadLocalStorageCache();
      store[text] = store[text] || {};
      store[text][target] = translated;
      saveLocalStorageCache(store);
    } catch (e) {}

    return translated;
  } catch (e) {
    return text;
  }
}

export function getCachedTranslation(text: string, target: string): string | null {
  const m = memoryCache.get(text);
  if (m && m.get(target)) return m.get(target)!;
  try {
    const store = loadLocalStorageCache();
    if (store[text] && store[text][target]) return store[text][target];
  } catch (e) {}
  return null;
}
