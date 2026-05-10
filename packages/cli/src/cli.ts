#!/usr/bin/env node
import { openInEditor } from './index.js';
import { runSetup } from './setup/index.js';

const args = process.argv.slice(2);
const sub = args[0];

function printHelp(): void {
  console.log(`Usage:`);
  console.log(`  inspekt setup [--agents <list>]      Register Inspekt with your installed agents`);
  console.log(`  inspekt open <file>[:<line>[:<col>]] [--editor <editor>]`);
  console.log(`  inspekt <file>[:<line>[:<col>]] [--editor <editor>]  (shorthand for 'open')`);
  console.log(``);
  console.log(`Examples:`);
  console.log(`  inspekt setup`);
  console.log(`  inspekt setup --agents claude-code,cursor`);
  console.log(`  inspekt src/App.tsx:42`);
  console.log(`  inspekt src/App.tsx:42:3 --editor cursor`);
}

if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
  printHelp();
  process.exit(0);
}

if (sub === 'setup') {
  const agentsIdx = args.indexOf('--agents');
  const agents = agentsIdx !== -1 && args[agentsIdx + 1] ? args[agentsIdx + 1]!.split(',') : undefined;
  void runSetup({ agents }).catch((err) => {
    console.error('[inspekt setup]', err);
    process.exit(1);
  });
} else {
  // `inspekt open <file>` or shorthand `inspekt <file>`.
  const filePart = sub === 'open' ? args[1] : sub;
  if (!filePart) {
    printHelp();
    process.exit(1);
  }
  const restStart = sub === 'open' ? 2 : 1;
  let editor: string | undefined;
  const editorIdx = args.indexOf('--editor', restStart);
  const editorIdxShort = args.indexOf('-e', restStart);
  const idx = editorIdx !== -1 ? editorIdx : editorIdxShort;
  if (idx !== -1 && args[idx + 1]) {
    editor = args[idx + 1];
  }

  // Parse file:line:column (with Windows-path awareness)
  const parts = filePart.split(':');
  let file: string;
  let line: number | undefined;
  let column: number | undefined;
  if (/^[A-Z]$/i.test(parts[0] ?? '') && (parts[1] ?? '').includes('\\')) {
    file = `${parts[0]}:${parts[1]}`;
    line = parts[2] ? parseInt(parts[2], 10) : undefined;
    column = parts[3] ? parseInt(parts[3], 10) : undefined;
  } else {
    file = parts[0]!;
    line = parts[1] ? parseInt(parts[1], 10) : undefined;
    column = parts[2] ? parseInt(parts[2], 10) : undefined;
  }

  openInEditor({ file, line, column, editor });
}
