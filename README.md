# Class Management Tools — User Guide

Welcome to the **Class Management Tools** comprehensive documentation. This guide details every tool, feature, configuration option, and cross-app integration in the desktop suite.

---

## Table of Contents

<details open>
<summary><strong>Expand / Collapse Table of Contents</strong></summary>

- [How to Begin](#how-to-begin)
  - [1. Place the app in a writable folder](#1-place-the-app-in-a-writable-folder)
  - [2. First launch checklist](#2-first-launch-checklist)
- [Overview](#overview)
- [Cross-App Connections](#cross-app-connections)
  - [Shared Class Data (`class-groups.js`)](#shared-class-data-class-groupsjs)
  - [Term Date Sync (Group Editor ↔ Planner)](#term-date-sync-group-editor--planner)
  - [Planner → Grade Sheet (Automatic Test Linking)](#planner--grade-sheet-automatic-test-linking)
  - [Board ↔ Planner (Lesson Tagging)](#board--planner-lesson-tagging)
  - [Class Management ↔ Board (Live Sync)](#class-management--board-live-sync)
  - [File Manager → Board (Reopen Saved Sessions)](#file-manager--board-reopen-saved-sessions)
  - [Class Plan ↔ Class Management (Shared Seating Plans)](#class-plan--class-management-shared-seating-plans)
  - [Presentation Windows](#presentation-windows)
- [Tool Reference](#tool-reference)
  - [Launcher (`launcher.html`)](#launcherhtml)
  - [General Config (`general-config.html`)](#general-confightml)
  - [Group Editor (`group-editor.html`)](#group-editorhtml)
  - [Import Tool (`import-tool.html`)](#import-toolhtml)
  - [Planner (`planner.html`)](#plannerhtml)
  - [Class Plan (`class-plan.html`)](#class-planhtml)
  - [Schedule Maker (`schedule-maker.html`)](#schedule-makerhtml)
  - [Oral Marking (`oral-marking.html`)](#oral-markinghtml)
  - [File Manager (`file-manager.html`)](#file-managerhtml)
  - [Class Management (`class-management.html`)](#class-managementhtml)
  - [Board (`board.html`)](#boardhtml)
  - [Learning Tools (`learning-tools.html`)](#learning-toolshtml)
  - [Manage Database (`manage-database.html`)](#manage-databasehtml)
  - [Grade Sheet (`grade-sheet.html`)](#grade-sheethtml)
  - [Participation Tracker (`participation-tracker.html`)](#participation-trackerhtml)
  - [Document Editor (`document-editor.html`)](#document-editorhtml)
  - [Data Location (Legacy) (`data-location.html`)](#data-locationhtml)

</details>

---

## How to Begin

### 1. Place the app in a writable folder

Class Management Tools saves all user data (students, grades, sessions, custom settings) directly inside your local data folder. For this to work, **the app folder must be in a location your user account can write to.**

Avoid running the app from:
- `C:\Program Files` or `C:\Program Files (x86)` — Windows blocks writes here
- A read-only network share or an unextracted ZIP archive
- A USB drive with write protection enabled

**Recommended locations:**
- `C:\Users\YourName\Class Management Tools\` (your home folder)
- `Documents\Class Management Tools\`
- The Desktop

If you downloaded a ZIP file, extract the entire folder before launching. Double-clicking inside a ZIP without extracting will prevent the app from saving any data.

> **How to tell if the folder is writable:** Open the app and go to [General Config → Storage & Sync](#general-confightml). If a valid path is shown without error, the app can write there.

---

### 2. First launch checklist

1. **Open the Launcher** — double-click `Class Management Tools.exe` (or run `npm start` / launch script). The [Launcher](#launcherhtml) is the home screen for all tools.
2. **Set your language** — click [General Config](#general-confightml) (⚙ gear icon) → **General tab** and pick your interface language (English 🇬🇧, French 🇫🇷, German 🇩🇪, or Italian 🇮🇹).
3. **Create your classes** — open [Group Editor](#group-editorhtml) and add your class groups and student rosters. This step is essential as all tools draw student data from Group Editor.
4. **Explore the tools** — return to the Launcher and open any tool. Each tool features a built-in **?** help button in its toolbar to launch interactive documentation.

---

## Overview

| File | Purpose | Key Connections |
|---|---|---|
| [`launcher.html`](#launcherhtml) | Home screen — one-click access to all tools, startup layout config, sidebar panels, and per-card notes | Central hub |
| [`general-config.html`](#general-confightml) | Global settings across 4 tabs: App Identity, Language, Startup & Launch, Storage & Sync, Remote Server, and App Notes | Global application preferences |
| [`group-editor.html`](#group-editorhtml) | Single source of truth for class rosters, active terms, student UUIDs, and Planner terms | Sinks to all roster-aware tools |
| [`import-tool.html`](#import-toolhtml) | Bulk-import students, classes, word banks, and quizzes from CSV, XLSX, or JSON, or copy media files | Populates `students.js`, database, sounds, docs |
| [`planner.html`](#plannerhtml) | Weekly lesson & test planner with ICS, PDF, CSV, DOCX, and HTML export options | Connects to [Grade Sheet](#grade-sheethtml), [Board](#boardhtml), [Group Editor](#group-editorhtml) |
| [`class-plan.html`](#class-planhtml) | Interactive seating plan designer (Grid, U-Shape, Pods) with PDF and DOCX export | Shared with [Class Management](#class-managementhtml) |
| [`schedule-maker.html`](#schedule-makerhtml) | Plan oral exam sessions with concurrent prep/exam timing, SEN accommodations, and saved schedules | Feeds into [Oral Marking](#oral-markinghtml) |
| [`oral-marking.html`](#oral-markinghtml) | Run live oral exam sessions with prep/exam timers, criteria scoring, and presenter view | Saves grades directly to [Grade Sheet](#grade-sheethtml) |
| [`file-manager.html`](#file-managerhtml) | Data file browser, rename, move/copy, sync, and backup tool | Links directly to [Board](#boardhtml) & [Document Editor](#document-editorhtml) |
| [`class-management.html`](#class-managementhtml) | Live classroom session runner (timer, modes, scoring, badges, random picker, phone remote) | Broadcasts to [Board](#boardhtml) & Presentation screens |
| [`board.html`](#boardhtml) | Infinite mind-map canvas, voice recordings, student input notes, and live timer overlay | Links to [Planner](#plannerhtml), [Class Management](#class-managementhtml) |
| [`learning-tools.html`](#learning-toolshtml) | Student-facing vocabulary and grammar games, multiplayer host, and team mode | Sourced from [Manage Database](#manage-databasehtml) |
| [`manage-database.html`](#manage-databasehtml) | Vocabulary database browser, multi-language editor, and bulk theme manager | Powers [Learning Tools](#learning-toolshtml) & [Board](#boardhtml) |
| [`grade-sheet.html`](#grade-sheethtml) | Test & grade tracking per class, term, and criterion with PDF/DOCX export | Linked from [Planner](#plannerhtml) & [Oral Marking](#oral-markinghtml) |
| [`participation-tracker.html`](#participation-trackerhtml) | Participation & attendance analytics dashboard sourced from Class Management sessions | Exports provisional grades to [Grade Sheet](#grade-sheethtml) |
| [`document-editor.html`](#document-editorhtml) | Markdown + KaTeX editor with split live preview, custom CSS rules, and PDF/DOCX export | Edits `.md` / `.html` files suite-wide |
| [`data-location.html`](#data-locationhtml) | Legacy data-folder configuration page (superseded by General Config) | Deprecated |

---

## Cross-App Connections

Class Management Tools features deep cross-tool synchronisation. Data edited in one tool instantly propagates across the entire suite.

### Shared Class Data: `class-groups.js`

[Group Editor](#group-editorhtml) is the single source of truth for all class groups and student data. Every other tool reads from `class-groups.js` and `students.js` dynamically at startup.

| Tool | Shared Data Consumption |
|---|---|
| **Class Management** | Reads active class roster, student UUIDs, and group metadata |
| **Participation Tracker** | Filters session logs by group and active term dates |
| **Grade Sheet** | Loads student lists per class automatically |
| **Planner** | Class selection dropdowns for lesson schedules |
| **Learning Tools** | Populates Team Mode rosters |
| **Schedule Maker** | Loads student lists and SEN accommodation flags |
| **Class Plan** | Imports student lists for seat assignment |

<details>
<summary><strong>Live Cross-App Sync Notifications</strong></summary>

When any tool mutates shared configuration (`class-groups.js`, `planner-config.js`, `config.js`), all open tool windows receive a notification banner:
> **"[Tool Name] updated shared data."** → **Reload data** | **Save & reload** | **Dismiss**

- **Reload data**: Refreshes runtime state without losing active session context where possible.
- **Save & reload**: Appears on pages with unsaved edits (e.g., Grade Sheet) to safely save changes before refreshing.
- **Dismiss**: Ignores the banner until manual page reload.
</details>

<details>
<summary><strong>Renaming Safety & Stable UUIDs</strong></summary>

Classes and students are linked by persistent UUIDs (`st-…` for students, UUID v4 for groups). Renaming a class or student in [Group Editor](#group-editorhtml) automatically updates displays across Grade Sheet, Participation Tracker, Planner, and Class Plan without severing historical data links.
</details>

---

### Term Date Sync: Group Editor ↔ Planner

Group Editor's **Active Context** defines the current school year, term (S1/S2), and start/end dates.
- **Option A (From Group Editor)**: Under **Planner Terms**, click **+ New Term** → **Save to Planner** to sync term dates directly into `planner-config.js`.
- **Option B (From Planner)**: In Group Editor Active Context, click **↕ Planner** to pull start and end dates from an existing Planner term.

---

### Planner → Grade Sheet: Automatic Test Linking

Creating an entry of type **Test** in [Planner](#plannerhtml) automatically verifies if a corresponding class exists in [Grade Sheet](#grade-sheethtml). If an open test slot is available, the test is registered automatically in Grade Sheet and a green indicator badge confirms the link.

---

### Board ↔ Planner: Lesson Tagging

- **Board → Planner**: Click **Planner** in the Board toolbar to tag a constellation session map to a specific Planner lesson, test, or assignment (`_plannerEntryId`).
- **Planner → Board**: Right-click any entry in [Planner](#plannerhtml) (or click the modal button) to immediately create or open its linked Board mind-map file.

---

### Class Management ↔ Board: Live Sync

- **Live Timer**: Timers started in [Class Management](#class-managementhtml) automatically render as floating widgets on active [Board](#boardhtml) windows.
- **Presentation Mode**: Classroom updates, active group selections, and score animations stream to Board presentation views in real time.

---

### File Manager → Board: Reopen Saved Sessions

The [File Manager](#file-managerhtml) **Recent** tab includes an **Open in Board** button next to saved constellation maps to open them directly in Board.

---

### Class Plan ↔ Class Management: Shared Seating Plans

Seating arrangements created in [Class Plan](#class-planhtml) are written to `user/config.js` and immediately available in [Class Management](#class-managementhtml) (and vice versa).

---

### Presentation Windows

Four tools support multi-monitor presentation modes:

| Tool | How to Launch | Projected Content |
|---|---|---|
| **Board** | Toolbar → 📽️ Presentation Mode | Clean canvas view with optional laser dot, freeze mode, and window position popups |
| **Class Management** | Top Menu → Presentation | Student roster with roles, badges, point animations, and independent freeze control |
| **Learning Tools** | Game Toolbar → 📽️ Presentation Icon | Student-facing quiz & game screen while teacher control panel remains private |
| **Document Editor** | Nav Bar → Presentation Mode | Live rendered Markdown/KaTeX preview on dark background, updated per keystroke |

---

## Tool Reference

### launcher.html

The central entry point for the suite. Opens on app launch and provides quick navigation, upcoming agenda items, and card customization.

#### Key Features
- **Customizable App Cards**: Hover over any card and click ⚙ to set custom titles, personal notes, card size (%), and screen position presets.
- **Collapsible Sidebar**:
  - **Upcoming Events**: Displays lessons, tests, and assignments from [Planner](#plannerhtml) for today and upcoming dates.
  - **To-do List**: Shows pending tasks from Planner sorted by urgency. Overdue items are highlighted in red.
  - **Recent Docs**: Quick links to recently modified Board constellation maps and Document Editor files.
- **Header Actions**:
  - **⚙ Config**: Launches [General Config](#general-confightml).
  - **? How To**: Opens built-in documentation with direct *Reveal Folder* disk links.
  - **▶ Tour**: Triggers an interactive step-by-step onboarding guide.

---

### general-config.html

Centralized settings page organized into **four dedicated tabs** for intuitive navigation.

```
┌──────────────────────────────────────────────────────────┐
│  General Config                                          │
├───────────────┬──────────────────────────────────────────┤
│ General       │  App Identity  · Language · Startup     │
│ Storage & Sync│  Data Location · Backup · Sync · Cloud   │
│ Remote Server │  Remote Classroom Server & Secret        │
│ App Notes     │  Per-App Personal Notes Accordion        │
└───────────────┴──────────────────────────────────────────┘
```

#### 1. General Tab (`data-tab="general"`)

- **App Identity**: Customize the global **App Title** displayed in launcher headers and tool window title bars.
- **Language**: Select interface language (**English 🇬🇧**, **Français 🇫🇷**, **Deutsch 🇩🇪**, **Italiano 🇮🇹**). Updates menus, UI strings, help text, and default translation columns in [Learning Tools](#learning-toolshtml).
- **Startup & Launch**:
  - **Apps to open at startup**: Select tools to auto-launch when the app starts.
  - **Window arrangement**: Choose layout mode:
    - *Separate*: Opens each app in its own window.
    - *Maximized*: Opens apps full-screen.
    - *Split screen*: Opens two apps side-by-side. Includes dropdown selection for Left/Right windows and a slider to adjust width split ratio (e.g. 50/50).
  - **Show features in development**: Toggle switch to show/hide beta features (**Phone Remote**, **Student Input Note**, **Multiplayer Quiz Host**).

#### 2. Storage & Sync Tab (`data-tab="storage"`)

- **Data Location**:
  - Displays current data directory path.
  - Buttons for **Change folder…**, **Reset to default**, and **Check for Updates**.
  - **Migrate Files Wizard**: Automatically copies existing user files when switching data locations.
- **Local Backup**: Select target directory and backup format (*Folder*, *ZIP Archive (.zip)*, or *TAR.GZ Archive (.tar.gz)*), then click **Backup Now**.
- **Local Sync**: Configure target sync directory (cloud folder, USB, network drive), enable **Keep target up to date automatically**, reset baseline, or trigger manual **Sync Now**.
- **Cloud & Server Sync (Dev)**:
  - **FTP / FTPS Sync**: Configure Host, Port, Credentials, Remote Path, FTPS security toggle, and auto-sync intervals (5 to 60 minutes).
  - **Google Drive Sync**: OAuth 2.0 Client ID & Secret configuration, Google login authentication, and selective folder upload/download.
  - **WebDAV Sync**: Compatible with kDrive, Nextcloud, ownCloud. Server URL, username, app password, remote path, and interval sync.
- **Backup Files Manager**: Open modal to browse, inspect, and batch delete saved backup files.
- **Reset App**: Safety wizard to permanently erase selected app data folders. Requires typing `ERASE` to confirm and offers a compulsory backup ZIP creation first.

#### 3. Remote Server Tab (`data-tab="remote"`)

- **Remote Classroom Server**: Configure central **Server URL** (e.g., `https://classroom.example.com`) and **Host Secret**.
- Automatically utilized by mobile integration features: [Phone Remote](#phone-remote), [Multiplayer Quiz Host](#multiplayer-quiz), and [Student Input Note](#student-input-note).

#### 4. App Notes Tab (`data-tab="notes"`)

- **Per-app Notes**: Interactive accordion containing personal notes for each tool in the suite. Notes entered here sync with the note panels on Launcher tool cards.

---

### group-editor.html

Master roster and class group editor. Serves as the single source of truth for student records.

#### Features
- **Active Context**: Set the current school year, term (S1/S2), and start/end dates.
- **Planner Terms**: Manage semester start/end dates and school holiday periods directly.
- **Group Management**: Create S1/S2 groups, edit rosters, set student levels, and toggle **SEN** (Special Educational Needs) flags.
- **Student Roster & UUIDs**: Student data is stored cleanly in `user/students.js`. UUID keys preserve historical links when students or groups are renamed.
- **Archiving**: Archive single groups or entire terms to hide them from active tools without deleting historical session data.

---

### import-tool.html

Wizard for bulk-importing structured data or copying media files into managed workspace folders.

#### Supported Import Types
- **Structured Data (CSV / XLSX / JSON)**: Students, Class Groups, Word Banks, Quizzes, Gap-Fill, Quotes, Error Correction, Dictation, Grammar, Sentences, Story.
- **File Copy**: Sounds (`.mp3`, `.wav`, `.ogg`, `.m4a`) → `user/custom-data/sounds/`; Documents (`.html`, `.md`, `.txt`) → `user/document-editor/docs/`.

<details>
<summary><strong>Wizard Steps & Custom Values</strong></summary>

1. **Destination**: Pick target data type and group options.
2. **File Selection**: Drag-and-drop `.csv`, `.xlsx`, `.xls`, or `.json`.
3. **Column Mapping**: Match source headers to destination fields. Includes **— Manually input value —** to inject static values across all imported rows.
4. **Preview & Conflict Resolution**: Per-row decisions (*Skip*, *Overwrite*, *Import as new*).
5. **Done**: Execution summary.
</details>

---

### planner.html

Lesson, assessment, and holiday scheduling tool with export capabilities.

#### Key Features
- **Term Management**: Create terms, define weekly schedules, and flag holidays.
- **Class Schedules**: Color-coded classes with lesson slot auto-population.
- **Entries & Reminders**: Lesson, Test, and Assignment entries. Configurable pre-start and end-of-lesson reminder alerts.
- **Linked Board Files**: Right-click any entry to generate or open an attached [Board](#boardhtml) constellation map.
- **To-do Drawer**: Integrated task list synced with `user/todos.js` and Launcher sidebar.
- **Export Options**: Export schedule to **ICS**, **PDF**, **CSV**, **HTML Table**, or **DOCX**.

---

### class-plan.html

Interactive desk layout designer for classroom seating charts.

#### Features
- **Layout Engines**:
  - **Grid**: Standard rows × columns matrix.
  - **U-Shape**: Front row with side arms.
  - **Pods**: Clusters of desks arranged across a room grid.
- **Drag-and-Drop Editor**: Seat assignment, student swapping, and **🎲 Random** shuffle.
- **Export Formats**: Print A4 seating plan, export to CSV, XLSX, DOCX, or HTML.
- **Sync**: Auto-saved to `user/config.js` for immediate access in [Class Management](#class-managementhtml).

---

### schedule-maker.html

Oral exam scheduler with timing optimization and SEN accommodations.

#### Features
- **Timing Model**: Calculates prep and exam overlap so one student prepares while another presents.
- **SEN Accommodations**: Applies custom preparation durations for SEN-flagged students automatically.
- **Breaks**: Auto-places breaks across exam blocks.
- **Output**: Export schedule to print or save for loading in [Oral Marking](#oral-markinghtml).

---

### oral-marking.html

Live oral exam evaluation tool that streams to secondary displays and writes directly to Grade Sheet.

#### Features
- **Live Timers**: Prep countdown, exam countdown, 2-minute flashing warning, and **Finish Exam** early controls.
- **Criteria Scoring**: Real-time scoring using criteria from `correction-criteria.js` with comment fields per criterion.
- **Presenter View**: Opens a clean second-screen window projecting the student name, current phase, and countdown timer.
- **Grade Sheet Integration**: Saves oral exam scores directly into [Grade Sheet](#grade-sheethtml) as a new test column upon session completion.

---

### file-manager.html

Data file manager with built-in search, rename, move, and synchronization features.

#### Tabs & Capabilities
- **Recent Tab**: Filter constellation maps, PDFs, images, and audio. Reopen maps in Board with one click.
- **Browse Tab**: Deep folder navigation across `user/` subdirectories. Supports multi-select (Ctrl/Shift+click), drag-and-drop moving, inline renaming, folder creation, and sidebar folder pinning.
- **Sync Tab**: Local and background auto-sync configuration with conflict resolution dialogs.

<details>
<summary><strong>Keyboard Shortcuts</strong></summary>

| Shortcut | Action |
|---|---|
| `Enter` | Confirm inline rename |
| `Esc` | Cancel inline rename |
| `Ctrl/Cmd + C` | Copy selected files |
| `Ctrl/Cmd + X` | Cut (move) selected files |
| `Ctrl/Cmd + V` | Paste into current folder |
</details>

---

### class-management.html

Active classroom control panel for student scoring, timers, class working modes, and remote controls.

#### Features
- **Timer & Class Modes**: Full-screen timer with customizable working modes (Quiet Work 🤫, Group Work 👥, Conversation 💬). Includes background ambient noise (White/Pink/Brown noise), custom images, animations, and sound effects.
- **Roster & Scoring**: Award participation marks (**+** / **−**), badges, and strikes. Context menu for attendance, flagging, and role assignment.
- **Team Maker & Picker**: Random student picker with drumroll sound, team auto-balancer, and role generator.
- **Presentation View**: Projects roster state, active badges, and points onto a second screen with independent freeze controls.
- **Phone Remote**:
  - *Local Mode*: Node server on port `8787` for local WiFi mobile scoring.
  - *External Mode*: Connects via WebSocket relay (`js/classroom-server.js`) for internet access.

<details>
<summary><strong>Keyboard Shortcuts</strong></summary>

| Shortcut | Action |
|---|---|
| `Ctrl + Space` | Random student picker |
| `Ctrl + Shift + K` | Open Team Maker |
| `Ctrl + M` | Open Class Mode picker |
| `1–9` (timer active) | Switch active class mode |
| `W` (timer active) | Toggle white noise |
| `M` (timer active) | Mute / unmute audio |
</details>

---

### board.html

Infinite-canvas mind-mapping tool for vocabulary, draw overlays, sound nodes, and live lesson projection.

#### Features
- **Mind-Map Canvas**: Draggable nodes, synonym/antonym connections, Wiktionary definition fetching, shape formatting, and color preset swatches.
- **Voice Recordings**: Record microphone audio directly into companion folders (`audio/`) and attach sound nodes to the board with built-in audio trimming (`✂ Trim`).
- **Student Input Note**: Allows students to submit short text notes from their smartphones directly onto the board canvas via QR code or URL.
- **Table Support**: Copy/paste HTML or TSV spreadsheet tables directly onto the canvas as draggable, resizable board elements.
- **Live Sync**: Displays floating timer widgets streamed live from [Class Management](#class-managementhtml).

<details>
<summary><strong>Keyboard Shortcuts</strong></summary>

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Save constellation file |
| `Ctrl/Cmd + Z` / `Y` | Undo / Redo |
| `Ctrl/Cmd + G` | Group selected nodes |
| `Ctrl/Cmd + L` | Toggle laser pointer |
| `Ctrl/Cmd + ↑ / ↓` | Increase / decrease node font size |
| `Delete` | Remove selected nodes |
</details>

---

### learning-tools.html

Student-facing activity suite featuring 12 vocabulary and grammar games powered by the central word bank.

#### Games & Modes
- **Vocabulary Games**: Definition Match 🧩, Hangman 😵, Scrambled Word 🔠, Word Quest 🔍, Phonetic Guess 🔉, Synonyms & Antonyms 🔗.
- **Grammar Games**: Sentence Builder ✍️, Gap Fill 🕳️, Find the Error 🔴, Dictation 📝.
- **Multiplayer Quiz**: Live classroom quiz host (Local WiFi or External relay) where students answer synchronously on their mobile devices.
- **Team Mode & Timer**: Score tracking across custom teams with progressive point deduction timers.

---

### manage-database.html

Vocabulary and question bank database editor supporting multi-language translations.

#### Features
- **Word Detail Editor**: Edit IPA, CEFR levels (A1–C2), themes, keywords, definitions, example sentences, synonyms, and antonyms.
- **Multi-Language Schema**: Stores English, French, German, and Italian translations for every word. Active UI language automatically selects the appropriate column.
- **Bulk Theme Operations**: Rename themes across all words, merge themes, or batch-assign levels/POS tags.
- **Exporting**: Column picker export to CSV, PDF, HTML Table, XLSX, or DOCX.

---

### grade-sheet.html

Grade and assessment tracking spreadsheet supporting custom evaluation criteria and scale models.

#### Features
- **Class Summary & Test Sheets**: Track student grades across test slots (T1–T8). Auto-calculate averages based on weighted coefficients or fixed percentages.
- **Reference Data Editor**: Customize evaluation criteria descriptors (`user/correction-criteria.js`) and grading scale thresholds (`user/grade-scale-models.js`).
- **Export**: Export grade reports to PDF, DOCX, or HTML with draggable column layouts.

---

### participation-tracker.html

Analytics dashboard sourcing session data from [Class Management](#class-managementhtml).

#### Features
- **Visual Analytics**: Participation trend line charts, total pick counts, and positive/negative point distributions.
- **Session & Student Overviews**: Detailed tabular logs per session and per student.
- **Provisional Grading Engine**: Custom rule configurator converting participation points into grades, with direct one-click **Export to Grade Sheet**.

---

### document-editor.html

Dual-pane Markdown + KaTeX LaTeX editor with inline CSS styling and live presentation mode.

#### Features
- **Markdown & KaTeX**: Full GFM markdown support with `$inline$` and `$$display$$` maths rendering.
- **CSS Panel & Templates**: Built-in CSS editor and rule repository. Page layout controls (margins, paper size, footers) save directly into document headers.
- **Book Text Import**: Browse and extract text passages directly from `custom-data/books/` into active documents.
- **Presentation View**: Projects formatted documents onto a second screen without editor controls.
- **Export**: Export clean PDF and DOCX files.

---

### data-location.html

*Legacy configuration page.* Storage, backup, and sync settings are now integrated directly into the **Storage & Sync tab** of [General Config](#general-confightml).

---

<p align="center">
  <strong>Class Management Tools</strong> — Built for Teachers. Offline-First & Privacy-Focused.
</p>
