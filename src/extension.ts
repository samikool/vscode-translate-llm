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

// File extensions that map to a known language with comment syntax
const KNOWN_EXTENSIONS = new Set([
  "js", "ts", "jsx", "tsx", "java", "c", "cpp", "cc", "cs", "go",
  "rs", "swift", "kt", "dart", "groovy", "py", "rb", "sh", "yaml",
  "yml", "r", "pl", "coffee", "sql", "lua", "hs", "m", "tex", "clj", "lisp",
]);

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

type TranslationResult = {
  translations: { line: number; text: string }[];
  infoByLine: Map<number, LineInfo>;
};

// Extracts comments from the given range of a document and sends them to Ollama.
// Returns translated lines (already-English lines filtered out) plus per-line
// metadata. Returns null if there is nothing to translate.
async function getTranslations(
  doc: vscode.TextDocument,
  range: vscode.Range
): Promise<TranslationResult | null> {
  const languageId = doc.languageId;
  const lines: LineInfo[] = [];
  for (let i = range.start.line; i <= range.end.line; i++) {
    const info = extractComment(doc.lineAt(i).text, languageId);
    if (info && info.text.length > 0) {
      lines.push({ line: i, ...info });
    }
  }

  if (lines.length === 0) { return null; }

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

// Builds a WorkspaceEdit for a single document given translation results and mode.
function buildEdit(
  uri: vscode.Uri,
  doc: vscode.TextDocument,
  result: TranslationResult,
  mode: "replace" | "insert"
): vscode.WorkspaceEdit {
  const edit = new vscode.WorkspaceEdit();
  for (const t of result.translations) {
    const info = result.infoByLine.get(t.line);
    if (!info) { continue; }
    const commentStart = info.prefixStart + info.prefix.length;
    const range = new vscode.Range(t.line, commentStart, t.line, doc.lineAt(t.line).text.length);
    const replacement = mode === "replace"
      ? ` ${t.text}`
      : ` ${t.text} ${info.prefix} ${info.text}`;
    edit.replace(uri, range, replacement);
  }
  return edit;
}

// Shows a notification with an Undo button that restores original file contents
// via a WorkspaceEdit, bypassing the per-editor undo stack entirely.
function showUndoNotification(message: string, originals: Map<vscode.Uri, string>): void {
  vscode.window.showInformationMessage(message, "Undo").then(async (choice) => {
    if (choice !== "Undo") { return; }
    const edit = new vscode.WorkspaceEdit();
    for (const [uri, originalText] of originals) {
      const doc = await vscode.workspace.openTextDocument(uri);
      const fullRange = new vscode.Range(0, 0, doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
      edit.replace(uri, fullRange, originalText);
    }
    await vscode.workspace.applyEdit(edit);
  });
}

export function activate(context: vscode.ExtensionContext): void {
  const overlayManager = new OverlayManager();

  // Command 1: overlay (non-destructive)
  const translateCommand = vscode.commands.registerCommand(
    "vstranslate.translate",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showErrorMessage("VSTranslate: No active editor."); return; }
      if (editor.selection.isEmpty) {
        vscode.window.showInformationMessage("VSTranslate: Select the text you want to translate first.");
        return;
      }

      try {
        const result = await getTranslations(editor.document, editor.selection);
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
      if (editor.selection.isEmpty) {
        vscode.window.showInformationMessage("VSTranslate: Select the text you want to translate first.");
        return;
      }

      try {
        const result = await getTranslations(editor.document, editor.selection);
        if (!result) { return; }
        await vscode.workspace.applyEdit(buildEdit(editor.document.uri, editor.document, result, "replace"));
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
      if (editor.selection.isEmpty) {
        vscode.window.showInformationMessage("VSTranslate: Select the text you want to translate first.");
        return;
      }

      try {
        const result = await getTranslations(editor.document, editor.selection);
        if (!result) { return; }
        await vscode.workspace.applyEdit(buildEdit(editor.document.uri, editor.document, result, "insert"));
      } catch (err) {
        vscode.window.showErrorMessage(`VSTranslate: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  );

  // Command 4: translate whole file — prompts for replace or insert mode
  const translateFileCommand = vscode.commands.registerCommand(
    "vstranslate.translateFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showErrorMessage("VSTranslate: No active editor."); return; }

      const pick = await vscode.window.showQuickPick(
        [
          { label: "Replace Comments with Translation", mode: "replace" as const },
          { label: "Insert Translated Comments", mode: "insert" as const },
        ],
        { placeHolder: "How should the translations be applied?" }
      );
      if (!pick) { return; }

      try {
        const doc = editor.document;
        const originalText = doc.getText();
        const fileRange = new vscode.Range(0, 0, doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
        const result = await getTranslations(doc, fileRange);
        if (!result) { return; }
        await vscode.workspace.applyEdit(buildEdit(doc.uri, doc, result, pick.mode));
        showUndoNotification("File translated. Undo?", new Map([[doc.uri, originalText]]));
      } catch (err) {
        vscode.window.showErrorMessage(`VSTranslate: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  );

  // Command 5: translate whole workspace — prompts for mode, confirms, then processes file by file
  const translateWorkspaceCommand = vscode.commands.registerCommand(
    "vstranslate.translateWorkspace",
    async () => {
      const pick = await vscode.window.showQuickPick(
        [
          { label: "Replace Comments with Translation", mode: "replace" as const },
          { label: "Insert Translated Comments", mode: "insert" as const },
        ],
        { placeHolder: "How should the translations be applied?" }
      );
      if (!pick) { return; }

      const confirmed = await vscode.window.showWarningMessage(
        "This will modify all recognized source files in the workspace. Continue?",
        { modal: true },
        "Yes"
      );
      if (confirmed !== "Yes") { return; }

      // Find all files with known extensions
      const uris = await vscode.workspace.findFiles(
        "**/*",
        "{**/node_modules/**,**/dist/**,**/out/**,**/.git/**}"
      );
      const filtered = uris.filter((uri) => {
        const ext = uri.fsPath.split(".").pop()?.toLowerCase() ?? "";
        return KNOWN_EXTENSIONS.has(ext);
      });

      if (filtered.length === 0) {
        vscode.window.showInformationMessage("VSTranslate: No recognized source files found in workspace.");
        return;
      }

      const originals = new Map<vscode.Uri, string>();
      let failedFile: string | undefined;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "VSTranslate: Translating workspace",
          cancellable: true,
        },
        async (progress, token) => {
          for (let i = 0; i < filtered.length; i++) {
            if (token.isCancellationRequested) { break; }

            const uri = filtered[i];
            const fileName = uri.fsPath.split(/[\\/]/).pop() ?? uri.fsPath;
            progress.report({ message: `${fileName} (${i + 1} of ${filtered.length})`, increment: (1 / filtered.length) * 100 });

            try {
              const doc = await vscode.workspace.openTextDocument(uri);
              const fileRange = new vscode.Range(0, 0, doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
              const result = await getTranslations(doc, fileRange);
              if (!result) { continue; }

              const originalText = doc.getText();
              await vscode.workspace.applyEdit(buildEdit(uri, doc, result, pick.mode));
              originals.set(uri, originalText);
            } catch {
              failedFile = fileName;
              break;
            }
          }
        }
      );

      if (failedFile) {
        vscode.window.showErrorMessage(`VSTranslate: Failed on "${failedFile}".`);
        if (originals.size > 0) {
          showUndoNotification(
            `${originals.size} file(s) were modified before the failure. Undo?`,
            originals
          );
        }
      } else if (originals.size > 0) {
        showUndoNotification(`Translated ${originals.size} file(s). Undo?`, originals);
      } else {
        vscode.window.showInformationMessage("VSTranslate: No non-English comments found in workspace.");
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
    translateFileCommand,
    translateWorkspaceCommand,
    clearCommand,
    selectionChangeListener,
    overlayManager
  );
}

export function deactivate(): void {
  // Cleanup is handled via context.subscriptions
}
