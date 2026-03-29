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

  :host(.devlens-light) {
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
  .devlens-popover {
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
    animation: devlens-fade-in 0.15s ease;
  }

  @keyframes devlens-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .devlens-popover-header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--dl-border);
  }

  .devlens-popover-path-dir {
    font-size: 11px;
    color: var(--dl-text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .devlens-popover-path-file {
    font-size: 13px;
    font-weight: 600;
    color: var(--dl-text);
  }

  .devlens-popover-actions {
    display: flex;
    gap: 2px;
    padding: 6px 8px;
  }

  .devlens-popover-action {
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

  .devlens-popover-action:hover {
    background: var(--dl-bg-hover);
    color: var(--dl-text);
  }

  .devlens-popover-action:active {
    transform: scale(0.92);
  }

  .devlens-popover-action svg {
    width: 16px;
    height: 16px;
  }

  /* Overlay badges */
  .devlens-overlay {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .devlens-badge {
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

  .devlens-badge:hover {
    opacity: 1;
  }

  /* Pulse animation for selected highlight */
  @keyframes devlens-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--dl-accent-dim); }
    50% { box-shadow: 0 0 8px 4px var(--dl-accent-dim); }
  }

  /* Tree Panel */
  .devlens-tree-panel {
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
    animation: devlens-slide-in 0.2s ease;
  }

  .devlens-tree-right { right: 0; border-left: 1px solid var(--dl-border); border-right: none; }
  .devlens-tree-left { left: 0; border-right: 1px solid var(--dl-border); border-left: none; }

  @keyframes devlens-slide-in {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .devlens-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--dl-border);
    flex-shrink: 0;
  }

  .devlens-tree-title {
    font-weight: 600;
    font-size: 13px;
  }

  .devlens-tree-close {
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

  .devlens-tree-close:hover {
    background: var(--dl-bg-hover);
    color: var(--dl-text);
  }

  .devlens-tree-search {
    padding: 6px 12px;
    border-bottom: 1px solid var(--dl-border);
    flex-shrink: 0;
  }

  .devlens-tree-search-input {
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

  .devlens-tree-search-input:focus {
    border-color: var(--dl-accent);
  }

  .devlens-tree-search-input::placeholder {
    color: var(--dl-text-dim);
  }

  .devlens-tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--dl-border) transparent;
  }

  .devlens-tree-content::-webkit-scrollbar { width: 6px; }
  .devlens-tree-content::-webkit-scrollbar-thumb { background: var(--dl-border); border-radius: 3px; }

  .devlens-tree-node {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    cursor: pointer;
    min-height: 26px;
    transition: background 0.1s ease;
  }

  .devlens-tree-node:hover {
    background: var(--dl-bg-hover);
  }

  .devlens-tree-node-selected {
    background: var(--dl-accent-dim) !important;
  }

  .devlens-tree-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .devlens-tree-arrow svg { color: var(--dl-text-dim); }

  .devlens-tree-arrow-expanded { transform: rotate(0deg); }
  .devlens-tree-arrow-collapsed { transform: rotate(-90deg); }

  .devlens-tree-name {
    font-size: 12px;
    font-weight: 500;
    color: #c792ea;
  }

  :host(.devlens-light) .devlens-tree-name {
    color: #7c3aed;
  }

  .devlens-tree-line {
    font-size: 11px;
    color: var(--dl-text-dim);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  }

  .devlens-tree-props {
    font-size: 10px;
    color: var(--dl-text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  }

  .devlens-tree-children.devlens-tree-collapsed {
    display: none;
  }

  .devlens-tree-empty {
    padding: 16px;
    text-align: center;
    color: var(--dl-text-dim);
    font-size: 12px;
  }

  /* Resize handle */
  .devlens-tree-resize {
    position: absolute;
    top: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
  }

  .devlens-tree-resize-left { left: 0; }
  .devlens-tree-resize-right { right: 0; }

  .devlens-tree-resize:hover {
    background: var(--dl-accent);
    opacity: 0.5;
  }
`;
