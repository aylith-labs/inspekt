/**
 * Tooltip — drop-in replacement for the OS `title=""` attribute.
 *
 * Two modes:
 *  - **Plain**: `content` is a string → renders a small pill.
 *  - **Rich**: `content` is an HTMLElement → the tooltip stays open while the
 *    cursor is over the bubble itself (so anchors inside are clickable).
 *
 * Portal-aware: the bubble is appended into the provided `root` (a shadow
 * root for in-page popover usage, or `document.body` for the extension's
 * options/popup/welcome pages).
 *
 * Positioning is delegated to `@floating-ui/dom` — `computePosition` + `flip` +
 * `shift` middleware keep the bubble inside the viewport; `autoUpdate` keeps
 * it locked to the trigger as the page scrolls or resizes.
 */
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from '@floating-ui/dom';

export interface TooltipOptions {
  /** Render target. Defaults to `document.body`. */
  root?: HTMLElement | ShadowRoot;
  /** ms before showing on enter. Default 200. */
  enterDelay?: number;
  /** ms before hiding on leave. Default 80. */
  leaveDelay?: number;
  /**
   * Floating-UI placement. Defaults to `'top'`. Auto-flips via the `flip`
   * middleware when there's no room.
   */
  placement?: Placement;
  /** Px gap between the trigger and the bubble. Default 8. */
  offsetPx?: number;
}

let counter = 0;

export function attachTooltip(
  trigger: HTMLElement,
  content: string | HTMLElement,
  opts: TooltipOptions = {},
): () => void {
  const enterDelay = opts.enterDelay ?? 200;
  const leaveDelay = opts.leaveDelay ?? 80;
  const placement = opts.placement ?? 'top';
  const offsetPx = opts.offsetPx ?? 8;
  const root = opts.root ?? document.body;
  const isRich = typeof content !== 'string';

  let bubble: HTMLDivElement | null = null;
  let enterTimer: ReturnType<typeof setTimeout> | null = null;
  let leaveTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupAutoUpdate: (() => void) | null = null;
  const id = `inspekt-tooltip-${++counter}`;

  function show(): void {
    if (bubble) return;
    bubble = document.createElement('div');
    bubble.className = 'inspekt-tooltip';
    bubble.id = id;
    bubble.setAttribute('role', 'tooltip');
    bubble.style.position = 'fixed';
    bubble.style.top = '0';
    bubble.style.left = '0';
    bubble.style.zIndex = '2147483647';
    if (typeof content === 'string') {
      bubble.textContent = content;
    } else {
      bubble.classList.add('inspekt-tooltip--rich');
      bubble.appendChild(content);
    }
    root.appendChild(bubble);

    // autoUpdate immediately fires `update`, so position is set right away.
    cleanupAutoUpdate = autoUpdate(trigger, bubble, update);

    if (isRich) {
      bubble.addEventListener('mouseenter', cancelLeave);
      bubble.addEventListener('mouseleave', scheduleHide);
    }
  }

  function hide(): void {
    if (!bubble) return;
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = null;
    bubble.remove();
    bubble = null;
  }

  function update(): void {
    if (!bubble) return;
    void computePosition(trigger, bubble, {
      placement,
      strategy: 'fixed',
      middleware: [offset(offsetPx), flip(), shift({ padding: 6 })],
    }).then(({ x, y }) => {
      // Bubble may have been removed during the microtask hop. Belt + braces
      // so a late computePosition() resolution can't paint at the fallback
      // (0,0) coordinate after detach.
      if (!bubble || !bubble.isConnected) return;
      bubble.style.left = `${Math.round(x)}px`;
      bubble.style.top = `${Math.round(y)}px`;
    });
  }

  function scheduleShow(): void {
    cancelLeave();
    if (enterTimer) clearTimeout(enterTimer);
    enterTimer = setTimeout(() => {
      enterTimer = null;
      show();
    }, enterDelay);
  }

  function scheduleHide(): void {
    if (enterTimer) {
      clearTimeout(enterTimer);
      enterTimer = null;
    }
    if (leaveTimer) clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      leaveTimer = null;
      hide();
    }, leaveDelay);
  }

  function cancelLeave(): void {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') hide();
  }

  trigger.setAttribute('aria-describedby', id);
  trigger.addEventListener('mouseenter', scheduleShow);
  trigger.addEventListener('mouseleave', scheduleHide);
  trigger.addEventListener('focus', scheduleShow);
  trigger.addEventListener('blur', scheduleHide);
  trigger.addEventListener('keydown', onKey);

  return function detach(): void {
    if (enterTimer) clearTimeout(enterTimer);
    if (leaveTimer) clearTimeout(leaveTimer);
    trigger.removeEventListener('mouseenter', scheduleShow);
    trigger.removeEventListener('mouseleave', scheduleHide);
    trigger.removeEventListener('focus', scheduleShow);
    trigger.removeEventListener('blur', scheduleHide);
    trigger.removeEventListener('keydown', onKey);
    trigger.removeAttribute('aria-describedby');
    hide();
  };
}
