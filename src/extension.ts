import * as vscode from "vscode";
import { translateWithOllama } from "./ollamaClient";
import { OverlayManager } from "./overlayManager";

const COMMENT_PREFIXES: Record<string, string[]> = {
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

const FALLBACK_PREFIXES = ["//", "#", "--", "%", ";"];

// Find the index of an unquoted comment prefix, skipping over string literals.
function findUnquotedIndex(line: string, prefix: string): number {
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

interface CommentInfo {
  text: string;
  prefix: string;
  prefixStart: number;
}

// Returns the comment text (stripped of its marker) plus the prefix and its
// position in the raw line. Returns null if the line contains no comment.
function extractComment(line: string, languageId: string): CommentInfo | null {
  const prefixes = COMMENT_PREFIXES[languageId] ?? FALLBACK_PREFIXES;
  const trimmed = line.trim();

  // Full-line comment: trimmed line starts with a comment prefix
  for (const p of prefixes) {
    if (trimmed.startsWith(p)) {
      const prefixStart = line.indexOf(p);
      return { text: trimmed.slice(p.length).trim(), prefix: p, prefixStart };
    }
  }

  // Inline comment: comment prefix appears after code
  for (const p of prefixes) {
    const idx = findUnquotedIndex(line, p);
    if (idx !== -1) {
      return { text: line.slice(idx + p.length).trim(), prefix: p, prefixStart: idx };
    }
  }

  return null;
}

interface LineInfo extends CommentInfo {
  line: number;
}

// Extracts comments from the selection and sends them to Ollama.
// Returns translated lines (already-English lines are filtered out), plus
// the per-line metadata needed for edits. Returns null on error.
async function getTranslations(
  editor: vscode.TextEditor
): Promise<{ translations: { line: number; text: string }[]; infoByLine: Map<number, LineInfo> } | null> {
  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showInformationMessage("VSTranslate: Select the text you want to translate first.");
    return null;
  }

  const languageId = editor.document.languageId;
  const lines: LineInfo[] = [];
  for (let i = selection.start.line; i <= selection.end.line; i++) {
    const info = extractComment(editor.document.lineAt(i).text, languageId);
    if (info && info.text.length > 0) {
      lines.push({ line: i, ...info });
    }
  }

  if (lines.length === 0) {
    vscode.window.showInformationMessage("VSTranslate: No comments found in selection.");
    return null;
  }

  let translations: { line: number; text: string }[] = [];

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "VSTranslate", cancellable: false },
    async (progress) => {
      progress.report({ message: "Translating…" });
      const originalByLine = new Map(lines.map((l) => [l.line, l.text]));
      const raw = await translateWithOllama(lines);
      translations = raw.filter(
        (t) => t.text.toLowerCase() !== (originalByLine.get(t.line) ?? "").toLowerCase()
      );
    }
  );

  if (translations.length === 0) { return null; }

  return { translations, infoByLine: new Map(lines.map((l) => [l.line, l])) };
}

export function activate(context: vscode.ExtensionContext): void {
  const overlayManager = new OverlayManager();

  // Command 1: overlay (non-destructive, existing behaviour)
  const translateCommand = vscode.commands.registerCommand(
    "vstranslate.translate",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showErrorMessage("VSTranslate: No active editor."); return; }

      try {
        const result = await getTranslations(editor);
        if (result) {
          overlayManager.showTranslation(editor, result.translations);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`VSTranslate: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  );

  // Command 2: replace comment text with the translation
  const replaceCommand = vscode.commands.registerCommand(
    "vstranslate.replaceComments",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showErrorMessage("VSTranslate: No active editor."); return; }

      try {
        const result = await getTranslations(editor);
        if (!result) { return; }

        const edit = new vscode.WorkspaceEdit();
        for (const t of result.translations) {
          const info = result.infoByLine.get(t.line);
          if (!info) { continue; }
          const commentStart = info.prefixStart + info.prefix.length;
          const range = new vscode.Range(t.line, commentStart, t.line, editor.document.lineAt(t.line).text.length);
          edit.replace(editor.document.uri, range, ` ${t.text}`);
        }
        await vscode.workspace.applyEdit(edit);
      } catch (err) {
        vscode.window.showErrorMessage(`VSTranslate: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  );

  // Command 3: insert translation before the original comment text
  const insertCommand = vscode.commands.registerCommand(
    "vstranslate.insertComments",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showErrorMessage("VSTranslate: No active editor."); return; }

      try {
        const result = await getTranslations(editor);
        if (!result) { return; }

        const edit = new vscode.WorkspaceEdit();
        for (const t of result.translations) {
          const info = result.infoByLine.get(t.line);
          if (!info) { continue; }
          const commentStart = info.prefixStart + info.prefix.length;
          const range = new vscode.Range(t.line, commentStart, t.line, editor.document.lineAt(t.line).text.length);
          edit.replace(editor.document.uri, range, ` ${t.text} ${info.prefix} ${info.text}`);
        }
        await vscode.workspace.applyEdit(edit);
      } catch (err) {
        vscode.window.showErrorMessage(`VSTranslate: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  );

  const clearCommand = vscode.commands.registerCommand(
    "vstranslate.clearOverlay",
    () => { overlayManager.clear(); }
  );

  // Auto-clear overlay when the user moves the cursor or changes the selection
  const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(
    () => { overlayManager.clear(); }
  );

  context.subscriptions.push(
    translateCommand,
    replaceCommand,
    insertCommand,
    clearCommand,
    selectionChangeListener,
    overlayManager
  );
}

export function deactivate(): void {
  // Cleanup is handled via context.subscriptions
}
