// Resolves source snippets for the overlay popover.
//
// Phase 1: dev-server fetch only — when @inspekt/vite is running, hits
// `/__inspekt/snippet?file=&line=&context=` and renders the response.
//
// Phase 5 will extend this with an opt-in source-map fallback for production
// pages and chrome-extension URLs.
//
// All results are cached in memory keyed by `${filePath}:${line}:${context}`.
// LRU bounded so long-running pages don't grow unbounded.

import type { SourceSnippet } from '../types.js';

export interface SnippetResolverOptions {
  filePath: string;
  line: number;
  serverUrl?: string;
  context?: number;
  fetcher?: typeof fetch;
}

const CACHE_LIMIT = 100;
const cache = new Map<string, SourceSnippet | null>();

function cacheKey(opts: SnippetResolverOptions): string {
  return `${opts.filePath}:${opts.line}:${opts.context ?? 5}`;
}

function lruTouch(key: string, value: SourceSnippet | null): void {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function clearSnippetCache(): void {
  cache.clear();
}

async function fetchFromDevServer(opts: SnippetResolverOptions): Promise<SourceSnippet | null> {
  if (!opts.serverUrl) return null;
  const fetcher = opts.fetcher ?? fetch;
  const url = new URL('/__inspekt/snippet', opts.serverUrl);
  url.searchParams.set('file', opts.filePath);
  url.searchParams.set('line', String(opts.line));
  url.searchParams.set('context', String(opts.context ?? 5));
  try {
    const res = await fetcher(url.toString(), { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json()) as Omit<SourceSnippet, 'source'>;
    return { ...data, source: 'devserver' };
  } catch {
    return null;
  }
}

export async function resolveSnippet(
  opts: SnippetResolverOptions,
): Promise<SourceSnippet | null> {
  const key = cacheKey(opts);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const fromServer = await fetchFromDevServer(opts);
  if (fromServer) {
    lruTouch(key, fromServer);
    return fromServer;
  }

  // Negative-cache the miss so we don't re-fetch on every popover open.
  lruTouch(key, null);
  return null;
}
