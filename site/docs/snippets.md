# Source snippets

When you click an element, Inspekt's popover shows the actual surrounding
lines of source — not just `file:line`. This is the headline differentiator
from peer click-to-source tools (LocatorJS, code-inspector-plugin, react-grab),
none of which render snippets in the overlay.

## How snippets are resolved

Inspekt tries two sources in order:

### 1. Dev server (default)

When `@aylith/inspekt-vite` is running, the plugin registers a `GET /__inspekt/snippet`
endpoint. The runtime fetches:

```
GET http://localhost:5173/__inspekt/snippet?file=src/Button.tsx&line=42&context=5
```

The server reads the file from disk (with path-mapping applied — Docker
container path → host path), slices ±N context lines, and returns JSON:

```json
{
  "startLine": 37,
  "endLine": 47,
  "targetLine": 42,
  "lines": ["...", "...", "..."],
  "language": "tsx"
}
```

Snippets are cached server-side by file mtime and client-side by
`file:line:context`.

### 2. Source maps (opt-in)

When the dev server isn't reachable but the page has source maps deployed,
Inspekt can fetch `.map` files and extract `sourcesContent`. **Off by default**
— enable it in the Chrome extension options.

See [Source-map fallback](/docs/source-maps) for the privacy implications.

## Configuration

In the Chrome extension's options page:

- **Expand snippet by default** — show snippets immediately when the popover
  opens, or wait for an explicit "Show source ▾" click. Default: collapsed.
- **Lines of context** — context above and below the target line. Default: 5.
  Server-side clamped to 30.

Programmatically (when using `@aylith/inspekt-vite` directly):

```ts
inspekt({
  runtimeOptions: {
    defaultSnippetExpanded: true,
    snippetContext: 8,
  },
});
```

## Display

```
src/components/
Button.tsx:42

 37  export function Button({
 38    label,
 39    onClick,
 40  }: ButtonProps) {
 41    return (
▸42      <button onClick={onClick}>{label}</button>
 43    );
 44  }
```

The target line is highlighted with an accent border and tinted background.
No syntax highlighting yet (deliberately — keeps the runtime bundle small).
