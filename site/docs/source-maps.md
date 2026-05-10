# Source-map fallback

When you click an element on a page that has no Inspekt dev-server running
(staging, production, or `chrome-extension://` pages), Inspekt can still
show source snippets — **if you've explicitly opted in to source-map
fallback**.

## Why it's opt-in

Source-map fallback issues additional network requests from your browser to
fetch `.map` files from your app's bundle URLs. Those requests:

- **Show up in DevTools** (Network tab) and any browser extension that
  monitors requests.
- **Show up in corporate proxy / firewall logs.** If you're on a managed
  network, your IT team will see them.
- **Can be multi-megabyte.** Source maps for typical React apps are
  500 KB–5 MB.
- **May fail noisily** when the site intentionally doesn't ship source maps.

Inspekt won't make these requests without your consent. The feature is
disabled by default. Turn it on in the Chrome extension options under
**Source map fallback (advanced)**.

## How it works when enabled

1. The capability probe checks every loaded `<script src>` for a likely
   adjacent `.map`.
2. When you click an element, the snippet resolver tries the dev server
   first. On failure, it falls through to source maps.
3. The resolver fetches the `.map` file, parses it with
   [`@jridgewell/trace-mapping`](https://github.com/jridgewell/trace-mapping),
   and matches the desired file path against the map's `sources[]` array
   (with path-tail fuzzy matching to handle different build prefixes).
4. The matched `sourcesContent[index]` is sliced ±N context lines and
   rendered in the popover. The toolbar badge becomes `MAP`.

## Caching

- **Parsed `TraceMap` instances**: LRU bounded at 5 in-memory entries.
- **Raw `.map` text**: stored in `chrome.storage.session` (per-extension
  session, ~10MB quota, shared across tabs). Evicted on browser restart.
- **Negative cache**: 404 responses are remembered for the session so
  Inspekt doesn't re-fetch broken map URLs on every grab.

## When to use it

- Inspecting your own staging environment.
- Debugging Chrome extension pages (e.g. your own extension) where there's no dev
  server but the extension ships source maps with its bundle.
- One-off production triage when source maps happen to be deployed.

## When not to use it

- On shared / monitored networks where extra network requests are flagged.
- On production sites you don't own (you're hitting their server with extra
  requests).
- When source maps aren't deployed (you'll see 404s in DevTools that aren't
  serving any purpose).
