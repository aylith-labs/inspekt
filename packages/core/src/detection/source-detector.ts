import type { InspectedElement } from '../types.js';

// Single source attribute, aligned with @code-inspector/core's hardcoded
// constant. Anything emitting the older `data-inspekt-path` (the rename
// transition) must update — we don't carry a back-compat shim.
const SOURCE_ATTRIBUTE = 'data-insp-path';

export interface SourceInfo {
  filePath: string;
  line: number;
  column: number;
  componentName: string;
  rawPath: string;
}

export function parseSourceAttribute(value: string): SourceInfo | null {
  // Format: filePath:line:column:componentName
  const parts = value.split(':');
  if (parts.length < 2) return null;

  // Handle Windows paths (C:\...) — the colon after drive letter
  let filePath: string;
  let rest: string[];
  if (/^[A-Z]$/i.test(parts[0] ?? '') && parts[1]?.startsWith('\\')) {
    filePath = `${parts[0]}:${parts[1]}`;
    rest = parts.slice(2);
  } else {
    filePath = parts[0]!;
    rest = parts.slice(1);
  }

  const line = parseInt(rest[0] ?? '', 10);
  const column = parseInt(rest[1] ?? '', 10);
  const componentName = rest[2] ?? filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? 'Unknown';

  if (isNaN(line)) return null;

  return {
    filePath,
    line,
    column: isNaN(column) ? 1 : column,
    componentName,
    rawPath: value,
  };
}

export function findSourceAttribute(element: HTMLElement): string | null {
  return element.getAttribute(SOURCE_ATTRIBUTE);
}

export function findClosestSource(element: HTMLElement): { element: HTMLElement; source: SourceInfo } | null {
  let current: HTMLElement | null = element;

  while (current) {
    const attrValue = findSourceAttribute(current);
    if (attrValue) {
      const source = parseSourceAttribute(attrValue);
      if (source) return { element: current, source };
    }
    current = current.parentElement;
  }

  return null;
}

export function elementToInspected(
  domElement: HTMLElement,
  source: SourceInfo,
  pathMapping: Record<string, string> = {},
  detectionSource: 'fiber' | 'attribute' = 'attribute',
): InspectedElement {
  let resolvedPath = source.filePath;
  for (const [containerPath, hostPath] of Object.entries(pathMapping)) {
    if (resolvedPath.startsWith(containerPath)) {
      resolvedPath = resolvedPath.replace(containerPath, hostPath);
      break;
    }
  }

  return {
    filePath: resolvedPath,
    line: source.line,
    column: source.column,
    componentName: source.componentName,
    rawPath: source.rawPath,
    domElement,
    tagName: domElement.tagName.toLowerCase(),
    classList: Array.from(domElement.classList),
    id: domElement.id || null,
    boundingRect: domElement.getBoundingClientRect(),
    ancestors: [],
    children: [],
    props: null,
    framework: detectionSource === 'fiber' ? 'react' : 'unknown',
    detectionSource,
  };
}

/**
 * Resolves source for a DOM element using the strategy chain:
 *   1. React fiber `_debugSource` (zero-config for React/Preact)
 *   2. `data-insp-path` / `data-inspekt-path` DOM attribute
 *   3. null (no source available)
 *
 * Returns the matching element AND the source info. The element may be
 * an ancestor of the input when only ancestors carry the attribute.
 */
export async function resolveElementSource(
  element: HTMLElement,
): Promise<{ element: HTMLElement; source: SourceInfo; from: 'fiber' | 'attribute' } | null> {
  // Tier 1 — fiber. Lazy-import keeps bippy out of bundles that don't need it.
  try {
    const { fiberSourceFor } = await import('./fiber-detector.js');
    const fiberSource = await fiberSourceFor(element);
    if (fiberSource) {
      return { element, source: fiberSource, from: 'fiber' };
    }
  } catch {
    // bippy unavailable or threw — fall through silently
  }

  // Tier 2 — DOM attribute on element or ancestor.
  const attrHit = findClosestSource(element);
  if (attrHit) {
    return { element: attrHit.element, source: attrHit.source, from: 'attribute' };
  }

  return null;
}
