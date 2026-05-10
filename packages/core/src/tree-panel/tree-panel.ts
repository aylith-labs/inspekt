import type { ComponentNode } from '../adapters/types.js';
import type { InspectedElement } from '../types.js';

export interface TreePanelOptions {
  position: 'left' | 'right';
  showProps: boolean;
  showLineNumbers: boolean;
  onSelect: (node: ComponentNode) => void;
  onHover: (node: ComponentNode | null) => void;
}

export class TreePanel {
  private container: HTMLElement;
  private visible = false;
  private searchInput: HTMLInputElement | null = null;
  private treeContainer: HTMLElement | null = null;
  private filter = '';

  constructor(
    private shadowRoot: ShadowRoot,
    private options: TreePanelOptions,
  ) {
    this.container = document.createElement('div');
    this.container.className = `inspekt-tree-panel inspekt-tree-${options.position}`;
    this.container.style.display = 'none';
    this.shadowRoot.appendChild(this.container);
    this.buildUI();
  }

  private buildUI(): void {
    // Header with search
    const header = document.createElement('div');
    header.className = 'inspekt-tree-header';

    const title = document.createElement('span');
    title.className = 'inspekt-tree-title';
    title.textContent = 'Component Tree';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'inspekt-tree-close';
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Search
    const searchWrap = document.createElement('div');
    searchWrap.className = 'inspekt-tree-search';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Filter components...';
    this.searchInput.className = 'inspekt-tree-search-input';
    this.searchInput.addEventListener('input', () => {
      this.filter = this.searchInput!.value.toLowerCase();
      this.renderCurrentTree();
    });
    searchWrap.appendChild(this.searchInput);
    this.container.appendChild(searchWrap);

    // Tree content area
    this.treeContainer = document.createElement('div');
    this.treeContainer.className = 'inspekt-tree-content';
    this.container.appendChild(this.treeContainer);

    // Make panel draggable via resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = `inspekt-tree-resize inspekt-tree-resize-${this.options.position === 'right' ? 'left' : 'right'}`;
    this.container.appendChild(resizeHandle);
    this.setupResize(resizeHandle);
  }

  private currentTree: ComponentNode | null = null;

  show(): void {
    this.visible = true;
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  updateTree(tree: ComponentNode | null): void {
    this.currentTree = tree;
    this.renderCurrentTree();
  }

  selectElement(element: InspectedElement): void {
    // Find and highlight matching node in tree
    if (!this.treeContainer) return;
    const nodes = this.treeContainer.querySelectorAll('.inspekt-tree-node');
    for (const node of nodes) {
      node.classList.remove('inspekt-tree-node-selected');
      const path = node.getAttribute('data-path');
      if (path === `${element.filePath}:${element.line}`) {
        node.classList.add('inspekt-tree-node-selected');
        node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  private renderCurrentTree(): void {
    if (!this.treeContainer) return;
    this.treeContainer.innerHTML = '';

    if (!this.currentTree) {
      const empty = document.createElement('div');
      empty.className = 'inspekt-tree-empty';
      empty.textContent = 'No component tree detected';
      this.treeContainer.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    this.renderNode(this.currentTree, fragment, 0);
    this.treeContainer.appendChild(fragment);
  }

  private renderNode(node: ComponentNode, parent: DocumentFragment | HTMLElement, depth: number): void {
    // Filter check
    if (this.filter && !this.matchesFilter(node)) return;

    const row = document.createElement('div');
    row.className = 'inspekt-tree-node';
    row.setAttribute('data-path', `${node.filePath ?? ''}:${node.line ?? ''}`);
    row.style.paddingLeft = `${depth * 16 + 8}px`;

    // Expand/collapse arrow
    const hasChildren = node.children.length > 0;
    const arrow = document.createElement('span');
    arrow.className = 'inspekt-tree-arrow';
    if (hasChildren) {
      arrow.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
      arrow.classList.add('inspekt-tree-arrow-expanded');
    }
    row.appendChild(arrow);

    // Component name
    const name = document.createElement('span');
    name.className = 'inspekt-tree-name';
    name.textContent = node.name;
    row.appendChild(name);

    // Line number
    if (this.options.showLineNumbers && node.line) {
      const line = document.createElement('span');
      line.className = 'inspekt-tree-line';
      line.textContent = `:${node.line}`;
      row.appendChild(line);
    }

    // Props preview
    if (this.options.showProps && node.props) {
      const propsEl = document.createElement('span');
      propsEl.className = 'inspekt-tree-props';
      const entries = Object.entries(node.props).slice(0, 3);
      propsEl.textContent = entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
      row.appendChild(propsEl);
    }

    // Click to select
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onSelect(node);

      // Toggle expand/collapse
      if (hasChildren) {
        const childContainer = row.nextElementSibling;
        if (childContainer?.classList.contains('inspekt-tree-children')) {
          const isCollapsed = childContainer.classList.toggle('inspekt-tree-collapsed');
          arrow.classList.toggle('inspekt-tree-arrow-collapsed', isCollapsed);
          arrow.classList.toggle('inspekt-tree-arrow-expanded', !isCollapsed);
        }
      }

      // Update selected state
      this.treeContainer!.querySelectorAll('.inspekt-tree-node-selected')
        .forEach((n) => n.classList.remove('inspekt-tree-node-selected'));
      row.classList.add('inspekt-tree-node-selected');
    });

    // Hover to highlight
    row.addEventListener('mouseenter', () => this.options.onHover(node));
    row.addEventListener('mouseleave', () => this.options.onHover(null));

    parent.appendChild(row);

    // Children
    if (hasChildren) {
      const childContainer = document.createElement('div');
      childContainer.className = 'inspekt-tree-children';
      for (const child of node.children) {
        this.renderNode(child, childContainer, depth + 1);
      }
      parent.appendChild(childContainer);
    }
  }

  private matchesFilter(node: ComponentNode): boolean {
    if (node.name.toLowerCase().includes(this.filter)) return true;
    return node.children.some((child) => this.matchesFilter(child));
  }

  private setupResize(handle: HTMLElement): void {
    let startX: number;
    let startWidth: number;
    const isRight = this.options.position === 'right';

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const newWidth = isRight ? startWidth - dx : startWidth + dx;
      this.container.style.width = `${Math.max(200, Math.min(600, newWidth))}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.container.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = this.container.offsetWidth;
      this.container.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  destroy(): void {
    this.container.remove();
  }
}
