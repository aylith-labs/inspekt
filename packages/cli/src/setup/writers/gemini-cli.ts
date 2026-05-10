// Gemini CLI MCP entry writer. Gemini's settings.json lives at
// ~/.gemini/settings.json with a top-level `mcpServers` key.

import { buildMcpEntry } from './mcp-entry.js';
import { writeMcpEntryToJsonConfig } from './json-writer.js';
import { descriptorFor } from '../detect.js';
import type { InspektConfig } from '../token.js';
import type { SetupContext } from '../types.js';

export async function writeGeminiCli(
  ctx: SetupContext,
  config: InspektConfig,
): Promise<{ configPath: string }> {
  const descriptor = descriptorFor('gemini-cli');
  if (!descriptor) throw new Error('Gemini CLI descriptor missing');
  const configPath = descriptor.configPath(ctx.home);
  const entry = buildMcpEntry(config);
  await writeMcpEntryToJsonConfig(configPath, entry, { mcpServersPath: [] });
  return { configPath };
}
