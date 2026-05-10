import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, type Server } from 'node:http';
import { handleSnippetRequest, handleCapabilitiesRequest, corsMiddleware } from '../server';

let projectRoot: string;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  projectRoot = mkdtempSync(path.join(tmpdir(), 'inspekt-server-test-'));
  mkdirSync(path.join(projectRoot, 'src'), { recursive: true });

  // Fixture: 10 numbered lines.
  writeFileSync(
    path.join(projectRoot, 'src/Button.tsx'),
    Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n'),
    'utf8',
  );
  // Fixture for path mapping (container path → host path).
  mkdirSync(path.join(projectRoot, 'host-mounted'), { recursive: true });
  writeFileSync(
    path.join(projectRoot, 'host-mounted/Mapped.tsx'),
    Array.from({ length: 5 }, (_, i) => `mapped ${i + 1}`).join('\n'),
    'utf8',
  );

  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      if (corsMiddleware(req, res)) return;
      if (handleCapabilitiesRequest(req, res)) return;
      handleSnippetRequest(req, res, {
        editor: 'cursor',
        pathMapping: { '/app/src': path.join(projectRoot, 'host-mounted') },
        root: projectRoot,
      }).then((handled) => {
        if (!handled) {
          res.writeHead(404);
          res.end();
        }
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('GET /__inspekt/snippet', () => {
  it('returns lines around the target line with context', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx&line=5&context=2`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      startLine: number;
      endLine: number;
      targetLine: number;
      lines: string[];
      language: string;
    };
    expect(data).toEqual({
      startLine: 3,
      endLine: 7,
      targetLine: 5,
      lines: ['line 3', 'line 4', 'line 5', 'line 6', 'line 7'],
      language: 'tsx',
    });
  });

  it('clamps context > 30 to 30', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx&line=5&context=999`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { lines: string[] };
    // File has 10 lines; context clamped to 30 means we get all 10.
    expect(data.lines.length).toBe(10);
  });

  it('clamps to file bounds when line is near top', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx&line=1&context=5`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { startLine: number; endLine: number };
    expect(data.startLine).toBe(1);
    expect(data.endLine).toBe(6);
  });

  it('returns 404 for nonexistent files', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Missing.tsx&line=1`);
    expect(res.status).toBe(404);
  });

  it('returns 400 when query is malformed', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx`);
    expect(res.status).toBe(400);
  });

  it('applies path mapping (container path → host path)', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=/app/src/Mapped.tsx&line=2&context=1`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { lines: string[] };
    expect(data.lines).toEqual(['mapped 1', 'mapped 2', 'mapped 3']);
  });

  it('invalidates cache when file mtime changes', async () => {
    const target = path.join(projectRoot, 'src/Button.tsx');
    // First read populates the cache.
    const r1 = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx&line=1&context=0`);
    const d1 = (await r1.json()) as { lines: string[] };
    expect(d1.lines).toEqual(['line 1']);

    // Replace contents and bump mtime.
    writeFileSync(target, 'mutated\n', 'utf8');
    const future = new Date(Date.now() + 5_000);
    utimesSync(target, future, future);

    const r2 = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx&line=1&context=0`);
    const d2 = (await r2.json()) as { lines: string[] };
    expect(d2.lines).toEqual(['mutated']);
  });
});

describe('GET /__inspekt/capabilities', () => {
  it('returns capability flags', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/capabilities`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; snippetEndpoint: boolean };
    expect(data.ok).toBe(true);
    expect(data.snippetEndpoint).toBe(true);
  });

  it('answers HEAD for fast probe', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/capabilities`, { method: 'HEAD' });
    expect(res.status).toBe(200);
  });
});

describe('CORS preflight', () => {
  it('replies to OPTIONS for /__inspekt/* paths', async () => {
    const res = await fetch(`${baseUrl}/__inspekt/snippet?file=src/Button.tsx&line=1`, {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('GET');
  });
});
