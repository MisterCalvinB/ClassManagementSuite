# Class Management Tools — AI Agent Architectural Guide & Instructions

> **Purpose for AI Agents:** This document defines the system architecture, file structure, cross-tool data flow, IPC protocols, technology constraints, and development guidelines for **Class Management Tools**. Any AI agent working on this codebase MUST follow these instructions.

---

## 1. Overview & Architecture Philosophy

**Class Management Tools** is a comprehensive, offline-first desktop suite for teachers. It manages student rosters, classroom sessions, board visualisations, grade sheets, lesson planning, oral exams, learning games, and document editing.

### Key Architecture Pillars
1. **Offline-First & Local Storage**: All application data (rosters, grades, constellation maps, planner items) is stored locally alongside application files in the `user/` folder (or user-configured custom directory). There is no external database server.
2. **Vanilla Web Stack in Electron Shell**: The UI is built using standalone HTML5 pages, Vanilla JavaScript, and custom CSS3 variables (no React/Vue framework compilation step). Electron wraps these pages into a native desktop experience with custom IPC file system access and multi-window routing.
3. **Standalone Dual-Execution**: Tools can run either inside the Electron desktop application (with full file I/O capabilities) or within a standard web browser (with local/fallback storage).
4. **Cross-Window Synchronisation & Event Messaging**: Windows communicate in real-time via Electron IPC events and `BroadcastChannel`. Edits in one tool (e.g., updating class rosters in Group Editor) trigger instant reload notifications across all active windows.
5. **Integrated Web/WebSocket Server**: `js/classroom-server.js` hosts a local Node HTTP/WebSocket server allowing mobile client devices (students' smartphones or tablets) to interact with quizzes, note-taking, and CMS remote controls.

---

## 2. Repository Layout & File Mapping

```
Class Management Tools/
├── electron-main.js              # Electron main process (window lifecycle, IPC handlers, app routing, backup/sync)
├── electron-preload.js           # Preload bridge exposing desktop APIs via contextBridge (window.electronApi)
├── electron-bridge.js            # Renderer-side wrapper providing unified async helpers for file I/O & IPC calls
├── launcher.html                 # Launcher / home screen (app grid, recent docs, planner upcoming events)
├── package.json                  # Dependencies, Electron configuration, and build packaging scripts
├── css/                          # CSS stylesheets, CSS tokens, and theme definitions
├── js/                           # Shared runtime modules and services
│   ├── classroom-server.js       # Node HTTP & WebSocket server for live student participation & mobile remote
│   ├── quiz-multiplayer-server.js# Server logic for multiplayer classroom quizzes
│   ├── dialogs.js                # Injected global toast, confirmation, prompt modals, and sync notification banners
│   ├── i18n.js                   # Multilingual translation dictionary & switcher (EN, FR, DE, IT)
│   ├── menus.js                  # Shared menu bar component
│   ├── import-utils.js           # Data import parsers (CSV, XLSX, JSON)
│   ├── mailposting-service.js    # Direct email service integrations
│   ├── pins.js                   # Pinning system utilities
│   ├── shortcuts-modal.js        # Keyboard shortcut helper modals
│   └── tutorial.js               # Interactive step-by-step onboarding tours
├── pages/                        # Standalone tool applications (HTML view layers)
│   ├── board.html                # Visual canvas, session history, constellation maps, & vocab search
│   ├── class-management.html     # Active classroom session runner (scoring, timer, groups, roles, presentation mode)
│   ├── group-editor.html         # Class roster management (single source of truth for student & class data)
│   ├── grade-sheet.html          # Grade & test tracking per class, term, and evaluation criteria
│   ├── planner.html              # Weekly lesson planner, holiday calendar, to-dos, and PDF/ICS export
│   ├── class-plan.html           # Seating plan editor (Pod, U-shape, Grid layouts)
│   ├── document-editor.html      # Markdown + KaTeX editor with split live preview and PDF export
│   ├── learning-tools.html       # Vocabulary & grammar interactive learning games
│   ├── manage-database.html      # Vocabulary & question bank browser and editor
│   ├── participation-tracker.html# Participation & attendance analytics dashboard
│   ├── schedule-maker.html       # Oral exam scheduler (prep/exam timings, SEN accommodations)
│   ├── oral-marking.html         # Live oral exam evaluator and screen presenter view
│   ├── file-manager.html         # Built-in data file browser, rename, sync, and backup tool
│   ├── general-config.html       # App settings (language, default startup, data folder paths, auto-sync)
│   ├── import-tool.html          # Bulk student/class import wizard
│   ├── how-to.html               # Built-in help manual & storage path map
│   ├── credits.html              # Application credits
│   ├── quiz-player.html          # Student-facing web quiz view
│   ├── remote.html               # Mobile remote control client
│   └── student-note-player.html  # Live note submission view
├── modules/                      # Standalone vendor libraries (KaTeX, Monaco, PDF.js, SheetJS, html2canvas, WaveSurfer)
├── user/                         # Local user data directory (created on first run)
│   ├── config.js                 # Global user configuration & active context
│   ├── class-groups.js           # Master student roster & group definitions
│   ├── planner-config.js         # Planner terms, holidays, and weekly entries
│   ├── grades/                   # Class grade evaluation JSON/JS files
│   ├── constellations/           # Saved Board constellation session maps
│   ├── planner/                  # Additional saved planner files
│   └── doceditor/                # Document Editor saved files
└── build/                        # Packaging assets (icons, build scripts)
```

---

## 3. Core Architectural Subsystems

### A. Electron Main & IPC Architecture
- **Main Process (`electron-main.js`)**: Manages `BrowserWindow` creation, application menus, protocol registration, auto-updater/sync tasks, and native file system operations.
- **Preload Bridge (`electron-preload.js`)**: Exposes safe, restricted IPC channels on `window.electronApi` using `contextBridge`.
- **Renderer API Helper (`electron-bridge.js`)**: Included by HTML pages in `<script src="../electron-bridge.js">`. Exposes unified promise-based APIs:
  - `saveText(target, filename, content)`
  - `saveJson(target, filename, data)`
  - `saveBlob(target, filename, blob)`
  - `readText(target, filename)`
  - `readByPath(target, relativePath)`
  - `listFiles(target, options)`
  - `openHtml(request)` / `loadPage(request)`
  - `runSync()`, `runBackup()`, `getDataLocation()`

### B. Shared Data Flow & Single Source of Truth
- **Rosters (`class-groups.js`)**: **Group Editor** is the master source of truth for classes and students. Every class and student has a persistent UUID. Tools (Class Management, Grade Sheet, Participation Tracker, Planner, Schedule Maker, Class Plan) read from `class-groups.js`.
- **Renaming Safety**: Internal IDs (UUIDs) link student performance, grades, and sessions. Renaming a class or student in Group Editor automatically maintains historical data linkage.
- **Cross-Window Live Notifications**: When any tool writes shared configuration (`class-groups.js`, `planner-config.js`, `config.js`), main process or local JS broadcasts a data modification message. Open tool windows display a slide-in banner (`showDataChangedBanner()` from `js/dialogs.js`) asking users to reload or merge data.

### C. Cross-Tool Integration Links
- **Group Editor ↔ Planner**: Shared active context term dates (S1/S2 start/end dates, holidays).
- **Planner → Grade Sheet**: Creating a test entry in Planner automatically checks and registers test slots in Grade Sheet.
- **Board ↔ Planner**: Board sessions can be tagged to Planner lessons via `_plannerEntryId`. Right-clicking a planner entry opens or creates linked Board files.
- **Class Management ↔ Board**: Live timer state and presentation mode updates are broadcast in real-time to active Board windows.
- **Detached Second Display Modes**: Presentation views exist for Board, Class Management, Learning Tools, Document Editor, and Oral Marking to project clean UI onto a secondary screen/beamer.

---

## 4. Coding Standards & Agent Instructions

When implementing features, bug fixes, or modifications, AI agents MUST adhere to these explicit instructions:

### 1. Technology & Dependency Rules
- **No Heavy Build Steps**: Do NOT introduce Webpack, Vite, Babel, Tailwind, or NPM bundling to client browser files. All pages must remain executable standard HTML/CSS/JS.
- **Vendor Libraries**: Place third-party browser scripts inside `modules/`. Use standalone UMD/ESM builds (like `monaco-editor`, `katex`, `xlsx.min.js`, `pdf.min.mjs`).
- **Vanilla CSS Tokens**: Maintain styling consistency using existing root CSS variables, flexbox/grid layouts, micro-animations, glassmorphic dark/light overlays, and responsive design patterns.

### 2. File I/O & IPC Safety
- **Use `electron-bridge.js`**: In renderer HTML pages, NEVER call Node `fs` directly. Always use the promise helpers provided by `electron-bridge.js` (`window.electronApi` / `saveJson()`, `readText()`, `saveFile()`, etc.).
- **Graceful Web Fallback**: Always handle cases where `electronApi.isElectron` is `false` (e.g., when executed in a standard browser environment).
- **Data Location Flexibility**: Never hardcode absolute paths like `C:\Users\...`. Use target directory aliases (`user`, `config`, `data`) resolved dynamically via `getWritableRootDir()`.

### 3. Data Compatibility & Schema Safety
- **Preserve Backward Compatibility**: User data files (`class-groups.js`, `config.js`, grade JS files) use executable JS assignments (`window.CLASS_GROUPS = ...`) or JSON formats. Never break parsing logic for older saved files.
- **Stable UUIDs**: Preserve existing `id` / `uuid` fields when mutating student objects or class groups.

### 4. Internationalization (i18n)
- All user-facing strings must support the four application languages: English (`en`), French (`fr`), German (`de`), and Italian (`it`).
- Add new UI string tokens to `js/i18n.js` under `I18N_STRINGS`.
- Use `i18n.t('token_key')` or data attribute bindings (`data-i18n="token_key"`) in HTML pages.

### 5. UI Components & Dialog Guidelines
- Include `js/dialogs.js` in pages for user interaction. Use `showToast(msg, isError)`, `showConfirm(msg)`, and `showPrompt(msg, defaultVal)` instead of native browser `alert()` or `confirm()`.
- Every major tool header should include:
  - Tool title and branding icon.
  - **?** help button invoking the tool's interactive tour or documentation.
  - Navigation links back to Launcher or configuration.

---

## 5. Development & Verification Commands

When testing or building the application, agents should use the following npm scripts:

```bash
# 1. Run the Electron application locally in development mode
npm start

# 2. Start the local Node Classroom & WebSocket Server (for mobile devices/remote)
npm run server

# 3. Package Windows Portable Executable
npm run package:windows

# 4. Package Linux AppImage
npm run package:linux

# 5. Package macOS DMG
npm run package:mac
```

---

## 6. Checklist for Modifying Existing Tools or Creating New Pages

Before declaring any task complete, verify:
- [ ] Code runs cleanly in Electron shell without uncaught JS exceptions or IPC errors.
- [ ] Data changes persist correctly to `user/` folder using `electron-bridge.js`.
- [ ] Cross-window sync notifications (`showDataChangedBanner`) fire if shared state is mutated.
- [ ] UI looks polished, clean, modern, and maintains responsive CSS conventions.
- [ ] New UI text strings are added to `js/i18n.js`.
