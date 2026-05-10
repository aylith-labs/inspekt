import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Inspekt',
  description:
    'Click any element in your browser → send context to your agent. The click-to-agent devtool for the agentic-CLI era.',
  base: '/inspekt/',
  cleanUrls: true,
  lastUpdated: true,

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

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Docs', link: '/docs/install' },
      { text: 'Agents', link: '/docs/agent-integration' },
      { text: 'GitHub', link: 'https://github.com/steven-pribilinskiy/inspekt' },
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
    socialLinks: [
      { icon: 'github', link: 'https://github.com/steven-pribilinskiy/inspekt' },
    ],
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
