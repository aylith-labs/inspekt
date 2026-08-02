import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runSetup } from '../index';
import { configPath, handshakePath, loadOrCreateConfig, writeHandshake } from '../token';
import { tomlBasicString } from '../writers/codex';
import { writeMcpEntryToJsonConfig } from '../writers/json-writer';

let home: string;

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), 'inspekt-writers-test-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('tomlBasicString', () => {
  it('quotes a plain value', () => {
    expect(tomlBasicString('npx')).toBe('"npx"');
  });

  it('escapes backslashes so a Windows path stays valid TOML', () => {
    // Unescaped, `\U` is an invalid TOML escape and rejects the whole file.
    expect(tomlBasicString('C:\\Users\\dev\\.inspekt\\queue.jsonl')).toBe(
      '"C:\\\\Users\\\\dev\\\\.inspekt\\\\queue.jsonl"',
    );
  });

  it('escapes embedded quotes', () => {
    expect(tomlBasicString('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('escapes newlines, carriage returns and tabs', () => {
    expect(tomlBasicString('a\nb\rc\td')).toBe('"a\\nb\\rc\\td"');
  });

  it('escapes other control characters as \\u sequences', () => {
    expect(tomlBasicString('a\u0000b\u007fc')).toBe('"a\\u0000b\\u007fc"');
  });

  it('leaves non-ASCII text alone', () => {
    expect(tomlBasicString('naïve — ok')).toBe('"naïve — ok"');
  });
});

describe('codex writer', () => {
  it('escapes the queue path it writes into the TOML block', async () => {
    const config = await loadOrCreateConfig(home);
    config.queuePath = 'C:\\Users\\dev\\.inspekt\\queue.jsonl';
    // runSetup re-reads config from disk, so persist the Windows-shaped path first.
    writeFileSync(configPath(home), `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    await runSetup({ home, agents: ['codex'], quiet: true });
    const toml = readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8');
    expect(toml).toContain('INSPEKT_QUEUE_PATH = "C:\\\\Users\\\\dev\\\\.inspekt\\\\queue.jsonl"');
  });
});

describe('json-writer', () => {
  it('creates the file and nests the entry under mcpServers', async () => {
    const target = path.join(home, 'agent', 'settings.json');
    const result = await writeMcpEntryToJsonConfig(
      target,
      { command: 'npx', args: ['-y', '@aylith/inspekt-mcp'], env: {} },
      { mcpServersPath: [] },
    );
    expect(result.previousEntry).toBeNull();
    const written = JSON.parse(readFileSync(target, 'utf8'));
    expect(written.mcpServers.inspekt.command).toBe('npx');
  });

  it('reports the entry it replaced', async () => {
    const target = path.join(home, 'agent', 'settings.json');
    const entry = { command: 'npx', args: [], env: {} };
    await writeMcpEntryToJsonConfig(target, { ...entry, command: 'old' }, { mcpServersPath: [] });
    const result = await writeMcpEntryToJsonConfig(target, entry, { mcpServersPath: [] });
    expect(result.previousEntry?.command).toBe('old');
  });

  it('walks into a nested mcpServers path, creating objects on the way', async () => {
    const target = path.join(home, 'agent', 'settings.json');
    await writeMcpEntryToJsonConfig(
      target,
      { command: 'npx', args: [], env: {} },
      { mcpServersPath: ['tools', 'mcp'] },
    );
    const written = JSON.parse(readFileSync(target, 'utf8'));
    expect(written.tools.mcp.mcpServers.inspekt.command).toBe('npx');
  });

  it('rejects a config whose mcpServers is not an object', async () => {
    const target = path.join(home, 'agent', 'settings.json');
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify({ mcpServers: ['not', 'an', 'object'] }), 'utf8');
    await expect(
      writeMcpEntryToJsonConfig(
        target,
        { command: 'npx', args: [], env: {} },
        { mcpServersPath: [] },
      ),
    ).rejects.toThrow(/Expected an object at "mcpServers"/);
    // The original file is left untouched rather than half-rewritten.
    expect(JSON.parse(readFileSync(target, 'utf8')).mcpServers).toEqual(['not', 'an', 'object']);
  });

  it('rejects a config that is not valid JSON', async () => {
    const target = path.join(home, 'agent', 'settings.json');
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, '{ this is not json', 'utf8');
    await expect(
      writeMcpEntryToJsonConfig(
        target,
        { command: 'npx', args: [], env: {} },
        { mcpServersPath: [] },
      ),
    ).rejects.toThrow(/Failed to parse/);
  });
});

describe('secret file permissions', () => {
  // Windows has no POSIX mode bits, so the assertion only holds elsewhere.
  it.skipIf(process.platform === 'win32')(
    'writes config.json and the handshake as owner-only',
    async () => {
      const config = await loadOrCreateConfig(home);
      await writeHandshake(home, config);
      expect(statSync(configPath(home)).mode & 0o777).toBe(0o600);
      expect(statSync(handshakePath(home)).mode & 0o777).toBe(0o600);
    },
  );

  it.skipIf(process.platform === 'win32')('re-tightens a config left world-readable', async () => {
    const first = await loadOrCreateConfig(home);
    // Simulate a config written before the mode was enforced.
    writeFileSync(configPath(home), '{}', { encoding: 'utf8', mode: 0o644 });
    const second = await loadOrCreateConfig(home);
    expect(second.token).not.toBe(first.token);
    expect(statSync(configPath(home)).mode & 0o777).toBe(0o600);
  });
});
