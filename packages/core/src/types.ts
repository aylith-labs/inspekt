export interface ShortcutConfig {
  key: string;
  modifiers: Array<'ctrl' | 'alt' | 'shift' | 'meta'>;
}

export interface HighlightConfig {
  color: string;
  style: 'solid' | 'dashed' | 'glow';
  animation: 'pulse' | 'none';
}

export interface BadgeConfig {
  show: boolean;
  position: 'auto' | 'top-left' | 'top-right';
  showPath: boolean;
}

export interface TreePanelConfig {
  enabled: boolean;
  position: 'right' | 'left';
  showProps: boolean;
  showLineNumbers: boolean;
}

export interface InspektOptions {
  /**
   * - `click-mod` — Ctrl+Alt+click (legacy default; less disruptive on real pages)
   * - `click`     — plain click; convenient on demos and programmatic testing
   * - `view`      — passive overlay: every inspectable element gets a labelled bounding box
   * - `hover-mod` — hover with Ctrl+Alt held
   * - `hover`     — hover anywhere
   * - `manual`    — keyboard only (Ctrl+Alt+I to toggle, Shift+Alt+click to open)
   */
  activation: 'click-mod' | 'click' | 'view' | 'hover-mod' | 'hover' | 'manual';
  /** Persistent bounding-box overlay on all inspectable elements. Off by default. */
  showBoundingBoxes: boolean;
  shortcut: ShortcutConfig;
  toggleShortcut: ShortcutConfig;
  theme: 'light' | 'dark' | 'auto';
  highlight: HighlightConfig;
  badge: BadgeConfig;
  borders: boolean;
  actions: string[];
  editor: string;
  editorPathBase: string;
  githubRepo: string;
  githubBranch: string;
  pathMapping: Record<string, string>;
  treePanel: TreePanelConfig;
  sourceAttribute: string;
  serverUrl: string;
  /** Default expansion state for the popover's snippet section. */
  defaultSnippetExpanded: boolean;
  /** Lines of context above/below the target line in the snippet. */
  snippetContext: number;
  /**
   * When true, fetches .map files to resolve snippets when the dev server is
   * unreachable. Default false because the .map fetches are observable in
   * DevTools/proxies and shouldn't happen without user consent.
   */
  sourceMapEnabled: boolean;
  /**
   * Optional pre-baked snippets keyed by `filePath`. Checked first by the
   * snippet resolver — useful for demos / playgrounds where no dev server
   * exists. Each entry supplies `language` and `lines`; `startLine`
   * defaults to 1.
   */
  staticSnippets?: Record<
    string,
    { language: string; lines: string[]; startLine?: number }
  >;
}

export interface SourceSnippet {
  startLine: number;
  endLine: number;
  targetLine: number;
  lines: string[];
  language: string;
  source: 'devserver' | 'sourcemap' | 'fiber';
}

export interface PageCapabilities {
  instrumented: boolean;
  snippetSource: 'devserver' | 'sourcemap' | null;
  serverReachable: boolean;
  sourceMapAvailable: boolean;
  agentConnected: boolean;
}

export interface InspectedElement {
  filePath: string;
  line: number;
  column: number;
  componentName: string;
  rawPath: string;

  domElement: HTMLElement;
  tagName: string;
  classList: string[];
  id: string | null;
  boundingRect: DOMRect;

  ancestors: InspectedElement[];
  children: InspectedElement[];
  props: Record<string, unknown> | null;
  framework: 'react' | 'vue' | 'svelte' | 'solid' | 'unknown';

  /** Populated by snippet-resolver when source is fetchable (Phase 1+). */
  snippet?: SourceSnippet;
  /** User-entered note (Phase 3+). */
  comment?: string;
  /** Detection origin — fiber means we read it via bippy, not a DOM attribute. */
  detectionSource?: 'fiber' | 'attribute';
}

export interface InspektAction {
  id: string;
  label: string;
  icon: string;
  position?: string;
  shortcut?: ShortcutConfig;
  handler: (element: InspectedElement) => void;
}

export type InspektEventMap = {
  inspect: (element: InspectedElement) => void;
  action: (actionId: string, element: InspectedElement) => void;
  enable: () => void;
  disable: () => void;
  'tree-select': (element: InspectedElement) => void;
};

export interface InspektInstance {
  enable(): void;
  disable(): void;
  toggle(): void;
  destroy(): void;
  registerAction(action: InspektAction): void;
  unregisterAction(id: string): void;
  on<K extends keyof InspektEventMap>(event: K, handler: InspektEventMap[K]): void;
  off<K extends keyof InspektEventMap>(event: K, handler: InspektEventMap[K]): void;
}
