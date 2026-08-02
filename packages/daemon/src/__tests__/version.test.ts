import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../version';

describe('VERSION', () => {
  it('matches the version this package publishes', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { version: string };
    expect(VERSION).toBe(manifest.version);
  });
});
