import type { Plugin } from 'vite';
import path from 'node:path';
import { transformInspekt, type TransformOptions } from './transform-adapter.js';
import {
  handleInspektRequest,
  handleSnippetRequest,
  handleCapabilitiesRequest,
  corsMiddleware,
} from './server.js';
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
  /**
   * Inject `data-insp-path` attributes in production builds too.
   * Default `false` (dev only, smaller prod bundles). Set `true` for sites
   * that want the deployed build to remain Inspekt-readable — e.g. the
   * Inspekt docs site dogfooding its own attrs.
   */
  enableInProduction?: boolean;
  /**
   * When `false`, skip injecting the runtime init script + dev-only
   * middleware (snippet, open-editor, capabilities). Useful when the
   * Chrome extension is the only consumer and the project doesn't depend
   * on `@inspekt/core` itself. Default `true`.
   */
  runtimeInjection?: boolean;
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
    enableInProduction: false,
    runtimeInjection: true,
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
      if (!options.runtimeInjection) return;
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

        // Capabilities probe
        if (handleCapabilitiesRequest(req, res)) return;

        // Snippet endpoint (async — handle promise without blocking)
        const snippetCtx = { editor: options.editor, pathMapping, root: resolvedRoot };
        if (req.url?.startsWith('/__inspekt/snippet')) {
          handleSnippetRequest(req, res, snippetCtx).then((handled) => {
            if (!handled) next();
          }).catch(() => next());
          return;
        }

        // Open-in-editor endpoint
        const handled = handleInspektRequest(req, res, snippetCtx);
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
      if (process.env['NODE_ENV'] === 'production' && !options.enableInProduction) return null;

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
      if (!options.runtimeInjection) return [];
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
