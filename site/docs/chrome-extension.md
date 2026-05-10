# Chrome extension

## Install

[Add to Chrome →](https://chromewebstore.google.com/detail/inspekt/TODO) (pending review)

Or load unpacked from `packages/chrome/dist`.

## Toolbar icon

Inspekt's icon adapts to each tab's capabilities. Hover for a tooltip
explaining the current state.

| State | Icon | Badge | Meaning |
|---|---|---|---|
| No instrumentation | greyscale | — | Page has no `data-insp-path` attributes and no React fiber source data. Inspekt won't find anything useful here. |
| Disabled | color | `OFF` (grey) | Page is instrumented but the inspector is disabled. Click the icon to enable. |
| Active, path-only | color | `ON` (blue) | Inspecting; popover will show file path but no snippet. |
| Active, dev server | color | `DEV` (green) | Snippets resolve via the local dev server (`/__inspekt/snippet`). |
| Active, source maps | color | `MAP` (blue) | Snippets resolve via deployed source maps (opt-in mode). |
| Agent connected | color | `AI` (purple) | The local daemon is reachable; "Send to Agent" works. |

The `AI` badge supersedes `DEV`/`MAP` when an agent is connected.

## Options page

Open via the extension popup's settings link, or `chrome://extensions/` →
Inspekt → Details → Extension options.

### Snippet display

- **Expand snippet by default** — show snippets immediately on popover open.
  Default off — snippets stay collapsed until you click "Show source ▾".
- **Lines of context** — context above and below the target line (default 5,
  max 30).

### Source map fallback (advanced)

Disabled by default. When on, Inspekt fetches `.map` files from your app's
bundle URLs when the dev server is unreachable. See
[Source-map fallback](/docs/source-maps) for the privacy considerations.

### Editor

The editor used when you click "Open in Editor". Inspekt POSTs the file
location to your dev server's `/__inspekt/open` endpoint, which calls
[`launch-editor`](https://github.com/yyx990803/launch-editor). Falls back to
a protocol URL (`vscode://file/...`) if the server is unreachable.

### Highlight & tree panel

Visual customization for the inspector overlay.

### Import / Export

Round-trip your settings as JSON. Useful for sharing config across machines or
for the agent-setup handshake.
