import type {
  InspektOptions,
  InspektInstance,
  InspektAction,
  InspektEventMap,
  InspectedElement,
} from './types.js';
import { findClosestSource, elementToInspected } from './detection/source-detector.js';
import { Highlighter } from './highlight/highlighter.js';
import { BoundingBoxOverlay } from './highlight/bounding-boxes.js';
import { Popover } from './popover/popover.js';
import { Overlay } from './overlay/overlay.js';
import {
  createOpenEditorAction,
  createCopyPathAction,
  createOpenGithubAction,
  createConsoleLogAction,
} from './actions/built-in.js';
import { TreePanel } from './tree-panel/tree-panel.js';
import { detectAdapter, type ComponentNode } from './adapters/index.js';
import { STYLES } from './styles.js';

export type { ComponentNode } from './adapters/index.js';
export type {
  InspektOptions,
  InspektInstance,
  InspektAction,
  InspektEventMap,
  InspectedElement,
};
export type { ShortcutConfig, HighlightConfig, BadgeConfig, TreePanelConfig } from './types.js';

// Component primitives shared with the Chrome extension.
export { attachTooltip } from './components/tooltip.js';
export type { TooltipOptions } from './components/tooltip.js';
export { createRichSelect } from './components/rich-select.js';
export type { RichSelectItem, RichSelectController, RichSelectOptions } from './components/rich-select.js';
export { tokenizeToLines } from './highlight/prism.js';
export type { CodeToken, CodeLine } from './highlight/prism.js';

const DEFAULT_OPTIONS: InspektOptions = {
  // Default preserves the legacy click-mod behavior: page interactions never
  // intercepted unless Ctrl+Alt is held. Empty array = always-on hover.
  requireModifiers: ['ctrl', 'alt'],
  showBoundingBoxes: false,
  shortcut: { key: 'click', modifiers: ['ctrl', 'alt'] },
  toggleShortcut: { key: 'i', modifiers: ['ctrl', 'alt'] },
  theme: 'auto',
  highlight: {
    color: '#3b82f6',
    style: 'glow',
    animation: 'pulse',
  },
  badge: {
    show: true,
    position: 'auto',
    showPath: false,
  },
  borders: false,
  actions: ['open-editor', 'copy-path', 'open-github', 'console-log'],
  editor: 'cursor',
  editorPathBase: '',
  githubRepo: '',
  githubBranch: 'main',
  pathMapping: {},
  treePanel: {
    enabled: true,
    position: 'right',
    showProps: true,
    showLineNumbers: true,
  },
  sourceAttribute: 'data-insp-path',
  serverUrl: '',
  defaultSnippetExpanded: false,
  snippetContext: 5,
  sourceMapEnabled: false,
  customEditors: [],
};

export function createInspekt(userOptions: Partial<InspektOptions> = {}): InspektInstance {
  const options: InspektOptions = { ...DEFAULT_OPTIONS, ...userOptions };
  let capabilityTeardown: (() => void) | null = null;

  // Merge nested objects
  if (userOptions.highlight) options.highlight = { ...DEFAULT_OPTIONS.highlight, ...userOptions.highlight };
  if (userOptions.badge) options.badge = { ...DEFAULT_OPTIONS.badge, ...userOptions.badge };
  if (userOptions.treePanel) options.treePanel = { ...DEFAULT_OPTIONS.treePanel, ...userOptions.treePanel };
  if (userOptions.shortcut) options.shortcut = { ...DEFAULT_OPTIONS.shortcut, ...userOptions.shortcut };
  if (userOptions.toggleShortcut) options.toggleShortcut = { ...DEFAULT_OPTIONS.toggleShortcut, ...userOptions.toggleShortcut };

  let enabled = false;
  const listeners = new Map<string, Set<Function>>();
  const customActions = new Map<string, InspektAction>();

  // Create Shadow DOM host
  const host = document.createElement('inspekt-root');
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  // Apply theme
  applyTheme(host, options.theme);

  // Components
  const highlighter = new Highlighter(options.highlight);
  const popover = new Popover(shadow);
  popover.configureSnippet({
    serverUrl: options.serverUrl || undefined,
    context: options.snippetContext,
    defaultExpanded: options.defaultSnippetExpanded,
    sourceMapEnabled: options.sourceMapEnabled,
    staticSnippets: options.staticSnippets,
  });
  const overlay = new Overlay(shadow);
  const bboxOverlay = new BoundingBoxOverlay(shadow);
  const adapter = detectAdapter();

  let treePanel: TreePanel | null = null;
  if (options.treePanel.enabled) {
    treePanel = new TreePanel(shadow, {
      position: options.treePanel.position,
      showProps: options.treePanel.showProps,
      showLineNumbers: options.treePanel.showLineNumbers,
      onSelect(node: ComponentNode) {
        if (node.domElement) {
          highlighter.unhighlightAll();
          highlighter.highlight(node.domElement, 'selected');
          node.domElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        emit('tree-select', node);
      },
      onHover(node: ComponentNode | null) {
        highlighter.unhighlightAll();
        if (node?.domElement) {
          highlighter.highlight(node.domElement, 'hovered');
        }
      },
    });
  }

  function refreshTree(): void {
    if (!treePanel) return;
    const root = document.getElementById('root') ?? document.getElementById('app') ?? document.body;
    const tree = adapter.getComponentTree(root);
    treePanel.updateTree(tree);
  }

  // Build actions list
  function getActions(): InspektAction[] {
    const builtInMap: Record<string, () => InspektAction> = {
      'open-editor': () => createOpenEditorAction(options.serverUrl, options.editor, options.customEditors),
      'copy-path': () => createCopyPathAction(),
      'open-github': () => createOpenGithubAction(options.githubRepo, options.githubBranch),
      'console-log': () => createConsoleLogAction(),
    };

    const result: InspektAction[] = [];
    for (const id of options.actions) {
      const factory = builtInMap[id];
      if (factory) {
        result.push(factory());
      }
    }
    for (const action of customActions.values()) {
      result.push(action);
    }
    return result;
  }

  // Engagement gate. The inspector engages only when the user holds every
  // modifier listed in `options.requireModifiers`. Empty array = always-on.
  // Cmd (meta) on macOS is treated as Ctrl for ergonomic parity.
  function modifiersOk(e: MouseEvent | KeyboardEvent): boolean {
    return options.requireModifiers.every((mod) => {
      switch (mod) {
        case 'ctrl':  return e.ctrlKey || e.metaKey;
        case 'alt':   return e.altKey;
        case 'shift': return e.shiftKey;
        case 'meta':  return e.metaKey;
      }
    });
  }

  // Event handlers
  function handleClick(e: MouseEvent): void {
    if (!enabled) return;

    // Outside-click dismisses a pinned popover. The shadow host re-targets
    // clicks inside the popover to <inspekt-root>, so any other target is
    // "outside".
    const clickTarget = e.target as HTMLElement;
    const isInsideInspekt = clickTarget?.tagName === 'INSPEKT-ROOT';
    if (popover.isPinned() && !isInsideInspekt) {
      popover.unpin();
      popover.hide();
      highlighter.unhighlightAll();
      // fall through — the click might also be a fresh inspect target
    }

    // Shift+Alt+Click = direct open in editor. Global power-user shortcut,
    // independent of the engagement gate.
    if (e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const result = findClosestSource(target);
      if (result) {
        const inspected = elementToInspected(result.element, result.source, options.pathMapping);
        const editorAction = getActions().find((a) => a.id === 'open-editor');
        if (editorAction) editorAction.handler(inspected);
        emit('action', 'open-editor', inspected);
      }
      return;
    }

    // Engagement gate. If the required modifiers aren't held, the click is a
    // real page click — never intercept.
    if (!modifiersOk(e)) return;

    const target = e.target as HTMLElement;
    const result = findClosestSource(target);
    const isFallback = !result && isFallbackTarget(target);

    // Only intercept the click when we have something to inspect; empty
    // clicks (e.g., on the welcome tour's Next button) must pass through.
    if (!result && !isFallback) return;

    e.preventDefault();
    e.stopPropagation();

    if (result) {
      const inspected = elementToInspected(result.element, result.source, options.pathMapping);
      highlighter.unhighlightAll();
      highlighter.highlight(result.element, 'selected');
      popover.show(inspected, getActions(), { x: e.clientX, y: e.clientY });
      popover.pin();
      treePanel?.selectElement(inspected);
      emit('inspect', inspected);
    } else if (isFallback) {
      // DOM-only fallback — no source attrs / fibers, but the user still
      // expects visible feedback on a Standalone session.
      showDomFallback(target, e.clientX, e.clientY);
      popover.pin();
    }
  }

  function showDomFallback(el: HTMLElement, x: number, y: number): void {
    highlighter.unhighlightAll();
    highlighter.highlight(el, 'selected');
    popover.showDom(
      el,
      { x, y },
      async (selector) => copyToClipboard(selector),
      async (html) => copyToClipboard(html),
      () => {
        // eslint-disable-next-line no-console
        console.log('[Inspekt]', el);
      },
    );
  }

  /**
   * Robust clipboard copy. `navigator.clipboard` rejects on:
   *   - non-secure contexts (http://);
   *   - documents that don't have transient activation (we're inside a
   *     capture-phase listener AFTER a stopPropagation — some browsers
   *     consider activation consumed);
   *   - sandboxed/embedded frames without clipboard-write permission.
   * Fall back to the legacy `document.execCommand('copy')` flow which only
   * needs a focused selection.
   */
  async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to execCommand fallback
      }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText =
        'position:fixed;top:-1000px;left:-1000px;opacity:0;pointer-events:none;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    // Toggle shortcut
    if (matchesShortcut(e, options.toggleShortcut)) {
      e.preventDefault();
      instance.toggle();
      return;
    }

    // Escape to close popover
    if (e.key === 'Escape' && popover.isVisible()) {
      popover.unpin();
      popover.hide();
      highlighter.unhighlightAll();
    }

    // Ctrl+Alt+O = toggle overlay
    if (e.key === 'o' && e.ctrlKey && e.altKey) {
      e.preventDefault();
      overlay.toggle();
    }

    // Ctrl+Alt+T = toggle tree panel
    if (e.key === 't' && e.ctrlKey && e.altKey) {
      e.preventDefault();
      if (treePanel) {
        treePanel.toggle();
        if (treePanel.isVisible()) refreshTree();
      }
    }
  }

  function matchesShortcut(e: KeyboardEvent, shortcut: { key: string; modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'> }): boolean {
    if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
    const needCtrl = shortcut.modifiers.includes('ctrl');
    const needAlt = shortcut.modifiers.includes('alt');
    const needShift = shortcut.modifiers.includes('shift');
    const needMeta = shortcut.modifiers.includes('meta');
    return (
      (needCtrl ? e.ctrlKey || e.metaKey : true) &&
      (needAlt ? e.altKey : true) &&
      (needShift ? e.shiftKey : true) &&
      (needMeta ? e.metaKey : true)
    );
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!enabled) return;
    // Pinned popover stays put — no follow-the-cursor.
    if (popover.isPinned()) return;

    // Engagement gate. When the user's modifier choice isn't satisfied,
    // hover does nothing and any previously-shown popover tears down.
    if (!modifiersOk(e)) {
      highlighter.unhighlightAll();
      popover.hide();
      return;
    }

    const target = e.target as HTMLElement;
    const result = findClosestSource(target);
    highlighter.unhighlightAll();
    if (result) {
      highlighter.highlight(result.element, 'selected');
      const inspected = elementToInspected(result.element, result.source, options.pathMapping);
      popover.show(inspected, getActions(), { x: e.clientX, y: e.clientY });
      treePanel?.selectElement(inspected);
      emit('inspect', inspected);
    } else if (isFallbackTarget(target)) {
      showDomFallback(target, e.clientX, e.clientY);
    } else {
      popover.hide();
    }
  }

  function isFallbackTarget(el: HTMLElement | null): el is HTMLElement {
    if (!el) return false;
    if (el === document.body || el === document.documentElement) return false;
    // Inspekt's own shadow host shows up as e.target due to shadow retargeting.
    if (el.tagName === 'INSPEKT-ROOT') return false;
    return true;
  }

  // Event emitter
  function emit(event: string, ...args: unknown[]): void {
    const handlers = listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as Function)(...args);
      }
    }
  }

  function applyTheme(el: HTMLElement, theme: 'light' | 'dark' | 'auto'): void {
    el.classList.remove('inspekt-light', 'inspekt-dark');
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!isDark) el.classList.add('inspekt-light');
    } else if (theme === 'light') {
      el.classList.add('inspekt-light');
    }
  }

  // Listen for theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const themeHandler = () => applyTheme(host, options.theme);
  mediaQuery.addEventListener('change', themeHandler);

  // Listen for settings from Chrome extension
  document.addEventListener('inspekt:settings-update', ((e: CustomEvent) => {
    const newSettings = e.detail;
    Object.assign(options, newSettings);
    if (newSettings.highlight) highlighter.updateConfig(options.highlight);
    applyTheme(host, options.theme);
    if (enabled) {
      if (options.showBoundingBoxes === true) bboxOverlay.enable();
      else bboxOverlay.disable();
    }
  }) as EventListener);

  const instance: InspektInstance = {
    enable() {
      if (enabled) return;
      enabled = true;
      document.body.appendChild(host);
      document.addEventListener('click', handleClick, true);
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('mousemove', handleMouseMove);

      // Signal to Chrome extension
      (window as unknown as Record<string, unknown>).__INSPEKT__ = { version: '0.1.0', options };
      document.dispatchEvent(new CustomEvent('inspekt:status', { detail: { enabled: true } }));

      // Start capability probe: publishes via window.postMessage so the Chrome
      // extension content script can forward to the background and update the
      // toolbar icon. Lives behind a dynamic import so headless / SSR use of
      // @aylith/inspekt-core doesn't pay for it.
      void import('./detection/capability-probe.js').then(({ watchCapabilities }) => {
        if (!enabled) return; // Could have been disabled during the import.
        capabilityTeardown = watchCapabilities({
          serverUrl: options.serverUrl || undefined,
          sourceMapEnabled: options.sourceMapEnabled,
        });
      });

      // Initialize tree panel with current component tree
      if (treePanel && options.treePanel.enabled) {
        // Delay to let the DOM settle after React/Vue renders
        setTimeout(() => refreshTree(), 100);
      }

      // Persistent bounding-box overlay — controlled by the independent
      // `showBoundingBoxes` toggle (no longer tied to any activation mode).
      if (options.showBoundingBoxes) {
        bboxOverlay.enable();
      }

      emit('enable');
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      popover.hide();
      overlay.hide();
      treePanel?.hide();
      bboxOverlay.disable();
      highlighter.unhighlightAll();
      capabilityTeardown?.();
      capabilityTeardown = null;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('mousemove', handleMouseMove);
      host.remove();

      document.dispatchEvent(new CustomEvent('inspekt:status', { detail: { enabled: false } }));
      emit('disable');
    },

    toggle() {
      if (enabled) instance.disable();
      else instance.enable();
    },

    destroy() {
      instance.disable();
      popover.destroy();
      overlay.destroy();
      treePanel?.destroy();
      bboxOverlay.destroy();
      mediaQuery.removeEventListener('change', themeHandler);
      listeners.clear();
      customActions.clear();
      delete (window as unknown as Record<string, unknown>).__INSPEKT__;
    },

    registerAction(action: InspektAction) {
      customActions.set(action.id, action);
    },

    unregisterAction(id: string) {
      customActions.delete(id);
    },

    on<K extends keyof InspektEventMap>(event: K, handler: InspektEventMap[K]) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },

    off<K extends keyof InspektEventMap>(event: K, handler: InspektEventMap[K]) {
      listeners.get(event)?.delete(handler);
    },
  };

  return instance;
}
