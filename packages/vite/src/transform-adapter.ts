// Adapter over @code-inspector/core — replaces the previous regex transform
// with their AST-based implementation. They support JSX/TSX, Vue SFC, and Svelte.
//
// We pin the attribute name to their `data-insp-path` constant (same shape:
// "<file>:<line>:<col>:<componentName>"). Inspekt's runtime reads this attribute
// directly; no rename pass needed.

import { transformCode } from '@code-inspector/core';

export interface TransformOptions {
  framework: 'react' | 'vue' | 'svelte' | 'solid' | 'auto';
  root: string;
  pathType: 'relative' | 'absolute';
  /**
   * Tag names to skip (no attribute injection). Always includes a sensible
   * default set for React/Vue/Svelte; callers may extend.
   */
  escapeTags?: string[];
}

const FILETYPE_RE_VUE = /\.vue(\?.*)?$/;
const FILETYPE_RE_SVELTE = /\.svelte(\?.*)?$/;
const FILETYPE_RE_JSX = /\.(tsx|jsx|astro)(\?.*)?$/;

function detectFileType(id: string): 'vue' | 'svelte' | 'jsx' | null {
  if (FILETYPE_RE_VUE.test(id)) return 'vue';
  if (FILETYPE_RE_SVELTE.test(id)) return 'svelte';
  if (FILETYPE_RE_JSX.test(id)) return 'jsx';
  return null;
}

export async function transformInspekt(
  code: string,
  id: string,
  options: TransformOptions,
): Promise<{ code: string } | null> {
  const fileType = detectFileType(id);
  if (!fileType) return null;

  // Skip files that already have the attribute (idempotent re-runs)
  if (code.includes('data-insp-path')) return null;

  const transformed = await transformCode({
    content: code,
    filePath: id,
    fileType,
    escapeTags: options.escapeTags ?? [],
    pathType: options.pathType,
  });

  if (transformed === code) return null;
  return { code: transformed };
}
