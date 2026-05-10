// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encode } from '@jridgewell/sourcemap-codec';
import {
  clearParsedCache,
  setRawMapBackendForTesting,
  getRawMapBackend,
} from '../cache';
import { resolveFromSourceMap } from '../sourcemap-resolver';

function makeMap(sourcePath: string, sourceContent: string): string {
  // Minimal source map with one mapping; tracer needs `sources` and
  // `sourcesContent` to extract the snippet.
  return JSON.stringify({
    version: 3,
    sources: [sourcePath],
    sourcesContent: [sourceContent],
    mappings: encode([[]]),
    names: [],
  });
}

const FIXTURE_SOURCE = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');

beforeEach(() => {
  clearParsedCache();
  setRawMapBackendForTesting(null); // reset to default memory backend
  document.head.innerHTML = '';
});

describe('resolveFromSourceMap', () => {
  it('returns null when no <script src> tags are present', async () => {
    const fetcher = vi.fn();
    const result = await resolveFromSourceMap({
      filePath: 'src/A.tsx',
      line: 1,
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches the .map adjacent to a loaded <script> and extracts a snippet', async () => {
    document.head.innerHTML = '<script src="https://example.com/assets/index.js"></script>';
    const mapText = makeMap('src/A.tsx', FIXTURE_SOURCE);
    const fetcher = vi.fn().mockResolvedValue(
      new Response(mapText, { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const result = await resolveFromSourceMap({
      filePath: 'src/A.tsx',
      line: 5,
      context: 1,
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('sourcemap');
    expect(result!.startLine).toBe(4);
    expect(result!.endLine).toBe(6);
    expect(result!.lines).toEqual(['line 4', 'line 5', 'line 6']);
    expect(fetcher).toHaveBeenCalledWith('https://example.com/assets/index.js.map');
  });

  it('cache-hits on second call (parsed map reused)', async () => {
    document.head.innerHTML = '<script src="https://example.com/assets/index.js"></script>';
    const fetcher = vi.fn().mockResolvedValue(
      new Response(makeMap('src/A.tsx', FIXTURE_SOURCE), { status: 200 }),
    );
    await resolveFromSourceMap({
      filePath: 'src/A.tsx',
      line: 1,
      fetcher: fetcher as unknown as typeof fetch,
    });
    await resolveFromSourceMap({
      filePath: 'src/A.tsx',
      line: 2,
      fetcher: fetcher as unknown as typeof fetch,
    });
    // Same map URL, second call hits the raw cache → no second fetch.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('negative-caches 404s so a failed map URL is not re-fetched', async () => {
    document.head.innerHTML = '<script src="https://example.com/assets/index.js"></script>';
    const fetcher = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }));
    await resolveFromSourceMap({
      filePath: 'src/A.tsx',
      line: 1,
      fetcher: fetcher as unknown as typeof fetch,
    });
    await resolveFromSourceMap({
      filePath: 'src/A.tsx',
      line: 1,
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('matches by source-path tail when the map uses a different prefix', async () => {
    document.head.innerHTML = '<script src="https://example.com/assets/index.js"></script>';
    const fetcher = vi.fn().mockResolvedValue(
      new Response(makeMap('/abs/build/src/components/Button.tsx', FIXTURE_SOURCE), { status: 200 }),
    );
    const result = await resolveFromSourceMap({
      filePath: 'src/components/Button.tsx',
      line: 3,
      context: 0,
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).not.toBeNull();
    expect(result!.lines).toEqual(['line 3']);
  });
});

describe('cache backend', () => {
  it('returns a working memory backend when chrome.storage.session is absent', async () => {
    setRawMapBackendForTesting(null);
    const backend = getRawMapBackend();
    expect(await backend.get('foo')).toBeUndefined();
    await backend.set('foo', 'bar');
    expect(await backend.get('foo')).toBe('bar');
    await backend.setNotFound('missing');
    expect(await backend.get('missing')).toBe('not-found');
    await backend.clear();
    expect(await backend.get('foo')).toBeUndefined();
  });
});
