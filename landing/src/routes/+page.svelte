<script lang="ts">
  import { base } from '$app/paths';

  const features = [
    {
      number: '01',
      title: 'Click an element, get its file and line',
      lede: 'Ctrl+Alt+Click an instrumented element in your local development app. The popover can name its source file, line, column, and component because the plugin annotated that element.',
      emphasis: 'lead',
    },
    {
      number: '02',
      title: 'Optional agent handoff',
      lede: 'With the extension, daemon, and an MCP client configured separately, Send to Agent can queue a grab for your coding agent. The basic Vite inspector does not require this setup.',
      emphasis: 'pull',
    },
    {
      number: '03',
      title: 'Explore the element in context',
      lede: 'The inspector includes a component-tree panel and a source excerpt when the development server can resolve one. A DOM fallback may identify an element without a verified source location.',
      emphasis: 'normal',
    },
    {
      number: '04',
      title: 'Start with Vite',
      lede: 'The Vite plugin injects source locations and the inspector into your local development app. Other bundler integrations exist in the repository but still need separate first-use checks.',
      emphasis: 'normal',
    },
    {
      number: '05',
      title: 'Map container paths when needed',
      lede: 'The Vite plugin can read Docker Compose volume mounts or use an explicit path mapping to connect a container path to a host checkout.',
      emphasis: 'normal',
    },
    {
      number: '06',
      title: 'Inspector UI stays scoped',
      lede: 'The popover and tree render inside a Shadow DOM root. Highlights are applied to the selected element in your running development page.',
      emphasis: 'normal',
    },
  ] as const;

  const pipeline = [
    {
      step: '01',
      title: 'Build time',
      description:
        'The Vite plugin injects a data-insp-path attribute — file, line, column, component name — onto supported elements. This is development-only by default; production attributes require explicit opt-in.',
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
        'The tree panel can show framework context where its adapter finds it; otherwise the inspector falls back to the annotated DOM.',
    },
    {
      step: '04',
      title: 'Handoff',
      description:
        'Copy the path or open it in your configured editor. Agent handoff needs the optional extension, daemon, and MCP setup.',
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

</script>

<svelte:head>
  <title>Inspekt — inspect an element in your local dev app</title>
  <meta
    name="description"
    content="A source inspector for local development. Configure the Vite plugin, then Ctrl+Alt+Click an instrumented element to see its file and line. Optional agent handoff is a separate setup."
  />
</svelte:head>

<!-- ============================ HERO ============================ -->
<section class="border-b border-surface-200 dark:border-surface-800">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div class="grid items-center gap-9 py-8 lg:grid-cols-[1fr_1.12fr] lg:gap-12 lg:py-20">
      <div>
        <p class="text-[10px] font-semibold tracking-[0.22em] text-accent-700 uppercase dark:text-accent-400">
          Local development &middot; Beta
        </p>
        <h1
          class="mt-4 font-display font-bold tracking-tight text-surface-900 dark:text-surface-50"
          style="font-size: clamp(2.5rem, 5.5vw + 0.5rem, 4.5rem); line-height: 1.02"
        >
          From the page<br />to the source.
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-[1.7] text-surface-700 dark:text-surface-300">
          Add the Vite plugin to your development app. Then <kbd
            class="rounded border border-surface-300 bg-surface-100 px-1.5 py-0.5 font-mono text-sm text-surface-800 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
            >Ctrl+Alt+Click</kbd
          > an instrumented element to see its source file and line. Expand the snippet, copy the path,
          or open the file in your configured editor.
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

      </div>

      <figure class="min-w-0 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-[0_20px_60px_-30px_rgba(35,25,72,0.5)] dark:border-surface-700 dark:bg-surface-900">
        <div class="flex items-center justify-between border-b border-surface-200 bg-surface-100 px-4 py-3 dark:border-surface-700 dark:bg-surface-800">
          <span class="font-mono text-xs text-surface-600 dark:text-surface-300">A real React/Vite dev-page capture</span>
          <span class="rounded-full bg-accent-100 px-2 py-1 font-mono text-[10px] font-semibold text-accent-800 dark:bg-accent-900 dark:text-accent-200">Ctrl + Alt + Click</span>
        </div>
        <img src="{base}/inspekt-playground-light.png" alt="Inspekt highlights the playground heading and shows playground/src/components/Header.tsx:8 in its source popover" width="720" height="520" class="block h-auto w-full dark:hidden" />
        <img src="{base}/inspekt-playground-dark.png" alt="The same source popover in Inspekt's dark theme on the light playground page" width="720" height="520" class="hidden h-auto w-full dark:block" />
        <figcaption class="border-t border-surface-200 px-4 py-3 text-xs leading-relaxed text-surface-600 dark:border-surface-700 dark:text-surface-300">
          Captured from the repository playground with its Vite plugin. The popover follows the system theme; the demo page remains light.
        </figcaption>
      </figure>
    </div>
    <p class="border-t border-surface-200 py-5 text-sm leading-relaxed text-surface-600 dark:border-surface-800 dark:text-surface-400">
      MIT licensed. The React/Vite route has a local first-use proof; other integrations need their own checks.
      Published npm packages have not yet been retested against the local source fixes.
      <a href="{base}/docs/install" class="underline underline-offset-2 hover:text-accent-700 dark:hover:text-accent-400">Read current install limitations</a>.
    </p>
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
        Start with a source-backed click.
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
          The popover can ask your configured editor to open the selected file. The editor action
          depends on a working local editor command; use Copy path when it is unavailable.
        </p>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          The action registry also accepts custom actions through
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
      The optional Chrome extension currently requires a source build and unpacked installation.
      There is no verified Web Store installer.
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
          Keep your existing framework plugin. The basic Vite route needs Inspekt's plugin to inject
          the runtime, including in React projects. Other bundler integrations need separate first-use
          verification.
        </p>
      </div>

      <div class="min-w-0">
        <h3 class="font-display text-lg font-bold text-surface-900 dark:text-surface-50">
          Optional: wire up your agent
        </h3>
        <pre
          class="mt-4 overflow-x-auto rounded-lg border border-surface-200 bg-surface-100 p-4 font-mono text-[12.5px] leading-relaxed text-surface-800 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200">npx @aylith/inspekt setup</pre>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          This changes local agent configuration and requires a supported installed client. It
          generates a token, writes it to <code class="font-mono text-sm">~/.inspekt/config.json</code
          >, and registers the MCP server for detected clients. The Vite click-to-source route works
          without it.
        </p>
        <p class="mt-4 text-[15px] leading-[1.7] text-surface-700 dark:text-surface-300">
          The daemon uses a separate auth token. Its source-to-agent workflow has not had the same
          fresh-consumer proof as the React/Vite inspector.
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
