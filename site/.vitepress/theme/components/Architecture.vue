<script setup lang="ts">
// Architecture diagram — four boxes connected by SVG arrows. Hand-laid via
// CSS grid; no auto-flow magic. Mirrors the diagram in docs/quick-start.md
// but rendered, not ASCII.
</script>

<template>
  <section class="arch">
    <p class="inspekt-rule-label">04 · Architecture</p>
    <h2 class="inspekt-h2">Three processes. One queue file. MCP over stdio.</h2>
    <p class="inspekt-lede">
      The Chrome extension talks to a tiny localhost daemon. The daemon
      appends grabs to a shared NDJSON queue. Each agent spawns its own MCP
      server, which reads the same queue file under a lock. No magic; the
      moving parts are all on disk.
    </p>

    <div class="diagram">
      <div class="box browser">
        <span class="box-tag">browser</span>
        <h4>Chrome extension</h4>
        <ul>
          <li>resolveElementSource (fiber → <code>data-insp-path</code>)</li>
          <li>popover · snippet · "Send to Agent"</li>
          <li>capability probe · icon state</li>
        </ul>
      </div>

      <div class="box daemon">
        <span class="box-tag">node</span>
        <h4>@inspekt/daemon</h4>
        <ul>
          <li>Hono on <code>127.0.0.1:5678</code></li>
          <li>token-gated <code>POST /__inspekt/grab</code></li>
          <li>NDJSON queue file with lock</li>
        </ul>
      </div>

      <div class="box queue">
        <span class="box-tag">disk</span>
        <h4>~/.inspekt/queue.jsonl</h4>
        <ul>
          <li>append-only, file-locked</li>
          <li>shared by every MCP process</li>
          <li>survives daemon restarts</li>
        </ul>
      </div>

      <div class="box mcp">
        <span class="box-tag">stdio</span>
        <h4>@inspekt/mcp</h4>
        <ul>
          <li>grab_latest · list_grabs · get_grab</li>
          <li>mark_grab_processed · clear_queue</li>
          <li>open_grab_in_editor</li>
        </ul>
      </div>

      <div class="box agent">
        <span class="box-tag">agent</span>
        <h4>Claude · Cursor · Codex · Gemini · Antigravity</h4>
        <ul>
          <li>each spawns its own inspekt-mcp child</li>
          <li>reads queue via the MCP tools</li>
          <li>skill auto-triggers on "this element"</li>
        </ul>
      </div>

      <svg class="lines" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="var(--inspekt-violet)" />
          </marker>
        </defs>
        <path d="M 260 90 L 380 90" stroke="var(--inspekt-violet)" stroke-width="1.5" marker-end="url(#arch-arrow)" fill="none" />
        <path d="M 540 90 C 640 90, 660 90, 760 90" stroke="var(--inspekt-violet)" stroke-width="1.5" marker-end="url(#arch-arrow)" fill="none" />
        <path d="M 850 145 L 850 270 L 540 360" stroke="var(--inspekt-violet)" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arch-arrow)" fill="none" />
        <path d="M 380 380 L 250 380" stroke="var(--inspekt-violet)" stroke-width="1.5" marker-end="url(#arch-arrow)" fill="none" />
        <text x="320" y="80" class="lab">POST /grab</text>
        <text x="660" y="80" class="lab">append</text>
        <text x="700" y="220" class="lab">read</text>
        <text x="290" y="370" class="lab">stdio tools</text>
      </svg>
    </div>
  </section>
</template>

<style scoped>
.inspekt-h2 {
  margin-top: 12px;
  font-size: var(--inspekt-size-h2);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--inspekt-ink);
  margin-bottom: 12px;
}
.inspekt-lede {
  max-width: 64ch;
  margin-bottom: 40px;
}
.inspekt-lede code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  padding: 1px 5px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}

.diagram {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  grid-template-areas:
    'browser daemon queue'
    'agent   .      mcp';
  gap: 32px 80px;
  margin-top: 16px;
}
@media (max-width: 900px) {
  .diagram {
    grid-template-columns: 1fr;
    grid-template-areas: 'browser' 'daemon' 'queue' 'mcp' 'agent';
    gap: 24px;
  }
  .lines {
    display: none;
  }
}

.browser { grid-area: browser; }
.daemon { grid-area: daemon; }
.queue { grid-area: queue; }
.mcp { grid-area: mcp; }
.agent { grid-area: agent; }

.box {
  position: relative;
  z-index: 1;
  padding: 18px 20px;
  border: 1px solid var(--inspekt-rule);
  border-radius: 8px;
  background: var(--inspekt-paper);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.box h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--inspekt-ink);
}
.box ul {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--inspekt-ink-2);
  font-family: var(--vp-font-family-mono);
}
.box code {
  background: transparent;
  color: var(--inspekt-violet);
  padding: 0;
}

.box-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--inspekt-violet);
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--inspekt-violet-soft);
}

.box.queue {
  background: var(--inspekt-violet-soft);
  border-color: var(--inspekt-violet);
}
.box.queue h4 {
  color: var(--inspekt-violet);
}

.lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
.lab {
  fill: var(--inspekt-ink-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}
</style>
