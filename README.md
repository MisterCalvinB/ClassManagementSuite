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
  - [Shared Class Data & Student Display Names (`class-groups.js` & `students.js`)](#shared-class-data--student-display-names-class-groupsjs--studentsjs)
  - [Term Date Sync (Group Editor ↔ Planner)](#term-date-sync-group-editor--planner)
  - [Planner → Grade Sheet (Automatic Test Linking)](#planner--grade-sheet-automatic-test-linking)
  - [Planner ↔ Class Management (Event UUID & Session Linking)](#planner--class-management-event-uuid--session-linking)
  - [Planner ↔ Lesson Creator (Slot Integration & Lesson Plans)](#planner--lesson-creator-slot-integration--lesson-plans)
  - [Class Management ↔ Lesson Creator (Automatic Lesson Runner HUD)](#class-management--lesson-creator-automatic-lesson-runner-hud)
  - [Board ↔ Planner (Lesson Tagging)](#board--planner-lesson-tagging)
  - [Class Management ↔ Board (Live Sync & Floating Timer)](#class-management--board-live-sync--floating-timer)
  - [File Manager → Board (Reopen Saved Sessions & `.cstz` Archives)](#file-manager--board-reopen-saved-sessions--cstz-archives)
  - [Class Plan ↔ Class Management (Shared Seating Plans)](#class-plan--class-management-shared-seating-plans)
  - [Presentation Windows](#presentation-windows)
- [Tool Reference](#tool-reference)
  - [Launcher (`launcher.html`)](#launcherhtml)
  - [General Config (`general-config.html`)](#general-confightml)
  - [Group Editor (`group-editor.html`)](#group-editorhtml)
  - [Import Tool (`import-tool.html`)](#import-toolhtml)
  - [Planner (`planner.html`)](#plannerhtml)
  - [Lesson Creator (`lesson-creator.html`)](#lesson-creatorhtml)
  - [Class Plan (`class-plan.html`)](#class-planhtml)
  - [Schedule Maker (`schedule-maker.html`)](#schedule-makerhtml)
  - [Oral Marking (`oral-marking.html`)](#oral-markinghtml)
  - [File Manager (`file-manager.html`)](#file-managerhtml)
  - [Class Management (`class-management.html`)](#class-managementhtml)
  - [Board (`board.html`)](#boardhtml)
  - [Learning Tools (`learning-tools.html`)](#learning-toolshtml)
  - [Manage Database (`manage-database.html`)](#manage-databasehtml)
  - [Grade Sheet (`grade-sheet.html`)](#grade-sheethtml)
  - [Competence Portfolio (`competence-portfolio.html`)](#competence-portfoliohtml)
  - [Participation Tracker (`participation-tracker.html`)](#participation-trackerhtml)
  - [Administrative Groups (`administrative-groups.html`)](#administrative-groupshtml)
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
| [`launcher.html`](#launcherhtml) | Home screen — one-click access to all tools, startup layout config, sidebar panels (Upcoming Events, To-do, Recent Docs), and per-card customization (custom titles, notes, size %, screen positioning presets) | Central hub |
| [`general-config.html`](#general-confightml) | Global settings across 4 tabs: General (App Identity, Language, PDF Export, Startup & Launch Window Arrangements/Split Screen), Storage & Sync (Data Location, Local Backup formats, Local Sync, Cloud/Server WebDAV/FTP/Google Drive, Backup Files Manager, App Reset), Remote Server (Hosted server & secret), and App Notes | Global application preferences |
| [`group-editor.html`](#group-editorhtml) | Single source of truth for class rosters, active terms, student UUIDs, display name formatting (First/Last, Last/First, Nicknames), and Planner terms | Sinks to all roster-aware tools |
| [`import-tool.html`](#import-toolhtml) | Bulk-import students, classes, word banks, and quizzes from CSV, XLSX, or JSON (with custom static values mapping), or copy media files directly | Populates `students.js`, database, sounds, docs |
| [`planner.html`](#plannerhtml) | Weekly lesson & test planner with ICS, PDF, CSV, DOCX, and HTML export options, weeks drawer, and linked Board mind maps | Connects to [Grade Sheet](#grade-sheethtml), [Board](#boardhtml), [Class Management](#class-managementhtml), [Lesson Creator](#lesson-creatorhtml) |
| [`lesson-creator.html`](#lesson-creatorhtml) | Neobrutalist lesson planning studio with drag-and-drop phases, curriculum descriptor coverage matrix, live HUD runner in Class Management, and Board mindmap exports | Links to [Planner](#plannerhtml), [Class Management](#class-managementhtml), [Board](#boardhtml) |
| [`class-plan.html`](#class-planhtml) | Interactive seating plan designer (Grid, U-Shape, Pods) with PDF, DOCX, XLSX, and CSV export | Shared with [Class Management](#class-managementhtml) |
| [`schedule-maker.html`](#schedule-makerhtml) | Plan oral exam sessions with concurrent prep/exam timing, SEN accommodations, and saved schedules | Feeds into [Oral Marking](#oral-markinghtml) |
| [`oral-marking.html`](#oral-markinghtml) | Run live oral exam sessions with prep/exam timers, criteria scoring, and presenter view | Saves grades directly to [Grade Sheet](#grade-sheethtml) |
| [`file-manager.html`](#file-managerhtml) | Data file browser, rename, move/copy, sync, and backup tool supporting `.cstz` single-file constellation archives | Links directly to [Board](#boardhtml) & [Document Editor](#document-editorhtml) |
| [`class-management.html`](#class-managementhtml) | Live classroom session runner (timer, SVG class modes, ambient soundscapes, scoring, badges, random picker, phone remote (beta)) | Broadcasts to [Board](#boardhtml) & Presentation screens |
| [`board.html`](#boardhtml) | Infinite mind-map canvas, `.cstz` zipped archive storage, autosave, voice recordings with trimming, draggable floating presentation timer, custom keyboard shortcuts, fit-text, blink animation, student input notes (beta) | Links to [Planner](#plannerhtml), [Class Management](#class-managementhtml) |
| [`learning-tools.html`](#learning-toolshtml) | Student-facing vocabulary and grammar games, multiplayer host (beta), and team mode | Sourced from [Manage Database](#manage-databasehtml) |
| [`manage-database.html`](#manage-databasehtml) | Central curriculum, assessment & learning content database (words, competences, criteria, scales, phases, chips) | Powers [Learning Tools](#learning-toolshtml), [Grade Sheet](#grade-sheethtml), [Competence Portfolio](#competence-portfoliohtml) & [Lesson Creator](#lesson-creatorhtml) |
| [`grade-sheet.html`](#grade-sheethtml) | Test & grade tracking per class, term, and criterion with drag-and-drop test reordering, grading scale models, and multi-format export (PDF/DOCX/CSV/HTML) | Linked from [Planner](#plannerhtml), [Oral Marking](#oral-markinghtml), [Participation Tracker](#participation-trackerhtml) |
| [`competence-portfolio.html`](#competence-portfoliohtml) | Curriculum standards coverage tracking, audit timeline, matrix view, and cross-tool grade/lesson aggregation | Sinks from [Grade Sheet](#grade-sheethtml), [Planner](#plannerhtml), [Lesson Creator](#lesson-creatorhtml), [Board](#boardhtml) |
| [`participation-tracker.html`](#participation-trackerhtml) | Participation & attendance analytics dashboard with weekly trend line charts, student score distributions, multi-group comparisons, dynamic window positioning, full i18n, and provisional grading rules | Exports provisional grades to [Grade Sheet](#grade-sheethtml) |
| [`administrative-groups.html`](#administrative-groupshtml) | Comprehensive student administrative tracker, medical & SEN accommodation manager, infraction point scoring, automated sanction rules engine, period chips, student action timeline, and multi-format reports | Syncs with [Group Editor](#group-editorhtml) & master student roster |
| [`document-editor.html`](#document-editorhtml) | Multi-format document editor supporting Typst (`.typ`), Markdown (`.md`), and HTML (`.html`) with WebAssembly live preview, Monaco syntax highlighting, native vector PDF export, Mailposting batch student reports, and built-in Syntax Guide | Edits `.typ` / `.md` / `.html` files suite-wide |
| [`data-location.html`](#data-locationhtml) | Legacy data-folder configuration page (superseded by General Config) | Deprecated |

---

## Cross-App Connections

Class Management Tools features deep cross-tool synchronisation. Data edited in one tool instantly propagates across the entire suite.

### Shared Class Data & Student Display Names: `class-groups.js` & `students.js`

[Group Editor](#group-editorhtml) is the single source of truth for all class groups and student data. Every other tool reads from `class-groups.js` and `students.js` dynamically at startup.

| Tool | Shared Data Consumption |
|---|---|
| **Class Management** | Reads active class roster, student UUIDs, group metadata, and student display name preferences |
| **Participation Tracker** | Filters session logs by group and active term dates, displaying formatted student names |
| **Grade Sheet** | Loads student lists per class automatically with formatted student display names |
| **Planner** | Class selection dropdowns for lesson schedules |
| **Learning Tools** | Populates Team Mode rosters |
| **Schedule Maker** | Loads student lists and SEN accommodation flags |
| **Class Plan** | Imports student lists for seat assignment |
| **Competence Portfolio** | Aggregates class curriculum coverage, combining planned lessons, delivered activities, and grade evaluations |
| **Lesson Creator** | Loads class groups and year levels to configure targeted lesson plans and time budgets |
| **Oral Marking** | Reads class rosters and SEN accommodation flags directly for candidate evaluation sessions |
| **Administrative Groups** | Reads student rosters, UUIDs, classes, and synchronizes profile changes |

<details>
<summary><strong>Student Name Display Formatting & Custom Nicknames</strong></summary>

The suite includes flexible student name formatting utilities (`js/student-name-utils.js`). In Group Editor, teachers can configure how student names appear across the application:
- **Global & Group Conventions**: Choose display styles such as *First Last* (e.g., "John Doe"), *Last First* (e.g., "DOE John"), *First only*, or *Last only*.
- **Custom / Preferred Display Names**: Set custom nicknames or preferred names per student without modifying their official legal record.
- All tools across the suite automatically respect the chosen display format.
</details>

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

<details>
<summary><strong>Universal Export Standards & Document Editor Workflow</strong></summary>

Whenever files are exported from any tool across the suite:
- **"Open File"**: Launches the exported file in the default operating system viewer.
- **"Open with Document Editor"**: Displayed automatically for Markdown (`.md`) and HTML (`.html`) files to open directly in [Document Editor](#document-editorhtml) with Monaco syntax highlighting and live preview. Edits can be saved directly back to the file with `Ctrl+S`.
- **"Open Folder"**: Reveals and highlights the exported file or folder in the system file explorer.
- **Semantic HTML & Stylesheets**: HTML exports across all tools adhere to the `export-standards` skill, using clean semantic CSS classes and embedded `<style>` blocks rather than repetitive inline styles, enabling rapid re-styling in Document Editor.
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

### Planner ↔ Class Management: Event UUID & Session Linking

- **Stable UUIDs**: Every scheduled lesson entry in [Planner](#plannerhtml) is assigned a persistent unique identifier (`entry.id`).
- **Automatic Matching**: When opening [Class Management](#class-managementhtml) on a scheduled teaching day, the app automatically identifies the in-progress timetable slot and binds its exact Planner entry UUID (`plannerEntryId`).
- **Participation & History Integrity**: All live student scoring, participation logs (`user/groupParticipation/`), and Time Machine snapshots record the `plannerEntryId`, cementing the connection between live classroom interaction and scheduled curriculum events.
- **One-Click Launch**: Right-click any slot in Planner (or click the button in the entry edit modal) to launch Class Management pre-configured with that class, date, and entry UUID.

---

### Planner ↔ Lesson Creator: Slot Integration & Lesson Plans

- **Slot Actions**: Right-click any slot in [Planner](#plannerhtml) to Create a new plan in [Lesson Creator](#lesson-creatorhtml), Open an attached plan, Link an existing plan, Unlink, or permanently Delete the lesson plan file from disk.
- **Pure Text Indicators**: Linked slots display a clean, high-contrast text badge (**Lesson Plan** / **Plan de cours**) directly on the calendar card. Clicking the badge opens the plan instantly.
- **Drag-and-Drop Cloning**: Duplicating or dragging a scheduled slot to another day automatically clones the attached lesson plan file on disk with a brand new unique ID.

---

### Class Management ↔ Lesson Creator: Automatic Lesson Runner HUD

When loading a class group in [Class Management](#class-managementhtml) on a date with a scheduled lesson plan, the system detects it automatically. If a single plan exists, it offers to start the **Lesson Runner HUD**, bringing timed activity phases, dynamic timers, and curriculum descriptors into the live session. If multiple plans exist, a clean dialog prompts the teacher to choose.

---

---

### Board ↔ Planner: Lesson Tagging

- **Board → Planner**: Click **Planner** in the Board toolbar to tag a constellation session map to a specific Planner lesson, test, or assignment (`_plannerEntryId`).
- **Planner → Board**: Right-click any entry in [Planner](#plannerhtml) (or click the modal button) to immediately create or open its linked Board mind-map archive (`.cstz`).

---

### Class Management ↔ Board: Live Sync & Floating Timer

- **Live Draggable Floating Timer**: Timers started in [Class Management](#class-managementhtml) automatically render as a draggable, resizable floating widget on active [Board](#boardhtml) windows.
- **Board Timer Nodes → Class Management**: Timers initiated from Board timer nodes trigger the countdown in the main Class Management window and synchronize live across secondary presentation windows and board mirrors.
- **Presentation Mode**: Classroom updates, active group selections, working mode changes, and score animations stream to Board presentation views in real time.

---

### File Manager → Board: Reopen Saved Sessions & `.cstz` Archives

The [File Manager](#file-managerhtml) **Recent** and **Browse** tabs recognize `.cstz` zipped archives and legacy `.js` session files in `user/mindmaps/`, providing an **Open in Board** button to launch sessions directly into Board. Single-file `.cstz` archives also support clean single-file renaming, moving, and deletion.

---

### Class Plan ↔ Class Management: Shared Seating Plans

Seating arrangements created in [Class Plan](#class-planhtml) are written to `user/config.js` and immediately available in [Class Management](#class-managementhtml) (and vice versa).

---

### Competence Portfolio ↔ Grade Sheet, Planner, Lesson Creator & Board: Centralized Curriculum Auditing

[Competence Portfolio](#competence-portfoliohtml) unifies pedagogical planning, delivery, and evaluation:
- **Grade Sheet**: Test columns tagged with curriculum competence codes automatically push student marks to calculate evaluated mastery percentages and domain breakdown stats.
- **Planner**: Lessons scheduled with attached curriculum descriptors feed the planned coverage KPIs and the chronological Audit Timeline.
- **Lesson Creator**: Phase-level descriptor tags mark curriculum standards as delivered when lessons are run in Class Management.
- **Board**: Interactive mindmaps can tag curriculum descriptors, tying whiteboard learning directly into the audit progression.

---

### Lesson Creator ↔ Board: Interactive Mindmap Export & Merging

Export structured lesson phases, objectives, and pedagogical steps directly into an interactive [Board](#boardhtml) mindmap canvas session (`.cstz`). You can generate a fresh session or non-destructively append the lesson phase cluster into an existing whiteboard constellation.

---

### Lesson Creator ↔ Document Editor: Printable Lesson Plans & Handouts

Export complete lesson outlines with phase breakdowns, time budgets, pedagogical frameworks, and materials directly into formatted Typst, Markdown, or HTML files in [Document Editor](#document-editorhtml) for PDF export and student worksheets.

---

### Schedule Maker ↔ Oral Marking: Timetable & Accommodation Transfer

Exam timetables generated in [Schedule Maker](#schedule-makerhtml) — including exact student preparation/exam time slots, room assignments, and SEN extra-time accommodations (+25%, +33%, +50%) — transfer directly into [Oral Marking](#oral-markinghtml) for live assessment.

---

### Oral Marking → Grade Sheet: Automatic Evaluation Slot Sync

Saving grades at the end of an oral exam session automatically registers or updates the oral test entry in [Grade Sheet](#grade-sheethtml) with per-criterion scores, weights, comments, and teacher remarks.

---

### Document Editor ↔ Grade Sheet: Mailposting Batch Student Reports

[Document Editor](#document-editorhtml)'s batch Mailposting service pulls student evaluations, grades, class averages, ranking, and attendance metrics directly from Grade Sheet files to generate personalized report cards, letters, or certificates.

---

### Manage Database ↔ Learning Content, Curriculum & Assessment Central Repository

Vocabulary decks, quotes, dictations, grammar sets, and quizzes managed in [Manage Database](#manage-databasehtml) feed directly into [Learning Tools](#learning-toolshtml) game modes and instant node generation on the [Board](#boardhtml). In addition, curricular standards, lesson phases, evaluation criteria (with linked competences), scale models, and observation chips directly configure and power [Competence Portfolio](#competence-portfoliohtml), [Lesson Creator](#lesson-creatorhtml), [Grade Sheet](#grade-sheethtml), and [Oral Marking](#oral-markinghtml).

---

### Classroom Server & Remote ↔ Class Management, Board & Quiz

The built-in WebSocket classroom server (`js/classroom-server.js`) enables mobile remote control for timers and scoring, live student note submission onto Board, and multiplayer quiz hosting in [Quiz Player](#learning-toolshtml).

---

### Presentation Windows

Five tools support multi-monitor presentation modes:

| Tool | How to Launch | Projected Content |
|---|---|---|
| **Board** | Toolbar → 📽️ Presentation Mode | Clean canvas view with live synchronized note resizing, drawing, and movements, optional laser dot, freeze mode (pauses canvas updates and page switching with an inline toolbar status badge), and window position popups |
| **Class Management** | Top Menu → Presentation | Student roster with roles, badges, point animations, and independent freeze control |
| **Learning Tools** | Game Toolbar → 📽️ Presentation Icon | Student-facing quiz & game screen while teacher control panel remains private |
| **Document Editor** | Nav Bar → Presentation Mode | Live rendered Markdown/KaTeX preview on dark background, updated per keystroke |
| **Oral Marking** | Header → Present | Live candidate countdown screen showing current phase (PREP / EXAM), student name, remaining timer, and color-coded alert state while scoring rubrics and teacher notes remain private |

---

## Tool Reference

### launcher.html

The central entry point for the suite. Opens on app launch and provides quick navigation, upcoming agenda items, and card customization.

#### Key Features
- **Customizable App Cards**: Hover over any card and click ⚙ to set custom titles, personal notes, card size (%), and screen position presets.
- **Collapsible Sidebar**:
  - **Upcoming Events**: Displays lessons, tests, and assignments from [Planner](#plannerhtml) for today and upcoming dates. Click any entry to jump directly to that date in Planner.
  - **To-do List**: Shows pending tasks from Planner sorted by urgency. Overdue items are highlighted in red. Click **+** to add a new to-do.
  - **Recent Docs**: Quick links to recently modified Board constellation maps (`.cstz`) and Document Editor files. Includes real-time change tracking and item count selector (1–20).
- **Header Actions**:
  - **⚙ Config**: Launches [General Config](#general-confightml).
  - **? How To**: Opens built-in documentation with direct *Reveal Folder* disk links.
  - **▶ Tour**: Triggers an interactive step-by-step onboarding guide.
- **Crash Recovery & Session Restoration**: Reopens on app startup even when recovering from an unexpected exit or crash, ensuring uninterrupted access to launcher navigation alongside all restored tool windows.

---

### general-config.html

Centralized settings page organized into **four dedicated tabs** for intuitive navigation.

```
┌──────────────────────────────────────────────────────────┐
│  General Config                                          │
├───────────────┬──────────────────────────────────────────┤
│ General       │  App Identity · Language · PDF · Startup │
│ Storage & Sync│  Data Location · Backup · Sync · Cloud   │
│ Remote Server │  Remote Classroom Server & Secret        │
│ App Notes     │  Per-App Personal Notes Accordion        │
└───────────────┴──────────────────────────────────────────┘
```

#### 1. General Tab (`data-tab="general"`)

- **App Identity**: Customize the global **App Title** displayed in launcher headers and tool window title bars.
- **Language**: Select interface language (**English 🇬🇧**, **Français 🇫🇷**, **Deutsch 🇩🇪**, **Italiano 🇮🇹**). Updates menus, UI strings, help text, and default translation columns in [Learning Tools](#learning-toolshtml).
- **PDF Export Settings**:
  - **Page Size**: Select default paper format (**A4**, **Letter**, **A5**, **Legal**, **A3**).
  - **Margin Space**: Define page margins using standard CSS margin syntax (e.g., `16mm 14mm` or `15mm`).
  - **Page Orientation**: Choose default layout orientation (**Portrait** or **Landscape**). Applied automatically across all suite export operations (Planner, Grade Sheet, Participation Tracker, Schedule Maker, Class Plan, Board).
- **Startup & Launch**:
  - **Apps to open at startup**: Select tools to auto-launch when the app starts.
  - **Window arrangement**: Choose layout mode:
    - *Separate*: Opens each app in its own window.
    - *Maximized*: Opens apps full-screen.
    - *Split screen*: Opens two apps side-by-side. Includes dropdown selection for Left/Right windows and a slider to adjust width split ratio (e.g. 50/50).
  - **Show features in development**: Toggle switch to show/hide beta features (**Phone Remote (beta)**, **Student Input Note (beta)**, **Multiplayer Quiz Host (beta)**).

#### 2. Storage & Sync Tab (`data-tab="storage"`)

- **Data Location**:
  - Displays current data directory path.
  - Buttons for **Change folder…**, **Reset to default**, and **Check for Updates**.
  - **Migrate Files Wizard**: Automatically copies existing user files when switching data locations.
- **Local Backup**: Select target directory and backup format (*Folder*, *ZIP Archive (.zip)*, or *TAR.GZ Archive (.tar.gz)*), then click **Backup Now**.
- **Local Sync**: Configure target sync directory (cloud folder, USB, network drive), enable **Keep target up to date automatically**, reset baseline, or trigger manual **Sync Now**.
- **Cloud & Server Sync (Dev)**:
  - **WebDAV Sync**: Compatible with kDrive, Nextcloud, ownCloud. Server URL, username, app password, remote path, and interval sync.
  - **FTP / FTPS Sync (beta)**: Configure Host, Port, Credentials, Remote Path, FTPS security toggle, and auto-sync intervals (5 to 60 minutes).
  - **Google Drive Sync (beta)**: OAuth 2.0 Client ID & Secret configuration, Google login authentication, and selective folder upload/download.
- **Backup Files Manager**: Open modal to browse, inspect, and batch delete saved backup files.
- **Reset App**: Safety wizard to permanently erase selected app data folders. Requires typing `ERASE` to confirm and offers a compulsory backup ZIP creation first.

#### 3. Remote Server Tab (`data-tab="remote"`)

- **Remote Classroom Server**: Configure central **Server URL** (e.g., `https://classroom.example.com`) and **Host Secret**.
- Automatically utilized by mobile integration features: [Phone Remote (beta)](#phone-remote-beta), [Multiplayer Quiz Host (beta)](#multiplayer-quiz-beta), and [Student Input Note (beta)](#student-input-note-beta).

#### 4. App Notes Tab (`data-tab="notes"`)

- **Per-app Notes**: Interactive accordion containing personal notes for each tool in the suite. Notes entered here sync with the note panels on Launcher tool cards.

---

### group-editor.html

Master roster and class group editor. Serves as the single source of truth for student records and display preferences.

#### Features
- **Active Context**: Set the current school year, term (S1/S2), and start/end dates.
- **Planner Terms**: Manage semester start/end dates and school holiday periods directly.
- **Group Management**: Create S1/S2 groups, edit rosters, set student levels, and toggle **SEN** (Special Educational Needs) flags.
- **Student Display Name Formatting**: Configure student name display styles suite-wide (*First Last*, *Last First*, *First only*, *Last only*) and assign custom nicknames/preferred names per student.
- **Student Roster & UUIDs**: Student data is stored cleanly in `user/students.js`. UUID keys preserve historical links when students or groups are renamed.
- **Archiving**: Archive single groups or entire terms to hide them from active tools without deleting historical session data.

---

### import-tool.html

Wizard for bulk-importing structured data or copying media files into managed workspace folders.

#### Supported Import Types
- **Structured Data (CSV / XLSX / JSON)**: Students, Class Groups, Word Banks, Quizzes, Gap-Fill, Quotes, Error Correction, Dictation, Grammar, Sentences, Story.
- **File Copy**: Sounds (`.mp3`, `.wav`, `.ogg`, `.m4a`) → `user/custom-data/sounds/`; Documents (`.html`, `.md`, `.txt`) → `user/document-editor/docs/`; Books (`.epub`, `.html`, `.pdf`, `.txt`) → `user/custom-data/books/`.

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
- **Linked Board Files**: Right-click any entry to generate or open an attached [Board](#boardhtml) constellation map (`.cstz`).
- **Weeks Navigation Drawer**: Collapsible left sidebar displaying all weeks in the active term with auto-dimming of past weeks and smooth scrolling.
- **To-do Drawer**: Integrated task list synced with `user/todos.js` and Launcher sidebar.
- **Export Options**: Export schedule to **ICS**, **PDF**, **CSV**, **HTML Table**, or **DOCX** with universal export modals providing direct **Open File**, **Open Folder**, and **Open with Document Editor** (for HTML) actions.

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
- **Output**: Export schedule to print, PDF, CSV, XLSX, DOCX, or HTML with universal completion popups (Open File, Open Folder, Open with Document Editor), or save for loading in [Oral Marking](#oral-markinghtml).

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
- **Recent Tab**: Filter constellation map archives (`.cstz`), legacy sessions (`.js`), PDFs, images, and audio. Reopen maps in Board with one click.
- **Browse Tab**: Deep folder navigation across `user/` subdirectories. Supports multi-select (Ctrl/Shift+click), drag-and-drop moving, inline renaming, folder creation, and sidebar folder pinning. Single-file `.cstz` archives are treated as standalone atomic documents.
- **Sync Tab**: Local and background auto-sync configuration with conflict resolution dialogs. Automatically handles `.cstz` board archives under the `mindmaps` category.

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
- **Timer & Class Modes**: Full-screen timer with customizable working modes (Quiet Work `shush.svg`, Group Work `people-group.svg`, Conversation `speech-bubbles.svg`). Includes background ambient soundscapes (Ocean waves `ocean.svg`, Wind `wind.svg`, Flower/Spring `flower.svg`, Music `music.svg`, White/Pink/Brown noise), custom images (`user/mode-image/`), animations, and sound effects.
- **Roster & Scoring**: Award participation marks (**+** / **−**), badges, and strikes. Context menu for attendance, flagging, and role assignment. Respects custom student display names.
- **Auto-Flagging & Criteria Engine**: Multi-color student auto-flagging with customizable criteria (Bottom/Top % Net Score, Net Points, Attendance Rate, **Participation Grade** computed from Participation Tracker rules, badges, and expression formulas) with weighted random picking multipliers.
- **Team Maker & Picker**: Random student picker with drumroll sound, team auto-balancer, and role generator.
- **Presentation View**: Projects roster state, active badges, and points onto a second screen with independent freeze controls.
- **Phone Remote (beta)**:
  - *Local Mode*: Node server on port `8787` for local WiFi mobile scoring.
  - *External Mode*: Connects via WebSocket relay (`js/classroom-server.js`) for internet access.
- **Session & Student ID Integrity Safeguards**: Guarantees strictly unique session timestamps (`session.id`) across quick saves, autosaves, and multi-class batches, plus automatic collision prevention and unique ID enforcement for students in every saved session (`user/group-participation/`).

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
| `[` / `]` | Decrease / increase white noise volume |
</details>

---

### board.html

Infinite-canvas mind-mapping tool for vocabulary, draw overlays, sound nodes, and live lesson projection.

#### Features
- **Mind-Map Canvas**: Draggable nodes, synonym/antonym connections, Wiktionary definition fetching, shape formatting, and color preset swatches.
- **Zipped Archive Storage (`.cstz`)**: Saves all canvas data, multi-page layouts, version histories, and embedded media assets into a single portable `.cstz` archive in `user/mindmaps/`. Media assets are stored uncompressed for fast, spike-free saves.
- **Autosave & Dirty-State Tracking**: Background autosave with configurable intervals and dirty tracking.
- **Floating Live Timer**: Draggable and resizable presentation timer widget embedded directly in Board, synced live from [Class Management](#class-managementhtml).
- **Custom Keyboard Shortcuts**: Configurable keyboard shortcut mapping within Board.
- **Node Styling & Visuals**:
  - **Fit Text**: One-click node boundary auto-fitting (`fit-text.svg`).
  - **Note Word Count**: Right-click context menu option and live word & character counter for notes (`sentence.svg`), supporting selection details and multi-note aggregation.
  - **Blink / Pulse**: Animated pulsing highlight for active discussion nodes and free-floating notes (`blink.svg`), phase-synced in presentation view.
  - **Rich Hyperlinks**: Direct hyperlinks to web URLs, local files, or Planner lessons.
- **Voice Recordings**: Record microphone audio directly and attach sound nodes to the board with built-in audio trimming (`✂ Trim`), bundled seamlessly into the `.cstz` package.
- **High-Resolution PNG Snapshots**: One-click PNG snapshot capture with clean framing and metadata.
- **Table Support**: Copy/paste HTML or TSV spreadsheet tables directly onto the canvas as draggable, resizable board elements.
- **Board Search & Section Preview (`Ctrl+F`)**: Search across all nodes, notes, table cells, and group titles on the active page or across all pages. Features a split-pane modal with element type filtering, live match highlights, an embedded visual canvas cropped section viewer, a "Jump to on Board" action that smoothly centers and pulses the found item on the board, and an **"Open in New Window"** button (or <kbd>Ctrl+Enter</kbd>) to open the searched item's page in a dedicated, purely read-only teacher window displaying a crisp high-resolution WebP page snapshot with click-to-zoom, clipboard copy, and print/PDF export—completely isolated from and without disrupting or replacing secondary mirrored presentation displays.
- **Page Thumbnails & Context Menu**: Right-click any page thumbnail in the bottom toolbar mini-strip or the full Pages Drawer to open a Neobrutalist context menu: choose **Open image in new window** to inspect the page's WebP snapshot in an independent read-only window on the teacher's monitor, or quickly duplicate or delete pages.
- **Student Input Note (beta)**: Allows students to submit short text notes from their smartphones directly onto the board canvas via QR code or URL.
- **Premade Library & Reusable Snippets**: Built-in library modal for reusable widgets, templates, callouts, and custom user-saved board snippets, persistently stored in `user/board-library.json` with cross-window live sync.

<details>
<summary><strong>Default Keyboard Shortcuts</strong></summary>

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Save constellation archive (`.cstz`) |
| `Ctrl/Cmd + F` | Search board words, notes, tables, and groups |
| `Ctrl/Cmd + Z` / `Y` | Undo / Redo |
| `Ctrl/Cmd + G` | Group selected nodes |
| `Ctrl/Cmd + ↑ / ↓` | Increase / decrease node font size |
| `Delete` | Remove selected nodes |
</details>

---

### learning-tools.html

Student-facing activity suite featuring 12 vocabulary and grammar games powered by the central word bank.

#### Games & Modes
- **Vocabulary Games**: Flash Cards 📖, Definition Match 🧩, Hangman 😵, Scrambled Word 🔠, Word Quest 🔍, Sentence Builder 🧩, Quote Analyser 💬, Gap Fill ✏️, Find the Error 🔴, Phonetic Guess 🔉, Synonyms & Antonyms 🔗, Word Search 🔎.
- **Grammar Games**: Grammar Practice 📐, Choose Your Story 📖, Order Sentences 🔢, Dictation 🎤.
- **Team Mode & Timer**: Score tracking across custom teams with progressive point deduction timers.
- **Multiplayer Quiz (beta)**: Live classroom quiz host (Local WiFi or External relay) where students answer synchronously on their mobile devices.

---

### manage-database.html

Centralized content, curriculum, and assessment database editor supporting multi-language translations and pedagogical frameworks.

#### Features
- **Dual Architecture (Learning Content & Assessment/Curriculum)**: Unifies 14 database types across learning activities (Word Banks, Quotes, Dictations, Grammar, Gap Fill, Error Banks, Sentences, Stories, Quizzes) and curriculum/evaluation structures (Competences & Descriptors, Lesson Phases, Evaluation Criteria, Grading Scales, Observation Chips).
- **Competences & Descriptors Editor**: Catalog official curriculum standards with codes, domains, CEFR proficiency levels (A1–C2), grade levels, and sample tasks feeding directly into Competence Portfolio and Lesson Creator.
- **Evaluation Criteria & Interactive Competence Picker**: Configure assessment rubrics with min/max points, intervals, point coefficients, and discrete level comments. Directly link criteria to curriculum standards using the built-in Competence Picker modal with live domain, level, and year filters.
- **Grading Scale Models**: Define scale conversion models (e.g. Swiss 1–6, French 0–20, Percentage, Letter grades) with score thresholds and color bands for Grade Sheet and Oral Marking.
- **Lesson Phase Templates**: Store pedagogical lesson blocks with duration, interaction patterns (Whole Class, Pair, Group, Individual), and dual teacher/student action plans for Lesson Creator.
- **Personalised Observation Chips**: Create themed qualitative observation feedback chips with seamless switching between Table View and Visual Chips View.
- **Multi-Language Schema**: Stores English, French, German, and Italian translations for word banks; active UI language automatically selects the appropriate column.
- **Global Cross-Database Search**: Instant landing search scanning all databases simultaneously with match counts and deep-linking to files.
- **Productivity & AI Tools**: Deduplication (`Remove Dupes`) to clean redundant entries, batch multi-record editing and copying across files, and built-in `AI Prompt` generation tailored for LLMs.
- **Multi-Format Exporting**: Column picker export to CSV, vector PDF, styled editable HTML table, Excel (XLSX), and Word (DOCX).

---

### grade-sheet.html

Grade and assessment tracking spreadsheet supporting custom evaluation criteria, scale models, and drag-and-drop test management.

#### Features
- **Class Summary & Test Sheets**: Track student grades across test slots (T1–T8). Auto-calculate averages based on weighted coefficients or fixed percentages.
- **Drag & Drop Test Reordering**: Easily reorder tests (T1, T2, etc.) directly in the **All Tests** panel via drag-and-drop.
- **Custom Display Names**: Displays student names according to the configured format or nicknames.
- **Reference Data Editor**: Customize evaluation criteria descriptors (`user/correction-criteria.js`) and grading scale thresholds (`user/grade-scale-models.js`).
- **Import Participation Grades**: One-click import prompt when provisional grades are exported from Participation Tracker.
- **Comprehensive Analytics Reports**: Generate whole-class year/semester/test reports or individual student reports with interactive SVG charts (grade distributions, test progression timelines, quartile boxes, and performance matrix).
- **Correction Criteria Reference**: View evaluation rubrics with grade descriptors and point values in a dedicated window with an **Export** button offering direct saving to the `to-print` folder or custom file picker selection, or export directly to PDF, Markdown, or HTML. Personalised test-only criteria automatically render point-based rows (e.g., 0, 1, 2, 3 for a 3-point exercise).
- **Multi-Format Localized Exports**: Export grade reports to Excel (`.xlsx`), CSV, Word (`.docx`), standalone HTML with resizable/draggable columns, and vector PDF / Print sheets. Full multilingual i18n support across English, French, German, and Italian with universal export completion dialogs offering **Open File**, **Open Folder**, and **Open with Document Editor** (for HTML).

---

### competence-portfolio.html

Centralized curriculum tracking and auditing dashboard aggregating learning standards across Planner, Lesson Creator, Board, and Grade Sheet.

#### Features
- **Coverage KPIs**: Real-time summary cards displaying Total Competences, Covered to Date (with percentage progress bar), Assessed (in Grade Sheet), Delivered (in Lesson Creator/Board sessions), Planned (in Planner), and Untouched remaining standards.
- **Domain & Strand View**: Collapsible accordion grouped by curricular strands (Reading, Writing, Speaking, Listening, Grammar, Literature). Each strand displays a progress meter and detailed competence cards with status tags (`Planned`, `Delivered`, `Assessed`, `Untouched`).
- **Audit Timeline**: Chronological event feed tracing every planned lesson, classroom activity, and evaluation date linked to specific curriculum codes.
- **Matrix Table & Multi-Criteria Filtering**: High-density matrix displaying Code, Statement, Domain, Level, Subject, Planned count, Delivered count, Assessed count, Class Mean Score (average %), and Status. Includes live search, subject/year filters, and status toggles.
- **Activity & Assessment History Modal**: Detailed modal inspector showing complete pedagogical descriptions, linked lesson objectives, board mindmaps, and grade test scores with class averages.
- **Reports & Exporting**: One-click CSV export (`Competence_Portfolio_[ClassName].csv`) and printer-ready PDF/paper audit reports.

---

### participation-tracker.html

Comprehensive analytics dashboard sourcing session data from [Class Management](#class-managementhtml).

#### Features
- **Visual Analytics**: Interactive participation trend line charts, total pick counts, positive/negative point distributions, gems, thumbs up/down, and strikes.
- **Comparative Group Summaries**: Compare engagement across multiple classes and time periods.
- **Dynamic Window Positioning & Safe Bounds**: Multi-monitor and safe-bound window positioning.
- **Full Localization (i18n)**: Fully translated UI across English, French, German, and Italian.
- **Session & Student Overviews**: Detailed tabular logs per session and per student.
- **Collision Auto-Healing**: Automatically de-collides session timestamps and student IDs on load and disk persistence, ensuring overlapping saves from multiple classes or devices are never dropped, overwritten, or cross-contaminated.
- **Provisional Grading Engine**: Custom rule configurator converting participation points into grades, with direct one-click **Export to Grade Sheet**.
- **Multi-Format Analytics Exports**: Export exhaustive reports (HTML) and category breakdowns (XLSX, DOCX) with universal completion popups for immediate opening and editing.

---

### administrative-groups.html

Comprehensive student administrative tracker, medical & SEN accommodation manager, and behavioral infraction scoring system.

#### Features
- **Master Administrative Spreadsheet**: Centralized student database tracking contact info, parent emails/phones, medical notices (PAI), exit authorizations, and special educational accommodations (PAP, PPRE, PPS, tiers-temps).
- **Sub-Tabs & Filtering**: Dedicated views (*Master Roster*, *Demographics*, *Emergency & Medical*, *Accommodations & SEN*, *Discipline & Sanctions*, plus custom tabs). Filter by class group or active term/period, with live student search.
- **Infraction Tracking & Point Weighting**: Configurable infraction categories (forgotten equipment, tardiness, classroom disruptions, incomplete homework, attitude, etc.) with custom point weights and icons.
- **Automated Sanction Rules Engine**: Evaluates accumulated student points against customizable threshold tiers to display recommended disciplinary actions (1-on-1 talks, parent notifications, reflection homework, detentions, official contracts, CPE referrals).
- **Flexible Period Scope & Chips**: Configure sanction rules to trigger cumulatively across the whole year, per period individually, or on specific selected terms via interactive Period Chips.
- **Student Profile & Action Timeline**: Full modal profile per student displaying complete intervention history. Log new follow-up meetings and actions with type, title, date, notes, and student commitments.
- **Direct Import & Wizard**: Import `.pdf`, `.xlsx`, `.xls`, `.csv`, or `.json` files with automatic column detection, period selection, and choice of merge mode (*Add / Accumulate* vs *Overwrite*).
- **Multi-Category Export & Print**: Export specialized reports (*Master Roster*, *Emergency & Medical*, *Exam Accommodations Proctors Sheet*, *Discipline & Sanctions*) to **HTML** (editable), **XLSX** (Excel), **PDF** (print layout), **DOCX** (Word), or **CSV**.
- **Rules & Discipline Settings (⚙)**: Customize navigation tabs, add/remove spreadsheet columns, adjust point weights, configure sanction tiers, and generate trimester/semester/custom period date ranges.
- **Archiving & Safety Erasure**: Archive students while preserving historical disciplinary logs, erase administrative data only, or execute synchronized deletion across all master rosters.

---

---

### lesson-creator.html

Neobrutalist instructional design studio for constructing structured, competency-aligned lesson plans with modular phases, curriculum descriptor coverage audits, and direct execution in Class Management.

#### Features
- **Interactive Phase Timeline**: Construct lessons block by block with drag-and-drop reordering, phase splitting (subdividing into independent timed segments), cloning, and deletion.
- **Pedagogical Template Models**: 1-click generation of standard frameworks:
  - **3-Part Lesson**: Starter / Diagnostic, Main Learning Activity, Plenary / Synthesis.
  - **5E Instructional Model**: Engage, Explore, Explain, Elaborate, Evaluate.
  - **PPP Language Framework**: Presentation, Practice, Production.
- **Dynamic Time Budget**: Live calculation of total planned minutes against target class duration with visual color-coded status badges.
- **Descriptor Bank & Curriculum Coverage**: Slide-out drawer (`Ctrl+B`) for browsing school curriculum standards across Subject, Year Level (Y7–Y13), Semester, Category, and Subcategory. Attach descriptors to specific phases with 1 click.
- **Coverage Matrix Audit (`Ctrl+M`)**: Comprehensive matrix displaying which curriculum standards have been taught across saved lesson plans, complete with progress meters and CSV export with instant Open File and Open Folder actions.
- **Live Lesson Runner HUD in Class Management (`Ctrl+R`)**: Run lessons interactively in [Class Management](#class-managementhtml) with automatic phase countdown timers, activity cues, and sound chimes on activity completion.
- **Export to Board Mindmaps**: Non-destructively export or append lesson phase clusters as structured nodes directly into [Board](#boardhtml) constellation mindmaps.
- **Multi-Format Export**: Export formatted lesson plan documents to **HTML**, **DOCX**, **Markdown (.md)**, printable **PDF**, or curriculum coverage **CSV**, with destination selection (`to-print` folder or native file picker) and universal completion dialogs providing one-click **Open File**, **Open Folder**, and **Open with Document Editor** (for HTML and Markdown files).

---

### document-editor.html

Multi-format desktop document editor and typesetting suite supporting **Typst (`.typ`)**, **Markdown (`.md`)**, and **HTML (`.html`)** with live multi-page vector preview, Monaco syntax highlighting, and native vector PDF compilation.

#### Features
- **Triple Format Switcher (`MD` / `HTML` / `TYP`)**: One-click format toggle in the navigation bar dynamically switches Monaco language grammars, toolbar actions, and compiler pipelines.
- **Typst Typesetting Engine (`.typ`)**:
  - Offline WebAssembly compilation powered by `@myriaddreamin/typst.ts` with bundled OpenType Math and Serif fonts (`NewCMMath`, `NewCM10`, `LibertinusSerif`, `DejaVuSansMono`).
  - Native mathematical formula layout (`$ ... $`), multi-column grids (`#grid(...)`), assessment rubrics (`#table(...)`), term definitions (`/ Term:`), and page setup directives (`#set page(...)`, `#set text(...)`).
  - Native vector PDF compilation directly from the Typst compiler for crisp, high-resolution printable handouts and exam papers.
- **Markdown & KaTeX (`.md`)**: Full GFM markdown support with LaTeX maths rendering (`$inline$` and `$$display$$`), checklists, and table formatting.
- **HTML & Custom CSS (`.html`)**: Semantic HTML markup with inline stylesheets, custom layout rules, and print-ready page breaks.
- **Interactive Syntax & Format Guide**: Built-in modal (`Syntax` button in nav bar) featuring real-time search, topic category filters (`Setup & Page`, `Math & Formulas`, `Tables & Grids`, `Exams & Quizzes`, `Layout & Callouts`), instant `Copy` buttons, and one-click `+ Insert` snippet insertion into Monaco at cursor.
- **Mailposting Batch Generation**: Connects class rosters (`class-groups.js`) to dynamic document templates with student placeholders (`{{student.fullName}}`, `{{student.id}}`, `{{class.name}}`, `{{datetime.today}}`). Exports single merged or separate individual PDFs for each student.
- **Book Text Import**: Browse and extract text passages directly from `custom-data/books/` (`.epub`, `.html`, `.txt`) into active documents.
- **Presentation Mode**: Broadcasts clean, live-rendered vector SVGs or HTML previews to secondary display monitors or classroom beamers.
- **Export Options**: Export to native vector PDF, DOCX, or HTML.

---

### data-location.html

*Legacy configuration page.* Storage, backup, and sync settings are now integrated directly into the **Storage & Sync tab** of [General Config](#general-confightml).

---

<p align="center">
  <strong>Class Management Tools</strong> — Built for Teachers. Offline-First & Privacy-Focused.
</p>
