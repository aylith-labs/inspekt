import { describe, it, expect } from 'vitest';
import { getBadgeForState, type TabState } from '../icon';

function caps(over: Partial<TabState['capabilities']> = {}): TabState['capabilities'] {
  return {
    instrumented: true,
    snippetSource: null,
    serverReachable: false,
    sourceMapAvailable: false,
    agentConnected: false,
    ...over,
  };
}

describe('getBadgeForState', () => {
  it('greyscale + empty badge when no instrumentation detected', () => {
    const pres = getBadgeForState({ enabled: false, standalone: false });
    expect(pres.iconVariant).toBe('grey');
    expect(pres.text).toBe('');
  });

  it('greyscale even when enabled flag is true but caps are missing', () => {
    const pres = getBadgeForState({ enabled: true, standalone: false });
    expect(pres.iconVariant).toBe('grey');
  });

  it('OFF badge when instrumented but disabled', () => {
    const pres = getBadgeForState({
      enabled: false,
      standalone: false,
      capabilities: caps(),
    });
    expect(pres.iconVariant).toBe('color');
    expect(pres.text).toBe('OFF');
  });

  it('ON badge for active path-only inspection', () => {
    const pres = getBadgeForState({
      enabled: true,
      standalone: false,
      capabilities: caps(),
    });
    expect(pres.text).toBe('ON');
  });

  it('DEV badge when dev server is the snippet source', () => {
    const pres = getBadgeForState({
      enabled: true,
      standalone: false,
      capabilities: caps({ snippetSource: 'devserver', serverReachable: true }),
    });
    expect(pres.text).toBe('DEV');
  });

  it('MAP badge when source maps are the snippet source', () => {
    const pres = getBadgeForState({
      enabled: true,
      standalone: false,
      capabilities: caps({ snippetSource: 'sourcemap', sourceMapAvailable: true }),
    });
    expect(pres.text).toBe('MAP');
  });

  it('AI badge supersedes DEV/MAP when an agent is connected', () => {
    const pres = getBadgeForState({
      enabled: true,
      standalone: false,
      capabilities: caps({
        snippetSource: 'devserver',
        serverReachable: true,
        agentConnected: true,
      }),
    });
    expect(pres.text).toBe('AI');
  });
});
