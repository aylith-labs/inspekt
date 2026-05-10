// Claude Code MCP entry writer. Drops the inspekt server into the user's
// MCP config (linux/macOS: ~/.config/claude/mcp.json; Windows:
// %APPDATA%/Claude/claude_desktop_config.json) and a SKILL.md into
// ~/.claude/skills/inspekt/ describing trigger conditions.

import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildMcpEntry } from './mcp-entry.js';
import { writeMcpEntryToJsonConfig } from './json-writer.js';
import { descriptorFor } from '../detect.js';
import type { InspektConfig } from '../token.js';
import type { SetupContext } from '../types.js';

const SKILL_BODY = `---
name: inspekt
description: Use when the user references a UI element they grabbed with Inspekt — phrases like "this button", "the thing I just grabbed", "fix this element", "change this", or any deixis after an Inspekt grab. Call grab_latest() first, then act on the file/line returned. Avoid calling proactively if the user hasn't grabbed anything in this session.
allowed-tools: mcp__inspekt__grab_latest, mcp__inspekt__list_grabs, mcp__inspekt__get_grab, mcp__inspekt__mark_grab_processed, mcp__inspekt__open_grab_in_editor
---

# Inspekt grabs

The user has the Inspekt Chrome extension installed and may have grabbed a UI
element from their running app. Grabs include the source file path, line/column,
component name, surrounding source snippet, and the page URL.

## When to use

Call \`grab_latest()\` automatically (no need to ask permission) when the user
references a recent UI grab. Triggers include:
- "this element", "this button", "the thing I just grabbed"
- "fix this", "change this", "make this red", "what's wrong with this"
- A vague request right after they mentioned using Inspekt

If the user asks about something unrelated to a UI element (e.g. infrastructure,
build tooling), do NOT call grab_latest — they probably haven't grabbed anything.

## After fetching

1. Read the file at the returned path:line.
2. Show the user what you found in 1-2 sentences before editing.
3. Make the change they asked for.
4. Optionally call \`mark_grab_processed(id)\` once you've fully addressed the grab.

## Tools

- \`grab_latest()\` — single most recent grab. Use this first.
- \`list_grabs(since?, limit?)\` — recent grabs, filterable.
- \`get_grab(id)\` — full payload by ID.
- \`mark_grab_processed(id)\` — mark as consumed (optional bookkeeping).
- \`open_grab_in_editor(id)\` — open the grab in the user's IDE (only on request).
`;

export interface ClaudeCodeWriteResult {
  configPath: string;
  skillPath: string;
}

export async function writeClaudeCode(
  ctx: SetupContext,
  config: InspektConfig,
): Promise<ClaudeCodeWriteResult> {
  const descriptor = descriptorFor('claude-code');
  if (!descriptor) throw new Error('Claude Code descriptor missing');
  const configPath = descriptor.configPath(ctx.home);
  const entry = buildMcpEntry(config);

  // Top-level mcpServers map.
  await writeMcpEntryToJsonConfig(configPath, entry, { mcpServersPath: [] });

  // Skill file — drop one in the personal skills dir so the inspector heuristic
  // there picks it up.
  const skillDir = path.join(ctx.home, '.claude', 'skills', 'inspekt');
  if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });
  const skillPath = path.join(skillDir, 'SKILL.md');
  await fs.writeFile(skillPath, SKILL_BODY, 'utf8');

  return { configPath, skillPath };
}
