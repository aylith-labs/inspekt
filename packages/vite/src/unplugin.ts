import { createUnplugin } from 'unplugin';
import path from 'node:path';
import { transformJSX, type TransformOptions } from './transform.js';
import { findComposeFile, parsePathMappings } from './docker.js';

export interface DevLensPluginOptions {
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  pathType?: 'relative' | 'absolute';
  root?: string;
  pathMapping?: Record<string, string>;
  dockerCompose?: boolean;
  include?: string[];
  exclude?: string[];
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

export const unpluginDevLens = createUnplugin((userOptions: DevLensPluginOptions = {}) => {
  const options = {
    framework: 'auto' as const,
    pathType: 'relative' as const,
    root: process.cwd(),
    pathMapping: {} as Record<string, string>,
    dockerCompose: false,
    include: ['**/*.{tsx,jsx,vue,svelte,astro}'],
    exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
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
    name: 'devlens',
    enforce: 'pre' as const,

    transformInclude(id: string) {
      if (!EXTENSION_RE.test(id)) return false;
      if (process.env['NODE_ENV'] === 'production') return false;
      const rel = path.relative(resolvedRoot, id);
      return !options.exclude.some((p) => minimatch(rel, p));
    },

    transform(code: string, id: string) {
      const transformOptions: TransformOptions = {
        framework: options.framework,
        root: resolvedRoot,
        pathType: options.pathType,
        attribute: 'data-devlens-path',
        include: options.include,
        exclude: options.exclude,
      };
      return transformJSX(code, id, transformOptions);
    },
  };
});

// Per-bundler exports
export const webpackPlugin = unpluginDevLens.webpack;
export const rspackPlugin = unpluginDevLens.rspack;
export const esbuildPlugin = unpluginDevLens.esbuild;
export const rollupPlugin = unpluginDevLens.rollup;
