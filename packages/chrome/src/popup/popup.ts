import { getSettings } from '../storage.js';

const toggle = document.getElementById('toggle')!;
const modeEl = document.getElementById('mode')!;
const editorEl = document.getElementById('editor')!;
const treeEl = document.getElementById('tree')!;
const statusEl = document.getElementById('status')!;
const settingsBtn = document.getElementById('settings-btn')!;
const standaloneBtn = document.getElementById('standalone-btn')!;

let enabled = false;

async function init() {
  const settings = await getSettings();

  modeEl.textContent = `${capitalize(settings.activation)} (Ctrl+Alt)`;
  editorEl.textContent = capitalize(settings.editor);
  treeEl.textContent = settings.treePanelEnabled ? 'On' : 'Off';

  // Get current tab status
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
      if (response) {
        enabled = response.enabled;
        updateToggle();
        updateStatus(response);
      }
    } catch {
      // Content script not loaded
      statusEl.textContent = 'No page';
      statusEl.className = 'status status-inactive';
    }
  }
}

toggle.addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_DEVLENS' });
  enabled = response?.enabled ?? !enabled;
  updateToggle();
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

standaloneBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'INJECT_STANDALONE' });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'ENABLE' }).catch(() => {});
  }
  enabled = true;
  updateToggle();
  statusEl.textContent = 'Standalone';
  statusEl.className = 'status status-standalone';
});

function updateToggle() {
  toggle.classList.toggle('active', enabled);
}

function updateStatus(response: { hasPlugin?: boolean; standalone?: boolean; enabled?: boolean }) {
  if (response.hasPlugin) {
    statusEl.textContent = 'Plugin';
    statusEl.className = 'status status-plugin';
  } else if (response.standalone) {
    statusEl.textContent = 'Standalone';
    statusEl.className = 'status status-standalone';
  } else {
    statusEl.textContent = enabled ? 'Active' : 'Inactive';
    statusEl.className = `status ${enabled ? 'status-plugin' : 'status-inactive'}`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

init();
