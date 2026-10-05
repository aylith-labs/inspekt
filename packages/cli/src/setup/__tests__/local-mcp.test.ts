import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { runSetup } from '../index';

it('agent setup registers the installed MCP executable without a registry launcher', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'inspekt-local-mcp-'));
  try {
    const result = await runSetup({ home: directory, agents: ['claude-code'], quiet: true });
    const agent = result.agentsWritten[0];
    if (!agent) throw new Error('Claude configuration was not written');
    const config = JSON.parse(readFileSync(agent.path, 'utf8'));
    const entry = config.mcpServers.inspekt;
    expect(entry.command).toBe(process.execPath);
    expect(entry.args).toHaveLength(1);
    expect(path.isAbsolute(entry.args[0])).toBe(true);
    expect(path.basename(entry.args[0])).toBe('cli.js');
    const installed = JSON.parse(
      readFileSync(path.join(path.dirname(entry.args[0]), '../package.json'), 'utf8'),
    );
    expect(installed.name).toBe('@aylith/inspekt-mcp');
    expect(entry.env.INSPEKT_QUEUE_PATH).toBe(path.join(directory, '.inspekt/queue.jsonl'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const existing of [false, true]) {
  it(`keeps all token-bearing agent files private (${existing ? 'existing' : 'new'} profile)`, async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'inspekt-private-agent-'));
    try {
      if (existing) {
        const initial = await runSetup({
          home: directory,
          agents: ['claude-code', 'cursor', 'codex', 'gemini-cli', 'antigravity'],
          quiet: true,
        });
        for (const agent of initial.agentsWritten) chmodSync(agent.path, 0o644);
      }
      const result = await runSetup({
        home: directory,
        agents: ['claude-code', 'cursor', 'codex', 'gemini-cli', 'antigravity'],
        quiet: true,
      });
      expect(result.agentsWritten).toHaveLength(5);
      for (const agent of result.agentsWritten)
        expect(statSync(agent.path).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
