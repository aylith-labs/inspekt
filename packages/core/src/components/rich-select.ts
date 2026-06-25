/**
 * RichSelect — a small, framework-free dropdown that supports per-item
 * icons, hint text, and an optional side-popover (used for the Editor
 * picker which shows a "Visit website" link on hover).
 *
 * Lives in document scope (not shadow DOM) — it's meant for the Chrome
 * extension's options / welcome surfaces, not the in-page popover. The
 * listbox is portal-mounted on `document.body` so it escapes overflow:
 * hidden ancestors.
 */
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from '@floating-ui/dom';
import { attachTooltip } from './tooltip.js';

export interface RichSelectItem<V extends string = string> {
  value: V;
  label: string;
  /** Secondary descriptive line shown under the label. */
  hint?: string;
  /** Path / data URL / SVG inline string. If absent we render a letter tile. */
  icon?: string;
  /** Optional element rendered inside the per-row side popover. */
  popover?: () => HTMLElement;
  /**
   * Optional group label. When two consecutive items have different group
   * strings, a non-interactive header row is inserted before the second.
   * Items with the same group string render together; the order of items
   * decides the order of groups. Items without `group` form an implicit
   * leading "ungrouped" section.
   */
  group?: string;
  /**
   * Optional click handler. When set, takes precedence over the default
   * `select(value)` behavior — useful for action rows like "+ Add custom".
   * The row is still rendered but skips the selected-state marker.
   */
  action?: () => void;
}

export interface RichSelectOptions<V extends string = string> {
  /** Element to host the trigger button (replaced). */
  anchor: HTMLElement;
  items: RichSelectItem<V>[];
  /** Current selected value. */
  value: V;
  /** Called on selection change. */
  onChange: (value: V) => void;
  /** ms delay before the per-item side popover appears. Default 50. */
  popoverDelay?: number;
  /** Optional aria label for the trigger. */
  ariaLabel?: string;
  /**
   * Floating-UI placement for the per-row side popover. Defaults to `'top'`
   * (matches the simple tooltip behavior). For the editor dropdown we pass
   * `'left-start'` so the rich card slides in to the side without covering
   * the listbox rows.
   */
  popoverPlacement?: Placement;
}

export interface RichSelectController<V extends string = string> {
  setValue(value: V): void;
  getValue(): V;
  destroy(): void;
}

export function createRichSelect<V extends string = string>(
  opts: RichSelectOptions<V>,
): RichSelectController<V> {
  let current: V = opts.value;
  let listEl: HTMLDivElement | null = null;
  let activeIndex = -1;
  let cleanupAutoUpdate: (() => void) | null = null;
  // Each per-row attachTooltip call returns a detach function. We must run
  // them all before removing the listbox — otherwise the tooltip bubbles
  // (which live in document.body, outside the listbox) survive with their
  // autoUpdate watchers still ticking against now-detached row references,
  // and floating-ui snaps them to a zero-rect → top-left corner.
  const tooltipDetachers: Array<() => void> = [];

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'inspekt-rich-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  if (opts.ariaLabel) trigger.setAttribute('aria-label', opts.ariaLabel);

  opts.anchor.replaceChildren(trigger);
  renderTrigger();

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (listEl) close();
    else open();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  function renderTrigger(): void {
    trigger.innerHTML = '';
    const item = opts.items.find((i) => i.value === current) ?? opts.items[0];
    if (!item) return;
    trigger.appendChild(renderIcon(item));
    const labelEl = document.createElement('span');
    labelEl.className = 'rs-label';
    labelEl.textContent = item.label;
    trigger.appendChild(labelEl);
  }

  function renderIcon(item: RichSelectItem<V>): HTMLElement {
    if (item.icon) {
      if (/^<svg|^<\?xml/.test(item.icon.trim())) {
        const wrap = document.createElement('span');
        wrap.className = 'rs-icon';
        wrap.innerHTML = item.icon;
        return wrap;
      }
      const img = document.createElement('img');
      img.className = 'rs-icon';
      img.src = item.icon;
      img.alt = '';
      return img;
    }
    const tile = document.createElement('span');
    tile.className = 'inspekt-rich-select-item-letter';
    tile.textContent = (item.label[0] ?? '?').toUpperCase();
    return tile;
  }

  function open(): void {
    if (listEl) return;
    listEl = document.createElement('div');
    listEl.className = 'inspekt-rich-select-list';
    listEl.setAttribute('role', 'listbox');

    let lastGroup: string | undefined;
    opts.items.forEach((item, i) => {
      // Insert a non-interactive group header whenever the group changes.
      if (item.group && item.group !== lastGroup) {
        const header = document.createElement('div');
        header.className = 'inspekt-rich-select-group-header';
        header.setAttribute('role', 'presentation');
        header.textContent = item.group;
        listEl!.appendChild(header);
      }
      lastGroup = item.group;

      const row = document.createElement('div');
      row.className = 'inspekt-rich-select-item';
      if (item.action) row.classList.add('inspekt-rich-select-item-action');
      row.setAttribute('role', 'option');
      row.dataset['value'] = item.value;
      // Action rows aren't real selections; never paint as selected.
      if (!item.action && item.value === current) row.dataset['selected'] = 'true';

      row.appendChild(renderIcon(item));

      const body = document.createElement('div');
      body.className = 'inspekt-rich-select-item-body';
      const labelEl = document.createElement('span');
      labelEl.className = 'inspekt-rich-select-item-label';
      labelEl.textContent = item.label;
      body.appendChild(labelEl);
      if (item.hint) {
        const hintEl = document.createElement('span');
        hintEl.className = 'inspekt-rich-select-item-hint';
        hintEl.textContent = item.hint;
        body.appendChild(hintEl);
      }
      row.appendChild(body);

      row.addEventListener('mouseenter', () => setActive(i));
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.action) {
          close();
          item.action();
          return;
        }
        select(item.value);
      });

      if (item.popover) {
        tooltipDetachers.push(
          attachTooltip(row, item.popover(), {
            enterDelay: opts.popoverDelay ?? 50,
            leaveDelay: 200,
            placement: opts.popoverPlacement ?? 'top',
          }),
        );
      }

      listEl!.appendChild(row);
    });

    listEl.style.position = 'fixed';
    listEl.style.top = '0';
    listEl.style.left = '0';
    document.body.appendChild(listEl);
    // autoUpdate fires `update` immediately, so the listbox is in place before
    // it paints. Continues to track on scroll/resize/ancestor scroll.
    cleanupAutoUpdate = autoUpdate(trigger, listEl, updateListPosition);
    trigger.setAttribute('aria-expanded', 'true');
    setActive(opts.items.findIndex((i) => i.value === current));

    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
  }

  function close(): void {
    if (!listEl) return;
    // Detach all per-row tooltips FIRST — otherwise their autoUpdate
    // watchers tick against the now-removed rows and snap the bubbles
    // to a zero-rect (top-left corner of the viewport).
    for (const d of tooltipDetachers) d();
    tooltipDetachers.length = 0;
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    listEl.remove();
    listEl = null;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
  }

  function updateListPosition(): void {
    if (!listEl) return;
    const list = listEl;
    const triggerWidth = trigger.getBoundingClientRect().width;
    list.style.minWidth = `${triggerWidth}px`;

    void computePosition(trigger, list, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [
        offset(4),
        flip(),
        shift({ padding: 8 }),
        size({
          apply({ availableHeight }) {
            list.style.maxHeight = `${Math.max(160, availableHeight - 8)}px`;
          },
          padding: 8,
        }),
      ],
    }).then(({ x, y }) => {
      list.style.left = `${Math.round(x)}px`;
      list.style.top = `${Math.round(y)}px`;
    });
  }

  function setActive(i: number): void {
    if (!listEl) return;
    activeIndex = i;
    const rows = listEl.querySelectorAll<HTMLDivElement>('.inspekt-rich-select-item');
    rows.forEach((r, idx) => {
      if (idx === i) r.dataset['active'] = 'true';
      else delete r.dataset['active'];
    });
  }

  function select(value: V): void {
    if (value !== current) {
      current = value;
      renderTrigger();
      opts.onChange(value);
    }
    close();
  }

  function onOutside(e: MouseEvent): void {
    const t = e.target as Node;
    if (listEl?.contains(t) || trigger.contains(t)) return;
    // Clicks inside one of our row tooltips (rich popover) shouldn't close
    // the listbox immediately — the click might be on an `<a target="_blank">`
    // that needs the trigger row alive long enough to navigate without
    // floating-ui re-anchoring the bubble against a zero-rect (which would
    // snap it to the top-left). Defer the close to a microtask so the
    // navigation is already in flight by the time we tear down.
    if (t instanceof Element && t.closest('.inspekt-tooltip')) {
      setTimeout(close, 0);
      return;
    }
    close();
  }

  function onKey(e: KeyboardEvent): void {
    if (!listEl) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      trigger.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(opts.items.length - 1, activeIndex + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(0, activeIndex - 1));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const item = opts.items[activeIndex];
      if (!item) return;
      if (item.action) {
        close();
        item.action();
      } else {
        select(item.value);
      }
      return;
    }
    // Type-ahead: jump to first item whose label starts with the key.
    if (e.key.length === 1) {
      const ch = e.key.toLowerCase();
      const next = opts.items.findIndex((it) => it.label.toLowerCase().startsWith(ch));
      if (next >= 0) setActive(next);
    }
  }

  return {
    setValue(value) {
      current = value;
      renderTrigger();
    },
    getValue() {
      return current;
    },
    destroy() {
      close();
      trigger.remove();
    },
  };
}
