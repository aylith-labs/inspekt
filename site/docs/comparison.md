# Comparison

How Inspekt differs from peer click-to-source devtools.

| | Inspekt | LocatorJS | code-inspector-plugin | react-grab |
|---|---|---|---|---|
| **Click element → open IDE** | ✅ | ✅ | ✅ | ✅ |
| **Source snippet in overlay** | ✅ | ❌ | ❌ | ❌ |
| **Source-map fallback** | ✅ (opt-in) | ❌ | ❌ | ❌ |
| **Capability-aware toolbar icon** | ✅ | ❌ | n/a (no extension) | ❌ |
| **Multi-framework AST transform** | ✅ (via code-inspector) | ✅ (own plugins) | ✅ | ❌ (React only) |
| **Zero-config React via fiber** | ✅ (via bippy) | ✅ | ❌ | ✅ (via bippy) |
| **Chrome extension** | ✅ | ✅ | ❌ | ✅ |
| **MCP server for agents** | ✅ | ❌ | ❌ | ❌ |
| **Cross-app config sync** | ✅ | ❌ | ❌ | ❌ |
| **Setup CLI (`npx @aylith/inspekt setup`)** | ✅ | ❌ | ❌ | ❌ |
| **Maintained 2026** | ✅ | dormant | ✅ | ✅ |

## What Inspekt reuses

Inspekt deliberately doesn't reinvent the wheel:

- [`@code-inspector/core`](https://github.com/zh-lx/code-inspector) — AST transforms
- [`bippy`](https://github.com/aidenybai/bippy) — React fiber traversal
- [`react-grab`](https://github.com/aidenybai/react-grab) — runtime primitives (freeze, context, open-file)
- [`launch-editor`](https://github.com/yyx990803/launch-editor) — IDE launcher
- [`@jridgewell/trace-mapping`](https://github.com/jridgewell/trace-mapping) — source-map resolution
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server scaffolding
- [`hono`](https://hono.dev) — daemon HTTP routing

Inspekt's unique surface area is the layer **on top** of these: the
agent-routing logic, the Chrome extension shell, the setup CLI, and the
capability-aware icon. Everything else is well-trodden ground done by others.
