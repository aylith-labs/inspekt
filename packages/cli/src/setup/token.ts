// Token + ~/.inspekt/config.json management. The token is a 256-bit random
// hex string written to ~/.inspekt/config.json and replayed into every agent's
// MCP server config (so the daemon can authenticate requests). The Chrome
// extension reads the same value from chrome.storage.sync (set by an
// extension-handshake file at ~/.inspekt/extension-handshake.json).

import { randomBytes } from 'node:crypto';
import { existsSync, promises as fs, mkdirSync } from 'node:fs';
import path from 'node:path';

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

/** Both files carry the daemon token, so they are owner-read/write only. */
const SECRET_FILE_MODE = 0o600;

async function writeSecretFile(filePath: string, contents: string): Promise<void> {
  await fs.writeFile(filePath, contents, { encoding: 'utf8', mode: SECRET_FILE_MODE });
  // `mode` only applies when the file is created, so re-tighten an existing one.
  // chmod is a no-op on Windows, where the ACL inherited from the user profile
  // already scopes the file to its owner.
  if (process.platform !== 'win32') await fs.chmod(filePath, SECRET_FILE_MODE);
}

export async function loadOrCreateConfig(home: string): Promise<InspektConfig> {
  const filePath = configPath(home);
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });

  if (existsSync(filePath)) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
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
  await writeSecretFile(filePath, `${JSON.stringify(config, null, 2)}\n`);
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
  await writeSecretFile(handshakePath(home), `${JSON.stringify(data, null, 2)}\n`);
}
