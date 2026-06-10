# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prompt Clarification

Before implementing any non-trivial feature or change, ask clarifying questions and offer concrete suggestions to make sure the intent is understood. For example: propose two or three specific approaches with trade-offs, flag assumptions about scope or behaviour, and confirm which files or tools are in scope. Only proceed once the direction is clear.

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

### Per-Tool File I/O

What each tool reads and writes via the Desktop API.

| Tool | Reads | Writes |
|------|-------|--------|
| **class-management.html** | `user/config.js`, `user/class-groups.js`, `user/roles.js`; lists & reads `grades/*`, `groupParticipation/*`; lists `data/sounds` | `user/config.js`, `user/class-groups.js`; `groupParticipation/<session>.js` |
| **board.html** | `user/board-config.js`, `user/board-sessions-backup.json`, `user/ui-prefs.json`, `user/class-groups.js`; reads `customWordbanks/wordDb.js`, `customQuotes/quoteBank.js`, `customGapfillbanks/gapFillBank.js`, `customErrorbanks/errorBank.js`; lists & reads `mindmaps/*`, `notes/*`, `textualAnalyses/*`; reads `data/*` | `user/board-config.js`, `user/board-sessions-backup.json`, `user/ui-prefs.json`; `customWordbanks/wordDb.js`; `customQuotes/quoteBank.js`; `customGapfillbanks/gapFillBank.js`; `customErrorbanks/errorBank.js`; `mindmaps/*` blobs/files |
| **grade-sheet.html** | `user/correction-criteria.js`, `user/grade-scale-models.js`; lists & reads `grades/**`; `gradeSheet/grade-sheet-data.json`, `gradeSheet/deleted-class-ids-backup.json` | `user/correction-criteria.js`, `user/grade-scale-models.js`; `grades/_class.js`, `grades/sem-test-*.js`; `gradeSheet/deleted-class-ids-backup.json` |
| **participation-tracker.html** | `user/class-groups.js`; lists & reads `groupParticipation/*.js`; `groupParticipation/pt-notes.js`, `groupParticipation/pt-deleted.js` | `groupParticipation/pt-notes.js`, `groupParticipation/pt-deleted.js` |
| **learning-tools.html** | `customWordbanks/wordDb.js` and listed files; `customQuizzes/quiz.js`; `data/wordbanks/wordDb.js`; lists & reads `customData/werewolf/*.js`; lists `customData/sounds`; `user/class-groups.js` | `customWordbanks/<export>.json`, `customWordbanks/<file>.js`; `customData/werewolf/<role>.js` |
| **manage-database.html** | Lists & reads any of: `customWordbanks`, `customQuotes`, `customDictations`, `customGrammarbanks`, `customGapfillbanks`, `customErrorbanks`, `customSentences`, `customStorybanks`, `customQuizzes` | Saves/deletes files in same targets; exports to OS file picker |
| **file-manager.html** | Lists & reads `mindmaps/**`, `user/custom-data/**`; browses any target | Read-only browser — no writes |
| **class-plan.html** | `classPlans/plans.js`, `user/config.js` | `classPlans/plans.js`, `user/config.js` |
| **launcher.html** | `user/config.js`; lists `mindmaps/**`, `user/custom-data/**` (recent files) | None |

**localStorage** (persistent, not Desktop API):
- `cmt-general-config` — language + general settings (read by `i18n.js` on every page)
- `cmt-cms-*` — Class Management state, including Time Machine snapshots (autosaved every 20 s)
- Other `cmt-{page}-{key}` keys per tool for UI state that fits under ~5–10 MB

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
