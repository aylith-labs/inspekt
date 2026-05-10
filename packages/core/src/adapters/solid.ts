import type { ComponentNode, FrameworkAdapter } from './types.js';
import { findSourceAttribute, parseSourceAttribute } from '../detection/source-detector.js';

// Solid attaches owner information to DOM elements in dev mode
const SOLID_DEV_KEY = '_$owner';

interface SolidOwner {
  name?: string;
  componentName?: string;
  sourceMap?: { file?: string; line?: number; column?: number };
  owner?: SolidOwner;
}

function getSolidOwner(element: HTMLElement): SolidOwner | null {
  return (element as unknown as Record<string, unknown>)[SOLID_DEV_KEY] as SolidOwner | null;
}

export const solidAdapter: FrameworkAdapter = {
  name: 'solid',

  detect(): boolean {
    // Solid uses _$HY for hydration and data-hk for hydration keys
    return document.querySelector('[data-hk]') !== null ||
      !!(document as unknown as Record<string, unknown>)['_$HY'];
  },

  getComponentTree(root: HTMLElement): ComponentNode | null {
    const rootNode: ComponentNode = {
      name: 'App',
      filePath: null,
      line: null,
      column: null,
      domElement: root,
      props: null,
      children: [],
      framework: 'solid',
      depth: 0,
    };

    function walkDOM(el: HTMLElement, parent: ComponentNode, depth: number): void {
      for (const child of Array.from(el.children)) {
        if (!(child instanceof HTMLElement)) continue;

        // Try inspekt data attribute first
        const attr = findSourceAttribute(child);
        if (attr) {
          const source = parseSourceAttribute(attr);
          if (source) {
            const node: ComponentNode = {
              name: source.componentName,
              filePath: source.filePath,
              line: source.line,
              column: source.column,
              domElement: child,
              props: null,
              children: [],
              framework: 'solid',
              depth,
            };
            parent.children.push(node);
            walkDOM(child, node, depth + 1);
            continue;
          }
        }

        // Try Solid owner
        const owner = getSolidOwner(child);
        if (owner?.componentName || owner?.name) {
          const node: ComponentNode = {
            name: owner.componentName ?? owner.name ?? 'Component',
            filePath: owner.sourceMap?.file ?? null,
            line: owner.sourceMap?.line ?? null,
            column: owner.sourceMap?.column ?? null,
            domElement: child,
            props: null,
            children: [],
            framework: 'solid',
            depth,
          };
          parent.children.push(node);
          walkDOM(child, node, depth + 1);
          continue;
        }

        walkDOM(child, parent, depth);
      }
    }

    walkDOM(root, rootNode, 1);
    return rootNode.children.length > 0 ? rootNode : null;
  },

  getComponentAtElement(element: HTMLElement): ComponentNode | null {
    const attr = findSourceAttribute(element);
    if (attr) {
      const source = parseSourceAttribute(attr);
      if (source) {
        return {
          name: source.componentName,
          filePath: source.filePath,
          line: source.line,
          column: source.column,
          domElement: element,
          props: null,
          children: [],
          framework: 'solid',
          depth: 0,
        };
      }
    }

    const owner = getSolidOwner(element);
    if (owner?.componentName || owner?.name) {
      return {
        name: owner.componentName ?? owner.name ?? 'Component',
        filePath: owner.sourceMap?.file ?? null,
        line: owner.sourceMap?.line ?? null,
        column: owner.sourceMap?.column ?? null,
        domElement: element,
        props: null,
        children: [],
        framework: 'solid',
        depth: 0,
      };
    }

    return null;
  },

  getAncestors(element: HTMLElement): ComponentNode[] {
    const ancestors: ComponentNode[] = [];
    let current = element.parentElement;

    while (current) {
      const node = this.getComponentAtElement(current);
      if (node) ancestors.push(node);
      current = current.parentElement;
    }

    return ancestors;
  },
};
