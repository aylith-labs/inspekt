import { inspekt } from '@aylith/inspekt-vite';
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Inspekt',
  description:
    'Click any element in your browser → send context to your agent. The click-to-agent devtool for the agentic-CLI era.',
  // The landing owns the Pages root, so the docs are served one level down.
  // `srcDir` keeps every published page URL as `/inspekt/docs/<page>`.
  base: '/inspekt/docs/',
  srcDir: 'docs',
  cleanUrls: true,
  lastUpdated: true,
  // `true` = system preference is the default on first visit; the user's
  // explicit choice (via our three-state switcher) is persisted in
  // localStorage and can be reset to "System" any time.
  appearance: true,

  head: [
    ['link', { rel: 'icon', href: '/inspekt/docs/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { property: 'og:title', content: 'Inspekt' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Click any element, send context to your agent. Multi-framework, multi-agent.',
      },
    ],
  ],

  vite: {
    plugins: [
      // Inject `data-insp-path` attributes into the theme's Vue components so
      // the Chrome extension (and curious visitors) can click through to the
      // source even on the deployed gh-pages build. `runtimeInjection: false`
      // keeps `@aylith/inspekt-core` out of the bundle — the extension is the only
      // runtime consumer here.
      inspekt({
        framework: 'vue',
        enableInProduction: true,
        runtimeInjection: false,
      }),
    ],
  },

  themeConfig: {
    logo: '/logo.svg',
    // No GitHub entry here — the GitHubLink component injected via the
    // `nav-bar-content-after` slot replaces both the nav text and the
    // default `socialLinks` icon, so we have exactly one anchor.
    nav: [
      // Relative so it resolves to the landing at the Pages root without
      // hard-coding the host; `base` is only prepended to links starting `/`.
      // `target` keeps the SPA router out of it — the landing is a separate
      // app, and routing to it in-place lands back on the docs home instead.
      { text: 'Home', link: '../', target: '_self' },
      { text: 'Docs', link: '/install' },
      { text: 'Agents', link: '/agent-integration' },
    ],
    sidebar: {
      '/': [
        {
          text: 'Getting started',
          items: [
            { text: 'Install', link: '/install' },
            { text: 'Quick start', link: '/quick-start' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'Source snippets', link: '/snippets' },
            { text: 'Chrome extension', link: '/chrome-extension' },
            { text: 'Agent integration', link: '/agent-integration' },
            { text: 'Source-map fallback', link: '/source-maps' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API', link: '/api' },
            { text: 'Comparison', link: '/comparison' },
          ],
        },
      ],
    },
    // socialLinks removed — replaced by the custom GitHubLink component in
    // the nav-bar-content-after slot (theme/index.ts).
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/aylith-labs/inspekt/edit/main/site/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'MIT licensed',
      copyright: '© 2026 Steven Prybylynskyi',
    },
  },
});
