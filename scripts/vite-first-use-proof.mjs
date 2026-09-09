// Clean published-package consumer. No extension, daemon, editor or account setup.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const value = (key) => (args.includes(key) ? args[args.indexOf(key) + 1] : undefined);
const fixture = value('--fixture') ?? (await mkdtemp(path.join(tmpdir(), 'inspekt-first-use-')));
const run = path.join(fixture, 'runs', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(run, { recursive: true });
const npm = value('--npm') ?? 'C:/Users/steve/AppData/Local/mise/shims/npm.exe';
const playwright =
  value('--playwright') ??
  'C:/Users/steve/projects/aylith-labs/dashcam/node_modules/playwright/index.mjs';
const receipt = {
  startedAt: new Date().toISOString(),
  fixture,
  node: process.version,
  platform: process.platform,
  checks: [],
  errors: [],
  requests: [],
};
receipt.mode = value('--local-tarballs') ? 'unreleased-local-package' : 'published-package';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const save = () =>
  writeFile(path.join(run, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
const check = (name, condition, detail) => {
  receipt.checks.push({ name, passed: !!condition, detail });
  assert.ok(condition, name);
};
async function command(exe, argv, label) {
  const child = spawn(exe, argv, {
    cwd: fixture,
    windowsHide: true,
    env: { ...process.env, npm_config_userconfig: path.join(fixture, '.npmrc') },
  });
  let output = '';
  child.stdout.on('data', (v) => {
    output += v;
  });
  child.stderr.on('data', (v) => {
    output += v;
  });
  const timeout = setTimeout(() => child.kill(), 120_000);
  try {
    const [code] = await once(child, 'exit');
    await writeFile(path.join(run, `${label}.log`), output);
    check(`${label} exits successfully`, code === 0, { code });
  } finally {
    clearTimeout(timeout);
  }
}

let server;
let browser;
let context;
let page;
try {
  if (!value('--fixture')) {
    await mkdir(path.join(fixture, 'src'));
    await writeFile(
      path.join(fixture, '.npmrc'),
      'registry=https://registry.npmjs.org/\naudit=false\nfund=false\nignore-scripts=true\n',
    );
    const dependencies = {
      '@aylith/inspekt-vite': '0.2.1',
      vite: '8.2.2',
      '@vitejs/plugin-react': '6.1.1',
      react: '19.2.8',
      'react-dom': '19.2.8',
    };
    if (value('--local-tarballs')) {
      dependencies['@aylith/inspekt-core'] =
        `file:${path.resolve(value('--local-tarballs'), 'aylith-inspekt-core-0.4.0.tgz').replaceAll('\\', '/')}`;
      dependencies['@aylith/inspekt-vite'] =
        `file:${path.resolve(value('--local-tarballs'), 'aylith-inspekt-vite-0.2.1.tgz').replaceAll('\\', '/')}`;
    }
    await writeFile(
      path.join(fixture, 'package.json'),
      JSON.stringify(
        {
          name: 'inspekt-first-use-fixture',
          private: true,
          type: 'module',
          devDependencies: dependencies,
        },
        null,
        2,
      ) + '\n',
    );
    await writeFile(
      path.join(fixture, 'index.html'),
      '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inspekt first use</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n',
    );
    await writeFile(
      path.join(fixture, 'src/main.jsx'),
      `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
function App() {
  const [count, setCount] = useState(0);
  return <main style={{ padding: 32, fontFamily: 'system-ui' }}>
    <h1>Review a local component</h1>
    <p>Ordinary clicks still work. Ctrl+Alt+Click inspects the source.</p>
    <button onClick={() => setCount(count + 1)}>Capture count: {count}</button>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
`,
    );
    await writeFile(
      path.join(fixture, 'vite.config.mjs'),
      `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { inspekt } from '@aylith/inspekt-vite';
export default defineConfig({ plugins: [react(), inspekt()], server: { host: '127.0.0.1', port: 0, open: false } });
`,
    );
    console.log(JSON.stringify({ phase: 'install', fixture }));
    await command(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], 'install');
  }
  const lock = JSON.parse(await readFile(path.join(fixture, 'package-lock.json'), 'utf8'));
  receipt.packages = Object.fromEntries(
    Object.entries(lock.packages)
      .filter(
        ([key]) =>
          key.includes('@aylith/') || ['node_modules/vite', 'node_modules/react'].includes(key),
      )
      .map(([key, p]) => [
        key,
        { version: p.version, resolved: p.resolved, integrity: p.integrity },
      ]),
  );
  receipt.mode = Object.values(receipt.packages).some((p) => p.resolved?.startsWith('file:'))
    ? 'unreleased-local-package'
    : 'published-package';
  receipt.lockSha256 = hash(await readFile(path.join(fixture, 'package-lock.json')));
  if (args.includes('--prepare-only')) {
    receipt.preparedOnly = true;
  } else {
    const { createServer, build, preview } = await import(
      pathToFileURL(path.join(fixture, 'node_modules/vite/dist/node/index.js'))
    );
    const { chromium } = await import(pathToFileURL(playwright));
    server = await createServer({
      root: fixture,
      configFile: path.join(fixture, 'vite.config.mjs'),
    });
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    receipt.origin = origin;
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
      recordVideo: { dir: path.join(run, 'capture') },
    });
    // Do not let a published default probe an unrelated service on this computer.
    const allowedOrigins = new Set([origin]);
    receipt.blockedRequests = [];
    await context.route('**/*', (route) => {
      if (allowedOrigins.has(new URL(route.request().url()).origin)) return route.continue();
      receipt.blockedRequests.push(route.request().url());
      return route.abort('blockedbyclient');
    });
    page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (error) => receipt.errors.push(error.message));
    page.on('request', (r) => receipt.requests.push({ method: r.method(), url: r.url() }));
    await page.goto(origin);
    await page.locator('button').filter({ hasText: 'Capture count: 0' }).waitFor();
    await page.waitForFunction(() => !!window.__INSPEKT__);
    check(
      'installed runtime mounts without extension or daemon',
      (await page.locator('inspekt-root').count()) === 1,
    );
    const target = page.getByRole('button', { name: 'Capture count: 0', exact: true });
    await target.click();
    check(
      'ordinary page action stays usable',
      (await page.getByRole('button', { name: 'Capture count: 1', exact: true }).count()) === 1,
    );
    const clicked = page.getByRole('button', { name: 'Capture count: 1', exact: true });
    receipt.sourceAttribute = await clicked.getAttribute('data-insp-path');
    check(
      'plugin injects actual source location',
      !!receipt.sourceAttribute && receipt.sourceAttribute.includes('main.jsx'),
      receipt.sourceAttribute,
    );
    await clicked.click({ modifiers: ['Control', 'Alt'] });
    const popover = page.locator('.inspekt-popover');
    await popover.waitFor({ state: 'visible' });
    check('modifier inspection does not activate page action', (await clicked.count()) === 1);
    receipt.popover = await popover.innerText();
    await page.screenshot({ path: path.join(run, 'inspected.png') });
    check(
      'popover identifies the clicked source',
      receipt.popover.includes('main.jsx'),
      receipt.popover,
    );
    await page.getByRole('button', { name: 'Show source ▾', exact: true }).click();
    check(
      'snippet comes from actual source',
      (await page.locator('.inspekt-snippet-body').innerText()).includes('setCount'),
    );
    await page.screenshot({ path: path.join(run, 'source-open.png') });
    await page.keyboard.press('Escape');
    check('Escape closes inspector', await popover.isHidden());
    await clicked.click({ modifiers: ['Control', 'Alt'] });
    await page.getByRole('button', { name: 'Copy Path', exact: true }).click();
    receipt.clipboard = await page.evaluate(() => navigator.clipboard.readText());
    check('copy path gives source reference', receipt.clipboard.includes('main.jsx'));
    await page.reload();
    await page.waitForFunction(() => !!window.__INSPEKT__);
    await page
      .getByRole('button', { name: 'Capture count: 0', exact: true })
      .click({ modifiers: ['Control', 'Alt'] });
    check('fresh reload can inspect again', await popover.isVisible());
    await page.keyboard.press('Escape');
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole('button', { name: 'Capture count: 0', exact: true })
      .click({ modifiers: ['Control', 'Alt'] });
    await page.getByRole('button', { name: 'Show source ▾', exact: true }).click();
    await page.waitForFunction(() => {
      const el = document
        .querySelector('inspekt-root')
        ?.shadowRoot?.querySelector('.inspekt-popover');
      const r = el?.getBoundingClientRect();
      return !!r && r.right <= innerWidth && r.bottom <= innerHeight;
    });
    receipt.narrow = await popover.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        viewport: innerWidth,
        height: innerHeight,
        document: document.documentElement.scrollWidth,
      };
    });
    await page.screenshot({ path: path.join(run, 'narrow-source.png'), fullPage: true });
    check(
      'narrow inspector remains inside viewport',
      receipt.narrow.left >= 0 &&
        receipt.narrow.right <= receipt.narrow.viewport &&
        receipt.narrow.bottom <= receipt.narrow.height,
      receipt.narrow,
    );
    await page.setViewportSize({ width: 320, height: 640 });
    await page.waitForFunction(() => {
      const r = document
        .querySelector('inspekt-root')
        ?.shadowRoot?.querySelector('.inspekt-popover')
        ?.getBoundingClientRect();
      return !!r && r.right <= innerWidth && r.bottom <= innerHeight;
    });
    check('open inspector repositions after viewport resize', await popover.isVisible());
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Alt+i');
    check('keyboard toggle disables inspector', (await page.locator('inspekt-root').count()) === 0);
    await page.keyboard.press('Control+Alt+i');
    check(
      'keyboard toggle re-enables inspector',
      (await page.locator('inspekt-root').count()) === 1,
    );
    const escaped = await fetch(`${origin}/__inspekt/snippet?file=../outside.txt&line=1`);
    check('outside-root snippet denied', escaped.status === 403, escaped.status);
    check('no unexpected browser errors', receipt.errors.length === 0, receipt.errors);
    await page.goto('about:blank');
    await server.close();
    server = undefined;
    await build({
      root: fixture,
      configFile: path.join(fixture, 'vite.config.mjs'),
      logLevel: 'warn',
    });
    const production = await readFile(path.join(fixture, 'dist/index.html'), 'utf8');
    receipt.productionHtml = production;
    const prod = await preview({
      root: fixture,
      configFile: path.join(fixture, 'vite.config.mjs'),
      preview: { host: '127.0.0.1', port: 0, open: false },
    });
    server = { close: () => new Promise((resolve) => prod.httpServer.close(resolve)) };
    const prodOrigin = `http://127.0.0.1:${prod.httpServer.address().port}`;
    allowedOrigins.add(prodOrigin);
    await page.goto(prodOrigin);
    await page.getByRole('button', { name: 'Capture count: 0', exact: true }).waitFor();
    check(
      'production contains no injected inspector',
      (await page.locator('inspekt-root').count()) === 0 && !production.includes('inspekt-init'),
    );
    check(
      'complete dev and production journey has no page errors',
      receipt.errors.length === 0,
      receipt.errors,
    );
    check(
      'runtime requests only its actual fixture origin',
      receipt.blockedRequests.length === 0,
      receipt.blockedRequests,
    );
    receipt.notTested = [
      'external editor launch',
      'daemon or agent enrollment',
      'other operating systems and frameworks',
      'public package release',
    ];
    receipt.passed = true;
  }
} catch (error) {
  if (page) await page.screenshot({ path: path.join(run, 'failure.png') }).catch(() => {});
  receipt.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  await context?.close();
  await browser?.close();
  await server?.close();
  receipt.finishedAt = new Date().toISOString();
  await save();
  console.log(
    JSON.stringify({
      fixture,
      receipt: path.join(run, 'receipt.json'),
      passed: receipt.passed,
      failure: receipt.failure?.message,
      preparedOnly: receipt.preparedOnly,
    }),
  );
}
