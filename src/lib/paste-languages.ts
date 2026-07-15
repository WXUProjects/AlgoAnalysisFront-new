/** 粘贴板可选语言（与 highlight.js 注册名对齐） */
export const PASTE_LANGUAGES: { value: string; label: string }[] = [
  { value: 'auto', label: '自动识别' },
  { value: 'text', label: '纯文本' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'scala', label: 'Scala' },
  { value: 'lua', label: 'Lua' },
  { value: 'perl', label: 'Perl' },
  { value: 'r', label: 'R' },
  { value: 'matlab', label: 'MATLAB' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'makefile', label: 'Makefile' },
  { value: 'ini', label: 'INI / Config' },
  { value: 'toml', label: 'TOML' },
  { value: 'diff', label: 'Diff' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'protobuf', label: 'Protocol Buffers' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'vim', label: 'Vim Script' },
  { value: 'haskell', label: 'Haskell' },
  { value: 'ocaml', label: 'OCaml' },
  { value: 'elixir', label: 'Elixir' },
  { value: 'erlang', label: 'Erlang' },
  { value: 'clojure', label: 'Clojure' },
  { value: 'dart', label: 'Dart' },
  { value: 'objectivec', label: 'Objective-C' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'wasm', label: 'WebAssembly' },
  { value: 'verilog', label: 'Verilog' },
  { value: 'vhdl', label: 'VHDL' },
]

export const PASTE_EXPIRES: { value: string; label: string }[] = [
  { value: 'never', label: '不过期' },
  { value: '1h', label: '1 小时' },
  { value: '1d', label: '1 天' },
  { value: '1w', label: '1 周' },
  { value: '1m', label: '1 个月' },
  { value: '1y', label: '1 年' },
]

export function languageLabel(value: string): string {
  return PASTE_LANGUAGES.find((l) => l.value === value)?.label || value || '纯文本'
}

/** 供 highlightAuto 的语言子集（不含 auto / 纯文本） */
export const PASTE_DETECT_SUBSET = PASTE_LANGUAGES.map((l) => l.value).filter(
  (v) => v !== 'auto' && v !== 'text',
)
