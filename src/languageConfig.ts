import * as vscode from "vscode";
import {
  COMMENT_PREFIXES,
  BLOCK_COMMENT_SYNTAX,
  FALLBACK_PREFIXES,
  CommentSyntax,
} from "./commentParser";

const cache = new Map<string, CommentSyntax>();

// Returns the comment syntax for a language ID, resolved in priority order:
// 1. In-memory cache (session-scoped)
// 2. Static map in commentParser.ts (handles multi-prefix cases VS Code's single
//    lineComment field can't express, e.g. PHP uses both // and #)
// 3. Dynamic lookup — walks all installed extensions for a language-configuration.json
//    that declares comments for this language ID
// 4. FALLBACK_PREFIXES as a last resort
export async function getCommentSyntax(languageId: string): Promise<CommentSyntax> {
  const cached = cache.get(languageId);
  if (cached) { return cached; }

  const staticPrefixes = COMMENT_PREFIXES[languageId];
  if (staticPrefixes !== undefined) {
    const result: CommentSyntax = { linePrefixes: staticPrefixes, block: BLOCK_COMMENT_SYNTAX[languageId] };
    cache.set(languageId, result);
    return result;
  }

  const dynamic = await resolveFromExtensions(languageId);
  if (dynamic) {
    cache.set(languageId, dynamic);
    return dynamic;
  }

  const fallback: CommentSyntax = { linePrefixes: [...FALLBACK_PREFIXES] };
  cache.set(languageId, fallback);
  return fallback;
}

async function resolveFromExtensions(languageId: string): Promise<CommentSyntax | null> {
  for (const ext of vscode.extensions.all) {
    const langs: unknown[] = ext.packageJSON?.contributes?.languages;
    if (!Array.isArray(langs)) { continue; }
    for (const lang of langs) {
      if (
        typeof lang !== "object" || lang === null ||
        (lang as any).id !== languageId ||
        typeof (lang as any).configuration !== "string"
      ) { continue; }

      const configUri = vscode.Uri.joinPath(
        vscode.Uri.file(ext.extensionPath),
        (lang as any).configuration
      );
      try {
        const bytes = await vscode.workspace.fs.readFile(configUri);
        const text = new TextDecoder().decode(bytes);
        const config = JSON.parse(stripJsoncComments(text));
        const result = extractCommentSyntax(config);
        if (result) { return result; }
      } catch {
        // malformed or missing config — try next extension
      }
    }
  }
  return null;
}

function extractCommentSyntax(config: unknown): CommentSyntax | null {
  if (typeof config !== "object" || config === null) { return null; }
  const comments = (config as any).comments;
  if (!comments) { return null; }

  const linePrefixes: string[] = [];
  if (typeof comments.lineComment === "string" && comments.lineComment.length > 0) {
    linePrefixes.push(comments.lineComment);
  }

  let block: { open: string; close: string } | undefined;
  if (
    Array.isArray(comments.blockComment) &&
    comments.blockComment.length === 2 &&
    typeof comments.blockComment[0] === "string" &&
    typeof comments.blockComment[1] === "string"
  ) {
    block = { open: comments.blockComment[0], close: comments.blockComment[1] };
  }

  if (linePrefixes.length === 0 && !block) { return null; }
  return { linePrefixes, block };
}

// Strips // and /* */ comments from JSONC text while preserving string contents.
function stripJsoncComments(text: string): string {
  let result = "";
  let i = 0;
  let inString = false;
  while (i < text.length) {
    if (inString) {
      if (text[i] === "\\") {
        result += text[i++];
        if (i < text.length) { result += text[i++]; }
        continue;
      }
      if (text[i] === '"') { inString = false; }
      result += text[i++];
    } else if (text[i] === '"') {
      inString = true;
      result += text[i++];
    } else if (text[i] === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") { i++; }
    } else if (text[i] === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) { i++; }
      i += 2;
    } else {
      result += text[i++];
    }
  }
  return result;
}
