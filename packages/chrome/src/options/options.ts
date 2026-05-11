import {
  getSettings,
  updateSettings,
  exportSettings,
  importSettings,
  type InspektSettings,
} from '../storage.js';
import { wireThemeCycler } from '../theme.js';

// ---- Tabs ----------------------------------------------------------------
// Sidebar tab routing. Persists the active tab in the URL hash so reloads
// land on the same section.

type TabId = 'general' | 'appearance' | 'snippets' | 'agents' | 'ie';

function setActiveTab(tab: TabId): void {
  document.querySelectorAll<HTMLButtonElement>('.tablist button').forEach((button) => {
    button.classList.toggle('active', button.dataset['tab'] === tab);
  });
  document.querySelectorAll<HTMLElement>('.tabpanel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tab}`);
  });
  if (location.hash !== `#${tab}`) {
    history.replaceState(null, '', `#${tab}`);
  }
}

function bindTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('.tablist button').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset['tab'] as TabId | undefined;
      if (tab) setActiveTab(tab);
    });
  });
  const initial = (location.hash.replace('#', '') as TabId) || 'general';
  setActiveTab(
    ['general', 'appearance', 'snippets', 'agents', 'ie'].includes(initial) ? initial : 'general',
  );
}

// ---- Theme cycler --------------------------------------------------------
// Shared with popup/welcome via chrome.storage.sync; see ../theme.ts.
void wireThemeCycler('theme-cycle', 'theme-icon-stack');

// ---- Form fields ---------------------------------------------------------

const fields = {
  editor: document.getElementById('editor') as HTMLSelectElement,
  activation: document.getElementById('activation') as HTMLSelectElement,
  highlightColor: document.getElementById('highlightColor') as HTMLInputElement,
  highlightStyle: document.getElementById('highlightStyle') as HTMLSelectElement,
  animation: document.getElementById('animation') as HTMLSelectElement,
  treePanelEnabled: document.getElementById('treePanelEnabled') as HTMLInputElement,
  treePanelPosition: document.getElementById('treePanelPosition') as HTMLSelectElement,
  showProps: document.getElementById('showProps') as HTMLInputElement,
  showLineNumbers: document.getElementById('showLineNumbers') as HTMLInputElement,
  defaultSnippetExpanded: document.getElementById('defaultSnippetExpanded') as HTMLInputElement,
  snippetContext: document.getElementById('snippetContext') as HTMLInputElement,
  sourceMapEnabled: document.getElementById('sourceMapEnabled') as HTMLInputElement,
  showBoundingBoxes: document.getElementById('showBoundingBoxes') as HTMLInputElement,
};

const savedMsg = document.getElementById('saved-msg')!;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function pulseSaved(label = 'Saved'): void {
  savedMsg.textContent = label;
  savedMsg.classList.add('show');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => savedMsg.classList.remove('show'), 1500);
}

async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  fields.editor.value = settings.editor;
  fields.activation.value = settings.activation;
  fields.highlightColor.value = settings.highlightColor;
  fields.highlightStyle.value = settings.highlightStyle;
  fields.animation.value = settings.animation;
  fields.treePanelEnabled.checked = settings.treePanelEnabled;
  fields.treePanelPosition.value = settings.treePanelPosition;
  fields.showProps.checked = settings.showProps;
  fields.showLineNumbers.checked = settings.showLineNumbers;
  fields.defaultSnippetExpanded.checked = settings.defaultSnippetExpanded;
  fields.snippetContext.value = String(settings.snippetContext);
  fields.sourceMapEnabled.checked = settings.sourceMapEnabled;
  fields.showBoundingBoxes.checked = settings.showBoundingBoxes;
  // Theme is handled by wireThemeCycler — it pulls from settings.theme itself
  // and watches chrome.storage.onChanged to stay live with the other pages.
}

function collectSettings(): Partial<InspektSettings> {
  return {
    editor: fields.editor.value,
    activation: fields.activation.value as InspektSettings['activation'],
    highlightColor: fields.highlightColor.value,
    highlightStyle: fields.highlightStyle.value as InspektSettings['highlightStyle'],
    animation: fields.animation.value as InspektSettings['animation'],
    treePanelEnabled: fields.treePanelEnabled.checked,
    treePanelPosition: fields.treePanelPosition.value as InspektSettings['treePanelPosition'],
    showProps: fields.showProps.checked,
    showLineNumbers: fields.showLineNumbers.checked,
    defaultSnippetExpanded: fields.defaultSnippetExpanded.checked,
    snippetContext: Math.max(0, Math.min(30, parseInt(fields.snippetContext.value, 10) || 5)),
    sourceMapEnabled: fields.sourceMapEnabled.checked,
    showBoundingBoxes: fields.showBoundingBoxes.checked,
  };
}

async function autoSave(): Promise<void> {
  await updateSettings(collectSettings());
  pulseSaved();
}

for (const el of Object.values(fields)) {
  el.addEventListener('change', () => void autoSave());
}

// ---- Import/Export modal -------------------------------------------------

const modal = document.getElementById('ie-modal') as HTMLDivElement;
const modalClose = document.getElementById('ie-modal-close') as HTMLButtonElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
const modalTextarea = document.getElementById('ie-json') as HTMLTextAreaElement;
const modalPreview = document.getElementById('ie-preview') as HTMLDivElement;
const modalApply = document.getElementById('ie-apply') as HTMLButtonElement;
const modalExportCopy = document.getElementById('ie-copy') as HTMLButtonElement;
const modalTitle = document.getElementById('ie-modal-title')!;

let modalMode: 'export' | 'import' = 'export';

function openModal(mode: 'export' | 'import'): void {
  modalMode = mode;
  modal.classList.add('open');
  modalPreview.innerHTML = '';
  modalTextarea.value = '';
  modalApply.style.display = mode === 'import' ? '' : 'none';
  modalExportCopy.style.display = mode === 'export' ? '' : 'none';
  modalTextarea.readOnly = mode === 'export';
  modalTextarea.placeholder = mode === 'export' ? '' : 'Paste JSON here…';
  modalTitle.textContent = mode === 'export' ? 'Export Settings' : 'Import Settings';

  if (mode === 'export') {
    void exportSettings().then((json) => {
      modalTextarea.value = json;
    });
  }
}

function closeModal(): void {
  modal.classList.remove('open');
}

exportBtn.addEventListener('click', () => openModal('export'));
importBtn.addEventListener('click', () => openModal('import'));
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

modalTextarea.addEventListener('input', () => {
  if (modalMode !== 'import') return;
  const text = modalTextarea.value.trim();
  if (!text) {
    modalPreview.innerHTML = '';
    return;
  }
  try {
    const incoming = JSON.parse(text) as Partial<InspektSettings>;
    const current = collectSettings();
    const diffs: string[] = [];
    for (const [key, val] of Object.entries(incoming)) {
      if (
        key === 'popupIntroSeen' ||
        key === 'siteOverrides' ||
        key === 'pathMappings' ||
        key === 'githubDefaults'
      ) {
        continue;
      }
      const cur = current[key as keyof typeof current];
      if (cur !== undefined && String(cur) !== String(val)) {
        diffs.push(
          `<div class="diff-row"><span class="diff-key">${key}</span><span class="diff-old">${String(cur)}</span><span class="diff-arrow">&rarr;</span><span class="diff-new">${String(val)}</span></div>`,
        );
      }
    }
    modalPreview.innerHTML = diffs.length
      ? `<div class="diff-header">Changes to apply:</div>${diffs.join('')}`
      : '<div class="diff-empty">No differences found</div>';
  } catch {
    modalPreview.innerHTML = '<div class="diff-error">Invalid JSON</div>';
  }
});

modalApply.addEventListener('click', async () => {
  const text = modalTextarea.value.trim();
  if (!text) return;
  try {
    await importSettings(text);
    await loadSettings();
    closeModal();
    pulseSaved('Imported');
  } catch {
    modalPreview.innerHTML = '<div class="diff-error">Invalid JSON — import failed</div>';
  }
});

modalExportCopy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(modalTextarea.value);
  const previous = modalExportCopy.textContent;
  modalExportCopy.textContent = 'Copied!';
  setTimeout(() => {
    modalExportCopy.textContent = previous;
  }, 1500);
});

document.getElementById('open-welcome')?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
});

void loadSettings();
bindTabs();
