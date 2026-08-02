#!/usr/bin/env bun
// Checks that what each publishable package *declares* matches what it actually
// ships: every `main`/`module`/`types`/`bin`/`exports` target exists in the built
// output, and every one of those files survives the `files` allowlist into the
// tarball. Run after `bun run build`.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

interface Manifest {
  name: string;
  version: string;
  private?: boolean;
  main?: string;
  module?: string;
  types?: string;
  bin?: Record<string, string>;
  exports?: Record<string, string | Record<string, string>>;
  files?: string[];
}

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const CONDITION_ORDER = ['types', 'import', 'require', 'default'];

const failures: string[] = [];

function fail(pkg: string, message: string): void {
  failures.push(`${pkg}: ${message}`);
}

/** Every relative path the manifest promises a consumer can resolve. */
function declaredTargets(manifest: Manifest): { label: string; target: string }[] {
  const targets: { label: string; target: string }[] = [];

  for (const field of ['main', 'module', 'types'] as const) {
    const value = manifest[field];
    if (value) targets.push({ label: field, target: value });
  }

  for (const [command, target] of Object.entries(manifest.bin ?? {})) {
    targets.push({ label: `bin.${command}`, target });
  }

  for (const [subpath, value] of Object.entries(manifest.exports ?? {})) {
    if (typeof value === 'string') {
      targets.push({ label: `exports["${subpath}"]`, target: value });
      continue;
    }
    for (const [condition, target] of Object.entries(value)) {
      targets.push({ label: `exports["${subpath}"].${condition}`, target });
    }
  }

  return targets;
}

/**
 * npm's `files` allowlist semantics, narrowed to the shapes this repo uses: a
 * bare directory name includes the whole tree, and a `!`-prefixed pattern
 * excludes matches. Returns true when the file would land in the tarball.
 */
function isPacked(relativePath: string, files: string[] | undefined): boolean {
  if (!files || files.length === 0) return true;

  let included = false;
  for (const entry of files) {
    const negated = entry.startsWith('!');
    const pattern = negated ? entry.slice(1) : entry;
    if (!matches(relativePath, pattern)) continue;
    if (negated) return false;
    included = true;
  }
  return included;
}

function matches(relativePath: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return relativePath === pattern || relativePath.startsWith(`${pattern}/`);
  }
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') return '(?:[^/]+(?:/[^/]+)*)?';
      return segment
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');
    })
    .join('/')
    // `a/**/b` must also match `a/b`.
    .replace(/\/\(\?:\[\^\/\]\+\(\?:\/\[\^\/\]\+\)\*\)\?\//g, '/(?:.+/)?');
  return new RegExp(`^${source}$`).test(relativePath);
}

function verifyPackage(dir: string): void {
  const manifestPath = path.join(dir, 'package.json');
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  if (manifest.private) return;

  const label = manifest.name;
  const targets = declaredTargets(manifest);
  if (targets.length === 0) {
    // Content-only packages (the skill bundle) declare no entrypoints.
    for (const entry of manifest.files ?? []) {
      if (entry.startsWith('!')) continue;
      if (!existsSync(path.join(dir, entry))) fail(label, `files entry "${entry}" does not exist`);
    }
    return;
  }

  for (const { label: field, target } of targets) {
    if (!target.startsWith('./')) {
      fail(label, `${field} must be a relative specifier, got "${target}"`);
      continue;
    }
    const relativePath = target.slice(2);
    const absolute = path.join(dir, relativePath);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      fail(label, `${field} points at "${target}" which the build did not produce`);
      continue;
    }
    if (!isPacked(relativePath, manifest.files)) {
      fail(label, `${field} points at "${target}", which the files allowlist excludes`);
    }
    if (field.endsWith('types') || field === 'types') {
      if (!relativePath.endsWith('.d.ts')) {
        fail(label, `${field} should point at a .d.ts file, got "${target}"`);
      }
    }
  }

  // A consumer with `moduleResolution: bundler` matches conditions in order, so
  // `types` has to come before the runtime conditions to be seen at all.
  for (const [subpath, value] of Object.entries(manifest.exports ?? {})) {
    if (typeof value === 'string') continue;
    const conditions = Object.keys(value);
    const ranked = conditions.map((condition) => CONDITION_ORDER.indexOf(condition));
    if (ranked.some((rank, index) => index > 0 && rank < (ranked[index - 1] as number))) {
      fail(label, `exports["${subpath}"] lists conditions out of order: ${conditions.join(', ')}`);
    }
  }

  for (const [command, target] of Object.entries(manifest.bin ?? {})) {
    const absolute = path.join(dir, target.replace(/^\.\//, ''));
    if (!existsSync(absolute)) continue;
    const firstLine = readFileSync(absolute, 'utf8').split('\n', 1)[0] ?? '';
    if (!firstLine.startsWith('#!')) {
      fail(label, `bin.${command} ("${target}") has no shebang, so npm's shim cannot run it`);
    }
  }
}

for (const entry of readdirSync(PACKAGES_DIR)) {
  const dir = path.join(PACKAGES_DIR, entry);
  if (statSync(dir).isDirectory()) verifyPackage(dir);
}

if (failures.length > 0) {
  console.error('Published-surface check failed:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Published-surface check passed for every publishable package.');
