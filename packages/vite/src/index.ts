import type { Plugin } from 'vite';
import path from 'node:path';
import { transformJSX, type TransformOptions } from './transform.js';
import { handleDevLensRequest, corsMiddleware } from './server.js';
import { findComposeFile, parsePathMappings } from './docker.js';

export interface DevLensViteOptions {
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  pathType?: 'relative' | 'absolute';
  root?: string;
  pathMapping?: Record<string, string>;
  dockerCompose?: boolean;
  editor?: string;
  runtimeOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
}

const EXTENSION_RE = /\.(tsx|jsx|vue|svelte|astro)(\?.*)?$/;

export function devlens(userOptions: DevLensViteOptions = {}): Plugin {
  const options = {
    framework: 'auto' as const,
    pathType: 'relative' as const,
    root: process.cwd(),
    pathMapping: {} as Record<string, string>,
    dockerCompose: false,
    editor: 'cursor',
    include: ['**/*.{tsx,jsx,vue,svelte,astro}'],
    exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
    ...userOptions,
  };

  let resolvedRoot: string;
  let pathMapping: Record<string, string>;

  return {
    name: 'devlens',
    enforce: 'pre',

    configResolved(config) {
      resolvedRoot = config.root;
      options.root = resolvedRoot;

      // Auto-detect Docker path mappings
      pathMapping = { ...options.pathMapping };
      if (options.dockerCompose) {
        const composeFile = findComposeFile(resolvedRoot);
        if (composeFile) {
          const autoMappings = parsePathMappings(composeFile);
          pathMapping = { ...autoMappings, ...pathMapping };
        }
      }
    },

    configureServer(server) {
      // CORS preflight
      server.middlewares.use((req, res, next) => {
        if (corsMiddleware(req, res)) return;
        next();
      });

      // Open-in-editor endpoint
      server.middlewares.use((req, res, next) => {
        const handled = handleDevLensRequest(req, res, {
          editor: options.editor,
          pathMapping,
          root: resolvedRoot,
        });
        if (!handled) next();
      });
    },

    transform(code, id) {
      // Skip in production
      if (process.env['NODE_ENV'] === 'production') return null;

      // Check file extension
      if (!EXTENSION_RE.test(id)) return null;

      // Check include/exclude
      const relativePath = path.relative(resolvedRoot, id);
      for (const pattern of options.exclude) {
        if (minimatch(relativePath, pattern)) return null;
      }

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

    transformIndexHtml() {
      // Inject runtime initialization script
      const serverUrl = `http://localhost:${5173}`;
      const runtimeOptions = {
        ...options.runtimeOptions,
        serverUrl,
        editor: options.editor,
        pathMapping,
      };

      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `
            import { createDevLens } from '@devlens/core';
            const devlens = createDevLens(${JSON.stringify(runtimeOptions)});
            devlens.enable();
            window.__DEVLENS_INSTANCE__ = devlens;
          `,
          injectTo: 'body' as const,
        },
      ];
    },
  };
}

// Simple glob matching (avoids dependency)
function minimatch(path: string, pattern: string): boolean {
  const re = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${re}$`).test(path);
}

export { transformJSX } from './transform.js';
export type { TransformOptions } from './transform.js';
