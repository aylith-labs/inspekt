#!/usr/bin/env node
// `inspekt-daemon` — start the Inspekt daemon in the foreground.
//
// Reads config from ~/.inspekt/config.json by default. Override with env vars:
//   INSPEKT_TOKEN, INSPEKT_HOST, INSPEKT_PORT, INSPEKT_QUEUE_PATH

import { startDaemon } from './index.js';

async function main(): Promise<void> {
  const config = {
    token: process.env['INSPEKT_TOKEN'],
    host: process.env['INSPEKT_HOST'],
    port: process.env['INSPEKT_PORT'] ? Number(process.env['INSPEKT_PORT']) : undefined,
    queuePath: process.env['INSPEKT_QUEUE_PATH'],
  };
  const { port, stop } = await startDaemon({
    ...(config.token ? { token: config.token } : {}),
    ...(config.host ? { host: config.host } : {}),
    ...(config.port ? { port: config.port } : {}),
    ...(config.queuePath ? { queuePath: config.queuePath } : {}),
  });
  // eslint-disable-next-line no-console
  console.log(`[inspekt-daemon] listening on http://127.0.0.1:${port}`);
  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log('[inspekt-daemon] shutting down');
    stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[inspekt-daemon]', err);
  process.exit(1);
});
