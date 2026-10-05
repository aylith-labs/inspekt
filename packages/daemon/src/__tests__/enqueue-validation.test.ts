import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createServer } from '../server';

it('rejects malformed wire grabs before queue persistence', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'inspekt-invalid-grab-'));
  const app = createServer({
    token: 'validation-token',
    queuePath: path.join(directory, 'queue.jsonl'),
    host: '127.0.0.1',
    port: 5678,
  });
  const element = {
    filePath: 'src/App.tsx',
    line: 4,
    column: 2,
    componentName: 'App',
    tagName: 'button',
    classList: [],
    id: null,
  };
  const valid = { url: 'http://localhost:5173', source: 'cli', element };
  const invalid = [
    { ...valid, source: { file: 'not-a-producer-enum' } },
    { ...valid, source: 'unknown' },
    { ...valid, element: { ...element, line: '4' } },
    { ...valid, element: { ...element, column: -1 } },
    { ...valid, element: { ...element, filePath: {} } },
    { ...valid, element: { ...element, classList: [42] } },
    {
      ...valid,
      element: {
        ...element,
        snippet: {
          startLine: 1,
          endLine: 2,
          targetLine: 1,
          lines: ['one', 2],
          language: 'tsx',
          source: 'devserver',
        },
      },
    },
    {
      ...valid,
      element: {
        ...element,
        snippet: {
          startLine: 1,
          endLine: 2,
          targetLine: 1,
          lines: ['one', 'two'],
          language: 'tsx',
          source: 'remote-script',
        },
      },
    },
  ];
  try {
    for (const body of invalid) {
      const result = await app.request('/__inspekt/grab', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-inspekt-token': 'validation-token' },
        body: JSON.stringify(body),
      });
      expect(result.status).toBe(400);
    }
    const queue = await app.request('/__inspekt/queue', {
      headers: { 'x-inspekt-token': 'validation-token' },
    });
    expect((await queue.json()).grabs).toEqual([]);
    const accepted = await app.request('/__inspekt/grab', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-inspekt-token': 'validation-token' },
      body: JSON.stringify(valid),
    });
    expect(accepted.status).toBe(201);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
