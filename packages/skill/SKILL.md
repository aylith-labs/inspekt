---
name: inspekt
description: Use when the user references a UI element they grabbed with Inspekt — phrases like "this button", "the thing I just grabbed", "fix this element", "change this", or any deixis after an Inspekt grab. Call grab_latest() first, then act on the file/line returned. Avoid calling proactively if the user hasn't grabbed anything in this session.
allowed-tools: mcp__inspekt__grab_latest, mcp__inspekt__list_grabs, mcp__inspekt__get_grab, mcp__inspekt__mark_grab_processed, mcp__inspekt__open_grab_in_editor
---

# Inspekt grabs

The user has the [Inspekt](https://github.com/aylith-labs/inspekt)
Chrome extension installed. When they click a UI element, Inspekt captures the
source file path, line/column, component name, surrounding source snippet, and
the page URL, then queues it on the local daemon. This skill makes that queue
available to you via the `inspekt` MCP server.

## Prerequisites

The user has run `npx @aylith/inspekt setup` once, which registered the `inspekt` MCP
server with Claude Code's config. If the MCP tools below aren't available, ask
the user to run that command and restart Claude Code.

## When to use

Call `grab_latest()` automatically (without asking permission) when the user
references a recent UI grab. Triggers include:
- "this element", "this button", "the thing I just grabbed"
- "fix this", "change this", "make this red", "what's wrong with this"
- Any vague request right after they mentioned using Inspekt

If the request is unrelated to a UI element (e.g. infrastructure, build
tooling, deployment), do NOT call `grab_latest` — they probably haven't
grabbed anything.

## After fetching

1. Read the file at the returned `path:line`.
2. Confirm what you found in 1-2 sentences before editing.
3. Make the change they asked for.
4. Optionally call `mark_grab_processed(id)` once you've fully addressed
   the grab so future `grab_latest()` calls don't pick it up again.

## Tools

- `grab_latest()` — single most recent grab. Use this first.
- `list_grabs(since?, limit?)` — recent grabs, filterable by timestamp + count.
- `get_grab(id)` — full payload by ID.
- `mark_grab_processed(id)` — mark as consumed (optional bookkeeping).
- `open_grab_in_editor(id)` — open the grab in the user's IDE (only on request).

## Grab payload shape

Each grab returns JSON with at least:

```json
{
  "id": "01H...",
  "timestamp": 1715200000000,
  "url": "http://localhost:5173/dashboard",
  "element": {
    "filePath": "src/components/Button.tsx",
    "line": 42,
    "column": 5,
    "componentName": "Button",
    "tagName": "button",
    "classList": ["btn", "btn-primary"],
    "id": "submit",
    "snippet": {
      "startLine": 37,
      "endLine": 47,
      "targetLine": 42,
      "lines": ["export function Button(...) {", "  ...", ...],
      "language": "tsx",
      "source": "devserver"
    }
  },
  "comment": "user-added note (optional)",
  "source": "extension"
}
```

The `snippet` field is the surrounding source — read it directly before
opening the file if it's enough context to act on, to save tool calls.
