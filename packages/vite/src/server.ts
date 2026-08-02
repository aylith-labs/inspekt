import { promises as fs } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import { openInEditor } from '@aylith/inspekt-cli';
import { VERSION } from './version.js';

export interface InspektServerOptions {
  editor: string;
  pathMapping: Record<string, string>;
  root: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

const MAX_CONTEXT_LINES = 30;

/** Cap on the `/__inspekt/open` request body — the payload is a handful of fields. */
const MAX_OPEN_BODY_BYTES = 64 * 1024;

/**
 * Editor identifiers reaching us over HTTP are passed to `launch-editor`, which
 * shell-splits them and spawns the first token. Anything but a bare identifier
 * would therefore be a command-injection vector, so only the plugin's own
 * `editor` option (which comes from the project's vite config) may be freeform.
 */
const EDITOR_ID_RE = /^[A-Za-z0-9._-]+$/;

interface CacheEntry {
  mtimeMs: number;
  content: string;
}
const fileCache = new Map<string, CacheEntry>();
const FILE_CACHE_LIMIT = 200;

function lruTouch(key: string, entry: CacheEntry): void {
  fileCache.delete(key);
  fileCache.set(key, entry);
  if (fileCache.size > FILE_CACHE_LIMIT) {
    // Evict oldest by Map insertion order.
    const oldest = fileCache.keys().next().value;
    if (oldest !== undefined) fileCache.delete(oldest);
  }
}

function applyPathMapping(
  filePath: string,
  pathMapping: Record<string, string>,
  root: string,
): string {
  let resolved = filePath;
  for (const [containerPath, hostPath] of Object.entries(pathMapping)) {
    if (resolved.startsWith(containerPath)) {
      resolved = resolved.replace(containerPath, hostPath);
      break;
    }
  }
  if (!path.isAbsolute(resolved)) {
    resolved = path.join(root, resolved);
  }
  return resolved;
}

function isWithin(directory: string, candidate: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Maps a client-supplied path to an absolute one and confirms it lands inside a
 * directory the project actually exposes: the Vite root, or a host directory
 * named by `pathMapping`. Returns null otherwise.
 *
 * These endpoints answer unauthenticated cross-origin requests, so without this
 * any page open in the developer's browser could read arbitrary files off the
 * machine through the dev server. Containment is lexical — a symlink inside the
 * root that points elsewhere is still followed, which keeps linked workspace
 * packages resolvable.
 */
function resolveExposedFile(
  filePath: string,
  options: InspektServerOptions,
): { absPath: string } | { error: 'outside-root' } {
  const absPath = path.resolve(applyPathMapping(filePath, options.pathMapping, options.root));
  const exposed = [options.root, ...Object.values(options.pathMapping)].map((dir) =>
    path.resolve(dir),
  );
  if (!exposed.some((dir) => isWithin(dir, absPath))) return { error: 'outside-root' };
  return { absPath };
}

function languageFromExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (e === 'tsx' || e === 'ts') return e;
  if (e === 'jsx' || e === 'js') return e;
  if (e === 'vue') return 'vue';
  if (e === 'svelte') return 'svelte';
  if (e === 'astro') return 'astro';
  if (e === 'css') return 'css';
  if (e === 'json') return 'json';
  if (e === 'html' || e === 'htm') return 'html';
  return e || 'text';
}

async function readFileWithCache(absPath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(absPath);
    const cached = fileCache.get(absPath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      lruTouch(absPath, cached);
      return cached.content;
    }
    const content = await fs.readFile(absPath, 'utf8');
    lruTouch(absPath, { mtimeMs: stat.mtimeMs, content });
    return content;
  } catch {
    return null;
  }
}

export async function handleSnippetRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: InspektServerOptions,
): Promise<boolean> {
  if (!req.url?.startsWith('/__inspekt/snippet')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const u = new URL(req.url, 'http://localhost');
  const file = u.searchParams.get('file');
  const line = parseInt(u.searchParams.get('line') ?? '', 10);
  const contextRaw = parseInt(u.searchParams.get('context') ?? '', 10);
  const context = Number.isFinite(contextRaw)
    ? Math.max(0, Math.min(contextRaw, MAX_CONTEXT_LINES))
    : 5;

  if (!file || !Number.isFinite(line) || line < 1) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'Bad query: file and line are required' }));
    return true;
  }

  const resolution = resolveExposedFile(file, options);
  if ('error' in resolution) {
    res.writeHead(403, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'File is outside the project root' }));
    return true;
  }

  const { absPath } = resolution;
  const content = await readFileWithCache(absPath);
  if (content === null) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: 'File not found', file: absPath }));
    return true;
  }

  const allLines = content.split('\n');
  const startLine = Math.max(1, line - context);
  const endLine = Math.min(allLines.length, line + context);
  const lines = allLines.slice(startLine - 1, endLine);
  const language = languageFromExt(path.extname(absPath));

  res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(
    JSON.stringify({
      startLine,
      endLine,
      targetLine: line,
      lines,
      language,
    }),
  );
  return true;
}

export function handleCapabilitiesRequest(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.url !== '/__inspekt/capabilities') return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(
    JSON.stringify({
      ok: true,
      version: VERSION,
      snippetEndpoint: true,
      // Source-map resolution is client-side only (Phase 5); the server has
      // nothing to advertise here besides "yes, we exist".
    }),
  );
  return true;
}

export function handleInspektRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: InspektServerOptions,
): boolean {
  if (req.url !== '/__inspekt/open' || req.method !== 'POST') {
    return false;
  }

  function fail(status: number, message: string): void {
    res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ error: message }));
  }

  let body = '';
  let size = 0;
  let aborted = false;

  req.on('error', () => {
    aborted = true;
  });

  req.on('data', (chunk: Buffer) => {
    if (aborted) return;
    size += chunk.length;
    if (size > MAX_OPEN_BODY_BYTES) {
      aborted = true;
      fail(413, 'Request body too large');
      req.destroy();
      return;
    }
    body += chunk.toString();
  });

  req.on('end', () => {
    if (aborted) return;
    let data: { file?: unknown; line?: unknown; column?: unknown; editor?: unknown };
    try {
      data = JSON.parse(body) as typeof data;
    } catch {
      fail(400, 'Invalid JSON body');
      return;
    }

    if (typeof data.file !== 'string' || data.file.length === 0) {
      fail(400, 'Missing required field: file');
      return;
    }

    let editor = options.editor;
    if (data.editor !== undefined) {
      if (typeof data.editor !== 'string' || !EDITOR_ID_RE.test(data.editor)) {
        fail(400, 'Invalid editor identifier');
        return;
      }
      editor = data.editor;
    }

    const resolution = resolveExposedFile(data.file, options);
    if ('error' in resolution) {
      fail(403, 'File is outside the project root');
      return;
    }

    const line =
      typeof data.line === 'number' && Number.isFinite(data.line) ? data.line : undefined;
    const column =
      typeof data.column === 'number' && Number.isFinite(data.column) ? data.column : undefined;

    try {
      openInEditor({ file: resolution.absPath, line, column, editor });
    } catch (error) {
      fail(500, `Failed to launch editor: ${(error as Error).message}`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ ok: true }));
  });

  return true;
}

export function corsMiddleware(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'OPTIONS' && req.url?.startsWith('/__inspekt/')) {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return true;
  }
  return false;
}
