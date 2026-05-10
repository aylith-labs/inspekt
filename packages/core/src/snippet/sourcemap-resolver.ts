// Source-map fallback for the snippet resolver.
//
// Activates only when sourceMapEnabled=true in the Chrome extension options
// (default off — fetching .map files makes additional network requests
// observable in DevTools/proxies and we don't want to do that without user
// consent). When enabled, we:
//   1. Walk the page's <script src> tags and try to find the source map
//      adjacent to each bundle.
//   2. Fetch the .map file (with a per-session cache).
//   3. Parse it with @jridgewell/trace-mapping.
//   4. Find the original source by matching the desired filePath against the
//      map's `sources[]` array.
//   5. Slice `sourcesContent[index]` around the target line.

import { TraceMap } from '@jridgewell/trace-mapping';
import type { SourceSnippet } from '../types.js';
import {
  getParsedMap,
  setParsedMap,
  getRawMapBackend,
} from './cache.js';

export interface SourceMapResolverOptions {
  filePath: string;
  line: number;
  context?: number;
  fetcher?: typeof fetch;
}

/** Discovers candidate .map URLs from the document's loaded scripts. */
function candidateMapUrls(): string[] {
  if (typeof document === 'undefined') return [];
  const urls: string[] = [];
  for (const script of Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))) {
    const src = script.src;
    if (!src) continue;
    if (src.endsWith('.map')) {
      urls.push(src);
      continue;
    }
    if (src.includes('.js')) {
      urls.push(`${src}.map`);
    }
  }
  return urls;
}

async function fetchRawMap(
  mapUrl: string,
  fetcher: typeof fetch,
): Promise<string | null> {
  const cache = getRawMapBackend();
  const cached = await cache.get(mapUrl);
  if (cached === 'not-found') return null;
  if (typeof cached === 'string') return cached;
  try {
    const res = await fetcher(mapUrl);
    if (!res.ok) {
      await cache.setNotFound(mapUrl);
      return null;
    }
    const text = await res.text();
    await cache.set(mapUrl, text);
    return text;
  } catch {
    await cache.setNotFound(mapUrl);
    return null;
  }
}

function getOrParse(mapUrl: string, raw: string): TraceMap {
  const cached = getParsedMap(mapUrl);
  if (cached) return cached as TraceMap;
  const parsed = new TraceMap(raw);
  setParsedMap(mapUrl, parsed);
  return parsed;
}

function matchSourceIndex(sources: ReadonlyArray<string | null>, target: string): number {
  const normalize = (p: string): string => p.replace(/\\/g, '/').replace(/^\.\//, '');
  const normalizedTarget = normalize(target);
  const tail = normalizedTarget.split('/').slice(-3).join('/');
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s) continue;
    const ns = normalize(s);
    if (ns === normalizedTarget) return i;
    if (ns.endsWith(tail)) return i;
  }
  return -1;
}

export async function resolveFromSourceMap(
  opts: SourceMapResolverOptions,
): Promise<SourceSnippet | null> {
  const fetcher = opts.fetcher ?? fetch;
  const context = opts.context ?? 5;

  for (const mapUrl of candidateMapUrls()) {
    const raw = await fetchRawMap(mapUrl, fetcher);
    if (!raw) continue;
    let map: TraceMap;
    try {
      map = getOrParse(mapUrl, raw);
    } catch {
      continue;
    }
    const sources = map.sources ?? [];
    const idx = matchSourceIndex(sources, opts.filePath);
    if (idx === -1) continue;

    const sourcesContent = map.sourcesContent ?? [];
    const content = sourcesContent[idx];
    if (!content) continue;

    const allLines = content.split('\n');
    if (opts.line < 1 || opts.line > allLines.length) continue;

    const startLine = Math.max(1, opts.line - context);
    const endLine = Math.min(allLines.length, opts.line + context);
    const lines = allLines.slice(startLine - 1, endLine);
    const ext = (opts.filePath.split('.').pop() ?? '').toLowerCase();
    return {
      startLine,
      endLine,
      targetLine: opts.line,
      lines,
      language: ext || 'text',
      source: 'sourcemap',
    };
  }

  return null;
}
