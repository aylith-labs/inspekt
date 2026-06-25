/**
 * Shared item array for the Editor rich-select dropdown.
 *
 * Used by both the options page (full settings) and the welcome page editor
 * picker. The Mode/Activation dropdown was removed in 0.7.0 in favour of
 * modifier checkboxes on the options page.
 *
 * Per-row popover renders real site metadata (title / description / OG image)
 * pre-fetched at build time into `editor-metadata.json` via
 * `scripts/fetch-editor-metadata.mjs`.
 */
import type { RichSelectItem } from '@inspekt/core';
import type { CustomEditor } from './storage.js';
import metadata from './editor-metadata.json' with { type: 'json' };

type EditorMetadata = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  favicon: string | null;
  image: string | null;
} | null;

const METADATA = metadata as Record<string, EditorMetadata>;

interface EditorMeta {
  value: string;
  label: string;
  /**
   * Local filename relative to `icons/editors/`. Optional — when missing or
   * the file 404s, RichSelect renders a letter-tile fallback. Used for very
   * new editors whose vendor sites are SPAs and don't serve a real favicon
   * file at the canonical path.
   */
  icon?: string;
  url: string;
  group: string;
  /**
   * True when the URL scheme is inferred from VS Code fork conventions
   * rather than vendor-documented. The popover surfaces a small caption
   * so users know to test before relying on it.
   */
  unverified?: boolean;
}

const EDITOR_META: EditorMeta[] = [
  // AI editors --------------------------------------------------------------
  { value: 'cursor',          label: 'Cursor',           icon: 'cursor.png',           url: 'https://www.cursor.com/',                  group: 'AI editors' },
  { value: 'windsurf',        label: 'Windsurf',         icon: 'windsurf.svg',         url: 'https://windsurf.com/',                    group: 'AI editors' },
  { value: 'trae',            label: 'Trae',                                            url: 'https://www.trae.ai/',                      group: 'AI editors', unverified: true },
  { value: 'kiro',            label: 'Kiro',             icon: 'kiro.ico',             url: 'https://kiro.dev/',                         group: 'AI editors' },
  { value: 'antigravity',     label: 'Antigravity',                                     url: 'https://antigravity.google/',               group: 'AI editors', unverified: true },
  { value: 'pearai',          label: 'PearAI',                                          url: 'https://trypear.ai/',                       group: 'AI editors' },
  { value: 'qoder',           label: 'Qoder',                                           url: 'https://qoder.com/',                        group: 'AI editors', unverified: true },
  { value: 'codebuddy',       label: 'CodeBuddy',                                       url: 'https://copilot.tencent.com/',              group: 'AI editors', unverified: true },

  // VS Code family ----------------------------------------------------------
  { value: 'vscode',          label: 'VS Code',          icon: 'vscode.png',           url: 'https://code.visualstudio.com/',           group: 'VS Code family' },
  { value: 'vscode-insiders', label: 'VS Code Insiders', icon: 'vscode-insiders.png',  url: 'https://code.visualstudio.com/insiders/',  group: 'VS Code family' },
  { value: 'vscodium',        label: 'VSCodium',         icon: 'vscodium.svg',         url: 'https://vscodium.com/',                    group: 'VS Code family' },

  // JetBrains ---------------------------------------------------------------
  { value: 'idea',            label: 'IntelliJ IDEA',    icon: 'idea.svg',             url: 'https://www.jetbrains.com/idea/',          group: 'JetBrains' },
  { value: 'webstorm',        label: 'WebStorm',         icon: 'webstorm.svg',         url: 'https://www.jetbrains.com/webstorm/',      group: 'JetBrains' },
  { value: 'phpstorm',        label: 'PhpStorm',         icon: 'phpstorm.svg',         url: 'https://www.jetbrains.com/phpstorm/',      group: 'JetBrains' },
  { value: 'pycharm',         label: 'PyCharm',          icon: 'pycharm.svg',          url: 'https://www.jetbrains.com/pycharm/',       group: 'JetBrains' },
  { value: 'rubymine',        label: 'RubyMine',         icon: 'rubymine.svg',         url: 'https://www.jetbrains.com/ruby/',          group: 'JetBrains' },
  { value: 'goland',          label: 'GoLand',           icon: 'goland.svg',           url: 'https://www.jetbrains.com/go/',            group: 'JetBrains' },
  { value: 'clion',           label: 'CLion',            icon: 'clion.svg',            url: 'https://www.jetbrains.com/clion/',         group: 'JetBrains' },
  { value: 'rider',           label: 'Rider',            icon: 'rider.svg',            url: 'https://www.jetbrains.com/rider/',         group: 'JetBrains' },

  // Other -------------------------------------------------------------------
  { value: 'sublime',         label: 'Sublime Text',     icon: 'sublime.svg',          url: 'https://www.sublimetext.com/',             group: 'Other' },
  { value: 'zed',             label: 'Zed',              icon: 'zed.svg',              url: 'https://zed.dev/',                          group: 'Other' },
];

/** Hot-linked URLs pass through; bundled assets resolve via the extension's
 *  own URL so the path works on any extension page. */
function resolveAsset(p: string | null | undefined): string | null {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return chrome.runtime.getURL(p);
}

function makeEditorPopover(meta: EditorMeta, _iconBasePath: string): () => HTMLElement {
  return () => {
    const data = METADATA[meta.value] ?? null;
    const hostname = new URL(meta.url).hostname.replace(/^www\./, '');

    // The entire card is one link — clicking anywhere visits the editor's
    // homepage. CSS animates the trailing arrow rightward on hover to
    // signal the affordance.
    const a = document.createElement('a');
    a.className = 'inspekt-rs-popover';
    a.href = meta.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    // Keep the rich-tooltip alive when the user clicks (don't propagate to
    // the row's click handler which would select the editor).
    a.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const linkRow = document.createElement('div');
    linkRow.className = 'inspekt-rs-popover-link';
    const linkText = document.createElement('span');
    linkText.textContent = `Visit ${hostname}`;
    const arrow = document.createElement('span');
    arrow.className = 'inspekt-rs-popover-arrow';
    arrow.textContent = '→';
    linkRow.appendChild(linkText);
    linkRow.appendChild(arrow);
    a.appendChild(linkRow);

    if (meta.unverified) {
      const tag = document.createElement('div');
      tag.className = 'inspekt-rs-popover-unverified';
      tag.textContent = 'URL scheme inferred — test before relying on it.';
      a.appendChild(tag);
    }

    if (data && (data.title || data.description || data.image)) {
      const meta = document.createElement('div');
      meta.className = 'inspekt-rs-popover-meta';

      if (data.favicon || data.siteName) {
        const header = document.createElement('div');
        header.className = 'inspekt-rs-popover-meta-header';
        if (data.favicon) {
          const fav = document.createElement('img');
          fav.className = 'inspekt-rs-popover-favicon';
          fav.src = resolveAsset(data.favicon) ?? '';
          fav.alt = '';
          fav.referrerPolicy = 'no-referrer';
          fav.crossOrigin = 'anonymous';
          header.appendChild(fav);
        }
        if (data.siteName) {
          const site = document.createElement('span');
          site.textContent = data.siteName;
          header.appendChild(site);
        }
        meta.appendChild(header);
      }

      if (data.title) {
        const t = document.createElement('div');
        t.className = 'inspekt-rs-popover-meta-title';
        t.textContent = data.title;
        meta.appendChild(t);
      }

      if (data.description) {
        const d = document.createElement('div');
        d.className = 'inspekt-rs-popover-meta-description';
        d.textContent = data.description;
        meta.appendChild(d);
      }

      if (data.image) {
        const img = document.createElement('img');
        img.className = 'inspekt-rs-popover-meta-image';
        img.src = resolveAsset(data.image) ?? '';
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.crossOrigin = 'anonymous';
        img.loading = 'lazy';
        meta.appendChild(img);
      }

      a.appendChild(meta);
    }

    return a;
  };
}

/**
 * Build editor items.
 *
 * @param iconBasePath path prefix for icons. The options/welcome pages are at
 *   `options/options.html` and `welcome/welcome.html` respectively, so the
 *   icons directory is one level up.
 */
export interface CustomEditorCallbacks {
  /** Invoked when the "+ Add custom editor" action row is clicked. */
  onAddCustom?: () => void;
  /** Invoked when the Delete button in a custom row's side popover is clicked. */
  onDeleteCustom?: (value: string) => void;
}

export function buildEditorItems(
  iconBasePath = '../icons/editors',
  customEditors: CustomEditor[] = [],
  callbacks: CustomEditorCallbacks = {},
): RichSelectItem<string>[] {
  const builtIns = EDITOR_META.map((m) => ({
    value: m.value,
    label: m.label,
    // Letter-tile fallback engages when icon is missing — used for the very
    // new editors (Trae, Antigravity, Qoder, etc.) whose vendor sites don't
    // serve a real favicon at the canonical path.
    icon: m.icon ? `${iconBasePath}/${m.icon}` : undefined,
    group: m.group,
    popover: makeEditorPopover(m, iconBasePath),
  }));
  const custom = customEditors.map<RichSelectItem<string>>((c) => ({
    value: c.value,
    label: c.label,
    // No bundled icons for user-defined editors — letter-tile carries it.
    group: 'Custom',
    popover: makeCustomEditorPopover(c, callbacks.onDeleteCustom),
  }));
  // Trailing pseudo-row in the Custom group — opens the add-editor modal.
  const addRow: RichSelectItem<string> = {
    value: '__add-custom__',
    label: '+ Add custom editor',
    group: 'Custom',
    action: callbacks.onAddCustom ?? (() => {}),
  };
  return [...builtIns, ...custom, addRow];
}

function makeCustomEditorPopover(
  c: CustomEditor,
  onDelete?: (value: string) => void,
): () => HTMLElement {
  return () => {
    const root = document.createElement('div');
    root.className = 'inspekt-rs-popover';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'inspekt-rs-popover-link';
    const eyebrowText = document.createElement('span');
    eyebrowText.textContent = c.homepage
      ? `Visit ${new URL(c.homepage).hostname.replace(/^www\./, '')}`
      : 'Custom editor';
    const arrow = document.createElement('span');
    arrow.className = 'inspekt-rs-popover-arrow';
    arrow.textContent = c.homepage ? '→' : '';
    eyebrow.appendChild(eyebrowText);
    eyebrow.appendChild(arrow);

    const body = document.createElement('div');
    body.className = 'inspekt-rs-popover-meta';

    const label = document.createElement('div');
    label.className = 'inspekt-rs-popover-meta-title';
    label.textContent = c.label;
    body.appendChild(label);

    const tpl = document.createElement('code');
    tpl.className = 'inspekt-custom-url-template';
    tpl.textContent = c.urlTemplate;
    body.appendChild(tpl);

    // Wrap eyebrow + body in an anchor when there's a homepage so the whole
    // card is one link (consistent with the built-in editor popovers).
    let wrap: HTMLElement;
    if (c.homepage) {
      const a = document.createElement('a');
      a.className = root.className;
      a.href = c.homepage;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      // Don't bubble the click to the row's select handler.
      a.addEventListener('click', (e) => e.stopPropagation());
      a.appendChild(eyebrow);
      a.appendChild(body);
      wrap = a;
    } else {
      root.appendChild(eyebrow);
      root.appendChild(body);
      wrap = root;
    }

    // Per-row Delete button — always appended OUTSIDE the link wrapper so
    // clicking it doesn't navigate to the homepage.
    if (onDelete) {
      // Promote to a container so the link card + delete button can coexist.
      const container = document.createElement('div');
      container.className = 'inspekt-rs-popover-custom-container';
      container.appendChild(wrap);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'inspekt-rs-popover-delete';
      delBtn.textContent = 'Delete this custom editor';
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(c.value);
      });
      container.appendChild(delBtn);
      return container;
    }

    return wrap;
  };
}

/**
 * Emit `<optgroup>`-flavoured option HTML for the popup and welcome page
 * native `<select>`s. Single source of truth — when EDITOR_META grows here,
 * the popup and welcome editor pickers grow automatically.
 */
export function buildEditorOptgroupHtml(customEditors: CustomEditor[] = []): string {
  const groups = new Map<string, EditorMeta[]>();
  for (const m of EDITOR_META) {
    const arr = groups.get(m.group) ?? [];
    arr.push(m);
    groups.set(m.group, arr);
  }
  const out: string[] = [];
  for (const [groupName, items] of groups) {
    out.push(`<optgroup label="${escapeAttr(groupName)}">`);
    for (const m of items) {
      const label = m.unverified ? `${m.label} (unverified)` : m.label;
      out.push(`<option value="${escapeAttr(m.value)}">${escapeAttr(label)}</option>`);
    }
    out.push(`</optgroup>`);
  }
  // Custom group always last; hidden when empty.
  if (customEditors.length > 0) {
    out.push(`<optgroup label="Custom">`);
    for (const c of customEditors) {
      out.push(`<option value="${escapeAttr(c.value)}">${escapeAttr(c.label)}</option>`);
    }
    out.push(`</optgroup>`);
  }
  return out.join('');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
