import type { Plugin } from 'vite';
import path from 'node:path';
import { transformInspekt, type TransformOptions } from './transform-adapter.js';
import { handleInspektRequest, corsMiddleware } from './server.js';
import { findComposeFile, parsePathMappings } from './docker.js';

export interface InspektViteOptions {
  framework?: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  pathType?: 'relative' | 'absolute';
  root?: string;
  pathMapping?: Record<string, string>;
  dockerCompose?: boolean;
  editor?: string;
  runtimeOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  escapeTags?: string[];
}

const EXTENSION_RE = /\.(tsx|jsx|vue|svelte|astro)(\?.*)?$/;
const INIT_PATH = '/@inspekt/init.js';

export function inspekt(userOptions: InspektViteOptions = {}): Plugin {
  const options = {
    framework: 'auto' as const,
    pathType: 'relative' as const,
    root: process.cwd(),
    pathMapping: {} as Record<string, string>,
    dockerCompose: false,
    editor: 'cursor',
    include: ['**/*.{tsx,jsx,vue,svelte,astro}'],
    exclude: ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
    escapeTags: [] as string[],
    ...userOptions,
  };

  let resolvedRoot: string;
  let pathMapping: Record<string, string>;
  let serverPort = 5173;

  function buildInitScript(): string {
    const runtimeOptions = {
      ...options.runtimeOptions,
      serverUrl: `http://localhost:${serverPort}`,
      editor: options.editor,
      pathMapping: pathMapping ?? options.pathMapping,
    };
    return `
import { createInspekt } from '@inspekt/core';
const inspekt = createInspekt(${JSON.stringify(runtimeOptions)});
inspekt.enable();
window.__INSPEKT_INSTANCE__ = inspekt;
`;
  }

  return {
    name: 'inspekt',
    enforce: 'pre',

    configResolved(config) {
      resolvedRoot = config.root;
      options.root = resolvedRoot;
      if (config.server?.port) serverPort = config.server.port;

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
      // Serve the Inspekt init script as a Vite-transformed module
      server.middlewares.use((req, res, next) => {
        if (req.url === INIT_PATH) {
          // Let Vite transform the module (resolves @inspekt/core import)
          server.transformRequest(INIT_PATH).then((result) => {
            if (result) {
              res.writeHead(200, {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-cache',
              });
              res.end(result.code);
            } else {
              next();
            }
          }).catch(() => next());
          return;
        }

        // CORS preflight
        if (corsMiddleware(req, res)) return;

        // Open-in-editor endpoint
        const handled = handleInspektRequest(req, res, {
          editor: options.editor,
          pathMapping,
          root: resolvedRoot,
        });
        if (!handled) next();
      });
    },

    resolveId(id) {
      if (id === INIT_PATH) return id;
    },

    load(id) {
      if (id === INIT_PATH) return buildInitScript();
    },

    async transform(code, id) {
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
        escapeTags: options.escapeTags,
      };

      return transformInspekt(code, id, transformOptions);
    },

    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: INIT_PATH },
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

export { transformInspekt } from './transform-adapter.js';
export type { TransformOptions } from './transform-adapter.js';
