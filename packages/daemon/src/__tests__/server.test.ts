import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from '../server';
import type { Grab, SerializedElement } from '../types';

const TOKEN = 'test-token-abcdef';

function fakeElement(): SerializedElement {
  return {
    filePath: 'src/Button.tsx',
    line: 42,
    column: 5,
    componentName: 'Button',
    tagName: 'button',
    classList: ['btn'],
    id: null,
  };
}

function authedHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'X-Inspekt-Token': TOKEN, 'Content-Type': 'application/json', ...extra };
}

let dir: string;
let queuePath: string;
let app: ReturnType<typeof createServer>;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'inspekt-server-test-'));
  queuePath = path.join(dir, 'queue.jsonl');
  app = createServer({
    token: TOKEN,
    host: '127.0.0.1',
    port: 0,
    queuePath,
  });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('GET /__inspekt/daemon', () => {
  it('returns capability info without auth (used by the public probe)', async () => {
    const res = await app.request('/__inspekt/daemon');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; mcp: boolean };
    expect(body.ok).toBe(true);
    expect(body.mcp).toBe(true);
  });

  it('answers HEAD for fast probes', async () => {
    const res = await app.request('/__inspekt/daemon', { method: 'HEAD' });
    expect(res.status).toBe(200);
  });
});

describe('POST /__inspekt/grab', () => {
  it('rejects requests without a matching token', async () => {
    const res = await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://x', element: fakeElement(), source: 'extension' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects malformed payloads', async () => {
    const res = await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ url: 'no element' }),
    });
    expect(res.status).toBe(400);
  });

  it('persists a grab and returns it with id + timestamp', async () => {
    const res = await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ url: 'http://x', element: fakeElement(), source: 'extension' }),
    });
    expect(res.status).toBe(201);
    const grab = (await res.json()) as Grab;
    expect(grab.id).toBeTruthy();
    expect(grab.timestamp).toBeGreaterThan(0);
  });
});

describe('GET /__inspekt/queue', () => {
  it('rejects without a token', async () => {
    const res = await app.request('/__inspekt/queue');
    expect(res.status).toBe(401);
  });

  it('returns persisted grabs in insertion order', async () => {
    for (const url of ['a', 'b', 'c']) {
      await app.request('/__inspekt/grab', {
        method: 'POST',
        headers: authedHeaders(),
        body: JSON.stringify({ url, element: fakeElement(), source: 'extension' }),
      });
    }
    const res = await app.request('/__inspekt/queue', { headers: authedHeaders() });
    const body = (await res.json()) as { grabs: Grab[] };
    expect(body.grabs.map((g) => g.url)).toEqual(['a', 'b', 'c']);
  });

  it('respects limit param', async () => {
    for (let i = 0; i < 5; i++) {
      await app.request('/__inspekt/grab', {
        method: 'POST',
        headers: authedHeaders(),
        body: JSON.stringify({ url: String(i), element: fakeElement(), source: 'extension' }),
      });
    }
    const res = await app.request('/__inspekt/queue?limit=2', { headers: authedHeaders() });
    const body = (await res.json()) as { grabs: Grab[] };
    expect(body.grabs.map((g) => g.url)).toEqual(['3', '4']);
  });
});

describe('DELETE /__inspekt/queue', () => {
  it('clears the queue', async () => {
    await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ url: 'x', element: fakeElement(), source: 'extension' }),
    });
    const del = await app.request('/__inspekt/queue', { method: 'DELETE', headers: authedHeaders() });
    expect(del.status).toBe(200);
    const list = await app.request('/__inspekt/queue', { headers: authedHeaders() });
    const body = (await list.json()) as { grabs: Grab[] };
    expect(body.grabs).toEqual([]);
  });
});
