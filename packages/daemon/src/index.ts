// Public entrypoint: starts the daemon HTTP server with default config
// resolved from ~/.inspekt/config.json. Programmatic consumers can import
// `createServer` and `GrabQueue` directly from the subpaths.

import { existsSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createServer } from './server.js';
import type { DaemonConfig } from './types.js';

export { GrabQueue, ulid } from './queue.js';
export { createServer } from './server.js';
export type { DaemonConfig, Grab, SerializedElement, SerializedSnippet } from './types.js';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.inspekt', 'config.json');
const DEFAULT_QUEUE_PATH = path.join(os.homedir(), '.inspekt', 'queue.jsonl');

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH): Promise<DaemonConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`Inspekt config not found at ${configPath}. Run \`npx inspekt setup\` first.`);
  }
  const raw = await fs.readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<DaemonConfig> & { token?: string };
  if (!parsed.token) throw new Error(`No token in ${configPath}`);
  return {
    token: parsed.token,
    host: parsed.host ?? '127.0.0.1',
    port: parsed.port ?? 5678,
    queuePath: parsed.queuePath ?? DEFAULT_QUEUE_PATH,
  };
}

export interface RunningDaemon {
  /** Port the server actually bound to — meaningful when port 0 was requested. */
  port: number;
  /** Closes the listener; resolves once every connection has drained. */
  stop: () => Promise<void>;
}

export async function startDaemon(config?: Partial<DaemonConfig>): Promise<RunningDaemon> {
  const loaded = await loadConfig(DEFAULT_CONFIG_PATH).catch(() => null);
  const resolved: DaemonConfig = {
    token: config?.token ?? loaded?.token ?? '',
    host: config?.host ?? loaded?.host ?? '127.0.0.1',
    port: config?.port ?? loaded?.port ?? 5678,
    queuePath: config?.queuePath ?? loaded?.queuePath ?? DEFAULT_QUEUE_PATH,
  };
  if (!resolved.token) {
    throw new Error('Daemon requires a token. Run `npx inspekt setup` or pass { token } directly.');
  }
  const app = createServer(resolved);

  // `serve` binds asynchronously, so a failure like EADDRINUSE arrives as an
  // 'error' event well after this function would otherwise have resolved. Wait
  // for one of the two outcomes so the caller sees a rejected promise instead of
  // an unhandled error crashing the process later.
  const server = await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
    const started = serve(
      { fetch: app.fetch, hostname: resolved.host, port: resolved.port },
      () => {
        started.off('error', reject);
        resolve(started);
      },
    );
    started.once('error', reject);
  });

  const address = server.address();
  return {
    port: typeof address === 'object' && address !== null ? address.port : resolved.port,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
