// HTTP server: receives grab payloads from the Chrome extension, persists to
// the shared queue file, and exposes read endpoints for sibling MCP processes.
// Token-gated — every mutating request must carry X-Inspekt-Token matching
// the daemon's configured token.

import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { openInEditor } from '@aylith/inspekt-cli';
import { GrabQueue } from './queue.js';
import type { DaemonConfig, Grab } from './types.js';

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

  function authOk(c: Context): boolean {
    const token = c.req.header('x-inspekt-token');
    return token === config.token;
  }

  // Capability ping — also used by Phase 2's probe to detect agentConnected.
  // HEAD requests get 200, just like the @aylith/inspekt-vite endpoint.
  app.on(['GET', 'HEAD'], '/__inspekt/daemon', (c) =>
    c.json({ ok: true, version: '0.1.0', mcp: true }),
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
    const sinceParam = c.req.query('since');
    const limitParam = c.req.query('limit');
    const since = sinceParam ? Number(sinceParam) : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;
    const all = await queue.list({
      since: Number.isFinite(since) ? since : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
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
      const body = (await c.req.json()) as { id?: string; file?: string; line?: number; column?: number; editor?: string };
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
      openInEditor({ file, line, column, editor: body.editor });
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  return app;
}
