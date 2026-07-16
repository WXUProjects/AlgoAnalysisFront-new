import hljs from 'highlight.js/lib/common';
import type { ThemeHighlights } from './themes';

const HLJS_LANG_MAP: Record<string, string> = {
  typescript: 'typescript',
  tsx: 'typescript',
  javascript: 'javascript',
  jsx: 'javascript',
  json: 'json',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  bash: 'bash',
  shell: 'bash',
  powershell: 'powershell',
  sql: 'sql',
  markdown: 'markdown',
  yaml: 'yaml',
  vue: 'xml',
  swift: 'swift',
  kotlin: 'kotlin',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  perl: 'perl',
  scala: 'scala',
  haskell: 'haskell',
  elixir: 'elixir',
  clojure: 'clojure',
  dockerfile: 'dockerfile',
  plaintext: 'plaintext',
};

/** Map highlight.js class names to Carbon/theme highlight keys. */
const CLASS_TO_KEY: Record<string, keyof ThemeHighlights | 'variable2' | 'variable3' | 'tag'> = {
  keyword: 'keyword',
  built_in: 'definition', // library/builtin calls → function yellow
  type: 'meta', // int/const/void-like → blue (Dark Modern storage/type kw)
  literal: 'meta',
  number: 'number',
  string: 'string',
  regexp: 'string',
  subst: 'string',
  symbol: 'variable',
  class: 'variable3',
  function: 'definition',
  title: 'definition',
  params: 'variable',
  comment: 'comment',
  doctag: 'comment',
  meta: 'meta',
  section: 'keyword',
  tag: 'tag',
  name: 'tag',
  attr: 'attribute',
  attribute: 'attribute',
  variable: 'variable',
  bullet: 'variable',
  link: 'variable',
  addition: 'string',
  deletion: 'variable',
  selector: 'attribute',
  property: 'property',
  operator: 'operator',
  punctuation: 'text',
  quote: 'comment',
};

export function highlightCode(
  code: string,
  language: string
): { html: string; detectedLanguage: string } {
  if (!code) {
    return { html: '', detectedLanguage: 'plaintext' };
  }

  try {
    if (language === 'plaintext') {
      return { html: escapeHtml(code), detectedLanguage: 'plaintext' };
    }

    if (language === 'auto') {
      const result = hljs.highlightAuto(code);
      return {
        html: result.value,
        detectedLanguage: result.language || 'plaintext',
      };
    }

    const mapped = HLJS_LANG_MAP[language] || language;
    if (hljs.getLanguage(mapped)) {
      const result = hljs.highlight(code, { language: mapped, ignoreIllegals: true });
      return { html: result.value, detectedLanguage: mapped };
    }

    const result = hljs.highlightAuto(code);
    return {
      html: result.value,
      detectedLanguage: result.language || language,
    };
  } catch {
    return { html: escapeHtml(code), detectedLanguage: language };
  }
}

/**
 * Storage / type-like keywords → blue (meta) in Dark Modern style.
 * Control-flow keywords stay purple (keyword).
 */
const STORAGE_KEYWORDS = new Set(
  [
    'using',
    'namespace',
    'typedef',
    'typename',
    'template',
    'public',
    'private',
    'protected',
    'static',
    'final',
    'abstract',
    'native',
    'synchronized',
    'transient',
    'volatile',
    'strictfp',
    'new',
    'this',
    'super',
    'extends',
    'implements',
    'throws',
    'throw',
    'try',
    'catch',
    'finally',
    'class',
    'interface',
    'enum',
    'record',
    'package',
    'import',
    'export',
    'default',
    'void',
    'var',
    'let',
    'const',
    'func',
    'fn',
    'type',
    'struct',
    'trait',
    'impl',
    'mod',
    'use',
    'pub',
    'mut',
    'ref',
    'where',
    'async',
    'await',
    'yield',
    'from',
    'as',
    'in',
    'of',
    'with',
    'def',
    'lambda',
    'val',
    'fun',
    'object',
    'companion',
    'override',
    'open',
    'sealed',
    'data',
    'inline',
    'operator',
    'typealias',
    'extern',
    'crate',
    'self',
    'Self',
    'dyn',
    'move',
    'unsafe',
    'box',
    'sizeof',
    'alignof',
    'decltype',
    'auto',
    'register',
    'extern',
    'inline',
    'virtual',
    'friend',
    'explicit',
    'mutable',
    'constexpr',
    'consteval',
    'constinit',
    'noexcept',
    'override',
    'final',
    'concept',
    'requires',
    'co_await',
    'co_yield',
    'co_return',
  ].map((s) => s.toLowerCase())
);

/** Default VS Code bracket-pair rainbow (Dark Modern / Dark+). */
export const DEFAULT_BRACKET_COLORS = ['#FFD700', '#DA70D6', '#179FFF'];

const ROUND_SQUARE_CURLY_OPEN = new Set(['(', '{', '[']);
const ROUND_SQUARE_CURLY_CLOSE: Record<string, string> = {
  ')': '(',
  '}': '{',
  ']': '[',
};

/**
 * VS Code–style bracket pair colorization on hljs HTML.
 * - Always colors () {} [] by nesting depth
 * - Colors <> only as template/generic pairs (identifier immediately before `<`)
 * - Skips string / comment / regexp spans
 * - Avoids comparison / arrow / shift: `a < b`, `->`, `=>`, `<<`, `>>`, `<=`, `>=`
 */
export function colorizeBrackets(
  html: string,
  bracketColors: string[] = DEFAULT_BRACKET_COLORS
): string {
  if (!html || !bracketColors.length) return html;

  type Tok =
    | { kind: 'tag'; value: string; open?: boolean; skip?: boolean }
    | { kind: 'text'; value: string };

  const tokens: Tok[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) {
        tokens.push({ kind: 'text', value: html.slice(i) });
        break;
      }
      const tag = html.slice(i, end + 1);
      if (/^<span\b/i.test(tag)) {
        const classM = tag.match(/class="([^"]*)"/);
        const dataM = tag.match(/data-hl="([^"]*)"/);
        const classes = `${classM?.[1] || ''} ${dataM?.[1] || ''}`;
        const skip = /\bhljs-(string|comment|doctag|quote|regexp)\b/.test(classes);
        tokens.push({ kind: 'tag', value: tag, open: true, skip });
      } else if (/^<\/span>/i.test(tag)) {
        tokens.push({ kind: 'tag', value: tag, open: false });
      } else {
        tokens.push({ kind: 'tag', value: tag });
      }
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < html.length && html[j] !== '<') j++;
    tokens.push({ kind: 'text', value: html.slice(i, j) });
    i = j;
  }

  const colors = bracketColors;
  const stack: { open: string; color: string }[] = [];
  const skipStack: boolean[] = [];
  let skipping = false;
  let result = '';
  // Last emitted source character (decoded), for angle-bracket heuristics
  let prevChar = '';

  const paint = (raw: string, color: string) =>
    `<span style="color:${color}">${raw}</span>`;

  const pushOpen = (open: string, raw: string) => {
    const color = colors[stack.length % colors.length];
    stack.push({ open, color });
    result += paint(raw, color);
  };

  const popClose = (openWanted: string, raw: string): boolean => {
    for (let s = stack.length - 1; s >= 0; s--) {
      if (stack[s].open === openWanted) {
        const color = stack[s].color;
        stack.length = s;
        result += paint(raw, color);
        return true;
      }
    }
    return false;
  };

  const isIdent = (c: string) => /[A-Za-z0-9_$>]/.test(c);

  const processText = (text: string) => {
    if (skipping) {
      result += text;
      // still track last char for after-skip (best-effort from decoded text)
      const decoded = text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
      if (decoded.length) prevChar = decoded[decoded.length - 1];
      return;
    }

    let k = 0;
    while (k < text.length) {
      // entities
      if (text.startsWith('&lt;', k)) {
        const next = peekNextChar(text, k + 4);
        // template open only if glued to identifier: vector< / Foo< / T<
        // not comparison: "a < b" (space before), not <<
        if (isIdent(prevChar) && next !== '<' && next !== '=') {
          pushOpen('<', '&lt;');
        } else {
          result += '&lt;';
        }
        prevChar = '<';
        k += 4;
        continue;
      }
      if (text.startsWith('&gt;', k)) {
        // Prefer closing a pending template/generic on the stack (handles C++ `>>`)
        if (stack.length && stack[stack.length - 1].open === '<') {
          popClose('<', '&gt;');
        } else if (prevChar === '-' || prevChar === '=') {
          // ->  =>
          result += '&gt;';
        } else if (!popClose('<', '&gt;')) {
          result += '&gt;';
        }
        prevChar = '>';
        k += 4;
        continue;
      }
      if (text[k] === '&') {
        const semi = text.indexOf(';', k);
        if (semi !== -1 && semi - k < 12) {
          const ent = text.slice(k, semi + 1);
          result += ent;
          if (ent === '&amp;') prevChar = '&';
          else if (ent === '&quot;') prevChar = '"';
          else if (ent === '&apos;') prevChar = "'";
          k = semi + 1;
          continue;
        }
      }

      const ch = text[k];
      if (ROUND_SQUARE_CURLY_OPEN.has(ch)) {
        pushOpen(ch, ch);
        prevChar = ch;
        k++;
        continue;
      }
      if (ROUND_SQUARE_CURLY_CLOSE[ch]) {
        if (!popClose(ROUND_SQUARE_CURLY_CLOSE[ch], ch)) {
          result += ch;
        }
        prevChar = ch;
        k++;
        continue;
      }

      // raw < > (rare in hljs output, but handle)
      if (ch === '<' && isIdent(prevChar)) {
        const next = text[k + 1] || '';
        if (next !== '<' && next !== '=') {
          pushOpen('<', '<');
          prevChar = '<';
          k++;
          continue;
        }
      }
      if (ch === '>') {
        if (stack.length && stack[stack.length - 1].open === '<') {
          popClose('<', '>');
          prevChar = '>';
          k++;
          continue;
        }
        if (prevChar === '-' || prevChar === '=') {
          result += ch;
          prevChar = ch;
          k++;
          continue;
        }
      }

      result += ch;
      prevChar = ch;
      k++;
    }
  };

  for (const tok of tokens) {
    if (tok.kind === 'tag') {
      result += tok.value;
      if (tok.open === true) {
        skipStack.push(!!tok.skip);
        skipping = skipStack.some(Boolean);
      } else if (tok.open === false) {
        skipStack.pop();
        skipping = skipStack.some(Boolean);
      }
    } else {
      processText(tok.value);
    }
  }

  return result;
}

/** Peek next non-empty source char, decoding &lt; &gt; */
function peekNextChar(text: string, from: number): string {
  let k = from;
  while (k < text.length) {
    if (text[k] === '<') return ''; // hit a tag boundary in same text chunk — none
    if (text.startsWith('&lt;', k)) return '<';
    if (text.startsWith('&gt;', k)) return '>';
    if (text[k] === '&') {
      const semi = text.indexOf(';', k);
      if (semi !== -1 && semi - k < 12) {
        k = semi + 1;
        continue;
      }
    }
    if (/\s/.test(text[k])) {
      k++;
      continue;
    }
    return text[k];
  }
  return '';
}

/**
 * Convert hljs class-based HTML into spans with inline color styles.
 * Export no longer depends on CSS classes.
 */
export function inlineHighlightColors(
  html: string,
  highlights: ThemeHighlights,
  defaultColor?: string
): string {
  const textColor = defaultColor || highlights.text;
  if (!html) return '';

  // Bracket-pair colorize while class names still present (to skip strings/comments)
  const bracketColors = highlights.brackets?.length
    ? highlights.brackets
    : DEFAULT_BRACKET_COLORS;
  const withBrackets = colorizeBrackets(html, bracketColors);

  // Replace <span class="hljs-xxx yyy"> with inline style
  // Also keep already-inlined bracket spans (style= only, no class)
  let out = withBrackets.replace(/<span\s+class="([^"]*)">/g, (_full, classNames: string) => {
    const color = colorFromClasses(classNames, highlights) || textColor;
    return `<span style="color:${color}" data-hl="${classNames}">`;
  });

  // Reclassify storage keywords (blue) vs control-flow (purple)
  const storageColor = highlights.meta || highlights.keyword;
  const controlColor = highlights.keyword;
  out = out.replace(
    /<span style="color:[^"]*" data-hl="([^"]*)">([^<]*)<\/span>/g,
    (full, classNames: string, text: string) => {
      if (!/\bhljs-keyword\b/.test(classNames)) {
        return full.replace(/ data-hl="[^"]*"/, '');
      }
      const word = text.trim().toLowerCase();
      const color = STORAGE_KEYWORDS.has(word) ? storageColor : controlColor;
      return `<span style="color:${color}">${text}</span>`;
    }
  );
  // strip any remaining data-hl
  out = out.replace(/ data-hl="[^"]*"/g, '');
  return out;
}

function colorFromClasses(
  classNames: string,
  highlights: ThemeHighlights
): string | undefined {
  const classes = classNames.split(/\s+/).filter(Boolean);
  // hljs v11 often emits "hljs-title class_" / "hljs-title function_"
  const hasClassTitle = classes.some((c) => c === 'class_' || c === 'hljs-title.class_');
  const hasFuncTitle = classes.some((c) => c === 'function_' || c === 'hljs-title.function_');
  if (hasClassTitle) {
    return highlights.variable3 || highlights.definition;
  }
  if (hasFuncTitle) {
    return highlights.definition;
  }

  // Prefer more specific hljs-* tokens (last often more specific)
  for (let i = classes.length - 1; i >= 0; i--) {
    const c = classes[i];
    if (!c.startsWith('hljs-')) continue;
    const token = c.slice(5); // remove hljs-

    // title.class_ → type (mint); title.function_ / title → function (yellow)
    if (token.startsWith('title.class')) {
      return highlights.variable3 || highlights.definition;
    }
    if (token.startsWith('title.function') || token.startsWith('title')) {
      return highlights.definition;
    }
    if (token === 'built_in') {
      return highlights.definition;
    }
    if (token === 'type') {
      return highlights.meta || highlights.keyword;
    }
    if (token.startsWith('string')) {
      return highlights.string;
    }
    if (token.startsWith('variable')) {
      return highlights.variable;
    }
    if (token.startsWith('selector')) {
      return highlights.attribute;
    }
    if (token.startsWith('meta')) {
      return highlights.meta;
    }

    const base = token.replace(/\..*$/, '').replace(/_$/, '');
    const key = CLASS_TO_KEY[base] || CLASS_TO_KEY[token];
    if (key && (highlights as unknown as Record<string, string | undefined>)[key]) {
      return (highlights as unknown as Record<string, string>)[key];
    }
  }
  return undefined;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildThemeCss(highlights: Record<string, string | undefined>): string {
  const h = highlights;
  const rules: string[] = [];

  const add = (selectors: string[], color: string | undefined) => {
    if (!color) return;
    rules.push(`${selectors.join(', ')} { color: ${color} !important; }`);
  };

  const typeColor = h.variable3 || h.definition;
  const keywordColor = h.keyword;
  const literalColor = h.meta || h.keyword;

  add(['.hljs', 'pre code', '.code-area'], h.text);
  add(['.hljs-keyword', '.hljs-section', '.hljs-selector-tag'], keywordColor);
  add(['.hljs-literal'], literalColor);
  // type (int/const) → blue; builtins/calls → yellow; class titles → mint
  add(['.hljs-type'], h.meta || keywordColor);
  add(['.hljs-built_in'], h.definition);
  add(
    [
      '.hljs-title',
      '.hljs-title.function_',
      '.hljs-function .hljs-title',
      '.hljs-function > .hljs-title',
      '.function_',
    ],
    h.definition
  );
  // class_ after .hljs-title so mint wins for class names
  add(['.hljs-title.class_', '.hljs-class .hljs-title', '.class_'], typeColor);
  add(['.hljs-number'], h.number);
  add(['.hljs-string', '.hljs-regexp', '.hljs-addition', '.hljs-meta .hljs-string'], h.string);
  add(['.hljs-comment', '.hljs-quote', '.hljs-doctag'], h.comment);
  add(['.hljs-meta', '.hljs-meta .hljs-keyword'], h.meta);
  add(
    [
      '.hljs-variable',
      '.hljs-template-variable',
      '.hljs-symbol',
      '.hljs-bullet',
      '.hljs-link',
      '.hljs-deletion',
      '.hljs-params',
    ],
    h.variable
  );
  add(
    [
      '.hljs-attr',
      '.hljs-attribute',
      '.hljs-selector-id',
      '.hljs-selector-class',
      '.hljs-selector-attr',
      '.hljs-selector-pseudo',
    ],
    h.attribute
  );
  add(['.hljs-property'], h.property);
  add(['.hljs-name'], h.tag || h.property);
  add(['.hljs-operator'], h.operator);
  add(['.hljs-tag', '.hljs-template-tag'], h.tag || h.keyword);
  add(['.hljs-punctuation'], h.text);

  return rules.join('\n');
}

export { CLASS_TO_KEY };
