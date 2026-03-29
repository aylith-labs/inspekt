import type { HighlightConfig } from '../types.js';

const HIGHLIGHT_ATTR = 'data-devlens-highlight';

interface HighlightState {
  element: HTMLElement;
  originalOutline: string;
  originalOutlineOffset: string;
  originalBoxShadow: string;
  type: 'selected' | 'hovered' | 'border';
}

export class Highlighter {
  private highlights = new Map<HTMLElement, HighlightState>();
  private config: HighlightConfig;

  constructor(config: HighlightConfig) {
    this.config = config;
  }

  highlight(element: HTMLElement, type: 'selected' | 'hovered' | 'border' = 'selected'): void {
    if (this.highlights.has(element)) {
      this.unhighlight(element);
    }

    const state: HighlightState = {
      element,
      originalOutline: element.style.outline,
      originalOutlineOffset: element.style.outlineOffset,
      originalBoxShadow: element.style.boxShadow,
      type,
    };
    this.highlights.set(element, state);

    element.setAttribute(HIGHLIGHT_ATTR, type);

    switch (type) {
      case 'selected':
        element.style.outline = `2px solid ${this.config.color}`;
        element.style.outlineOffset = '2px';
        if (this.config.style === 'glow') {
          element.style.boxShadow = `0 0 8px 2px ${this.config.color}40`;
        }
        break;
      case 'hovered':
        element.style.outline = '2px dashed #a855f7';
        element.style.outlineOffset = '2px';
        break;
      case 'border':
        element.style.outline = `1px solid ${this.config.color}60`;
        element.style.outlineOffset = '0px';
        break;
    }
  }

  unhighlight(element: HTMLElement): void {
    const state = this.highlights.get(element);
    if (!state) return;

    element.style.outline = state.originalOutline;
    element.style.outlineOffset = state.originalOutlineOffset;
    element.style.boxShadow = state.originalBoxShadow;
    element.removeAttribute(HIGHLIGHT_ATTR);

    this.highlights.delete(element);
  }

  unhighlightAll(): void {
    for (const [element] of this.highlights) {
      this.unhighlight(element);
    }
  }

  updateConfig(config: HighlightConfig): void {
    this.config = config;
  }
}
