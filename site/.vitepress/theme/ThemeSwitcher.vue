<script setup lang="ts">
// Single-button theme cycler: System → Light → Dark → System.
// System is the default and remains the only state with no localStorage entry,
// so a first-time visitor implicitly follows their OS preference.

import { computed, onMounted, onUnmounted, ref } from 'vue';

const APPEARANCE_KEY = 'vitepress-theme-appearance';
type Mode = 'auto' | 'light' | 'dark';
const ORDER: Mode[] = ['auto', 'light', 'dark'];

const mode = ref<Mode>('auto');
let mediaQuery: MediaQueryList | null = null;
let onMediaChange: ((e: MediaQueryListEvent) => void) | null = null;

function readMode(): Mode {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  } catch {
    /* SSR / blocked */
  }
  return 'auto';
}

function applyDarkClass(currentMode: Mode): void {
  if (typeof document === 'undefined') return;
  const isDark =
    currentMode === 'dark' ||
    (currentMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

function setMode(next: Mode): void {
  mode.value = next;
  try {
    if (next === 'auto') localStorage.removeItem(APPEARANCE_KEY);
    else localStorage.setItem(APPEARANCE_KEY, next);
  } catch {
    /* SSR / blocked */
  }
  applyDarkClass(next);
}

function cycle(): void {
  const idx = ORDER.indexOf(mode.value);
  setMode(ORDER[(idx + 1) % ORDER.length]!);
}

const title = computed(() => {
  const labels: Record<Mode, string> = {
    auto: 'System (follows OS)',
    light: 'Light',
    dark: 'Dark',
  };
  const idx = ORDER.indexOf(mode.value);
  const next = ORDER[(idx + 1) % ORDER.length]!;
  return `${labels[mode.value]} · click for ${labels[next]}`;
});

onMounted(() => {
  mode.value = readMode();
  applyDarkClass(mode.value);

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  onMediaChange = () => {
    if (mode.value === 'auto') applyDarkClass('auto');
  };
  mediaQuery.addEventListener('change', onMediaChange);
});

onUnmounted(() => {
  if (mediaQuery && onMediaChange) mediaQuery.removeEventListener('change', onMediaChange);
});
</script>

<template>
  <button
    type="button"
    class="inspekt-theme-cycle"
    :title="title"
    :aria-label="title"
    @click="cycle"
  >
    <span class="icon-stack" :data-mode="mode">
      <svg
        class="icon icon-light"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <line x1="12" y1="2.5" x2="12" y2="4.8" />
          <line x1="12" y1="19.2" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="4.8" y2="12" />
          <line x1="19.2" y1="12" x2="21.5" y2="12" />
          <line x1="5.2" y1="5.2" x2="6.8" y2="6.8" />
          <line x1="17.2" y1="17.2" x2="18.8" y2="18.8" />
          <line x1="5.2" y1="18.8" x2="6.8" y2="17.2" />
          <line x1="17.2" y1="6.8" x2="18.8" y2="5.2" />
        </g>
      </svg>
      <svg
        class="icon icon-auto"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path
          d="M9 21h6M12 17v4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      <svg
        class="icon icon-dark"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
      >
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
          fill="currentColor"
        />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.inspekt-theme-cycle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-2);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  font-family: inherit;
}

.inspekt-theme-cycle:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.inspekt-theme-cycle:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.icon-stack {
  position: relative;
  display: inline-flex;
  width: 22px;
  height: 22px;
}

.icon {
  position: absolute;
  inset: 0;
  display: block;
  opacity: 0;
  transform: scale(0.85) rotate(-12deg);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.icon-stack[data-mode='auto'] .icon-auto,
.icon-stack[data-mode='light'] .icon-light,
.icon-stack[data-mode='dark'] .icon-dark {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

@media (max-width: 768px) {
  .inspekt-theme-cycle {
    margin-left: 6px;
  }
}
</style>
