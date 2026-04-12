import { getSettings, updateSettings } from '../storage.js';

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
      statusEl.textContent = 'No page';
      statusEl.className = 'status status-inactive';
    }
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

function updateToggle(): void {
  toggle.classList.toggle('active', enabled);
}

function updateStatus(response: { hasPlugin?: boolean; standalone?: boolean; enabled?: boolean }): void {
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

void init();
