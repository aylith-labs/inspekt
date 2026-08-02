import { describe, expect, it } from 'vitest';
import { isPathSelected, matchesGlob } from '../glob';

describe('matchesGlob', () => {
  it('matches a single segment with *', () => {
    expect(matchesGlob('Button.tsx', '*.tsx')).toBe(true);
    expect(matchesGlob('src/Button.tsx', '*.tsx')).toBe(false);
  });

  it('matches any depth with **, including zero segments', () => {
    expect(matchesGlob('App.test.tsx', '**/*.test.*')).toBe(true);
    expect(matchesGlob('src/App.test.tsx', '**/*.test.*')).toBe(true);
    expect(matchesGlob('src/deep/nested/App.test.tsx', '**/*.test.*')).toBe(true);
    expect(matchesGlob('src/App.tsx', '**/*.test.*')).toBe(false);
  });

  it('expands brace alternatives', () => {
    for (const ext of ['tsx', 'jsx', 'vue', 'svelte', 'astro']) {
      expect(matchesGlob(`src/App.${ext}`, '**/*.{tsx,jsx,vue,svelte,astro}')).toBe(true);
    }
    expect(matchesGlob('src/App.css', '**/*.{tsx,jsx,vue,svelte,astro}')).toBe(false);
  });

  it('supports globs inside brace alternatives', () => {
    expect(matchesGlob('src/index.stories.ts', '**/{*.stories.*,*.spec.*}')).toBe(true);
    expect(matchesGlob('src/index.ts', '**/{*.stories.*,*.spec.*}')).toBe(false);
  });

  it('matches a whole directory subtree', () => {
    expect(matchesGlob('node_modules/react/index.jsx', 'node_modules/**')).toBe(true);
    expect(matchesGlob('src/node_modules_helper.tsx', 'node_modules/**')).toBe(false);
  });

  it('matches ? against exactly one character', () => {
    expect(matchesGlob('a.tsx', '?.tsx')).toBe(true);
    expect(matchesGlob('ab.tsx', '?.tsx')).toBe(false);
  });

  it('treats a dot as a literal, not a regex wildcard', () => {
    expect(matchesGlob('srcXApp.tsx', 'src/App.tsx')).toBe(false);
  });

  it('normalizes Windows separators before matching', () => {
    expect(matchesGlob('src\\components\\App.tsx', '**/*.tsx')).toBe(true);
  });
});

describe('isPathSelected', () => {
  const include = ['**/*.{tsx,jsx,vue,svelte,astro}'];
  const exclude = ['node_modules/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*'];

  it('selects a file that matches include and no exclude', () => {
    expect(isPathSelected('src/App.tsx', include, exclude)).toBe(true);
    expect(isPathSelected('App.tsx', include, exclude)).toBe(true);
  });

  it('rejects a file that matches no include pattern', () => {
    expect(isPathSelected('src/styles.css', include, exclude)).toBe(false);
  });

  it('rejects an excluded file even when it matches include', () => {
    expect(isPathSelected('src/App.test.tsx', include, exclude)).toBe(false);
    expect(isPathSelected('App.test.tsx', include, exclude)).toBe(false);
    expect(isPathSelected('node_modules/pkg/App.tsx', include, exclude)).toBe(false);
  });

  it('treats an empty include list as no restriction', () => {
    expect(isPathSelected('src/styles.css', [], exclude)).toBe(true);
    expect(isPathSelected('src/App.test.tsx', [], exclude)).toBe(false);
  });

  it('honors a caller-supplied include that narrows the default set', () => {
    expect(isPathSelected('src/App.tsx', ['src/**'], [])).toBe(true);
    expect(isPathSelected('lib/App.tsx', ['src/**'], [])).toBe(false);
  });
});
