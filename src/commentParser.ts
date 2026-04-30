export const COMMENT_PREFIXES: Record<string, string[]> = {
  javascript: ["//"], typescript: ["//"], javascriptreact: ["//"],
  typescriptreact: ["//"], java: ["//"], c: ["//"], cpp: ["//"],
  csharp: ["//"], go: ["//"], rust: ["//"], swift: ["//"],
  kotlin: ["//"], dart: ["//"], groovy: ["//"],
  python: ["#"], ruby: ["#"], shellscript: ["#"], yaml: ["#"],
  r: ["#"], perl: ["#"], coffeescript: ["#"],
  sql: ["--"], lua: ["--"], haskell: ["--"],
  matlab: ["%"], latex: ["%"],
  clojure: [";"], lisp: [";"],
};

// Block comment open/close delimiters for languages that support them
export const BLOCK_COMMENT_SYNTAX: Record<string, { open: string; close: string }> = {
  javascript: { open: "/*", close: "*/" }, typescript: { open: "/*", close: "*/" },
  javascriptreact: { open: "/*", close: "*/" }, typescriptreact: { open: "/*", close: "*/" },
  java: { open: "/*", close: "*/" }, c: { open: "/*", close: "*/" },
  cpp: { open: "/*", close: "*/" }, csharp: { open: "/*", close: "*/" },
  go: { open: "/*", close: "*/" }, rust: { open: "/*", close: "*/" },
  swift: { open: "/*", close: "*/" }, kotlin: { open: "/*", close: "*/" },
  dart: { open: "/*", close: "*/" }, groovy: { open: "/*", close: "*/" },
  sql: { open: "/*", close: "*/" }, css: { open: "/*", close: "*/" },
  scss: { open: "/*", close: "*/" }, less: { open: "/*", close: "*/" },
  html: { open: "<!--", close: "-->" }, xml: { open: "<!--", close: "-->" },
};

export const FALLBACK_PREFIXES = ["//", "#", "--", "%", ";"];

// Find the index of an unquoted comment prefix, skipping over string literals.
export function findUnquotedIndex(line: string, prefix: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i <= line.length - prefix.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (!inSingle && !inDouble && line.startsWith(prefix, i)) {
      return i;
    }
  }
  return -1;
}

export interface CommentInfo {
  text: string;
  prefix: string;
  prefixStart: number;
  // For block comments: the closing delimiter and its column position.
  // For line comments: suffix is "" and suffixStart equals the line length.
  suffix: string;
  suffixStart: number;
}

// Returns the comment text (stripped of its marker) plus location metadata.
// Handles single-line block comments (/* ... */) as well as line comments.
// Returns null if the line contains no comment.
export function extractComment(line: string, languageId: string): CommentInfo | null {
  const block = BLOCK_COMMENT_SYNTAX[languageId];
  const prefixes = COMMENT_PREFIXES[languageId] ?? FALLBACK_PREFIXES;
  const trimmed = line.trim();

  // Single-line block comment: open and close both appear on this line.
  if (block) {
    const openIdx = line.indexOf(block.open);
    if (openIdx !== -1) {
      const closeIdx = line.indexOf(block.close, openIdx + block.open.length);
      if (closeIdx !== -1) {
        // Only treat as a block comment if no line-comment prefix comes before it.
        const lineCommentFirst = prefixes.some((p) => {
          const idx = findUnquotedIndex(line, p);
          return idx !== -1 && idx < openIdx;
        });
        if (!lineCommentFirst) {
          const text = line.slice(openIdx + block.open.length, closeIdx).trim();
          if (text.length > 0) {
            return { text, prefix: block.open, prefixStart: openIdx, suffix: block.close, suffixStart: closeIdx };
          }
          return null;
        }
      }
    }
  }

  // Full-line comment: trimmed line starts with a comment prefix
  for (const p of prefixes) {
    if (trimmed.startsWith(p)) {
      const prefixStart = line.indexOf(p);
      return { text: trimmed.slice(p.length).trim(), prefix: p, prefixStart, suffix: "", suffixStart: line.length };
    }
  }

  // Inline comment: comment prefix appears after code
  for (const p of prefixes) {
    const idx = findUnquotedIndex(line, p);
    if (idx !== -1) {
      return { text: line.slice(idx + p.length).trim(), prefix: p, prefixStart: idx, suffix: "", suffixStart: line.length };
    }
  }

  return null;
}

export interface DocLike {
  lineAt(i: number): { text: string };
  lineCount: number;
}

export interface SimpleRange {
  startLine: number;
  endLine: number;
}

// Expands a range to fully cover any multi-line block comments it touches.
// If the range starts mid-block, the start is pulled back to the opening line.
// If the range ends mid-block, the end is pushed forward to the closing line.
export function expandRangeForBlocks(
  doc: DocLike,
  startLine: number,
  endLine: number,
  blockSyntax: { open: string; close: string }
): SimpleRange {
  // Scan backwards to find if startLine is inside a block comment
  for (let i = startLine - 1; i >= 0; i--) {
    const line = doc.lineAt(i).text;
    const lastOpen = line.lastIndexOf(blockSyntax.open);
    const lastClose = line.lastIndexOf(blockSyntax.close);
    if (lastClose !== -1 && (lastOpen === -1 || lastClose > lastOpen)) {
      break; // found a close — outside any block
    }
    if (lastOpen !== -1 && (lastClose === -1 || lastOpen > lastClose)) {
      startLine = i; // expand start to the opening line
      break;
    }
  }

  // Simulate block state from startLine to endLine to see if we end mid-block
  let inBlock = false;
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.lineAt(i).text;
    if (inBlock) {
      if (line.indexOf(blockSyntax.close) !== -1) { inBlock = false; }
    } else {
      const openIdx = line.indexOf(blockSyntax.open);
      if (openIdx !== -1 && line.indexOf(blockSyntax.close, openIdx + blockSyntax.open.length) === -1) {
        inBlock = true;
      }
    }
  }

  // If still inside a block at the end, scan forward to find the closing line
  if (inBlock) {
    for (let i = endLine + 1; i < doc.lineCount; i++) {
      if (doc.lineAt(i).text.indexOf(blockSyntax.close) !== -1) {
        endLine = i;
        break;
      }
    }
  }

  return { startLine, endLine };
}
