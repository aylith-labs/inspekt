import { createUnplugin } from 'unplugin';
import path from 'node:path';
import { transformInspekt, type TransformOptions } from './transform-adapter.js';
import { findComposeFile, parsePathMappings } from './docker.js';

export interface InspektPluginOptions {
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  pathType?: 'relative' | 'absolute';
  root?: string;
  pathMapping?: Record<string, string>;
  dockerCompose?: boolean;
  include?: string[];
  exclude?: string[];
  escapeTags?: string[];
}

const EXTENSION_RE = /\.(tsx|jsx|vue|svelte|astro)(\?.*)?$/;

function minimatch(filePath: string, pattern: string): boolean {
  const re = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${re}$`).test(filePath);
}

export const unpluginInspekt = createUnplugin((userOptions: InspektPluginOptions = {}) => {
  const options = {
    framework: 'auto' as const,
    pathType: 'relative' as const,
    root: process.cwd(),
    pathMapping: {} as Record<string, string>,
    dockerCompose: false,
    include: ['**/*.{tsx,jsx,vue,svelte,astro}'],
    exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
    escapeTags: [] as string[],
    ...userOptions,
  };

  let resolvedRoot = options.root;
  let pathMapping = { ...options.pathMapping };

  if (options.dockerCompose) {
    const composeFile = findComposeFile(resolvedRoot);
    if (composeFile) {
      pathMapping = { ...parsePathMappings(composeFile), ...pathMapping };
    }
  }

  return {
    name: 'inspekt',
    enforce: 'pre' as const,

    transformInclude(id: string) {
      if (!EXTENSION_RE.test(id)) return false;
      if (process.env['NODE_ENV'] === 'production') return false;
      const rel = path.relative(resolvedRoot, id);
      return !options.exclude.some((p) => minimatch(rel, p));
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
