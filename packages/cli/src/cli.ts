#!/usr/bin/env node
import { openInEditor } from './index.js';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage: inspekt <file>[:<line>[:<column>]] [--editor <editor>]`);
  console.log(`\nOpen a file in your configured IDE.\n`);
  console.log(`Options:`);
  console.log(`  --editor, -e   IDE to use (default: $INSPEKT_EDITOR or 'code')`);
  console.log(`\nExamples:`);
  console.log(`  inspekt src/App.tsx:42`);
  console.log(`  inspekt src/App.tsx:42:3 --editor cursor`);
  process.exit(0);
}

const filePart = args[0]!;
let editor: string | undefined;

const editorIdx = args.indexOf('--editor');
const editorIdxShort = args.indexOf('-e');
const idx = editorIdx !== -1 ? editorIdx : editorIdxShort;
if (idx !== -1 && args[idx + 1]) {
  editor = args[idx + 1];
}

// Parse file:line:column
const parts = filePart.split(':');
let file: string;
let line: number | undefined;
let column: number | undefined;

// Handle Windows paths (C:\...)
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
