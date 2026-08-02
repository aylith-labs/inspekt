import { appendFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GrabQueue, ulid } from '../queue';
import type { SerializedElement } from '../types';

function fakeElement(over: Partial<SerializedElement> = {}): SerializedElement {
  return {
    filePath: 'src/Button.tsx',
    line: 42,
    column: 5,
    componentName: 'Button',
    tagName: 'button',
    classList: ['btn'],
    id: null,
    ...over,
  };
}

let dir: string;
let queuePath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'inspekt-queue-test-'));
  queuePath = path.join(dir, 'queue.jsonl');
});

describe('ulid', () => {
  it('returns 26-char IDs', () => {
    const a = ulid();
    expect(a.length).toBe(26);
    expect(a).toMatch(/^[0-9A-Z]{26}$/);
  });

  it('time-prefixes are sortable across millisecond boundaries', async () => {
    const a = ulid();
    await new Promise((r) => setTimeout(r, 5));
    const b = ulid();
    // Compare just the 10-char time prefix — random suffix is non-monotonic
    // within the same millisecond but the time component must increase.
    expect(a.slice(0, 10) <= b.slice(0, 10)).toBe(true);
  });
});

describe('GrabQueue', () => {
  it('appends and reads back grabs', async () => {
    const q = new GrabQueue(queuePath);
    const saved = await q.append({
      url: 'https://example.com',
      element: fakeElement(),
      source: 'extension',
    });
    expect(saved.id).toBeTruthy();
    expect(saved.timestamp).toBeGreaterThan(0);
    const list = await q.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.element.filePath).toBe('src/Button.tsx');
  });

  it('orders grabs by insertion (FIFO)', async () => {
    const q = new GrabQueue(queuePath);
    await q.append({ url: 'a', element: fakeElement({ line: 1 }), source: 'extension' });
    await q.append({ url: 'b', element: fakeElement({ line: 2 }), source: 'extension' });
    await q.append({ url: 'c', element: fakeElement({ line: 3 }), source: 'extension' });
    const list = await q.list();
    expect(list.map((g) => g.url)).toEqual(['a', 'b', 'c']);
  });

  it('filters by since', async () => {
    const q = new GrabQueue(queuePath);
    await q.append({ url: 'old', element: fakeElement(), source: 'extension' });
    const mid = Date.now();
    await new Promise((r) => setTimeout(r, 5));
    await q.append({ url: 'new', element: fakeElement(), source: 'extension' });
    const list = await q.list({ since: mid });
    expect(list).toHaveLength(1);
    expect(list[0]!.url).toBe('new');
  });

  it('clamps to limit, returning the most recent N', async () => {
    const q = new GrabQueue(queuePath);
    for (let i = 0; i < 5; i++) {
      await q.append({ url: String(i), element: fakeElement(), source: 'extension' });
    }
    const list = await q.list({ limit: 2 });
    expect(list).toHaveLength(2);
    expect(list.map((g) => g.url)).toEqual(['3', '4']);
  });

  it('clamps a negative limit to empty instead of slicing from the wrong end', async () => {
    const queue = new GrabQueue(queuePath);
    for (const url of ['a', 'b', 'c']) {
      await queue.append({ url, element: fakeElement(), source: 'extension' });
    }
    expect(await queue.list({ limit: -2 })).toEqual([]);
    expect(await queue.list({ limit: 0 })).toEqual([]);
  });

  it('floors a fractional limit', async () => {
    const queue = new GrabQueue(queuePath);
    for (const url of ['a', 'b', 'c']) {
      await queue.append({ url, element: fakeElement(), source: 'extension' });
    }
    const list = await queue.list({ limit: 2.7 });
    expect(list.map((grab) => grab.url)).toEqual(['b', 'c']);
  });

  it('skips corrupt lines rather than failing the whole read', async () => {
    const queue = new GrabQueue(queuePath);
    await queue.append({ url: 'good', element: fakeElement(), source: 'extension' });
    appendFileSync(queuePath, 'this line is not json\n', 'utf8');
    await queue.append({ url: 'also-good', element: fakeElement(), source: 'extension' });
    const list = await queue.list();
    expect(list.map((grab) => grab.url)).toEqual(['good', 'also-good']);
  });

  it('creates the queue file and its parent directory on construction', () => {
    const nested = path.join(dir, 'a', 'b', 'queue.jsonl');
    new GrabQueue(nested);
    expect(existsSync(nested)).toBe(true);
  });

  it('markProcessed reports false for an unknown id', async () => {
    const queue = new GrabQueue(queuePath);
    await queue.append({ url: 'x', element: fakeElement(), source: 'extension' });
    expect(await queue.markProcessed('NOT-A-REAL-ID')).toBe(false);
  });

  it('returns the latest grab', async () => {
    const q = new GrabQueue(queuePath);
    await q.append({ url: 'first', element: fakeElement(), source: 'extension' });
    await q.append({ url: 'second', element: fakeElement(), source: 'extension' });
    const latest = await q.latest();
    expect(latest?.url).toBe('second');
  });

  it('marks a grab processed by id', async () => {
    const q = new GrabQueue(queuePath);
    const saved = await q.append({ url: 'x', element: fakeElement(), source: 'extension' });
    const mutated = await q.markProcessed(saved.id);
    expect(mutated).toBe(true);
    const re = await q.getById(saved.id);
    expect(re?.processedAt).toBeGreaterThan(0);
    // Idempotent: second mark is a no-op.
    expect(await q.markProcessed(saved.id)).toBe(false);
  });

  it('clears all grabs', async () => {
    const q = new GrabQueue(queuePath);
    await q.append({ url: 'a', element: fakeElement(), source: 'extension' });
    await q.append({ url: 'b', element: fakeElement(), source: 'extension' });
    await q.clear();
    expect(await q.list()).toEqual([]);
  });

  it('tolerates concurrent appends via lockfile', async () => {
    const q = new GrabQueue(queuePath);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        q.append({ url: String(i), element: fakeElement(), source: 'extension' }),
      ),
    );
    const list = await q.list();
    expect(list).toHaveLength(10);
  });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});
