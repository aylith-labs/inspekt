// Vue source detection — the Vue parallel to fiber-detector.ts.
//
// Vue 3 (dev mode, `@vitejs/plugin-vue` with `isProduction === false`) hangs
// `__vueParentComponent` off every host element. The component instance's
// `type.__file` carries the source path. Vue 2 used `__vue__.$options.__file`
// on the element itself. Both are *dev-only* — production builds strip them.
//
// Unlike React fiber detection, Vue introspection needs no async import:
// the references are plain properties, so this runs synchronously and slots
// into the click/hover hot path with zero added latency.

import type { SourceInfo } from './source-detector.js';

interface Vue3Component {
  type?: {
    __file?: string;
    __name?: string;
    name?: string;
  };
  parent?: Vue3Component | null;
}

interface Vue2Instance {
  $options?: {
    __file?: string;
    name?: string;
    _componentTag?: string;
  };
  $parent?: Vue2Instance | null;
}

interface VueAugmentedElement extends HTMLElement {
  __vueParentComponent?: Vue3Component;
  __vue__?: Vue2Instance;
}

function fromVue3(el: VueAugmentedElement): SourceInfo | null {
  let cmp: Vue3Component | null | undefined = el.__vueParentComponent;
  // Walk up to the nearest component that owns a source file. The leaf
  // component's `type.__file` is usually the host DOM element's owner,
  // but defensive walking handles edge cases (slot content, transitions).
  while (cmp) {
    const file = cmp.type?.__file;
    if (file) {
      const name = cmp.type?.__name ?? cmp.type?.name ?? fileNameOf(file);
      return {
        filePath: file,
        line: 1,
        column: 1,
        componentName: name,
        rawPath: `${file}:1:1:${name}`,
      };
    }
    cmp = cmp.parent ?? null;
  }
  return null;
}

function fromVue2(el: VueAugmentedElement): SourceInfo | null {
  let vm: Vue2Instance | null | undefined = el.__vue__;
  while (vm) {
    const file = vm.$options?.__file;
    if (file) {
      const name =
        vm.$options?.name ?? vm.$options?._componentTag ?? fileNameOf(file);
      return {
        filePath: file,
        line: 1,
        column: 1,
        componentName: name,
        rawPath: `${file}:1:1:${name}`,
      };
    }
    vm = vm.$parent ?? null;
  }
  return null;
}

function fileNameOf(path: string): string {
  return path.split('/').pop()?.replace(/\.\w+$/, '') ?? 'Unknown';
}

/**
 * Sync Vue source lookup. Walks up `__vueParentComponent` (Vue 3) or
 * `__vue__` (Vue 2) until it finds a component with a `__file` source
 * attached at compile time. Returns null in production builds and on
 * non-Vue pages.
 *
 * Vue strips line/column from `__file`, so this surfaces `line: 1` —
 * good enough to open the file in the user's editor. The DOM-attribute
 * path (`data-insp-path`) remains the line-accurate option for Vue
 * projects that opt into `@inspekt/vite`.
 */
export function vueSourceFor(element: Element): SourceInfo | null {
  const el = element as VueAugmentedElement;
  return fromVue3(el) ?? fromVue2(el);
}
