// Re-exports react-grab's openFile, which already does the right thing:
// tries the dev-server endpoint first, falls back to a protocol URL
// (vscode://, cursor://, etc.). When inspekt's daemon is reachable, our own
// /__inspekt/open endpoint takes precedence via its handler ordering.

export { openFile } from 'react-grab/primitives';
