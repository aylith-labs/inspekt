// Minimal glob matcher for the plugin's include/exclude options. Avoids pulling
// in a matcher dependency for the handful of patterns we actually support:
// `**` (any number of segments), `*` and `?` (within one segment), and `{a,b}`
// alternation.

const REGEXP_META = /[.+^$()|[\]\\]/g;
const cache = new Map<string, RegExp>();

function escapeLiteral(text: string): string {
  return text.replace(REGEXP_META, '\\$&');
}

/** Splits on top-level commas so nested braces stay with their alternative. */
function splitAlternatives(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of body) {
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

function globToSource(pattern: string): string {
  let source = '';
  let index = 0;
  while (index < pattern.length) {
    const char = pattern[index] as string;

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        // `**/` also matches zero segments, so `**/*.test.*` covers a root-level
        // `App.test.tsx` and not just nested ones.
        if (pattern[index + 2] === '/') {
          source += '(?:[^/]*/)*';
          index += 3;
        } else {
          source += '.*';
          index += 2;
        }
      } else {
        source += '[^/]*';
        index += 1;
      }
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      index += 1;
      continue;
    }

    if (char === '{') {
      const close = pattern.indexOf('}', index);
      if (close !== -1) {
        const alternatives = splitAlternatives(pattern.slice(index + 1, close));
        source += `(?:${alternatives.map(globToSource).join('|')})`;
        index = close + 1;
        continue;
      }
    }

    source += escapeLiteral(char);
    index += 1;
  }
  return source;
}

function globToRegExp(pattern: string): RegExp {
  const cached = cache.get(pattern);
  if (cached) return cached;
  const compiled = new RegExp(`^${globToSource(pattern)}$`);
  cache.set(pattern, compiled);
  return compiled;
}

/** Matches a path against one glob. Backslash separators are normalized first. */
export function matchesGlob(filePath: string, pattern: string): boolean {
  return globToRegExp(pattern).test(filePath.replace(/\\/g, '/'));
}

/**
 * The plugin's include/exclude decision: a path must match at least one include
 * pattern (an empty list means "no restriction") and no exclude pattern.
 */
export function isPathSelected(filePath: string, include: string[], exclude: string[]): boolean {
  if (exclude.some((pattern) => matchesGlob(filePath, pattern))) return false;
  if (include.length === 0) return true;
  return include.some((pattern) => matchesGlob(filePath, pattern));
}
