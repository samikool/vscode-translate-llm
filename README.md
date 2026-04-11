# VSTranslate

A VS Code extension that translates non-English code comments into English inline, directly in your editor, using a locally-running [Ollama](https://ollama.com) LLM. No data leaves your machine.

![Translations displayed inline next to German comments](images/translated.jpg)

---

## Features

- Translates single-line and inline comments from any language into English
- Displays translations as inline decorations next to the original comment — similar to GitLens blame annotations
- Skips code lines and English comments automatically — only foreign language comments are shown
- Supports all common comment styles (`//`, `#`, `--`, `%`, `;`)

---

## Requirements

- [Ollama](https://ollama.com) installed and running with at least one model pulled (e.g. `ollama pull gpt-oss:20b`)
- VS Code 1.85.0 or later

---

## Installation

Until VSTranslate is available on the VS Code Marketplace, you can install it manually from a `.vsix` file:

1. Download the latest `.vsix` from the [Releases](https://github.com/samikool/vscode-translate/releases) page
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
| `vstranslate.overlayColor` | `#4EC9B0` | Hex color for the inline translation text |

---

## Usage

1. Select any block of code containing comments you want to translate

   ![Text selected in the editor](images/select-text.jpg)

2. Press `Ctrl+Shift+T` (macOS: `Cmd+Shift+T`), or right-click and choose **Translate Selection to English**

   ![Right-click context menu showing Translate Selection to English](images/translate.jpg)

3. Translations appear inline at the end of each non-English comment line

   ![Inline translation overlays displayed next to each comment](images/translated.jpg)

4. Moving the cursor or changing the selection clears the overlays
5. To clear manually, open the Command Palette (`Ctrl+Shift+P`) and run **VSTranslate: Clear Translation Overlay**

---

## How It Works

When you trigger a translation:

1. VSTranslate scans the selected lines and extracts comment text — both full-line comments and inline comments after code
2. Only comment lines are sent to Ollama; code lines are ignored entirely
3. Ollama is instructed to return each line unchanged if it is already in English
4. Lines returned unchanged are silently dropped — only translated lines get a decoration
5. Each translation is displayed as an italic overlay anchored to the end of its source line

---

## License

[MIT](LICENSE)
