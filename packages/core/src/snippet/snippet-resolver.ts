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
  /** When true, attempts source-map fallback after the dev server fails. */
  sourceMapEnabled?: boolean;
  /**
   * Pre-baked snippet content keyed by `filePath`. Checked first, before
   * the dev server / source map. Lets demo / playground surfaces deliver
   * working snippets without needing a backend.
   */
  staticSnippets?: Record<string, Pick<SourceSnippet, 'language' | 'lines'> & { startLine?: number }>;
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

  const stat = opts.staticSnippets?.[opts.filePath];
  if (stat) {
    const startLine = stat.startLine ?? 1;
    const snippet: SourceSnippet = {
      startLine,
      endLine: startLine + stat.lines.length - 1,
      targetLine: opts.line,
      lines: stat.lines,
      language: stat.language,
      source: 'devserver',
    };
    lruTouch(key, snippet);
    return snippet;
  }

  const fromServer = await fetchFromDevServer(opts);
  if (fromServer) {
    lruTouch(key, fromServer);
    return fromServer;
  }

  // Source-map fallback (opt-in; default off). Lazy-imported so projects that
  // don't enable it never pay the @jridgewell/trace-mapping bundle cost.
  if (opts.sourceMapEnabled) {
    try {
      const mod = await import('./sourcemap-resolver.js');
      const fromMap = await mod.resolveFromSourceMap({
        filePath: opts.filePath,
        line: opts.line,
        context: opts.context,
        fetcher: opts.fetcher,
      });
      if (fromMap) {
        lruTouch(key, fromMap);
        return fromMap;
      }
    } catch {
      // sourcemap-resolver failed (network, parse error). Fall through.
    }
  }

  // Negative-cache the miss so we don't re-fetch on every popover open.
  lruTouch(key, null);
  return null;
}
