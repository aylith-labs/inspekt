import { getSettings, updateSettings, getSiteSettings } from './storage.js';
import type { MessageType } from './messaging.js';

// Track per-tab state
const tabState = new Map<number, { enabled: boolean; standalone: boolean }>();

// Resolve the target tab ID: use sender.tab.id for content scripts,
// fall back to querying the active tab for popup/options page messages.
async function resolveTabId(senderTabId: number | undefined): Promise<number | undefined> {
  if (senderTabId) return senderTabId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  const senderTabId = sender.tab?.id;

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

    case 'TOGGLE_INSPEKT':
      resolveTabId(senderTabId).then((tabId) => {
        if (tabId) {
          const state = tabState.get(tabId) ?? { enabled: false, standalone: false };
          state.enabled = !state.enabled;
          tabState.set(tabId, state);
          chrome.tabs.sendMessage(tabId, {
            type: state.enabled ? 'ENABLE' : 'DISABLE',
          }).catch(() => {});
          sendResponse({ enabled: state.enabled });
        } else {
          sendResponse({ enabled: false });
        }
      });
      return true;

    case 'INJECT_STANDALONE':
      resolveTabId(senderTabId).then((tabId) => {
        if (tabId) {
          const state = tabState.get(tabId) ?? { enabled: false, standalone: false };
          state.standalone = true;
          state.enabled = true;
          tabState.set(tabId, state);
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false });
        }
      });
      return true;

    case 'GET_STATUS':
      resolveTabId(senderTabId).then((tabId) => {
        if (tabId) {
          const state = tabState.get(tabId) ?? { enabled: false, standalone: false };
          sendResponse({
            type: 'STATUS_RESPONSE',
            enabled: state.enabled,
            standalone: state.standalone,
            hasPlugin: false,
          });
        } else {
          sendResponse({
            type: 'STATUS_RESPONSE',
            enabled: false,
            standalone: false,
            hasPlugin: false,
          });
        }
      });
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
