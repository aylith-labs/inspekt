import type { ComponentNode, FrameworkAdapter } from './types.js';
import { findSourceAttribute, parseSourceAttribute } from '../detection/source-detector.js';

const VUE_KEY = '__vue__';           // Vue 2
const VUE3_KEY = '__vue_app__';      // Vue 3 app root
const VUE_PARENT_KEY = '__vueParentComponent'; // Vue 3 component

interface VueInstance {
  $options?: { name?: string; __file?: string; _componentTag?: string };
  $parent?: VueInstance | null;
  $children?: VueInstance[];
  $el?: HTMLElement;
  $props?: Record<string, unknown>;
  type?: { name?: string; __file?: string; __name?: string };
  parent?: VueInstance | null;
  subTree?: { children?: VueInstance[]; el?: HTMLElement };
  props?: Record<string, unknown>;
}

function getVueInstance(element: HTMLElement): VueInstance | null {
  // Vue 3
  const vue3 = (element as unknown as Record<string, unknown>)[VUE_PARENT_KEY] as VueInstance | undefined;
  if (vue3) return vue3;

  // Vue 2
  const vue2 = (element as unknown as Record<string, unknown>)[VUE_KEY] as VueInstance | undefined;
  if (vue2) return vue2;

  return null;
}

function getComponentName(instance: VueInstance): string {
  // Vue 3
  if (instance.type) {
    return instance.type.name ?? instance.type.__name ?? 'Anonymous';
  }
  // Vue 2
  if (instance.$options) {
    return instance.$options.name ?? instance.$options._componentTag ?? 'Anonymous';
  }
  return 'Unknown';
}

function getFilePath(instance: VueInstance): string | null {
  // Vue 3
  if (instance.type?.__file) return instance.type.__file;
  // Vue 2
  if (instance.$options?.__file) return instance.$options.__file;
  return null;
}

function getElement(instance: VueInstance): HTMLElement | null {
  if (instance.subTree?.el instanceof HTMLElement) return instance.subTree.el;
  if (instance.$el instanceof HTMLElement) return instance.$el;
  return null;
}

function getProps(instance: VueInstance): Record<string, unknown> | null {
  const raw = instance.props ?? instance.$props;
  if (!raw || Object.keys(raw).length === 0) return null;

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'function') {
      cleaned[key] = `[Function]`;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = '[Object]';
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function instanceToNode(instance: VueInstance, depth: number): ComponentNode {
  const name = getComponentName(instance);
  const file = getFilePath(instance);
  const el = getElement(instance);
  let filePath = file;
  let line: number | null = null;

  // Check DOM element for data attribute (more accurate)
  if (el) {
    const attr = findSourceAttribute(el);
    if (attr) {
      const source = parseSourceAttribute(attr);
      if (source) {
        filePath = source.filePath;
        line = source.line;
      }
    }
  }

  return {
    name,
    filePath,
    line,
    column: null,
    domElement: el,
    props: getProps(instance),
    children: [],
    framework: 'vue',
    depth,
  };
}

export const vueAdapter: FrameworkAdapter = {
  name: 'vue',

  detect(): boolean {
    const root = document.getElementById('app') ?? document.getElementById('root');
    if (!root) return false;
    return !!(
      (root as unknown as Record<string, unknown>)[VUE3_KEY] ||
      (root as unknown as Record<string, unknown>)[VUE_KEY]
    );
  },

  getComponentTree(root: HTMLElement): ComponentNode | null {
    // Walk DOM to find Vue component instances
    const rootNode: ComponentNode = {
      name: 'App',
      filePath: null,
      line: null,
      column: null,
      domElement: root,
      props: null,
      children: [],
      framework: 'vue',
      depth: 0,
    };

    function walkDOM(el: HTMLElement, parent: ComponentNode, depth: number): void {
      for (const child of Array.from(el.children)) {
        if (!(child instanceof HTMLElement)) continue;

        const instance = getVueInstance(child);
        if (instance) {
          const node = instanceToNode(instance, depth);
          parent.children.push(node);
          walkDOM(child, node, depth + 1);
        } else {
          walkDOM(child, parent, depth);
        }
      }
    }

    walkDOM(root, rootNode, 1);
    return rootNode.children.length > 0 ? rootNode : null;
  },

  getComponentAtElement(element: HTMLElement): ComponentNode | null {
    const instance = getVueInstance(element);
    if (!instance) return null;
    return instanceToNode(instance, 0);
  },

  getAncestors(element: HTMLElement): ComponentNode[] {
    const ancestors: ComponentNode[] = [];
    let instance = getVueInstance(element);

    while (instance) {
      const parent = instance.parent ?? instance.$parent;
      if (parent) {
        ancestors.push(instanceToNode(parent, 0));
      }
      instance = parent ?? null;
    }

    return ancestors;
  },
};
