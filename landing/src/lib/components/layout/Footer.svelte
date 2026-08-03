<script lang="ts">
  import { base } from '$app/paths';
</script>

<footer class="mt-auto border-t border-surface-200 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
  <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
    <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      <div class="sm:col-span-2 lg:col-span-1">
        <div class="flex items-center gap-2.5">
          <svg class="size-6" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect
              x="3"
              y="3"
              width="26"
              height="26"
              rx="3"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-dasharray="4 3"
              class="text-accent-600 dark:text-accent-400"
            />
            <circle cx="16" cy="16" r="3.5" fill="currentColor" class="text-accent-600 dark:text-accent-400" />
          </svg>
          <span class="font-display text-lg font-bold text-surface-900 dark:text-surface-50">Inspekt</span>
        </div>
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-surface-600 dark:text-surface-400">
          Click any element, get its source — or hand it to your agent. Framework-agnostic, MIT
          licensed.
        </p>
      </div>

      <div>
        <h2 class="mb-3 text-[10px] font-semibold tracking-[0.18em] text-surface-500 uppercase dark:text-surface-400">
          Documentation
        </h2>
        <ul class="space-y-2">
          <li>
            <a
              href="{base}/docs/install"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              Install
            </a>
          </li>
          <li>
            <a
              href="{base}/docs/quick-start"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              Quick start
            </a>
          </li>
          <li>
            <a
              href="{base}/docs/agent-integration"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              Agent integration
            </a>
          </li>
          <li>
            <a
              href="{base}/docs/api"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              API reference
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h2 class="mb-3 text-[10px] font-semibold tracking-[0.18em] text-surface-500 uppercase dark:text-surface-400">
          Source
        </h2>
        <ul class="space-y-2">
          <li>
            <a
              href="https://github.com/aylith-labs/inspekt"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href="https://www.npmjs.com/package/@aylith/inspekt"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              npm
            </a>
          </li>
          <li>
            <a
              href="https://github.com/aylith-labs/inspekt/blob/main/LICENSE"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              MIT License
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h2 class="mb-3 text-[10px] font-semibold tracking-[0.18em] text-surface-500 uppercase dark:text-surface-400">
          Studio
        </h2>
        <ul class="space-y-2">
          <li>
            <a
              href="https://aylith.com"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              Aylith
            </a>
          </li>
          <li>
            <a
              href="https://aylith.com/projects/inspekt"
              class="text-sm text-surface-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-surface-300 dark:hover:text-accent-400"
            >
              Inspekt in the catalog
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div
      class="mt-10 flex flex-col items-center justify-between gap-2 border-t border-surface-200 pt-6 sm:flex-row dark:border-surface-800"
    >
      <p class="text-[11px] tracking-[0.16em] text-surface-500 uppercase dark:text-surface-400">
        MIT licensed &middot; an <a
          href="https://aylith.com"
          class="underline underline-offset-4 hover:text-accent-700 dark:hover:text-accent-400">Aylith</a
        > project
      </p>
      <p class="text-[11px] tracking-[0.16em] text-surface-500 uppercase dark:text-surface-400">
        Beta
      </p>
    </div>
  </div>
</footer>
