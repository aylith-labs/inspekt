// Shared theme state for every extension surface (popup, options, welcome).
//
// One source of truth: `chrome.storage.sync.theme`. Each surface mounts the
// cycler via `wireThemeCycler()`. Changing the theme on one surface fires
// `chrome.storage.onChanged`, which the other surfaces are subscribed to —
// the swap is live even while two windows are open side by side.

import { getSettings, updateSettings } from './storage.js';

export type ThemeMode = 'auto' | 'light' | 'dark';
const THEME_ORDER: ThemeMode[] = ['auto', 'light', 'dark'];

function isDarkPreferred(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyThemeToDocument(mode: ThemeMode, stackId?: string): void {
  const isDark = mode === 'dark' || (mode === 'auto' && isDarkPreferred());
  document.documentElement.classList.toggle('dark', isDark);
  if (stackId) {
    const stack = document.getElementById(stackId);
    if (stack) stack.dataset['mode'] = mode;
  }
}

/**
 * Mounts the shared theme cycler on `buttonId`, optionally driving icon
 * state on `stackId`. Returns a teardown for tests.
 *
 * - Pulls the initial theme from `chrome.storage.sync` (`settings.theme`).
 * - Persists every cycle back to storage so other surfaces see it.
 * - Listens for storage + OS-preference changes to keep the doc in sync.
 */
export async function wireThemeCycler(
  buttonId: string,
  stackId?: string,
): Promise<() => void> {
  const settings = await getSettings();
  let current: ThemeMode = (settings.theme ?? 'auto') as ThemeMode;
  applyThemeToDocument(current, stackId);

  const button = document.getElementById(buttonId);
  const onClick = (): void => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length]!;
    current = next;
    applyThemeToDocument(current, stackId);
    void updateSettings({ theme: current });
  };
  button?.addEventListener('click', onClick);

  const onStorage = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: chrome.storage.AreaName,
  ): void => {
    if (area !== 'sync' || !changes['theme']) return;
    const next = changes['theme'].newValue as ThemeMode | undefined;
    if (!next || next === current) return;
    current = next;
    applyThemeToDocument(current, stackId);
  };
  chrome.storage.onChanged.addListener(onStorage);

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onMedia = (): void => {
    if (current === 'auto') applyThemeToDocument('auto', stackId);
  };
  media.addEventListener('change', onMedia);

  return () => {
    button?.removeEventListener('click', onClick);
    chrome.storage.onChanged.removeListener(onStorage);
    media.removeEventListener('change', onMedia);
  };
}
