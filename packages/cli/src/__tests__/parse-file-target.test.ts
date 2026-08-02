import { describe, expect, it } from 'vitest';
import { parseFileTarget, resolveEditor } from '../index';

describe('parseFileTarget', () => {
  it('splits a POSIX path with line and column', () => {
    expect(parseFileTarget('src/App.tsx:42:3')).toEqual({
      file: 'src/App.tsx',
      line: 42,
      column: 3,
    });
  });

  it('splits a POSIX path with only a line', () => {
    expect(parseFileTarget('src/App.tsx:42')).toEqual({ file: 'src/App.tsx', line: 42 });
  });

  it('returns a bare path unchanged', () => {
    expect(parseFileTarget('src/App.tsx')).toEqual({ file: 'src/App.tsx' });
  });

  it('keeps a Windows drive letter with the path when separators are backslashes', () => {
    expect(parseFileTarget('C:\\src\\App.tsx:42:3')).toEqual({
      file: 'C:\\src\\App.tsx',
      line: 42,
      column: 3,
    });
  });

  it('keeps a Windows drive letter with the path when separators are forward slashes', () => {
    expect(parseFileTarget('C:/src/App.tsx:42')).toEqual({ file: 'C:/src/App.tsx', line: 42 });
  });

  it('handles a lowercase drive letter', () => {
    expect(parseFileTarget('d:/work/App.tsx:7')).toEqual({ file: 'd:/work/App.tsx', line: 7 });
  });

  it('leaves a non-numeric trailing segment as part of the path', () => {
    expect(parseFileTarget('src/App.tsx:notaline')).toEqual({ file: 'src/App.tsx:notaline' });
  });

  it('never produces NaN positions', () => {
    const target = parseFileTarget('src/App.tsx:abc:def');
    expect(target.line).toBeUndefined();
    expect(target.column).toBeUndefined();
  });

  it('takes at most two position segments', () => {
    expect(parseFileTarget('src/App.tsx:1:2:3')).toEqual({
      file: 'src/App.tsx:1',
      line: 2,
      column: 3,
    });
  });
});

describe('resolveEditor', () => {
  it('prefers the explicit argument', () => {
    expect(resolveEditor('zed')).toBe('zed');
  });

  it('falls back to INSPEKT_EDITOR then to code', () => {
    const previous = process.env['INSPEKT_EDITOR'];
    try {
      process.env['INSPEKT_EDITOR'] = 'cursor';
      expect(resolveEditor()).toBe('cursor');
      delete process.env['INSPEKT_EDITOR'];
      expect(resolveEditor()).toBe('code');
    } finally {
      if (previous === undefined) delete process.env['INSPEKT_EDITOR'];
      else process.env['INSPEKT_EDITOR'] = previous;
    }
  });
});
