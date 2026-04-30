# Changelog

All notable changes to VSTranslate will be documented here.

---

## [0.3.1] — 2026-04-30

### Added
- Extension icon for the VS Code Marketplace

---

## [0.3.0] — 2026-04-30

### Added
- Block comment support: single-line `/* */`, multi-line `/* ... */`, and HTML `<!-- -->` comments are now detected and translated
- Configurable request timeout (`vstranslate.ollamaTimeout`, default 30s; `-1` for no timeout)
- **Select Ollama Model** command: queries your Ollama instance and lets you pick from available models via a Quick Pick menu
- Cursor-line auto-detection: triggering a translation with no selection now translates the comment on the current line
- Right-click context menu entries for all three translation modes (overlay, replace, insert)
- Range expansion: if a selection partially overlaps a multi-line block comment, the range is automatically expanded to cover the entire block

### Changed
- Examples folder updated to cover multiple coding languages (C, JavaScript, Java, Go, TypeScript, Rust, CSS, Ruby) with all comment styles each language supports

---

## [0.2.0] — 2026-04-11

### Added
- **Replace Comments** mode: overwrites original comment text in place with the translation
- **Insert Comments** mode: inserts the translation before the original comment text
- **Translate File** command: translates all comments in the active file with a mode picker and Undo notification
- **Translate Workspace** command: translates all recognized source files in the workspace with a cancellable progress bar and Undo notification

---

## [0.1.0] — 2026-04-11

### Added
- Initial release
- Inline overlay translations displayed as decorations next to each non-English comment line
- Supports line comment styles: `//`, `#`, `--`, `%`, `;`
- English comments are automatically skipped
- Configurable Ollama endpoint, model, API key, and overlay color
- `Ctrl+Shift+T` / `Cmd+Shift+T` keybinding
