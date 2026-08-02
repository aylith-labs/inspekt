import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startDaemon } from '../index';
import { VERSION } from '../version';

const TOKEN = 'start-daemon-token';

let dir: string;
let running: Awaited<ReturnType<typeof startDaemon>> | null;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'inspekt-start-test-'));
  running = null;
});

afterEach(async () => {
  await running?.stop();
  rmSync(dir, { recursive: true, force: true });
});

function options(port: number) {
  return { token: TOKEN, host: '127.0.0.1', port, queuePath: path.join(dir, 'queue.jsonl') };
}

describe('startDaemon', () => {
  it('binds an ephemeral port and reports the port it actually got', async () => {
    running = await startDaemon(options(0));
    expect(running.port).toBeGreaterThan(0);

    const res = await fetch(`http://127.0.0.1:${running.port}/__inspekt/daemon`);
    expect(res.status).toBe(200);
    expect((await res.json()) as { version: string }).toMatchObject({ version: VERSION });
  });

  it('rejects when the port is already taken instead of crashing later', async () => {
    running = await startDaemon(options(0));
    await expect(startDaemon(options(running.port))).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });

  it('refuses to start without a token', async () => {
    await expect(startDaemon({ ...options(0), token: '' })).rejects.toThrow(/requires a token/);
  });

  it('stop() resolves and the port stops answering', async () => {
    const daemon = await startDaemon(options(0));
    const { port } = daemon;
    await daemon.stop();
    await expect(fetch(`http://127.0.0.1:${port}/__inspekt/daemon`)).rejects.toThrow();
  });
});
