// Fiber-based source detection for React/Preact apps.
//
// React's `@babel/plugin-transform-react-jsx-source` (default in CRA, Vite-React,
// Next.js dev) attaches `_debugSource` to every JSXOpeningElement at build time.
// React's reconciler stores it on the resulting fiber. We can read it via bippy's
// fiber-traversal helpers.
//
// This means React projects need *no* build plugin from us — click-to-source
// works automatically in dev. The DOM-attribute path (Phase 0 transform) covers
// Vue / Svelte / Solid where there is no equivalent fiber convention.

import type { Fiber } from 'bippy';
import type { SourceInfo } from './source-detector.js';

let bippy: typeof import('bippy') | null = null;
let bippyImportPromise: Promise<typeof import('bippy')> | null = null;

async function loadBippy(): Promise<typeof import('bippy')> {
  if (bippy) return bippy;
  if (!bippyImportPromise) {
    bippyImportPromise = import('bippy');
  }
  bippy = await bippyImportPromise;
  return bippy;
}

interface DebugSource {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Walks up the fiber tree from a host fiber until it finds one with
 * `_debugSource` populated and a non-null component type.
 */
function findFiberWithDebugSource(
  startFiber: Fiber,
  isCompositeFiber: (f: Fiber) => boolean,
): Fiber | null {
  let f: Fiber | null = startFiber;
  while (f) {
    const debug = (f as Fiber & { _debugSource?: DebugSource })._debugSource;
    if (debug?.fileName && typeof debug.lineNumber === 'number') {
      // Prefer a composite (function/class) fiber over a host (div/span) fiber
      // for componentName purposes. Continue walking only if the current frame
      // is a host fiber and we haven't seen a composite yet.
      if (isCompositeFiber(f)) return f;
      // Walk one more step looking for a composite owner before returning.
      let upper: Fiber | null = f.return;
      while (upper) {
        const upperDebug = (upper as Fiber & { _debugSource?: DebugSource })._debugSource;
        if (upperDebug?.fileName && isCompositeFiber(upper)) return upper;
        upper = upper.return;
      }
      return f; // host fiber with debugSource — better than nothing
    }
    f = f.return;
  }
  return null;
}

/**
 * Reads source location for a DOM element via React fiber `_debugSource`.
 * Returns null when:
 *   - bippy can't find a fiber (not a React app, or React not in dev mode)
 *   - no `_debugSource` is set (Babel jsx-source plugin disabled)
 *
 * Designed to be called *before* the DOM-attribute fallback. Either path
 * yields a `SourceInfo` the rest of the runtime already understands.
 */
export async function fiberSourceFor(element: Element): Promise<SourceInfo | null> {
  const { getFiberFromHostInstance, isCompositeFiber, getDisplayName } = await loadBippy();

  const hostFiber = getFiberFromHostInstance(element);
  if (!hostFiber) return null;

  const fiber = findFiberWithDebugSource(hostFiber, isCompositeFiber);
  if (!fiber) return null;

  const debug = (fiber as Fiber & { _debugSource?: DebugSource })._debugSource;
  if (!debug?.fileName || typeof debug.lineNumber !== 'number') return null;

  const componentName =
    getDisplayName(fiber.type) ??
    debug.fileName.split('/').pop()?.replace(/\.\w+$/, '') ??
    'Unknown';

  return {
    filePath: debug.fileName,
    line: debug.lineNumber,
    column: debug.columnNumber ?? 1,
    componentName,
    rawPath: `${debug.fileName}:${debug.lineNumber}:${debug.columnNumber ?? 1}:${componentName}`,
  };
}
