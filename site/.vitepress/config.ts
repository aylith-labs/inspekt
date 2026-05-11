import { defineConfig } from 'vitepress';
import { inspekt } from '@inspekt/vite';

export default defineConfig({
  title: 'Inspekt',
  description:
    'Click any element in your browser → send context to your agent. The click-to-agent devtool for the agentic-CLI era.',
  base: '/inspekt/',
  cleanUrls: true,
  lastUpdated: true,
  // `true` = system preference is the default on first visit; the user's
  // explicit choice (via our three-state switcher) is persisted in
  // localStorage and can be reset to "System" any time.
  appearance: true,

  head: [
    ['link', { rel: 'icon', href: '/inspekt/favicon.svg', type: 'image/svg+xml' }],
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
      // keeps `@inspekt/core` out of the bundle — the extension is the only
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
      { text: 'Docs', link: '/docs/install' },
      { text: 'Agents', link: '/docs/agent-integration' },
    ],
    sidebar: {
      '/docs/': [
        {
          text: 'Getting started',
          items: [
            { text: 'Install', link: '/docs/install' },
            { text: 'Quick start', link: '/docs/quick-start' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'Source snippets', link: '/docs/snippets' },
            { text: 'Chrome extension', link: '/docs/chrome-extension' },
            { text: 'Agent integration', link: '/docs/agent-integration' },
            { text: 'Source-map fallback', link: '/docs/source-maps' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API', link: '/docs/api' },
            { text: 'Comparison', link: '/docs/comparison' },
          ],
        },
      ],
    },
    // socialLinks removed — replaced by the custom GitHubLink component in
    // the nav-bar-content-after slot (theme/index.ts).
    search: { provider: 'local' },
    editLink: {
      pattern:
        'https://github.com/steven-pribilinskiy/inspekt/edit/main/site/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'MIT licensed',
      copyright: '© 2026 Steven Prybylynskyi',
    },
  },
});
