import { COMMENT_PREFIXES, BLOCK_COMMENT_SYNTAX, FALLBACK_PREFIXES } from "./commentParser";

// Languages where ' is a char literal rather than a string delimiter.
// All others default to both " and '.
export const STRING_QUOTE_CHARS: Record<string, string[]> = {
  c: ['"'], cpp: ['"'], java: ['"'], csharp: ['"'],
  go: ['"'], rust: ['"'], kotlin: ['"'], swift: ['"'],
  dart: ['"'], scala: ['"'],
};

// Languages that support backtick template literals as string delimiters.
const TEMPLATE_LITERAL_LANGS = new Set([
  "javascript", "typescript", "javascriptreact", "typescriptreact",
]);

// Languages where ' is ambiguous — it can be a string delimiter OR a postfix operator
// (e.g. matrix transpose in MATLAB). Requires a lookback heuristic before treating ' as a string.
const TRANSPOSE_LANGS = new Set(["matlab"]);

// Returns true if the ' at position pos is likely a transpose operator rather than a string opener.
// Checks the previous non-whitespace character: if it's a word char, ], ), ., or another ',
// the ' is almost certainly a postfix operator.
function isLikelyTranspose(line: string, pos: number): boolean {
  for (let j = pos - 1; j >= 0; j--) {
    if (line[j] === " " || line[j] === "\t") { continue; }
    return /[\w\])'.]/.test(line[j]);
  }
  return false;
}

export interface StringInfo {
  text: string;      // content between quotes (sent to Ollama as-is)
  quoteChar: string; // the delimiter used
  start: number;     // index of opening quote in the line
  end: number;       // index of closing quote in the line
}

function getStopPrefixes(languageId: string): string[] {
  const linePrefixes = COMMENT_PREFIXES[languageId] ?? FALLBACK_PREFIXES;
  const block = BLOCK_COMMENT_SYNTAX[languageId];
  return block ? [...linePrefixes, block.open] : linePrefixes;
}

// Extracts all string literals from a single line.
// For template literals, the full content (including ${...}) is sent to Ollama —
// the LLM translates only the foreign-language portions and leaves code expressions alone.
// Skips strings of 1 character or fewer. Stops at comment delimiters.
// Does not handle multi-line strings — call once per line.
export function extractStrings(line: string, languageId: string): StringInfo[] {
  const quoteChars = new Set(STRING_QUOTE_CHARS[languageId] ?? ['"', "'"]);
  if (TEMPLATE_LITERAL_LANGS.has(languageId)) { quoteChars.add("`"); }
  const stopPrefixes = getStopPrefixes(languageId);
  const results: StringInfo[] = [];
  let i = 0;

  while (i < line.length) {
    if (stopPrefixes.some((p) => line.startsWith(p, i))) { break; }

    const ch = line[i];
    if (quoteChars.has(ch) && !(ch === "'" && TRANSPOSE_LANGS.has(languageId) && isLikelyTranspose(line, i))) {
      const start = i;
      const quoteChar = ch;
      i++;
      let content = "";
      let closed = false;
      while (i < line.length) {
        if (line[i] === "\\" && i + 1 < line.length) {
          content += line[i] + line[i + 1];
          i += 2;
          continue;
        }
        if (line[i] === quoteChar) {
          closed = true;
          const end = i;
          i++;
          if (content.trim().length > 1) {
            results.push({ text: content, quoteChar, start, end });
          }
          break;
        }
        content += line[i];
        i++;
      }
      if (!closed) { break; }
    } else {
      i++;
    }
  }

  return results;
}
