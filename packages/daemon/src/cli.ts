#!/usr/bin/env node
// `inspekt-daemon` — start the Inspekt daemon in the foreground.
//
// Reads config from ~/.inspekt/config.json by default. Override with env vars:
//   INSPEKT_TOKEN, INSPEKT_HOST, INSPEKT_PORT, INSPEKT_QUEUE_PATH

import { startDaemon } from './index.js';

/** Port 0 is legitimate (bind anywhere), so only a non-numeric value is rejected. */
function parsePort(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`INSPEKT_PORT must be a port number, got ${JSON.stringify(raw)}`);
  }
  return port;
}

async function main(): Promise<void> {
  const token = process.env['INSPEKT_TOKEN'];
  const host = process.env['INSPEKT_HOST'];
  const port = parsePort(process.env['INSPEKT_PORT']);
  const queuePath = process.env['INSPEKT_QUEUE_PATH'];

  const daemon = await startDaemon({
    ...(token ? { token } : {}),
    ...(host ? { host } : {}),
    ...(port !== undefined ? { port } : {}),
    ...(queuePath ? { queuePath } : {}),
  });
  console.log(`[inspekt-daemon] listening on http://${host ?? '127.0.0.1'}:${daemon.port}`);

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    console.log('[inspekt-daemon] shutting down');
    daemon
      .stop()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        console.error('[inspekt-daemon]', err);
        process.exit(1);
      });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  console.error('[inspekt-daemon]', err);
  process.exit(1);
});
