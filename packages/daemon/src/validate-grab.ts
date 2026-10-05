import type { Grab } from './types.js';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const coordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Validate JSON received across the public daemon boundary before persistence. */
export function isIncomingGrab(value: unknown): value is Omit<Grab, 'id' | 'timestamp'> {
  if (
    !record(value) ||
    !text(value.url) ||
    !value.url ||
    (value.source !== 'cli' && value.source !== 'extension')
  )
    return false;
  if (value.comment !== undefined && !text(value.comment)) return false;
  if (value.styles !== undefined && !text(value.styles)) return false;
  const element = value.element;
  if (
    !record(element) ||
    !text(element.filePath) ||
    !element.filePath ||
    !coordinate(element.line) ||
    !coordinate(element.column) ||
    !text(element.componentName) ||
    !text(element.tagName) ||
    !element.tagName ||
    !Array.isArray(element.classList) ||
    !element.classList.every(text) ||
    (element.id !== null && !text(element.id))
  )
    return false;
  if (element.rect !== undefined) {
    if (!record(element.rect)) return false;
    const rect = element.rect;
    if (
      !['x', 'y', 'width', 'height'].every(
        (key) => typeof rect[key] === 'number' && Number.isFinite(rect[key]),
      )
    )
      return false;
    if ((rect.width as number) < 0 || (rect.height as number) < 0) return false;
  }
  if (element.snippet !== undefined) {
    const snippet = element.snippet;
    if (
      !record(snippet) ||
      !coordinate(snippet.startLine) ||
      !coordinate(snippet.endLine) ||
      !coordinate(snippet.targetLine) ||
      snippet.endLine < snippet.startLine ||
      snippet.targetLine < snippet.startLine ||
      snippet.targetLine > snippet.endLine ||
      !Array.isArray(snippet.lines) ||
      !snippet.lines.every(text) ||
      !text(snippet.language) ||
      (snippet.source !== 'devserver' &&
        snippet.source !== 'sourcemap' &&
        snippet.source !== 'fiber')
    )
      return false;
  }
  return true;
}
