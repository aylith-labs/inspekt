import type {
  InspektOptions,
  InspektInstance,
  InspektAction,
  InspektEventMap,
  InspectedElement,
} from './types.js';
import { findClosestSource, elementToInspected } from './detection/source-detector.js';
import { Highlighter } from './highlight/highlighter.js';
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

const DEFAULT_OPTIONS: InspektOptions = {
  activation: 'click',
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
  sourceAttribute: 'data-inspekt-path',
  serverUrl: '',
};

export function createInspekt(userOptions: Partial<InspektOptions> = {}): InspektInstance {
  const options: InspektOptions = { ...DEFAULT_OPTIONS, ...userOptions };

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
  const overlay = new Overlay(shadow);
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
      'open-editor': () => createOpenEditorAction(options.serverUrl, options.editor),
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

  // Event handlers
  function handleClick(e: MouseEvent): void {
    if (!enabled) return;

    const modifiers = options.shortcut.modifiers;
    const needCtrl = modifiers.includes('ctrl') || modifiers.includes('meta');
    const needAlt = modifiers.includes('alt');
    const needShift = modifiers.includes('shift');

    const ctrlOk = !needCtrl || e.ctrlKey || e.metaKey;
    const altOk = !needAlt || e.altKey;
    const shiftOk = !needShift || e.shiftKey;

    // Shift+Alt+Click = direct open in editor
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

    if (ctrlOk && altOk && shiftOk && options.shortcut.key === 'click') {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      const result = findClosestSource(target);

      if (result) {
        const inspected = elementToInspected(result.element, result.source, options.pathMapping);
        highlighter.unhighlightAll();
        highlighter.highlight(result.element, 'selected');
        popover.show(inspected, getActions(), { x: e.clientX, y: e.clientY });
        treePanel?.selectElement(inspected);
        emit('inspect', inspected);
      }
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
    if (options.activation === 'hover-mod') {
      // Hover with Ctrl+Alt held — highlight + popover
      if (!((e.ctrlKey || e.metaKey) && e.altKey)) {
        highlighter.unhighlightAll();
        popover.hide();
        return;
      }
    } else if (options.activation !== 'hover') {
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
    } else {
      popover.hide();
    }
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

      // Initialize tree panel with current component tree
      if (treePanel && options.treePanel.enabled) {
        // Delay to let the DOM settle after React/Vue renders
        setTimeout(() => refreshTree(), 100);
      }

      emit('enable');
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      popover.hide();
      overlay.hide();
      treePanel?.hide();
      highlighter.unhighlightAll();
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
