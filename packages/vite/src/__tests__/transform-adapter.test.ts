import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { transformInspekt, type TransformOptions } from '../transform-adapter';

// @code-inspector/core's transformCode checks fs.existsSync(filePath) and
// short-circuits if the file isn't on disk. Tests therefore write fixtures.

let projectRoot: string;

beforeAll(() => {
  projectRoot = mkdtempSync(path.join(tmpdir(), 'inspekt-vite-test-'));
  mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
});

afterAll(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

function fixture(relPath: string, content: string): string {
  const full = path.join(projectRoot, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  return full;
}

function defaults(): TransformOptions {
  return { framework: 'react', root: projectRoot, pathType: 'relative' };
}

describe('transformInspekt (adapter over @code-inspector/core)', () => {
  it('injects data-insp-path on JSX elements', async () => {
    const code = `
export function Button({ label }) {
  return <button className="btn">{label}</button>;
}
`;
    const id = fixture('src/Button.tsx', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-insp-path=');
    expect(result!.code).toContain('Button.tsx');
  });

  it('skips non-JSX files', async () => {
    const code = `export const add = (a, b) => a + b;`;
    const id = fixture('src/utils.ts', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).toBeNull();
  });

  it('skips files already containing the attribute (idempotent re-runs)', async () => {
    const code = `
export function Button2() {
  return <button data-insp-path="existing">Click</button>;
}
`;
    const id = fixture('src/Button2.tsx', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).toBeNull();
  });

  it('handles self-closing JSX tags', async () => {
    const code = `
export function Icon() {
  return <img src="icon.png" />;
}
`;
    const id = fixture('src/Icon.tsx', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-insp-path=');
  });

  it('handles multiple JSX elements', async () => {
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
    const id = fixture('src/Layout.tsx', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).not.toBeNull();
    const matches = result!.code.match(/data-insp-path=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it('does not break on string literals containing <name>', async () => {
    const code = `
const REPO_TREE = [
  { name: 'pages/<name>/<name>.tsx' },
  { name: 'C:\\\\Users\\\\<you>\\\\AppData' },
];
export function Tree() {
  return <ul>{REPO_TREE.map((r) => <li>{r.name}</li>)}</ul>;
}
`;
    const id = fixture('src/Tree.tsx', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).not.toBeNull();
    expect(result!.code).toContain("'pages/<name>/<name>.tsx'");
    expect(result!.code).toContain("'C:\\\\Users\\\\<you>\\\\AppData'");
    expect(result!.code).toMatch(/<ul[^>]*data-insp-path/);
    expect(result!.code).toMatch(/<li[^>]*data-insp-path/);
  });

  it('does not break on template literals containing <Component>', async () => {
    const code = `
export function Cmd({ name }) {
  const tip = \`see <Component> docs for \${name}\`;
  return <code>{tip}</code>;
}
`;
    const id = fixture('src/Cmd.tsx', code);
    const result = await transformInspekt(code, id, defaults());
    expect(result).not.toBeNull();
    expect(result!.code).toContain('`see <Component> docs for ${name}`');
    expect(result!.code).toMatch(/<code[^>]*data-insp-path/);
  });

  it('uses absolute paths when configured', async () => {
    const code = `export function App() { return <div>Hello</div>; }`;
    const id = fixture('src/App.tsx', code);
    const result = await transformInspekt(code, id, { ...defaults(), pathType: 'absolute' });
    expect(result).not.toBeNull();
    expect(result!.code).toContain(id);
  });

  it('respects escapeTags', async () => {
    const code = `
export function LayoutWithEscape() {
  return (
    <div>
      <SkipMe>noop</SkipMe>
      <Important>tag me</Important>
    </div>
  );
}
`;
    const id = fixture('src/LayoutWithEscape.tsx', code);
    const result = await transformInspekt(code, id, { ...defaults(), escapeTags: ['SkipMe'] });
    expect(result).not.toBeNull();
    expect(result!.code).not.toMatch(/<SkipMe[^>]*data-insp-path/);
    expect(result!.code).toMatch(/<Important[^>]*data-insp-path/);
  });
});
