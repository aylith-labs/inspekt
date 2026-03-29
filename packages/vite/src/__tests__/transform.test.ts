import { describe, it, expect } from 'vitest';
import { transformJSX, type TransformOptions } from '../transform';

const defaultOptions: TransformOptions = {
  framework: 'react',
  root: '/home/user/project',
  pathType: 'relative',
  attribute: 'data-devlens-path',
  include: ['**/*.tsx'],
  exclude: [],
};

describe('transformJSX', () => {
  it('injects data-devlens-path on JSX elements', () => {
    const code = `
export function Button({ label }) {
  return <button className="btn">{label}</button>;
}
`;
    const result = transformJSX(code, '/home/user/project/src/Button.tsx', defaultOptions);
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-devlens-path=');
    expect(result!.code).toContain('src/Button.tsx');
  });

  it('skips files without JSX', () => {
    const code = `export const add = (a, b) => a + b;`;
    const result = transformJSX(code, '/home/user/project/src/utils.ts', defaultOptions);
    expect(result).toBeNull();
  });

  it('skips files already containing the attribute', () => {
    const code = `
export function Button() {
  return <button data-devlens-path="existing">Click</button>;
}
`;
    const result = transformJSX(code, '/home/user/project/src/Button.tsx', defaultOptions);
    expect(result).toBeNull();
  });

  it('handles self-closing JSX tags', () => {
    const code = `
export function Icon() {
  return <img src="icon.png" />;
}
`;
    const result = transformJSX(code, '/home/user/project/src/Icon.tsx', defaultOptions);
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-devlens-path=');
  });

  it('uses relative paths', () => {
    const result = transformJSX(
      `export function App() { return <div>Hello</div>; }`,
      '/home/user/project/src/App.tsx',
      defaultOptions,
    );
    expect(result).not.toBeNull();
    expect(result!.code).toContain('src/App.tsx');
    expect(result!.code).not.toContain('/home/user/project');
  });

  it('uses absolute paths when configured', () => {
    const result = transformJSX(
      `export function App() { return <div>Hello</div>; }`,
      '/home/user/project/src/App.tsx',
      { ...defaultOptions, pathType: 'absolute' },
    );
    expect(result).not.toBeNull();
    expect(result!.code).toContain('/home/user/project/src/App.tsx');
  });

  it('generates a sourcemap', () => {
    const code = `export function App() { return <div>Hello</div>; }`;
    const result = transformJSX(code, '/home/user/project/src/App.tsx', defaultOptions);
    expect(result).not.toBeNull();
    expect(result!.map).toBeDefined();
    expect(result!.map.sources).toContain('/home/user/project/src/App.tsx');
  });

  it('handles multiple JSX elements', () => {
    const code = `
export function Layout() {
  return (
    <div>
      <header>Title</header>
      <main>Content</main>
    </div>
  );
}
`;
    const result = transformJSX(code, '/home/user/project/src/Layout.tsx', defaultOptions);
    expect(result).not.toBeNull();
    // Should inject on div, header, and main
    const matches = result!.code.match(/data-devlens-path=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it('handles JSX with arrow functions in attributes', () => {
    const code = `
export function SearchBar() {
  const [query, setQuery] = useState('');
  return (
    <div style={{ display: 'flex' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ flex: 1, padding: '8px' }}
      />
      <button onClick={() => console.log('click')}>
        Search
      </button>
    </div>
  );
}
`;
    const result = transformJSX(code, '/home/user/project/src/SearchBar.tsx', defaultOptions);
    expect(result).not.toBeNull();
    // Must not break arrow function syntax
    expect(result!.code).not.toContain('= data-devlens-path');
    // Should have injected attributes on div, input, and button
    const matches = result!.code.match(/data-devlens-path=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it('handles JSX with template literals in attributes', () => {
    const code = `
export function Tag({ name }) {
  return <span className={\`tag-\${name}\`}>{name}</span>;
}
`;
    const result = transformJSX(code, '/home/user/project/src/Tag.tsx', defaultOptions);
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-devlens-path=');
  });

  it('transforms Vue SFC template elements', () => {
    const code = `
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <MyButton @click="handleClick">Submit</MyButton>
  </div>
</template>
<script setup>
const title = 'Hello';
</script>
`;
    const result = transformJSX(code, '/home/user/project/src/Page.vue', defaultOptions);
    expect(result).not.toBeNull();
    // Should inject on div, h1, MyButton — not template/script/style
    const matches = result!.code.match(/data-devlens-path=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
    // template and script tags should NOT have the attribute
    expect(result!.code).not.toMatch(/<template[^>]*data-devlens-path/);
    expect(result!.code).not.toMatch(/<script[^>]*data-devlens-path/);
  });

  it('transforms Svelte template elements', () => {
    const code = `
<div class="wrapper">
  <h1>{title}</h1>
  <button on:click={handleClick}>Click me</button>
</div>
<script>
  let title = 'Hello';
</script>
<style>
  .wrapper { padding: 8px; }
</style>
`;
    const result = transformJSX(code, '/home/user/project/src/Page.svelte', defaultOptions);
    expect(result).not.toBeNull();
    const matches = result!.code.match(/data-devlens-path=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
    expect(result!.code).not.toMatch(/<script[^>]*data-devlens-path/);
    expect(result!.code).not.toMatch(/<style[^>]*data-devlens-path/);
  });
});
