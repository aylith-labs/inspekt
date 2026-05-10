import launchEditor from 'launch-editor';

export interface OpenFileOptions {
  file: string;
  line?: number;
  column?: number;
  editor?: string;
}

export function openInEditor(options: OpenFileOptions): void {
  const { file, line, column, editor } = options;
  let target = file;
  if (line) {
    target += `:${line}`;
    if (column) target += `:${column}`;
  }

  launchEditor(target, editor ?? process.env['INSPEKT_EDITOR'] ?? 'code');
}

export function resolveEditor(editor?: string): string {
  return editor ?? process.env['INSPEKT_EDITOR'] ?? 'code';
}
