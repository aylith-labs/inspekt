import type { FrameworkAdapter } from './types.js';
import { reactAdapter } from './react.js';
import { genericAdapter } from './generic.js';

export type { ComponentNode, FrameworkAdapter } from './types.js';

const adapters: FrameworkAdapter[] = [
  reactAdapter,
  // Future: vueAdapter, svelteAdapter, solidAdapter
];

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
    default:
      return genericAdapter;
  }
}
