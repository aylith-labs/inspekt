import { getSettings, updateSettings } from '../storage.js';
import { wireThemeCycler } from '../theme.js';

const mainView = document.getElementById('main-view') as HTMLDivElement;
const introView = document.getElementById('intro-view') as HTMLDivElement;

const toggle = document.getElementById('toggle') as HTMLDivElement;
const modeEl = document.getElementById('mode') as HTMLSpanElement;
const editorEl = document.getElementById('editor') as HTMLSpanElement;
const treeEl = document.getElementById('tree') as HTMLSpanElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const standaloneBtn = document.getElementById('standalone-btn') as HTMLButtonElement;

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

  modeEl.textContent = activationLabel(settings.activation);
  editorEl.textContent = capitalize(settings.editor);
  treeEl.textContent = settings.treePanelEnabled ? 'On' : 'Off';

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

function activationLabel(mode: string): string {
  switch (mode) {
    case 'click-mod': return 'Click (Ctrl+Alt)';
    case 'click':     return 'Click (any)';
    case 'view':      return 'View (boxes)';
    case 'hover-mod': return 'Hover (Ctrl+Alt)';
    case 'hover':     return 'Hover (always)';
    case 'manual':    return 'Keyboard only';
    default:          return mode;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Theme cycler ----
// All three extension surfaces share `wireThemeCycler` so a flip on one
// (popup / options / welcome) propagates live to the others.
void wireThemeCycler('popup-theme', 'popup-theme-stack');

void init();
