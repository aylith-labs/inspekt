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
`;
