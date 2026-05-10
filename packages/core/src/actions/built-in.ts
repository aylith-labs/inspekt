import type { InspektAction, InspectedElement } from '../types.js';

const EDITOR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const GITHUB_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`;
const CONSOLE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`;

export function createOpenEditorAction(serverUrl: string, editor: string): InspektAction {
  return {
    id: 'open-editor',
    label: 'Open in Editor',
    icon: EDITOR_ICON,
    handler(element: InspectedElement) {
      const url = `${serverUrl}/__inspekt/open`;
      const body = JSON.stringify({
        file: element.filePath,
        line: element.line,
        column: element.column,
        editor,
      });

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {
        // Fallback to protocol handler
        const protocol = editorProtocol(editor, element);
        if (protocol) window.open(protocol, '_blank');
      });
    },
  };
}

export function createCopyPathAction(): InspektAction {
  return {
    id: 'copy-path',
    label: 'Copy Path',
    icon: COPY_ICON,
    handler(element: InspectedElement) {
      const text = `${element.filePath}:${element.line}`;
      navigator.clipboard.writeText(text).catch(() => {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    },
  };
}

export function createOpenGithubAction(repo: string, branch: string): InspektAction {
  return {
    id: 'open-github',
    label: 'Open on GitHub',
    icon: GITHUB_ICON,
    handler(element: InspectedElement) {
      if (!repo) return;
      const url = `https://github.com/${repo}/blob/${branch}/${element.filePath}#L${element.line}`;
      window.open(url, '_blank');
    },
  };
}

export function createConsoleLogAction(): InspektAction {
  return {
    id: 'console-log',
    label: 'Log to Console',
    icon: CONSOLE_ICON,
    handler(element: InspectedElement) {
      console.group(`[Inspekt] ${element.componentName}`);
      console.log('File:', `${element.filePath}:${element.line}:${element.column}`);
      console.log('Element:', element.domElement);
      console.log('Tag:', element.tagName);
      if (element.props) console.log('Props:', element.props);
      console.groupEnd();
    },
  };
}

function editorProtocol(editor: string, element: InspectedElement): string | null {
  const { filePath, line, column } = element;
  switch (editor) {
    case 'vscode':
      return `vscode://file/${filePath}:${line}:${column}`;
    case 'vscode-insiders':
      return `vscode-insiders://file/${filePath}:${line}:${column}`;
    case 'cursor':
      return `cursor://file/${filePath}:${line}:${column}`;
    case 'windsurf':
      return `windsurf://file/${filePath}:${line}:${column}`;
    case 'webstorm':
      return `webstorm://open?file=${filePath}&line=${line}&column=${column}`;
    case 'phpstorm':
      return `phpstorm://open?file=${filePath}&line=${line}&column=${column}`;
    case 'idea':
      return `idea://open?file=${filePath}&line=${line}&column=${column}`;
    case 'zed':
      return `zed://file/${filePath}:${line}:${column}`;
    case 'sublime':
      return `subl://open?url=file://${filePath}&line=${line}&column=${column}`;
    default:
      return `vscode://file/${filePath}:${line}:${column}`;
  }
}
