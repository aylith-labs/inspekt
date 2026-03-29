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

export interface DevLensOptions {
  activation: 'click' | 'hover' | 'manual';
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
}

export interface DevLensAction {
  id: string;
  label: string;
  icon: string;
  position?: string;
  shortcut?: ShortcutConfig;
  handler: (element: InspectedElement) => void;
}

export type DevLensEventMap = {
  inspect: (element: InspectedElement) => void;
  action: (actionId: string, element: InspectedElement) => void;
  enable: () => void;
  disable: () => void;
  'tree-select': (element: InspectedElement) => void;
};

export interface DevLensInstance {
  enable(): void;
  disable(): void;
  toggle(): void;
  destroy(): void;
  registerAction(action: DevLensAction): void;
  unregisterAction(id: string): void;
  on<K extends keyof DevLensEventMap>(event: K, handler: DevLensEventMap[K]): void;
  off<K extends keyof DevLensEventMap>(event: K, handler: DevLensEventMap[K]): void;
}
