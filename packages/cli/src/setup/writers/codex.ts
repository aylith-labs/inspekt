// OpenAI Codex CLI uses ~/.codex/config.toml. The MCP-server block has a
// fixed TOML shape:
//
//   [mcp_servers.inspekt]
//   command = "npx"
//   args = ["-y", "@aylith/inspekt-mcp"]
//   [mcp_servers.inspekt.env]
//   INSPEKT_TOKEN = "..."
//
// We don't want to drag a TOML parser in just for this — we instead detect
// an existing `[mcp_servers.inspekt]` section and rewrite it idempotently
// with a simple string-level edit. Other agents' configs (JSON) get proper
// parsing.

import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { descriptorFor } from '../detect.js';
import { buildMcpEntry } from './mcp-entry.js';
import type { InspektConfig } from '../token.js';
import type { SetupContext } from '../types.js';

const BLOCK_START = '# >>> inspekt managed mcp entry — do not edit between markers >>>';
const BLOCK_END = '# <<< inspekt managed mcp entry <<<';

function buildBlock(config: InspektConfig): string {
  const entry = buildMcpEntry(config);
  const argsArr = entry.args.map((a) => `"${a}"`).join(', ');
  return [
    BLOCK_START,
    '[mcp_servers.inspekt]',
    `command = "${entry.command}"`,
    `args = [${argsArr}]`,
    '',
    '[mcp_servers.inspekt.env]',
    `INSPEKT_TOKEN = "${entry.env['INSPEKT_TOKEN']}"`,
    `INSPEKT_QUEUE_PATH = "${entry.env['INSPEKT_QUEUE_PATH']}"`,
    BLOCK_END,
  ].join('\n');
}

export async function writeCodex(
  ctx: SetupContext,
  config: InspektConfig,
): Promise<{ configPath: string }> {
  const descriptor = descriptorFor('codex');
  if (!descriptor) throw new Error('Codex descriptor missing');
  const configPath = descriptor.configPath(ctx.home);
  const dir = path.dirname(configPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const existing = existsSync(configPath) ? await fs.readFile(configPath, 'utf8') : '';
  const block = buildBlock(config);

  const startIdx = existing.indexOf(BLOCK_START);
  const endIdx = existing.indexOf(BLOCK_END);
  let next: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    next = existing.slice(0, startIdx) + block + existing.slice(endIdx + BLOCK_END.length);
  } else {
    next = existing.trim().length > 0 ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`;
  }

  await fs.writeFile(configPath, next, 'utf8');
  return { configPath };
}
