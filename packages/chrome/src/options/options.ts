import { getSettings, updateSettings, exportSettings, importSettings } from '../storage.js';

const fields = {
  editor: document.getElementById('editor') as HTMLSelectElement,
  activation: document.getElementById('activation') as HTMLSelectElement,
  theme: document.getElementById('theme') as HTMLSelectElement,
  highlightColor: document.getElementById('highlightColor') as HTMLInputElement,
  highlightStyle: document.getElementById('highlightStyle') as HTMLSelectElement,
  animation: document.getElementById('animation') as HTMLSelectElement,
  treePanelEnabled: document.getElementById('treePanelEnabled') as HTMLInputElement,
  treePanelPosition: document.getElementById('treePanelPosition') as HTMLSelectElement,
  showProps: document.getElementById('showProps') as HTMLInputElement,
  showLineNumbers: document.getElementById('showLineNumbers') as HTMLInputElement,
};

const configJson = document.getElementById('config-json') as HTMLTextAreaElement;
const exportBtn = document.getElementById('export-btn')!;
const importBtn = document.getElementById('import-btn')!;
const saveBtn = document.getElementById('save-btn')!;
const savedMsg = document.getElementById('saved-msg')!;

async function loadSettings() {
  const settings = await getSettings();

  fields.editor.value = settings.editor;
  fields.activation.value = settings.activation;
  fields.theme.value = settings.theme;
  fields.highlightColor.value = settings.highlightColor;
  fields.highlightStyle.value = settings.highlightStyle;
  fields.animation.value = settings.animation;
  fields.treePanelEnabled.checked = settings.treePanelEnabled;
  fields.treePanelPosition.value = settings.treePanelPosition;
  fields.showProps.checked = settings.showProps;
  fields.showLineNumbers.checked = settings.showLineNumbers;
}

saveBtn.addEventListener('click', async () => {
  await updateSettings({
    editor: fields.editor.value,
    activation: fields.activation.value as 'click' | 'hover' | 'manual',
    theme: fields.theme.value as 'light' | 'dark' | 'auto',
    highlightColor: fields.highlightColor.value,
    highlightStyle: fields.highlightStyle.value as 'solid' | 'dashed' | 'glow',
    animation: fields.animation.value as 'pulse' | 'none',
    treePanelEnabled: fields.treePanelEnabled.checked,
    treePanelPosition: fields.treePanelPosition.value as 'left' | 'right',
    showProps: fields.showProps.checked,
    showLineNumbers: fields.showLineNumbers.checked,
  });

  savedMsg.classList.add('show');
  setTimeout(() => savedMsg.classList.remove('show'), 2000);
});

exportBtn.addEventListener('click', async () => {
  configJson.value = await exportSettings();
});

importBtn.addEventListener('click', async () => {
  if (!configJson.value.trim()) return;
  try {
    await importSettings(configJson.value);
    await loadSettings();
    savedMsg.textContent = 'Imported!';
    savedMsg.classList.add('show');
    setTimeout(() => {
      savedMsg.classList.remove('show');
      savedMsg.textContent = 'Saved!';
    }, 2000);
  } catch {
    alert('Invalid JSON');
  }
});

document.getElementById('open-welcome')?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
});

loadSettings();
