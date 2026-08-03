<script lang="ts">
  import { base } from '$app/paths';

  const features = [
    {
      number: '01',
      title: 'Click an element, get its file and line',
      lede: 'Ctrl+Alt+Click anything in your running app. The popover names the source file, the line, the column, and the component — because the bundler plugin wrote that location onto the element at build time. Clicking is the lookup, not a search.',
      emphasis: 'lead',
    },
    {
      number: '02',
      title: 'Hand it to your coding agent',
      lede: '"Send to Agent" pushes the element — file, line, component, surrounding source, page URL — onto a local queue an MCP server exposes to Claude Code, Cursor, Codex, Gemini CLI, and Antigravity. "Fix this button" resolves to a real file.',
      emphasis: 'pull',
    },
    {
      number: '03',
      title: 'Walk the component tree',
      lede: 'A tree panel with props, search, and highlighting. React, Vue, Svelte, and Solid each get a real adapter; anything else falls back to a generic DOM walk over the injected attributes.',
      emphasis: 'normal',
    },
    {
      number: '04',
      title: 'Whatever bundler you already use',
      lede: 'Vite gets a first-class plugin with dev-server integration. Webpack, Rspack, esbuild, and Rollup get the same transform through unplugin.',
      emphasis: 'normal',
    },
    {
      number: '05',
      title: 'Docker paths resolve to your checkout',
      lede: 'When the app runs in a container, source paths point at /app/…. Inspekt reads the volume mounts out of docker-compose.yaml and maps them back to the files on your machine.',
      emphasis: 'normal',
    },
    {
      number: '06',
      title: 'It cannot collide with your styles',
      lede: 'Every piece of Inspekt UI renders inside a Shadow DOM root. Highlights are inline styles on the real elements, and nothing runs at all while the inspector is disabled.',
      emphasis: 'normal',
    },
  ] as const;

  const pipeline = [
    {
      step: '01',
      title: 'Build time',
      description:
        'The bundler plugin injects a data-insp-path attribute — file, line, column, component name — onto each element it transforms. Development only; production builds are untouched.',
    },
    {
      step: '02',
      title: 'Runtime',
      description:
        'Ctrl+Alt+Click walks up the DOM to the nearest annotated ancestor, highlights it, and opens the popover with its source location and actions.',
    },
    {
      step: '03',
      title: 'Component tree',
      description:
        'Framework adapters read React fiber, Vue instances, Svelte context, or Solid owner to build the full hierarchy behind the element you clicked.',
    },
    {
      step: '04',
      title: 'Handoff',
      description:
        'Open the file in your IDE, copy the path, or send the grab to the daemon queue that your agent reads over MCP.',
    },
  ] as const;

  const packages = [
    { name: '@aylith/inspekt', role: 'Everything in one, plus the inspekt, inspekt-daemon, and inspekt-mcp commands' },
    { name: '@aylith/inspekt-core', role: 'Runtime UI — overlay, popover, tree panel, highlighting' },
    { name: '@aylith/inspekt-vite', role: 'Vite plugin — injects source locations at build time' },
    { name: '@aylith/inspekt-bundlers', role: 'Webpack, Rspack, esbuild, and Rollup plugins via unplugin' },
    { name: '@aylith/inspekt-cli', role: 'Opens files in your IDE from the terminal' },
    { name: '@aylith/inspekt-daemon', role: 'Localhost HTTP server holding the grab queue' },
    { name: '@aylith/inspekt-mcp', role: 'MCP server exposing that queue to agents over stdio' },
    { name: '@aylith/inspekt-skill', role: 'Installable skill telling a skill-aware agent when to read a grab' },
  ] as const;

  const shortcuts = [
    { keys: 'Ctrl+Alt+Click', action: 'Inspect element — popover with actions' },
    { keys: 'Shift+Alt+Click', action: 'Open the file in your IDE immediately' },
    { keys: 'Ctrl+Alt+I', action: 'Toggle Inspekt on or off' },
    { keys: 'Ctrl+Alt+O', action: 'Toggle the component name badges' },
    { keys: 'Ctrl+Alt+T', action: 'Toggle the component tree panel' },
    { keys: 'Escape', action: 'Close the popover or tree panel' },
  ] as const;

  const viteSetup = `// vite.config.ts
import { defineConfig } from 'vite';
import { inspekt } from '@aylith/inspekt-vite';

export default defineConfig({
  plugins: [inspekt({ editor: 'cursor' })],
});`;

  const grabPayload = `{
  "id": "01JC…",
  "timestamp": "2026-08-03T09:12:44.201Z",
  "url": "http://localhost:5173/settings",
  "element": {
    "filePath": "src/components/SaveButton.tsx",
    "line": 42,
    "column": 6,
    "componentName": "SaveButton",
    "snippet": "…surrounding source lines…"
  },
  "comment": "this one is misaligned",
  "source": "extension"
}`;
</script>

<svelte:head>
  <title>Inspekt — click any element, get its source, or hand it to your agent</title>
  <meta
    name="description"
    content="A framework-agnostic element inspector for dev servers. Ctrl+Alt+Click anything in your running app to see the file, line, and component behind it — then open it in your IDE or send it to a coding agent over MCP."
  />
</svelte:head>

<!-- ============================ HERO ============================ -->
<section class="border-b border-surface-200 dark:border-surface-800">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div class="grid gap-12 py-16 lg:grid-cols-[1.55fr_1fr] lg:gap-16 lg:py-24">
      <div>
        <p class="text-[10px] font-semibold tracking-[0.22em] text-accent-700 uppercase dark:text-accent-400">
          Developer tools &middot; Beta
        </p>
        <h1
          class="mt-4 font-display font-bold tracking-tight text-surface-900 dark:text-surface-50"
          style="font-size: clamp(2.5rem, 5.5vw + 0.5rem, 4.5rem); line-height: 1.02"
        >
          Click any element,<br />get its source.
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-[1.7] text-surface-700 dark:text-surface-300">
          The gap between seeing a bug and editing the code that causes it is pure overhead. Inspekt
          closes it to one click — <kbd
            class="rounded border border-surface-300 bg-surface-100 px-1.5 py-0.5 font-mono text-sm text-surface-800 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
            >Ctrl+Alt+Click</kbd
          > anything in your running app to see the file, line, and component tree behind it. Then open
          it in your IDE, or hand it to a coding agent with its surrounding source already attached.
        </p>

        <div class="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <a
            href="#install"
            class="inline-flex items-center gap-2 rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
          >
            Install it
            <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="{base}/docs/"
            class="text-sm font-medium text-surface-700 underline decoration-surface-400 underline-offset-[6px] transition-colors hover:text-accent-700 hover:decoration-accent-600 dark:text-surface-300 dark:decoration-surface-600 dark:hover:text-accent-400"
          >
            Read the docs
          </a>
        </div>

        <p class="mt-7 text-sm text-surface-500 dark:text-surface-400">
          MIT licensed. React, Vue, Svelte, Solid, Preact, Astro — and a generic DOM fallback for
          everything else.
        </p>
      </div>

      <!-- What the agent actually receives -->
      <aside class="selection-frame min-w-0 rounded-lg p-5">
        <p class="text-[10px] font-semibold tracking-[0.22em] text-surface-500 uppercase dark:text-surface-400">
          What the agent receives
        </p>
        <pre class="mt-4 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-surface-700 dark:text-surface-300">{grabPayload}</pre>
        <p class="mt-4 text-xs leading-relaxed text-surface-600 dark:text-surface-400">
          The snippet travels with the grab, so most of the time the agent does not need to open the
          file separately.
        </p>
      </aside>
    </div>
  </div>
</section>

<!-- ============================ PROBLEM ============================ -->
<section class="border-b border-surface-200 bg-surface-100 py-20 dark:border-surface-800 dark:bg-surface-900/40">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div class="rule-accent mb-12 max-w-3xl">
      <p class="mb-2 text-[10px] font-semibold tracking-[0.22em] text-surface-500 uppercase dark:text-surface-400">
        The friction
      </p>
      <h2 class="font-display text-3xl leading-tight font-bold text-surface-900 sm:text-4xl dark:text-surface-50">
        Your devtools know the DOM. They don't know your repo.
      </h2>
    </div>

    <div class="grid gap-10 sm:grid-cols-12 sm:gap-x-12 sm:gap-y-12">
      <article class="sm:col-span-7">
        <h3 class="font-display text-xl font-bold text-surface-900 dark:text-surface-50">
          Browser devtools show you the DOM, not your source.
        </h3>
        <p class="mt-3 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          You spot the misaligned button, then go hunting through a component tree in your editor to
          work out which file renders it. The information you need was in the build output the whole
          time.
        </p>
      </article>

      <article class="sm:col-span-5 sm:border-l sm:border-surface-200 sm:pl-12 dark:sm:border-surface-800">
        <h3 class="font-display text-xl font-bold text-surface-900 dark:text-surface-50">
          Every framework wants its own extension.
        </h3>
        <p class="mt-3 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          Framework devtools stop at the boundary of your editor, and the workflow resets every time
          you switch stacks.
        </p>
      </article>

      <article class="sm:col-span-12 sm:border-t sm:border-surface-200 sm:pt-12 dark:sm:border-surface-800">
        <h3 class="font-display text-xl font-bold text-surface-900 dark:text-surface-50">
          Describing an element to an agent in prose is the slow part.
        </h3>
        <p class="mt-3 max-w-3xl text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          "Fix this button" is useless without a file and a line, so you retype what the browser
          already knows. The context the agent needs is on screen and in the build output — it just
          has no path from one to the other.
        </p>
      </article>
    </div>
  </div>
</section>

<!-- ============================ FEATURES ============================ -->
<section id="what-it-does" class="border-b border-surface-200 py-24 dark:border-surface-800">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <header class="rule-accent mx-auto mb-16 max-w-2xl text-center">
      <p class="mb-2 text-[10px] font-semibold tracking-[0.22em] text-surface-500 uppercase dark:text-surface-400">
        What it does
      </p>
      <h2 class="font-display text-3xl leading-tight font-bold text-surface-900 sm:text-4xl dark:text-surface-50">
        One inspector, every stack.
      </h2>
    </header>

    <div class="grid gap-y-14 sm:grid-cols-2 sm:gap-x-14">
      {#each features as feature (feature.number)}
        <article
          class={feature.emphasis === 'lead'
            ? 'sm:col-span-2 sm:max-w-4xl'
            : feature.emphasis === 'pull'
              ? 'border-l-[3px] border-accent-500 pl-6 sm:col-span-2 sm:max-w-4xl'
              : ''}
        >
          <div class="flex items-baseline gap-3">
            <span class="font-mono text-xs text-surface-500 dark:text-surface-500">{feature.number}</span>
            <h3
              class={feature.emphasis === 'lead'
                ? 'font-display text-2xl font-bold text-surface-900 sm:text-3xl dark:text-surface-50'
                : 'font-display text-lg font-bold text-surface-900 dark:text-surface-50'}
            >
              {feature.title}
            </h3>
          </div>
          <p
            class={feature.emphasis === 'lead'
              ? 'mt-4 max-w-2xl text-base leading-[1.7] text-surface-700 sm:text-lg dark:text-surface-300'
              : 'mt-3 max-w-prose text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300'}
          >
            {feature.lede}
          </p>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- ============================ HOW IT WORKS ============================ -->
<section
  id="how-it-works"
  class="border-b border-surface-200 bg-surface-100 py-24 dark:border-surface-800 dark:bg-surface-900/40"
>
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <header class="rule-accent mb-14 max-w-2xl">
      <p class="mb-2 text-[10px] font-semibold tracking-[0.22em] text-surface-500 uppercase dark:text-surface-400">
        How it works
      </p>
      <h2 class="font-display text-3xl leading-tight font-bold text-surface-900 sm:text-4xl dark:text-surface-50">
        The location is already in the build.
      </h2>
    </header>

    <ol class="border-t border-surface-300 dark:border-surface-700">
      {#each pipeline as stage (stage.step)}
        <li
          class="grid grid-cols-[auto_1fr] gap-x-6 border-b border-surface-200 py-7 sm:grid-cols-[5rem_12rem_1fr] sm:gap-x-10 dark:border-surface-800"
        >
          <span class="font-mono text-sm font-semibold text-accent-700 dark:text-accent-400">
            {stage.step}
          </span>
          <h3 class="font-display text-xl font-bold text-surface-900 dark:text-surface-50">
            {stage.title}
          </h3>
          <p
            class="col-span-2 mt-2 max-w-prose text-[15px] leading-[1.7] text-surface-700 sm:col-span-1 sm:mt-0 dark:text-surface-300"
          >
            {stage.description}
          </p>
        </li>
      {/each}
    </ol>

    <div class="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div>
        <h3 class="font-display text-lg font-bold text-surface-900 dark:text-surface-50">
          Keyboard shortcuts
        </h3>
        <dl class="mt-5 space-y-2.5">
          {#each shortcuts as shortcut (shortcut.keys)}
            <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <dt class="w-40 shrink-0 font-mono text-xs text-accent-700 dark:text-accent-400">
                {shortcut.keys}
              </dt>
              <dd class="text-sm text-surface-700 dark:text-surface-300">{shortcut.action}</dd>
            </div>
          {/each}
        </dl>
        <p class="mt-5 text-sm text-surface-600 dark:text-surface-400">
          On Mac, <kbd class="font-mono">Cmd</kbd> replaces <kbd class="font-mono">Ctrl</kbd>.
        </p>
      </div>

      <div>
        <h3 class="font-display text-lg font-bold text-surface-900 dark:text-surface-50">
          Opens in the editor you already use
        </h3>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          VS Code, VS Code Insiders, Cursor, Windsurf, WebStorm, PhpStorm, PyCharm, IntelliJ IDEA,
          Sublime Text, Zed, Vim/Neovim, and Emacs.
        </p>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          Every action in the popover is extensible — register your own with
          <code class="font-mono text-sm text-accent-700 dark:text-accent-400">registerAction()</code
          > to jump to a ticket, a dashboard, or anywhere else that element should lead.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ============================ PACKAGES ============================ -->
<section class="border-b border-surface-200 py-24 dark:border-surface-800">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <header class="rule-accent mb-12 max-w-2xl">
      <p class="mb-2 text-[10px] font-semibold tracking-[0.22em] text-surface-500 uppercase dark:text-surface-400">
        The packages
      </p>
      <h2 class="font-display text-3xl leading-tight font-bold text-surface-900 sm:text-4xl dark:text-surface-50">
        Take all of it, or only the part you need.
      </h2>
    </header>

    <div class="border-t border-surface-300 dark:border-surface-700">
      {#each packages as pkg (pkg.name)}
        <div
          class="grid gap-1 border-b border-surface-200 py-5 sm:grid-cols-[22rem_1fr] sm:gap-8 dark:border-surface-800"
        >
          <code class="font-mono text-sm text-accent-700 dark:text-accent-400">{pkg.name}</code>
          <span class="text-sm leading-relaxed text-surface-700 dark:text-surface-300">{pkg.role}</span>
        </div>
      {/each}
    </div>

    <p class="mt-6 max-w-3xl text-sm leading-relaxed text-surface-600 dark:text-surface-400">
      The Chrome extension ships from the repo rather than npm — build it and load
      <code class="font-mono">packages/chrome/dist</code> as an unpacked extension. The Web Store listing
      is still pending review.
    </p>
  </div>
</section>

<!-- ============================ INSTALL ============================ -->
<section id="install" class="py-24">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <header class="rule-accent mx-auto mb-14 max-w-2xl text-center">
      <p class="mb-2 text-[10px] font-semibold tracking-[0.22em] text-surface-500 uppercase dark:text-surface-400">
        Get started
      </p>
      <h2 class="font-display text-3xl leading-tight font-bold text-surface-900 sm:text-4xl dark:text-surface-50">
        Add the plugin, start your dev server.
      </h2>
    </header>

    <div class="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:gap-14">
      <!-- min-w-0 lets the code blocks scroll instead of widening the grid track. -->
      <div class="min-w-0">
        <h3 class="font-display text-lg font-bold text-surface-900 dark:text-surface-50">
          1. Add it to your bundler
        </h3>
        <pre
          class="mt-4 overflow-x-auto rounded-lg border border-surface-200 bg-surface-100 p-4 font-mono text-[12.5px] leading-relaxed text-surface-800 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200">npm install -D @aylith/inspekt-vite</pre>
        <pre
          class="mt-3 overflow-x-auto rounded-lg border border-surface-200 bg-surface-100 p-4 font-mono text-[12.5px] leading-relaxed text-surface-800 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200">{viteSetup}</pre>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          Webpack, Rspack, esbuild, and Rollup take the equivalent plugin from
          <code class="font-mono text-sm text-accent-700 dark:text-accent-400">@aylith/inspekt-bundlers</code
          >. React and Preact projects can skip the plugin entirely — the source location is read from
          the fiber tree.
        </p>
      </div>

      <div class="min-w-0">
        <h3 class="font-display text-lg font-bold text-surface-900 dark:text-surface-50">
          2. Wire up your agent
        </h3>
        <pre
          class="mt-4 overflow-x-auto rounded-lg border border-surface-200 bg-surface-100 p-4 font-mono text-[12.5px] leading-relaxed text-surface-800 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200">npx @aylith/inspekt setup</pre>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          Generates a token, writes it to <code class="font-mono text-sm">~/.inspekt/config.json</code
          >, and registers the Inspekt MCP server with every agent it finds installed. Re-running is
          idempotent.
        </p>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          Every mutating daemon route requires an auth token, and the files holding it are written
          owner-only.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="{base}/docs/install"
            class="inline-flex items-center justify-center gap-2 rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
          >
            Full install guide
          </a>
          <a
            href="https://github.com/aylith-labs/inspekt"
            class="inline-flex items-center justify-center gap-2 rounded-md border border-surface-300 px-5 py-2.5 text-sm font-semibold text-surface-800 transition-colors hover:border-accent-500 hover:text-accent-700 dark:border-surface-700 dark:text-surface-100 dark:hover:border-accent-400 dark:hover:text-accent-400"
          >
            View the source
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
