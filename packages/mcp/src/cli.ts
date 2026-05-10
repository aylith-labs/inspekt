#!/usr/bin/env node
// `inspekt-mcp` — stdio MCP server. Agents (Claude Code, Cursor, Codex,
// Gemini CLI, Antigravity) launch this via their MCP server config and
// communicate over stdin/stdout.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './index.js';

async function main(): Promise<void> {
  const server = createMcpServer({
    queuePath: process.env['INSPEKT_QUEUE_PATH'],
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Process stays alive on the transport's stdin loop.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[inspekt-mcp]', err);
  process.exit(1);
});
