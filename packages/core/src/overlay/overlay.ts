import { findSourceAttribute, parseSourceAttribute } from '../detection/source-detector.js';

export interface Badge {
  element: HTMLElement;
  componentName: string;
  badgeElement: HTMLElement;
}

export class Overlay {
  private badges: Badge[] = [];
  private mutationObserver: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private container: HTMLElement;
  private visible = false;

  constructor(private shadowRoot: ShadowRoot) {
    this.container = document.createElement('div');
    this.container.className = 'devlens-overlay';
    this.container.style.display = 'none';
    this.shadowRoot.appendChild(this.container);
  }

  show(): void {
    this.visible = true;
    this.container.style.display = 'block';
    this.scan();
    this.startObserving();
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.clear();
    this.stopObserving();
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  private scan(): void {
    this.clear();

    const elements = document.querySelectorAll<HTMLElement>(
      '[data-devlens-path], [data-insp-path]',
    );

    // Track which elements are children of other detected elements
    // to show only outermost components
    const detected = new Set(elements);
    const outermost: HTMLElement[] = [];

    for (const el of elements) {
      let parent = el.parentElement;
      let isNested = false;
      while (parent) {
        if (detected.has(parent)) {
          isNested = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!isNested) outermost.push(el);
    }

    for (const el of outermost) {
      const attrValue = findSourceAttribute(el);
      if (!attrValue) continue;

      const source = parseSourceAttribute(attrValue);
      if (!source) continue;

      this.createBadge(el, source.componentName);
    }
  }

  private createBadge(element: HTMLElement, componentName: string): void {
    const badge = document.createElement('div');
    badge.className = 'devlens-badge';
    badge.textContent = componentName;
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      element.dispatchEvent(
        new CustomEvent('devlens:badge-click', {
          bubbles: true,
          detail: { element },
        }),
      );
    });
    badge.addEventListener('mouseenter', () => {
      element.dispatchEvent(
        new CustomEvent('devlens:badge-hover', {
          bubbles: true,
          detail: { element },
        }),
      );
    });
    badge.addEventListener('mouseleave', () => {
      element.dispatchEvent(
        new CustomEvent('devlens:badge-leave', {
          bubbles: true,
          detail: { element },
        }),
      );
    });

    this.container.appendChild(badge);
    this.positionBadge(badge, element);

    this.badges.push({ element, componentName, badgeElement: badge });
  }

  private positionBadge(badge: HTMLElement, target: HTMLElement): void {
    const rect = target.getBoundingClientRect();
    badge.style.left = `${rect.left + window.scrollX}px`;
    badge.style.top = `${rect.top + window.scrollY - 20}px`;
  }

  updatePositions(): void {
    for (const { badgeElement, element } of this.badges) {
      this.positionBadge(badgeElement, element);
    }
  }

  private startObserving(): void {
    this.mutationObserver = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.scan(), 100);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('scroll', this.handleScrollResize, true);
    window.addEventListener('resize', this.handleScrollResize);
  }

  private stopObserving(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    window.removeEventListener('scroll', this.handleScrollResize, true);
    window.removeEventListener('resize', this.handleScrollResize);
  }

  private handleScrollResize = (): void => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updatePositions(), 16);
  };

  private clear(): void {
    for (const { badgeElement } of this.badges) {
      badgeElement.remove();
    }
    this.badges = [];
  }

  destroy(): void {
    this.hide();
    this.container.remove();
  }
}
