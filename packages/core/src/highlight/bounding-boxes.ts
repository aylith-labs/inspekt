// Persistent bounding-box overlay across every inspectable element. Used by
// the `view` activation mode and the standalone `showBoundingBoxes` toggle.
//
// Scans the document for `data-insp-path` / fiber-detectable elements, draws
// a fixed-position labelled box per match, and refreshes on scroll/resize.
// Boxes are pointer-events: none so they don't intercept the user's clicks.

import { findClosestSource, type SourceInfo } from '../detection/source-detector.js';

interface BoxBinding {
  el: HTMLElement;
  box: HTMLElement;
  label: HTMLElement;
  source: SourceInfo;
}

export class BoundingBoxOverlay {
  private container: HTMLElement;
  private boxes: BoxBinding[] = [];
  private mounted = false;
  private rafHandle: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor(private shadowRoot: ShadowRoot) {
    this.container = document.createElement('div');
    this.container.className = 'inspekt-bbox-layer';
    this.shadowRoot.appendChild(this.container);
  }

  enable(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.scan();

    window.addEventListener('scroll', this.scheduleRepaint, true);
    window.addEventListener('resize', this.scheduleRepaint);

    this.resizeObserver = new ResizeObserver(this.scheduleRepaint);
    for (const { el } of this.boxes) this.resizeObserver.observe(el);

    this.mutationObserver = new MutationObserver(this.scheduleRescan);
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-insp-path'],
    });
  }

  disable(): void {
    if (!this.mounted) return;
    this.mounted = false;
    window.removeEventListener('scroll', this.scheduleRepaint, true);
    window.removeEventListener('resize', this.scheduleRepaint);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver = null;
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = null;
    this.clear();
  }

  destroy(): void {
    this.disable();
    this.container.remove();
  }

  private clear(): void {
    this.container.innerHTML = '';
    this.boxes = [];
  }

  private scan(): void {
    this.clear();
    const seen = new Set<HTMLElement>();
    const nodes = document.querySelectorAll<HTMLElement>('[data-insp-path]');
    for (const node of nodes) {
      const hit = findClosestSource(node);
      if (!hit || seen.has(hit.element)) continue;
      seen.add(hit.element);
      this.boxes.push(this.makeBox(hit.element, hit.source));
    }
    this.repaint();
  }

  private makeBox(el: HTMLElement, source: SourceInfo): BoxBinding {
    const box = document.createElement('div');
    box.className = 'inspekt-bbox';
    const label = document.createElement('span');
    label.className = 'inspekt-bbox-label';
    label.textContent = `${source.componentName} · ${fileTail(source.filePath)}:${source.line}`;
    box.appendChild(label);
    this.container.appendChild(box);
    return { el, box, label, source };
  }

  private scheduleRepaint = (): void => {
    if (this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this.repaint();
    });
  };

  private scheduleRescan = (): void => {
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this.scan();
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        for (const { el } of this.boxes) this.resizeObserver.observe(el);
      }
    });
  };

  private repaint(): void {
    for (const binding of this.boxes) {
      const rect = binding.el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        binding.box.style.display = 'none';
        continue;
      }
      binding.box.style.display = '';
      binding.box.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
      binding.box.style.width = `${rect.width}px`;
      binding.box.style.height = `${rect.height}px`;
    }
  }
}

function fileTail(path: string): string {
  return path.split('/').pop() ?? path;
}
