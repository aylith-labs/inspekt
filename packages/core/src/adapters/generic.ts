import type { ComponentNode, FrameworkAdapter } from './types.js';
import { findSourceAttribute, parseSourceAttribute } from '../detection/source-detector.js';

function buildTreeFromDOM(element: HTMLElement, depth: number): ComponentNode[] {
  const nodes: ComponentNode[] = [];

  for (const child of Array.from(element.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName === 'INSPEKT-ROOT') continue;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;

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
          children: buildTreeFromDOM(child, depth + 1),
          framework: 'unknown',
          depth,
        };
        nodes.push(node);
        continue;
      }
    }

    // Not a component — recurse into children
    nodes.push(...buildTreeFromDOM(child, depth));
  }

  return nodes;
}

export const genericAdapter: FrameworkAdapter = {
  name: 'generic',

  detect(): boolean {
    return document.querySelector('[data-insp-path], [data-insp-path]') !== null;
  },

  getComponentTree(root: HTMLElement): ComponentNode | null {
    const children = buildTreeFromDOM(root, 1);
    if (children.length === 0) return null;

    return {
      name: 'Root',
      filePath: null,
      line: null,
      column: null,
      domElement: root,
      props: null,
      children,
      framework: 'unknown',
      depth: 0,
    };
  },

  getComponentAtElement(element: HTMLElement): ComponentNode | null {
    const attr = findSourceAttribute(element);
    if (!attr) return null;

    const source = parseSourceAttribute(attr);
    if (!source) return null;

    return {
      name: source.componentName,
      filePath: source.filePath,
      line: source.line,
      column: source.column,
      domElement: element,
      props: null,
      children: buildTreeFromDOM(element, 1),
      framework: 'unknown',
      depth: 0,
    };
  },

  getAncestors(element: HTMLElement): ComponentNode[] {
    const ancestors: ComponentNode[] = [];
    let current = element.parentElement;

    while (current) {
      const attr = findSourceAttribute(current);
      if (attr) {
        const source = parseSourceAttribute(attr);
        if (source) {
          ancestors.push({
            name: source.componentName,
            filePath: source.filePath,
            line: source.line,
            column: source.column,
            domElement: current,
            props: null,
            children: [],
            framework: 'unknown',
            depth: 0,
          });
        }
      }
      current = current.parentElement;
    }

    return ancestors;
  },
};
