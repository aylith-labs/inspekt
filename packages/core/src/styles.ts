export const STYLES = /* css */ `
  :host {
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Theme variables */
  :host {
    --dl-bg: #1e1e2e;
    --dl-bg-hover: #313244;
    --dl-text: #cdd6f4;
    --dl-text-dim: #a6adc8;
    --dl-border: #45475a;
    --dl-accent: #3b82f6;
    --dl-accent-dim: #3b82f640;
    --dl-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    --dl-radius: 8px;
  }

  :host(.inspekt-light) {
    --dl-bg: #ffffff;
    --dl-bg-hover: #f1f5f9;
    --dl-text: #1e293b;
    --dl-text-dim: #64748b;
    --dl-border: #e2e8f0;
    --dl-accent: #3b82f6;
    --dl-accent-dim: #3b82f620;
    --dl-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  /* Popover */
  .inspekt-popover {
    position: fixed;
    background: var(--dl-bg);
    border: 1px solid var(--dl-border);
    border-radius: var(--dl-radius);
    box-shadow: var(--dl-shadow);
    color: var(--dl-text);
    min-width: 200px;
    max-width: 400px;
    overflow: hidden;
    pointer-events: auto;
    z-index: 2147483647;
    animation: inspekt-fade-in 0.15s ease;
  }

  @keyframes inspekt-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .inspekt-popover-header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--dl-border);
  }

  .inspekt-popover-path-dir {
    font-size: 11px;
    color: var(--dl-text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inspekt-popover-path-file {
    font-size: 13px;
    font-weight: 600;
    color: var(--dl-text);
  }

  .inspekt-popover-actions {
    display: flex;
    gap: 2px;
    padding: 6px 8px;
  }

  .inspekt-popover-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--dl-text-dim);
    cursor: pointer;
    transition: all 0.15s ease;
    pointer-events: auto;
  }

  .inspekt-popover-action:hover {
    background: var(--dl-bg-hover);
    color: var(--dl-text);
  }

  .inspekt-popover-action:active {
    transform: scale(0.92);
  }

  .inspekt-popover-action svg {
    width: 16px;
    height: 16px;
  }

  /* Overlay badges */
  .inspekt-overlay {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .inspekt-badge {
    position: absolute;
    background: var(--dl-accent);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: auto;
    cursor: pointer;
    opacity: 0.9;
    transition: opacity 0.15s ease;
    z-index: 2147483646;
  }

  .inspekt-badge:hover {
    opacity: 1;
  }

  /* Pulse animation for selected highlight */
  @keyframes inspekt-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--dl-accent-dim); }
    50% { box-shadow: 0 0 8px 4px var(--dl-accent-dim); }
  }

  /* Tree Panel */
  .inspekt-tree-panel {
    position: fixed;
    top: 0;
    height: 100vh;
    width: 320px;
    background: var(--dl-bg);
    border-left: 1px solid var(--dl-border);
    color: var(--dl-text);
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    z-index: 2147483647;
    box-shadow: var(--dl-shadow);
    animation: inspekt-slide-in 0.2s ease;
  }

  .inspekt-tree-right { right: 0; border-left: 1px solid var(--dl-border); border-right: none; }
  .inspekt-tree-left { left: 0; border-right: 1px solid var(--dl-border); border-left: none; }

  @keyframes inspekt-slide-in {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .inspekt-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--dl-border);
    flex-shrink: 0;
  }

  .inspekt-tree-title {
    font-weight: 600;
    font-size: 13px;
  }

  .inspekt-tree-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--dl-text-dim);
    cursor: pointer;
  }

  .inspekt-tree-close:hover {
    background: var(--dl-bg-hover);
    color: var(--dl-text);
  }

  .inspekt-tree-search {
    padding: 6px 12px;
    border-bottom: 1px solid var(--dl-border);
    flex-shrink: 0;
  }

  .inspekt-tree-search-input {
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--dl-border);
    border-radius: 6px;
    background: var(--dl-bg-hover);
    color: var(--dl-text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
  }

  .inspekt-tree-search-input:focus {
    border-color: var(--dl-accent);
  }

  .inspekt-tree-search-input::placeholder {
    color: var(--dl-text-dim);
  }

  .inspekt-tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--dl-border) transparent;
  }

  .inspekt-tree-content::-webkit-scrollbar { width: 6px; }
  .inspekt-tree-content::-webkit-scrollbar-thumb { background: var(--dl-border); border-radius: 3px; }

  .inspekt-tree-node {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    cursor: pointer;
    min-height: 26px;
    transition: background 0.1s ease;
  }

  .inspekt-tree-node:hover {
    background: var(--dl-bg-hover);
  }

  .inspekt-tree-node-selected {
    background: var(--dl-accent-dim) !important;
  }

  .inspekt-tree-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .inspekt-tree-arrow svg { color: var(--dl-text-dim); }

  .inspekt-tree-arrow-expanded { transform: rotate(0deg); }
  .inspekt-tree-arrow-collapsed { transform: rotate(-90deg); }

  .inspekt-tree-name {
    font-size: 12px;
    font-weight: 500;
    color: #c792ea;
  }

  :host(.inspekt-light) .inspekt-tree-name {
    color: #7c3aed;
  }

  .inspekt-tree-line {
    font-size: 11px;
    color: var(--dl-text-dim);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  }

  .inspekt-tree-props {
    font-size: 10px;
    color: var(--dl-text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  }

  .inspekt-tree-children.inspekt-tree-collapsed {
    display: none;
  }

  .inspekt-tree-empty {
    padding: 16px;
    text-align: center;
    color: var(--dl-text-dim);
    font-size: 12px;
  }

  /* Resize handle */
  .inspekt-tree-resize {
    position: absolute;
    top: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
  }

  .inspekt-tree-resize-left { left: 0; }
  .inspekt-tree-resize-right { right: 0; }

  .inspekt-tree-resize:hover {
    background: var(--dl-accent);
    opacity: 0.5;
  }
`;
