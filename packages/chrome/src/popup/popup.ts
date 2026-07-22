import { attachTooltip } from '@aylith/inspekt-core';
import { getSettings, updateSettings, type InspektSettings, type ModifierKey } from '../storage.js';
import { buildEditorOptgroupHtml } from '../selects.js';
import { wireThemeCycler } from '../theme.js';

const mainView = document.getElementById('main-view') as HTMLDivElement;
const introView = document.getElementById('intro-view') as HTMLDivElement;

const toggle = document.getElementById('toggle') as HTMLDivElement;
const modifiersPill = document.getElementById('modifiers-pill') as HTMLButtonElement;
const modifiersPillText = document.getElementById('modifiers-pill-text') as HTMLElement;
const editorSelect = document.getElementById('editor-select') as HTMLSelectElement;
const treeToggle = document.getElementById('tree-toggle') as HTMLDivElement;
const bboxToggle = document.getElementById('bbox-toggle') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const standaloneBtn = document.getElementById('standalone-btn') as HTMLButtonElement;

const MOD_ORDER: ModifierKey[] = ['ctrl', 'alt', 'shift', 'meta'];
function humanizeMod(mod: ModifierKey): string {
  switch (mod) {
    case 'ctrl':  return 'Ctrl';
    case 'alt':   return 'Alt';
    case 'shift': return 'Shift';
    case 'meta':  return '⌘';
  }
}
function renderModifiersPill(mods: ModifierKey[]): void {
  modifiersPillText.textContent = mods.length === 0
    ? '(none)'
    : MOD_ORDER.filter((m) => mods.includes(m)).map(humanizeMod).join('+');
}

// Intro controls
const introSkip = document.getElementById('intro-skip') as HTMLButtonElement;
const introBack = document.getElementById('intro-back') as HTMLButtonElement;
const introNext = document.getElementById('intro-next') as HTMLButtonElement;
const fullTourLink = document.getElementById('full-tour-link') as HTMLButtonElement;
const slides = Array.from(document.querySelectorAll<HTMLDivElement>('.slide'));
const dots = Array.from(document.querySelectorAll<HTMLSpanElement>('.dots .dot'));

const TOTAL_SLIDES = slides.length;
let currentSlide = 1;
let enabled = false;

async function init(): Promise<void> {
  const settings = await getSettings();
  // Populate the editor <select> with grouped options from the shared
  // EDITOR_META source of truth + any user-defined custom editors. Done
  // before any value is set so the option exists when `.value =` lands.
  editorSelect.innerHTML = buildEditorOptgroupHtml(settings.customEditors ?? []);

  if (!settings.popupIntroSeen) {
    showIntro();
    return;
  }

  showMain(settings);
}

function showIntro(): void {
  introView.classList.remove('hidden');
  mainView.classList.add('hidden');
  currentSlide = 1;
  renderSlide();
}

function renderSlide(): void {
  for (const slide of slides) {
    const idx = Number(slide.dataset['slide']);
    slide.classList.toggle('active', idx === currentSlide);
  }
  dots.forEach((dot, i) => dot.classList.toggle('active', i + 1 === currentSlide));

  introBack.style.visibility = currentSlide === 1 ? 'hidden' : 'visible';
  introNext.textContent = currentSlide === TOTAL_SLIDES ? 'Get started' : 'Next';
}

async function dismissIntro(): Promise<void> {
  await updateSettings({ popupIntroSeen: true });
  introView.classList.add('hidden');
  const settings = await getSettings();
  showMain(settings);
}

async function showMain(settings: Awaited<ReturnType<typeof getSettings>>): Promise<void> {
  mainView.classList.remove('hidden');

  renderModifiersPill(settings.requireModifiers ?? ['ctrl', 'alt']);
  editorSelect.value = settings.editor;
  treeToggle.classList.toggle('active', settings.treePanelEnabled);
  treeToggle.setAttribute('aria-checked', String(settings.treePanelEnabled));
  bboxToggle.classList.toggle('active', settings.showBoundingBoxes);
  bboxToggle.setAttribute('aria-checked', String(settings.showBoundingBoxes));

  // Background is the source of truth for tab state (chrome.storage.session).
  // Content scripts don't track enabled/standalone, so we must ask the SW.
  const response = (await chrome.runtime
    .sendMessage({ type: 'GET_STATUS' })
    .catch(() => null)) as {
    enabled?: boolean;
    standalone?: boolean;
    hasPlugin?: boolean;
  } | null;
  if (response) {
    enabled = response.enabled ?? false;
    updateToggle();
    updateStatus({
      enabled,
      standalone: response.standalone ?? false,
      hasPlugin: response.hasPlugin ?? false,
    });
  }
}

// ---- Intro event handlers ----

introSkip.addEventListener('click', () => {
  void dismissIntro();
});

introBack.addEventListener('click', () => {
  if (currentSlide > 1) {
    currentSlide -= 1;
    renderSlide();
  }
});

introNext.addEventListener('click', () => {
  if (currentSlide < TOTAL_SLIDES) {
    currentSlide += 1;
    renderSlide();
  } else {
    void dismissIntro();
  }
});

fullTourLink.addEventListener('click', async () => {
  await updateSettings({ popupIntroSeen: true });
  await chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  window.close();
});

// ---- Main view event handlers ----

interface AuthoritativeState {
  enabled: boolean;
  standalone: boolean;
  hasPlugin: boolean;
}

/**
 * Sends ENABLE to the active tab's content script. If the content script
 * isn't loaded (no listener), falls back to injecting `content.js` via
 * chrome.scripting.executeScript under the activeTab permission — which is
 * entitled by the popup-button click that just happened.
 */
async function ensureEnableOnActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'ENABLE' });
    return;
  } catch {
    // Content script wasn't there — inject it, then retry.
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    // Give the freshly-injected script a moment to register its listeners.
    await new Promise((r) => setTimeout(r, 100));
    await chrome.tabs.sendMessage(tab.id, { type: 'ENABLE' }).catch(() => {});
  } catch {
    // Injection failed (chrome:// page, web store, etc.) — nothing we can do.
  }
}

toggle.addEventListener('click', async () => {
  // Optimistic flip so the slider feels instant; we reconcile from the
  // background's authoritative response right after.
  enabled = !enabled;
  updateToggle();
  const response = (await chrome.runtime.sendMessage({ type: 'TOGGLE_INSPEKT' }).catch(
    () => null,
  )) as { enabled?: boolean; standalone?: boolean } | null;
  if (response) {
    enabled = response.enabled ?? enabled;
    updateToggle();
    updateStatus({
      enabled,
      standalone: response.standalone ?? false,
      hasPlugin: false,
    });
  }
  if (enabled) {
    // Make sure the content script actually receives ENABLE (it could be a
    // page that loaded before the extension, in which case message-send
    // rejects and we fall back to scripting.executeScript).
    void ensureEnableOnActiveTab();
  }
});

// ---- Inline settings controls ----
// Broadcast through the background so open tabs receive SETTINGS_CHANGED
// and apply the new value live (without a refresh).
function pushSettings(patch: Partial<InspektSettings>): void {
  void chrome.runtime
    .sendMessage({ type: 'UPDATE_SETTINGS', settings: patch })
    .catch(() => void updateSettings(patch));
}

// The Modifiers row is a read-only pill linking to the options page. Settings
// for Activation modifiers live there (4 checkboxes + live preview); the
// popup is too narrow to host all four cleanly.
modifiersPill.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

editorSelect.addEventListener('change', () => {
  pushSettings({ editor: editorSelect.value });
});

function wireToggleMini(el: HTMLDivElement, apply: (next: boolean) => void): void {
  const flip = (): void => {
    const next = !el.classList.contains('active');
    el.classList.toggle('active', next);
    el.setAttribute('aria-checked', String(next));
    apply(next);
  };
  el.addEventListener('click', flip);
  el.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flip();
    }
  });
}

wireToggleMini(treeToggle, (next) => pushSettings({ treePanelEnabled: next }));
wireToggleMini(bboxToggle, (next) => pushSettings({ showBoundingBoxes: next }));

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

standaloneBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'INJECT_STANDALONE' });
  enabled = true;
  updateToggle();
  updateStatus({ enabled: true, standalone: true, hasPlugin: false });
  void ensureEnableOnActiveTab();
});

function updateToggle(): void {
  toggle.classList.toggle('active', enabled);
}

function updateStatus(response: AuthoritativeState): void {
  if (response.hasPlugin) {
    statusEl.textContent = 'Plugin';
    statusEl.className = 'status status-plugin';
  } else if (response.standalone) {
    statusEl.textContent = 'Standalone';
    statusEl.className = 'status status-standalone';
  } else {
    statusEl.textContent = response.enabled ? 'Active' : 'Inactive';
    statusEl.className = `status ${response.enabled ? 'status-plugin' : 'status-inactive'}`;
  }
}

// ---- Theme cycler ----
// All three extension surfaces share `wireThemeCycler` so a flip on one
// (popup / options / welcome) propagates live to the others.
void wireThemeCycler('popup-theme', 'popup-theme-stack');

// Tooltips (replace native title="" — see `attachTooltip` in @aylith/inspekt-core).
const popupThemeBtn = document.getElementById('popup-theme');
if (popupThemeBtn) attachTooltip(popupThemeBtn, 'Theme');
attachTooltip(standaloneBtn, 'Inspect any site without a build plugin');

void init();
