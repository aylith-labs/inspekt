<script setup lang="ts">
// Hero flow — annotated diagram of click → grab → MCP → agent.
// SVG arrows connect HTML cards; cards re-use real product markup
// (the popover layout, the queue JSONL row, the agent chat bubble).
//
// Motion: arrow strokes animate in sequence on first viewport entry, 1.2s
// ease-out-expo, once. Respects prefers-reduced-motion.

import { onMounted, ref } from 'vue';

const animated = ref(false);
const root = ref<HTMLElement | null>(null);

onMounted(() => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animated.value = true; // skip animation, render in final state
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animated.value = true;
          observer.disconnect();
        }
      }
    },
    { threshold: 0.25 },
  );
  if (root.value) observer.observe(root.value);
});
</script>

<template>
  <div ref="root" class="hero-flow" :class="{ animated }">
    <header class="hero-header">
      <span class="inspekt-eyebrow">Inspekt · v0.1</span>
      <h1 class="hero-title">Click any element. Send context to your agent.</h1>
      <p class="hero-tag">
        Inspekt registers an MCP server with Claude Code, Cursor, Codex,
        Gemini CLI, and Antigravity. Grab an element in the browser; your
        agent already has the file, line, snippet, and component name. No
        copy, no paste, no manual navigation.
      </p>
      <div class="hero-install">
        <code class="install-line">
          <span class="prompt">$</span>
          <span class="cmd">npx inspekt setup</span>
        </code>
        <a class="hero-source" href="https://github.com/steven-pribilinskiy/inspekt">View on GitHub →</a>
      </div>
    </header>

    <div class="diagram">
      <!-- ① Click target -->
      <div class="node node-click" data-step="1">
        <div class="card card-page">
          <div class="card-chrome">
            <span class="dot" /><span class="dot" /><span class="dot" />
            <span class="url">app.local/dashboard</span>
          </div>
          <div class="card-body">
            <div class="ghost-row" />
            <div class="ghost-row short" />
            <button class="hot-target">
              Submit
              <span class="cursor-pin" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path
                    d="M3 2 L13 7 L8 8 L7 13 Z"
                    fill="var(--inspekt-violet)"
                    stroke="#fff"
                    stroke-width="1"
                  />
                </svg>
              </span>
            </button>
            <div class="ghost-row" />
          </div>
        </div>
        <div class="annotation">
          <span class="inspekt-step-num">1</span>
          <span class="annotation-text">User clicks an element in their app.</span>
        </div>
      </div>

      <!-- ② Popover -->
      <div class="node node-popover" data-step="2">
        <div class="card card-popover">
          <div class="popover-path-dir">src/components/</div>
          <div class="popover-path-file">Button.tsx:42</div>
          <pre class="popover-snippet"><span class="line"><span class="ln">40</span>  return (</span>
<span class="line target"><span class="ln">41</span>    &lt;button onClick={onClick}&gt;</span>
<span class="line"><span class="ln">42</span>      {label}</span>
<span class="line"><span class="ln">43</span>    &lt;/button&gt;</span>
<span class="line"><span class="ln">44</span>  );</span></pre>
          <div class="popover-actions">
            <span class="action">Open in editor</span>
            <span class="action send">Send to agent</span>
          </div>
        </div>
        <div class="annotation">
          <span class="inspekt-step-num">2</span>
          <span class="annotation-text">Popover resolves source, shows snippet, queues the grab.</span>
        </div>
      </div>

      <!-- ③ Queue file -->
      <div class="node node-queue" data-step="3">
        <div class="card card-queue">
          <div class="queue-head">
            <span class="queue-path">~/.inspekt/queue.jsonl</span>
            <span class="queue-meta">append-only · file-locked</span>
          </div>
          <pre class="queue-row">{"id":"01HF…","ts":1715,
 "url":"app.local/dashboard",
 "element":{
   "filePath":"src/components/Button.tsx",
   "line":42,"componentName":"Button",
   "snippet":{"lines":[…],"language":"tsx"}
 },"source":"extension"}</pre>
        </div>
        <div class="annotation">
          <span class="inspekt-step-num">3</span>
          <span class="annotation-text">Daemon persists the grab. MCP servers read the same file.</span>
        </div>
      </div>

      <!-- ④ Agent -->
      <div class="node node-agent" data-step="4">
        <div class="card card-agent">
          <div class="msg user">
            <span class="msg-author">you</span>
            <span class="msg-body">make this button violet</span>
          </div>
          <div class="msg agent">
            <span class="msg-author">claude</span>
            <span class="msg-body">
              <span class="agent-tool">→ called <code>grab_latest()</code></span>
              Editing <code>src/components/Button.tsx:42</code>:
              changed <code>className</code> to add
              <code>bg-violet-500</code>.
            </span>
          </div>
        </div>
        <div class="annotation">
          <span class="inspekt-step-num">4</span>
          <span class="annotation-text">Your agent calls <code>grab_latest()</code> over MCP and edits.</span>
        </div>
      </div>

      <!-- SVG arrows between nodes -->
      <svg class="arrows" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker
            id="violet-arrow"
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
        <!-- 1 → 2 -->
        <path
          class="arrow"
          d="M 250 180 C 350 180, 350 400, 250 400"
          fill="none"
          stroke="var(--inspekt-violet)"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          marker-end="url(#violet-arrow)"
        />
        <!-- 2 → 3 -->
        <path
          class="arrow"
          d="M 500 460 C 620 460, 640 240, 760 240"
          fill="none"
          stroke="var(--inspekt-violet)"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          marker-end="url(#violet-arrow)"
        />
        <!-- 3 → 4 -->
        <path
          class="arrow"
          d="M 880 360 C 880 480, 880 540, 760 600"
          fill="none"
          stroke="var(--inspekt-violet)"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          marker-end="url(#violet-arrow)"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.hero-flow {
  padding-top: 32px;
  padding-bottom: 64px;
}

.hero-header {
  max-width: 720px;
  margin-bottom: 48px;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, var(--inspekt-size-hero));
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--inspekt-ink);
  margin: 0 0 16px;
}

.hero-tag {
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--inspekt-ink-2);
  max-width: 60ch;
  margin: 0 0 28px;
}

.hero-install {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.install-line {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 6px;
  background: var(--inspekt-pill-bg);
  color: var(--inspekt-pill-fg);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
}
.install-line .prompt {
  color: var(--inspekt-violet-bright);
  user-select: none;
}

.hero-source {
  font-size: 14px;
  color: var(--inspekt-violet);
  text-decoration: none;
  font-weight: 500;
}
.hero-source:hover {
  text-decoration: underline;
}

/* ----- Diagram grid ----- */

.diagram {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'click   queue'
    'popover agent';
  gap: 56px 80px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .diagram {
    grid-template-columns: 1fr;
    grid-template-areas: 'click' 'popover' 'queue' 'agent';
    gap: 40px;
  }
  .arrows {
    display: none;
  }
}

.node-click { grid-area: click; }
.node-popover { grid-area: popover; }
.node-queue { grid-area: queue; }
.node-agent { grid-area: agent; }

.node {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.annotation {
  display: flex;
  align-items: center;
  gap: 12px;
}
.annotation-text {
  font-size: 14px;
  color: var(--inspekt-ink-2);
  line-height: 1.4;
}
.annotation-text code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  padding: 1px 5px;
  background: var(--inspekt-paper-2);
  border-radius: 3px;
}

/* ----- Cards ----- */

.card {
  background: var(--inspekt-paper);
  border: 1px solid var(--inspekt-rule);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--inspekt-rule);
}

.card-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--inspekt-paper-2);
  border-bottom: 1px solid var(--inspekt-rule);
  font-size: 11px;
}
.card-chrome .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--inspekt-rule-strong);
}
.card-chrome .url {
  margin-left: 8px;
  color: var(--inspekt-ink-3);
  font-family: var(--vp-font-family-mono);
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ghost-row {
  height: 8px;
  background: var(--inspekt-rule);
  border-radius: 2px;
  width: 100%;
}
.ghost-row.short {
  width: 60%;
}

.hot-target {
  position: relative;
  align-self: flex-start;
  padding: 8px 14px;
  background: var(--inspekt-violet);
  color: #fff;
  border: 0;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  font-family: inherit;
  box-shadow: 0 0 0 2px var(--inspekt-violet-soft);
}
.cursor-pin {
  position: absolute;
  right: -10px;
  top: 18px;
  display: inline-flex;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
}

/* Popover card */
.card-popover {
  padding: 12px 14px;
}
.popover-path-dir {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--inspekt-ink-3);
}
.popover-path-file {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--inspekt-ink);
  margin-bottom: 8px;
}
.popover-snippet {
  margin: 0;
  padding: 8px 0;
  background: var(--inspekt-paper-2);
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.55;
  color: var(--inspekt-ink-2);
  white-space: pre;
  overflow: hidden;
}
.popover-snippet .line {
  display: block;
  padding: 0 10px;
}
.popover-snippet .line.target {
  background: var(--inspekt-violet-soft);
  border-left: 2px solid var(--inspekt-violet);
  padding-left: 8px;
  color: var(--inspekt-ink);
}
.popover-snippet .ln {
  display: inline-block;
  width: 22px;
  color: var(--inspekt-ink-3);
  user-select: none;
}
.popover-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--inspekt-rule);
}
.action {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--inspekt-paper-2);
  color: var(--inspekt-ink-2);
}
.action.send {
  background: var(--inspekt-violet);
  color: #fff;
}

/* Queue card */
.card-queue {
  padding: 10px 12px;
}
.queue-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--inspekt-rule);
}
.queue-path {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--inspekt-ink);
  font-weight: 600;
}
.queue-meta {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--inspekt-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.queue-row {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--inspekt-ink-2);
  white-space: pre;
  overflow: hidden;
}

/* Agent card */
.card-agent {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  line-height: 1.55;
}
.msg.user {
  background: var(--inspekt-paper-2);
  align-self: flex-end;
  max-width: 75%;
}
.msg.agent {
  background: var(--inspekt-violet-soft);
  align-self: flex-start;
  max-width: 90%;
}
.msg-author {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--inspekt-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.msg-body code {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  padding: 1px 4px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 3px;
}
.dark .msg-body code {
  background: rgba(255, 255, 255, 0.08);
}
.agent-tool {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--inspekt-violet);
  margin-bottom: 4px;
}

/* ----- Arrows ----- */

.arrows {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
.arrow {
  stroke-dashoffset: 0;
}
.hero-flow:not(.animated) .arrow {
  opacity: 0;
}
.hero-flow.animated .arrow {
  animation: draw 1200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 1;
}
.hero-flow.animated .arrow:nth-child(2) {
  animation-delay: 300ms;
}
.hero-flow.animated .arrow:nth-child(3) {
  animation-delay: 600ms;
}
@keyframes draw {
  from {
    stroke-dashoffset: 800;
    opacity: 0;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .arrow {
    animation: none !important;
    opacity: 1 !important;
  }
}
</style>
