// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseSourceAttribute,
  findSourceAttribute,
  findClosestSource,
  resolveElementSource,
} from '../source-detector';

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

describe('findSourceAttribute', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reads data-insp-path', () => {
    document.body.innerHTML = '<div data-insp-path="src/A.tsx:1:1:A">x</div>';
    const el = document.querySelector('div') as HTMLElement;
    expect(findSourceAttribute(el)).toBe('src/A.tsx:1:1:A');
  });

  it('returns null when the attribute is absent', () => {
    document.body.innerHTML = '<div>no source</div>';
    const el = document.querySelector('div') as HTMLElement;
    expect(findSourceAttribute(el)).toBeNull();
  });
});

describe('findClosestSource', () => {
  it('walks up the DOM tree to find the nearest ancestor with a source attribute', () => {
    document.body.innerHTML =
      '<section data-insp-path="src/Section.tsx:5:1:Section"><div><span class="leaf">leaf</span></div></section>';
    const leaf = document.querySelector('.leaf') as HTMLElement;
    const hit = findClosestSource(leaf);
    expect(hit).not.toBeNull();
    expect(hit!.element.tagName.toLowerCase()).toBe('section');
    expect(hit!.source.componentName).toBe('Section');
  });
});

describe('resolveElementSource (fiber → attribute chain)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('falls back to the DOM-attribute path when fiber detection returns null', async () => {
    // bippy resolves but no fiber found for this element — typical in jsdom/happy-dom.
    document.body.innerHTML = '<div data-insp-path="src/X.tsx:10:1:X">x</div>';
    const el = document.querySelector('div') as HTMLElement;
    const result = await resolveElementSource(el);
    expect(result).not.toBeNull();
    expect(result!.from).toBe('attribute');
    expect(result!.source.filePath).toBe('src/X.tsx');
    expect(result!.source.line).toBe(10);
  });

  it('returns null when neither fiber nor DOM-attribute source is available', async () => {
    document.body.innerHTML = '<div>plain</div>';
    const el = document.querySelector('div') as HTMLElement;
    const result = await resolveElementSource(el);
    expect(result).toBeNull();
  });
});
