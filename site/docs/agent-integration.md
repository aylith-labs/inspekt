# Agent integration

Inspekt's distinguishing feature: clicked elements arrive in your agent's
context window without copy-paste. The mechanism is the
[Model Context Protocol](https://modelcontextprotocol.io) (MCP).

## How it works

1. The Chrome extension POSTs grab payloads to a tiny local daemon
   (`127.0.0.1:5678`, gated by a per-install auth token).
2. The daemon appends to `~/.inspekt/queue.jsonl`.
3. Each agent runs its own short-lived MCP server (`inspekt-mcp`) that
   reads directly from the queue file under a shared lock.
4. The agent calls `grab_latest()` automatically when you reference a
   recent grab.

## One-command setup

```bash
npx inspekt setup
```

Detects every agent installed on your machine and registers the inspekt
MCP server with each one. Re-running is idempotent.

To target a subset:

```bash
npx inspekt setup --agents claude-code,cursor
```

## Per-agent details

### Claude Code

- Config: `~/.config/claude/mcp.json` (Linux/macOS), `%APPDATA%/Claude/claude_desktop_config.json` (Windows)
- Skill: `~/.claude/skills/inspekt/SKILL.md` (auto-triggers on "this element", "fix this", etc.)

You can also install just the skill via:

```bash
npx skills add aylith-labs/inspekt@skill -g -a claude-code -y
```

### Cursor

- Config: `~/Library/Application Support/Cursor/User/settings.json` (macOS), `~/.config/Cursor/User/settings.json` (Linux), `%APPDATA%/Cursor/User/settings.json` (Windows)
- Requires Cursor 0.45+

### OpenAI Codex

- Config: `~/.codex/config.toml`
- Inspekt writes a marker-bracketed `[mcp_servers.inspekt]` block so re-runs
  replace cleanly without touching your other entries.

### Gemini CLI

- Config: `~/.gemini/settings.json`

### Antigravity

- Config: same shape as Cursor (Code-OSS based)

## Available MCP tools

Once registered, the agent has six tools:

| Tool | Purpose |
|---|---|
| `grab_latest()` | Most recent grab — the one your "this" refers to |
| `list_grabs(since?, limit?)` | Recent N grabs with filters |
| `get_grab(id)` | Full payload by ID |
| `mark_grab_processed(id)` | Optional bookkeeping after acting on a grab |
| `clear_queue()` | Destructive empty (only on explicit request) |
| `open_grab_in_editor(id)` | Fall through to your IDE via launch-editor |

## What ends up in the agent's context

Each grab's JSON includes:

- `id` (ULID), `timestamp`, `url`
- `element.filePath`, `line`, `column`, `componentName`, `tagName`, `classList`, `id`
- `element.snippet` — the surrounding source lines (when available)
- `comment` — user-typed note
- `source: "extension"`

The agent reads this directly. Most of the time it doesn't need to open the
file separately — the snippet is already in context.
