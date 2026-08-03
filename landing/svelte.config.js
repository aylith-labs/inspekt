import adapter from '@sveltejs/adapter-static';

// The landing is served from the repo's GitHub Pages project path, so every
// asset and link has to carry the `/inspekt` prefix. `BASE_PATH=''` renders a
// root-relative build for local preview.
const base = process.env.BASE_PATH ?? '/inspekt';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true,
    }),
    paths: {
      base,
    },
    prerender: {
      handleUnseenRoutes: 'warn',
      handleHttpError: 'warn',
    },
  },
};

export default config;
