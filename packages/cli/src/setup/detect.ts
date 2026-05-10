// Detect installed agents by looking for their canonical config files.
// Returns a uniform DetectedAgent[] regardless of platform — caller decides
// which ones to register Inspekt with.

import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AgentId, DetectedAgent } from './types.js';

export interface AgentDescriptor {
  id: AgentId;
  label: string;
  /** Returns the canonical MCP config path for this agent on this platform. */
  configPath: (home: string) => string;
}

export const AGENTS: AgentDescriptor[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    configPath: (home) =>
      process.platform === 'win32'
        ? path.join(process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
        : path.join(home, '.config', 'claude', 'mcp.json'),
  },
  {
    id: 'cursor',
    label: 'Cursor',
    configPath: (home) =>
      process.platform === 'darwin'
        ? path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json')
        : process.platform === 'win32'
          ? path.join(process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming'), 'Cursor', 'User', 'settings.json')
          : path.join(home, '.config', 'Cursor', 'User', 'settings.json'),
  },
  {
    id: 'codex',
    label: 'OpenAI Codex',
    configPath: (home) => path.join(home, '.codex', 'config.toml'),
  },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    configPath: (home) => path.join(home, '.gemini', 'settings.json'),
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    configPath: (home) =>
      process.platform === 'darwin'
        ? path.join(home, 'Library', 'Application Support', 'Antigravity', 'User', 'settings.json')
        : process.platform === 'win32'
          ? path.join(process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming'), 'Antigravity', 'User', 'settings.json')
          : path.join(home, '.config', 'Antigravity', 'User', 'settings.json'),
  },
];

export function detectAgents(home: string = os.homedir()): DetectedAgent[] {
  return AGENTS.map((a) => {
    const p = a.configPath(home);
    return {
      id: a.id,
      label: a.label,
      configPath: p,
      installed: existsSync(p),
    };
  });
}

export function descriptorFor(id: AgentId): AgentDescriptor | undefined {
  return AGENTS.find((a) => a.id === id);
}
