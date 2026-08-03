// Theme selection logic, kept free of DOM and storage access so it can be
// exercised directly. The component owns the side effects; this owns the rules.

export type Theme = 'light' | 'dark' | 'system';

export const THEME_ORDER: readonly Theme[] = ['light', 'dark', 'system'];

export const THEME_STORAGE_KEY = 'theme';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEME_ORDER as readonly string[]).includes(value);
}

/**
 * Read a persisted preference, falling back to 'system' for anything absent or
 * unrecognized — a stale or hand-edited storage value must not select a theme
 * the cycle order cannot represent.
 */
export function readStoredTheme(stored: string | null): Theme {
  return isTheme(stored) ? stored : 'system';
}

/** Advance to the next theme in the cycle, wrapping at the end. */
export function nextTheme(current: Theme): Theme {
  const index = THEME_ORDER.indexOf(current);
  // An unrecognized current value restarts the cycle rather than skipping to
  // the second entry, which is what a bare (-1 + 1) would do.
  if (index === -1) return THEME_ORDER[0];
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}

/** Resolve a preference to the concrete appearance the document should use. */
export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

/** Human-readable label for the current preference. */
export function themeLabel(theme: Theme): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}
