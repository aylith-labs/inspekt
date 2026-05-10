<script setup lang="ts">
// Single anchor combining the GitHub mark and the "GitHub" label so the nav
// doesn't carry two separate links to the same destination.
</script>

<template>
  <a
    class="inspekt-gh"
    href="https://github.com/steven-pribilinskiy/inspekt"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="GitHub repository"
  >
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.01-.02-1.98-3.2.69-3.88-1.54-3.88-1.54-.52-1.32-1.28-1.67-1.28-1.67-1.05-.71.08-.7.08-.7 1.16.08 1.78 1.19 1.78 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.19 1.18A11.1 11.1 0 0 1 12 6.8c.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"
      />
    </svg>
    <span class="label">GitHub</span>
  </a>
</template>

<style scoped>
.inspekt-gh {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.inspekt-gh:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.inspekt-gh:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.inspekt-gh svg {
  display: block;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .inspekt-gh .label {
    display: none;
  }
  .inspekt-gh {
    margin-left: 6px;
    padding: 6px;
  }
}
</style>
