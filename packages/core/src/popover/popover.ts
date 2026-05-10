import type { InspektAction, InspectedElement, SourceSnippet } from '../types.js';
import { resolveSnippet } from '../snippet/snippet-resolver.js';

export interface PopoverSnippetConfig {
  /** Where the dev-server lives (set by @inspekt/vite at init time). */
  serverUrl?: string;
  /** Lines of context above and below the target line. */
  context: number;
  /** When true, the snippet section is expanded immediately on show(). */
  defaultExpanded: boolean;
}

const DEFAULT_SNIPPET_CONFIG: PopoverSnippetConfig = {
  context: 5,
  defaultExpanded: false,
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

    let loaded = false;
    const expand = () => {
      section.dataset['state'] = 'expanded';
      body.hidden = false;
      toggle.textContent = 'Hide source ▴';
      if (!loaded) {
        loaded = true;
        this.loadSnippetInto(body, element);
      }
    };
    const collapse = () => {
      section.dataset['state'] = 'collapsed';
      body.hidden = true;
      toggle.textContent = 'Show source ▾';
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (section.dataset['state'] === 'collapsed') expand();
      else collapse();
    });

    section.appendChild(toggle);
    section.appendChild(body);

    if (initialState === 'expanded') {
      // Auto-expand fires the load.
      loaded = true;
      this.loadSnippetInto(body, element);
    }

    return section;
  }

  private async loadSnippetInto(body: HTMLElement, element: InspectedElement): Promise<void> {
    body.innerHTML = '';
    const skeleton = document.createElement('div');
    skeleton.className = 'inspekt-snippet-skeleton';
    skeleton.textContent = 'Loading source…';
    body.appendChild(skeleton);

    const snippet = await resolveSnippet({
      filePath: element.filePath,
      line: element.line,
      serverUrl: this.snippetConfig.serverUrl,
      context: this.snippetConfig.context,
    });

    body.innerHTML = '';
    if (!snippet) {
      const empty = document.createElement('div');
      empty.className = 'inspekt-snippet-empty';
      empty.textContent =
        'Source not available — start your dev server, or enable source-map fallback in the extension options.';
      body.appendChild(empty);
      return;
    }

    body.appendChild(this.renderSnippet(snippet));
    // Stash for downstream consumers (agent grab payload, etc.)
    element.snippet = snippet;
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
