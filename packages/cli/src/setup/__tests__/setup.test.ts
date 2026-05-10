import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runSetup } from '../index';
import { loadOrCreateConfig, generateToken } from '../token';
import { detectAgents } from '../detect';

let home: string;

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), 'inspekt-setup-test-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('token + config', () => {
  it('generateToken returns a 64-char hex string', () => {
    const t = generateToken();
    expect(t.length).toBe(64);
    expect(t).toMatch(/^[0-9a-f]+$/);
  });

  it('loadOrCreateConfig creates a token on first run', async () => {
    const config = await loadOrCreateConfig(home);
    expect(config.token.length).toBe(64);
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(5678);
  });

  it('loadOrCreateConfig reuses the existing token on subsequent runs', async () => {
    const first = await loadOrCreateConfig(home);
    const second = await loadOrCreateConfig(home);
    expect(second.token).toBe(first.token);
  });
});

describe('detectAgents', () => {
  it('marks agents as not-installed when their config files are absent', () => {
    const list = detectAgents(home);
    for (const agent of list) {
      expect(agent.installed).toBe(false);
    }
    expect(list.map((a) => a.id).sort()).toEqual([
      'antigravity',
      'claude-code',
      'codex',
      'cursor',
      'gemini-cli',
    ]);
  });
});

describe('runSetup', () => {
  it('writes config + handshake + the requested agents', async () => {
    const result = await runSetup({ home, agents: ['claude-code', 'cursor'], quiet: true });

    expect(result.token.length).toBe(64);
    expect(result.agentsWritten.map((a) => a.id).sort()).toEqual(['claude-code', 'cursor']);
    expect(result.agentsSkipped).toEqual([]);

    // Handshake file is present + contains the token.
    const handshake = JSON.parse(
      readFileSync(path.join(home, '.inspekt', 'extension-handshake.json'), 'utf8'),
    );
    expect(handshake.token).toBe(result.token);
    expect(handshake.agentEndpoint).toBe('http://127.0.0.1:5678');

    // Claude config has the mcpServers.inspekt entry.
    const claudePath = path.join(home, '.config', 'claude', 'mcp.json');
    const claude = JSON.parse(readFileSync(claudePath, 'utf8'));
    expect(claude.mcpServers.inspekt.command).toBe('npx');
    expect(claude.mcpServers.inspekt.args).toEqual(['-y', '@inspekt/mcp']);
    expect(claude.mcpServers.inspekt.env.INSPEKT_TOKEN).toBe(result.token);

    // Skill file is present.
    const skill = readFileSync(path.join(home, '.claude', 'skills', 'inspekt', 'SKILL.md'), 'utf8');
    expect(skill).toContain('description:');
    expect(skill).toContain('grab_latest');
  });

  it('is idempotent — re-running preserves the token + overwrites the entry', async () => {
    const r1 = await runSetup({ home, agents: ['claude-code'], quiet: true });
    const r2 = await runSetup({ home, agents: ['claude-code'], quiet: true });
    expect(r2.token).toBe(r1.token);
    expect(r2.agentsWritten).toHaveLength(1);
  });

  it('preserves unrelated keys when merging into an existing config', async () => {
    const claudePath = path.join(home, '.config', 'claude', 'mcp.json');
    mkdirSync(path.dirname(claudePath), { recursive: true });
    writeFileSync(
      claudePath,
      JSON.stringify(
        {
          mcpServers: {
            other: { command: 'node', args: ['/keep/this.js'] },
          },
          unrelatedKey: 'preserve me',
        },
        null,
        2,
      ),
      'utf8',
    );

    await runSetup({ home, agents: ['claude-code'], quiet: true });
    const after = JSON.parse(readFileSync(claudePath, 'utf8'));
    expect(after.mcpServers.other.command).toBe('node');
    expect(after.mcpServers.inspekt.command).toBe('npx');
    expect(after.unrelatedKey).toBe('preserve me');
  });

  it('writes a marker-bracketed TOML block for Codex (idempotent)', async () => {
    const codexPath = path.join(home, '.codex', 'config.toml');
    mkdirSync(path.dirname(codexPath), { recursive: true });
    writeFileSync(codexPath, '[other]\nkeep = "this"\n', 'utf8');

    await runSetup({ home, agents: ['codex'], quiet: true });
    const after1 = readFileSync(codexPath, 'utf8');
    expect(after1).toContain('[other]');
    expect(after1).toContain('[mcp_servers.inspekt]');
    expect(after1).toContain('INSPEKT_TOKEN');
    // Markers present exactly once.
    expect((after1.match(/inspekt managed mcp entry/g) ?? []).length).toBe(2);

    // Re-run: marker block is replaced, not appended.
    await runSetup({ home, agents: ['codex'], quiet: true });
    const after2 = readFileSync(codexPath, 'utf8');
    expect((after2.match(/inspekt managed mcp entry/g) ?? []).length).toBe(2);
  });
});
