// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportSettings,
  getSettings,
  getSiteSettings,
  type InspektSettings,
  importSettings,
} from '../storage';

/**
 * Minimal chrome.storage.sync stand-in matching the documented contract:
 * `get(null)` returns exactly what is stored, an object argument supplies
 * defaults for keys that are absent.
 */
let stored: Record<string, unknown> = {};

const syncArea = {
  get: vi.fn(async (keys: Record<string, unknown> | null) =>
    keys === null ? { ...stored } : { ...keys, ...stored },
  ),
  set: vi.fn(async (updates: Record<string, unknown>) => {
    stored = { ...stored, ...updates };
  }),
};

vi.stubGlobal('chrome', { storage: { sync: syncArea } });

beforeEach(() => {
  stored = {};
  syncArea.get.mockClear();
  syncArea.set.mockClear();
});

describe('getSettings', () => {
  it('returns defaults for a fresh install', async () => {
    const settings = await getSettings();
    expect(settings.requireModifiers).toEqual(['ctrl', 'alt']);
    expect(settings.editor).toBe('cursor');
    expect(settings.showBoundingBoxes).toBe(false);
  });

  it('keeps stored values that are already in the current shape', async () => {
    stored = { editor: 'zed', requireModifiers: [] };
    const settings = await getSettings();
    expect(settings.editor).toBe('zed');
    expect(settings.requireModifiers).toEqual([]);
  });
});

describe('legacy activation migration', () => {
  it.each([
    ['click-mod', ['ctrl', 'alt']],
    ['hover-mod', ['ctrl', 'alt']],
    ['click', []],
    ['hover', []],
    ['manual', ['ctrl', 'alt', 'shift']],
  ] as const)('maps activation=%s to %j', async (activation, expected) => {
    stored = { activation };
    const settings = await getSettings();
    expect(settings.requireModifiers).toEqual(expected);
    expect(settings.showBoundingBoxes).toBe(false);
  });

  it('turns on bounding boxes for the old view mode', async () => {
    stored = { activation: 'view' };
    const settings = await getSettings();
    expect(settings.requireModifiers).toEqual(['ctrl', 'alt']);
    expect(settings.showBoundingBoxes).toBe(true);
  });

  it('falls back to ctrl+alt for an unrecognized activation', async () => {
    stored = { activation: 'something-else' };
    expect((await getSettings()).requireModifiers).toEqual(['ctrl', 'alt']);
  });

  it('leaves an already-migrated install alone', async () => {
    stored = { activation: 'click', requireModifiers: ['shift'] };
    expect((await getSettings()).requireModifiers).toEqual(['shift']);
  });

  it('drops the legacy key from the returned settings', async () => {
    stored = { activation: 'click-mod' };
    expect('activation' in (await getSettings())).toBe(false);
  });
});

describe('getSiteSettings', () => {
  it('returns the base settings when no override matches', async () => {
    stored = { editor: 'zed', siteOverrides: { 'other.test': { editor: 'vscode' } } };
    expect((await getSiteSettings('https://app.test/page')).editor).toBe('zed');
  });

  it('applies an exact-hostname override', async () => {
    stored = { editor: 'zed', siteOverrides: { 'app.test': { editor: 'vscode' } } };
    expect((await getSiteSettings('https://app.test/page')).editor).toBe('vscode');
  });

  it('applies a wildcard override to a subdomain and to the bare domain', async () => {
    stored = { editor: 'zed', siteOverrides: { '*.app.test': { editor: 'webstorm' } } };
    expect((await getSiteSettings('https://staging.app.test/')).editor).toBe('webstorm');
    expect((await getSiteSettings('https://app.test/')).editor).toBe('webstorm');
  });

  it('keeps unoverridden fields from the base settings', async () => {
    stored = {
      editor: 'zed',
      snippetContext: 9,
      siteOverrides: { 'app.test': { editor: 'vscode' } },
    };
    const settings = await getSiteSettings('https://app.test/');
    expect(settings.editor).toBe('vscode');
    expect(settings.snippetContext).toBe(9);
  });
});

describe('export / import round-trip', () => {
  it('exports JSON that import feeds back into storage', async () => {
    stored = { editor: 'zed', snippetContext: 12 };
    const json = await exportSettings();
    expect(JSON.parse(json) as InspektSettings).toMatchObject({
      editor: 'zed',
      snippetContext: 12,
    });

    stored = {};
    await importSettings(json);
    expect((await getSettings()).editor).toBe('zed');
  });

  it('rejects malformed JSON instead of writing partial settings', async () => {
    await expect(importSettings('{ not json')).rejects.toThrow();
    expect(syncArea.set).not.toHaveBeenCalled();
  });
});
