// Custom theme: extends the VitePress default theme with a three-state
// appearance switcher (Light / System / Dark) and a custom landing layout.
// System is the default — first visit follows `prefers-color-scheme` until
// the user explicitly picks a theme.

import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import ThemeSwitcher from './ThemeSwitcher.vue';
import GitHubLink from './GitHubLink.vue';
import HeroFlow from './components/HeroFlow.vue';
import WhatItDoes from './components/WhatItDoes.vue';
import GrabPayload from './components/GrabPayload.vue';
import Architecture from './components/Architecture.vue';
import IconStates from './components/IconStates.vue';
import ComparisonTable from './components/ComparisonTable.vue';
import InstallSteps from './components/InstallSteps.vue';
import CreditsFooter from './components/CreditsFooter.vue';
import './custom.css';

const theme: Theme = {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => [h(GitHubLink), h(ThemeSwitcher)],
    }),
  enhanceApp({ app }) {
    app.component('HeroFlow', HeroFlow);
    app.component('WhatItDoes', WhatItDoes);
    app.component('GrabPayload', GrabPayload);
    app.component('Architecture', Architecture);
    app.component('IconStates', IconStates);
    app.component('ComparisonTable', ComparisonTable);
    app.component('InstallSteps', InstallSteps);
    app.component('CreditsFooter', CreditsFooter);
  },
};

export default theme;
