// Idempotent JSON writer for agent config files.
//
// Each agent's config is a JSON file with a top-level `mcpServers` map (or a
// nested path). We merge our entry in without disturbing other keys, preserve
// the existing key order via JSON.parse roundtrip, and write back with the
// same indentation.

import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { McpEntry } from './mcp-entry.js';

export interface JsonMergeOptions {
  /**
   * Path inside the JSON config where the mcpServers map lives. Empty array
   * means the root has `mcpServers` directly; otherwise we walk into the
   * given keys, creating objects as needed.
   */
  mcpServersPath: string[];
  /** Server name to use inside mcpServers (default 'inspekt'). */
  serverName?: string;
  /** Indent for re-serialization (default 2 spaces). */
  indent?: number;
}

export async function writeMcpEntryToJsonConfig(
  configPath: string,
  entry: McpEntry,
  options: JsonMergeOptions,
): Promise<{ written: boolean; previousEntry: McpEntry | null }> {
  const serverName = options.serverName ?? 'inspekt';
  const indent = options.indent ?? 2;

  const dir = path.dirname(configPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let root: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    const raw = await fs.readFile(configPath, 'utf8');
    if (raw.trim().length > 0) {
      try {
        root = JSON.parse(raw) as Record<string, unknown>;
      } catch (err) {
        throw new Error(`Failed to parse ${configPath}: ${(err as Error).message}`);
      }
    }
  }

  // Walk into nested path, creating intermediate objects.
  let cursor: Record<string, unknown> = root;
  for (const key of options.mcpServersPath) {
    const next = cursor[key];
    if (next === undefined || next === null) {
      const fresh: Record<string, unknown> = {};
      cursor[key] = fresh;
      cursor = fresh;
    } else if (typeof next === 'object' && !Array.isArray(next)) {
      cursor = next as Record<string, unknown>;
    } else {
      throw new Error(
        `Unexpected non-object value at ${options.mcpServersPath.join('.')} in ${configPath}`,
      );
    }
  }

  // mcpServers map lives one level deeper than our path.
  const servers = (cursor['mcpServers'] as Record<string, McpEntry> | undefined) ?? {};
  const previous = servers[serverName] ?? null;
  servers[serverName] = entry;
  cursor['mcpServers'] = servers;

  await fs.writeFile(configPath, JSON.stringify(root, null, indent) + '\n', 'utf8');
  return { written: true, previousEntry: previous };
}
