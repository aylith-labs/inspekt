# API

## `@inspekt/vite`

```ts
import { inspekt, type InspektViteOptions } from '@inspekt/vite';

export default defineConfig({
  plugins: [inspekt({ /* options */ })],
});
```

```ts
interface InspektViteOptions {
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
```

## `@inspekt/core`

```ts
import { createInspekt } from '@inspekt/core';

const instance = createInspekt({
  serverUrl: 'http://localhost:5173',
  defaultSnippetExpanded: false,
  snippetContext: 5,
  sourceMapEnabled: false,
});
instance.enable();
```

Full options shape in `packages/core/src/types.ts`.

## `@inspekt/daemon`

```ts
import { startDaemon, GrabQueue } from '@inspekt/daemon';

const { port, stop } = await startDaemon({
  token: 'your-token',
  host: '127.0.0.1',
  port: 5678,
  queuePath: '~/.inspekt/queue.jsonl',
});
```

Endpoints:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET / HEAD | `/__inspekt/daemon` | — | Capability ping |
| POST | `/__inspekt/grab` | Token | Append a grab |
| GET | `/__inspekt/queue` | Token | Read grabs (`since`, `limit`) |
| DELETE | `/__inspekt/queue` | Token | Clear all |
| POST | `/__inspekt/open` | Token | Open grab in IDE |

## `@inspekt/mcp`

```ts
import { createMcpServer } from '@inspekt/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createMcpServer({ queuePath: '~/.inspekt/queue.jsonl' });
await server.connect(new StdioServerTransport());
```

## `@inspekt/cli`

```ts
import { openInEditor } from '@inspekt/cli';

openInEditor({
  file: 'src/Button.tsx',
  line: 42,
  column: 5,
  editor: 'cursor',
});
```

Setup API:

```ts
import { runSetup } from '@inspekt/cli/setup';

await runSetup({
  agents: ['claude-code', 'cursor'],
  home: process.env.HOME,
  quiet: false,
});
```
