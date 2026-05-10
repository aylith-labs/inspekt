// Append-only NDJSON queue for grabs. Sibling MCP processes read the same
// file under a per-file lock (`proper-lockfile`). Each grab is a single
// JSON-encoded line ending with `\n`. Reads stream the file line-by-line.
//
// Keeping the queue file-based (vs in-memory in the daemon) means MCP
// servers spawned by agents don't need to talk HTTP to the daemon — they
// just read the shared file. Multiple concurrent readers + one writer is
// safe under POSIX append guarantees, but we still take a brief lock for
// writes to serialize against compaction/clear operations.

import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { lock as plLock } from 'proper-lockfile';
import type { Grab } from './types.js';

export function ulid(): string {
  // Crockford base32 ULID. Not bit-perfect spec-compliant — sortable by time
  // (millis prefix) which is the property we actually need.
  const time = Date.now();
  const TIME_LEN = 10;
  const RAND_LEN = 16;
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = time;
  const timePart = new Array<string>(TIME_LEN);
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    timePart[i] = alphabet[t % 32]!;
    t = Math.floor(t / 32);
  }
  let randPart = '';
  for (let i = 0; i < RAND_LEN; i++) {
    randPart += alphabet[Math.floor(Math.random() * 32)];
  }
  return timePart.join('') + randPart;
}

export class GrabQueue {
  constructor(private readonly filePath: string) {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(filePath)) {
      // Touch — proper-lockfile needs the file to exist to lock it.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void fs.writeFile(filePath, '', 'utf8');
    }
  }

  async append(grab: Omit<Grab, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<Grab> {
    const full: Grab = {
      id: grab.id ?? ulid(),
      timestamp: grab.timestamp ?? Date.now(),
      url: grab.url,
      element: grab.element,
      comment: grab.comment,
      styles: grab.styles,
      source: grab.source,
    };
    await this.ensureFile();
    const release = await plLock(this.filePath, {
      retries: { retries: 50, minTimeout: 5, maxTimeout: 50, factor: 1.2 },
      stale: 2000,
    });
    try {
      await fs.appendFile(this.filePath, JSON.stringify(full) + '\n', 'utf8');
    } finally {
      await release();
    }
    return full;
  }

  async list(opts: { since?: number; limit?: number } = {}): Promise<Grab[]> {
    const content = await this.readAll();
    const all = content
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => {
        try {
          return JSON.parse(l) as Grab;
        } catch {
          return null;
        }
      })
      .filter((g): g is Grab => g !== null);

    const filtered =
      opts.since !== undefined
        ? all.filter((g) => g.timestamp > opts.since!)
        : all;
    if (opts.limit !== undefined && filtered.length > opts.limit) {
      return filtered.slice(-opts.limit);
    }
    return filtered;
  }

  async latest(): Promise<Grab | null> {
    const all = await this.list();
    return all.length > 0 ? all[all.length - 1] ?? null : null;
  }

  async getById(id: string): Promise<Grab | null> {
    const all = await this.list();
    return all.find((g) => g.id === id) ?? null;
  }

  async markProcessed(id: string): Promise<boolean> {
    await this.ensureFile();
    const release = await plLock(this.filePath, {
      retries: { retries: 50, minTimeout: 5, maxTimeout: 50, factor: 1.2 },
      stale: 2000,
    });
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const lines = content.split('\n');
      let mutated = false;
      const next = lines.map((line) => {
        if (line.length === 0) return line;
        try {
          const grab = JSON.parse(line) as Grab;
          if (grab.id === id && !grab.processedAt) {
            grab.processedAt = Date.now();
            mutated = true;
            return JSON.stringify(grab);
          }
          return line;
        } catch {
          return line;
        }
      });
      if (mutated) {
        await fs.writeFile(this.filePath, next.join('\n'), 'utf8');
      }
      return mutated;
    } finally {
      await release();
    }
  }

  async clear(): Promise<void> {
    await this.ensureFile();
    const release = await plLock(this.filePath, {
      retries: { retries: 50, minTimeout: 5, maxTimeout: 50, factor: 1.2 },
      stale: 2000,
    });
    try {
      await fs.writeFile(this.filePath, '', 'utf8');
    } finally {
      await release();
    }
  }

  private async ensureFile(): Promise<void> {
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, '', 'utf8');
    }
  }

  private async readAll(): Promise<string> {
    try {
      return await fs.readFile(this.filePath, 'utf8');
    } catch {
      return '';
    }
  }
}
