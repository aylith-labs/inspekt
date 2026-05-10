// Shared MCP-server entry shape that we write into every agent's config.
// Claude Code, Cursor, Codex, Gemini CLI, and Antigravity all use a
// `mcpServers` map keyed by server name. The exact path inside their JSON
// config differs; the per-agent writer is responsible for placing this block
// in the right place.

import type { InspektConfig } from '../token.js';

export interface McpEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export function buildMcpEntry(config: InspektConfig): McpEntry {
  return {
    command: 'npx',
    args: ['-y', '@inspekt/mcp'],
    env: {
      INSPEKT_TOKEN: config.token,
      INSPEKT_QUEUE_PATH: config.queuePath,
    },
  };
}
