import type { InspektAction, InspectedElement, SourceSnippet } from '../types.js';
import { resolveSnippet } from '../snippet/snippet-resolver.js';
import { tokenizeToLines } from '../highlight/prism.js';
import { attachTooltip } from '../components/tooltip.js';

// Inline SVGs reused by the DOM-fallback popover so it shows the same
// icon-button toolbar as the instrumented popover (not bare text labels).
const ICON_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
// Angle brackets — universal "code/markup" glyph. Visually nothing like the
// clipboard outline above, so the two copy buttons can sit next to each other.
const ICON_HTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
const ICON_CONSOLE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
const ICON_INFO = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor" stroke="none"/></svg>`;

export interface PopoverSnippetConfig {
  /** Where the dev-server lives (set by @inspekt/vite at init time). */
  serverUrl?: string;
  /** Lines of context above and below the target line. */
  context: number;
  /** When true, the snippet section is expanded immediately on show(). */
  defaultExpanded: boolean;
  /** When true, attempts source-map fallback if the dev server can't help. */
  sourceMapEnabled: boolean;
  /** Pre-baked snippets indexed by filePath (demos/playgrounds). */
  staticSnippets?: Record<
    string,
    { language: string; lines: string[]; startLine?: number }
  >;
}

const DEFAULT_SNIPPET_CONFIG: PopoverSnippetConfig = {
  context: 5,
  defaultExpanded: false,
  sourceMapEnabled: false,
};

export class Popover {
  private container: HTMLElement;
  private visible = false;
  private pinned = false;
  private snippetConfig: PopoverSnippetConfig = { ...DEFAULT_SNIPPET_CONFIG };

  constructor(private shadowRoot: ShadowRoot) {
    this.container = document.createElement('div');
    this.container.className = 'inspekt-popover';
    this.container.style.display = 'none';
    this.shadowRoot.appendChild(this.container);
  }

  /** Lock the popover in place — hover/move handlers will not reposition or
   *  hide it until {@link unpin} is called. Clicks set this; Escape clears it. */
  pin(): void {
    this.pinned = true;
  }

  unpin(): void {
    this.pinned = false;
  }

  isPinned(): boolean {
    return this.pinned;
  }

  configureSnippet(config: Partial<PopoverSnippetConfig>): void {
    this.snippetConfig = { ...this.snippetConfig, ...config };
  }

  /**
   * Fallback popover for Standalone-on-an-unbuilt-page: no source attrs,
   * no React fibers — so we show DOM info (selector, classes, id) plus a
   * minimal action set. Keeps Inspekt useful as a pure inspection tool.
   */
  showDom(
    domElement: HTMLElement,
    position: { x: number; y: number },
    onCopySelector: (selector: string) => Promise<boolean> | boolean,
    onCopyHtml: (html: string) => Promise<boolean> | boolean,
    onConsoleLog: () => void,
  ): void {
    this.container.innerHTML = '';

    const selector = computeSelector(domElement);

    const header = document.createElement('div');
    header.className = 'inspekt-popover-header';

    // Eyebrow row: "DOM element" + (i) info badge with tooltip explaining
    // why no source data is shown (replaces the old inline paragraph).
    const eyebrow = document.createElement('div');
    eyebrow.className = 'inspekt-popover-path-dir inspekt-popover-path-dir-row';
    const eyebrowText = document.createElement('span');
    eyebrowText.textContent = 'DOM element';
    eyebrow.appendChild(eyebrowText);

    const infoBadge = document.createElement('span');
    infoBadge.className = 'inspekt-info-badge';
    infoBadge.setAttribute('tabindex', '0');
    infoBadge.setAttribute('aria-label', 'Why no source data?');
    infoBadge.innerHTML = `${ICON_INFO}<span class="inspekt-info-badge-label">No source</span>`;
    attachTooltip(
      infoBadge,
      'No Inspekt source data on this page. Build with the Inspekt plugin (Vite, Webpack, Rspack, esbuild) to get editor-jump and file paths.',
      { root: this.shadowRoot as unknown as HTMLElement, enterDelay: 100 },
    );
    eyebrow.appendChild(infoBadge);

    const sel = document.createElement('div');
    sel.className = 'inspekt-popover-path-file';
    sel.textContent = selector;

    header.appendChild(eyebrow);
    header.appendChild(sel);
    this.container.appendChild(header);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'inspekt-popover-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'inspekt-popover-action';
    copyBtn.setAttribute('aria-label', 'Copy CSS selector');
    copyBtn.innerHTML = ICON_COPY;
    attachTooltip(copyBtn, 'Copy CSS selector', {
      root: this.shadowRoot as unknown as HTMLElement,
    });
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await onCopySelector(selector);
      this.showToast(ok ? 'Copied' : 'Copy failed');
      // Keep the popover up briefly so the toast is visible.
      setTimeout(() => this.hide(), 700);
    });
    actionsBar.appendChild(copyBtn);

    // Copy HTML — distinguishable from Copy selector by the angle-brackets icon.
    const htmlBtn = document.createElement('button');
    htmlBtn.className = 'inspekt-popover-action';
    htmlBtn.setAttribute('aria-label', 'Copy HTML');
    htmlBtn.innerHTML = ICON_HTML;
    attachTooltip(htmlBtn, 'Copy HTML (outerHTML)', {
      root: this.shadowRoot as unknown as HTMLElement,
    });
    htmlBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Capture outerHTML at click time so it reflects the live DOM.
      const ok = await onCopyHtml(domElement.outerHTML);
      this.showToast(ok ? 'HTML copied' : 'Copy failed');
      setTimeout(() => this.hide(), 700);
    });
    actionsBar.appendChild(htmlBtn);

    const logBtn = document.createElement('button');
    logBtn.className = 'inspekt-popover-action';
    logBtn.setAttribute('aria-label', 'console.log this element');
    logBtn.innerHTML = ICON_CONSOLE;
    attachTooltip(logBtn, 'console.log this element', {
      root: this.shadowRoot as unknown as HTMLElement,
    });
    logBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onConsoleLog();
      this.showToast('Logged to console');
      setTimeout(() => this.hide(), 700);
    });
    actionsBar.appendChild(logBtn);

    this.container.appendChild(actionsBar);

    this.positionAt(position.x, position.y);
    this.container.style.display = 'block';
    this.visible = true;
  }

  /** Brief feedback toast attached to the shadow root. */
  private showToast(message: string): void {
    const existing = this.shadowRoot.querySelector('.inspekt-popover-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'inspekt-popover-toast';
    toast.textContent = message;
    this.shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 1200);
  }

  show(element: InspectedElement, actions: InspektAction[], position: { x: number; y: number }): void {
    this.container.innerHTML = '';

    // Header: file path + line
    const header = document.createElement('div');
    header.className = 'inspekt-popover-header';

    const pathDir = document.createElement('div');
    pathDir.className = 'inspekt-popover-path-dir';
    const parts = element.filePath.split('/');
    pathDir.textContent = parts.slice(0, -1).join('/') + '/';

    const pathFile = document.createElement('div');
    pathFile.className = 'inspekt-popover-path-file';
    pathFile.textContent = `${parts[parts.length - 1]}:${element.line}`;

    header.appendChild(pathDir);
    header.appendChild(pathFile);
    this.container.appendChild(header);

    // Snippet section (between header and actions for visual hierarchy).
    const snippetSection = this.buildSnippetSection(element);
    this.container.appendChild(snippetSection);

    // Actions bar
    const actionsBar = document.createElement('div');
    actionsBar.className = 'inspekt-popover-actions';

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = 'inspekt-popover-action';
      btn.setAttribute('aria-label', action.label);
      btn.innerHTML = action.icon;
      attachTooltip(btn, action.label, {
        root: this.shadowRoot as unknown as HTMLElement,
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        action.handler(element);
        this.hide();
      });
      actionsBar.appendChild(btn);
    }

    this.container.appendChild(actionsBar);

    // Position the popover
    this.positionAt(position.x, position.y);
    this.container.style.display = 'block';
    this.visible = true;
  }

  private buildSnippetSection(element: InspectedElement): HTMLElement {
    const section = document.createElement('div');
    section.className = 'inspekt-snippet';
    // Stay hidden until we know a snippet actually resolves. Avoids the
    // "Show source" toggle that then reveals a useless error message.
    section.hidden = true;
    const initialState = this.snippetConfig.defaultExpanded ? 'expanded' : 'collapsed';
    section.dataset['state'] = initialState;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'inspekt-snippet-toggle';
    toggle.textContent =
      initialState === 'collapsed' ? 'Show source ▾' : 'Hide source ▴';

    const body = document.createElement('div');
    body.className = 'inspekt-snippet-body';
    if (initialState === 'collapsed') body.hidden = true;

    section.appendChild(toggle);
    section.appendChild(body);

    void this.resolveAndMountSnippet(section, toggle, body, element, initialState);

    return section;
  }

  private async resolveAndMountSnippet(
    section: HTMLElement,
    toggle: HTMLButtonElement,
    body: HTMLElement,
    element: InspectedElement,
    initialState: 'expanded' | 'collapsed',
  ): Promise<void> {
    const snippet = await resolveSnippet({
      filePath: element.filePath,
      line: element.line,
      serverUrl: this.snippetConfig.serverUrl,
      context: this.snippetConfig.context,
      sourceMapEnabled: this.snippetConfig.sourceMapEnabled,
      staticSnippets: this.snippetConfig.staticSnippets,
    });
    if (!snippet) {
      // No dev server, no source map — drop the section entirely so the
      // popover doesn't surface a dead "Show source" affordance.
      section.remove();
      return;
    }
    element.snippet = snippet;
    section.hidden = false;

    let rendered = false;
    const expand = (): void => {
      section.dataset['state'] = 'expanded';
      // Mirror data-state on the body so the 1.5×-width CSS rule has a target.
      body.dataset['state'] = 'expanded';
      body.hidden = false;
      toggle.textContent = 'Hide source ▴';
      if (!rendered) {
        rendered = true;
        body.innerHTML = '';
        body.appendChild(this.renderSnippet(snippet));
      }
      // Center the target line in the snippet body after layout settles.
      requestAnimationFrame(() => {
        const target = body.querySelector<HTMLElement>('.inspekt-line-target');
        target?.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
    };
    const collapse = (): void => {
      section.dataset['state'] = 'collapsed';
      body.dataset['state'] = 'collapsed';
      body.hidden = true;
      toggle.textContent = 'Show source ▾';
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (section.dataset['state'] === 'collapsed') expand();
      else collapse();
    });

    if (initialState === 'expanded') expand();
  }

  private renderSnippet(snippet: SourceSnippet): HTMLElement {
    const pre = document.createElement('pre');
    pre.className = 'inspekt-snippet-pre';
    pre.dataset['language'] = snippet.language;

    // Tokenize the whole snippet, then walk per source line so we keep the
    // line-number gutter and target-line marker. (Prism would otherwise hand
    // back a single HTML blob.)
    const highlighted = tokenizeToLines(snippet.lines.join('\n'), snippet.language);

    snippet.lines.forEach((rawText, index) => {
      const lineNumber = snippet.startLine + index;
      const isTarget = lineNumber === snippet.targetLine;

      const lineEl = document.createElement('span');
      lineEl.className = isTarget ? 'inspekt-line inspekt-line-target' : 'inspekt-line';

      const num = document.createElement('span');
      num.className = 'inspekt-line-no';
      num.textContent = String(lineNumber);
      lineEl.appendChild(num);

      const code = document.createElement('span');
      code.className = 'inspekt-line-code';
      const tokens = highlighted[index]?.tokens;
      if (!tokens || tokens.length === 0) {
        // Empty line or tokenization fallback.
        code.textContent = rawText;
      } else {
        for (const tok of tokens) {
          if (!tok.type) {
            code.appendChild(document.createTextNode(tok.text));
          } else {
            const span = document.createElement('span');
            // Prism class convention: "token <type> <subtype …>"
            span.className = `token ${tok.type}`;
            span.textContent = tok.text;
            code.appendChild(span);
          }
        }
      }
      lineEl.appendChild(code);

      pre.appendChild(lineEl);
      pre.appendChild(document.createTextNode('\n'));
    });

    return pre;
  }

  hide(): void {
    this.container.style.display = 'none';
    this.visible = false;
    this.pinned = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private positionAt(x: number, y: number): void {
    const padding = 8;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    // Temporarily show to measure
    this.container.style.display = 'block';
    this.container.style.left = '0px';
    this.container.style.top = '0px';
    const rect = this.container.getBoundingClientRect();

    let left = x;
    let top = y + 10; // Below cursor

    // Flip horizontal if overflowing right
    if (left + rect.width + padding > vpWidth) {
      left = vpWidth - rect.width - padding;
    }
    if (left < padding) left = padding;

    // Flip vertical if overflowing bottom
    if (top + rect.height + padding > vpHeight) {
      top = y - rect.height - 10; // Above cursor
    }
    if (top < padding) top = padding;

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  destroy(): void {
    this.container.remove();
  }
}

// Short, human-readable selector for the DOM-only popover. Prefers id, then
// tag + first 2 classes — not a uniqueness-guaranteed locator.
function computeSelector(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const classes = Array.from(el.classList).slice(0, 2);
  if (classes.length) return `${tag}.${classes.join('.')}`;
  return tag;
}
