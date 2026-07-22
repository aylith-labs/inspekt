import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { openInEditor } from '@aylith/inspekt-cli';

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

function applyPathMapping(filePath: string, pathMapping: Record<string, string>, root: string): string {
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

  const absPath = applyPathMapping(file, options.pathMapping, options.root);
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

export function handleCapabilitiesRequest(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.url !== '/__inspekt/capabilities') return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(
    JSON.stringify({
      ok: true,
      version: '0.1.0',
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

  let body = '';
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body) as {
        file: string;
        line?: number;
        column?: number;
        editor?: string;
      };

      const filePath = applyPathMapping(data.file, options.pathMapping, options.root);

      openInEditor({
        file: filePath,
        line: data.line,
        column: data.column,
        editor: data.editor ?? options.editor,
      });

      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });

  return true;
}

export function corsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.method === 'OPTIONS' && req.url?.startsWith('/__inspekt/')) {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return true;
  }
  return false;
}
