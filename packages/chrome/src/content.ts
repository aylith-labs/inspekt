import { createInspekt, type InspektInstance } from '@inspekt/core';

let instance: InspektInstance | null = null;
let hasPlugin = false;

// Check if the build plugin already injected Inspekt
function detectPlugin(): boolean {
  return !!(
    document.querySelector('inspekt-root') ||
    (window as unknown as Record<string, unknown>).__INSPEKT__ ||
    (window as unknown as Record<string, unknown>).__INSPEKT_INSTANCE__
  );
}

// Initialize in standalone mode (no build plugin)
function initStandalone(settings: Record<string, unknown>): InspektInstance {
  if (instance) return instance;

  instance = createInspekt({
    requireModifiers: Array.isArray(settings['requireModifiers'])
      ? (settings['requireModifiers'] as Array<'ctrl' | 'alt' | 'shift' | 'meta'>)
      : ['ctrl', 'alt'],
    theme: (settings['theme'] as 'auto') ?? 'auto',
    editor: (settings['editor'] as string) ?? 'cursor',
    highlight: {
      color: (settings['highlightColor'] as string) ?? '#3b82f6',
      style: (settings['highlightStyle'] as 'glow') ?? 'glow',
      animation: (settings['animation'] as 'pulse') ?? 'pulse',
    },
    treePanel: {
      enabled: (settings['treePanelEnabled'] as boolean) ?? true,
      position: (settings['treePanelPosition'] as 'right') ?? 'right',
      showProps: (settings['showProps'] as boolean) ?? true,
      showLineNumbers: (settings['showLineNumbers'] as boolean) ?? true,
    },
    defaultSnippetExpanded: (settings['defaultSnippetExpanded'] as boolean) ?? false,
    snippetContext: (settings['snippetContext'] as number) ?? 5,
    sourceMapEnabled: (settings['sourceMapEnabled'] as boolean) ?? false,
    customEditors: Array.isArray(settings['customEditors'])
      ? (settings['customEditors'] as Array<{ value: string; urlTemplate: string }>)
      : [],
  });
  return instance;
}

// Push settings to the build plugin's runtime
function pushSettingsToPlugin(settings: Record<string, unknown>): void {
  document.dispatchEvent(
    new CustomEvent('inspekt:settings-update', { detail: settings }),
  );
}

// Activity banner derived from the user's modifier choice.
function humanizeMod(mod: unknown): string {
  switch (mod) {
    case 'ctrl':  return 'Ctrl';
    case 'alt':   return 'Alt';
    case 'shift': return 'Shift';
    case 'meta':  return '⌘';
    default:      return '';
  }
}

function activeBanner(settings: Record<string, unknown> | null | undefined): string {
  const mods = Array.isArray(settings?.['requireModifiers'])
    ? (settings['requireModifiers'] as unknown[]).map(humanizeMod).filter(Boolean)
    : [];
  return mods.length > 0
    ? `Inspekt active · ${mods.join('+')}+hover to inspect`
    : 'Inspekt active · Hover any element to inspect';
}

// Brief in-page confirmation that the inspector engaged. Shadow DOM keeps
// the banner styles isolated from the host page's CSS.
function flashActivityBanner(message: string): void {
  const existing = document.getElementById('inspekt-activity-banner');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'inspekt-activity-banner';
  host.style.cssText =
    'all: initial; position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483647; pointer-events: none;';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .banner {
        font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #fff;
        background: oklch(0.22 0.04 285);
        padding: 8px 14px;
        border-radius: 999px;
        box-shadow: 0 4px 16px oklch(0.18 0.01 285 / 0.25);
        white-space: nowrap;
        opacity: 0;
        transform: translateY(-6px);
        animation: in 180ms ease-out forwards, out 240ms ease-in 2.6s forwards;
      }
      .banner .dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: oklch(0.78 0.18 145);
        margin-right: 8px;
        vertical-align: middle;
      }
      @keyframes in  { to { opacity: 1; transform: translateY(0); } }
      @keyframes out { to { opacity: 0; transform: translateY(-6px); } }
    </style>
    <div class="banner"><span class="dot"></span>${message}</div>
  `;
  document.documentElement.appendChild(host);
  setTimeout(() => host.remove(), 3000);
}

// Bridge: forward in-page capability postMessage to the background script so
// it can update the toolbar icon. Filtered by the namespaced envelope so we
// don't react to unrelated postMessages on the page.
window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as
    | { source?: string; type?: string; payload?: unknown }
    | null;
  if (!data || data.source !== 'inspekt') return;
  if (data.type !== 'inspekt:capabilities') return;
  chrome.runtime.sendMessage({
    type: 'INSPEKT_CAPABILITIES',
    capabilities: data.payload,
  });
});

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'ENABLE':
      if (hasPlugin) {
        pushSettingsToPlugin({ enabled: true });
        flashActivityBanner('Inspekt active');
      } else {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
          initStandalone(settings).enable();
          flashActivityBanner(activeBanner(settings));
        });
      }
      sendResponse({ ok: true });
      break;

    case 'DISABLE':
      if (instance) {
        instance.disable();
      } else if (hasPlugin) {
        pushSettingsToPlugin({ enabled: false });
      }
      sendResponse({ ok: true });
      break;

    case 'SETTINGS_CHANGED':
      if (hasPlugin) {
        pushSettingsToPlugin(message.settings);
      } else if (instance) {
        // Re-create with new settings
        instance.destroy();
        instance = null;
        initStandalone(message.settings).enable();
      }
      sendResponse({ ok: true });
      break;
  }
});

// On page load, detect plugin and report status
window.addEventListener('load', () => {
  hasPlugin = detectPlugin();

  // Report to background
  chrome.runtime.sendMessage({
    type: 'GET_STATUS',
  }).catch(() => {});

  // Listen for plugin status events
  document.addEventListener('inspekt:status', ((e: CustomEvent) => {
    hasPlugin = true;
    // Sync global settings to the plugin
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (settings) pushSettingsToPlugin(settings);
    });
  }) as EventListener);
});
