import { createDevLens, type DevLensInstance } from '@devlens/core';
import { getSettings, updateSettings } from '../storage.js';

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
let demoInstance: DevLensInstance | null = null;
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

function startDemo(): void {
  if (demoInstance) return;
  demoInstance = createDevLens({
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
    // No-op server URL — clicks show the popover but "open in editor"
    // actions won't connect to anything. That's intentional for the demo.
    serverUrl: '',
  });
  demoInstance.enable();
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

void init();
