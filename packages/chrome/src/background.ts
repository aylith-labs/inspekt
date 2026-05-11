import { getSettings, updateSettings, getSiteSettings } from './storage.js';
import type { MessageType } from './messaging.js';
import { applyTabState, type TabState } from './icon.js';

// ---- Per-tab state, persisted in chrome.storage.session ------------------
// MV3 service workers unload after ~30s idle, which would otherwise erase an
// in-memory Map. chrome.storage.session is per-extension session storage that
// survives the worker unload and evicts on browser restart — the exact
// lifetime we want for per-tab inspector state.

const TAB_KEY = (id: number): string => `tab:${id}`;

const DEFAULT_TAB_STATE: TabState = { enabled: false, standalone: false };

async function getTabState(tabId: number): Promise<TabState> {
  const key = TAB_KEY(tabId);
  const raw = await chrome.storage.session.get(key);
  const stored = raw[key] as TabState | undefined;
  return stored ?? { ...DEFAULT_TAB_STATE };
}

async function setTabState(tabId: number, state: TabState): Promise<void> {
  await chrome.storage.session.set({ [TAB_KEY(tabId)]: state });
}

async function clearTabState(tabId: number): Promise<void> {
  await chrome.storage.session.remove(TAB_KEY(tabId));
}

async function refreshIcon(tabId: number): Promise<void> {
  const state = await getTabState(tabId);
  applyTabState(tabId, state);
}

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
      return true;

    case 'UPDATE_SETTINGS':
      updateSettings(message.settings).then(() => {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs
                .sendMessage(tab.id, { type: 'SETTINGS_CHANGED', settings: message.settings })
                .catch(() => {});
            }
          }
        });
        sendResponse({ ok: true });
      });
      return true;

    case 'TOGGLE_INSPEKT':
      (async () => {
        const tabId = await resolveTabId(senderTabId);
        if (!tabId) {
          sendResponse({ enabled: false, standalone: false });
          return;
        }
        const state = await getTabState(tabId);
        state.enabled = !state.enabled;
        await setTabState(tabId, state);
        chrome.tabs
          .sendMessage(tabId, { type: state.enabled ? 'ENABLE' : 'DISABLE' })
          .catch(() => {});
        await refreshIcon(tabId);
        sendResponse({ enabled: state.enabled, standalone: state.standalone });
      })();
      return true;

    case 'INJECT_STANDALONE':
      (async () => {
        const tabId = await resolveTabId(senderTabId);
        if (!tabId) {
          sendResponse({ ok: false });
          return;
        }
        const state = await getTabState(tabId);
        state.standalone = true;
        state.enabled = true;
        await setTabState(tabId, state);
        await refreshIcon(tabId);
        sendResponse({ ok: true });
      })();
      return true;

    case 'GET_STATUS':
      (async () => {
        const tabId = await resolveTabId(senderTabId);
        if (!tabId) {
          sendResponse({
            type: 'STATUS_RESPONSE',
            enabled: false,
            standalone: false,
            hasPlugin: false,
          });
          return;
        }
        const state = await getTabState(tabId);
        sendResponse({
          type: 'STATUS_RESPONSE',
          enabled: state.enabled,
          standalone: state.standalone,
          hasPlugin: false,
        });
      })();
      return true;

    case 'INSPEKT_CAPABILITIES':
      if (senderTabId) {
        (async () => {
          const state = await getTabState(senderTabId);
          state.capabilities = message.capabilities;
          await setTabState(senderTabId, state);
          await refreshIcon(senderTabId);
        })();
      }
      return false;
  }
});

// Clean up tab state when the tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  void clearTabState(tabId);
});

// Refresh icon when the active tab changes (e.g. user switches tabs).
chrome.tabs.onActivated.addListener(({ tabId }) => {
  void refreshIcon(tabId);
});

// On navigation/refresh, drop stale capability info but keep the enabled flag.
// The capability probe will re-run after page load and refine the icon from
// greyscale → color once it detects instrumentation.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') {
    (async () => {
      const state = await getTabState(tabId);
      state.capabilities = undefined;
      await setTabState(tabId, state);
      await refreshIcon(tabId);
    })();
  }
});
