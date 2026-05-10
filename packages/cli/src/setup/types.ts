export type AgentId = 'claude-code' | 'cursor' | 'codex' | 'gemini-cli' | 'antigravity';

export interface DetectedAgent {
  id: AgentId;
  label: string;
  configPath: string;
  /** True when the config file already exists. */
  installed: boolean;
}

export interface SetupContext {
  /** Home directory override (used by tests). */
  home: string;
  /** Token used for X-Inspekt-Token (generated if absent). */
  token: string;
  /** Daemon address written into each agent's MCP entry. */
  daemonUrl: string;
}
