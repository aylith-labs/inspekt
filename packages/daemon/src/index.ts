// Public entrypoint: starts the daemon HTTP server with default config
// resolved from ~/.inspekt/config.json. Programmatic consumers can import
// `createServer` and `GrabQueue` directly from the subpaths.

import { serve } from '@hono/node-server';
import path from 'node:path';
import os from 'node:os';
import { promises as fs, existsSync } from 'node:fs';
import { createServer } from './server.js';
import type { DaemonConfig } from './types.js';

export { createServer } from './server.js';
export { GrabQueue, ulid } from './queue.js';
export type { Grab, SerializedElement, SerializedSnippet, DaemonConfig } from './types.js';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.inspekt', 'config.json');
const DEFAULT_QUEUE_PATH = path.join(os.homedir(), '.inspekt', 'queue.jsonl');

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH): Promise<DaemonConfig> {
  if (!existsSync(configPath)) {
    throw new Error(
      `Inspekt config not found at ${configPath}. Run \`npx inspekt setup\` first.`,
    );
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

export async function startDaemon(config?: Partial<DaemonConfig>): Promise<{ stop: () => void; port: number }> {
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
  const server = serve({
    fetch: app.fetch,
    hostname: resolved.host,
    port: resolved.port,
  });
  return {
    port: resolved.port,
    stop: () => server.close(),
  };
}
