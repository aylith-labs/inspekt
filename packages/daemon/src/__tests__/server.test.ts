import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

async function seedGrabs(urls: string[]): Promise<void> {
  for (const url of urls) {
    await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ url, element: fakeElement(), source: 'extension' }),
    });
  }
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

  it('filters by since', async () => {
    await seedGrabs(['old']);
    const cutoff = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await seedGrabs(['new']);
    const res = await app.request(`/__inspekt/queue?since=${cutoff}`, { headers: authedHeaders() });
    const body = (await res.json()) as { grabs: Grab[] };
    expect(body.grabs.map((grab) => grab.url)).toEqual(['new']);
  });

  it('rejects a negative limit rather than returning the oldest grabs', async () => {
    await seedGrabs(['a', 'b', 'c']);
    const res = await app.request('/__inspekt/queue?limit=-2', { headers: authedHeaders() });
    expect(res.status).toBe(400);
  });

  it('rejects a non-numeric since or limit', async () => {
    for (const query of ['since=yesterday', 'limit=all']) {
      const res = await app.request(`/__inspekt/queue?${query}`, { headers: authedHeaders() });
      expect(res.status).toBe(400);
    }
  });

  it('treats limit=0 as an explicit empty page', async () => {
    await seedGrabs(['a', 'b']);
    const res = await app.request('/__inspekt/queue?limit=0', { headers: authedHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { grabs: Grab[] };
    expect(body.grabs).toEqual([]);
  });
});

describe('token gate', () => {
  it('accepts the configured token on every mutating route', async () => {
    const grab = await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ url: 'http://x', element: fakeElement(), source: 'extension' }),
    });
    expect(grab.status).toBe(201);
    expect((await app.request('/__inspekt/queue', { headers: authedHeaders() })).status).toBe(200);
    expect(
      (await app.request('/__inspekt/queue', { method: 'DELETE', headers: authedHeaders() }))
        .status,
    ).toBe(200);
  });

  it('rejects a wrong token on every mutating route', async () => {
    const wrong = { 'X-Inspekt-Token': 'not-the-token', 'Content-Type': 'application/json' };
    expect(
      (
        await app.request('/__inspekt/grab', {
          method: 'POST',
          headers: wrong,
          body: JSON.stringify({ url: 'http://x', element: fakeElement(), source: 'extension' }),
        })
      ).status,
    ).toBe(401);
    expect((await app.request('/__inspekt/queue', { headers: wrong })).status).toBe(401);
    expect(
      (await app.request('/__inspekt/queue', { method: 'DELETE', headers: wrong })).status,
    ).toBe(401);
    expect(
      (await app.request('/__inspekt/open', { method: 'POST', headers: wrong, body: '{}' })).status,
    ).toBe(401);
  });

  it('refuses everything when the server has no token, even a matching empty header', async () => {
    const tokenless = createServer({
      token: '',
      host: '127.0.0.1',
      port: 0,
      queuePath: path.join(dir, 'tokenless.jsonl'),
    });
    const noHeader = await tokenless.request('/__inspekt/queue');
    expect(noHeader.status).toBe(401);
    const emptyHeader = await tokenless.request('/__inspekt/queue', {
      headers: { 'X-Inspekt-Token': '' },
    });
    expect(emptyHeader.status).toBe(401);
  });
});

describe('POST /__inspekt/open', () => {
  it('rejects a request with neither id nor file', async () => {
    const res = await app.request('/__inspekt/open', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('reports an unknown grab id', async () => {
    const res = await app.request('/__inspekt/open', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ id: 'nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects an editor string that would inject a command', async () => {
    const res = await app.request('/__inspekt/open', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ file: 'src/App.tsx', editor: 'sh -c "id"' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: string }).toEqual({ error: 'invalid editor identifier' });
  });
});

describe('DELETE /__inspekt/queue', () => {
  it('clears the queue', async () => {
    await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: authedHeaders(),
      body: JSON.stringify({ url: 'x', element: fakeElement(), source: 'extension' }),
    });
    const del = await app.request('/__inspekt/queue', {
      method: 'DELETE',
      headers: authedHeaders(),
    });
    expect(del.status).toBe(200);
    const list = await app.request('/__inspekt/queue', { headers: authedHeaders() });
    const body = (await list.json()) as { grabs: Grab[] };
    expect(body.grabs).toEqual([]);
  });
});
