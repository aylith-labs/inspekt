#!/usr/bin/env node
import path from 'node:path';
import { openInEditor, parseFileTarget } from './index.js';
import { runSetup } from './setup/index.js';

const args = process.argv.slice(2);
const sub = args[0];

function printHelp(): void {
  console.log(`Usage:`);
  console.log(`  inspekt setup [--agents <list>] [--config-home <directory>]`);
  console.log(`    Register the locally installed MCP server with your agents.`);
  console.log(
    `    Configuration defaults to your home; --config-home selects another profile directory.`,
  );
  console.log(`  inspekt open <file>[:<line>[:<col>]] [--editor <editor>]`);
  console.log(`  inspekt <file>[:<line>[:<col>]] [--editor <editor>]  (shorthand for 'open')`);
  console.log(``);
  console.log(`Examples:`);
  console.log(`  inspekt setup`);
  console.log(`  inspekt setup --agents claude-code,cursor`);
  console.log(`  inspekt src/App.tsx:42`);
  console.log(`  inspekt src/App.tsx:42:3 --editor cursor`);
}

if (!sub || args.includes('--help') || args.includes('-h') || sub === 'help') {
  printHelp();
  process.exit(0);
}

if (sub === 'setup') {
  const agentsIdx = args.indexOf('--agents');
  const agents =
    agentsIdx !== -1 && args[agentsIdx + 1] ? args[agentsIdx + 1]!.split(',') : undefined;
  const homeIdx = args.indexOf('--config-home');
  if (homeIdx !== -1 && (!args[homeIdx + 1] || args[homeIdx + 1]!.startsWith('--'))) {
    console.error('[inspekt] --config-home requires a directory');
    process.exit(1);
  }
  const home = homeIdx === -1 ? undefined : path.resolve(args[homeIdx + 1]!);
  void runSetup({ agents, home }).catch((err) => {
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
  const flagIdx = editorIdx !== -1 ? editorIdx : editorIdxShort;
  if (flagIdx !== -1) {
    editor = args[flagIdx + 1];
    if (!editor) {
      console.error(`[inspekt] ${args[flagIdx]} requires an editor name`);
      process.exit(1);
    }
  }

  openInEditor({ ...parseFileTarget(filePart), editor });
}
