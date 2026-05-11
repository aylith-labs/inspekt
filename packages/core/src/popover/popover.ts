import type { InspektAction, InspectedElement, SourceSnippet } from '../types.js';
import { resolveSnippet } from '../snippet/snippet-resolver.js';

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
  private snippetConfig: PopoverSnippetConfig = { ...DEFAULT_SNIPPET_CONFIG };

  constructor(private shadowRoot: ShadowRoot) {
    this.container = document.createElement('div');
    this.container.className = 'inspekt-popover';
    this.container.style.display = 'none';
    this.shadowRoot.appendChild(this.container);
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
    onCopySelector: (selector: string) => void,
    onConsoleLog: () => void,
  ): void {
    this.container.innerHTML = '';

    const selector = computeSelector(domElement);

    const header = document.createElement('div');
    header.className = 'inspekt-popover-header';

    const tagLine = document.createElement('div');
    tagLine.className = 'inspekt-popover-path-dir';
    tagLine.textContent = 'DOM element';

    const sel = document.createElement('div');
    sel.className = 'inspekt-popover-path-file';
    sel.textContent = selector;

    header.appendChild(tagLine);
    header.appendChild(sel);
    this.container.appendChild(header);

    const note = document.createElement('div');
    note.className = 'inspekt-snippet-empty';
    note.style.padding = '10px 12px';
    note.textContent =
      'No Inspekt source data on this page. Build with the Inspekt plugin for editor-jump and file paths.';
    this.container.appendChild(note);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'inspekt-popover-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'inspekt-popover-action';
    copyBtn.title = 'Copy CSS selector';
    copyBtn.textContent = 'Copy selector';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onCopySelector(selector);
      this.hide();
    });
    actionsBar.appendChild(copyBtn);

    const logBtn = document.createElement('button');
    logBtn.className = 'inspekt-popover-action';
    logBtn.title = 'console.log this element';
    logBtn.textContent = 'console.log';
    logBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onConsoleLog();
      this.hide();
    });
    actionsBar.appendChild(logBtn);

    this.container.appendChild(actionsBar);

    this.positionAt(position.x, position.y);
    this.container.style.display = 'block';
    this.visible = true;
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
      btn.title = action.label;
      btn.innerHTML = action.icon;
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
      body.hidden = false;
      toggle.textContent = 'Hide source ▴';
      if (!rendered) {
        rendered = true;
        body.innerHTML = '';
        body.appendChild(this.renderSnippet(snippet));
      }
    };
    const collapse = (): void => {
      section.dataset['state'] = 'collapsed';
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

    snippet.lines.forEach((text, index) => {
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
      // textContent — never innerHTML, no syntax highlighting yet.
      code.textContent = text;
      lineEl.appendChild(code);

      pre.appendChild(lineEl);
      pre.appendChild(document.createTextNode('\n'));
    });

    return pre;
  }

  hide(): void {
    this.container.style.display = 'none';
    this.visible = false;
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
