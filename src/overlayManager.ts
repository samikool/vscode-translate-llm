import * as vscode from "vscode";
import { LineTranslation } from "./ollamaClient";

/**
 * Manages inline translation overlay decorations, similar to how GitLens
 * shows blame info after the end of a line.
 */
export class OverlayManager {
  private decorationType: vscode.TextEditorDecorationType;
  private activeEditor: vscode.TextEditor | undefined;

  constructor() {
    this.decorationType = this.createDecorationType();

    // Rebuild decoration type when settings change (e.g. color update)
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("vstranslate.overlayColor")) {
        this.decorationType.dispose();
        this.decorationType = this.createDecorationType();
      }
    });
  }

  private createDecorationType(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("vstranslate.overlayForeground"),
        fontStyle: "italic",
      },
      // Fallback inline style when theme color is not defined
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      // We'll set the actual color per-decoration in renderOptions
      // so the ThemeColor above acts as a hint only; see showTranslation()
    });
  }

  /**
   * Show each translated line as an inline overlay at the end of its
   * corresponding source line in `editor`.
   */
  showTranslation(
    editor: vscode.TextEditor,
    translations: LineTranslation[]
  ): void {
    this.activeEditor = editor;

    const color = vscode.workspace
      .getConfiguration("vstranslate")
      .get<string>("overlayColor", "#4EC9B0");

    const maxInlineLength = 120;

    const decorations: vscode.DecorationOptions[] = translations.map(({ line, text }) => {
      const lineEnd = editor.document.lineAt(line).range.end;
      const displayText =
        text.length > maxInlineLength ? text.slice(0, maxInlineLength) + "…" : text;

      return {
        range: new vscode.Range(lineEnd, lineEnd),
        renderOptions: {
          after: {
            contentText: `  [${displayText}]`,
            color,
            fontStyle: "italic",
          },
        },
        hoverMessage: new vscode.MarkdownString(`**VSTranslate**\n\n${text}`),
      };
    });

    editor.setDecorations(this.decorationType, decorations);
  }

  /** Remove all overlays from the active editor. */
  clear(): void {
    if (this.activeEditor) {
      this.activeEditor.setDecorations(this.decorationType, []);
    }
  }

  dispose(): void {
    this.decorationType.dispose();
  }
}
