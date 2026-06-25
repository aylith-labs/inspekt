/**
 * Prism.js tokenizer wrapper.
 *
 * Returns a per-line token array so callers can keep their own
 * line-number gutter / target-line marker (we don't want a single
 * Prism.highlight() HTML blob that we'd have to re-split).
 *
 * Languages bundled: markup, clike, javascript, jsx, typescript, tsx,
 * css, json. Anything else falls through to a single "plain" token per
 * line.
 */
import Prism from 'prismjs';
// Loading order matters: each component augments Prism.languages with its key.
// `markup` is the base for jsx/tsx. `clike` is the base for js/ts.
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-json.js';

export interface CodeToken {
  text: string;
  /** Prism token type, e.g. "keyword", "string", "comment". Empty for plain text. */
  type: string;
}

export interface CodeLine {
  tokens: CodeToken[];
}

/** Map common file extensions / language hints to Prism grammar keys. */
function resolveGrammarKey(lang: string | undefined): string {
  switch ((lang || '').toLowerCase()) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'jsx';
    case 'ts':
    case 'tsx':
      return 'tsx';
    case 'javascript':
      return 'javascript';
    case 'typescript':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
    case 'markup':
      return 'markup';
    default:
      return 'plain';
  }
}

/**
 * Tokenize source code and split into per-line token arrays. Newlines are
 * consumed by the splitter (not emitted as tokens), so the caller can join
 * the resulting lines with its own `\n` if rendering to a single `<pre>`.
 */
export function tokenizeToLines(code: string, lang?: string): CodeLine[] {
  const key = resolveGrammarKey(lang);
  const grammar = key === 'plain' ? undefined : Prism.languages[key];
  if (!grammar) {
    return code.split('\n').map((text) => ({ tokens: [{ text, type: '' }] }));
  }

  const tokens = Prism.tokenize(code, grammar);
  return splitTokensIntoLines(tokens);
}

type PrismNode = string | Prism.Token | Array<string | Prism.Token>;

function splitTokensIntoLines(nodes: PrismNode[]): CodeLine[] {
  const lines: CodeLine[] = [{ tokens: [] }];
  const current = (): CodeToken[] => lines[lines.length - 1]!.tokens;

  function visit(node: PrismNode, parentType: string): void {
    if (typeof node === 'string') {
      pushText(node, parentType);
      return;
    }
    if (Array.isArray(node)) {
      for (const n of node) visit(n, parentType);
      return;
    }
    // Prism.Token — its content may be a string OR nested token array.
    const type = parentType ? `${parentType} ${node.type}` : node.type;
    visit(node.content as PrismNode, type);
  }

  function pushText(text: string, type: string): void {
    let buf = text;
    while (buf.length > 0) {
      const nl = buf.indexOf('\n');
      if (nl === -1) {
        if (buf.length > 0) current().push({ text: buf, type });
        return;
      }
      const before = buf.slice(0, nl);
      if (before.length > 0) current().push({ text: before, type });
      lines.push({ tokens: [] });
      buf = buf.slice(nl + 1);
    }
  }

  for (const n of nodes) visit(n, '');
  return lines;
}
