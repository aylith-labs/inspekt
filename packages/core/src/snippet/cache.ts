// Caches for the source-map resolver.
//
// Two layers:
//   1. In-memory parsed-map LRU (max 5). Holds parsed TraceMap instances —
//      these are heap-heavy (large pre-decoded mappings), so we keep the
//      bound small.
//   2. Raw-map text cache. When running inside the Chrome extension we
//      delegate to chrome.storage.session (per-session, ~10MB quota,
//      shared across tabs in the extension context). When running outside
//      the extension (e.g. unit tests, server-side use), we fall back to
//      an in-memory Map.

const PARSED_LIMIT = 5;
const RAW_QUOTA_BYTES = 9 * 1024 * 1024;

// Generic-typed parsed-map cache. We can't pin TraceMap here without forcing
// @jridgewell/trace-mapping into the bundle even when unused, so the cache
// stores `unknown` and callers type-assert.
const parsed = new Map<string, unknown>();

export function getParsedMap(key: string): unknown {
  const v = parsed.get(key);
  if (v !== undefined) {
    // LRU touch.
    parsed.delete(key);
    parsed.set(key, v);
  }
  return v;
}

export function setParsedMap(key: string, value: unknown): void {
  if (parsed.has(key)) parsed.delete(key);
  parsed.set(key, value);
  if (parsed.size > PARSED_LIMIT) {
    const oldest = parsed.keys().next().value;
    if (oldest !== undefined) parsed.delete(oldest);
  }
}

export function clearParsedCache(): void {
  parsed.clear();
}

// Raw-map cache. We expose a small async interface and pick the backend at
// runtime based on what's available.

export interface RawMapBackend {
  get(key: string): Promise<string | 'not-found' | undefined>;
  set(key: string, value: string): Promise<void>;
  setNotFound(key: string): Promise<void>;
  clear(): Promise<void>;
}

class MemoryBackend implements RawMapBackend {
  private store = new Map<string, string | 'not-found'>();
  async get(key: string): Promise<string | 'not-found' | undefined> {
    return this.store.get(key);
  }
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async setNotFound(key: string): Promise<void> {
    this.store.set(key, 'not-found');
  }
  async clear(): Promise<void> {
    this.store.clear();
  }
}

// Detect chrome.storage.session at module init; fall back to memory otherwise.
function hasChromeSession(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.storage !== 'undefined' &&
      typeof chrome.storage.session !== 'undefined'
    );
  } catch {
    return false;
  }
}

const PREFIX_HIT = 'inspekt-mapcache:';
const PREFIX_MISS = 'inspekt-notfound:';

class ChromeSessionBackend implements RawMapBackend {
  async get(key: string): Promise<string | 'not-found' | undefined> {
    const hitKey = PREFIX_HIT + key;
    const missKey = PREFIX_MISS + key;
    const res = await chrome.storage.session.get([hitKey, missKey]);
    if (res[missKey]) return 'not-found';
    const entry = res[hitKey];
    if (typeof entry === 'string') return entry;
    return undefined;
  }
  async set(key: string, value: string): Promise<void> {
    await this.evictIfNeeded(value.length);
    await chrome.storage.session.set({ [PREFIX_HIT + key]: value });
  }
  async setNotFound(key: string): Promise<void> {
    await chrome.storage.session.set({ [PREFIX_MISS + key]: true });
  }
  async clear(): Promise<void> {
    const all = await chrome.storage.session.get(null);
    const inspektKeys = Object.keys(all).filter(
      (k) => k.startsWith(PREFIX_HIT) || k.startsWith(PREFIX_MISS),
    );
    if (inspektKeys.length > 0) await chrome.storage.session.remove(inspektKeys);
  }

  private async evictIfNeeded(incomingBytes: number): Promise<void> {
    const used = await chrome.storage.session.getBytesInUse(null);
    if (used + incomingBytes < RAW_QUOTA_BYTES) return;
    // Evict every hit entry (cheap heuristic — source maps are infrequent).
    const all = await chrome.storage.session.get(null);
    const hits = Object.keys(all).filter((k) => k.startsWith(PREFIX_HIT));
    if (hits.length > 0) await chrome.storage.session.remove(hits);
  }
}

let backend: RawMapBackend | null = null;

export function getRawMapBackend(): RawMapBackend {
  if (!backend) {
    backend = hasChromeSession() ? new ChromeSessionBackend() : new MemoryBackend();
  }
  return backend;
}

// Test seam: lets unit tests swap the backend without monkey-patching globals.
export function setRawMapBackendForTesting(b: RawMapBackend | null): void {
  backend = b;
}

export async function clearRawMapCache(): Promise<void> {
  await getRawMapBackend().clear();
}
