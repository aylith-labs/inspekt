// Re-exports react-grab's freeze primitives. We don't reimplement these — the
// upstream lib already handles React update suspension, animation pausing, and
// pseudo-state preservation across many edge cases.

export { freeze, unfreeze, isFreezeActive } from 'react-grab/primitives';
