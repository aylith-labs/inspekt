import { getSettings, updateSettings, getSiteSettings } from './storage.js';
import type { MessageType } from './messaging.js';

// Track per-tab state
const tabState = new Map<number, { enabled: boolean; standalone: boolean }>();

chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'GET_SETTINGS':
      if (sender.tab?.url) {
        getSiteSettings(sender.tab.url).then((settings) => sendResponse(settings));
      } else {
        getSettings().then((settings) => sendResponse(settings));
      }
      return true; // Async response

    case 'UPDATE_SETTINGS':
      updateSettings(message.settings).then(() => {
        // Notify all tabs of settings change
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'SETTINGS_CHANGED',
                settings: message.settings,
              }).catch(() => {}); // Tab might not have content script
            }
          }
        });
        sendResponse({ ok: true });
      });
      return true;

    case 'TOGGLE_DEVLENS':
      if (tabId) {
        const state = tabState.get(tabId) ?? { enabled: false, standalone: false };
        state.enabled = !state.enabled;
        tabState.set(tabId, state);
        chrome.tabs.sendMessage(tabId, {
          type: state.enabled ? 'ENABLE' : 'DISABLE',
        }).catch(() => {});
        sendResponse({ enabled: state.enabled });
      }
      return true;

    case 'INJECT_STANDALONE':
      if (tabId) {
        const state = tabState.get(tabId) ?? { enabled: false, standalone: false };
        state.standalone = true;
        state.enabled = true;
        tabState.set(tabId, state);
        sendResponse({ ok: true });
      }
      return true;

    case 'GET_STATUS':
      if (tabId) {
        const state = tabState.get(tabId) ?? { enabled: false, standalone: false };
        sendResponse({
          type: 'STATUS_RESPONSE',
          enabled: state.enabled,
          standalone: state.standalone,
          hasPlugin: false,
        });
      }
      return true;
  }
});

// Clean up tab state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

// Update badge based on state
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const state = tabState.get(tabId);
  chrome.action.setBadgeText({
    text: state?.enabled ? 'ON' : '',
    tabId,
  });
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId });
});
