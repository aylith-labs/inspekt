import launchEditor from 'launch-editor';

export interface OpenFileOptions {
  file: string;
  line?: number;
  column?: number;
  editor?: string;
}

export interface FileTarget {
  file: string;
  line?: number;
  column?: number;
}

/** A leading `C:` / `c:` — the only colon in a path that is not a position separator. */
const WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;

/**
 * Splits `path[:line[:column]]`. Windows drive letters are kept with the path
 * whichever slash style follows them, so `C:/src/App.tsx:42` and
 * `C:\src\App.tsx:42` both yield line 42 rather than a file called `C`.
 * Non-numeric position segments are treated as part of the path.
 */
export function parseFileTarget(spec: string): FileTarget {
  const driveMatch = WINDOWS_DRIVE_RE.exec(spec);
  const prefix = driveMatch ? driveMatch[0] : '';
  const rest = spec.slice(prefix.length);

  const segments = rest.split(':');
  const positions: number[] = [];
  while (segments.length > 1 && positions.length < 2) {
    const last = segments[segments.length - 1] as string;
    if (!/^\d+$/.test(last)) break;
    positions.unshift(Number(last));
    segments.pop();
  }

  const target: FileTarget = { file: prefix + segments.join(':') };
  if (positions[0] !== undefined) target.line = positions[0];
  if (positions[1] !== undefined) target.column = positions[1];
  return target;
}

export function openInEditor(options: OpenFileOptions): void {
  const { file, line, column, editor } = options;
  let target = file;
  if (line) {
    target += `:${line}`;
    if (column) target += `:${column}`;
  }

  launchEditor(target, resolveEditor(editor));
}

export function resolveEditor(editor?: string): string {
  return editor ?? process.env['INSPEKT_EDITOR'] ?? 'code';
}
