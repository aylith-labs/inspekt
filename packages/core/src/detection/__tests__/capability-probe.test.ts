// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  probeCapabilities,
  publishCapabilities,
  watchCapabilities,
  INSPEKT_CAPABILITIES_MESSAGE,
} from '../capability-probe';

function okHead() {
  return new Response('', { status: 200 });
}
function notFound() {
  return new Response('', { status: 404 });
}

describe('probeCapabilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('returns instrumented: false on a page with no data-insp-path and no source maps', async () => {
    const fetcher = vi.fn().mockResolvedValue(notFound());
    const caps = await probeCapabilities({ fetcher: fetcher as unknown as typeof fetch });
    expect(caps.instrumented).toBe(false);
    expect(caps.snippetSource).toBeNull();
    expect(caps.serverReachable).toBe(false);
    expect(caps.agentConnected).toBe(false);
  });

  it('flags instrumented: true when a data-insp-path attribute is present', async () => {
    document.body.innerHTML = '<div data-insp-path="src/A.tsx:1:1:A"></div>';
    const caps = await probeCapabilities();
    expect(caps.instrumented).toBe(true);
  });

  it('flags serverReachable + snippetSource=devserver when the probe URL returns 200', async () => {
    const fetcher = vi.fn().mockResolvedValue(okHead());
    const caps = await probeCapabilities({
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(caps.serverReachable).toBe(true);
    expect(caps.snippetSource).toBe('devserver');
  });

  it('falls back to snippetSource=sourcemap when sourceMapEnabled=true and a .map script is present', async () => {
    document.head.innerHTML = '<script src="/assets/index.js.map"></script>';
    const fetcher = vi.fn().mockResolvedValue(notFound());
    const caps = await probeCapabilities({
      serverUrl: 'http://localhost:5173',
      sourceMapEnabled: true,
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(caps.serverReachable).toBe(false);
    expect(caps.sourceMapAvailable).toBe(true);
    expect(caps.snippetSource).toBe('sourcemap');
  });

  it('does NOT claim sourcemap as snippetSource when sourceMapEnabled is false (the default)', async () => {
    document.head.innerHTML = '<script src="/assets/index.js.map"></script>';
    const fetcher = vi.fn().mockResolvedValue(notFound());
    const caps = await probeCapabilities({
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(caps.sourceMapAvailable).toBe(true);
    expect(caps.snippetSource).toBeNull();
  });

  it('flags agentConnected when the daemon URL returns 200', async () => {
    const fetcher = vi.fn().mockResolvedValue(okHead());
    const caps = await probeCapabilities({
      daemonUrl: 'http://127.0.0.1:5678',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(caps.agentConnected).toBe(true);
  });

  it('treats abort/timeout as unreachable', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.reject(new Error('aborted')));
    const caps = await probeCapabilities({
      serverUrl: 'http://localhost:5173',
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(caps.serverReachable).toBe(false);
  });
});

describe('publishCapabilities', () => {
  it('routes via onResult callback when provided', () => {
    const onResult = vi.fn();
    publishCapabilities(
      {
        instrumented: true,
        snippetSource: 'devserver',
        serverReachable: true,
        sourceMapAvailable: false,
        agentConnected: false,
      },
      { onResult },
    );
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('posts a namespaced message on window when no callback is provided', async () => {
    const received = await new Promise<unknown>((resolve) => {
      window.addEventListener(
        'message',
        (e) => {
          if (e.data?.source === 'inspekt') resolve(e.data);
        },
        { once: true },
      );
      publishCapabilities({
        instrumented: false,
        snippetSource: null,
        serverReachable: false,
        sourceMapAvailable: false,
        agentConnected: false,
      });
    });
    expect(received).toMatchObject({
      source: 'inspekt',
      type: INSPEKT_CAPABILITIES_MESSAGE,
    });
  });
});

describe('watchCapabilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns a teardown function', () => {
    const teardown = watchCapabilities({ onResult: () => {} });
    expect(typeof teardown).toBe('function');
    teardown();
  });

  it('publishes an initial result on mount', async () => {
    const calls: unknown[] = [];
    const teardown = watchCapabilities({ onResult: (c) => calls.push(c) });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.length).toBeGreaterThanOrEqual(1);
    teardown();
  });
});
