# Clipboard Stacker 🪣 [Beta]

[![GitHub Release](https://img.shields.io/github/v/release/ryanata/clipboard-stacker?include_prereleases)](https://github.com/ryanata/clipboard-stacker/releases)

> Multi-selection clipboard buffer for accumulating code snippets and files for LLMs

## ⚙️ Installation

1. Download latest `.vsix` from [Releases](https://github.com/ryanata/clipboard-stacker/releases)
2. In VSCode: 
   - Open Extensions view
   - Click `⋯` → "Install from VSIX"
3. Select downloaded file and reload VSCode

*Beta Note:* During testing, you may need to enable unsigned extensions in VS Code settings.

## Core Features

- **Clipboard Stacking**  
  Maintain multiple code snippets/files in a single buffer
- **Quick Controls**:
  - Add code selections (`⌘⌃C`/`Ctrl+Shift+C`)
  - Add files via QuickPick (`⌘M`/`Ctrl+M`)
  - Clear buffer (`⌘⇧⌫`/`Ctrl+Shift+Backspace`)
    - Can also clear buffer via status bar in bottom right

## 📜 License
Distributed under the [MIT License](LICENSE).

## Known Issues (Beta)

- No settings to customize copy behavior

## Release Notes

### 0.1.0 Prerelease
Initial pre-release with core functionality:
- Code snippet accumulation with context
- Multi-file selection
- Status bar integration
