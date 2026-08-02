import { genericAdapter } from './generic.js';
import { reactAdapter } from './react.js';
import { solidAdapter } from './solid.js';
import { svelteAdapter } from './svelte.js';
import type { FrameworkAdapter } from './types.js';
import { vueAdapter } from './vue.js';

export type { ComponentNode, FrameworkAdapter } from './types.js';

const adapters: FrameworkAdapter[] = [reactAdapter, vueAdapter, svelteAdapter, solidAdapter];

export function detectAdapter(): FrameworkAdapter {
  for (const adapter of adapters) {
    if (adapter.detect()) return adapter;
  }
  return genericAdapter;
}

export function getAdapter(framework: string): FrameworkAdapter {
  switch (framework) {
    case 'react':
      return reactAdapter;
    case 'vue':
      return vueAdapter;
    case 'svelte':
      return svelteAdapter;
    case 'solid':
      return solidAdapter;
    default:
      return genericAdapter;
  }
}
