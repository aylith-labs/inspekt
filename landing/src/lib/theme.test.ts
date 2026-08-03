import { describe, expect, it } from 'vitest';
import {
  isTheme,
  nextTheme,
  readStoredTheme,
  resolveTheme,
  THEME_ORDER,
  type Theme,
  themeLabel,
} from './theme';

describe('readStoredTheme', () => {
  it('returns each persisted preference verbatim', () => {
    for (const theme of THEME_ORDER) {
      expect(readStoredTheme(theme)).toBe(theme);
    }
  });

  it('falls back to system when nothing is stored', () => {
    expect(readStoredTheme(null)).toBe('system');
  });

  it('falls back to system for a value outside the cycle', () => {
    // A stale or hand-edited entry must not select a theme the cycle cannot
    // represent, which would strand the toggle on its first press.
    expect(readStoredTheme('solarized')).toBe('system');
    expect(readStoredTheme('')).toBe('system');
  });
});

describe('nextTheme', () => {
  it('advances through the cycle and wraps', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
    expect(nextTheme('system')).toBe('light');
  });

  it('returns to every theme within one full cycle', () => {
    let current: Theme = 'light';
    const seen = new Set<Theme>([current]);
    for (const _ of THEME_ORDER) {
      current = nextTheme(current);
      seen.add(current);
    }
    expect(seen.size).toBe(THEME_ORDER.length);
    expect(current).toBe('light');
  });

  it('restarts the cycle from an unrecognized value', () => {
    expect(nextTheme('nonsense' as Theme)).toBe('light');
  });
});

describe('resolveTheme', () => {
  it('honours an explicit preference regardless of the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system setting when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('isTheme', () => {
  it('accepts the supported themes', () => {
    expect(isTheme('light')).toBe(true);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('system')).toBe(true);
  });

  it('rejects other values', () => {
    expect(isTheme('sepia')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(3)).toBe(false);
  });
});

describe('themeLabel', () => {
  it('capitalizes the preference for display', () => {
    expect(themeLabel('light')).toBe('Light');
    expect(themeLabel('system')).toBe('System');
  });
});
