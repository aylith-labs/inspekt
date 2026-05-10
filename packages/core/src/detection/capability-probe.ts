// Per-tab capability probe. Runs in the page's main world (or content-script
// world — works in either because it only touches the DOM and `fetch`) and
// posts the result via `window.postMessage` so the Chrome extension's content
// script can forward it to the background.
//
// The background script uses the result to pick the correct toolbar icon
// (greyscale vs color) and badge text ("OFF" / "ON" / "DEV" / "MAP" / "AI").

import type { PageCapabilities } from '../types.js';

const PROBE_THROTTLE_MS = 500;
const PROBE_TIMEOUT_MS = 1000;
export const INSPEKT_CAPABILITIES_MESSAGE = 'inspekt:capabilities';

export interface ProbeContext {
  /** When set, used as the URL prefix for the dev-server `/capabilities` ping. */
  serverUrl?: string;
  /** When set, used as the URL prefix for the daemon `/daemon` ping (Phase 3+). */
  daemonUrl?: string;
  /** Custom fetcher (injectable for tests). */
  fetcher?: typeof fetch;
  /** When set, posts the probe result via this callback instead of postMessage. */
  onResult?: (caps: PageCapabilities) => void;
}

async function pingHead(url: string, fetcher: typeof fetch): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetcher(url, { method: 'HEAD', signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function hasInstrumentation(): boolean {
  // Either a build-time attribute (multi-framework) or React fiber on the root
  // (zero-config React/Preact). Cheap synchronous check first.
  if (document.querySelector('[data-insp-path]')) return true;
  // Detecting React fiber here without importing bippy is unreliable; the
  // resolveElementSource() path will do it on actual element clicks. For the
  // probe we only flag instrumented when the static signal is present.
  return false;
}

function detectSourceMapHint(): boolean {
  // Cheap heuristic: at least one <script src=...> that returns the
  // `SourceMap` header or whose response ends with the `sourceMappingURL`
  // comment. We can't fetch every script body in the probe, so we look at
  // the document head for `<script>` tags whose URLs end with `.map` or
  // adjacent declarations. Conservative — Phase 5's resolver does the real
  // lookup on demand.
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
  for (const s of Array.from(scripts).slice(0, 5)) {
    if (s.src.endsWith('.map')) return true;
  }
  return false;
}

export async function probeCapabilities(ctx: ProbeContext = {}): Promise<PageCapabilities> {
  const fetcher = ctx.fetcher ?? fetch;
  const instrumented = hasInstrumentation();
  const sourceMapAvailable = detectSourceMapHint();

  const serverReachable = ctx.serverUrl
    ? await pingHead(new URL('/__inspekt/capabilities', ctx.serverUrl).toString(), fetcher)
    : false;

  const agentConnected = ctx.daemonUrl
    ? await pingHead(new URL('/__inspekt/daemon', ctx.daemonUrl).toString(), fetcher)
    : false;

  const snippetSource: PageCapabilities['snippetSource'] = serverReachable
    ? 'devserver'
    : sourceMapAvailable
      ? 'sourcemap'
      : null;

  return {
    instrumented,
    snippetSource,
    serverReachable,
    sourceMapAvailable,
    agentConnected,
  };
}

/**
 * Publishes the probe result via `window.postMessage` so a Chrome extension
 * content script can forward it to the background. The message envelope is
 * stable and namespaced under `inspekt:capabilities`.
 */
export function publishCapabilities(caps: PageCapabilities, ctx: ProbeContext = {}): void {
  if (ctx.onResult) {
    ctx.onResult(caps);
    return;
  }
  window.postMessage(
    { source: 'inspekt', type: INSPEKT_CAPABILITIES_MESSAGE, payload: caps },
    '*',
  );
}

/**
 * Installs a MutationObserver that re-probes when `data-insp-path` attributes
 * appear/disappear from the document. Returns a teardown function.
 */
export function watchCapabilities(ctx: ProbeContext = {}): () => void {
  let pending = false;
  let lastPub = 0;

  const fire = async () => {
    if (pending) return;
    pending = true;
    try {
      const caps = await probeCapabilities(ctx);
      publishCapabilities(caps, ctx);
      lastPub = Date.now();
    } finally {
      pending = false;
    }
  };

  const schedule = () => {
    const elapsed = Date.now() - lastPub;
    if (elapsed >= PROBE_THROTTLE_MS) {
      void fire();
    } else {
      setTimeout(fire, PROBE_THROTTLE_MS - elapsed);
    }
  };

  // Initial probe.
  void fire();

  const observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'data-insp-path') {
        schedule();
        return;
      }
      if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
        // Fast-path: only re-probe when an element we care about appeared.
        const added = Array.from(m.addedNodes).some(
          (n) => n instanceof Element && n.querySelector?.('[data-insp-path]'),
        );
        if (added) {
          schedule();
          return;
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-insp-path'],
  });

  return () => observer.disconnect();
}
