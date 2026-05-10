// `inspekt setup` — interactive (and non-interactive) registration of Inspekt
// with the user's installed agents. Generates an auth token, writes it to
// ~/.inspekt/config.json + ~/.inspekt/extension-handshake.json (read by the
// Chrome extension on first launch), and adds the inspekt MCP entry to each
// chosen agent's config file.

import os from 'node:os';
import { detectAgents } from './detect.js';
import { loadOrCreateConfig, writeHandshake } from './token.js';
import { writeClaudeCode } from './writers/claude-code.js';
import { writeCursor } from './writers/cursor.js';
import { writeCodex } from './writers/codex.js';
import { writeGeminiCli } from './writers/gemini-cli.js';
import { writeAntigravity } from './writers/antigravity.js';
import type { AgentId, SetupContext } from './types.js';

export interface RunSetupOptions {
  /** Restrict registration to this subset. If omitted, register all detected agents. */
  agents?: string[];
  /** Override home (for tests). */
  home?: string;
  /** When true, suppresses interactive output and only logs paths written. */
  quiet?: boolean;
}

export interface SetupResult {
  token: string;
  configPath: string;
  agentsWritten: { id: AgentId; path: string }[];
  agentsSkipped: { id: AgentId; reason: string }[];
}

export async function runSetup(opts: RunSetupOptions = {}): Promise<SetupResult> {
  const home = opts.home ?? os.homedir();
  const config = await loadOrCreateConfig(home);
  await writeHandshake(home, config);

  const detected = detectAgents(home);
  const requested = opts.agents
    ? detected.filter((a) => opts.agents!.includes(a.id))
    : detected.filter((a) => a.installed);

  const ctx: SetupContext = {
    home,
    token: config.token,
    daemonUrl: `http://${config.host}:${config.port}`,
  };

  const written: SetupResult['agentsWritten'] = [];
  const skipped: SetupResult['agentsSkipped'] = [];

  for (const agent of requested) {
    try {
      let p: string;
      switch (agent.id) {
        case 'claude-code': {
          const r = await writeClaudeCode(ctx, config);
          p = r.configPath;
          if (!opts.quiet) console.log(`  ✓ Claude Code     → ${r.configPath}`);
          if (!opts.quiet) console.log(`    skill           → ${r.skillPath}`);
          break;
        }
        case 'cursor': {
          const r = await writeCursor(ctx, config);
          p = r.configPath;
          if (!opts.quiet) console.log(`  ✓ Cursor          → ${r.configPath}`);
          break;
        }
        case 'codex': {
          const r = await writeCodex(ctx, config);
          p = r.configPath;
          if (!opts.quiet) console.log(`  ✓ OpenAI Codex    → ${r.configPath}`);
          break;
        }
        case 'gemini-cli': {
          const r = await writeGeminiCli(ctx, config);
          p = r.configPath;
          if (!opts.quiet) console.log(`  ✓ Gemini CLI      → ${r.configPath}`);
          break;
        }
        case 'antigravity': {
          const r = await writeAntigravity(ctx, config);
          p = r.configPath;
          if (!opts.quiet) console.log(`  ✓ Antigravity     → ${r.configPath}`);
          break;
        }
      }
      written.push({ id: agent.id, path: p! });
    } catch (err) {
      skipped.push({ id: agent.id, reason: (err as Error).message });
      if (!opts.quiet) console.log(`  ✗ ${agent.label}: ${(err as Error).message}`);
    }
  }

  // Friendly summary.
  if (!opts.quiet) {
    console.log('');
    console.log(`Token written to ${ctx.home}/.inspekt/config.json`);
    console.log('Handshake file at ~/.inspekt/extension-handshake.json — the Chrome');
    console.log('extension will pick up the token from there on next launch.');
    console.log('');
    console.log('Next: start the daemon with `inspekt-daemon` (or let it auto-start on');
    console.log('the first grab from the extension).');
  }

  return {
    token: config.token,
    configPath: `${ctx.home}/.inspekt/config.json`,
    agentsWritten: written,
    agentsSkipped: skipped,
  };
}
