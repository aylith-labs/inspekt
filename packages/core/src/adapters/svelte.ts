import type { ComponentNode, FrameworkAdapter } from './types.js';
import { findSourceAttribute, parseSourceAttribute } from '../detection/source-detector.js';

// Svelte 4/5 attaches context to DOM elements
const SVELTE_CONTEXT_KEY = '__svelte_meta';

interface SvelteContext {
  loc?: { file?: string; line?: number; column?: number; char?: number };
}

function getSvelteContext(element: HTMLElement): SvelteContext | null {
  return (element as unknown as Record<string, unknown>)[SVELTE_CONTEXT_KEY] as SvelteContext | null;
}

function getComponentNameFromFile(file: string): string {
  const parts = file.split('/');
  const filename = parts[parts.length - 1] ?? '';
  return filename.replace(/\.svelte$/, '');
}

export const svelteAdapter: FrameworkAdapter = {
  name: 'svelte',

  detect(): boolean {
    // Check for Svelte's internal markers
    return document.querySelector(`[class*="svelte-"]`) !== null ||
      document.querySelector('[data-svelte-h]') !== null;
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
      framework: 'svelte',
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
              framework: 'svelte',
              depth,
            };
            parent.children.push(node);
            walkDOM(child, node, depth + 1);
            continue;
          }
        }

        // Try Svelte context
        const ctx = getSvelteContext(child);
        if (ctx?.loc?.file) {
          const node: ComponentNode = {
            name: getComponentNameFromFile(ctx.loc.file),
            filePath: ctx.loc.file,
            line: ctx.loc.line ?? null,
            column: ctx.loc.column ?? null,
            domElement: child,
            props: null,
            children: [],
            framework: 'svelte',
            depth,
          };
          parent.children.push(node);
          walkDOM(child, node, depth + 1);
          continue;
        }

        // Not a component — continue walking
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
          framework: 'svelte',
          depth: 0,
        };
      }
    }

    const ctx = getSvelteContext(element);
    if (ctx?.loc?.file) {
      return {
        name: getComponentNameFromFile(ctx.loc.file),
        filePath: ctx.loc.file,
        line: ctx.loc.line ?? null,
        column: ctx.loc.column ?? null,
        domElement: element,
        props: null,
        children: [],
        framework: 'svelte',
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
