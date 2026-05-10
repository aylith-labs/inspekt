// MCP server for Inspekt — exposes the shared grab queue as tools that any
// MCP-aware agent (Claude Code, Cursor, Codex, Gemini CLI, Antigravity) can
// call over stdio.
//
// The server reads from ~/.inspekt/queue.jsonl directly (with file locking),
// so it doesn't need to talk HTTP to the daemon. Each agent process spawns
// its own MCP server via `inspekt-mcp`; they all share the queue file.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GrabQueue } from '@inspekt/daemon/queue';
import { openInEditor } from '@inspekt/cli';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_QUEUE_PATH = path.join(os.homedir(), '.inspekt', 'queue.jsonl');

export interface CreateMcpServerOptions {
  queuePath?: string;
}

export function createMcpServer(opts: CreateMcpServerOptions = {}): McpServer {
  const queue = new GrabQueue(opts.queuePath ?? DEFAULT_QUEUE_PATH);

  const server = new McpServer({
    name: 'inspekt',
    version: '0.1.0',
  });

  server.registerTool(
    'grab_latest',
    {
      description:
        'Returns the most recent grab from the Inspekt queue. Use this when the user references "this element", "the thing I just grabbed", "this button", or any similar deixis after they have used the Inspekt extension to grab a UI element.',
      inputSchema: {},
    },
    async () => {
      const grab = await queue.latest();
      if (!grab) {
        return {
          content: [{ type: 'text', text: 'No grabs in the queue.' }],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(grab, null, 2) }],
      };
    },
  );

  server.registerTool(
    'list_grabs',
    {
      description:
        'Returns recent grabs from the Inspekt queue, optionally filtered by timestamp or limited to N most recent.',
      inputSchema: {
        since: z
          .number()
          .optional()
          .describe('Unix-millis cutoff: only grabs with timestamp > since are returned.'),
        limit: z.number().int().positive().optional().describe('Max grabs to return.'),
      },
    },
    async ({ since, limit }) => {
      const list = await queue.list({ since, limit });
      return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
    },
  );

  server.registerTool(
    'get_grab',
    {
      description: 'Returns the full grab payload for a given ID.',
      inputSchema: {
        id: z.string().describe('The grab ID (ULID).'),
      },
    },
    async ({ id }) => {
      const grab = await queue.getById(id);
      if (!grab) {
        return { content: [{ type: 'text', text: `Grab ${id} not found.` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(grab, null, 2) }] };
    },
  );

  server.registerTool(
    'mark_grab_processed',
    {
      description:
        'Marks a grab as processed once the agent has consumed it. Optional; the queue stays append-only either way.',
      inputSchema: {
        id: z.string().describe('The grab ID to mark.'),
      },
    },
    async ({ id }) => {
      const mutated = await queue.markProcessed(id);
      return {
        content: [
          {
            type: 'text',
            text: mutated ? `Marked grab ${id} processed.` : `Grab ${id} was already processed or not found.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'clear_queue',
    {
      description: 'Empties the grab queue. Destructive — only call if the user explicitly asks.',
      inputSchema: {},
    },
    async () => {
      await queue.clear();
      return { content: [{ type: 'text', text: 'Queue cleared.' }] };
    },
  );

  server.registerTool(
    'open_grab_in_editor',
    {
      description:
        "Opens the source file referenced by a grab in the user's IDE. Falls through to @inspekt/cli → launch-editor.",
      inputSchema: {
        id: z.string().describe('The grab ID.'),
        editor: z
          .string()
          .optional()
          .describe('Editor override (e.g. "cursor", "code"). Defaults to env INSPEKT_EDITOR.'),
      },
    },
    async ({ id, editor }) => {
      const grab = await queue.getById(id);
      if (!grab) {
        return { content: [{ type: 'text', text: `Grab ${id} not found.` }], isError: true };
      }
      openInEditor({
        file: grab.element.filePath,
        line: grab.element.line,
        column: grab.element.column,
        editor,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Opening ${grab.element.filePath}:${grab.element.line} in editor.`,
          },
        ],
      };
    },
  );

  return server;
}
