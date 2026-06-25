#!/usr/bin/env node
/**
 * Fetches metadata for every editor referenced by `EDITOR_META` in
 * `src/selects.ts` and writes the result to `src/editor-metadata.json`.
 *
 * Inspekt has no backend — this is run on demand and the JSON output is
 * committed. Re-run when editor home pages change or when adding new editors.
 *
 *   bun run --filter '@inspekt/chrome' fetch-metadata
 *
 * For each editor URL, we extract:
 *   - title       → og:title || <title>
 *   - description → og:description || <meta name="description">
 *   - siteName    → og:site_name || hostname.replace(/^www\./, '')
 *   - favicon     → <link rel="icon|shortcut icon|apple-touch-icon"> || /favicon.ico
 *   - image       → og:image || og:image:secure_url || <link rel="image_src">
 *
 * For each asset URL we HEAD-probe. 200 + image/* content-type → hot-link
 * (cheaper bundle, asset stays fresh). Anything else → download locally.
 *
 * The renderer side wraps `<img>` in `referrerpolicy="no-referrer"` so the
 * editor site sees no page context on hover.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..'); // packages/chrome/
const SRC_JSON = path.join(repoRoot, 'src', 'editor-metadata.json');
const OG_DIR = path.join(repoRoot, 'public', 'icons', 'editors', 'og');
const FAVICON_DIR = path.join(repoRoot, 'public', 'icons', 'editors', 'favicons');

// Kept in sync with src/selects.ts EDITOR_META.
const EDITORS = [
  // AI editors
  { key: 'cursor',          url: 'https://www.cursor.com/' },
  { key: 'windsurf',        url: 'https://windsurf.com/' },
  { key: 'trae',            url: 'https://www.trae.ai/' },
  { key: 'kiro',            url: 'https://kiro.dev/' },
  { key: 'antigravity',     url: 'https://antigravity.google/' },
  { key: 'pearai',          url: 'https://trypear.ai/' },
  { key: 'qoder',           url: 'https://qoder.com/' },
  { key: 'codebuddy',       url: 'https://copilot.tencent.com/' },

  // VS Code family
  { key: 'vscode',          url: 'https://code.visualstudio.com/' },
  { key: 'vscode-insiders', url: 'https://code.visualstudio.com/insiders/' },
  { key: 'vscodium',        url: 'https://vscodium.com/' },

  // JetBrains
  { key: 'idea',            url: 'https://www.jetbrains.com/idea/' },
  { key: 'webstorm',        url: 'https://www.jetbrains.com/webstorm/' },
  { key: 'phpstorm',        url: 'https://www.jetbrains.com/phpstorm/' },
  { key: 'pycharm',         url: 'https://www.jetbrains.com/pycharm/' },
  { key: 'rubymine',        url: 'https://www.jetbrains.com/ruby/' },
  { key: 'goland',          url: 'https://www.jetbrains.com/go/' },
  { key: 'clion',           url: 'https://www.jetbrains.com/clion/' },
  { key: 'rider',           url: 'https://www.jetbrains.com/rider/' },

  // Other
  { key: 'sublime',         url: 'https://www.sublimetext.com/' },
  { key: 'zed',             url: 'https://zed.dev/' },
];

const UA =
  'Mozilla/5.0 (X11; Linux x86_64; Inspekt-build) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.text();
}

function metaAttr(root, name) {
  const el =
    root.querySelector(`meta[property="${name}"]`) ||
    root.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute('content')?.trim() || null;
}

function pickFaviconHref(root) {
  // Prefer larger / svg over default ico.
  const candidates = root.querySelectorAll(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );
  let best = null;
  let bestScore = -1;
  for (const link of candidates) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const type = (link.getAttribute('type') || '').toLowerCase();
    const sizesAttr = link.getAttribute('sizes') || '';
    const size = parseInt((sizesAttr.match(/\d+/) || ['0'])[0], 10) || 0;
    let score = size;
    if (type.includes('svg')) score += 256; // svg wins on size-independence
    if (link.getAttribute('rel') === 'apple-touch-icon') score += 32;
    if (score > bestScore) {
      bestScore = score;
      best = href;
    }
  }
  return best;
}

function extractMetadata(html, pageUrl) {
  const root = parse(html);
  const resolve = (href) => (href ? new URL(href, pageUrl).href : null);

  return {
    title: metaAttr(root, 'og:title') || root.querySelector('title')?.text?.trim() || null,
    description: metaAttr(root, 'og:description') || metaAttr(root, 'description') || null,
    siteName: metaAttr(root, 'og:site_name') || new URL(pageUrl).hostname.replace(/^www\./, ''),
    favicon: resolve(pickFaviconHref(root)) || new URL('/favicon.ico', pageUrl).href,
    image:
      resolve(metaAttr(root, 'og:image:secure_url')) ||
      resolve(metaAttr(root, 'og:image')) ||
      resolve(root.querySelector('link[rel="image_src"]')?.getAttribute('href')),
  };
}

const VALID_IMG_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];

async function probe(url) {
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, Referer: '' },
      redirect: 'follow',
    });
    // Some hosts disallow HEAD — retry GET.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    }
    if (!res.ok) return { ok: false };
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!VALID_IMG_TYPES.includes(ct)) return { ok: false, reason: `content-type ${ct}` };
    return { ok: true, contentType: ct };
  } catch (err) {
    return { ok: false, reason: String(err.message || err) };
  }
}

function extForContentType(ct) {
  switch (ct) {
    case 'image/png':       return 'png';
    case 'image/jpeg':      return 'jpg';
    case 'image/webp':      return 'webp';
    case 'image/gif':       return 'gif';
    case 'image/svg+xml':   return 'svg';
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon': return 'ico';
    default:                return 'bin';
  }
}

async function download(url, dir, baseName) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!VALID_IMG_TYPES.includes(ct)) throw new Error(`download ${url} -> bad content-type ${ct}`);
  const ext = extForContentType(ct);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(dir, { recursive: true });
  const filename = `${baseName}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buf);
  return filename;
}

/**
 * For each asset URL: prefer hot-linking; download if probe fails. Returns
 * either the original absolute URL or a repo-relative path.
 */
async function resolveAsset(url, dir, baseName, publicSubpath) {
  if (!url) return null;
  const probed = await probe(url);
  if (probed.ok) return url;
  try {
    const filename = await download(url, dir, baseName);
    return `${publicSubpath}/${filename}`;
  } catch (err) {
    console.warn(`  ! download ${url} failed: ${err.message || err}`);
    return null;
  }
}

async function run() {
  const out = {};
  for (const ed of EDITORS) {
    console.log(`\n→ ${ed.key} (${ed.url})`);
    try {
      const html = await fetchText(ed.url);
      const meta = extractMetadata(html, ed.url);

      const [favicon, image] = await Promise.all([
        resolveAsset(meta.favicon, FAVICON_DIR, ed.key, 'icons/editors/favicons'),
        resolveAsset(meta.image, OG_DIR, ed.key, 'icons/editors/og'),
      ]);

      out[ed.key] = {
        title: meta.title,
        description: meta.description,
        siteName: meta.siteName,
        favicon,
        image,
      };
      const summary = [
        meta.title ? 'title' : null,
        meta.description ? 'desc' : null,
        favicon ? (favicon.startsWith('http') ? 'favicon(hot)' : 'favicon(local)') : null,
        image ? (image.startsWith('http') ? 'image(hot)' : 'image(local)') : null,
      ]
        .filter(Boolean)
        .join(' · ');
      console.log(`  ✓ ${summary}`);
    } catch (err) {
      console.error(`  ✗ ${ed.key}: ${err.message || err}`);
      out[ed.key] = null;
    }
  }

  await fs.writeFile(SRC_JSON, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${SRC_JSON}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
