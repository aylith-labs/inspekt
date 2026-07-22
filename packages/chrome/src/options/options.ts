import { createRichSelect, tokenizeToLines, type RichSelectController } from '@aylith/inspekt-core';
import {
  getSettings,
  updateSettings,
  exportSettings,
  importSettings,
  type InspektSettings,
  type ModifierKey,
} from '../storage.js';
import { wireThemeCycler } from '../theme.js';
import { buildEditorItems } from '../selects.js';

const MOD_ORDER: ModifierKey[] = ['ctrl', 'alt', 'shift', 'meta'];

function humanizeMod(mod: ModifierKey): string {
  switch (mod) {
    case 'ctrl':  return 'Ctrl';
    case 'alt':   return 'Alt';
    case 'shift': return 'Shift';
    case 'meta':  return '⌘';
  }
}

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

// Editor dropdown — mounted lazily once the initial value is known. We
// destroy + recreate when settings.customEditors changes because the items
// list depends on it; setValue() alone wouldn't refresh the listbox.
let editorSelect: RichSelectController<string> | null = null;

function mountEditorSelect(settings: InspektSettings): void {
  const editorAnchor = document.getElementById('editor-anchor');
  if (!editorAnchor) return;
  editorSelect?.destroy();
  editorSelect = createRichSelect<string>({
    anchor: editorAnchor,
    items: buildEditorItems('../icons/editors', settings.customEditors ?? [], {
      onAddCustom: openCustomEditorModal,
      onDeleteCustom: (value) => void deleteCustomEditor(value),
    }),
    value: settings.editor,
    ariaLabel: 'Editor',
    // Anchor each row's side popover to the LEFT of the listbox so it
    // doesn't cover the rows the user is scanning. Auto-flips to right via
    // floating-ui if there's no room on that side.
    popoverPlacement: 'left-start',
    onChange(value) {
      void updateSettings({ editor: value }).then(() => pulseSaved());
    },
  });
}

// ---- Activation modifier checkboxes -------------------------------------

const modCheckboxes = {
  ctrl:  document.getElementById('mod-ctrl')  as HTMLInputElement,
  alt:   document.getElementById('mod-alt')   as HTMLInputElement,
  shift: document.getElementById('mod-shift') as HTMLInputElement,
  meta:  document.getElementById('mod-meta')  as HTMLInputElement,
} as const;
const modPreview = document.getElementById('mod-preview') as HTMLElement;

function readModifiersFromUI(): ModifierKey[] {
  return MOD_ORDER.filter((k) => modCheckboxes[k]?.checked);
}

function renderModifiersUI(mods: ModifierKey[]): void {
  for (const k of MOD_ORDER) {
    if (modCheckboxes[k]) modCheckboxes[k].checked = mods.includes(k);
  }
  modPreview.textContent = mods.length > 0 ? mods.map(humanizeMod).join('+') : '(none — always on)';
}

for (const k of MOD_ORDER) {
  modCheckboxes[k]?.addEventListener('change', () => {
    const next = readModifiersFromUI();
    renderModifiersUI(next);
    void updateSettings({ requireModifiers: next }).then(() => pulseSaved());
  });
}

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
  mountEditorSelect(settings);
  renderModifiersUI(settings.requireModifiers ?? ['ctrl', 'alt']);
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
const modalJsonView = document.getElementById('ie-json-view') as HTMLPreElement;
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
  modalJsonView.innerHTML = '';
  modalApply.style.display = mode === 'import' ? '' : 'none';
  modalExportCopy.style.display = mode === 'export' ? '' : 'none';
  // Export shows the syntax-highlighted <pre>; import shows the editable
  // textarea + diff preview.
  modalJsonView.style.display = mode === 'export' ? '' : 'none';
  modalTextarea.style.display = mode === 'import' ? '' : 'none';
  modalTextarea.placeholder = mode === 'export' ? '' : 'Paste JSON here…';
  modalTitle.textContent = mode === 'export' ? 'Export Settings' : 'Import Settings';

  if (mode === 'export') {
    void exportSettings().then((json) => {
      modalTextarea.value = json; // kept for copy-to-clipboard
      renderHighlightedJson(json, modalJsonView);
    });
  }
}

function renderHighlightedJson(json: string, target: HTMLElement): void {
  target.replaceChildren();
  const lines = tokenizeToLines(json, 'json');
  for (let i = 0; i < lines.length; i++) {
    const lineEl = document.createElement('span');
    lineEl.style.display = 'block';
    const tokens = lines[i]!.tokens;
    if (tokens.length === 0) {
      lineEl.textContent = ' '; // empty line keeps row height
    } else {
      for (const tok of tokens) {
        if (!tok.type) {
          lineEl.appendChild(document.createTextNode(tok.text));
        } else {
          const span = document.createElement('span');
          span.className = `token ${tok.type}`;
          span.textContent = tok.text;
          lineEl.appendChild(span);
        }
      }
    }
    target.appendChild(lineEl);
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

// ---- Custom editors (modal-driven) --------------------------------------

const ceModal = document.getElementById('ce-modal') as HTMLDivElement;
const ceModalClose = document.getElementById('ce-modal-close') as HTMLButtonElement;
const ceForm = document.getElementById('add-custom-editor-form') as HTMLFormElement;
const ceLabel = document.getElementById('ce-label') as HTMLInputElement;
const ceValue = document.getElementById('ce-value') as HTMLInputElement;
const ceUrlTemplate = document.getElementById('ce-url-template') as HTMLInputElement;
const ceHomepage = document.getElementById('ce-homepage') as HTMLInputElement;
const ceError = document.getElementById('ce-error') as HTMLDivElement;
const ceCancel = document.getElementById('ce-cancel') as HTMLButtonElement;

const BUILT_IN_EDITOR_KEYS = new Set([
  'cursor', 'windsurf', 'trae', 'kiro', 'antigravity', 'pearai', 'qoder', 'codebuddy',
  'vscode', 'vscode-insiders', 'vscodium',
  'idea', 'webstorm', 'phpstorm', 'pycharm', 'rubymine', 'goland', 'clion', 'rider',
  'sublime', 'zed',
]);

function showCeError(msg: string): void {
  ceError.textContent = msg;
  ceError.hidden = false;
}

function clearCeError(): void {
  ceError.textContent = '';
  ceError.hidden = true;
}

function resetForm(): void {
  ceLabel.value = '';
  ceValue.value = '';
  ceUrlTemplate.value = '';
  ceHomepage.value = '';
  clearCeError();
}

function openCustomEditorModal(): void {
  resetForm();
  ceModal.classList.add('open');
  // Give the modal a frame to paint before focusing so the autofocus jump
  // doesn't fight the open animation.
  requestAnimationFrame(() => ceLabel.focus());
}

function closeCustomEditorModal(): void {
  ceModal.classList.remove('open');
}

ceModalClose.addEventListener('click', closeCustomEditorModal);
ceModal.addEventListener('click', (e) => {
  if (e.target === ceModal) closeCustomEditorModal();
});
ceCancel.addEventListener('click', closeCustomEditorModal);
ceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  void addCustomEditor();
});

async function addCustomEditor(): Promise<void> {
  const label = ceLabel.value.trim();
  const value = ceValue.value.trim().toLowerCase();
  const urlTemplate = ceUrlTemplate.value.trim();
  const homepage = ceHomepage.value.trim();

  if (!label) return showCeError('Label is required.');
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    return showCeError('Key must start with a letter and contain only lowercase letters, digits, and dashes.');
  }
  if (BUILT_IN_EDITOR_KEYS.has(value)) {
    // Custom-overrides-built-in semantics — warn but allow.
    // eslint-disable-next-line no-alert
    if (!confirm(`"${value}" matches a built-in editor key. Your custom entry will override the built-in. Continue?`)) return;
  }
  if (!urlTemplate.includes('{file}')) {
    return showCeError('URL template must include the {file} placeholder.');
  }
  if (homepage) {
    try {
      new URL(homepage);
    } catch {
      return showCeError('Homepage must be a valid URL (or left blank).');
    }
  }

  const current = await getSettings();
  if ((current.customEditors ?? []).some((c) => c.value === value)) {
    return showCeError(`A custom editor with key "${value}" already exists.`);
  }

  const next = [
    ...(current.customEditors ?? []),
    homepage ? { value, label, urlTemplate, homepage } : { value, label, urlTemplate },
  ];
  await updateSettings({ customEditors: next });
  pulseSaved();
  closeCustomEditorModal();
  // Re-mount the editor select so the new entry appears in the Custom group.
  const settings = await getSettings();
  mountEditorSelect(settings);
}

async function deleteCustomEditor(value: string): Promise<void> {
  const current = await getSettings();
  const next = (current.customEditors ?? []).filter((c) => c.value !== value);
  await updateSettings({ customEditors: next });
  pulseSaved();
  const settings = await getSettings();
  mountEditorSelect(settings);
}

void loadSettings();
bindTabs();
