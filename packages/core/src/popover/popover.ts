import type { DevLensAction, InspectedElement } from '../types.js';

export class Popover {
  private container: HTMLElement;
  private visible = false;

  constructor(private shadowRoot: ShadowRoot) {
    this.container = document.createElement('div');
    this.container.className = 'devlens-popover';
    this.container.style.display = 'none';
    this.shadowRoot.appendChild(this.container);
  }

  show(element: InspectedElement, actions: DevLensAction[], position: { x: number; y: number }): void {
    this.container.innerHTML = '';

    // Header: file path + line
    const header = document.createElement('div');
    header.className = 'devlens-popover-header';

    const pathDir = document.createElement('div');
    pathDir.className = 'devlens-popover-path-dir';
    const parts = element.filePath.split('/');
    pathDir.textContent = parts.slice(0, -1).join('/') + '/';

    const pathFile = document.createElement('div');
    pathFile.className = 'devlens-popover-path-file';
    pathFile.textContent = `${parts[parts.length - 1]}:${element.line}`;

    header.appendChild(pathDir);
    header.appendChild(pathFile);
    this.container.appendChild(header);

    // Actions bar
    const actionsBar = document.createElement('div');
    actionsBar.className = 'devlens-popover-actions';

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = 'devlens-popover-action';
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
