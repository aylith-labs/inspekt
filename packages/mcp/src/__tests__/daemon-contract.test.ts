import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, type Grab } from '@aylith/inspekt-daemon';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { expect, it } from 'vitest';
import { createMcpServer } from '../index';

function text(result: unknown): string {
  const blocks = (result as { content: Array<{ type: string; text?: string }> }).content;
  return blocks.find((block) => block.type === 'text')?.text ?? '';
}

it('exposes authenticated daemon grabs through public MCP tools across server reopen', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'inspekt-daemon-mcp-'));
  const queuePath = path.join(directory, 'queue.jsonl');
  const daemon = createServer({
    token: 'contract-token',
    queuePath,
    host: '127.0.0.1',
    port: 5678,
  });
  const payload = {
    url: 'http://localhost:5173/',
    source: 'cli',
    element: {
      filePath: 'src/App.tsx',
      line: 8,
      column: 3,
      tagName: 'button',
      componentName: 'App',
      classList: [],
      id: null,
      snippet: {
        startLine: 8,
        endLine: 8,
        targetLine: 8,
        lines: ['<button>Inspect</button>'],
        language: 'tsx',
        source: 'devserver',
      },
    },
  } satisfies Pick<Grab, 'url' | 'source' | 'element'>;
  let client: Client | undefined;
  let server: ReturnType<typeof createMcpServer> | undefined;
  async function connect() {
    server = createMcpServer({ queuePath });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(b);
    client = new Client({ name: 'daemon-contract', version: '1.0.0' }, { capabilities: {} });
    await client.connect(a);
    return client;
  }
  try {
    const denied = await daemon.request('/__inspekt/grab', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(denied.status).toBe(401);
    const accepted = await daemon.request('/__inspekt/grab', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-inspekt-token': 'contract-token' },
      body: JSON.stringify(payload),
    });
    expect(accepted.status).toBe(201);
    const grab = (await accepted.json()) as { id: string };
    const first = await connect();
    expect((await first.listTools()).tools.map((tool) => tool.name)).toContain('get_grab');
    expect(JSON.parse(text(await first.callTool({ name: 'grab_latest', arguments: {} }))).id).toBe(
      grab.id,
    );
    expect(
      JSON.parse(text(await first.callTool({ name: 'get_grab', arguments: { id: grab.id } })))
        .element.filePath,
    ).toBe('src/App.tsx');
    await first.callTool({ name: 'mark_grab_processed', arguments: { id: grab.id } });
    await first.close();
    if (!server) throw new Error('MCP server was not connected');
    await server.close();
    const reopened = await connect();
    const saved = JSON.parse(text(await reopened.callTool({ name: 'list_grabs', arguments: {} })));
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(grab.id);
    expect(saved[0].processedAt).toBeGreaterThan(0);
    await reopened.callTool({ name: 'clear_queue', arguments: {} });
    expect(
      JSON.parse(text(await reopened.callTool({ name: 'list_grabs', arguments: {} }))),
    ).toEqual([]);
  } finally {
    await client?.close();
    await server?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
