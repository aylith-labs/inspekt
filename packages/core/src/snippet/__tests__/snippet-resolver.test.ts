import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveSnippet, clearSnippetCache } from '../snippet-resolver';

function fakeOk(snippet: { lines: string[]; targetLine: number; startLine: number; endLine: number; language: string }) {
  return new Response(JSON.stringify(snippet), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('resolveSnippet', () => {
  beforeEach(() => {
    clearSnippetCache();
  });

  it('returns null when no serverUrl is configured', async () => {
    const result = await resolveSnippet({ filePath: 'src/A.tsx', line: 1 });
    expect(result).toBeNull();
  });

  it('fetches from the dev-server endpoint and tags source=devserver', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      fakeOk({
        startLine: 3,
        endLine: 7,
        targetLine: 5,
        lines: ['a', 'b', 'c', 'd', 'e'],
        language: 'tsx',
      }),
    );
    const result = await resolveSnippet({
      filePath: 'src/A.tsx',
      line: 5,
      serverUrl: 'http://localhost:5173',
      context: 2,
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('devserver');
    expect(result!.targetLine).toBe(5);
    expect(result!.lines).toHaveLength(5);

    const url = (fetcher.mock.calls[0]?.[0] as string) ?? '';
    expect(url).toContain('/__inspekt/snippet');
    expect(url).toContain('file=src%2FA.tsx');
    expect(url).toContain('line=5');
    expect(url).toContain('context=2');
  });

  it('returns null when the endpoint 404s', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }));
    const result = await resolveSnippet({
      filePath: 'src/Missing.tsx',
      line: 1,
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('refused'));
    const result = await resolveSnippet({
      filePath: 'src/A.tsx',
      line: 1,
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it('cache-hits on repeat calls with the same key', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      fakeOk({ startLine: 1, endLine: 3, targetLine: 2, lines: ['a', 'b', 'c'], language: 'tsx' }),
    );
    await resolveSnippet({
      filePath: 'src/A.tsx',
      line: 2,
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    await resolveSnippet({
      filePath: 'src/A.tsx',
      line: 2,
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('negative-caches misses so a 404 does not re-fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    await resolveSnippet({
      filePath: 'src/Gone.tsx',
      line: 1,
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    await resolveSnippet({
      filePath: 'src/Gone.tsx',
      line: 1,
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
