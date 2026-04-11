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

// Returns the comment text (stripped of its marker) for full-line and inline
// comments. Returns null if the line contains no comment.
function extractComment(line: string, languageId: string): string | null {
  const prefixes = COMMENT_PREFIXES[languageId] ?? FALLBACK_PREFIXES;
  const trimmed = line.trim();

  // Full-line comment: trimmed line starts with a comment prefix
  for (const p of prefixes) {
    if (trimmed.startsWith(p)) {
      return trimmed.slice(p.length).trim();
    }
  }

  // Inline comment: comment prefix appears after code
  for (const p of prefixes) {
    const idx = findUnquotedIndex(line, p);
    if (idx !== -1) {
      return line.slice(idx + p.length).trim();
    }
  }

  return null;
}

export function activate(context: vscode.ExtensionContext): void {
  const overlayManager = new OverlayManager();

  const translateCommand = vscode.commands.registerCommand(
    "vstranslate.translate",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("VSTranslate: No active editor.");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showInformationMessage(
          "VSTranslate: Select the text you want to translate first."
        );
        return;
      }

      const languageId = editor.document.languageId;

      // Extract comment text from each line (full-line and inline).
      // We send only the comment content to Ollama, not the full line.
      const lines: { line: number; text: string }[] = [];
      for (let i = selection.start.line; i <= selection.end.line; i++) {
        const commentText = extractComment(editor.document.lineAt(i).text, languageId);
        if (commentText && commentText.length > 0) {
          lines.push({ line: i, text: commentText });
        }
      }

      if (lines.length === 0) {
        vscode.window.showInformationMessage("VSTranslate: No comments found in selection.");
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "VSTranslate",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: "Translating…" });
          try {
            const originalByLine = new Map(lines.map((l) => [l.line, l.text]));
            const translations = await translateWithOllama(lines);

            // Drop any line where the model returned the comment unchanged (already English)
            const nonEnglish = translations.filter(
              (t) => t.text.toLowerCase() !== (originalByLine.get(t.line) ?? "").toLowerCase()
            );

            if (nonEnglish.length > 0) {
              overlayManager.showTranslation(editor, nonEnglish);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`VSTranslate: ${message}`);
          }
        }
      );
    }
  );

  const clearCommand = vscode.commands.registerCommand(
    "vstranslate.clearOverlay",
    () => {
      overlayManager.clear();
    }
  );

  // Auto-clear overlay when the user moves the cursor or changes the selection
  const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(
    () => {
      overlayManager.clear();
    }
  );

  context.subscriptions.push(
    translateCommand,
    clearCommand,
    selectionChangeListener,
    overlayManager
  );
}

export function deactivate(): void {
  // Cleanup is handled via context.subscriptions
}
