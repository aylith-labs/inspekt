# Quick start

A complete tour, ~3 minutes:

## 1. Open any React or Inspekt-configured project

Start your dev server as usual. Inspekt activates automatically.

## 2. Grab an element

Hover over a UI element and click. The Inspekt popover shows:

- **Path** — `src/components/Button.tsx:42`
- **Snippet** (click "Show source ▾") — the lines around the click target,
  with the target line highlighted.
- **Actions** — Open in editor, Copy path, Open on GitHub, Send to agent,
  Console log.

The toolbar icon's badge tells you the snippet source:

- **DEV** — fetched from your local dev server (fastest path)
- **MAP** — fetched from source maps (if you opted in)
- **ON** — path only (no snippet source available on this page)

## 3. Send to your agent

Click **Send to Agent** in the popover. Inspekt queues the grab on the local
daemon (`127.0.0.1:5678`) with the snippet + URL + component name.

Switch to your agent (Claude Code / Cursor / Codex / Gemini CLI). Type a
referring phrase like "fix this button" or "make this red". Your agent's
Inspekt MCP server picks up the grab via `grab_latest()` and acts on it —
no copy-paste, no file navigation.

## 4. (Optional) Add a comment

In the popover, type a note into the comment field before sending. The
comment travels alongside the grab. Useful when the request is non-obvious:
"this scrolls past the viewport on mobile", "wrong copy", etc.

## What just happened (architecturally)

```
┌──────────────────────────────────────────────────────────┐
│ Browser: Chrome extension + Inspekt runtime              │
│  • Click element → resolveElementSource (fiber → attr)   │
│  • Pop  over fetches snippet from /__inspekt/snippet       │
│  • "Send to Agent" → POST /__inspekt/grab (token-gated)  │
└────────────────┬─────────────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────────────┐
│ Daemon (~/.inspekt/queue.jsonl, Hono on :5678)           │
└────────────────┬─────────────────────────────────────────┘
                 │ MCP stdio
                 ▼
┌──────────────────────────────────────────────────────────┐
│ Agent (Claude Code, Cursor, Codex, Gemini CLI, etc.)     │
│  • inspekt MCP server exposes grab_latest, list_grabs…   │
│  • Agent calls them automatically when you say "this"    │
└──────────────────────────────────────────────────────────┘
```
