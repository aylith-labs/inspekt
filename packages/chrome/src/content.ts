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
function initStandalone(settings: Record<string, unknown>): void {
  if (instance) return;

  instance = createInspekt({
    activation: (settings['activation'] as 'click') ?? 'click',
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
  });
}

// Push settings to the build plugin's runtime
function pushSettingsToPlugin(settings: Record<string, unknown>): void {
  document.dispatchEvent(
    new CustomEvent('inspekt:settings-update', { detail: settings }),
  );
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'ENABLE':
      if (hasPlugin) {
        pushSettingsToPlugin({ enabled: true });
      } else {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
          initStandalone(settings);
          instance?.enable();
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
        initStandalone(message.settings);
        instance?.enable();
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
