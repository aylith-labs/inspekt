export interface InspektSettings {
  enabled: boolean;
  editor: string;
  activation: 'click' | 'hover-mod' | 'hover' | 'manual';
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
}

const DEFAULTS: InspektSettings = {
  enabled: true,
  editor: 'cursor',
  activation: 'click',
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
};

export async function getSettings(): Promise<InspektSettings> {
  const result = await chrome.storage.sync.get(DEFAULTS);
  return result as InspektSettings;
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
