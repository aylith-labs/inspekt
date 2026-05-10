// Per-tab icon + badge state for the Chrome extension's toolbar action.
//
// The icon is greyscale when the current page has no Inspekt instrumentation,
// full color when it does. The badge text describes the current snippet source
// or activation state: 'OFF', 'ON', 'DEV', 'MAP', 'AI'. The pure function
// `getBadgeForState` is extracted for unit testing.

import type { PageCapabilities } from './messaging.js';

export interface TabState {
  enabled: boolean;
  standalone: boolean;
  capabilities?: PageCapabilities;
}

export interface BadgePresentation {
  text: '' | 'OFF' | 'ON' | 'DEV' | 'MAP' | 'AI';
  color: string;
  iconVariant: 'color' | 'grey';
  title: string;
}

const COLOR = {
  ACCENT: '#3b82f6', // blue — generic active
  DEV: '#16a34a',    // green — dev-server snippets
  MAP: '#2563eb',    // deeper blue — source-map snippets
  AI: '#9333ea',     // purple — agent connected
  OFF: '#6b7280',    // grey — instrumented but disabled
} as const;

export function getBadgeForState(state: TabState | undefined): BadgePresentation {
  const caps = state?.capabilities;
  const instrumented = caps?.instrumented ?? false;
  const enabled = state?.enabled ?? false;

  if (!instrumented) {
    return {
      text: '',
      color: '#00000000',
      iconVariant: 'grey',
      title: 'Inspekt — no instrumentation detected on this page',
    };
  }

  if (!enabled) {
    return {
      text: 'OFF',
      color: COLOR.OFF,
      iconVariant: 'color',
      title: 'Inspekt — page is instrumented but inspector is disabled. Click to enable.',
    };
  }

  // Active. Pick the highest-fidelity badge available.
  if (caps?.agentConnected) {
    return {
      text: 'AI',
      color: COLOR.AI,
      iconVariant: 'color',
      title: 'Inspekt — active, agent connected via MCP',
    };
  }
  if (caps?.snippetSource === 'devserver') {
    return {
      text: 'DEV',
      color: COLOR.DEV,
      iconVariant: 'color',
      title: 'Inspekt — active, snippets via dev server',
    };
  }
  if (caps?.snippetSource === 'sourcemap') {
    return {
      text: 'MAP',
      color: COLOR.MAP,
      iconVariant: 'color',
      title: 'Inspekt — active, snippets via source maps',
    };
  }
  return {
    text: 'ON',
    color: COLOR.ACCENT,
    iconVariant: 'color',
    title: 'Inspekt — active, path-only (no snippet source available)',
  };
}

const COLOR_ICON = {
  16: 'icons/icon-16.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
} as const;

const GREY_ICON = {
  16: 'icons/icon-grey-16.png',
  48: 'icons/icon-grey-48.png',
  128: 'icons/icon-grey-128.png',
} as const;

export function applyTabState(tabId: number, state: TabState | undefined): void {
  const pres = getBadgeForState(state);
  void chrome.action.setIcon({
    tabId,
    path: pres.iconVariant === 'grey' ? GREY_ICON : COLOR_ICON,
  });
  chrome.action.setBadgeText({ tabId, text: pres.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: pres.color });
  void chrome.action.setTitle({ tabId, title: pres.title });
}
