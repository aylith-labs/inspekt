import MagicString from 'magic-string';
import path from 'node:path';

export interface TransformOptions {
  framework: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  root: string;
  pathType: 'relative' | 'absolute';
  attribute: string;
  include: string[];
  exclude: string[];
}

// Match JSX opening tags: <Component or <div
// Captures self-closing and regular opening tags
const JSX_OPEN_TAG_RE = /(<(?:[A-Z][a-zA-Z0-9.]*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*))((?:\s+[\s\S]*?)?)(\s*\/?>)/g;

// Skip tags that shouldn't get attributes
const SKIP_TAGS = new Set(['Fragment', 'React.Fragment', '<>', 'Suspense', 'StrictMode']);

export function transformJSX(
  code: string,
  id: string,
  options: TransformOptions,
): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
  // Skip if no JSX
  if (!code.includes('<') || !code.includes('>')) return null;

  // Skip if already has devlens attributes
  if (code.includes(options.attribute)) return null;

  const s = new MagicString(code);
  const filePath =
    options.pathType === 'relative'
      ? path.relative(options.root, id)
      : id;

  let hasChanges = false;

  // Split code into lines for line number tracking
  const lines = code.split('\n');
  const lineStarts: number[] = [];
  let pos = 0;
  for (const line of lines) {
    lineStarts.push(pos);
    pos += line.length + 1;
  }

  function getLineCol(offset: number): { line: number; col: number } {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - (lineStarts[lo] ?? 0) + 1 };
  }

  // Find component name from context
  function findComponentName(offset: number): string {
    // Look backwards for function/const declaration
    const before = code.slice(Math.max(0, offset - 500), offset);

    // function ComponentName
    const funcMatch = before.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^{]*?)?\s*\{[^}]*$/);
    if (funcMatch) return funcMatch[1]!;

    // const ComponentName = ...
    const constMatch = before.match(/(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*[^=]*?=\s/);

    if (constMatch) return constMatch[1]!;

    return '';
  }

  // Track if we're inside a string, template literal, or comment
  let match: RegExpExecArray | null;
  JSX_OPEN_TAG_RE.lastIndex = 0;

  while ((match = JSX_OPEN_TAG_RE.exec(code)) !== null) {
    const tagOpen = match[1]!;      // e.g., "<div" or "<Button"
    const attrs = match[2] ?? '';    // existing attributes

    const tagName = tagOpen.slice(1); // Remove '<'

    // Skip fragments and special tags
    if (SKIP_TAGS.has(tagName)) continue;

    // Skip if already has the attribute
    if (attrs.includes(options.attribute)) continue;
    if (attrs.includes('data-insp-path')) continue;

    // Check we're not inside a string or comment (simple heuristic)
    const beforeMatch = code.slice(Math.max(0, match.index - 10), match.index);
    if (beforeMatch.includes('`') || beforeMatch.endsWith('"') || beforeMatch.endsWith("'")) continue;

    const { line, col } = getLineCol(match.index);
    const componentName = findComponentName(match.index) || tagName;

    const attrValue = `${filePath}:${line}:${col}:${componentName}`;
    const injection = ` ${options.attribute}="${attrValue}"`;

    // Insert before the closing > or />
    const insertPos = match.index + tagOpen.length + attrs.length;
    s.appendLeft(insertPos, injection);
    hasChanges = true;
  }

  if (!hasChanges) return null;

  return {
    code: s.toString(),
    map: s.generateMap({ source: id, includeContent: true }),
  };
}
