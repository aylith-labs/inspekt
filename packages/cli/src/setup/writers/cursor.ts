// Cursor MCP entry writer. Cursor 0.45+ supports MCP servers; the entry
// lives at the top-level `mcpServers` key in
// ~/Library/Application Support/Cursor/User/settings.json (and platform
// equivalents). We merge alongside existing user settings.

import { buildMcpEntry } from './mcp-entry.js';
import { writeMcpEntryToJsonConfig } from './json-writer.js';
import { descriptorFor } from '../detect.js';
import type { InspektConfig } from '../token.js';
import type { SetupContext } from '../types.js';

export async function writeCursor(
  ctx: SetupContext,
  config: InspektConfig,
): Promise<{ configPath: string }> {
  const descriptor = descriptorFor('cursor');
  if (!descriptor) throw new Error('Cursor descriptor missing');
  const configPath = descriptor.configPath(ctx.home);
  const entry = buildMcpEntry(config);
  await writeMcpEntryToJsonConfig(configPath, entry, { mcpServersPath: [] });
  return { configPath };
}
