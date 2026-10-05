// Shared MCP-server entry shape that we write into every agent's config.
// Claude Code, Cursor, Codex, Gemini CLI, and Antigravity all use a
// `mcpServers` map keyed by server name. The exact path inside their JSON
// config differs; the per-agent writer is responsible for placing this block
// in the right place.

import { createRequire } from 'node:module';
import type { InspektConfig } from '../token.js';

export interface McpEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export function resolveMcpExecutable(): string {
  const require = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);
  try {
    return require.resolve('@aylith/inspekt-mcp/cli');
  } catch {
    throw new Error(
      'Install the Inspekt agent package bundle before running setup. The local MCP executable is required.',
    );
  }
}

export function buildMcpEntry(config: InspektConfig): McpEntry {
  return {
    command: process.execPath,
    args: [resolveMcpExecutable()],
    env: {
      INSPEKT_TOKEN: config.token,
      INSPEKT_QUEUE_PATH: config.queuePath,
    },
  };
}
