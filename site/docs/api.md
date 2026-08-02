# API

## `@aylith/inspekt-vite`

```ts
import { inspekt, type InspektViteOptions } from '@aylith/inspekt-vite';

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
  /** Inject attributes into production builds too. Default false. */
  enableInProduction?: boolean;
  /** Skip the runtime init script and the dev-only middleware. Default true. */
  runtimeInjection?: boolean;
}
```

## `@aylith/inspekt-core`

```ts
import { createInspekt } from '@aylith/inspekt-core';

const instance = createInspekt({
  serverUrl: 'http://localhost:5173',
  defaultSnippetExpanded: false,
  snippetContext: 5,
  sourceMapEnabled: false,
});
instance.enable();
```

Full options shape in `packages/core/src/types.ts`.

## `@aylith/inspekt-daemon`

```ts
import { startDaemon, GrabQueue } from '@aylith/inspekt-daemon';

const { port, stop } = await startDaemon({
  token: 'your-token',
  host: '127.0.0.1',
  port: 5678,
  queuePath: '~/.inspekt/queue.jsonl',
});

// `port` is the port actually bound — pass 0 to let the OS choose one.
// `stop()` resolves once the listener has closed.
await stop();
```

`startDaemon` rejects if the port is already in use, and refuses to start without
a token.

Endpoints:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET / HEAD | `/__inspekt/daemon` | — | Capability ping |
| POST | `/__inspekt/grab` | Token | Append a grab |
| GET | `/__inspekt/queue` | Token | Read grabs (`since`, `limit`) |
| DELETE | `/__inspekt/queue` | Token | Clear all |
| POST | `/__inspekt/open` | Token | Open grab in IDE |

`since` and `limit` must be non-negative numbers; anything else is a 400. An
`editor` sent to `/__inspekt/open` must be a bare identifier (`[A-Za-z0-9._-]+`) —
it is handed to `launch-editor`, which shell-splits it and spawns the first token.

## `@aylith/inspekt-mcp`

```ts
import { createMcpServer } from '@aylith/inspekt-mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createMcpServer({ queuePath: '~/.inspekt/queue.jsonl' });
await server.connect(new StdioServerTransport());
```

## `@aylith/inspekt-cli`

```ts
import { openInEditor } from '@aylith/inspekt-cli';

openInEditor({
  file: 'src/Button.tsx',
  line: 42,
  column: 5,
  editor: 'cursor',
});
```

Setup API:

```ts
import { runSetup } from '@aylith/inspekt-cli/setup';

await runSetup({
  agents: ['claude-code', 'cursor'],
  home: process.env.HOME,
  quiet: false,
});
```
