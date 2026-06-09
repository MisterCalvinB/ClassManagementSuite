# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Maintenance

Whenever a user-facing feature, tool, setting, or behavior changes, update both:
- `README.md` — high-level feature descriptions and usage instructions
- `how-to.html` — the built-in user guide (mirrors README content for in-app help)

Keep both in sync; they describe the same product from the same user perspective.

---

## Commands

```bash
npm install               # Install dependencies
npm start                 # Run in development mode (opens launcher)
npm start classmanagement # Launch a specific tool directly
npm run quiz:server       # Start WebSocket multiplayer quiz server

npm run package:win-portable     # Windows portable .exe
npm run package:win-installer    # Windows NSIS installer
npm run package:linux-appimage   # Linux AppImage
npm run package:mac              # macOS DMG
```

**Tool aliases** for `npm start <alias>`:
`classmanagement`, `cms`, `board`, `gradesheet`, `grades`, `learningtools`, `learningdb`, `dbmanager2`, `participationtracker`, `tracker`, `groupeditor`, `groups`, `generalconfig`, `config`, `datalocation`, `launcher`, `filemanager`, `files`, `recentfiles`, `howto`

---

## Architecture

### Multi-Window Electron App

Each of the 13 tools is a standalone `.html` file loaded in its own `BrowserWindow`. The launcher (`launcher.html`) is the persistent main window; other tool windows are created on demand.

**IPC stack:**
1. `electron-main.js` — main process, registers all IPC handlers
2. `electron-preload.js` — context bridge, exposes `window._desktopBridge`
3. `electron-bridge.js` — renderer-side wrapper, exposes `window.Desktop`

**Desktop API (used from any HTML tool):**
```javascript
await Desktop.saveJson('user', 'file.js', data);
await Desktop.readJson('user', 'file.js');
await Desktop.listFiles('data', { extensions: ['.js'] });
Desktop.openTool('board.html');
Desktop.openSplit({ pageFile1: 'class-management.html', pageFile2: 'participation-tracker.html', fraction: 0.6 });
```

### File System Layout

`getSaveTargets()` in `electron-main.js` defines named targets resolved to absolute paths at runtime. The `writableRoot` differs between development, Windows portable, and Linux AppImage.

```
user              → {writableRoot}/user
data              → {writableRoot}/user/custom-data
gradeSheet        → .../user/log/grade-sheet
grades            → .../user/log/grades
groupParticipation→ .../user/log/group-participation
mindmaps          → .../user/log/constellation
customWordbanks   → .../custom-data/wordbanks
customBooks       → .../custom-data/books
customDictations  → .../custom-data/dictations
customQuizzes     → .../custom-data/quizzes
```

### Per-Page Permissions

`PAGE_PERMISSIONS` in `electron-main.js` restricts which file targets each page may access. Missing entries fail silently — if a page can't read/write a target, check here first.

### Adding a New Tool

Requires changes in five places in `electron-main.js`: `PAGE_FILES`, `PAGE_ARG_MAP`, `PAGE_LABELS`, `PAGE_PERMISSIONS`, and optionally `BrowserWindow` options. Also add i18n strings to `i18n.js` and a card to `launcher.html`.

---

## Key Patterns

### Multilingual Support

`i18n.js` covers EN, FR, DE, IT. UI strings use `data-i18n` attributes; active language is in `localStorage['cmt-general-config'].language`.

Vocabulary word objects carry translations in all four languages. Use the `getTranslation(word)` helper (available in all main HTML files) to get the translation matching the active UI language:

```javascript
// Word schema
{
  word: "resilient",
  sourceLanguage: "en",   // which field is the "original"
  english: "resilient",
  french: "résilient",
  german: "belastbar",
  italian: "resiliente",
  ipa: "rɪˈzɪliənt",
  partOfSpeech: "adjective",
  level: "B1",
  theme: "psychology,character",
  definition: "...",
  exampleSentence: "...",
  synonyms: "...",
  antonyms: "..."
}
```

### localStorage Keys

Convention: `cmt-{page}-{key}`. Large data must go through the Desktop API — localStorage is limited to ~5–10 MB.

### Class Management: Time Machine

Autosaves a full roster snapshot to localStorage every 20 seconds. Session History logs all events. These are independent of file saves.

### Special Windows

- **Timer** — fullscreen countdown, controlled via `app:timer-command` IPC
- **Mirror** — sends board canvas to a secondary monitor
- **Presentation** — mirrors Class Management roster to projector
- **Split** — two tool windows side-by-side with linked resize state
