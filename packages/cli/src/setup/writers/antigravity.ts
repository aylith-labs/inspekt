// Antigravity is Code-OSS based, so it follows the VS Code-style settings.json
// convention for MCP servers (under a top-level `mcpServers` key).

import { buildMcpEntry } from './mcp-entry.js';
import { writeMcpEntryToJsonConfig } from './json-writer.js';
import { descriptorFor } from '../detect.js';
import type { InspektConfig } from '../token.js';
import type { SetupContext } from '../types.js';

export async function writeAntigravity(
  ctx: SetupContext,
  config: InspektConfig,
): Promise<{ configPath: string }> {
  const descriptor = descriptorFor('antigravity');
  if (!descriptor) throw new Error('Antigravity descriptor missing');
  const configPath = descriptor.configPath(ctx.home);
  const entry = buildMcpEntry(config);
  await writeMcpEntryToJsonConfig(configPath, entry, { mcpServersPath: [] });
  return { configPath };
}
