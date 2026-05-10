import type { IncomingMessage, ServerResponse } from 'node:http';
import { openInEditor } from '@inspekt/cli';

export interface InspektServerOptions {
  editor: string;
  pathMapping: Record<string, string>;
  root: string;
}

export function handleInspektRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: InspektServerOptions,
): boolean {
  if (req.url !== '/__inspekt/open' || req.method !== 'POST') {
    return false;
  }

  let body = '';
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body) as {
        file: string;
        line?: number;
        column?: number;
        editor?: string;
      };

      let filePath = data.file;

      // Apply path mapping
      for (const [containerPath, hostPath] of Object.entries(options.pathMapping)) {
        if (filePath.startsWith(containerPath)) {
          filePath = filePath.replace(containerPath, hostPath);
          break;
        }
      }

      // Resolve relative paths
      if (!filePath.startsWith('/')) {
        filePath = `${options.root}/${filePath}`;
      }

      openInEditor({
        file: filePath,
        line: data.line,
        column: data.column,
        editor: data.editor ?? options.editor,
      });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });

  return true;
}

export function corsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.method === 'OPTIONS' && req.url?.startsWith('/__inspekt/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }
  return false;
}
