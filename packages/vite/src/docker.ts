import fs from 'node:fs';
import path from 'node:path';

export function findComposeFile(root: string): string | null {
  const candidates = [
    'docker-compose.yaml',
    'docker-compose.yml',
    'compose.yaml',
    'compose.yml',
  ];

  for (const name of candidates) {
    const filePath = path.join(root, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export function parsePathMappings(composeFile: string): Record<string, string> {
  const content = fs.readFileSync(composeFile, 'utf-8');
  const mappings: Record<string, string> = {};
  const root = path.dirname(composeFile);

  // Simple YAML volume parsing — matches `- ./local:/container` patterns
  // This handles the common case without requiring a full YAML parser
  const volumeRe = /^\s*-\s+["']?([^:'"]+):([^:'"]+?)(?::(?:ro|rw))?["']?\s*$/gm;

  let match: RegExpExecArray | null;
  while ((match = volumeRe.exec(content)) !== null) {
    const localPath = match[1]!.trim();
    const containerPath = match[2]!.trim();

    // Skip node_modules and similar mounts
    if (containerPath.includes('node_modules')) continue;
    if (localPath.startsWith('/') && !localPath.startsWith('./')) continue; // Named volumes

    // Resolve local path relative to compose file
    const resolvedLocal = path.resolve(root, localPath);

    // Ensure paths end with /
    const normalizedContainer = containerPath.endsWith('/')
      ? containerPath
      : containerPath + '/';
    const normalizedLocal = resolvedLocal.endsWith('/')
      ? resolvedLocal
      : resolvedLocal + '/';

    mappings[normalizedContainer] = normalizedLocal;
  }

  return mappings;
}
