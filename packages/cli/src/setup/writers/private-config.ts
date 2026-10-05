import { promises as fs } from 'node:fs';

/** Preserve existing file/symlink semantics and restrict access before writing credentials. */
export async function writePrivateConfig(configPath: string, contents: string): Promise<void> {
  const file = await fs.open(configPath, 'a', 0o600);
  try {
    await file.chmod(0o600);
    await file.truncate(0);
    await file.writeFile(contents, 'utf8');
  } finally {
    await file.close();
  }
}
