import type { InspectedElement } from '../types.js';

const SOURCE_ATTRIBUTES = ['data-inspekt-path', 'data-insp-path'];

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
  for (const attr of SOURCE_ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (value) return value;
  }
  return null;
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
    framework: 'unknown',
  };
}
