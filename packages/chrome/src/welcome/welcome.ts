import { createInspekt, type InspektInstance } from '@inspekt/core';
import { getSettings, updateSettings } from '../storage.js';
import { wireThemeCycler } from '../theme.js';

const steps = Array.from(document.querySelectorAll<HTMLElement>('section.step'));
const dots = Array.from(document.querySelectorAll<HTMLElement>('.dots .dot'));
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const skipLink = document.getElementById('skip-link') as HTMLButtonElement;
const editorSelect = document.getElementById('editor-select') as HTMLSelectElement;
const savedIndicator = document.getElementById('saved-indicator') as HTMLSpanElement;

const TOTAL_STEPS = steps.length;
const DEMO_STEP = 2;
const FINAL_STEP = TOTAL_STEPS;
let currentStep = 1;
let demoInstance: InspektInstance | null = null;
let savedTimer: ReturnType<typeof setTimeout> | null = null;

async function init(): Promise<void> {
  const settings = await getSettings();
  editorSelect.value = settings.editor;

  renderStep();
  attachHandlers();
}

function renderStep(): void {
  for (const section of steps) {
    const idx = Number(section.dataset['step']);
    section.classList.toggle('active', idx === currentStep);
  }

  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'past');
    if (i + 1 === currentStep) dot.classList.add('active');
    else if (i + 1 < currentStep) dot.classList.add('past');
  });

  backBtn.disabled = currentStep === 1;
  nextBtn.textContent = currentStep === FINAL_STEP ? 'Done' : 'Next';
  skipLink.style.visibility = currentStep === FINAL_STEP ? 'hidden' : 'visible';

  // Start/stop the live demo when entering/leaving step 2
  if (currentStep === DEMO_STEP) {
    startDemo();
  } else {
    stopDemo();
  }
}

// Demo's `data-insp-path` attrs reference these synthetic file paths. We
// ship the snippet bodies inline so the popover renders a real source
// preview — no dev server required.
const DEMO_SNIPPETS = {
  'welcome/demo.tsx': {
    language: 'tsx',
    startLine: 1,
    lines: [
      'export function SandboxNav() {',
      '  return (',
      '    <nav className="sandbox-nav">',
      '      <span className="sandbox-nav-title">Sample App</span>',
      '      <div className="sandbox-nav-avatar">SP</div>',
      '    </nav>',
      '  );',
      '}',
      '',
      'export function SandboxCard() {',
      '  return (',
      '    <div className="sandbox-card">',
      '      <div className="sandbox-card-title">This is a Card</div>',
      '      <div className="sandbox-card-body">Ctrl+Alt+click me…</div>',
      '      <button className="sandbox-button">Primary Button</button>',
      '    </div>',
      '  );',
      '}',
    ],
  },
};

function startDemo(): void {
  if (demoInstance) return;
  demoInstance = createInspekt({
    activation: 'click',
    theme: 'auto',
    highlight: {
      color: '#3b82f6',
      style: 'glow',
      animation: 'pulse',
    },
    treePanel: {
      enabled: false,
      position: 'right',
      showProps: false,
      showLineNumbers: true,
    },
    actions: ['open-editor', 'copy-path', 'open-github', 'console-log'],
    serverUrl: '',
    githubRepo: '',
    staticSnippets: DEMO_SNIPPETS,
    defaultSnippetExpanded: true,
  });
  demoInstance.on('action', (actionId) => {
    if (actionId === 'open-editor' || actionId === 'open-github') {
      showToast(actionId === 'open-editor'
        ? 'On a real project, this opens the file in your editor'
        : 'On a real project, this opens the file on GitHub');
    }
  });
  demoInstance.enable();
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(message: string): void {
  let el = document.getElementById('demo-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'demo-toast';
    el.className = 'demo-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove('show'), 3000);
}

function stopDemo(): void {
  if (!demoInstance) return;
  demoInstance.destroy();
  demoInstance = null;
}

function attachHandlers(): void {
  backBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentStep < FINAL_STEP) {
      currentStep += 1;
      renderStep();
    } else {
      // On the final step, "Done" closes the tab
      window.close();
    }
  });

  skipLink.addEventListener('click', () => {
    currentStep = FINAL_STEP;
    renderStep();
  });

  editorSelect.addEventListener('change', async () => {
    await updateSettings({ editor: editorSelect.value });
    savedIndicator.classList.add('show');
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => savedIndicator.classList.remove('show'), 1800);
  });

  // Tear down the demo if the user closes the tab mid-tour
  window.addEventListener('beforeunload', () => {
    stopDemo();
  });
}

// ---- Theme cycler ----
// Shared with popup/options via chrome.storage.sync; see ../theme.ts.
void wireThemeCycler('welcome-theme', 'welcome-theme-stack');

void init();
