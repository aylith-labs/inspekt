// Re-exports react-grab's element-context primitives. Pairs nicely with our
// `resolveElementSource` — react-grab's `getElementContext` provides the
// React-specific extras (component name, fiber, computed styles, HTML preview,
// CSS selector) that complement our framework-agnostic source resolution.

export { getElementContext } from 'react-grab/primitives';
export type { ReactGrabElementContext, StackFrame } from 'react-grab/primitives';
