import type { ComponentNode, FrameworkAdapter } from './types.js';
import { parseSourceAttribute, findSourceAttribute } from '../detection/source-detector.js';

// React Fiber internal key prefix
const FIBER_KEY_PREFIX = '__reactFiber$';
const INTERNAL_KEY_PREFIX = '__reactInternalInstance$';

function getFiberFromElement(element: HTMLElement): Record<string, unknown> | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith(FIBER_KEY_PREFIX) || key.startsWith(INTERNAL_KEY_PREFIX)) {
      return (element as unknown as Record<string, unknown>)[key] as Record<string, unknown>;
    }
  }
  return null;
}

function isUserComponent(fiber: Record<string, unknown>): boolean {
  const tag = fiber['tag'] as number;
  // FunctionComponent = 0, ClassComponent = 1, ForwardRef = 11, MemoComponent = 14, SimpleMemoComponent = 15
  return tag === 0 || tag === 1 || tag === 11 || tag === 14 || tag === 15;
}

interface FunctionWithDisplayName {
  displayName?: string;
  name?: string;
}

function getComponentName(fiber: Record<string, unknown>): string {
  // A fiber's `type` is a host string ("div"), a component function, or an
  // object wrapper (forwardRef/memo). Keep all three in the union so the
  // `typeof` checks below narrow correctly.
  const type = fiber['type'] as
    | string
    | (FunctionWithDisplayName & ((...args: unknown[]) => unknown))
    | Record<string, unknown>
    | null;
  if (!type) return 'Unknown';

  if (typeof type === 'function') {
    return type.displayName ?? type.name ?? 'Anonymous';
  }

  // ForwardRef, memo wrappers
  if (typeof type === 'object') {
    const render = type['render'] as FunctionWithDisplayName | undefined;
    if (render) return render.displayName ?? render.name ?? 'ForwardRef';

    const innerType = type['type'] as FunctionWithDisplayName | undefined;
    if (innerType) return innerType.displayName ?? innerType.name ?? 'Memo';
  }

  if (typeof type === 'string') return type;

  return 'Unknown';
}

function getProps(fiber: Record<string, unknown>): Record<string, unknown> | null {
  const memoizedProps = fiber['memoizedProps'] as Record<string, unknown> | null;
  if (!memoizedProps) return null;

  // Filter out children and internal props
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(memoizedProps)) {
    if (key === 'children') continue;
    if (typeof value === 'function') {
      cleaned[key] = `[Function: ${(value as Function).name || 'anonymous'}]`;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = '[Object]';
    } else {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function getSourceFromFiber(fiber: Record<string, unknown>): { filePath: string; line: number; column: number } | null {
  // Check _debugSource (React dev mode)
  const debugSource = fiber['_debugSource'] as Record<string, unknown> | undefined;
  if (debugSource) {
    return {
      filePath: (debugSource['fileName'] as string) ?? '',
      line: (debugSource['lineNumber'] as number) ?? 0,
      column: (debugSource['columnNumber'] as number) ?? 0,
    };
  }

  // Fall back to DOM element's data attribute
  const stateNode = fiber['stateNode'] as HTMLElement | null;
  if (stateNode && stateNode instanceof HTMLElement) {
    const attr = findSourceAttribute(stateNode);
    if (attr) {
      const parsed = parseSourceAttribute(attr);
      if (parsed) return { filePath: parsed.filePath, line: parsed.line, column: parsed.column };
    }
  }

  return null;
}

function fiberToNode(fiber: Record<string, unknown>, depth: number): ComponentNode | null {
  if (!isUserComponent(fiber)) return null;

  const name = getComponentName(fiber);
  const source = getSourceFromFiber(fiber);
  const stateNode = fiber['stateNode'] as HTMLElement | null;
  const domElement = stateNode instanceof HTMLElement ? stateNode : findDomElement(fiber);

  const node: ComponentNode = {
    name,
    filePath: source?.filePath ?? null,
    line: source?.line ?? null,
    column: source?.column ?? null,
    domElement,
    props: getProps(fiber),
    children: [],
    framework: 'react',
    depth,
  };

  // Walk children
  let child = fiber['child'] as Record<string, unknown> | null;
  while (child) {
    const childNode = fiberToNode(child, depth + 1);
    if (childNode) {
      node.children.push(childNode);
    } else {
      // Skip non-user components but traverse their children
      const grandchildren = collectUserChildren(child, depth + 1);
      node.children.push(...grandchildren);
    }
    child = child['sibling'] as Record<string, unknown> | null;
  }

  return node;
}

function collectUserChildren(fiber: Record<string, unknown>, depth: number): ComponentNode[] {
  const result: ComponentNode[] = [];
  let child = fiber['child'] as Record<string, unknown> | null;
  while (child) {
    const node = fiberToNode(child, depth);
    if (node) {
      result.push(node);
    } else {
      result.push(...collectUserChildren(child, depth));
    }
    child = child['sibling'] as Record<string, unknown> | null;
  }
  return result;
}

function findDomElement(fiber: Record<string, unknown>): HTMLElement | null {
  // Walk down the fiber tree to find the first DOM element
  let current: Record<string, unknown> | null = fiber;
  while (current) {
    const stateNode = current['stateNode'];
    if (stateNode instanceof HTMLElement) return stateNode;
    current = current['child'] as Record<string, unknown> | null;
  }
  return null;
}

function findRootFiber(container: HTMLElement): Record<string, unknown> | null {
  // React 18+ uses _reactRootContainer or __reactContainer$
  for (const key of Object.keys(container)) {
    if (key.startsWith('__reactContainer$')) {
      return (container as unknown as Record<string, unknown>)[key] as Record<string, unknown>;
    }
  }

  const root = (container as unknown as Record<string, unknown>)['_reactRootContainer'] as Record<string, unknown> | undefined;
  if (root) {
    const internalRoot = root['_internalRoot'] as Record<string, unknown> | undefined;
    if (internalRoot) {
      return internalRoot['current'] as Record<string, unknown> | null;
    }
  }

  return null;
}

export const reactAdapter: FrameworkAdapter = {
  name: 'react',

  detect(): boolean {
    // Check for React root containers
    const root = document.getElementById('root') ?? document.getElementById('app') ?? document.querySelector('[data-reactroot]');
    if (!root) return false;

    for (const key of Object.keys(root)) {
      if (key.startsWith('__reactContainer$') || key.startsWith(FIBER_KEY_PREFIX) || key.startsWith(INTERNAL_KEY_PREFIX)) {
        return true;
      }
    }

    return !!(root as unknown as Record<string, unknown>)['_reactRootContainer'];
  },

  getComponentTree(root: HTMLElement): ComponentNode | null {
    const rootFiber = findRootFiber(root);
    if (!rootFiber) return null;

    // The root fiber's child is the actual app
    const appFiber = rootFiber['child'] as Record<string, unknown> | null;
    if (!appFiber) return null;

    return fiberToNode(appFiber, 0);
  },

  getComponentAtElement(element: HTMLElement): ComponentNode | null {
    const fiber = getFiberFromElement(element);
    if (!fiber) return null;

    // Walk up to find the nearest user component
    let current: Record<string, unknown> | null = fiber;
    while (current) {
      if (isUserComponent(current)) {
        return fiberToNode(current, 0);
      }
      current = current['return'] as Record<string, unknown> | null;
    }

    return null;
  },

  getAncestors(element: HTMLElement): ComponentNode[] {
    const fiber = getFiberFromElement(element);
    if (!fiber) return [];

    const ancestors: ComponentNode[] = [];
    let current = fiber['return'] as Record<string, unknown> | null;

    while (current) {
      if (isUserComponent(current)) {
        const node = fiberToNode(current, 0);
        if (node) {
          node.children = []; // Don't include full subtrees for ancestors
          ancestors.push(node);
        }
      }
      current = current['return'] as Record<string, unknown> | null;
    }

    return ancestors;
  },
};
