import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleInspektRequest } from '../server';

const openInEditor = vi.hoisted(() => vi.fn());
vi.mock('@aylith/inspekt-cli', () => ({ openInEditor }));

let projectRoot: string;
let outsideDir: string;
let mappedDir: string;
let server: Server;
let baseUrl: string;

function postOpen(body: unknown, init: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}/__inspekt/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
}

beforeAll(async () => {
  projectRoot = mkdtempSync(path.join(tmpdir(), 'inspekt-open-root-'));
  outsideDir = mkdtempSync(path.join(tmpdir(), 'inspekt-open-outside-'));
  mappedDir = path.join(projectRoot, 'host-mounted');

  mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  mkdirSync(mappedDir, { recursive: true });
  writeFileSync(path.join(projectRoot, 'src/Button.tsx'), 'export const Button = () => null;\n');
  writeFileSync(path.join(mappedDir, 'Mapped.tsx'), 'export const Mapped = () => null;\n');
  writeFileSync(path.join(outsideDir, 'secret.txt'), 'do not read me\n');

  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      const handled = handleInspektRequest(req, res, {
        editor: 'configured-editor',
        pathMapping: { '/app/src': mappedDir },
        root: projectRoot,
      });
      if (!handled) {
        res.writeHead(404);
        res.end();
      }
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
  rmSync(outsideDir, { recursive: true, force: true });
});

beforeEach(() => {
  openInEditor.mockClear();
});

describe('POST /__inspekt/open — allow path', () => {
  it('opens a file inside the project root', async () => {
    const res = await postOpen({ file: 'src/Button.tsx', line: 4, column: 2 });
    expect(res.status).toBe(200);
    expect(openInEditor).toHaveBeenCalledTimes(1);
    expect(openInEditor).toHaveBeenCalledWith({
      file: path.join(projectRoot, 'src/Button.tsx'),
      line: 4,
      column: 2,
      editor: 'configured-editor',
    });
  });

  it('opens an absolute path that resolves inside the root', async () => {
    const res = await postOpen({ file: path.join(projectRoot, 'src/Button.tsx') });
    expect(res.status).toBe(200);
    expect(openInEditor).toHaveBeenCalledTimes(1);
  });

  it('opens a container path that maps onto an exposed host directory', async () => {
    const res = await postOpen({ file: '/app/src/Mapped.tsx', line: 1 });
    expect(res.status).toBe(200);
    expect(openInEditor).toHaveBeenCalledWith(
      expect.objectContaining({ file: path.join(mappedDir, 'Mapped.tsx') }),
    );
  });

  it('accepts a bare editor identifier from the request', async () => {
    const res = await postOpen({ file: 'src/Button.tsx', editor: 'vscode-insiders' });
    expect(res.status).toBe(200);
    expect(openInEditor).toHaveBeenCalledWith(
      expect.objectContaining({ editor: 'vscode-insiders' }),
    );
  });

  it('ignores a non-numeric line instead of forwarding NaN', async () => {
    const res = await postOpen({ file: 'src/Button.tsx', line: 'twelve' });
    expect(res.status).toBe(200);
    expect(openInEditor).toHaveBeenCalledWith(
      expect.objectContaining({ line: undefined, column: undefined }),
    );
  });
});

describe('POST /__inspekt/open — deny path', () => {
  it('refuses an absolute path outside the project root', async () => {
    const res = await postOpen({ file: path.join(outsideDir, 'secret.txt') });
    expect(res.status).toBe(403);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses a traversal escape from the project root', async () => {
    const res = await postOpen({ file: '../../etc/passwd' });
    expect(res.status).toBe(403);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses an editor string that would inject a command', async () => {
    const res = await postOpen({ file: 'src/Button.tsx', editor: 'sh -c "curl example.com"' });
    expect(res.status).toBe(400);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses an editor containing a shell metacharacter', async () => {
    for (const editor of ['code;id', 'code|id', 'code&&id', '/bin/sh']) {
      const res = await postOpen({ file: 'src/Button.tsx', editor });
      expect(res.status).toBe(400);
    }
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses a non-string editor', async () => {
    const res = await postOpen({ file: 'src/Button.tsx', editor: 42 });
    expect(res.status).toBe(400);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses a payload with no file', async () => {
    const res = await postOpen({ line: 3 });
    expect(res.status).toBe(400);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses a body that is not JSON', async () => {
    const res = await postOpen('not json at all');
    expect(res.status).toBe(400);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('refuses a body larger than the cap', async () => {
    const res = await postOpen({ file: 'src/Button.tsx', comment: 'x'.repeat(70 * 1024) });
    expect(res.status).toBe(413);
    expect(openInEditor).not.toHaveBeenCalled();
  });

  it('reports a failed editor launch instead of hanging the request', async () => {
    openInEditor.mockImplementationOnce(() => {
      throw new Error('spawn ENOENT');
    });
    const res = await postOpen({ file: 'src/Button.tsx' });
    expect(res.status).toBe(500);
    expect((await res.json()) as { error: string }).toEqual({
      error: 'Failed to launch editor: spawn ENOENT',
    });
  });

  it('does not handle other methods or paths', async () => {
    const wrongMethod = await fetch(`${baseUrl}/__inspekt/open`, { method: 'GET' });
    expect(wrongMethod.status).toBe(404);
    const wrongPath = await fetch(`${baseUrl}/__inspekt/nope`, { method: 'POST' });
    expect(wrongPath.status).toBe(404);
  });
});
