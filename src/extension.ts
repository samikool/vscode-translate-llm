import * as vscode from "vscode";
import { translateWithOllama, getOllamaModels } from "./ollamaClient";
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

// Block comment open/close delimiters for languages that support them
const BLOCK_COMMENT_SYNTAX: Record<string, { open: string; close: string }> = {
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

// File extensions that map to a known language with comment syntax
const KNOWN_EXTENSIONS = new Set([
  "js", "ts", "jsx", "tsx", "java", "c", "cpp", "cc", "cs", "go",
  "rs", "swift", "kt", "dart", "groovy", "py", "rb", "sh", "yaml",
  "yml", "r", "pl", "coffee", "sql", "lua", "hs", "m", "tex", "clj", "lisp",
  "css", "scss", "less", "html", "xml",
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
  // For block comments: the closing delimiter and its column position.
  // For line comments: suffix is "" and suffixStart equals the line length.
  suffix: string;
  suffixStart: number;
}

// Returns the comment text (stripped of its marker) plus location metadata.
// Handles single-line block comments (/* ... */) as well as line comments.
// Returns null if the line contains no comment.
function extractComment(line: string, languageId: string): CommentInfo | null {
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
  const blockSyntax = BLOCK_COMMENT_SYNTAX[languageId];
  let inBlock = false;
  let blockClose = "";

  for (let i = range.start.line; i <= range.end.line; i++) {
    const rawLine = doc.lineAt(i).text;

    if (inBlock) {
      const closeIdx = rawLine.indexOf(blockClose);
      if (closeIdx !== -1) {
        inBlock = false;
        // Content on the closing line, before the closing delimiter
        const prefixMatch = rawLine.match(/^(\s*\*?)/);
        const prefixStr = prefixMatch?.[1] ?? "";
        const text = rawLine.slice(prefixStr.length, closeIdx).trim();
        if (text.length > 0) {
          lines.push({ line: i, text, prefix: prefixStr, prefixStart: 0, suffix: blockClose, suffixStart: closeIdx });
        }
      } else {
        // Interior line: strip leading whitespace + optional * marker
        const prefixMatch = rawLine.match(/^(\s*\*?)/);
        const prefixStr = prefixMatch?.[1] ?? "";
        const text = rawLine.slice(prefixStr.length).trim();
        if (text.length > 0) {
          lines.push({ line: i, text, prefix: prefixStr, prefixStart: 0, suffix: "", suffixStart: rawLine.length });
        }
      }
      continue;
    }

    // Check for the start of a multi-line block comment (no close on the same line)
    if (blockSyntax) {
      const openIdx = rawLine.indexOf(blockSyntax.open);
      if (openIdx !== -1 && rawLine.indexOf(blockSyntax.close, openIdx + blockSyntax.open.length) === -1) {
        inBlock = true;
        blockClose = blockSyntax.close;
        const text = rawLine.slice(openIdx + blockSyntax.open.length).trim();
        if (text.length > 0) {
          lines.push({ line: i, text, prefix: blockSyntax.open, prefixStart: openIdx, suffix: "", suffixStart: rawLine.length });
        }
        continue;
      }
    }

    // Single-line block comment or line comment
    const info = extractComment(rawLine, languageId);
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
    // For block comments: replace only up to the closing delimiter so it is preserved.
    // For line comments: suffix is "" and suffixStart equals line length (same as before).
    const contentEnd = info.suffix ? info.suffixStart : doc.lineAt(t.line).text.length;
    const range = new vscode.Range(t.line, commentStart, t.line, contentEnd);
    let replacement: string;
    if (mode === "replace") {
      // Add a trailing space before */ so the result is /* translation */ not /* translation*/
      replacement = info.suffix ? ` ${t.text} ` : ` ${t.text}`;
    } else {
      // For block comments, nesting /* */ markers is not valid C/CSS syntax, so
      // keep the original as a parenthetical rather than re-using the prefix.
      replacement = info.suffix
        ? ` ${t.text} (${info.text}) `
        : ` ${t.text} ${info.prefix} ${info.text}`;
    }
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

  // Command: pick a model from the ones available on the configured Ollama instance
  const selectModelCommand = vscode.commands.registerCommand(
    "vstranslate.selectModel",
    async () => {
      let models: string[];
      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: "VSTranslate", cancellable: false },
          async (progress) => {
            progress.report({ message: "Fetching models from Ollama…" });
            models = await getOllamaModels();
          }
        );
      } catch (err) {
        vscode.window.showErrorMessage(`VSTranslate: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      if (models!.length === 0) {
        vscode.window.showInformationMessage("VSTranslate: No models found on the Ollama instance.");
        return;
      }

      const currentModel = vscode.workspace.getConfiguration("vstranslate").get<string>("ollamaModel", "");
      const items = models!.map((name) => ({
        label: name,
        description: name === currentModel ? "current" : undefined,
      }));

      const pick = await vscode.window.showQuickPick(items, { placeHolder: "Select an Ollama model" });
      if (!pick) { return; }

      await vscode.workspace.getConfiguration("vstranslate").update("ollamaModel", pick.label, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`VSTranslate: Model set to "${pick.label}".`);
    }
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
    selectModelCommand,
    selectionChangeListener,
    overlayManager
  );
}

export function deactivate(): void {
  // Cleanup is handled via context.subscriptions
}
