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
  - [Universal Exports ↔ Document Editor (One-Click Handout & Document Ingestion)](#universal-exports--document-editor-one-click-handout--document-ingestion)
  - [Presentation Windows](#presentation-windows)
- [Tool Reference](#tool-reference)
  - [Launcher (`launcher.html`)](#launcherhtml)
  - [General Config (`general-config.html`)](#general-confightml)
  - [Group Editor (`group-editor.html`)](#group-editorhtml)
  - [Import Tool (`import-tool.html`)](#import-toolhtml)
  - [Database Converter (`database-converter.html`)](#database-converterhtml)
  - [Video & Sound Converter (`media-converter.html`)](#media-converterhtml)
  - [Planner (`planner.html`)](#plannerhtml)
  - [Lesson Creator (`lesson-creator.html`)](#lesson-creatorhtml)
  - [Test Creator (`test-creator.html`)](#test-creatorhtml)
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
  - [How-To Guide (`how-to.html`)](#how-tohtml)
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
2. **First-Launch Onboarding Modal** — on first launch without a `user/` folder, the Launcher automatically opens the setup wizard:
   - **Language Selection**: Choose your preferred language (English 🇬🇧, French 🇫🇷, German 🇩🇪, or Italian 🇮🇹); the UI immediately translates in real time.
   - **Data Location**: Click **Choose Folder…** to select an existing data directory (USB drive, cloud folder, or previous installation) or **Use Default Location** to proceed with the recommended local directory.
   - **Guided Tour & Manual**: Click **Take a Tour of the Launcher** for an interactive walkthrough, or **Open How-To Guide** for comprehensive documentation.
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
| [`database-converter.html`](#database-converterhtml) | Universal bidirectional database & table converter (CSV, XLSX, JSON, TSV, ODS, JSONL, SQL, XML, HTML, Markdown) with live preview, schema editing, and direct CMT application format exports | Sinks to [Manage Database](#manage-databasehtml), [Grade Sheet](#grade-sheethtml), [Competence Portfolio](#competence-portfoliohtml), [Group Editor](#group-editorhtml) |
| [`media-converter.html`](#media-converterhtml) | Standalone media conversion, audio extraction, volume normalization, and visual waveform trimmer with teacher presets (720p Video, Oral Exam MP3, WAV extraction, LMS compression, slow listening speed) | Sinks to [Board](#boardhtml), [Oral Marking](#oral-markinghtml), [Document Editor](#document-editorhtml) |
| [`planner.html`](#plannerhtml) | Weekly lesson & test planner with ICS, PDF, CSV, DOCX, and HTML export options, weeks drawer, and linked Board mind maps | Connects to [Grade Sheet](#grade-sheethtml), [Board](#boardhtml), [Class Management](#class-managementhtml), [Lesson Creator](#lesson-creatorhtml) |
| [`lesson-creator.html`](#lesson-creatorhtml) | Neobrutalist lesson planning studio with drag-and-drop phases, curriculum descriptor coverage matrix, live HUD runner in Class Management, and Board mindmap exports | Links to [Planner](#plannerhtml), [Class Management](#class-managementhtml), [Board](#boardhtml) |
| [`test-creator.html`](#test-creatorhtml) | Neobrutalist test authoring studio with 11 exercise types, database linking, Group A/B variants, Seating Plan assignment, criteria rubrics, Grade Sheet sync, and multi-format exports | Links to [Grade Sheet](#grade-sheethtml), [Competence Portfolio](#competence-portfoliohtml), [Class Plan](#class-planhtml), [Manage Database](#manage-databasehtml) |
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
| [`how-to.html`](#how-tohtml) | Comprehensive built-in user guide, interactive tool manuals, and local storage inspector with instant Neobrutalist search modal (`Ctrl+K`), keyword previews, keyboard navigation, and target highlight pulses | Accessible from tool headers via **?** buttons and Launcher |
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
| **Lesson Creator** | Loads class groups, year levels, and assigned subjects from Group Editor, Competences, Criteria, and Custom DB with class auto-sync |
| **Test Creator** | Loads class rosters, variant matrices, and assigned subjects from Group Editor, Competences, Criteria, and Custom DB with class auto-sync |
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

<details>
<summary><strong>Universal Tagging, Bidirectional Linking & Context Inheritance</strong></summary>

The suite includes a centralized graph engine and modal manager (`js/links-service.js`, `js/tag-link-modal.js`, `css/tag-link-modal.css`):
- **Universal Linking (`[LINKS: X]` & `[TAGS: Y]`)**: Connect documents, evaluation tests, student submissions, curriculum competences, criteria presets, and files/PDFs together with bidirectional edge tracking stored in `user/links-registry.json`.
- **Autonomous Hierarchy Cascading**: Linking any entity automatically propagates and connects its upward container tree:
  - `student` $\rightarrow$ `class` $\rightarrow$ `level`
  - `board-node` / `board-note` $\rightarrow$ `board`
  - `doc_section` $\rightarrow$ `doc`
  - `phase` $\rightarrow$ `lesson`
  - `test-exercise` $\rightarrow$ `test`
  - `grade_cell` $\rightarrow$ `eval` $\rightarrow$ `class`
- **Inferred Badges & Promotion (`[PROMOTE]`)**: Inferred links are visually distinguished with color-coded Neobrutalist badges (`[AUTO: CLASS]`, `[AUTO: LEVEL]`, `[AUTO: CONTAINER]`, `[INFERRED]`). Teachers can convert any inferred relation into a permanent explicit link in 1 click via `[PROMOTE]`.
- **Student 360° Academic Dossier & Export Studio (`[EXPORT / PRINT DOSSIER]`)**: Clicking or inspecting a student aggregates all Grade Sheet assessments, test scores, weighted semester/annual averages, live Participation Tracker metrics (attendance rate, net engagement points, positive/negative tallies, engagement trends, provisional participation grades, and session timeline history), teacher observations, rubric criteria breakdowns, curriculum competences, delivered lesson plans, linked documents/submissions, and board constellations into a unified multi-dimensional record (`LinksService.getStudentAcademicDossier`). Provides 1-click deep-link navigation directly into Grade Sheet test sheets and Participation Tracker. Features dynamic in-place **Multi-Criteria Sorting** (`Date Newest/Oldest`, `Name A→Z / Z→A`, `Activity / Type`) across both interactive view sections and the **360° Dossier Export Studio** (`#cmt-dossier-pdf-modal-overlay`) with:
  - **Interactive In-Place Sorting**: Instant sorting dropdown in the dossier header and export studio allowing teachers to order evaluations, competences, lessons, files, and participation logs chronologically, alphabetically, or grouped by activity type with user preference persistence.
  - **Split-View Live Scaled Preview**: Real-time sandboxed document preview (debounced at 50ms) with interactive zoom controls (`Fit`, `75%`, `100%`, `125%`) and exact `@page` print simulation for A4 and Letter (Portrait/Landscape).
  - **1-Click Presets**: Quick-select configurations for *Full 360° Dossier*, *Official Transcript*, *Evaluations & Feedback*, and *Executive Summary*.
  - **Granular Elements Selection Menu**: Per-item checkboxes and instant filter search bars for evaluations, competences, lessons, documents, mindmaps, and participation sessions, plus configurable font scaling (`Compact 90%`, `Standard 100%`, `Comfort 110%`).
  - **Participation & Engagement Reporting**: Exportable attendance rate summary, net score badges, engagement trend indicators ($\uparrow / \downarrow / \rightarrow$), provisional grades, teacher observation remarks, and detailed session-by-session history logs.
  - **Vector SVG Mindmap Rendering & Embedding**: Converts linked `.cstz` archives and `.json` board sessions into crisp, high-resolution vector SVG diagrams and topic/concept index tables directly embedded within the printable dossier.
  - **Standalone Mindmaps PDF Export (`[EXPORT MINDMAPS PDF ONLY]`)**: Compiles all selected board mindmaps into a standalone high-resolution multi-page PDF booklet.
  - **Clean Semantic HTML Export (`[EXPORT HTML]`)**: Exports clean semantic HTML with an embedded `<style>` block adhering to the `export-standards` skill, with universal destination saving and 1-click launch into **Document Editor** via `showExportSuccessPopup`.
  - **Direct Vector PDF Export (`[EXPORT PDF]`)**: High-fidelity vector PDF generation via `Desktop.printPdf()` with the Universal Destination Modal and `showExportSuccessPopup`.
- **Neobrutalist Plain-Text Design**: Built without emojis or icons, adhering to clean high-contrast black borders, hard offset shadows, and crisp text badges (`[LINKS: 3]`, `[ADD TAG]`, `[ATTACH FILE]`, `[WORK]`, `[INHERITED: 6E B]`).
- **Contextual Inheritance**: Tests and assignments automatically inherit criteria presets, grading scale models, and target competences from their parent class with an explicit `[INHERITED: ...]` indicator badge.
- **Automated Test Linking (Criteria & Scales)**: In Grade Sheet, tests automatically derive and synchronize universal graph links (`cmt:criteria:...`, `cmt:scale:...`, and `cmt:competence:...`) directly from the Criteria and Grading Scale tabs in the Test Options modal.
- **Import from Test Creator (`[IMPORT FROM TEST CREATOR]`)**: In Grade Sheet, teachers can import any saved test from Test Creator in 1 click, automatically populating the test title, date, scope, scoring scale, and converting all exercises into weighted evaluation sub-criteria with attached curriculum competences.
- **Header & Column Badges (`[TEST]` / `[FILE]`)**: Evaluations linked to Test Creator assessments or attached exam papers / answer keys display clickable Neobrutalist badges in table headers and context menus for instant navigation and preview.
- **Student Work Attachments & Cell Badges (`[WORK]`)**: Student score cells in both the class summary matrix and evaluation sheet display `[WORK]` submission badges for attached exam scans, PDFs, essays, or audio recordings stored safely in `user/attachments/grades/<classId>/<evalId>/` with 1-click in-app preview.
- **Cross-Window Synchronisation**: Edge and tag modifications instantly notify all active windows via `BroadcastChannel ('cmt-links-sync')`, updating link badges in real time without tearing down the DOM.
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

### Lesson Creator ↔ Test Creator: Unified Unit Sequences & End-of-Unit Tests

- **Cross-Tool Unit Sequences**: Connect lessons authored in [Lesson Creator](#lesson-creatorhtml) and assessments created in [Test Creator](#test-creatorhtml) into a unified curriculum progression (e.g. *Unit 3: Ecology & Biodiversity*).
- **1-Click Test Creation for Unit**: Generate matching end-of-unit tests directly from Lesson Creator's Sequence Manager with automatic title and class inheritance.
- **Unit-Wide Vocabulary & Concept Pulling**: In Test Creator, pull vocabulary banks, key concepts, and pedagogical objectives across an **Entire Unit Sequence** to automatically construct comprehensive review assessments and quizzes.
- **Entire Unit Sequence Export**: Export whole teaching units with all lessons and tests into a unified **HTML Booklet** (with interactive Table of Contents), printable **PDF**, combined **Markdown** (for Document Editor), or portable **JSON Archive bundle**.

---

---

### Class Management ↔ Lesson Creator: Automatic Lesson Runner HUD

When loading a class group in [Class Management](#class-managementhtml) on a date with a scheduled lesson plan, the system detects it automatically. If a single plan exists, it offers to start the **Lesson Runner HUD**, bringing timed activity phases, dynamic timers, and curriculum descriptors into the live session. If multiple plans exist, a clean dialog prompts the teacher to choose.

---

---

### Board ↔ Planner: Lesson Tagging

- **Board → Planner**: Click **Planner** in the Board toolbar to tag a constellation session map to a specific Planner lesson, test, or assignment (`_plannerEntryId`).
- **Planner → Board**: Right-click any entry in [Planner](#plannerhtml) (or click the modal button) to immediately create or open its linked Board mind-map archive (`.cstz`).
- **Class Data Import Integration**: Opening **CLASS DATA** in Board automatically detects if the current session is associated with a Planner timetable slot, filtering the class picker to that exact class (with an interactive notice and **[SHOW ALL CLASSES]** toggle). All student rosters, seating plan desk labels, and team assignments automatically resolve internal UUIDs to full student names.

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

### Universal Importer & Exporter: Trans-App Data Hub (Board & Document Editor)

[Board](#boardhtml) and [Document Editor](#document-editorhtml) feature the unified **Universal Import & Export** system (`[IMPORT]` / `Universal Import…`), querying, filtering, auto-linking in the CMT Link Graph, and inserting records across all **5 suite data domains (24 sub-sources)**:
- **Learning Content**: 9 distinct databases (Word Banks, Quizzes, Quotes, Dictations, Grammar Rules, Gap-Fills, Error Banks, Sentence Reordering, Reading Stories).
- **Assessment & Curriculum**: Test Banks, Curriculum Competences, Lesson Phases, Criteria Rubrics, Grading Scale Models, Observation Chips.
- **Class & Rosters**: Master Class Rosters from `class-groups.js` and `user/students.js`, Physical Seating Plans from `user/class-plans/plans.js`, Randomized/Balanced Teams. All student names and plan titles are automatically resolved to clean human-readable names through the unified roster cache instead of raw internal UUIDs.
- **Grade Sheet**: Term Evaluation Overviews (with live dynamic calculation of S1/S2/Annual student averages aggregated from test result files), Test Scores, and Competence Mastery Logs.
- **Participation Tracker**: Session Statistics, Student Anecdotal Notes (with resolved student identities), and Objective Grading Rules.
- **Multi-Tier Reactive Cascading Filters**: Selecting a Source / File Set dynamically narrows the available Levels to only those present in that file; selecting a Level further narrows the Themes/Categories in cascade, showing accurate item counts per option across all databases, rosters, and test sets.
- **Database-Aware Semantic Field Selector & Live Preview**: Instead of generic title/subtitle options, each of the 24 sub-sources presents tailored attribute choices (e.g. *Word + IPA + Translation* or *Connected Node Pairs* for Vocab; *Question + Correct Answer* or *Full MCQ Card* for Quizzes; *Criterion + Weight* for Rubrics; *Student Score & Percentage* for Grade Sheets) complete with a real-time live preview box.
- **Automatic Link Graph Linking (`[Auto-link in Graph]`)**: Inserting items automatically generates bidirectional URN links (`LinksService.addLink`) connecting the imported records directly to the host document or board session, populating the central link graph in real time with canonical `data-urn` attributes on board nodes.
- **Output Targets**:
  - **On Board Canvas**: Context-aware output layouts tailored to the active database (Interactive **Class Plan Visual Layout Cards** with floor plan previews and 1-click `[Open in Class Plan]` deep links for seating plans; **Interactive Activity Launcher Cards** with direct play and multiplayer quiz triggers for quizzes and games; **Concept/Student Nodes**, **Drag & Drop Staging Tray**, **Mindmap Radial Clusters**, **Sticky Note Checklists**, and **Editable Data Tables** for vocabulary, rosters, grades, and criteria) — with customizable insertion placement directly at the click / cursor position or in the center of the board view.
  - **In Document Editor**: Formatted Markdown Tables, Student Worksheets (MCQ & Fill-in-the-Blank), Task Checklists (`- [ ]`), Callout Blockquotes, and Lesson Phase Timelines.
  - **Direct Multi-Format Exporter**: Standalone file export to HTML (Semantic & Filterable), Print PDF, Markdown (`.md`), CSV, Excel Workbook (`.xlsx`), and Word (`.docx`) adhering to suite export standards with universal export dialogs.




---

### Competence Portfolio ↔ Grade Sheet, Planner, Lesson Creator & Board: Centralized Curriculum Auditing

[Competence Portfolio](#competence-portfoliohtml) unifies pedagogical planning, delivery, and evaluation:
- **Grade Sheet**: Test columns tagged with curriculum competence codes automatically push student marks to calculate evaluated mastery percentages and domain breakdown stats.
- **Planner**: Lessons scheduled with attached curriculum descriptors feed the planned coverage KPIs and the chronological Audit Timeline.
- **Lesson Creator**: Phase-level descriptor tags mark curriculum standards as delivered when lessons are run in Class Management.
- **Board**: Interactive mindmaps can tag curriculum descriptors, tying whiteboard learning directly into the audit progression.
- **Multi-Source Curriculum Filtering**: Filter standards by Subject, Year Level, and Source database / curriculum bank (e.g., custom competence files, CEFR descriptor sets, or converted databases). Dynamic KPIs, domain breakdowns, and matrix tables automatically reflect the chosen curriculum source.

---

### Cross-Database Competence Linking: Automatic Multi-Tool Pairing

Curriculum competences can be linked across distinct databases (e.g. mapping National Curriculum codes to CEFR descriptors or Grammar objectives) in [Manage Database](#manage-databasehtml):
- **Bidirectional Link Registry**: Stored safely in `user/custom-data/competence-links.json` with qualified keys (`dbFile::id`), ensuring zero collisions between different curriculum sets.
- **Smart Prompts in Grade Sheet, Board & Lesson Creator**: When a teacher selects or tags a competence in [Grade Sheet](#grade-sheethtml), [Board](#boardhtml), or [Lesson Creator](#lesson-creatorhtml), a Neobrutalist prompt automatically offers to attach linked companion competences from other databases with 1 click.
- **Auto-Add Preference**: Teachers can toggle *"Don't ask again this session (auto-add linked)"* to automatically link paired standards without interruptions.
- **Portfolio Navigation**: [Competence Portfolio](#competence-portfoliohtml) renders clickable linked competence badges in the detail modal, allowing seamless navigation across related standards and curricula.

---

### Universal Cross-App Tagging, Linking & Contextual Inheritance Engine

Class Management Tools features a unified, cross-application **Tagging, Linking, and Contextual Inheritance Engine** (`js/links-service.js` & `js/tag-link-modal.js`):
- **Universal Graph Architecture**: Stores bidirectional entity relationships and global `#tags` safely in `user/links-registry.json` using standardized Uniform Resource Names (URNs: `cmt:<type>:<id>#<anchor>`).
- **Deep Planner Integration (`cmt:planner:<entryId>`)**: Connects scheduled slots directly to Board constellation maps (`cmt:board:...`), Grade Sheet evaluations (`cmt:gradesheet:...`), Lesson Plans (`cmt:lesson:...`), Markdown handouts (`cmt:doc:...`), and attached files or PDFs (`cmt:file:...`).
- **Board Session & Node-Level Deep Linking**: Both active Board sessions (`cmt:board:<filename>`) and individual canvas word nodes (`cmt:board-node:<filename>:<nodeId>`) can be linked to lesson plans, handouts, assessments, and universal `#tags`. Nodes display compact plain-text badges (`[PLAN]`, `[DOC]`, `[PDF]`, `[TEST]`, `[#TAG]`) with 1-click navigation.
- **Extract PDF Page to Canvas**: For nodes linked to PDF files, right-clicking offers **Extract Page to Canvas** to immediately select and stamp PDF pages onto the active board canvas.
- **Deep-Link Node Focus & Pulse**: Navigating to a board node from Planner, Document Editor, or another window automatically centers the canvas and triggers a smooth pulse halo.
- **Vocabulary Database Mind Maps & Sync**: Teachers can cluster words from `vocabBank` by category or part of speech into radial mind maps with a central hub node, and sync new brainstormed nodes back to the vocabulary database in 1 click.
- **Contextual Inheritance & Regressive Auto-Linking**: Items automatically inherit defaults and propagate relationships regressively across the entire Suite. When a constellation mindmap is associated with a Planner timeslot, links to the class group, academic year, curriculum level, and associated grade sheets are created automatically. Conversely, linking a class group to a Planner event automatically bridges the associated grade sheets and all active Board constellation sessions.
- **Strict Plain-Text Neobrutalist UI**: A dedicated, reusable modal component (`js/tag-link-modal.js` and `css/tag-link-modal.css`) built with crisp 1.5px–2px solid borders, tactile offset shadows, high-contrast fills, and ultra-compact plain-text badges and capsule buttons (`[OPEN]`, `[UNLINK]`, `[ADD TAG]`, `[ATTACH FILE / PDF]`, `[CLOSE]`) engineered for maximum link overview density.
- **Grouped Link Sorting by Type**: Connected items (`cmt-lm-links-container`) are automatically grouped into clean, compact subheadings (`DOCUMENTS`, `CLASSES & STUDENTS`, `LESSONS & PLANNER`, `BOARD MINDMAPS`, `GRADE SHEETS & EVALUATIONS`, `CURRICULUM & RUBRICS`, `DATABASES & QUESTION BANKS`, `FILES & ATTACHMENTS`) and sorted alphabetically by title within each group.
- **Embedded File Previewer**: PDFs, images, and audio attachments open in a clean in-app previewer with page pagination, audio playback, and an `[OPEN IN DEFAULT APP]` external launcher.
- **Multi-Window Sync**: Communicates across all open windows via `BroadcastChannel('cmt-links-sync')` to update link badges and count indicators in real time at 60fps without full page reloads.

---

### Lesson Creator ↔ Board: Interactive Mindmap Export & Merging

Export structured lesson phases, objectives, and pedagogical steps directly into an interactive [Board](#boardhtml) mindmap canvas session (`.cstz`). You can generate a fresh session or non-destructively append the lesson phase cluster into an existing whiteboard constellation.

---

### Lesson Creator ↔ Document Editor: Printable Lesson Plans & Handouts

Export complete lesson outlines with phase breakdowns, time budgets, pedagogical frameworks, and materials directly into formatted Typst, Markdown, or HTML files in [Document Editor](#document-editorhtml) for PDF export and student worksheets.

---

### Universal Exports ↔ Document Editor: One-Click Handout & Document Ingestion

HTML and Markdown exports generated across suite tools — including [Manage Database](#manage-databasehtml), [Test Creator](#test-creatorhtml), [Lesson Creator](#lesson-creatorhtml), [Planner](#plannerhtml), and [Database Converter](#database-converterhtml) — can be dispatched straight into [Document Editor](#document-editorhtml):
- **Editable File Name Prompt**: When choosing an export destination, teachers can edit the suggested file name before saving.
- **Dedicated Destination Card**: Selecting **Document Editor** automatically writes the file directly to the teacher's document library (`user/document-editor/docs/`) and opens it in Document Editor with embedded CSS rules parsed and live Monaco editing active.
- **Universal Completion Modals**: Exports saved to the Print Folder (`user/to-print/`) or custom disk locations also present an **Open with Document Editor** shortcut button in the post-export dialog.

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
  - **Tags & Units**: Live aggregated count of active `#tags` across the suite with quick-select pills. Clicking any tag pill or the explorer button opens the **Unit & Tag Explorer** modal.
- **Header Actions**:
  - **Links / Unit & Tag Explorer**: One-click modal (`#unitExplorerModal`) with sub-tabs for **Tags & Units Explorer** and dedicated **Student Academic Dossiers**:
    - **Tags & Units Explorer**: Aggregates all documents, lessons, mindmaps, tests, planner slots, grade evaluations, and student 360° dossiers tagged under any unit or theme (e.g. `#unit-3`, `#revision`, `#oral-exam`) with category tabs (`[ALL]`, `[DOCS]`, `[LESSONS]`, `[MINDMAPS]`, `[TESTS]`, `[PLANNER]`, `[GRADES]`, `[360° DOSSIER]`).
    - **Student Academic Dossiers**: Direct suite-wide student explorer featuring class filtering dropdown (`All Classes` / individual groups), live search, multi-criteria sorting (Name, Class, GPA, Evaluations), live GPA badges, 4-metric KPI grid (evaluations, competences, lessons, mindmaps & docs), recent test scores, and 1-click `[Open 360° Dossier]`, `[Export Studio]`, `[Grade Sheet]`, and `[Links & Tags]` action buttons.
  - **⚙ Config**: Launches [General Config](#general-confightml).
  - **? How To**: Opens built-in documentation with direct *Reveal Folder* disk links.
  - **▶ Tour**: Triggers an interactive step-by-step onboarding guide.
- **First-Launch Onboarding Wizard**: Automatically appears on first launch if no data directory is configured. Offers instant interface language selection (FR, EN, DE, IT), data directory selection (custom directory/USB/cloud sync vs. recommended local default), interactive tour launch, and direct how-to guide access.
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
- **Year-End & Term Archiving**: Launch the Batch Archiving Wizard to package and archive time-related data (Planner entries, Grade evaluations, Participation logs, Mindmaps, Schedules, and Print queues) with automatic safety snapshots while preserving student UUIDs and app settings.
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

### database-converter.html

Comprehensive offline-first **Database & Table Converter** enabling seamless bidirectional conversions between spreadsheets, database dumps, JSON, and Class Management Suite internal schemas.

#### Key Features & Supported Formats
- **Ingestion & Parsing**:
  - Drag-and-drop or file picker for `.xlsx`, `.xls`, `.ods`, `.csv`, `.tsv`, `.json`, `.jsonl`, `.sql`, `.xml`, `.html`, `.md`.
  - Paste raw text mode with intelligent format auto-detection.
  - Multi-sheet workbook switcher for Excel and ODS files.
  - Header row selection (Auto-detect, Row 1, Row 2, or No header).
- **Interactive Data Studio**:
  - Live search filter across all records.
  - Paginated high-speed data table (15, 25, 50, 100 rows per page) ensuring 60fps responsiveness.
  - Zero-horizontal-scroll density switcher: "Fit (No Scroll)" (wrap text), "Truncate" (single-line with hover tooltips), or "Scrollable" mode.
  - Layout toggle: Split View (50/50 Data & Output Studios) vs. Full Width View (stacked 100% canvas) with automatic full-width switching for tables with >6 columns.
  - Schema mapping: reorder columns, rename output headers, toggle column inclusion, cast types (Text, Number, Boolean, Date, JSON), and apply text transforms (Trim, UPPERCASE, lowercase, Title Case).
  - **Premade Model Preset Bar & Dual Output Header Adjuster**:
    - Pick any CMT model preset directly inside Schema Editor (*Grade Sheet Criteria*, *Competence Bank*, *Class Roster*, *Vocabulary Bank*, *Quiz Questions*, *Admin Groups*).
    - Under **Output Header**, easily choose from a dropdown of expected target fields (e.g., `code`, `title`, `category` for Competences; `name`, `maxPoints`, `minPoints` for Grade Sheet) or type a custom header.
    - Automatic data type synchronization and instant field status feedback (`(Selected)`, `(Used)`).
    - One-click **Auto-Match** to align matching aliases and **Reset Headers** to restore source names.
- **Universal Target Formats**:
  - **CSV / TSV**: Delimiter options (`,`, `;`, `\t`, `|`), quote escaping, UTF-8 BOM toggle for native Excel compatibility.
  - **Excel (.xlsx) / OpenDocument (.ods)**: Formatted workbooks with styled headers via SheetJS.
  - **JSON / JSONL**: Array of Objects, 2D Arrays, or Keyed Dictionary formats with 2-space, 4-space, or minified output.
  - **SQL**: Dialect support (SQLite, PostgreSQL, MySQL) with optional `CREATE TABLE` DDL and batch `INSERT INTO` statements.
  - **XML**: Customizable `<root>` and `<record>` tags.
  - **HTML Table**: Semantic table markup with embedded Neobrutalist styling.
  - **Markdown Table**: GitHub-flavored markdown tables for notes and document editing.
- **Class Management Suite App Formats & Interactive Field Mapping Matrix**:
  - **Grade Sheet Criteria**: Evaluation criteria schema with grade scales, points, and descriptors compatible with [Grade Sheet](#grade-sheethtml).
  - **Competence Bank**: Curriculum standards/competence bank with code, title, domain, level, descriptors compatible with [Competence Portfolio](#competence-portfoliohtml) and [Lesson Creator](#lesson-creatorhtml).
  - **Class Rosters & Students**: `class-groups.js` compatible roster format with UUIDs, first/last names, SEN flags, and class groups compatible with [Group Editor](#group-editorhtml).
  - **Vocabulary / Word Bank**: Multilingual vocabulary database (word, definitions, translations, POS, level) compatible with [Manage Database](#manage-databasehtml) & [Learning Tools](#learning-toolshtml).
  - **Quiz Question Bank**: Structured multiple-choice questions compatible with [Manage Database](#manage-databasehtml) and multiplayer quiz tools.
  - **Administrative Groups**: Student cohort mapping compatible with [Administrative Groups](#administrative-groupshtml).
  - **Interactive Field Mapping Matrix**: Dedicated panel showing required and optional fields with `<select>` source column pickers, status badges (`✓ Mapped`, `⚠ Required`, `Optional`), and two-way real-time synchronization with the Schema Editor.
- **Export Standards & Actions**:
  - Live syntax/code preview with instant character and line count badges.
  - 1-click **Copy Converted Output** to system clipboard with toast feedback.
  - Universal export modal (`showExportSuccessPopup`) with one-click **Open File**, **Open Folder**, and **Open with Document Editor** (for `.html` and `.md`).

---

### media-converter.html

Offline-first **Video & Sound Converter** with visual waveform trimming, audio extraction, loudness normalization, tempo adjustment, and teacher quick presets.

#### Key Features & Architecture
- **Hybrid Engine Architecture (Approach E)**:
  - **Tier 1 (Built-in Web Engine — <500 KB build footprint)**: Pure Web Audio API + PCM WAV encoding + LameJS MP3 encoding + Canvas-to-WebP generator. Converts speech, music, and waveforms directly in-browser/Electron without external dependencies.
  - **Tier 2 (Native FFmpeg Engine)**: Automatically discovers system FFmpeg or prebuilt binary in `user/tools/ffmpeg/` to unlock hardware-accelerated video encoding (H.264/HEVC/VP9), instant lossless cuts (`-c copy`), and two-pass EBU R128 volume normalization.
- **One-Click Teacher Presets**:
  - *Classroom Video (720p MP4)*: Universal projector and screen resolution.
  - *Oral Exam / Speech (128k MP3)*: Compact audio format optimized for student speeches.
  - *Extract Audio (WAV)*: Instant audio track extraction from video clips.
  - *LMS Small File (<25MB MP4)*: Highly compressed format for school portal uploads.
  - *Slow Listening (0.85x MP3)*: Pitch-preserving speed adjustment for language learners.
  - *Voice Normalizer & Boost*: Dual-pass loudness leveling to clarify quiet student voices.
  - *Animated WebP Loop*: Lightweight video-to-WebP diagram loop converter.
- **Visual WaveSurfer Timeline & Trimming**:
  - Interactive dual-handle waveform region scrubber for millisecond-accurate clip trimming.
  - Lossless stream copy (`-c copy`) for instant sub-second cutting.
- **Destination Selection Dialog & Output Routing**:
  - Prompts before conversion (single files and batch queues) to select the output destination:
    - *Same Folder as Original Media*: Saves alongside the input file in its source directory.
    - *Print Folder (`user/to-print`)*: Saves directly into the suite's local print directory.
    - *Choose Other Folder*: Opens the OS folder picker for custom drives/folders.
    - *In-place Rename*: Allows modifying the output filename before conversion starts while preserving correct format extensions.
- **Universal Export Integration**:
  - Export success popup with **Open File**, **Open Folder**, and **Close** actions.

---

### test-creator.html

Comprehensive **Test & Exam Authoring Studio** featuring 11 modular question types, dynamic variant matrix assignment (Group A / Group B), seating plan integration, Grade Sheet evaluation sync, and customizable PDF/DOCX/HTML/Markdown exports.

#### Key Features & Architecture
- **Wholly Customizable Exam Header & Allowed Materials Subsystem (`Ctrl+H`)**:
  - Click the **Header & Materials…** button in the top metadata panel or press `Ctrl+H` to access the dedicated 4-tab customisation studio with live preview:
    - **Tab 1: Allowed Materials**: Quick-toggle preset material chips (*Pen & Pencil only*, *Bilingual Dictionary*, *Monolingual Dictionary*, *Scientific Calculator*, *Basic Calculator*, *Formula Sheet*, *Open Book / Notes*, *Draft Paper*, *No Electronic Devices*) or type custom allowances with 1-click **Add & Save Preset** to expand your reusable preset library. Active materials support **direct in-place editing** (click any item text or the ✏️ Edit button to modify its text with Enter/Esc shortcuts, save/cancel controls, and live header preview updating). Configurable display mode (*inline comma-separated* or *individual pill badges*) and bold/italic/underline labels.
    - **Tab 2: Header Elements & Typography**: Granular element-by-element visibility toggles, custom labels, and Bold (**B**), Italic (*I*), Underline (<u>U</u>) styling for: *Exam Title* (with multi-unit font sizing: `pt`, `px`, `cm`, `mm`, `em`, uppercase, alignment), *Subtitle / Department / Institution* (with multi-unit font sizing), *Student Name* (with solid rule, dotted line, or bordered box), *Class / Group*, *Date*, *Teacher*, *Duration*, *Materials Allowed*, *Scope / Topic*, *Points / Score Box*, and *Group Variant Badge*. Includes an optional multi-line *Student Exam Instructions & Guidelines* notice box (bordered box, accent quote bar, or yellow tint).
    - **Tab 3: Box Layout & Border**: Outer border styling (*Classic Double Rule*, *Modern Neobrutalist with offset shadow*, *Clean Solid*, *Dashed*, *Minimal*, or *Borderless*), metadata grid layout (*3-Column Grid*, *2-Column Grid*, *Compact Inline*, or *Formal Evaluation Table*), background tints (*Soft Ivory*, *Pure White*, *Subtle Slate Grey*), and padding controls.
    - **Tab 4: Element & Metadata Order**: Interactive reordering (▲ Up / ▼ Down) of top-level header sections (*Exam Title*, *Subtitle*, *Metadata Grid/Table*, *Exam Instructions*) and individual student metadata fields (*Student Name*, *Class / Group*, *Date*, *Teacher*, *Duration*, *Materials Allowed*, *Scope / Topic*, *Points / Score Box*).
    - **Live Mini-Preview**: Interactive real-time preview renders header updates instantaneously.
- **Universal Rich Text Formatting & Input Styling (`**`, `__`, safe HTML)**:
  - **Every input and field** across Test Creator—including test titles, instructions, prompts, options, sentence starters, hints, rubrics, reading passages, clues, and footnotes—supports rich formatting via markdown (`**bold**`, `__bold__`, `*italic*`, `_italic_`, `~~strike~~`, `^sup^`, `~sub~`, `==mark==`, `` `code` ``) and safe HTML tags (`<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<ins>`, `<s>`, `<del>`, `<sub>`, `<sup>`, `<mark>`, `<small>`, `<span>`, `<font>`, `<br>`, `<code>`).
  - **Floating Rich Text Toolbar**: Automatically appears when selecting text or focusing inputs, offering instant formatting buttons (**B**, *I*, <u>U</u>, <s>S</s>, x², x₂, Highlight, and color highlights).
  - **Universal Input Shortcuts**: Press `Ctrl+B` (bold), `Ctrl+I` (italic), or `Ctrl+U` (underline) inside any text input or textarea to instantly wrap or toggle formatting around the selection.
- **Universal Sub-Item & Component Reordering (▲ Up / ▼ Down)**:
  - **All 11 Exercise Types**: Every multi-item exercise card features interactive Move Up (▲) and Move Down (▼) buttons on each question or task item—including Cloze sentences/passages, MCQ questions, Open Questions, Composition tasks, Rubrics, Matching pairs, Sentence transformations, Translation sentences, Picture prompts, Table rows, Odd-one-out items, and Reading Comprehension sub-questions. Reorder items smoothly without copy-pasting.
  - **Composition Modular Question Components**: Granularly toggle ON/OFF and reorder pedagogical sections (*Genre Badge*, *Prompt & Sentence Starters*, *Draft / Brainstorming Box*, *Writing Lines*, *Proofreading Checklist*, *Marking Rubric*) in any sequence using the unified Question Components panel (`tc-subopts-panel`) in the Composition options drawer. Each component features an inclusion checkbox, position reordering arrows (▲ / ▼), included/removed status pill badges, and embedded contextual controls (rough work dimensions, proofreading checklist items, writing line ruling & spacing, and genre selector).
- **Multi-Unit Measurement System (`pt`, `px`, `cm`, `mm`, `em`)**:
  - Modifiable dimensions support multiple CSS units across the application: Title & Subtitle font sizes, Essay line spacing / height, Essay line stroke thickness, and Draft / Brainstorming box height. Inputs pair a numerical value with an instant unit selector.
- **Open Saved Test Picker (`Ctrl+O`), File Browser & Seamless Persistence**:
  - Press `Ctrl+O`, click **Open** in the main toolbar, or select **Open Test…** / **Browse File…** from the File menu to launch the Saved Tests Picker modal. Filter saved assessments by title, subject, class, or topic with instant exercise count and point badges, one-click loading, and safe deletion.
  - Teachers can also load any external or shared JSON test file from disk using the **Browse File…** button.
  - Active tests automatically persist across page refreshes and can be launched directly via URL parameters (`?file=` or `?testId=`), with seamless fallback across desktop files (`user/tests/`) and local storage.
- **11 Modular Exercise Types with Per-Card Collapsible Options**:
  - Every exercise card includes a collapsible **Options** drawer providing granular pedagogical and layout customisations:
    - **Cloze / Gap Fill**: Blank styles (`solid underline`, `boxed fill-in`, `character-length dots`), first-letter scaffolding hints (`p_____`), extra distractor words pool, and alphabetical or random word bank ordering.
    - **Multiple Choice (MCQ)**: Layout arrangements (`2-column grid`, `1-column stack`, `inline row`), marker styles (`letters A–D`, `checkbox [ ]`, `circle ( )`, `numbers`), and option shuffling on print/export.
    - **Open Question**: Ruled notebook lines, dotted lines, squared math grid, framed boxes, sentence starter prefixes (`"Because..."`), and response length guidance.
    - **Composition / Essay**: Pre-set format & genre badges (*Argumentative Essay*, *Formal Letter*, *News Article*, *Personal Narrative*, *Review*, *Dialogue*), min/max word targets, fully customizable essay writing lines (adjustable line spacing / height, line type: *solid*, *dashed*, *dotted*, and stroke thickness with clean margin layout and no intrusive left borders), multi-unit rough work / draft brainstorming area, student proofreading checklists with customizable container appearance (background tint, padding, border style), criteria rubrics, and modular component reordering.
    - **Matching**: Presentation formats (`letter boxes`, `connecting dots ●—●`, `2-column response table`), customizable column headers, and distractor items in Column B.
    - **Sentence Transformation**: Cambridge-style word count constraint banners (*"Use between 2 and 5 words"*), contractions note, and capital block vs inline bracketed keywords.
    - **Translation**: Direction indicator badges (*"English → French"*), per-sentence vocabulary clues/hints, and ruling formats.
    - **Picture Description**: Side-by-side (`image left 40%`, `prompt & lines right 60%`) or stacked layouts, image sizing (`small 120px`, `medium 180px`, `large 250px`), target vocabulary pool chips, and document/figure caption labeling.
    - **Table Completion**: Full grid, zebra-striped, or minimal scientific/academic border styles, cell text alignment, and word bank pool for missing cells.
    - **Odd One Out**: Task modes (`circle & justify`, `circle only`, `cross out`) and display styles (`rounded pill badges` vs `slash-separated`).
    - **Reading Comprehension**: Two-column newspaper format or full-width passage layout, vocabulary footnotes/glossary, and per-subquestion custom line allocations and question types (`short answer`, `True/False + line citation justification`).
- **Safe Database Auto-Save Workflow**:
  - Newly added exercises have "Save to Database" toggled **OFF by default** to prevent cluttering the central exercise database with drafts.
  - Toggling "Save to Database" **ON** on any exercise immediately saves it to the custom database with instant confirmation toast notifications.
- **Resource Drawer with Multi-Filter Wordbank, Criteria, Competence Bank & Grading Scales**:
  - Live access to curriculum competences, evaluation criteria rubrics, custom exercise databases, rich vocabulary wordbanks, and grading scale banks.
  - **Full Competence Bank Subsystem & Description Printing**:
    - **Multi-Level Filtering & Dynamic Hierarchy**: Filter curriculum standards by Subject (synced automatically with test subject/class), Year Level, Category, and Subcategory (populated dynamically based on subject and parent category).
    - **Full-Text Search & Keyword Highlighting**: Real-time search across competence codes, titles, descriptions, categories, subcategories, tags, comments, and sample tasks with `<mark class="search-highlight">` matches.
    - **Customise View Modal (`Customise View`)**: Switch between *Detailed (Full)*, *Compact (Summary)*, and *Minimal (Code & Title)* presets, and granularly toggle field visibility (Code, Title, Description, Level/Tier badge, Category tags, Keywords & tags, Comments/sample tasks, Action buttons). Preferences persist in `user/competence-display-config.json` with web storage fallback.
    - **Sorting & Direct Tool Links**: Sort competences by Code (A–Z), Title (A–Z), or Level/Tier. One-click buttons to open the central Database (`manage-database.html`) or import standards via CSV/JSON (`import-tool.html`).
    - **Dual Tagging & Drag-and-Drop Workflow**: Attach competences either to the entire exam (test-wide) or to specific exercises using the "Tag to:" selector, clicking the card / `+ Tag` button, or dragging competence cards directly onto exercise cards.
    - **Active Test Competences Bar & Print Options**: An interactive workspace bar displays linked competences with quick-removal chips, a **Print on Exam Sheet** checkbox, and an **Include Descriptions** toggle. When enabled, full competence descriptors render on the exam paper in the chosen format (*Evaluation Table*, *Badges*, or *Bulleted List*) configured in the Header Customizer (`Ctrl+H`).
  - **Assessment Criteria Subsystem & Description Printing**:
    - **Dynamic Criteria Bank**: Pull evaluation criteria rubrics from custom criteria databases (`user/custom-data/criteria/`, target `customCriteria`), built-in criteria (`correction-criteria.js`), or define custom rubrics.
    - **Targeted Attachment**: Attach criteria rubrics to the entire exam (test-wide) or to specific exercise cards (e.g. Composition/Essay).
    - **Active Test Criteria Bar & Print Options**: An interactive teal status bar surfaces attached criteria with max point badges, a **Print on Exam Sheet** toggle, and an **Include Descriptions** toggle. When enabled, full criteria descriptions and grading domain notes render cleanly on the exam paper and in marking keys.
  - Multi-criteria filtering for wordbanks: search input, theme, keyword, CEFR level (A1–C2), source file, letter (A–Z), and part of speech / type.
  - Badges displaying part of speech, difficulty level, theme, and source origin.
  - **Interactive Drawer Item Modal**: Clicking any vocabulary item card (`drawer-item-card`) opens a Neobrutalist inspection popup allowing teachers to inspect phonetic transcription (IPA), definitions, and translations. Teachers can copy individual elements or all details to the clipboard, insert them directly into the currently active exercise field/cursor position, append them as new exercise items into a selected exercise card, or create a brand new exercise from the item.
- **Grading Scale Models & Score Conversion Tables (Custom Scales & Resource Drawer Tab 5)**:
  - **Dynamic Scale Bank Loading**: Browse and load grading scale models dynamically from custom databases (`user/custom-data/scales/`, target `customScales`), user models (`user/grade-scale-models.js`), and built-in scales (French 0–20, Percentage 0–100%, Swiss/German 1–6, US Letter A–F, UK Honours).
  - **Dual Attachment Workflow**: Attach any scale model either to the entire exam (test-wide) or to specific exercises with dedicated `+ Grading Scale` buttons and tag badges with remove controls.
  - **Active Test Grading Scale Bar**: An interactive workspace bar displays active scale name, model system, dynamic score conversion intervals calculated from the exam's total points (e.g. `Grade 6: 27–30 pts (≥90%)`), an instant "Print on Exam Sheet" toggle, and a removal button.
  - **Header Customizer Integration & Container Customization**: Toggle inclusion on exam printout, customize scale header label, choose display mode (`Conversion Table`, `Inline (6 = 30 (95.4%))` format displaying `grade = points (percentage)`, or `Header Metadata`), and customize container appearance directly in Tab 2 (Background tint: default, white, light blue, soft green, warm amber, muted gray; Padding: compact, standard, relaxed; Border style: solid, double, dashed, dotted, none).
  - **High-Fidelity Exports & Grade Sheet**: Conversion tables and inline grade steps render across Print / PDF Preview, standalone HTML exports, Word Document (.docx), and Markdown exports. Seamlessly passes `scaleBank` and `scaleModel` when registering evaluations directly into [Grade Sheet](#grade-sheethtml).
- **Pedagogical Test Models & Reusable Test Templates**:
  - Choose from curated built-in test templates (*Grammar & Vocabulary Test*, *Standard Reading Comprehension*, *General Midterm Exam*, *Short Quiz / Quick Check*, *Literature Essay Exam*) or save any authored test as a custom template (`File → Save as Template…`).
  - Built-in Template Picker modal (`File → Test Templates & Models…` or toolbar **Templates** button) with search filtering, tabbed filtering (*All*, *Built-in Models*, *My Custom Templates*), exercise type chips breakdown, duration, points, and 1-click test instantiation with fresh UUID generation.
  - 1-click JSON template export and import across teacher workstations. Custom templates persist safely to `user/custom-test-templates.json` with web `localStorage` fallback.
- **Reusable Header & Materials Templates**:
  - Header Customizer modal (`Ctrl+H`) features a header template dropdown bar populated with curated built-in templates (*Standard Academic Exam*, *Modern Neobrutalist Assessment*, *Reading Comprehension Header*, *Quick Diagnostic Quiz*, *Formal End-of-Term Examination*) and user custom header configurations.
  - 1-click **Save as Template…** prompts for a name and saves the active header configuration, allowed materials pool, and materials typography to `user/custom-header-templates.json`.
  - 1-click **Apply Template** applies the configuration and updates all fields and live previews instantaneously. Custom header templates can be deleted at any time with confirmation.
- **Configurable Page Margins for PDF & Print**:
  - Set page margins directly in the Print Preview toolbar (`Normal (15mm)`, `Narrow (10mm)`, `Wide (25mm)`, or `Custom…`).
  - Detailed per-margin numeric inputs (Top, Right, Bottom, Left in mm) with instant preset switching buttons in the Style Customisation modal (`🎨 Style`).
  - Pixel-perfect consistency between on-screen PDF preview and physical/exported PDF via CSS `@page { size: A4 portrait; margin: ... }` and Electron's Chromium print settings (`preferCSSPageSize: true`, `marginsType: 1`).
- **Export Customisation & Semantic HTML Architecture (`export-standards` skill)**:
  - Global styling controls for base font size (`9pt`–`16pt`), line spacing/height (`1.2`–`2.4`), exercise card padding (`8px`–`24px`), and line numbering.
  - Numbered lines for student writing areas and reading comprehension passages.
  - Dedicated per-exercise override modal (`🎨 Style`) and bulk matrix table with "Apply Global Settings to All" option.
  - **Stylesheet Theme Selection & Automatic Persistence**: Choose between 3 dedicated visual themes (*Academic Classic*, *Modern Neobrutalist*, or *Dyslexic Friendly*) directly from the Print/PDF Preview toolbar, the Export Formatting & Styling modal (`Style`), or the Exam Export dialog. The chosen theme automatically persists with the test document (`test.exportStyle.theme` / `test.stylesheetTheme`) and is remembered in local preferences across sessions as the teacher's default style for future tests.
  - Strict compliance with `export-standards`: HTML exports utilize clean semantic CSS classes and an embedded `<style>` block in `<head>` without repetitive inline styles, ensuring clean document structures, easy styling overrides, and seamless ingestion into Document Editor.
- **Exact Rendition Print Preview, Live Browser Preview & Export Circuit**:
  - High-fidelity PDF.js print preview matching Document Editor's exact rendition using Electron's native `Desktop.printPdf({ previewOnly: true })` and high DPR canvas rendering.
  - **Live Exam Browser Preview Modal (matching Lesson Creator)**: Click **Preview in Browser** in the Export modal to inspect the fully rendered exam document in an interactive modal iframe with live stylesheets, print layout, and colors. Includes one-click buttons to **Open in System Browser**, **Print**, and directly trigger **Export**.
  - Direct PDF export via `Desktop.printPdf`.
  - Universal export modal (`showExportSuccessPopup`) with **Open File**, **Open Folder**, and **Open with Document Editor** (for `.html` and `.md` exports).
- **Cross-Tool Linking & Contextual Inheritance (Graph Engine & Universal Modal)**:
  - **Class Group Context Inheritance**: Selecting a class in Test Creator automatically inherits its configured criteria rubric (preselected in Criteria Drawer with `[INHERITED: Class]` badge) and default grading scale model (preselected with `[INHERITED: Class]` badge).
  - **Class Objectives Banner & 1-Click Attachment**: The Competences Drawer surfaces all curriculum standards and target competences defined for the class with an instant `[ATTACH CLASS OBJECTIVES]` button to tag them test-wide or to the active exercise.
  - **Lesson Plan Ingestion (`[PULL VOCAB / EXERCISES FROM LESSON]`)**: Pulls vocabulary, key concepts, and phase objectives from any saved lesson plan in `user/lessons/` to automatically generate Cloze/Gap-fill, Matching, and Open Comprehension exercises while registering a bidirectional link (`cmt:test:...` ↔ `cmt:lesson:...`).
  - **1-Click Export to Document Editor (`[EXPORT TO DOC EDITOR]`)**: Formats and exports the exam directly to `user/document-editor/docs/` with semantic CSS classes and stylesheet, registering the link (`cmt:test:...` ↔ `cmt:doc:...`) and launching Document Editor instantaneously for live typographic editing.
  - **Revision Mindmap Generator (`[GENERATE REVISION MINDMAP]`)**: Synthesizes test exercises, prompts, and points into a branching constellation node graph saved to `user/constellations/`, bidirectionally linked (`cmt:test:...` ↔ `cmt:board:...`), with 1-click launch into [Board](#boardhtml).
  - **Exercise-Level Competence Graph**: Exercises linked to curriculum competences automatically maintain granular links in `LinksService` (`cmt:test:<file>#<exId>` ↔ `cmt:competence:<codeId>`), feeding student mastery calculations in [Competence Portfolio](#competence-portfoliohtml).

---

### planner.html

Lesson, assessment, and holiday scheduling tool with export capabilities.

#### Key Features
- **Term Management**: Create terms, define weekly schedules, and flag holidays.
- **Class Schedules**: Color-coded classes with lesson slot auto-population.
- **Entries & Reminders**: Lesson, Test, and Assignment entries. Configurable pre-start and end-of-lesson reminder alerts.
- **Universal Tagging & Linking Engine Integration (`cmt:planner:<entryId>`)**:
  - **Neobrutalist Card Badges**: Scheduled slots render real-time plain-text badges without emojis or icons:
    - `[DOC: DocumentName]`: 1-click launch into Document Editor.
    - `[FILE: FileName]`: 1-click open of attached PDFs, handouts, or audio in the default system viewer.
    - `[BOARD: MapName]`: 1-click launch of Board centered on the attached session or mindmap node.
    - `[TEST: TestName]`: 1-click launch of Grade Sheet evaluation or Test Creator assessment.
    - `[LESSON: LessonPlan]`: 1-click launch of Lesson Creator.
    - `[LINKS: N]`: Count badge for additional linked suite resources.
    - `[#tags]`: Color-coded topic and unit tags (e.g. `#unit-3`, `#revision`, `#oral-exam`).
  - **Entry Modal & Card Action Triggers**: Manage tags and links from the entry modal footer (`[LINKS & TAGS]`) or directly on slot cards using the plain-text `[L]` action button.
  - **Right-Click Context Menu**: Instant access to `Links & Tags…`, `Open Linked Document`, and `Open Attached File`.
  - **In-Place Reactive Sync**: Graph updates across other windows update badges smoothly in real time without refreshing the agenda or table DOM.
  - **Deep-Linking Routing**: Launch Planner directly with `?entryId=<id>` (and optional `&openLinks=1`) to automatically navigate to the target week/date, scroll to and highlight the slot card, and open the Link modal.
  - **Grade Sheet Test Sync**: Linking a test in Planner automatically registers and establishes bidirectional graph edges with [Grade Sheet](#grade-sheethtml).
- **Linked Board Files**: Right-click any entry to generate or open an attached [Board](#boardhtml) constellation map (`.cstz`).
- **Weeks Navigation Drawer**: Collapsible left sidebar displaying all weeks in the active term with auto-dimming of past weeks and smooth scrolling.
- **To-do Drawer & Multi-Class Tasks**: Integrated task drawer synced with `user/todos.js`, the central link graph engine (`LinksService`), and Launcher sidebar. Supports linking multiple classes per task with interactive tactile toggle chips, due dates, custom reminders, subtasks, 12x12 SVG link headers with descriptor subtext, and automatic bi-directional graph synchronization connecting tasks (`cmt:todo:...`) to Planner entries (`cmt:slot:...`), Board mindmaps (`cmt:board:...`), Grade Sheets (`cmt:gradesheet:...`), and Class groups (`cmt:class:...`).
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
- **Groups/Teams (Manual & Automatic)**: For interaction-based oral exams, multiple students can be grouped into a single shared time slot. Use **+ Add Group** to manually select students, or click **⚡ Auto-Group** to divide students automatically by number of groups or students per group, with random or alphabetical assignment, customizable group prefixes, and live group size breakdown previews. The group appears as a single row in the schedule table showing all members' names and the shared prep/exam timing. Groups can be ungrouped back to individual student rows at any time.
- **Customizable Export Options & Profiles**: When exporting to PDF, CSV, XLSX, DOCX, or HTML, an Export Options modal lets teachers customize exactly what is included:
  - **Quick Presets**: 1-click switcher between **Examiner Copy** (all details, SEN badges, prep start times, breaks, gap waiting notices, header info, and footer summary) and **Student Noticeboard** (privacy-safe: hides SEN flags and examiner waiting warnings while keeping slot times and breaks clean).
  - **Granular Toggles**: Selectively enable/disable slot numbers (`#`), SEN badges, prep start times, exam end times, break rows, examiner gap warnings, header information box, and footer duration summary. Settings persist in `localStorage` across sessions.
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
- **Recent Tab**: Filter constellation map archives (`.cstz`), legacy sessions (`.js`), PDFs, images, and audio. Reopen maps in Board with one click. Rows display compact Neobrutalist tag badges (`#tag`), clicking which switches directly to the **Tags & Units** tab pre-filtered to that tag.
- **Browse Tab**: Deep folder navigation across `user/` subdirectories. Supports multi-select (Ctrl/Shift+click), drag-and-drop moving, inline renaming, folder creation, and sidebar folder pinning. Single-file `.cstz` archives are treated as standalone atomic documents. Files with associated tags display clickable tag badges for immediate inspection.
- **Student Dossiers Tab**: Dedicated academic hub displaying complete student profiles with live GPA/average badges, evaluation counts, competence mastery, scheduled lessons, and 1-click **360° Dossier** inspection and **Export Studio** (PDF & HTML report cards). Includes quick class filtering, live search, and sorting (Name, Class, GPA).
- **Tags & Units Tab**: Suite-wide explorer to browse, search, and aggregate resources linked to any `#tag` (e.g. `#unit-1`, `#revision`, `#oral-exam`). Features quick tag pills, real-time search filtering, category tabs (`[ALL]`, `[DOCS]`, `[LESSONS]`, `[MINDMAPS]`, `[TESTS]`, `[PLANNER]`, `[GRADES]`, `[360° DOSSIER]`), and 1-click `[OPEN]`, `[360° DOSSIER]`, and `[LINKS & TAGS]` modals.
- **Archive & Rollover Tab**: Complete year-end and term rollover suite. Teachers can archive completed school years, clean up obsolete sessions, and reset rosters safely.
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
- **Session & Student ID Integrity Safeguards**: Guarantees strictly unique session timestamps (`session.id`) across quick saves, autosaves, and multi-class batches, preventing accidental state clobbering.

---

### board.html

Interactive mind-map, visual board, constellation session maps, and whiteboard canvas.

#### Features
- **Offline Voice Recognition & Dictation**: Offline speech-to-text dictation supporting English, French, German, and Italian with high accuracy, live audio waveform visualizer, continuous speech transcription, automatic punctuation, search integration, and **Copy to clipboard**. Features an integrated voice search mic trigger in the search overlay, a dedicated **Dictate mini button** on sticky note mini-action bars for cursor-aware in-place voice typing, and live subtitle caption broadcasting to secondary presentation/projector displays.
- **Attached Node Note Hover Button & Display Toggle**: When a note is linked to a word node (via *Add Note* in the context menu, Wiktionary definition picker, or file loading), a small circular note button appears in the top-right corner of the node adjacent to the emoji dot. The button reveals smoothly on node hover (`opacity: 0.85`, scaling with a yellow accent on direct hover). Clicking the button instantly toggles the attached note's display—completely hiding the note from the canvas (`display: none`) to eliminate visual clutter, or restoring it completely (`display: ''`) with full formatting, text, and KaTeX math formulas intact.
- **Interactive Sound Nodes**: Sound files inserted from attachments, recordings, or media tools are placed directly as interactive Sound Nodes on the board canvas. Clicking a sound node opens an anchored Neobrutalist action popover featuring **Play**, **Pause**, **Stop**, **Open App** (opens the audio track in the operating system's default media player), **Folder** (reveals the file or `.cstz` archive in the system file explorer), time duration display, and an interactive seeking slider. If the board is loaded from a `.cstz` archive, opening in the system player automatically highlights the archive location and extracts the audio file for playback. Audio updates and scrubbing stream in-place via throttled micro-messages without triggering DOM rebuilds on secondary presentation/mirror displays.
- **Interactive Video Nodes**: Video attachments inserted onto the board canvas can be placed as compact, draggable **Video Nodes** (or converted to canvas video boxes via the media manager or popover action). Clicking a video node opens an anchored Neobrutalist action popover with **Play/Pause**, **Stop**, **Mute / Unmute**, **Fullscreen**, **Convert to Canvas Box**, **Open App** (launches the video in the default desktop video player), **Folder** (reveals the file or `.cstz` archive in the file explorer), seek slider, and live time readouts. Video playback and scrubber state stream smoothly in-place via throttled micro-messages to mirrored presentation displays.
- **IPA Phonetic Keyboard (`Alt+I`)**: Floating, draggable International Phonetic Alphabet keyboard with categorized tabs (Short vowels, Long vowels, Diphthongs, Nasal vowels, Plosives, Fricatives, Affricates, Nasals, Approximants, Stress & Tone markers, Diacritics, and Curated Language Sets for English RP/GenAm, French, German, and Italian). Supports one-click insertion:
  - **In Note**: Inserts the IPA buffer at the active caret position inside sticky notes or selected notes.
  - **In Node**: Inserts into active inline node text inputs or appends phonetics to selected word nodes.
  - **+ Node**: Spawns a brand-new word node containing the IPA transcription at the viewport center or next to selection.
  - **+ Note**: Spawns a brand-new sticky note containing the IPA transcription.
  - **Direct Insert Mode**: When enabled, clicking any phonetic key directly writes to the active cursor/target without stealing focus. Includes slash `/.../` and bracket `[...]` wrappers, clipboard copy, buffer clear, and persistent drag position memory.
- **Mind-Map Canvas**: Draggable nodes, synonym/antonym connections, Wiktionary definition fetching, shape formatting, and color preset swatches. Includes quick creation shorthands: `,,` for separate words, `_` for phrases, `//` for two lines, `++` for automatic group clustering (leaving single `+` available for literal text), and `--` / `>` / `<` / `<>` for links and directional arrows.
- **Zipped Archive Storage (`.cstz`)**: Saves all canvas data, multi-page layouts, version histories, and embedded media assets into a single portable `.cstz` archive in `user/mindmaps/`. Media assets are stored uncompressed for fast, spike-free saves.
- **Autosave & Dirty-State Tracking**: Background autosave with configurable intervals (from 15s, 30s, 45s, 1m, 1.5m, 2m, 5m, up to 10 minutes or custom minutes) and dirty tracking (uses fast cached snapshots for zero lag). Manual saves (`Ctrl+S` / Save button) explicitly rebuild fresh high-fidelity visual snapshots for all pages and persist them into the archive.
- **Floating Live Timer**: Draggable and resizable presentation timer widget embedded directly in Board, synced live from [Class Management](#class-managementhtml).
- **Custom Keyboard Shortcuts**: Configurable keyboard shortcut mapping within Board, including dedicated shortcuts for modes: Text/Move (`Ctrl+W`), Drawing Pen (`Ctrl+D`), and Hand/Pan Tool (`H`).
- **Chromium Native Zoom & Mirror Sync**: Full support for native zoom shortcuts (`Ctrl +` / `Ctrl =`, `Ctrl -`, `Ctrl 0` to reset to 100%) and `Ctrl + MouseWheel` smooth zooming. Zooming on the main Board view automatically synchronizes in real-time to the secondary presentation/mirror display.
- **Invisible Groups & Group Styling**: Group any combination of word nodes, notes, drawings, and shapes together into unified movable units. When grouping elements (via <kbd>Ctrl+G</kbd>, the multi-selection context bar, or right-click menu), select standard colored containers or create an **Invisible Group** (no border and transparent background, or directly via <kbd>Ctrl+Shift+G</kbd>). Toggle any existing group between visible and invisible via the **Invisible** button or the transparent swatch (`⊘`) in the group context menu, preserving effortless coordinated drag-and-drop movement without visual frame clutter on primary and mirrored presentation displays.
- **Node Styling & Visuals**:
  - **Node Rotation**: Rotate word nodes by quick preset angles (**0°**, **90°**, **180°**, **270°**) or enter any custom angle (**0–360°**) directly from the node context menu. Supports batch rotation across all multi-selected nodes simultaneously (via context menu or the quick `↻ 90°` action button), with rotated bounding box integration in group containers, dynamic edge boundary clipping, and live mirror synchronization to secondary presentation displays.
  - **Node Max Width / Word Wrap**: Set a maximum pixel width on any word node (rectangle or oval) via the **Width** slider in the node context menu (0–400 px, in 10 px steps; `—` = unconstrained). When a width is set, the node text wraps across multiple lines and the node grows vertically to fit. Persisted in the session file via the node `fmt` object; automatically cleared when switching to a fixed-size shape (circle/square). Supports batch application across multi-selected nodes.
  - **Wholly Visible Context Menus**: All board context menus (nodes, word notes, edges, groups, canvas, and drawing/media popups) are strictly clamped within the viewport and scrollable vertically if needed, ensuring they remain 100% visible on any display size or zoom level without cutting off.
  - **Fit Text**: One-click node boundary auto-fitting (`fit-text.svg`).
  - **Note Word Count**: Right-click context menu option and live word & character counter for notes (`sentence.svg`), supporting selection details and multi-note aggregation.
  - **Note Splitting & Conversion**: Split a sticky note at the cursor into two stacked notes with the initial note's height automatically reduced to the split point, or convert note text into word nodes via a Neobrutalist options modal (by whole note, lines, sentences, or words).
  - **Word / Node Splitting**: Split a multi-word or single-word node via the context menu button into separate nodes: choose **Split by space** to break phrases into individual words, or **Split by letter** to decompose text into individual letter nodes (whitespace stripped). Supports single-node execution as well as batch-splitting across all multi-selected nodes.
  - **Blink / Pulse**: Animated pulsing highlight for active discussion nodes and free-floating notes (`blink.svg`), phase-synced in presentation view.
  - **Rich Hyperlinks**: Direct hyperlinks to web URLs, local files, or Planner lessons.
- **Compact Drawing & Annotation Mode**: Freehand annotations, shape drawing (rectangle, circle, diamond, line, arrow, polygon), and canvas panning organized into 5 compact Neobrutalist dropdowns (**Presets**, **Shapes**, **Colour**, **Line**, and **Eraser**). Features both **Partial** stroke erasing (excising intersected stroke segments in real-time with continuous interpolation and automatic splitting of severed strokes) and **Stroke** erasing (instant deletion upon touching any stroke segment or shape), with an adjustable radius slider and integrated **Hand** mode (shortcut: `H`) for effortless board panning and repositioning.
- **Media Tools & Media Converter Integration**:
  - **Node Context Menu Media Tools**: Right-clicking a Sound Node or Video Node reveals a dedicated Neobrutalist **Media Tools** row:
    - *0.85x Speed*: Generates a pedagogical slow-listening version of the audio track with pitch preservation.
    - *Boost Voice*: Normalizes volume to clarify quiet classroom audio and student voice recordings.
    - *Extract Audio*: Extracts the audio track from a Video Node and automatically creates a new Sound Node placed alongside on the canvas.
    - *Converter...*: Directly launches the full Video & Sound Converter tool with the active media asset pre-selected.
  - **Board Recorder MP3 Podcast & Media Converter Export**: When finishing a live screen or voice recording, the preview modal offers instant **Export MP3 (Audio)** to create lightweight student podcast files and a **Media Converter** button to trim or transcode with custom presets before saving.
  - **Attachment Shelf Quick Convert**: Audio and video assets in the Constellation Attachments Shelf include a **Convert** action button to optimize media formats on the fly.
- **Media Items & Fullscreen Display**: Attach images, background PDFs, video clips, and audio recordings directly onto the board. Images and videos in fullscreen mode strictly maintain their natural aspect ratio (`object-fit: contain`) without stretching or distortion across all screen dimensions.
- **Voice & Board Video Screen Recording**: Record voice audio or live board screen video with real-time VU audio meter, customizable frame rates (10–60 fps), selectable audio input devices, multi-format container support (**MP4** for universal VLC/PowerPoint/mobile compatibility and **WebM** with complete EBML Cues keyframe indexing for seamless VLC seeking), CFR keepalive frame pulses to prevent static screen freeze/desync, and reliable background capture across both the Main Board Window and clean Presentation/Mirror views without blank frame throttling.
- **High-Resolution PNG Snapshots**: One-click PNG snapshot capture with clean framing and metadata.
- **Table Support**: Copy/paste HTML or TSV spreadsheet tables directly onto the canvas as draggable, resizable board elements.
- **Board Search & Teacher View Preview (`Ctrl+F`)**: Search across all nodes, notes, table cells, and group titles on the active page or across all pages. Features a split-pane modal with element type filtering, live match highlights with smart centered excerpts, a "Jump to on Board" action (via toolbar button, double-click, Enter, or card jump icon) that smoothly centers, pulses, and selects the board element (selecting matching text in notes and tables without highlighting node text), and an **"Open in New Window"** button (or <kbd>Ctrl+Enter</kbd>) to open the searched item's page in a dedicated, purely read-only teacher window displaying a crisp high-resolution WebP page snapshot with click-to-zoom, clipboard copy, and print/PDF export—completely isolated from and without disrupting or replacing secondary mirrored presentation displays.
- **Page Thumbnails & Context Menu**: Right-click any page thumbnail in the bottom toolbar mini-strip or the full Pages Drawer to open a Neobrutalist context menu: choose **Open page in new window** to open an interactive secondary window navigating directly to that constellation board with multi-layer saving protection (autosave, close saves, and manual overwrites are strictly disabled to protect the primary session; closing the secondary window never closes the active presentation view), choose **Open image in new window** to inspect the page's WebP snapshot in an independent read-only window on the teacher's monitor, or quickly duplicate or delete pages.
- **Student Input Note (beta)**: Allows students to submit short text notes from their smartphones directly onto the board canvas via QR code or URL.
- **Advanced Node & Note Linking & Connection Context Menu**: Right-click (or double-click) any link or arrow to open the enhanced Neobrutalist link menu. Features a multi-row wrapping colour palette, opacity slider (applied exclusively to the line and arrows while keeping labels 100% legible), stroke types (**Solid**, **Dashes**, **Dots**, **Double Line** with single clean arrowhead, **Wavy** cubic Bézier sine waves), routing modes (**Straight**, **Curved** with interactive midpoint arc bend handle, **Step** right-angle orthogonal routing), direction switcher (**None**, **Forward**, **Backward**, **Both**), compact custom terminators (**Arrow**, **Chevron**, **Dot/Circle**, **Diamond**), animated marching-ants flow for dashed/dotted lines, label pill background badges, quick relationship presets (*is a*, *causes*, *part of*, *leads to*, *synonym*, *example*), and magnetic docking anchors (North, South, East, West ports) with endpoint reconnect handles across nodes, sticky notes, and groups. Commits on close or outside click and cancels on <kbd>Escape</kbd>.
- **Premade Library & Reusable Snippets**: Built-in library modal for reusable widgets, templates, callouts, and custom user-saved board snippets, persistently stored in `user/board-library.json` with cross-window live sync. Supports saving single elements or multi-element selections including word nodes, sticky notes, groups, freehand drawings/pen strokes, and geometric shapes (rectangles, ellipses, diamonds, stars, callout clouds, and arrows). Right-click context menus on pen drawings, shapes, sticky notes, nodes, and groups feature dedicated **Save to Premade Library** actions with automatic relative coordinate centering for clean viewport placement upon insertion.
- **Responsive Canvas & Freedom of Movement**: Full unconstrained drag-and-drop movement across the open board canvas without artificial viewport-clamping, ensuring nodes placed on larger displays remain smoothly draggable, editable, and movable without getting stuck when the application window or screen is resized.
- **Snap-to-Align & Multi-Selection Snapping**: Interactive alignment guidelines when dragging nodes, notes, shapes, drawings, and tables with an on/off toolbar toggle (or hold <kbd>Alt</kbd> to temporarily bypass). When multiple nodes are selected and dragged together, snapping is automatically enabled with the top-left element serving as the alignment reference marker, ensuring the entire selection snaps smoothly against surrounding canvas elements while rigidly preserving relative node spacing.
- **Lexical Card Popups & Test Exercise Deep-Linking**: Clicking a `[VOCAB]` badge on any word node opens a rich Neobrutalist lexical card displaying IPA phonetics, definitions, example sentences, and audio pronunciation. Clicking `[TEST EX: #]` deep-links directly into [Test Creator](#test-creatorhtml), automatically navigating to and pulsing the target exercise card. Board dynamically listens to database sync broadcasts (`cmt_data_sync`), instantly refreshing node badges whenever word banks are updated in Manage Database without requiring a page reload.
- **Interactive Quizzes & Learning Games on Board (`[GAMES & QUIZZES]`)**: Dedicated multi-tab Neobrutalist modal in the File and Vocab toolbars to seamlessly integrate learning content onto the Board canvas:
  - **Quizzes Tab**: Browse built-in and custom quiz question sets. Filter by CEFR level (A1–C2), theme, and question type (Multiple-choice, Single-choice, True/False) with Select All / Deselect All, real-time counters, answer previews, and explanation tooltips.
  - **Vocabulary Games Tab**: Select from 8 vocabulary activity modes (*Definition Match*, *Hangman*, *Scrambled Word*, *Word Quest*, *Phonetics / IPA*, *Synonyms & Antonyms*, *Flash Cards*, *Word Search*). Filter words by theme, CEFR level, part of speech, source, or star status with live selection counters.
  - **Grammar & Language Tools Tab**: Select from 7 grammar tools (*Sentence Builder*, *Gap Fill*, *Find the Error*, *Dictation*, *Order Sentences*, *Quote Analyser*, *Werewolf*) with schema-adaptive item previews.
  - **4 Flexible Placement Formats**: Spawns directly on canvas as:
    - *Interactive Launcher Card*: Draggable, resizable widget with activity badges, 1-click **[PLAY IN WINDOW]** deep-link launcher, **[MULTIPLAYER]** quiz host launcher, and an expandable **[PREVIEW ITEMS]** drawer.
    - *Mindmap Cluster*: Central hub activity node linked radially to child question/word nodes inside a styled group container.
    - *Markdown Note Checklist*: Sticky note card with interactive markdown checkboxes (`- [ ] Item`).
    - *Bottom Staging Tray*: Stashes selected items into the staging tray for drag-and-drop lesson pacing.
  - **Deep-Linking & Two-Way Execution**: Clicking **Play in Window** on any launcher card opens [Learning Tools](#learning-toolshtml) or [Quiz Player](#quiz-playerhtml) pre-loaded with exact section, theme, level, and word filters.

- **Class Data Import (Rosters, Seating Plans & Teams)**: Dedicated Neobrutalist import modal in the top toolbar (`[CLASS DATA]`) allowing teachers to seamlessly bring student and class structures into the Board canvas:
  - **Planner Slot Auto-Filter & Name Resolution**: When a board is linked to a Planner timetable slot, the modal automatically pre-filters the class selector to that specific class with a toggle to show all classes. Student names are automatically resolved to clean human names across all views instead of internal UUIDs.
  - **Name Format Selector**: Choose how student names are displayed and imported across all tabs: **First name**, **Last name**, **First name and last name**, or **Custom name** (custom nickname falling back to First + Initial), with instant re-rendering and persistent preferences.
  - **Class Roster Tab**: Pick any class and select students (with Select/Deselect All) to spawn as mindmap word nodes inside an auto-arranged Class Mindmap Group, as a single Roster Sticky Note card, or staged into the Bottom Staging Tray for on-the-fly drag-and-drop.
  - **Seating Plan Tab**: Select any saved seating plan (from Class Plan) with live room metadata, layout dimensions, and student count previews. Instantly generates desk blocks positioned matching the classroom layout, with options to label desks with student names and group them inside an enclosing Room Group container.
  - **Teams Tab**: Select saved class teams (from Class Management) or generate balanced teams (2–6 teams with reshuffle). Spawns color-coded Team Mindmap Groups on the canvas and/or sets the active Board game teams for the live Scoreboard and turn tracker.

<details>
<summary><strong>Default Keyboard Shortcuts</strong></summary>

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + S` | Save constellation archive (`.cstz`) |
| `Ctrl/Cmd + F` | Search board words, notes, tables, and groups |
| `Ctrl/Cmd + Alt + V` | Toggle voice dictation (speech-to-text) |
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
- **Evaluation Criteria & Interactive Competence Picker**: Configure assessment rubrics with min/max points, intervals, point coefficients, discrete performance thresholds, qualitative grade level descriptors (e.g. `6: Excellent`), and grade accent colors (e.g. `6: #166534`). Rendered as stylized badge chips and color swatches in the table with inline multi-line editing (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>) and clean export support across HTML, Markdown, PDF, CSV, and XLSX. Directly link criteria to curriculum standards using the built-in Competence Picker modal with live domain, level, and year filters.
- **Criteria ↔ Competence Linkage Conduit (`[LINKS]` Button)**: Every evaluation criterion features a dedicated `[LINKS]` action button summoning the Universal Link & Tag Modal (`TagLinkModal`). Linking an evaluation criterion to competence standards (`cmt:criterion:...` ↔ `cmt:competence:...`) creates an automatic scoring conduit across tools, automatically mapping criteria evaluations in Grade Sheet to curriculum standard masteries in [Competence Portfolio](#competence-portfoliohtml).
- **Universal Entity Linking & Tagging across all 15 Databases**: Full cross-linking and tagging support across all 15 database types (Word Banks, Quotes, Dictations, Grammar, Gap Fill, Error Banks, Sentences, Stories, Quizzes, Competences, Phases, Criteria, Scales, Personalised Chips):
  - **File Links & Tags**: Dedicated toolbar button (`[FILE LINKS: N | TAGS: M]`) to link entire database files to external documents, lesson plans, planner slots, board sessions, and student groups.
  - **Record-Level Links & Tags**: Direct `[LINKS]` button on every data row in Table View and chip in Chips View, in the right-click row context menu (`Tags & Connected Items`), and inside the Edit Record Inspector modal. Connects individual records to students, classes, or other database entries with automatic human-readable resolution (showing student names and class titles instead of raw UUIDs). Deep-link navigation via URL parameters (`?type=...&file=...&record=...`) directly focuses, highlights, and inspects the target record.
- **Cross-Suite Word Reverse Lookup (`[USAGE]` Button)**: Every vocabulary row includes a `[USAGE]` button opening a Neobrutalist reverse-lookup modal. Automatically scans all saved constellation mindmaps in `user/mindmaps/`, exams in `user/tests/`, and lesson plans in `user/lesson-plans/` to identify every occurrence of the term, with one-click navigation to jump directly to the target board node, test exercise, or lesson plan.
- **Grading Scale Models**: Define scale conversion models (e.g. Swiss 1–6, French 0–20, Percentage, Letter grades) with score thresholds (e.g. `6: 90`, `5.5: 80`) and color bands for Grade Sheet and Oral Marking. Rendered in the table as threshold badges (≥ 90%) and color swatches with full inline and modal multi-line editing.
- **Lesson Phase Templates**: Store pedagogical lesson blocks with duration, interaction patterns (Whole Class, Pair, Group, Individual), and dual teacher/student action plans for Lesson Creator.
- **Personalised Observation Chips & Custom Sections**: Create themed qualitative observation feedback chips organized into top-level **Sections** (e.g. *Good points*, *To improve*, *Action Plan*, or custom user sections) and **Categories** with customizable **Section Colors** (using the color picker or palette presets) and seamless switching between Table View and hierarchical Visual Chips View.
- **Multi-Language Schema**: Stores English, French, German, and Italian translations for word banks; active UI language automatically selects the appropriate column.
- **Multi-Selection Filter Bar Dropdowns**: All categorical filter dropdowns in the toolbar (such as Level, Part of Speech, Theme, Category, etc.) support multi-selection with custom Neobrutalist checkbox menus. Enables multi-attribute OR filtering within fields and AND filtering across fields, with live count badges, "Select All" and "Clear" quick buttons, interactive search filtering for long option lists, and full export synchronization.
- **Productivity, Batch Editing & Element Prefix/Suffix**: Deduplication (`Remove Dupes`) to clean redundant entries, batch multi-record selection and editing across Competences, Criteria, Scales, Personalised Chips, and Word Banks, dynamic **ID & Code templating** (`{n}`, `{0n}`, `{00n}`) for bulk identifier restructuring, dedicated **Prefix & Suffix** bulk utility for elements (e.g. IDs, observation chips, titles, codes, criteria names), copying/moving across files, and built-in `AI Prompt` generation tailored for LLMs.
- **Batch Autofill Across Databases**: Simultaneously scan and populate missing definitions, translations (French, German, Italian), IPA phonetic transcriptions, synonyms, antonyms, examples, and custom fields across dozens or hundreds of entries at once. Works on explicitly selected records (`S.batchSel`) or across all visible filtered rows. Features granular field selection checklists, candidate completeness scoring (intelligently selecting the richest database match for each term), overwrite policies (*Fill empty only* vs. *Overwrite all*), array merge policies (*Merge unique*, *Replace*, *Fill if empty*), and a live in-memory scan preview calculating match counts before executing atomic file saves to disk.
- **Custom Columns with Disk Persistence**: Add custom columns to any of the 15 database types (Text, Multiline, Number, Boolean, or List/Tags) with automatic persistence to disk across all loaded files (`Desktop.saveText()` / `saveFile()`) and local schema definitions so newly created or imported records inherit the fields. Includes a header column management menu (`⋮`) for auto-fitting, resetting width, and deleting custom fields.
- **Direct In-Cell Spreadsheet & Multiline Markdown Editing**: Double-click any data cell (or single-click boolean flags) to edit directly in the table with full spreadsheet keyboard navigation (`Enter` to save, `Tab` / `Shift+Tab` to advance across cells, `Escape` to cancel). Multiline text fields (`isLong`) in the Edit Record inspector feature a live **Write / Preview** toggle tab with full Markdown rendering (`**bold**`, `*italic*`, lists, headers, code, blockquotes). Changes persist immediately to disk without tearing down the DOM (`smooth-dom-sync`).
- **Draggable & Auto-Fitting Column Resizing**: Grab and drag header dividers with 60fps fluidity (without triggering column sorting), double-click dividers to auto-fit to cell content, and enjoy persistent column widths stored per database in local configuration.
- **Right-Click Quick Context Menu**: Right-click any row in Table View or chip in Chips View to summon a Neobrutalist popup menu providing **Edit** (opens full record inspector/editor), **Autofill** (cross-database search matching identical terms to automatically suggest and populate missing definitions, translations, and metadata directly onto the record with instant disk saving), **Copy to other file** (opens file destination selector with optional move), **Duplicate** (creates an instant in-place copy with updated identifiers), and **Delete** (with confirmation safeguard).
- **Multi-Format Exporting, File Name Prompt & Universal Export Modal**: Export to CSV, vector PDF, styled editable HTML table, **Interactive & Filterable HTML Explorer** (standalone offline web viewer featuring dynamic cascaded multi-column faceted filtering, live candidate counts, search, dual **Cards / Tables** view switcher with shared-title table grouping where items sharing the same title appear on separate rows of dedicated Neobrutalist tables, and interactive sorting on all table columns), GitHub-flavored Markdown (MD), Excel (XLSX), and Word (DOCX). Selecting an export format launches a column toggle picker followed by the Universal Destination Modal, allowing teachers to customize the output **File Name** before saving and select their destination: direct quick-save to the **Print Folder (`user/to-print/`)**, custom file browser location, or **Document Editor** (for HTML and Markdown, saving directly into `user/document-editor/docs/` and opening Document Editor immediately). Multiline markdown fields are rendered as formatted HTML across both HTML tables and vector PDF prints. Standard exports saved to disk trigger `showExportSuccessPopup` providing one-click **Open File**, **Open Folder**, and **Open with Document Editor** actions with clean semantic CSS classes and zero repetitive inline styles.

---

### grade-sheet.html

Grade and assessment tracking spreadsheet supporting custom evaluation criteria, scale models, and drag-and-drop test management.

#### Features
- **Class Summary, Test Sheets & Correction Time Stats**: Track student grades across test slots (T1–T8). Auto-calculate averages based on weighted coefficients or fixed percentages. In the class test view, the bottom statistics footer displays comprehensive metrics including Class Mean, Median, Std Deviation, Pass Rate, and correction duration metrics in compact unit format without spaces (e.g., `1h25m30s`, `1m30s`, `45s`), displaying both **Mean Time** on the mean row and a dedicated **Total Time** row summing correction duration across the entire class.
- **Student Modal with Real-Time Auto-Saving, Markdown Notes, Multipliers & Compact Chips**: When inspecting or grading an individual student, every modification (adjusting criterion points/sliders/notches, selecting rubric sentence chips, toggling observation chips, typing comments, editing observation section labels, or entering grade overrides) is automatically saved to storage in real-time, instantly synchronizing background test sheet rows, class statistics, and summaries. Both qualitative observation notes and criterion comment fields support live Markdown formatting with a **Write / Preview** toggle (`**bold**`, `*italic*`, lists, code, quotes). Custom observation chips feature an ultra-compact, high-density Neobrutalist styling (`padding: 2px 6px; font-size: 0.71rem;`) across both the application UI and report exports. Observation chips feature interactive multipliers (left-click increments `x2`, `x3`; right-click decrements/removes), and propagate cleanly to all report cards, exports, and printable summaries.
- **Drag & Drop Test Reordering, Duplication & Context Menu Actions**: In the **All Tests** panel:
  - **Right-Click Test Item Menu**: Right-click any test chip (`all-test-item`) in the overview to open a contextual popup menu offering quick actions: **Open test**, **Edit name / Rename**, **Edit test settings / Options**, **Duplicate / Copy test**, **Test Links & Attachments**, **Test Report (Whole Class)**, **Individual Test Reports**, **Export Test Report (HTML & Word DOCX)**, and **Delete Test**.
  - **Drag to Reorder**: Drag to the left/right edges of a chip in the same class to freely reorder tests (T1, T2, etc.).
  - **Drag onto another test**: Drag directly onto another test (center of same class test or onto a test in another class) to open the Duplicate Test modal pre-filled with source and destination tests and choose which elements (name, date, grading criteria, scale, weighting) to duplicate.
  - **Drag onto empty slot**: Drag onto an empty `+ New Test` slot (or empty row area) of any class to instantly create a new test copying the full test configuration.
- **Custom Display Names**: Displays student names according to the configured format or nicknames.
- **Reference Data Editor, Multipliers & Custom Observation Sections**: Customize evaluation criteria descriptors (`user/correction-criteria.js`) and grading scale thresholds (`user/grade-scale-models.js`). The **Test Options** modal features a dedicated **Observation Chips** tab in its top tab bar (`General Info`, `Weighting`, `Grading Scale`, `Criteria`, `Observation Chips`) to select and preview the active observation chip bank (grouped by section), quick-add new chips with section assignment (`+ Add Chip`), and configure default observation section presets for the test with 1-click **Sync with Bank**. Users can reorder both default observation sections and chip bank sections/categories directly in the modal via drag-and-drop handles (`order.svg`) and Up / Down arrow buttons. Reordered default observation sections automatically synchronize across new and existing student evaluation records upon saving. Observation chip selections persist per test/class across sessions and test duplications. In the student evaluation modal, observation sections dynamically render each section's assigned chips with color-coded accent borders, custom section colors, live drag-and-drop reordering, interactive multipliers, and full Markdown feedback notes.
- **Import Participation Grades**: One-click import prompt when provisional grades are exported from Participation Tracker.
- **Comprehensive Analytics, Granular Report Elements Customization & Inline Feedback**: Generate whole-class year/semester/test reports or individual student reports with interactive SVG charts (grade distributions, test progression timelines, quartile boxes, and performance matrix). The **Individual Student Report** selector allows selecting either an individual student or **Whole Class (All Students)** to batch-generate and export test, semester, or annual reports for every student in one cohesive document. In the Report Preview viewer, teachers have complete control over included sections via the **Elements & Options** modal (`#gs-report-btn-options`), allowing toggling:
  - **Include Competences**: Curriculum standards performance and coverage tables.
  - **Include Exercise Means**: Exercise/criteria class mean benchmarks column.
  - **Include KPI Summary Cards**: High-level metrics (Final Grade, Points Scored, Class Benchmark, Quartiles).
  - **Include Charts & Visualizations**: Benchmark gauges, difficulty progression timelines, and distribution histograms.
  - **Include Criteria Breakdown**: Exercise point totals and weightings.
  - **Include Criteria Comments**: Individual qualitative criterion notes.
  - **Include Observations & Feedback**: Qualitative feedback where tags/chips and teacher markdown notes flow seamlessly inline without intrusive box borders or line breaks.
  - **Include Grading Scale**: Full grade threshold scale conversion table.
  - **Fit to 1 page**: Auto-scaling script dynamically fitting each student report cleanly onto a single sheet.
- **Correction Criteria Reference**: View evaluation rubrics with grade descriptors and point values in a dedicated window with an **Export** button offering direct saving to the `to-print` folder or custom file picker selection, or export directly to PDF, Markdown, or HTML. Personalised test-only criteria automatically render point-based rows (e.g., 0, 1, 2, 3 for a 3-point exercise).
- **Multi-Format Localized Exports & General Config Integration**: Export grade reports to Excel (`.xlsx`), CSV, Word (`.docx`), standalone HTML with resizable/draggable columns, and vector PDF / Print sheets respecting global page size, orientation, and margin settings from [General Config](#general-confightml). Full multilingual i18n support across English, French, German, and Italian with universal export completion dialogs offering **Open File**, **Open Folder**, and **Open with Document Editor** (for HTML).

---

### competence-portfolio.html

Centralized curriculum tracking and auditing dashboard aggregating learning standards across Planner, Lesson Creator, Board, and Grade Sheet.

#### Features
- **Coverage KPIs**: Real-time summary cards displaying Total Competences, Covered to Date (with percentage progress bar), Assessed (in Grade Sheet), Delivered (in Lesson Creator/Board sessions), Planned (in Planner), and Untouched remaining standards.
- **Criteria-to-Competence Auto-Resolution**: When scanning Grade Sheet evaluations, the portfolio engine queries `LinksService` for linked criteria (`cmt:criterion:...` ↔ `cmt:competence:...`) and automatically attributes student assessment scores to the linked standards, calculating live class achievement averages and student mastery percentages across all criteria-based tests.
- **Domain & Strand View**: Collapsible accordion grouped by curricular strands (Reading, Writing, Speaking, Listening, Grammar, Literature). Each strand displays a progress meter and detailed competence cards with status tags (`Planned`, `Delivered`, `Assessed`, `Untouched`), Level badge, Sub-Domain label, and Tags chips.
- **Audit Timeline**: Chronological event feed tracing every planned lesson, classroom activity, and evaluation date linked to specific curriculum codes.
- **Matrix Table & Multi-Field Filtering Toolbar**: Complete schema filtering with dedicated dropdowns for **Subject**, **Year Level**, **Level / CEFR / Cycle**, **Source**, **Domain**, dynamic cascading **Sub-Domain**, **Tags**, and **Status** (`All`, `Covered`, `Assessed`, `Delivered`, `Planned`, `Untouched`), plus live cross-field search and 1-click **Reset Filters**.
- **Dense Tabular Columns**: High-density matrix displaying Code, Statement, Domain, Sub-Domain, Year Level, Level, Subject, Source, Tags, Planned count, Delivered count, Assessed count, Class Mean Score (average %), and Status.
- **Activity & Assessment History Modal**: Detailed modal inspector showing complete pedagogical descriptions, structured metadata chips (Domain, Sub-Domain, Level, Year, Subject, Source, Tags), linked cross-database competences, and touchpoint provenance with direct jump links to Grade Sheet, Lesson Creator, Board, and Planner.
- **Reports & Exporting**: One-click CSV export (`Competence_Portfolio_[ClassName].csv`) with all 17 schema & tracking columns, and printer-ready PDF/paper audit reports.

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
- **Compact Outline View Mode & Dual-View Switcher**: Segmented toggle in the timeline header to switch between **Detailed View** (full editable fields for objectives, resources, teacher/student actions, and descriptor tags) and **Compact Outline View** (sleek 40px single-line bars displaying phase index, cumulative start/end pacing clock, inline title, activity and interaction mode badges, duration, and 1-click `▲` / `▼` precision reordering arrows). In Compact mode, teachers can expand individual cards in-place with `▼ More` / `▲ Less` to edit full text without leaving outline view.
- **Dedicated Lesson Outline & Reorder Modal**: Accessible via the header `Reorder…` button or *Edit / View* menus, this full-overview dialog provides a color-coded pedagogical pacing bar, cumulative timestamps (`00:00 – 00:10`), drag-and-drop reordering, 1-click placement buttons (Move to Top ⤒, Up ▲, Down ▼, Bottom ⤓), inline title/duration inputs, `Auto-Balance Durations` (scales phase durations proportionally to match target lesson time), and `Reverse Order`.
- **Dynamic Time Budget & Cumulative Pacing**: Real-time calculation of cumulative start/end timeline ranges (`00:00 – 10:00`, `10:00 – 30:00`) on every card and total planned minutes against target class duration with visual color-coded status badges.
- **Descriptor Bank & Multi-Source Subject Integration**: Slide-out drawer (`Ctrl+B`) for browsing curriculum standards across Subject, Year Level (Y7–Y13), Semester, Category, and Subcategory. Subjects are aggregated dynamically across Group Editor (including classes), Competences, Correction Criteria, and Custom DB, automatically synchronizing when selecting a class, with on-the-fly custom subject entry. Attaching descriptors to specific phases via `+ Tag` or drag-and-drop automatically registers entities and establishes bidirectional links in `LinksService` (`cmt:competence:<compCode>`), updating link counts in real time.
- **Activity Bank View Customization & Presets (`Ctrl+Shift+B`)**: Slide-out drawer for pre-built pedagogical activities with customizable view presets (*Detailed / Full*, *Compact / Summary*, and *Minimal / Mini*), in-place card expansion (`Details ▾` / `Details ▲`), an *Expand All / Collapse All* batch toggle, and a granular *Customise View* modal controlling visibility of individual fields (Title, Duration, Activity Type Pill, Interaction Mode Pill, Category Badge, Prompts & Descriptions, Tags, and Add Button) with persistent local settings. Adding an activity to a lesson via `+ Add to Lesson` or drag-and-drop automatically registers the activity and creates bidirectional links (`cmt:activity:<id>`), including links for any pre-assigned competence descriptors.
- **Floating Lesson Companion Window (`pages/lesson-companion.html`)**: Detachable, always-on-top compact desktop widget displaying cumulative lesson timings (`00:00 – 15:00`), active phase countdown timer with stopwatch controls, overtime alerts, previous/next phase steppers, and real-time live synchronization with Lesson Creator via `BroadcastChannel` and `localStorage`.
- **Unit Sequences & Curriculum Progression**: Group multiple lesson plans and assessments into a coherent named unit sequence (e.g. *Unit 3: Ecology & Biodiversity*). A prominent **Unit Sequence** status button on the main metadata panel gives 1-click access to the Sequence Manager dialog and displays active membership status (`Unit 3 (2/5)` or `None`). Manage sequence membership, filter by item type (*All*, *Lessons*, *Tests*), browse and open existing saved sequences directly from a selector in the Sequence Manager modal, jump instantly to any lesson or test with row-level **Open** buttons, add saved plans/tests, create new end-of-unit tests with 1 click (`+ Create Test for this Unit`), reorder items with Up/Down steppers, and auto-propagate updated sequence ordering and total counts to all sibling plan files and `user/lesson-sequences.json`. The persistent top **Sequence Bar** provides immediate *Prev / Next* navigation between linked items with automatic in-place plan saving and duplicate prevention before switching.
- **In-Place Update & Duplicate Prevention**: Loading an existing lesson plan by ID, filename, or linked timetable slot safely preserves its persistent UUID and internal file paths. Saving updates the existing record in-place, cleans up previous filenames upon title or date renaming, and avoids duplicate file proliferation.
- **Entire Unit Sequence Export**: Export whole teaching units with all lessons and tests in one operation via the Sequence Manager or top Export menu (**Export Entire Unit Sequence…**). Supports **HTML Booklet** (interactive multi-page document with Table of Contents, full lesson phases, vocabulary summaries, and attached test exercises), printable **PDF**, combined **Markdown (.md)** for Document Editor, and portable **JSON Archive bundle**. Features **4 CSS and Visual Layout Themes** (**Light Neobrutalist**, **Classic Academic**, **Modern & Simple**, and **Horizontal A4 Tables** in full landscape orientation), customizable Table of Contents competence displays (Dedicated Column, Under Title Sub-row, Summary Matrix, Column + Matrix, or None), automatic omission of blank teacher/student action boxes, and configurable export detail for attached test correction criteria and curriculum competences (**Compact / Summary**, **Detailed / Full Cards**, or **None**).
- **Coverage Matrix Audit (`Ctrl+M`)**: Comprehensive matrix displaying which curriculum standards have been taught across saved lesson plans, complete with progress meters and CSV export with instant Open File and Open Folder actions.
- **Live Lesson Runner HUD in Class Management (`Ctrl+R`)**: Run lessons interactively in [Class Management](#class-managementhtml) with automatic phase countdown timers, activity cues, and sound chimes on activity completion.
- **Universal Links & Tags Modal (`[LINKS: n | TAGS: m]`)**: Universal modal linking lesson plans to planner slots, class groups, tests, boards, competences, activities, vocabulary, and custom tags with live count badges and bidirectional synchronization. Features an interactive **Universal Tag Cloud** scanning all existing tags across the application suite with real-time filtering and 1-click quick tagging.
- **Planner Timetable Slot Linking**: Assign lesson plans directly to timetable slots in Weekly Lesson Planner using the interactive modal slot picker. Displays a `[SLOT: Date]` badge in Lesson Creator and a `[LESSON PLAN]` badge on timetable cards in Planner with right-click launch options.
- **Phase ↔ Board Mindmap Linking**: Link individual lesson phases to saved Board constellation mindmaps (`user/mindmaps/`) with optional focus node. Interactive phase cards render `[BOARD: Name]` badges, and Class Management's live lesson runner HUD automatically provides 1-click launch to project the linked board when the phase is active.
- **Word & Grammar Bank Drawer Tab & Automatic Linking**: Dedicated slide-out drawer tab to browse and filter vocabulary, definitions, and grammar gap-fill prompts by theme and CEFR level (A1–C2) across `wordDb.js`, `grammar.js`, and `gapFillBank.js`. Inserting items into lesson phases via 1-click `+ Phase` or drag-and-drop automatically registers the lexical/grammar entity, establishes bidirectional links in `LinksService` (`cmt:wordbank:...`, `cmt:gapfill:...`, `cmt:grammar:...`), and updates the `[LINKS: n | TAGS: m]` badge dynamically.
- **Class Group Inheritance**: Selecting a class automatically inherits scheduled timetable period duration, subject, and year/CEFR levels.
- **Export to Board Mindmaps**: Non-destructively export or append lesson phase clusters as structured nodes directly into [Board](#boardhtml) constellation mindmaps.
- **Multi-Format Export**: Export formatted lesson plan documents to **HTML**, **DOCX**, **Markdown (.md)**, printable **PDF**, or curriculum coverage **CSV**, with destination selection (`to-print` folder or native file picker) and universal completion dialogs providing one-click **Open File**, **Open Folder**, and **Open with Document Editor** (for HTML and Markdown files).

---

### test-creator.html

Neobrutalist test and exam authoring studio for creating printable assessments, quizzes, and formal exams with 11 exercise types, database linking, automated Group A / Group B variants, Seating Plan student assignments, correction criteria rubrics, and direct synchronization with Grade Sheet and Competence Portfolio.

#### Features
- **Comprehensive Assessment Header & Multi-Source Subject Integration**: Configure test metadata including title, class group, subject, teacher name, date, allocated duration (minutes), instructions, scope/curriculum benchmarks, and allowed materials with a live total points indicator. Subjects are dynamically aggregated across Group Editor (classes and defaults), Competences, Correction Criteria, and Custom DB with automatic class synchronization and custom subject entry.
- **11 Interactive Exercise Types with Multi-Item & Bulk Creation Support**:
  - Every exercise type supports adding, duplicating, editing, reordering, and deleting **multiple individual items/questions** inside a single exercise card, along with a universal **Bulk Add** dialog to quickly batch-generate multiple blank items or paste lines of raw text.
  - **Cloze (Fill in the blanks)**: Support for multiple gapped sentences/items. Mark blanks directly using `[brackets]` with optional Word Bank chips pool and per-blank point scoring.
  - **Multiple Choice Questions (MCQ)**: Multiple question items with configurable options and radio/checkbox selectors for correct answers. Includes bulk adding and option scrambling in Group B variants.
  - **Open Question**: Multiple short/long answer questions per exercise with per-question points, configurable per-item formats (ruled writing lines, dotted guide lines, blank boxed response areas, or squared math grids), customizable line allocations (`1–25 lines`), individual answer starters / prefixes (e.g. *Because...*), length guidance notes (*1-2 sentences*), and sample answers.
  - **Composition / Essay**: Multiple writing tasks or topic choices (e.g. Option A vs Option B) with individual word count targets (`min / max`), line allocations, customizable essay writing lines (configurable line-height / spacing, line styles: `solid`, `dashed`, `dotted`, and thickness in px with clean margin layout without intrusive left borders), criteria rubrics, customizable rough work / draft areas (choice of blank box, ruled lines, dotted lines, or squared grid, space/lines allocation, placement before/after), and student proofreading checklists (full item builder with add/delete/reorder, quick presets like Argumentative or Narrative, suggestion chips, and layout options).
  - **Matching**: Multiple prompt-target pairs with automatic letter/number connectors and bulk-paste support (`Left = Right`).
  - **Sentence Transformation**: Multiple rewrite items with base sentences, clue keywords, start/end prompts, and expected solutions.
  - **Translations**: Multiple translation sentences with source sentences, line allocations, and model translations.
  - **Picture Descriptions**: Multiple image prompts featuring local file browsing, URL or data URIs, captions, writing lines, and sample answers.
  - **Table Completions**: Tabular prompt builder with row/column adding, batch row generation, and cell toggling between prompt text and student fill-in blanks.
  - **Odd One Out**: Multiple concept/word clusters with intruder selection, points per intruder, and justification keys.
  - **Reading Comprehension**: Rich passage text area paired with multiple structured comprehension sub-questions and solution keys.
- **Movable Pedagogical Section Blocks (Competences, Criteria & Grading Scale)**:
  - **Treat Sections as Flow Elements**: Competences/Curriculum Objectives, Assessment Criteria Rubrics, and Grading Scale Conversion Tables can be placed anywhere in the test question sequence (at the very beginning, between specific exercises, or at the end of the exam sheet) using the **📍 Place in Exam Flow** button or from the Edit menu and bottom action bar.
  - **Consistent Reordering & Numbering**: Section blocks can be dragged or moved with `▲`/`▼` controls like regular exercise cards without incrementing question numbering (Exercise 1, Exercise 2 remain strictly sequential).
  - **Configurable Display & Presentation**: Section cards feature in-place options (Table/Grid, Badges, Bullet List, Compact Summary, Inline Grades), descriptions toggles, and live previews linked directly to the Resource Drawer tabs.
  - **Smart Duplicate Suppression**: Placing a section block inside the exam flow automatically suppresses duplicate header box rendering in print, PDF, HTML, DOCX, and Markdown exports.
- **Points, Scoring & Weighting Engine**:
  - Granular points per question item across all exercise types with live recalculation on item creation/removal.
  - Automated dynamic test total point calculation with balanced-score highlighting.
  - Criteria rubrics with custom coefficients for open questions and essays.
  - Persistent answer keys and scoring guidelines for all questions.
- **Multi-Source Database Integration & Auto-Persistence**:
  - **Test Banks (`user/custom-data/exercises/`)**: Integrated directly into [Manage Database](#manage-databasehtml) under Assessment & Curriculum (`testbanks`). Exercises have "Save to Database" toggled off by default; checking the toggle immediately writes the exercise to the custom database with toast confirmation.
  - **Learning DB & Lesson/Unit Pulling**: Pull vocabulary decks, quotes, gap-fills, grammar sets, and sentences directly into test questions. Pull vocabulary, phase objectives, and key concepts from either an individual Lesson Plan or an **Entire Unit Sequence** (aggregating vocabulary and teaching objectives across all constituent lessons).
  - **Unit Sequence Integration & Sequence Export**: Attach tests to named Unit Sequences alongside lesson plans, navigate sibling items via the Sequence Bar, manage sequence structure in the Sequence Manager, and export the **Entire Unit Sequence** to HTML Booklet (with TOC), printable PDF, Markdown, or JSON archive bundle directly from Test Creator.
  - **Criteria Database (`correction-criteria.js`)**: Pull evaluation criteria into exercise rubrics with pre-configured scales and weightings.
  - **Competence Bank (`competence-bank.json` / `descriptors.js`)**: Tag curriculum standards and CEFR descriptors to individual exercises.
  - **Random Test Generator**: Automatically generate randomized assessments by specifying themes, difficulty levels, target exercise types, and total point budgets.
- **Group A / Group B Variants & Anti-Cheating**:
  - 1-click automatic generation of scrambled test variants (Group A and Group B) with randomized question sequences and scrambled MCQ options.
  - Synchronized solution keys generated for both Group A and Group B.
  - **Variant Assignment Modes**:
    - **Alternating Roster**: Automatically alternates Group A and Group B alphabetically down the class roster.
    - **Seating Plan Adjacency**: Reads active seating plans from [Class Plan](#class-planhtml) and ensures adjacent desks receive opposite variants.
    - **Manual Matrix**: Interactive modal with student chips to toggle individual variant assignments.
- **Grade Sheet & Competence Portfolio Synchronisation**:
  - **Grade Sheet Registration**: Export test structure directly to [Grade Sheet](#grade-sheethtml) with full sub-criteria breakdown matching the test's individual exercises and criteria.
  - **Competence Portfolio**: Synchronizes exercise curriculum tags directly with [Competence Portfolio](#competence-portfoliohtml) for standards coverage tracking.
- **Universal Destination & Completion Workflow**: Prompts for an editable **File Name** before saving, offering direct export to **Print Folder (`user/to-print/`)**, custom file picker, or straight to **Document Editor** (for HTML and Markdown tests, saving directly to `user/document-editor/docs/` and opening instantly). Standard saves display the universal completion modal with **Open File**, **Open Folder**, and **Open with Document Editor**.
- **Print Preview & Multi-Format Exports**:
  - **Dedicated A4 Print Preview**: Realistic multi-page A4 document renderer with margins, header banner, student info box, exercise containers, and clean page breaks before printing.
  - **Printable PDF**: High-resolution vector PDF export via native Electron print pipeline.
  - **Batch Student Copies**: 1-click batch generation exporting 1 pre-printed test sheet per student in the class roster, featuring their student name, ID, class, date, and assigned Group variant.
  - **Editable DOCX**: Word-compatible XML package with tables, headers, and formatted lines.
  - **Markdown & Semantic HTML**: Clean structured markup with external/embedded stylesheets (no inline style bloat).
  - **Universal Completion Modal**: Standardized dialog offering **Open File**, **Open Folder**, and **Open with Document Editor** (for HTML and Markdown files).

---

### document-editor.html

Multi-format desktop document editor and typesetting suite supporting **Typst (`.typ`)**, **Markdown (`.md`)**, and **HTML (`.html`)** with live multi-page vector preview, Monaco syntax highlighting, and native vector PDF compilation.

#### Features
- **Streamlined 4-Menu Navigation & Compact Badges**: Consolidated navigation categorized into **File** (New, Open, Open from disk, Templates, Save, Save As, Save to folder, Save All, Version History, Pin Document), **Insert & Format** (Tables, Images, Books text, Student merge fields, Page Layout & Margins), **Tools** (Lesson Handout Generator, Attach Reference Files, Mindmap Outline Converter, Class Roster Connect, Student Preview, Syntax Guide, Settings), and **Export** (PDF, Word DOCX, Batch Mailposting, Mindmap Export), with compact, lightweight Neobrutalist context badges ([CLASS], [GRADE], [FILE], [LINKS]).
- **Triple Format Switcher (`MD` / `HTML` / `TYP`)**: One-click format toggle in the navigation bar dynamically switches Monaco language grammars, toolbar actions, and compiler pipelines.
- **Typst Typesetting Engine (`.typ`)**:
  - Offline WebAssembly compilation powered by `@myriaddreamin/typst.ts` with bundled OpenType Math and Serif fonts (`NewCMMath`, `NewCM10`, `LibertinusSerif`, `DejaVuSansMono`).
  - Native mathematical formula layout (`$ ... $`), multi-column grids (`#grid(...)`), assessment rubrics (`#table(...)`), term definitions (`/ Term:`), and page setup directives (`#set page(...)`, `#set text(...)`).
  - Native vector PDF compilation directly from the Typst compiler for crisp, high-resolution printable handouts and exam papers.
- **Markdown & KaTeX (`.md`)**: Full GFM markdown support with LaTeX maths rendering (`$inline$` and `$$display$$`), checklists, and table formatting.
- **HTML & Custom CSS (`.html`)**: Semantic HTML markup with inline stylesheets, custom layout rules, and print-ready page breaks.
- **Cross-App Tagging, Linking & Curriculum Integration (Section 3.D)**:
  - **Class Group Linking (`cmt:class:<classId>`)**: Tag documents directly to class curricula. The topbar displays a bold Neobrutalist `[CLASS: 10A]` badge (or `[+ CLASS]`) with a 1-click dialog to link, change, or unlink classes, automatically syncing with class resource lists and Mailposting rosters.
  - **Generate Student Handout from Lesson Plan (`cmt:lesson:<filename>`)**: Access **Generate Student Handout…** from the Insert or File menu to browse saved lesson plans in `user/lessons/`. Configurable options extract lesson learning objectives, clean vocabulary definition tables, guided phase activities with student answer spaces, and homework/extension tasks directly into structured Markdown or semantic HTML at cursor or as a full document, establishing a bidirectional link in `LinksService`.
  - **Grade Sheet Deep-Link Quick Launcher (`cmt:grade:...`)**: When a document serves as an examination paper, answer key, or marking rubric linked to an evaluation, the topbar renders a `[GRADE SHEET: Test Name]` quick launcher to jump straight into student grading in Grade Sheet.
  - **Reference PDF & File Attachments (`cmt:file:...`)**: Header displays an `[ATTACHED PDF: Name]` / `[ATTACHED FILE: Name]` badge to open reference documents in the default system viewer while writing. Attach external files via **Attach Reference PDF / File…** in Insert and File menus.
  - **Convert Outline to Board Mindmap (`cmt:board:<filename>`)**: In Export and File menus, **Convert Outline to Mindmap…** parses document headings (`#`, `##`, `<h3>`, etc.) and list items (`-`, `*`, `1.`, `<li>`) into an interactive Neobrutalist modal selector. Teachers can customize the central topic, filter elements (Select All, Deselect All, Headings Only, or individual branches), choose between Radial/Starburst or Horizontal Tree layouts, and generate a branching Constellation session on [Board](#boardhtml) saved to `user/mindmaps/` with automatic bidirectional linking in `LinksService` and 1-click launch.
- **Live Preview-to-Code & CSS Inspector**: Click any element in the live preview (headings, paragraphs, inline formatting, tables, images, math formulas) to immediately locate and highlight its source code in Monaco, and automatically open and highlight matching stylesheet rules in the CSS Editor panel. Also pre-fills the Quick Rule selector for rapid styling.
- **Interactive Syntax & Format Guide**: Built-in modal (`Syntax` button in nav bar) featuring real-time search, topic category filters (`Setup & Page`, `Math & Formulas`, `Tables & Grids`, `Exams & Quizzes`, `Layout & Callouts`), instant `Copy` buttons, and one-click `+ Insert` snippet insertion into Monaco at cursor.
- **Mailposting Batch Generation**: Connects class rosters (`class-groups.js`) to dynamic document templates with student placeholders (`{{student.fullName}}`, `{{student.id}}`, `{{class.name}}`, `{{datetime.today}}`). Exports single merged or separate individual PDFs for each student.
- **Direct Cross-App Ingestion**: Accepts documents exported straight from other suite tools (Manage Database, Test Creator, Lesson Creator, Planner, Database Converter) via the Universal Destination Modal. Incoming files are saved directly into the teacher's document library (`user/document-editor/docs/`), registered in the document sidebar, and opened immediately with inline stylesheets extracted and live preview active.
- **Book Text Import**: Browse and extract text passages directly from `custom-data/books/` (`.epub`, `.html`, `.txt`) into active documents.
- **Presentation Mode**: Broadcasts clean, live-rendered vector SVGs or HTML previews to secondary display monitors or classroom beamers.
- **Export Options**: Export to native vector PDF, DOCX, or HTML with automatic document metadata and PDF title reflection matching the actual file title.

---

### how-to.html

Built-in comprehensive user manual and data directory reference map for the entire Class Management Tools suite.

#### Features
- **Neobrutalist Search Modal (`Ctrl+K` / `/`)**: Fast instant search modal that queries all tools, section overviews, accordion guides, and saved storage paths without disrupting or collapsing sidebar navigation.
  - Features real-time keyword scoring, category badges, context preview snippets with highlighted query terms, and full keyboard navigation (`↑`/`↓` to navigate, `Enter` to open, `Esc` to close).
  - Automatically scrolls to matching topics, expands relevant accordions, and highlights the target section with a visual pulse animation.
- **Tool-by-Tool User Manual**: Structured documentation for every tool with setup steps, feature explanations, and configuration tips.
- **Storage Location Inspector**: Interactive "Saved In" panel detailing local paths for every tool with direct **Open folder** and **Reveal folder** native desktop actions.
- **Batch Accordion Controls**: One-click **Expand all** and **Collapse all** actions with persistent sidebar synchronisation.

---

### data-location.html

*Legacy configuration page.* Storage, backup, and sync settings are now integrated directly into the **Storage & Sync tab** of [General Config](#general-confightml).

---

<p align="center">
  <strong>Class Management Tools</strong> — Built for Teachers. Offline-First & Privacy-Focused.
</p>
