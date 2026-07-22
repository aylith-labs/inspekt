import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { GrabQueue } from '@aylith/inspekt-daemon/queue';
import type { SerializedElement } from '@aylith/inspekt-daemon';
import { createMcpServer } from '../index';

function fakeElement(over: Partial<SerializedElement> = {}): SerializedElement {
  return {
    filePath: 'src/Button.tsx',
    line: 42,
    column: 5,
    componentName: 'Button',
    tagName: 'button',
    classList: [],
    id: null,
    ...over,
  };
}

let dir: string;
let queuePath: string;
let client: Client;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'inspekt-mcp-test-'));
  queuePath = path.join(dir, 'queue.jsonl');

  const server = createMcpServer({ queuePath });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  client = new Client({ name: 'test-client', version: '0.0.1' }, { capabilities: {} });
  await client.connect(clientTransport);

  cleanup = async () => {
    await client.close();
    await server.close();
  };
});

afterEach(async () => {
  await cleanup();
  rmSync(dir, { recursive: true, force: true });
});

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  const block = content?.find((c) => c.type === 'text');
  return block?.text ?? '';
}

describe('inspekt MCP server', () => {
  it('lists all six tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'clear_queue',
      'get_grab',
      'grab_latest',
      'list_grabs',
      'mark_grab_processed',
      'open_grab_in_editor',
    ]);
  });

  it('grab_latest returns "no grabs" message on an empty queue', async () => {
    const result = await client.callTool({ name: 'grab_latest', arguments: {} });
    expect(textOf(result)).toContain('No grabs');
  });

  it('grab_latest returns the most recent grab after appends', async () => {
    const q = new GrabQueue(queuePath);
    await q.append({ url: 'http://a', element: fakeElement({ line: 1 }), source: 'extension' });
    await q.append({ url: 'http://b', element: fakeElement({ line: 99 }), source: 'extension' });
    const result = await client.callTool({ name: 'grab_latest', arguments: {} });
    const grab = JSON.parse(textOf(result));
    expect(grab.url).toBe('http://b');
    expect(grab.element.line).toBe(99);
  });

  it('list_grabs honors limit', async () => {
    const q = new GrabQueue(queuePath);
    for (let i = 0; i < 5; i++) {
      await q.append({ url: String(i), element: fakeElement(), source: 'extension' });
    }
    const result = await client.callTool({ name: 'list_grabs', arguments: { limit: 2 } });
    const list = JSON.parse(textOf(result));
    expect(list).toHaveLength(2);
    expect(list.map((g: { url: string }) => g.url)).toEqual(['3', '4']);
  });

  it('get_grab returns the requested record by ID', async () => {
    const q = new GrabQueue(queuePath);
    const saved = await q.append({
      url: 'http://x',
      element: fakeElement(),
      source: 'extension',
    });
    const result = await client.callTool({ name: 'get_grab', arguments: { id: saved.id } });
    const grab = JSON.parse(textOf(result));
    expect(grab.id).toBe(saved.id);
  });

  it('get_grab returns an error result for unknown IDs', async () => {
    const result = await client.callTool({ name: 'get_grab', arguments: { id: 'nope' } });
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(textOf(result)).toContain('not found');
  });

  it('mark_grab_processed flips the processedAt flag', async () => {
    const q = new GrabQueue(queuePath);
    const saved = await q.append({ url: 'x', element: fakeElement(), source: 'extension' });
    const result = await client.callTool({
      name: 'mark_grab_processed',
      arguments: { id: saved.id },
    });
    expect(textOf(result)).toContain('Marked');
    const re = await q.getById(saved.id);
    expect(re?.processedAt).toBeGreaterThan(0);
  });

  it('clear_queue empties the queue', async () => {
    const q = new GrabQueue(queuePath);
    await q.append({ url: 'x', element: fakeElement(), source: 'extension' });
    await client.callTool({ name: 'clear_queue', arguments: {} });
    expect(await q.list()).toEqual([]);
  });
});
