import path from 'node:path';
import { createUnplugin } from 'unplugin';
import { isPathSelected } from './glob.js';
import { type TransformOptions, transformInspekt } from './transform-adapter.js';

export interface InspektPluginOptions {
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  pathType?: 'relative' | 'absolute';
  root?: string;
  include?: string[];
  exclude?: string[];
  escapeTags?: string[];
  /**
   * Inject `data-insp-path` attributes when `NODE_ENV=production` too.
   * Default `false`. Unlike the Vite plugin there is no resolved config to read,
   * so `NODE_ENV` is the only signal available here.
   */
  enableInProduction?: boolean;
}

const EXTENSION_RE = /\.(tsx|jsx|vue|svelte|astro)(\?.*)?$/;

export const unpluginInspekt = createUnplugin((userOptions: InspektPluginOptions = {}) => {
  const options = {
    framework: 'auto' as const,
    pathType: 'relative' as const,
    root: process.cwd(),
    include: ['**/*.{tsx,jsx,vue,svelte,astro}'],
    exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
    escapeTags: [] as string[],
    enableInProduction: false,
    ...userOptions,
  };

  const resolvedRoot = options.root;

  return {
    name: 'inspekt',
    enforce: 'pre' as const,

    transformInclude(id: string) {
      if (!EXTENSION_RE.test(id)) return false;
      if (process.env['NODE_ENV'] === 'production' && !options.enableInProduction) return false;
      const relativePath = path.relative(resolvedRoot, id);
      return isPathSelected(relativePath, options.include, options.exclude);
    },

    async transform(code: string, id: string) {
      const transformOptions: TransformOptions = {
        framework: options.framework,
        root: resolvedRoot,
        pathType: options.pathType,
        escapeTags: options.escapeTags,
      };
      return transformInspekt(code, id, transformOptions);
    },
  };
});

// Per-bundler exports
export const webpackPlugin = unpluginInspekt.webpack;
export const rspackPlugin = unpluginInspekt.rspack;
export const esbuildPlugin = unpluginInspekt.esbuild;
export const rollupPlugin = unpluginInspekt.rollup;
export const rolldownPlugin = unpluginInspekt.rolldown;
