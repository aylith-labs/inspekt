import type { MinimalPluginContextWithoutEnvironment, ResolvedConfig } from 'vite';
import { describe, expect, it } from 'vitest';
import { inspekt } from '../index';

const context: MinimalPluginContextWithoutEnvironment = {
  meta: {
    rollupVersion: 'test-double',
    rolldownVersion: 'test-double',
    viteVersion: 'test-double',
    watchMode: false,
  },
  debug() {},
  info() {},
  warn() {},
  error(error) {
    throw new Error(String(error));
  },
};

describe('runtime injection boundary', () => {
  it.each([
    { command: 'serve', isProduction: false, enabled: false, scripts: 1 },
    { command: 'build', isProduction: true, enabled: false, scripts: 0 },
    { command: 'build', isProduction: true, enabled: true, scripts: 0 },
    { command: 'build', isProduction: false, enabled: true, scripts: 0 },
  ] as const)('$command production=$isProduction source opt-in=$enabled', async (row) => {
    const plugin = inspekt({ enableInProduction: row.enabled });
    if (
      typeof plugin.configResolved !== 'function' ||
      typeof plugin.transformIndexHtml !== 'function'
    ) {
      throw new Error('Expected callable lifecycle hooks');
    }
    await plugin.configResolved.call(context, {
      root: process.cwd(),
      command: row.command,
      isProduction: row.isProduction,
    } as ResolvedConfig);
    expect(
      await plugin.transformIndexHtml.call(context, '', { path: '/', filename: 'index.html' }),
    ).toHaveLength(row.scripts);
  });

  it('explicit runtime opt-out omits the script in development', async () => {
    const plugin = inspekt({ runtimeInjection: false });
    if (typeof plugin.transformIndexHtml !== 'function') throw new Error('Expected callable hook');
    expect(
      await plugin.transformIndexHtml.call(context, '', { path: '/', filename: 'index.html' }),
    ).toEqual([]);
  });
});
