# VSTranslate

A VS Code extension that translates non-English code comments into English inline, directly in your editor, using a locally-running [Ollama](https://ollama.com) LLM. No data leaves your machine.

![Translations displayed inline next to German comments](images/translated.jpg)

---

## Features

- Translates comments from any language into English
- Supports all common comment styles: `//`, `#`, `--`, `%`, `;`, `/* */`, `<!-- -->`
- Handles full-line comments, inline comments after code, and multi-line block comments
- Displays translations as inline decorations next to the original comment — similar to GitLens blame annotations
- Skips code lines and English comments automatically — only foreign language comments are shown
- Works on the cursor line with no selection required
- Can translate a selection, the entire file, or the entire workspace

---

## Requirements

- [Ollama](https://ollama.com) installed and running with at least one model pulled (e.g. `ollama pull gpt-oss:20b`)
- VS Code 1.85.0 or later

---

## Installation

Install VSTranslate from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=samikool.vscode-translate-llm), or manually from a `.vsix` file:

1. Download the latest `.vsix` from the [Releases](https://github.com/samikool/vscode-translate-llm/releases) page
2. Open VS Code and go to the Extensions view (`Ctrl+Shift+X`)
3. Click the `...` menu at the top right and select **Install from VSIX...**
4. Select the downloaded file

---

## Configuration

VSTranslate can be configured via **Settings → Extensions → VSTranslate** or directly in `settings.json`.

| Setting | Default | Description |
|---|---|---|
| `vstranslate.ollamaEndpoint` | `http://127.0.0.1:11434` | Base URL of the Ollama API |
| `vstranslate.ollamaModel` | `gpt-oss:20b` | Ollama model to use for translation |
| `vstranslate.ollamaApiKey` | _(empty)_ | API key, if your Ollama instance requires one |
| `vstranslate.ollamaTimeout` | `30` | Request timeout in seconds (`-1` for no timeout) |
| `vstranslate.overlayColor` | `#4EC9B0` | Hex color for the inline translation text |

To quickly switch models, open the Command Palette (`Ctrl+Shift+P`) and run **VSTranslate: Select Ollama Model** — this queries your Ollama instance and lets you pick from available models.

---

## Usage

1. Place your cursor on a comment line, or select a block of code containing comments

   ![Text selected in the editor](images/select-text.jpg)

2. Press `Ctrl+Shift+T` (macOS: `Cmd+Shift+T`), or right-click and choose one of:

   - **Translate Selection to English** — shows translations as inline decorations without modifying the file
   - **Replace Comments with Translation** — overwrites the original comment text in place
   - **Insert Translated Comments** — inserts the translation before the original comment text

   ![Right-click context menu showing Translate Selection to English](images/translate.jpg)

3. Translations appear inline at the end of each non-English comment line

   ![Inline translation overlays displayed next to each comment](images/translated.jpg)

4. Moving the cursor or changing the selection clears the overlays
5. To clear manually, open the Command Palette (`Ctrl+Shift+P`) and run **VSTranslate: Clear Translation Overlay**

### Translating a whole file or workspace

Open the Command Palette (`Ctrl+Shift+P`) and run:

- **VSTranslate: Translate File** — translates all comments in the active file; prompts for replace or insert mode, with an Undo notification on completion
- **VSTranslate: Translate Workspace** — translates all recognized source files in the workspace; shows a cancellable progress bar and an Undo notification on completion

---

## How It Works

When you trigger a translation:

1. VSTranslate scans the selected lines (or cursor line) and extracts comment text — full-line comments, inline comments after code, and multi-line block comments
2. If a selection partially overlaps a block comment, the range is automatically expanded to include the entire block
3. Only comment text is sent to Ollama; code lines are ignored entirely
4. Ollama is instructed to return each line unchanged if it is already in English
5. Lines returned unchanged are silently dropped — only translated lines get a decoration
6. Each translation is displayed as an italic overlay anchored to the end of its source line

---

## License

[MIT](LICENSE)
