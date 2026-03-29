import { describe, it, expect } from 'vitest';
import { parseSourceAttribute } from '../source-detector';

describe('parseSourceAttribute', () => {
  it('parses standard format', () => {
    const result = parseSourceAttribute('src/components/Button.tsx:42:3:Button');
    expect(result).toEqual({
      filePath: 'src/components/Button.tsx',
      line: 42,
      column: 3,
      componentName: 'Button',
      rawPath: 'src/components/Button.tsx:42:3:Button',
    });
  });

  it('parses without component name', () => {
    const result = parseSourceAttribute('src/components/Button.tsx:42:3');
    expect(result).toEqual({
      filePath: 'src/components/Button.tsx',
      line: 42,
      column: 3,
      componentName: 'Button',
      rawPath: 'src/components/Button.tsx:42:3',
    });
  });

  it('parses with only line number', () => {
    const result = parseSourceAttribute('src/App.tsx:10');
    expect(result).toEqual({
      filePath: 'src/App.tsx',
      line: 10,
      column: 1,
      componentName: 'App',
      rawPath: 'src/App.tsx:10',
    });
  });

  it('handles Windows paths', () => {
    const result = parseSourceAttribute('C:\\Users\\dev\\src\\App.tsx:10:1:App');
    expect(result).toEqual({
      filePath: 'C:\\Users\\dev\\src\\App.tsx',
      line: 10,
      column: 1,
      componentName: 'App',
      rawPath: 'C:\\Users\\dev\\src\\App.tsx:10:1:App',
    });
  });

  it('returns null for invalid format', () => {
    expect(parseSourceAttribute('')).toBeNull();
    expect(parseSourceAttribute('noformat')).toBeNull();
    expect(parseSourceAttribute('file:notanumber')).toBeNull();
  });

  it('handles deeply nested paths', () => {
    const result = parseSourceAttribute('packages/ui/src/forms/fields/TextField.tsx:156:5:TextField');
    expect(result).toEqual({
      filePath: 'packages/ui/src/forms/fields/TextField.tsx',
      line: 156,
      column: 5,
      componentName: 'TextField',
      rawPath: 'packages/ui/src/forms/fields/TextField.tsx:156:5:TextField',
    });
  });

  it('handles container paths with /app prefix', () => {
    const result = parseSourceAttribute('/app/src/Button.tsx:42:3:Button');
    expect(result).toEqual({
      filePath: '/app/src/Button.tsx',
      line: 42,
      column: 3,
      componentName: 'Button',
      rawPath: '/app/src/Button.tsx:42:3:Button',
    });
  });
});
