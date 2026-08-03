<script lang="ts">
  import { base } from '$app/paths';
  import ThemeToggle from './ThemeToggle.svelte';

  let mobileMenuOpen = $state(false);

  const navLinks = [
    { href: '#what-it-does', label: 'What it does' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#install', label: 'Install' },
  ] as const;
</script>

<nav
  class="sticky top-0 z-50 border-b border-surface-200 bg-surface-50/90 backdrop-blur dark:border-surface-800 dark:bg-surface-950/90"
>
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-14 items-center justify-between">
      <a href="{base}/" class="flex items-center gap-2.5">
        <svg class="size-7" viewBox="0 0 32 32" fill="none" aria-hidden="true">
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
        <span
          class="font-display text-base font-bold tracking-tight text-surface-900 dark:text-surface-50"
        >
          Inspekt
        </span>
      </a>

      <div class="hidden items-center gap-1 md:flex">
        {#each navLinks as link (link.href)}
          <a
            href={link.href}
            class="px-3 py-1.5 text-sm font-medium text-surface-600 transition-colors hover:text-accent-700 dark:text-surface-300 dark:hover:text-accent-400"
          >
            {link.label}
          </a>
        {/each}
        <a
          href="{base}/docs/"
          class="px-3 py-1.5 text-sm font-medium text-surface-600 transition-colors hover:text-accent-700 dark:text-surface-300 dark:hover:text-accent-400"
        >
          Docs
        </a>
      </div>

      <div class="flex items-center gap-2">
        <ThemeToggle />
        <a
          href="https://github.com/aylith-labs/inspekt"
          class="hidden rounded-md border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 transition-colors hover:border-accent-500 hover:text-accent-700 sm:inline-flex dark:border-surface-700 dark:text-surface-200 dark:hover:border-accent-400 dark:hover:text-accent-400"
        >
          GitHub
        </a>
        <button
          onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
          class="p-1.5 text-surface-600 transition-colors hover:text-accent-700 md:hidden dark:text-surface-300 dark:hover:text-accent-400"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {#if mobileMenuOpen}
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          {:else}
            <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          {/if}
        </button>
      </div>
    </div>
  </div>

  {#if mobileMenuOpen}
    <div class="border-t border-surface-200 px-4 pt-2 pb-3 md:hidden dark:border-surface-800">
      {#each navLinks as link (link.href)}
        <a
          href={link.href}
          onclick={() => (mobileMenuOpen = false)}
          class="block px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:text-accent-700 dark:text-surface-300 dark:hover:text-accent-400"
        >
          {link.label}
        </a>
      {/each}
      <a
        href="{base}/docs/"
        onclick={() => (mobileMenuOpen = false)}
        class="block px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:text-accent-700 dark:text-surface-300 dark:hover:text-accent-400"
      >
        Docs
      </a>
      <a
        href="https://github.com/aylith-labs/inspekt"
        onclick={() => (mobileMenuOpen = false)}
        class="mt-2 block rounded-md border border-surface-300 px-3 py-2 text-center text-sm font-medium text-surface-700 dark:border-surface-700 dark:text-surface-200"
      >
        GitHub
      </a>
    </div>
  {/if}
</nav>
