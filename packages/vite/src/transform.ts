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

// Match JSX opening tag start: <Component or <div (but not closing tags like </div>)
const JSX_TAG_START_RE = /<(?!\/|!--)([A-Z][a-zA-Z0-9.]*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)/g;

/**
 * Pre-scan the source for regions where a `<` cannot start a JSX tag —
 * string literals, template literals, and JS comments. Without this, the
 * regex above happily matches inside `'pages/<name>/<name>.tsx'` and
 * `// see <Component>`, then injects `data-inspekt-path` into the literal
 * (or comment), corrupting runtime values that get rendered as text.
 *
 * Returns sorted, non-overlapping `[start, end)` ranges. The matcher skips
 * any match.index that falls inside one. Template literals are treated as a
 * single span that includes their `${}` expressions — JSX inside a tagged
 * template is uncommon and the upstream Babel/SWC JSX transform would handle
 * those cases anyway.
 */
function computeSkipRanges(code: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const len = code.length;
  let i = 0;

  while (i < len) {
    const ch = code[i];
    const next = code[i + 1];

    // Line comment
    if (ch === '/' && next === '/') {
      const start = i;
      i += 2;
      while (i < len && code[i] !== '\n') i++;
      ranges.push([start, i]);
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i = Math.min(i + 2, len);
      ranges.push([start, i]);
      continue;
    }

    // Single/double-quoted string
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '\n') break; // unterminated — bail to avoid overrunning
        i++;
      }
      if (i < len && code[i] === quote) i++;
      ranges.push([start, i]);
      continue;
    }

    // Template literal — skip the entire span including ${...} interpolations.
    if (ch === '`') {
      const start = i;
      i = consumeTemplateLiteral(code, i);
      ranges.push([start, i]);
      continue;
    }

    i++;
  }

  return ranges;
}

function consumeTemplateLiteral(code: string, start: number): number {
  const len = code.length;
  let i = start + 1; // past opening backtick
  while (i < len) {
    const ch = code[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') return i + 1;
    if (ch === '$' && code[i + 1] === '{') {
      i = consumeBalancedBraces(code, i + 1);
      continue;
    }
    i++;
  }
  return len;
}

function consumeBalancedBraces(code: string, start: number): number {
  // start points at `{`. Walk forward respecting strings and nested templates.
  const len = code.length;
  let i = start + 1;
  let depth = 1;
  while (i < len && depth > 0) {
    const ch = code[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < len && code[i] !== q) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '\n') break;
        i++;
      }
      if (i < len) i++;
      continue;
    }
    if (ch === '`') {
      i = consumeTemplateLiteral(code, i);
      continue;
    }
    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      depth--;
      i++;
      continue;
    }
    i++;
  }
  return i;
}

function offsetInRanges(offset: number, ranges: Array<[number, number]>): boolean {
  // Linear scan is fine for typical source files; ranges are sorted by construction.
  for (const [s, e] of ranges) {
    if (offset < s) return false;
    if (offset < e) return true;
  }
  return false;
}

// Skip tags that shouldn't get attributes
const SKIP_TAGS = new Set([
  // React
  'Fragment', 'React.Fragment', 'Suspense', 'StrictMode',
  // Vue
  'template', 'script', 'style', 'slot', 'Teleport', 'Transition', 'TransitionGroup', 'KeepAlive',
  // Svelte
  'svelte:head', 'svelte:body', 'svelte:window', 'svelte:document', 'svelte:fragment',
  'svelte:options', 'svelte:self', 'svelte:component', 'svelte:element',
]);

export function transformJSX(
  code: string,
  id: string,
  options: TransformOptions,
): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
  // Skip if no JSX
  if (!code.includes('<') || !code.includes('>')) return null;

  // Skip if already has inspekt attributes
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
    const before = code.slice(Math.max(0, offset - 500), offset);

    // function ComponentName
    const funcMatch = before.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^{]*?)?\s*\{[^}]*$/);
    if (funcMatch) return funcMatch[1]!;

    // const ComponentName = ...
    const constMatch = before.match(/(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*[^=]*?=\s/);
    if (constMatch) return constMatch[1]!;

    return '';
  }

  /**
   * Given the position right after `<TagName`, find the position of the
   * closing `>` or `/>` for this JSX opening tag, properly handling:
   * - Nested braces `{...}` (JSX expressions)
   * - String literals (single, double, template)
   * - Parentheses `(...)`
   */
  function findTagClose(startPos: number): { closePos: number; selfClosing: boolean } | null {
    let i = startPos;
    let braceDepth = 0;
    let parenDepth = 0;
    let inString: string | null = null; // '"', "'", or '`'

    while (i < code.length) {
      const ch = code[i]!;
      // Handle escape sequences in strings
      if (inString && ch === '\\') {
        i += 2;
        continue;
      }

      // String handling
      if (inString) {
        if (ch === inString) {
          // Template literal handles ${} nesting, but for our purposes
          // we just track the outer string boundaries
          inString = null;
        }
        i++;
        continue;
      }

      // Start string
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
        i++;
        continue;
      }

      // Brace tracking
      if (ch === '{') {
        braceDepth++;
        i++;
        continue;
      }
      if (ch === '}') {
        braceDepth--;
        i++;
        continue;
      }

      // Paren tracking
      if (ch === '(') {
        parenDepth++;
        i++;
        continue;
      }
      if (ch === ')') {
        parenDepth--;
        i++;
        continue;
      }

      // Only match closing > when not inside any nesting
      if (braceDepth === 0 && parenDepth === 0) {
        if (ch === '/' && code[i + 1] === '>') {
          return { closePos: i, selfClosing: true };
        }
        if (ch === '>') {
          return { closePos: i, selfClosing: false };
        }
        // If we hit a `<` that isn't part of `<=`, it's a nested JSX — bail
        if (ch === '<' && code[i + 1] !== '=' && i > startPos) {
          return null;
        }
      }

      i++;
    }

    return null;
  }

  const skipRanges = computeSkipRanges(code);

  let match: RegExpExecArray | null;
  JSX_TAG_START_RE.lastIndex = 0;

  while ((match = JSX_TAG_START_RE.exec(code)) !== null) {
    const tagName = match[1]!;

    // Skip fragments and special tags
    if (SKIP_TAGS.has(tagName)) continue;

    // Skip matches inside string literals, template literals, or comments.
    if (offsetInRanges(match.index, skipRanges)) continue;

    // Find the actual closing > or /> for this tag
    const afterTagName = match.index + match[0].length;
    const tagClose = findTagClose(afterTagName);
    if (!tagClose) continue;

    // Check if existing attributes already include our attribute
    const attrRegion = code.slice(afterTagName, tagClose.closePos);
    if (attrRegion.includes(options.attribute)) continue;
    if (attrRegion.includes('data-insp-path')) continue;

    const { line, col } = getLineCol(match.index);
    const componentName = findComponentName(match.index) || tagName;

    const attrValue = `${filePath}:${line}:${col}:${componentName}`;
    const injection = ` ${options.attribute}="${attrValue}"`;

    // Insert just before the closing > or />
    s.appendLeft(tagClose.closePos, injection);
    hasChanges = true;
  }

  if (!hasChanges) return null;

  return {
    code: s.toString(),
    map: s.generateMap({ source: id, includeContent: true }),
  };
}
