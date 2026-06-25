export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * A user-defined editor. Appears in the Editor picker's "Custom" group.
 * Stored in chrome.storage.sync so the entry travels with the user.
 */
export interface CustomEditor {
  /** Storage key. Must match /^[a-z][a-z0-9-]*$/i. Used as settings.editor. */
  value: string;
  /** Display name in the dropdown. */
  label: string;
  /**
   * URL template expanded at "Open in editor" time. Placeholders:
   *   {file}   → absolute file path (URL-encoded automatically)
   *   {line}   → 1-based line number
   *   {column} → 1-based column number
   * Example: `txmt://open?url=file://{file}&line={line}&column={column}`
   */
  urlTemplate: string;
  /** Optional vendor homepage URL surfaced in the side popover. */
  homepage?: string;
}

export interface InspektSettings {
  enabled: boolean;
  editor: string;
  /**
   * Modifier keys that must be held for the inspector to engage (highlight on
   * hover / pin on click). Empty array → always-on (plain hover engages).
   */
  requireModifiers: ModifierKey[];
  showBoundingBoxes: boolean;
  theme: 'light' | 'dark' | 'auto';
  highlightColor: string;
  highlightStyle: 'solid' | 'dashed' | 'glow';
  animation: 'pulse' | 'none';
  treePanelEnabled: boolean;
  treePanelPosition: 'left' | 'right';
  showProps: boolean;
  showLineNumbers: boolean;
  enabledActions: string[];
  siteOverrides: Record<string, Partial<InspektSettings>>;
  pathMappings: Record<string, Record<string, string>>;
  githubDefaults: Record<string, { repo: string; branch: string }>;
  popupIntroSeen: boolean;
  /** Default expansion state for the popover's snippet section. */
  defaultSnippetExpanded: boolean;
  /** Lines of context above/below the target line. Clamped to 0..30 by the server. */
  snippetContext: number;
  /** Token used to authenticate against the local daemon. Set by `npx inspekt setup`. */
  inspektToken: string;
  /** Daemon HTTP base URL (default http://127.0.0.1:5678). */
  agentEndpoint: string;
  /** Currently selected agent for "Send to Agent" — informational; daemon routes to all. */
  selectedAgent: 'claude-code' | 'cursor' | 'codex' | 'gemini-cli' | 'antigravity' | null;
  /** Opt-in: fetch .map files when dev server is unreachable. Default false. */
  sourceMapEnabled: boolean;
  /** User-defined editors (Custom group at the bottom of the picker). */
  customEditors: CustomEditor[];
}

const DEFAULTS: InspektSettings = {
  enabled: true,
  editor: 'cursor',
  // Default preserves the old `click-mod` behavior: page interactions are
  // never intercepted unless the user is holding Ctrl+Alt. Empty array =
  // always-on hover; the user opts in via the options-page checkboxes.
  requireModifiers: ['ctrl', 'alt'],
  showBoundingBoxes: false,
  theme: 'auto',
  highlightColor: '#3b82f6',
  highlightStyle: 'glow',
  animation: 'pulse',
  treePanelEnabled: true,
  treePanelPosition: 'right',
  showProps: true,
  showLineNumbers: true,
  enabledActions: ['open-editor', 'copy-path', 'open-github', 'console-log'],
  siteOverrides: {},
  pathMappings: {},
  githubDefaults: {},
  popupIntroSeen: false,
  defaultSnippetExpanded: false,
  snippetContext: 5,
  inspektToken: '',
  agentEndpoint: 'http://127.0.0.1:5678',
  selectedAgent: null,
  sourceMapEnabled: false,
  customEditors: [],
};

export async function getSettings(): Promise<InspektSettings> {
  const result = await chrome.storage.sync.get(DEFAULTS);
  return migrate(result as Record<string, unknown>);
}

/**
 * Read-side schema migration. Old installs may have `activation: 'click-mod'`
 * etc. in `chrome.storage.sync`; map those to the new `requireModifiers`
 * model (and turn on `showBoundingBoxes` for users who chose `'view'`).
 *
 * Applied on every read — cheap, no I/O. We never write back to storage from
 * here; users implicitly migrate the first time the options page calls
 * `updateSettings` (which omits `activation`).
 */
function migrate(raw: Record<string, unknown>): InspektSettings {
  const oldActivation = typeof raw['activation'] === 'string' ? (raw['activation'] as string) : null;
  if (oldActivation && !Array.isArray(raw['requireModifiers'])) {
    const map: Record<string, ModifierKey[]> = {
      'click-mod': ['ctrl', 'alt'],
      'hover-mod': ['ctrl', 'alt'],
      'click':     [],
      'hover':     [],
      'view':      ['ctrl', 'alt'],
      'manual':    ['ctrl', 'alt', 'shift'],
    };
    raw['requireModifiers'] = map[oldActivation] ?? ['ctrl', 'alt'];
    if (oldActivation === 'view') raw['showBoundingBoxes'] = true;
  }
  delete raw['activation'];
  return raw as unknown as InspektSettings;
}

export async function updateSettings(updates: Partial<InspektSettings>): Promise<void> {
  await chrome.storage.sync.set(updates);
}

export async function getSiteSettings(url: string): Promise<InspektSettings> {
  const settings = await getSettings();
  const hostname = new URL(url).hostname;

  // Find matching site override
  for (const [pattern, overrides] of Object.entries(settings.siteOverrides)) {
    if (matchPattern(hostname, pattern)) {
      return { ...settings, ...overrides };
    }
  }

  return settings;
}

function matchPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    return hostname.endsWith(pattern.slice(1)) || hostname === pattern.slice(2);
  }
  return hostname === pattern || hostname.includes(pattern);
}

export async function exportSettings(): Promise<string> {
  const settings = await getSettings();
  return JSON.stringify(settings, null, 2);
}

export async function importSettings(json: string): Promise<void> {
  const settings = JSON.parse(json) as Partial<InspektSettings>;
  await updateSettings(settings);
}
