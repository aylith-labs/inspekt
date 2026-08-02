// HTTP server: receives grab payloads from the Chrome extension, persists to
// the shared queue file, and exposes read endpoints for sibling MCP processes.
// Token-gated — every mutating request must carry X-Inspekt-Token matching
// the daemon's configured token.

import { openInEditor } from '@aylith/inspekt-cli';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { GrabQueue } from './queue.js';
import type { DaemonConfig, Grab } from './types.js';
import { VERSION } from './version.js';

/**
 * `launch-editor` shell-splits the editor string and spawns the first token, so
 * a value arriving over HTTP must be a bare identifier and nothing else.
 */
const EDITOR_ID_RE = /^[A-Za-z0-9._-]+$/;

/**
 * Reads a numeric query param. Returns undefined when absent and the `invalid`
 * sentinel for anything that is not a finite non-negative number — a negative
 * `limit` would otherwise reach `Array.slice` and silently return the wrong
 * end of the queue.
 */
function parseNonNegative(raw: string | undefined): number | undefined | 'invalid' {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 'invalid';
  return value;
}

export function createServer(config: DaemonConfig): Hono {
  const app = new Hono();
  const queue = new GrabQueue(config.queuePath);

  app.use(
    '/__inspekt/*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Inspekt-Token'],
    }),
  );

  // An empty configured token would otherwise match a request that simply omits
  // the header, so a server built without one refuses every mutating request.
  function authOk(c: Context): boolean {
    if (!config.token) return false;
    return c.req.header('x-inspekt-token') === config.token;
  }

  // Capability ping — also used by Phase 2's probe to detect agentConnected.
  // HEAD requests get 200, just like the @aylith/inspekt-vite endpoint.
  app.on(['GET', 'HEAD'], '/__inspekt/daemon', (c) =>
    c.json({ ok: true, version: VERSION, mcp: true }),
  );

  // Append a new grab. Returns the persisted record (with id + timestamp set).
  app.post('/__inspekt/grab', async (c) => {
    if (!authOk(c)) return c.json({ error: 'unauthorized' }, 401);
    try {
      const body = (await c.req.json()) as Partial<Grab>;
      if (!body.url || !body.element || !body.element.filePath || !body.source) {
        return c.json({ error: 'invalid grab payload' }, 400);
      }
      const saved = await queue.append({
        url: body.url,
        element: body.element,
        comment: body.comment,
        styles: body.styles,
        source: body.source,
      });
      return c.json(saved, 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  // Read grabs (since=<ms>, limit=<n>).
  app.get('/__inspekt/queue', async (c) => {
    if (!authOk(c)) return c.json({ error: 'unauthorized' }, 401);
    const since = parseNonNegative(c.req.query('since'));
    const limit = parseNonNegative(c.req.query('limit'));
    if (since === 'invalid' || limit === 'invalid') {
      return c.json({ error: 'since and limit must be non-negative numbers' }, 400);
    }
    const all = await queue.list({ since, limit });
    return c.json({ grabs: all });
  });

  // Delete all grabs.
  app.delete('/__inspekt/queue', async (c) => {
    if (!authOk(c)) return c.json({ error: 'unauthorized' }, 401);
    await queue.clear();
    return c.json({ ok: true });
  });

  // Open a grab in the user's IDE (fall through to @aylith/inspekt-cli → launch-editor).
  app.post('/__inspekt/open', async (c) => {
    if (!authOk(c)) return c.json({ error: 'unauthorized' }, 401);
    try {
      const body = (await c.req.json()) as {
        id?: string;
        file?: string;
        line?: number;
        column?: number;
        editor?: string;
      };
      let file: string;
      let line: number | undefined;
      let column: number | undefined;
      if (body.id) {
        const grab = await queue.getById(body.id);
        if (!grab) return c.json({ error: 'grab not found' }, 404);
        file = grab.element.filePath;
        line = grab.element.line;
        column = grab.element.column;
      } else if (body.file) {
        file = body.file;
        line = body.line;
        column = body.column;
      } else {
        return c.json({ error: 'id or file required' }, 400);
      }
      if (body.editor !== undefined && !EDITOR_ID_RE.test(body.editor)) {
        return c.json({ error: 'invalid editor identifier' }, 400);
      }
      openInEditor({ file, line, column, editor: body.editor });
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  return app;
}
