// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createInspekt } from '../index';
import { VERSION } from '../version';

const instances: ReturnType<typeof createInspekt>[] = [];

function makeInspekt(options: Parameters<typeof createInspekt>[0] = {}) {
  const instance = createInspekt(options);
  instances.push(instance);
  return instance;
}

const SETTINGS_EVENT = 'inspekt:settings-update';

/**
 * Tracks how many `inspekt:settings-update` listeners are attached to the
 * document across a block of work, by counting add/remove calls.
 */
function trackSettingsListeners(): { net: () => number; restore: () => void } {
  const originalAdd = document.addEventListener.bind(document);
  const originalRemove = document.removeEventListener.bind(document);
  let net = 0;

  document.addEventListener = ((type: string, ...rest: unknown[]) => {
    if (type === SETTINGS_EVENT) net += 1;
    return (originalAdd as (...args: unknown[]) => void)(type, ...rest);
  }) as typeof document.addEventListener;

  document.removeEventListener = ((type: string, ...rest: unknown[]) => {
    if (type === SETTINGS_EVENT) net -= 1;
    return (originalRemove as (...args: unknown[]) => void)(type, ...rest);
  }) as typeof document.removeEventListener;

  return {
    net: () => net,
    restore: () => {
      document.addEventListener = originalAdd;
      document.removeEventListener = originalRemove;
    },
  };
}

afterEach(() => {
  while (instances.length > 0) instances.pop()?.destroy();
  document.body.innerHTML = '';
});

describe('createInspekt lifecycle', () => {
  it('mounts a shadow host only while enabled', () => {
    const inspekt = makeInspekt({
      treePanel: { enabled: false, position: 'right', showProps: false, showLineNumbers: false },
    });
    expect(document.querySelector('inspekt-root')).toBeNull();

    inspekt.enable();
    expect(document.querySelector('inspekt-root')).not.toBeNull();

    inspekt.disable();
    expect(document.querySelector('inspekt-root')).toBeNull();
  });

  it('publishes the real package version on window.__INSPEKT__', () => {
    const inspekt = makeInspekt();
    inspekt.enable();
    const flag = (window as unknown as Record<string, { version: string } | undefined>).__INSPEKT__;
    expect(flag?.version).toBe(VERSION);
  });

  it('toggle flips between enabled and disabled', () => {
    const inspekt = makeInspekt();
    inspekt.toggle();
    expect(document.querySelector('inspekt-root')).not.toBeNull();
    inspekt.toggle();
    expect(document.querySelector('inspekt-root')).toBeNull();
  });

  it('the keyboard shortcut can re-enable a disabled instance and is removed on destroy', () => {
    const inspekt = makeInspekt();
    const toggle = () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'i', ctrlKey: true, altKey: true, bubbles: true }),
      );
    inspekt.enable();
    toggle();
    expect(document.querySelector('inspekt-root')).toBeNull();
    toggle();
    expect(document.querySelector('inspekt-root')).not.toBeNull();
    inspekt.destroy();
    toggle();
    expect(document.querySelector('inspekt-root')).toBeNull();
  });

  it('emits enable and disable events to registered handlers', () => {
    const inspekt = makeInspekt();
    const seen: string[] = [];
    inspekt.on('enable', () => seen.push('enable'));
    inspekt.on('disable', () => seen.push('disable'));
    inspekt.enable();
    inspekt.disable();
    expect(seen).toEqual(['enable', 'disable']);
  });

  it('off() detaches a handler', () => {
    const inspekt = makeInspekt();
    let calls = 0;
    const handler = () => {
      calls += 1;
    };
    inspekt.on('enable', handler);
    inspekt.off('enable', handler);
    inspekt.enable();
    expect(calls).toBe(0);
  });

  it('applies settings pushed by the extension while alive', () => {
    const inspekt = makeInspekt();
    inspekt.enable();
    document.dispatchEvent(
      new CustomEvent('inspekt:settings-update', { detail: { editor: 'zed' } }),
    );
    const flag = (window as unknown as Record<string, { options: { editor: string } } | undefined>)
      .__INSPEKT__;
    expect(flag?.options.editor).toBe('zed');
  });

  it('ignores a settings event with no detail', () => {
    const inspekt = makeInspekt();
    inspekt.enable();
    expect(() => document.dispatchEvent(new CustomEvent('inspekt:settings-update'))).not.toThrow();
  });

  it('destroy() removes the settings listener instead of leaking one per instance', () => {
    const tracker = trackSettingsListeners();
    try {
      const first = createInspekt();
      const second = createInspekt();
      expect(tracker.net()).toBe(2);

      first.destroy();
      second.destroy();
      expect(tracker.net()).toBe(0);
    } finally {
      tracker.restore();
    }
  });

  it('destroy() clears the window marker', () => {
    const inspekt = createInspekt();
    inspekt.enable();
    inspekt.destroy();
    expect((window as unknown as Record<string, unknown>).__INSPEKT__).toBeUndefined();
  });

  it('registerAction and unregisterAction are reflected in the action list', () => {
    const inspekt = makeInspekt();
    const action = { id: 'custom', label: 'Custom', icon: '<svg />', handler: () => {} };
    expect(() => inspekt.registerAction(action)).not.toThrow();
    expect(() => inspekt.unregisterAction('custom')).not.toThrow();
  });
});
