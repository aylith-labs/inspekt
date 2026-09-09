# Quick start

A local Vite walkthrough. [Install the plugin](/install) first and retain your
framework's existing Vite configuration. No extension or agent setup is required
to inspect a source location.

## 1. Open your Inspekt-configured development project

Start the project's dev script, then open the exact URL the server reports.
Inspekt's Vite plugin injects and enables the inspector. React alone does not
install the runtime. See the current Windows package limitations in [Install](/install).

## 2. Grab an element

Hold `Ctrl+Alt` and click an element (`Cmd+Alt` on Mac). A normal click remains
the app's own action. For an instrumented element, the popover shows:

- **Path** — `src/components/Button.tsx:42`
- **Snippet** (click "Show source ▾") — the lines around the click target,
  with the target line highlighted.
- **Actions** — Copy path, open in a configured editor, log the element, and
  configured repository actions. **Show source** appears when a snippet resolves.

Use **Copy path**, then Escape to return to the app. If only DOM information is
available, do not treat it as a verified source location.

The optional extension's toolbar badge describes its snippet source; the
Vite-only route has no browser-extension toolbar:

- **DEV** — fetched from your local dev server (fastest path)
- **MAP** — fetched from source maps (if you opted in)
- **ON** — path only (no snippet source available on this page)

## 3. Optional: send to your configured agent

This is a separate configured extension/agent workflow, not an action provided
by the basic Vite runtime alone. Follow [Agent integration](/agent-integration)
and review its local configuration changes before opting in. With that workflow
available, **Send to Agent** queues the grab on the local
daemon (`127.0.0.1:5678`) with the snippet + URL + component name.

Switch to your agent (Claude Code / Cursor / Codex / Gemini CLI). Type a
referring phrase like "fix this button" or "make this red". Your agent's
Inspekt MCP server picks up the grab via `grab_latest()` and acts on it —
no copy-paste, no file navigation.

## 4. (Optional) Add a comment

In the popover, type a note into the comment field before sending. The
comment travels alongside the grab. Useful when the request is non-obvious:
"this scrolls past the viewport on mobile", "wrong copy", etc.

## Optional agent workflow (separate from Vite inspection)

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
