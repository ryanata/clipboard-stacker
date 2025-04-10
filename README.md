# Clipboard Stacker 🪣 [Beta]

[![VSIX Version](https://img.shields.io/visual-studio-marketplace/v/ryanata.clipboard-stacker)](https://marketplace.visualstudio.com/items?itemName=ryanata.clipboard-stacker)

> Accumulate multiple code snippets and files into a single clipboard buffer for easy pasting.

---

## Installation

1. Open Extensions (`⌘⇧X` / `Ctrl+Shift+X`)
2. Search "Clipboard Stacker" and install
3. Reload VSCode

*Beta:* To get pre-release updates, click the gear icon → **Switch to Pre-Release Version**

---

## Commands & Shortcuts

| Command                        | macOS                   | Windows/Linux            |
|--------------------------------|-------------------------|--------------------------|
| Add Selection to Buffer        | Cmd+Ctrl+C              | Ctrl+Alt+C               |
| Add File(s) to Buffer          | Cmd+M                   | Ctrl+M                   |
| Clear Clipboard Buffer         | Cmd+Ctrl+Backspace      | Ctrl+Shift+Backspace     |

Use the Command Palette (`⌘⇧P` / `Ctrl+Shift+P`) or the 🪣 status bar icon for quick actions.

---

## Requirements

- VSCode 1.98.0+

---

## Links

- [Repository](https://github.com/ryanata/clipboard-stacker)
- [License (MIT)](LICENSE)

---

## Known Issues

- No settings to customize copy behavior

---

## Release Notes

### 0.1.2 Prerelease

- Status bar menu now allows deleting individual snippets directly
- Status bar menu now allows re-copying the current buffer contents
- Improved quick access to buffer management from the status bar

### 0.1.0 Prerelease

- Initial pre-release with core functionality:
  - Code snippet accumulation with context
  - Multi-file selection
  - Status bar integration
