// Token + ~/.inspekt/config.json management. The token is a 256-bit random
// hex string written to ~/.inspekt/config.json and replayed into every agent's
// MCP server config (so the daemon can authenticate requests). The Chrome
// extension reads the same value from chrome.storage.sync (set by an
// extension-handshake file at ~/.inspekt/extension-handshake.json).

import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export interface InspektConfig {
  token: string;
  host: string;
  port: number;
  queuePath: string;
}

export function configPath(home: string): string {
  return path.join(home, '.inspekt', 'config.json');
}

export function handshakePath(home: string): string {
  return path.join(home, '.inspekt', 'extension-handshake.json');
}

export function defaultQueuePath(home: string): string {
  return path.join(home, '.inspekt', 'queue.jsonl');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function loadOrCreateConfig(home: string): Promise<InspektConfig> {
  const p = configPath(home);
  const dir = path.dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(p)) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      const parsed = JSON.parse(raw) as Partial<InspektConfig>;
      if (parsed.token) {
        return {
          token: parsed.token,
          host: parsed.host ?? '127.0.0.1',
          port: parsed.port ?? 5678,
          queuePath: parsed.queuePath ?? defaultQueuePath(home),
        };
      }
    } catch {
      // Fall through and rewrite.
    }
  }

  const config: InspektConfig = {
    token: generateToken(),
    host: '127.0.0.1',
    port: 5678,
    queuePath: defaultQueuePath(home),
  };
  await fs.writeFile(p, JSON.stringify(config, null, 2) + '\n', 'utf8');
  return config;
}

export async function writeHandshake(home: string, config: InspektConfig): Promise<void> {
  // Small JSON the Chrome extension polls on first launch (when its
  // chrome.storage.sync token is empty) to discover the daemon address +
  // token. The extension deletes this file once it's stored the values.
  const data = {
    token: config.token,
    agentEndpoint: `http://${config.host}:${config.port}`,
  };
  await fs.writeFile(handshakePath(home), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
