# Class Management Tools — User Guide

## How to Begin

### 1. Place the app in a writable folder

Class Management Tools saves all your data (students, grades, sessions, settings) directly alongside the application files. For this to work, **the app folder must be in a location your user account can write to.**

Avoid running the app from:
- `C:\Program Files` or `C:\Program Files (x86)` — Windows blocks writes here
- A read-only network share or a ZIP archive that was never fully extracted
- A USB drive with write protection enabled

**Recommended locations:**
- `C:\Users\YourName\Class Management Tools\` (your home folder)
- `Documents\Class Management Tools\`
- The Desktop

If you downloaded a ZIP file, extract the entire folder before launching. Double-clicking inside a ZIP without extracting will prevent the app from saving any data.

> **How to tell if the folder is writable:** Open the app and go to **General Config → Data Location**. If a path is shown and no error appears, the app can write there. If you see a warning or the path is empty, move the folder to a writable location and relaunch.

---

### 2. First launch checklist

1. **Open the Launcher** — double-click `Class Management Tools.exe` (or run the `.bat` file on unpackaged builds). The Launcher is the home screen for all tools.
2. **Set your language** — click **General Config** (⚙ gear icon) and pick your language (English, French, German, or Italian). Changes take effect immediately across all tools.
3. **Create your classes** — open **Group Editor** and add your class groups and students. This step is required before most other tools are useful, since they all read their student and class data from Group Editor.
4. **Explore the tools** — return to the Launcher and open any tool. Each tool has a built-in **?** help button in its navigation bar.

---

## Overview

| File | Purpose |
|---|---|
| `launcher.html` | Home screen — one-click access to all tools, startup app configuration, and per-card notes |
| `class-management.html` | Classroom session manager — students, teams, timer, scoring, and settings |
| `board.html` | Visual tools — Board, session History, and vocabulary Search |
| `learning-tools.html` | Student-facing vocabulary and grammar games with team scoring |
| `manage-database.html` | Vocabulary database browser, editor, and bulk-management tool |
| `grade-sheet.html` | Test and grade tracking per class, term, and criterion |
| `participation-tracker.html` | Participation analytics dashboard sourced from Class Management sessions |
| `group-editor.html` | Create, edit, archive, and delete class groups; set the active year and term shared by all tools |
| `import-tool.html` | Bulk-import students and class groups from CSV, XLSX, or JSON with automatic column mapping and conflict resolution |
| `planner.html` | Week-by-week lesson and assessment planner with ICS, PDF, CSV, and Markdown export |
| `class-plan.html` | Design and manage seating plans with grid, U-shape, and pod desk layouts |
| `schedule-maker.html` | Plan oral exam sessions with concurrent prep/exam timing and SEN accommodations |
| `oral-marking.html` | Run live oral exam sessions: per-student prep/exam timers, criteria scoring, notes, and a live presenter view broadcasted to a second screen |
| `general-config.html` | App title, language, startup layout, data folder, backup, and sync settings |
| `file-manager.html` | Browse, rename, and sync data files; navigate folders; manage the sync location |
| `document-editor.html` | Document Editor — Markdown + LaTeX (KaTeX) editor with dual preview, custom CSS stylesheets, templates, and PDF export |
| `data-location.html` | Legacy data-folder configuration page (superseded by General Config) |

All tools run as standalone HTML files in a browser or via Electron (desktop builds available through the `.bat` launcher scripts).

---

## Cross-App Connections

The tools share data files and communicate in real time. Setting something up once propagates automatically — no duplication needed.

### Shared class data: `class-groups.js`

**Group Editor** is the single source of truth for all class and student data. Every other tool reads from the same `class-groups.js` file at startup — no import or copy required.

| Tool | What it reads from `class-groups.js` |
|---|---|
| Class Management | Student roster and group list |
| Participation Tracker | Groups for session filtering and the *This Term* date range |
| Grade Sheet | Student list per class |
| Planner | Class list for the weekly schedule |
| Learning Tools | Groups for Team Mode |
| Schedule Maker | Students and SEN flags per group |
| Class Plan | Student lists for seat assignment |

**Recommended first step:** Create your classes in Group Editor before opening any other tool.

> **Built-in tutorial:** Click the **?** button in the top navigation bar of Group Editor to launch an interactive step-by-step tour of its main features.

#### Live cross-app notifications

When any tool saves shared data (groups, student names, class config, planner or class-plan data), all other open tool windows are notified instantly. A slide-in banner appears at the top of each affected window:

> **"[Tool name] updated shared data."** → **Reload data** | **Save & reload** | **Dismiss**

- **Reload data** — refreshes the data in that window without a full page reload where possible (Group Editor, Class Plan, Planner), or reloads the page for tools with active sessions (Participation Tracker, Board, Grade Sheet).
- **Save & reload** — appears only on pages with potentially unsaved work (Grade Sheet). Saves first, then reloads.
- **Dismiss** — hides the banner; the window keeps its current data until manually reloaded.

The banner auto-dismisses after 30 seconds if no action is taken.

#### Renaming a class

Edit the class name directly in Group Editor and click **Save**. The new name propagates automatically to every tool on their next load — Grade Sheet, Participation Tracker, Planner, Class Plan, Schedule Maker, and Class Management all read the updated name from `class-groups.js`.

Class identity is tracked by a stable internal ID, not the name, so renaming never breaks historical data. Participation sessions, grade files, and planner entries are all linked by ID and continue to display under the new name after the rename.

### Term date sync: Group Editor ↔ Planner

Group Editor's **Active Context** holds the current year, term (S1/S2), and start/end dates. These dates power Participation Tracker's *This Term* filter and the end-of-term archive prompt.

If you also use the Planner, avoid entering dates twice. You have two options:

**Option A — Create terms in Group Editor:**
1. In **Group Editor**, find the **Planner Terms** section (below Active Context).
2. Click **+ New Term**, fill in the label, start date, end date, and any holidays.
3. Click **Save to Planner** — the term is written to `planner-config.js` immediately.
4. To edit or delete an existing term, click **Edit** next to it in the list.

**Option B — Pull from Planner into Group Editor:**
1. Create a term in **Planner** with its start and end dates.
2. In **Group Editor → Active Context**, click **↕ Planner** to fill the dates in one click.

The *Add Term* modal in Planner also offers a blue hint to auto-fill dates from the Group Editor active context — so the link works in both directions.

### Planner → Grade Sheet: automatic test linking

When you add a **Test** entry in the Planner, it checks for a Grade Sheet class with the same name. If a free test slot exists, the test is registered there automatically — a green badge in the Planner confirms the link.

### Board ↔ Planner: lesson tagging

Board sessions can be tagged to a specific Planner lesson, test, or assignment entry so every constellation map is linked to the class and date it was used.

- A **Planner** button in the Board toolbar opens a popover listing upcoming and recent Planner entries for all classes. By default only entries within roughly 30 days are shown; click **Show all** to see the full list.
- Click an entry to tag the current board session to it. The tag is stored with every manual save and autosave so it persists when the session is reloaded.
- When you load a previously saved session its planner tag is restored automatically, keeping the link intact.
- The `_plannerEntryId` field in saved `.js` constellation files holds the reference.

### Class Management ↔ Board: live sync

- The **timer** started in Class Management appears as a floating overlay on Board automatically.
- When **Presentation Mode** is open in Class Management, group updates and activity state broadcast to the Board window in real time via a background channel — no manual action required.

### File Manager → Board: reopen saved sessions

The File Manager's **Recent** tab shows an **Open in Board** button on every constellation map row — click it to reopen the map directly in Board without going through the launcher.

### Class Plan ↔ Class Management: shared seating plans

Plans are written to `user/config.js` on every save, so they are always available in both tools. Plans created in either tool are imported by the other on startup.

### Presentation windows

Four tools support a detached second window for projection on a second monitor:

| Tool | How to open | What is projected |
|---|---|---|
| **Board** | Toolbar → 📽️ Presentation Mode | Live canvas; supports a mouse-pointer dot and a Freeze toggle |
| **Class Management** | Top menu → Presentation | Roster with roles, badges, and animated effects; can be frozen independently |
| **Learning Tools** | Individual game → Presentation icon | Game view on a student-facing display; teacher controls stay on the main screen |
| **Document Editor** | Export ▾ → Presentation Mode | Live document preview on a dark background; updates with every keystroke |

---

## launcher.html

The home screen of the app. Opens automatically on startup and provides one-click access to every tool.

### App Cards

Each tool is represented by a card showing its name, description, and a launch button. Cards are laid out in a grid and can be individually customised:

- **⚙ Card settings** (gear icon on hover): set a **custom label**, **personal notes**, a display **size (%)**, and a **position** on screen (default, centre, corners, or full-height sides).
- Clicking a card opens the corresponding tool; the launcher stays open in the background.

The **File Manager** card opens a standalone tool window with three tabs: Recent, Browse, and Sync.

### Sidebar Panel

The launcher has a collapsible right-side panel with three sections:

- **Upcoming Events** — pulls entries from the Planner (lessons, tests, assignments) with dates on or after today, sorted by date. Click an entry to open the Planner.
- **To-do** — shows incomplete to-do items from the Planner, sorted by due date. Overdue items are highlighted. Click an item to open the Planner.
- **Recent Docs** — shows the most recently modified constellation maps (Board sessions) and Document Editor files, sorted by date. Click an entry to open it directly in Board or Document Editor.

Click the **Panel** button in the header to show or hide the sidebar. Each section has a small count button (e.g. **5**) in its header — click it to change how many items are shown (1–20). Counts are saved per-device.

### Header Buttons

| Button | Action |
|---|---|
| **⚙ Config** | Opens General Config (language, startup, data folder) |
| **⌨** | Opens the keyboard shortcuts reference for the Launcher |
| **? How To** | Opens the built-in how-to guide |
| **▶ Tour** | Starts an interactive step-by-step tour of the launcher, including the sidebar sections |
| **ℹ️ Credits** | Opens the credits modal |
| **Panel** | Toggles the sidebar panel (Upcoming Events, To-do, Recent Docs) |

### Startup Behaviour

The launcher can automatically open tools at startup. Configure this in **General Config → Startup & Launch**:

- **Separate windows** — open each selected app in its own window.
- **Maximised** — open selected apps maximised.
- **Split screen** — open two apps side by side; drag the divider to set the split ratio.

The launcher renders first, then the configured apps open silently in the background.

---

## general-config.html

Centralised settings page for app-wide configuration. Opened from the launcher via **⚙ Config**.

### App Identity

Set a custom **app title** (displayed in the header of all tool windows).

### Language

Choose the UI language: **EN · FR · DE · IT**. The selection applies to all tools and is stored in `localStorage` under `cmt-general-config.language`.

### Startup & Launch

Choose which apps open automatically when the launcher starts, and how they are arranged:

| Layout | Behaviour |
|---|---|
| Separate windows | Each selected app opens in its own resizable window |
| Maximised | Selected apps open full-screen |
| Split screen | Two apps open side by side; choose left/right apps and the split percentage |

### Data & Storage

Mirrors the data-folder, backup, and sync controls previously found in `data-location.html`:

- **Data folder** — current path displayed; **Change folder**, **Reset to default**, and **Check for Updates** buttons.
- **First Launch banner** — detects a missing data folder and offers **Select Existing Folder** or **Start Fresh**.
- **Migration** — when the folder is changed, a banner offers to copy files from the old location.
- **Backup** — choose a backup folder and trigger a manual backup.
- **Sync** — set a sync target; **Sync Now** opens conflict resolution; **Keep target up to date automatically** enables auto-sync.

---

## group-editor.html

Manages the class groups stored in `class-groups.js`. Opened from the launcher or from within Class Management. Groups created here are shared by every other tool — Class Management, Participation Tracker, Grade Sheet, and Learning Tools all read from the same file.

### Active Context

The **Active Context** banner at the top sets the default year, term, and date range used by every tool.

- **Year** — school year in `YYYY-YYYY` format (e.g. `2025-2026`).
- **Term** — S1 or S2; controls which section groups appear in and powers the end-of-term archive prompt.
- **Start / End dates** — term dates used by Participation Tracker's *This Term* filter and by the end-of-term banner.
- **↕ Planner** — click to fill the active-context dates from a configured Planner term. If the Planner has one term, it applies immediately; if it has several, a picker appears.

**Planner Terms** (section below Active Context, desktop app only): create, edit, and delete Planner semester entries without opening the Planner. The inline form pre-fills from the Active Context. Each term can include holidays (with optional end dates). Overlapping-date conflicts prompt a confirmation before saving.

Click **💾 Save** to persist the active context to `class-groups.js`.

### Managing Groups

- **Active Groups** — groups are displayed in collapsible S1 / S2 sections, then a *No term* section at the bottom. Edit name, year, level, and student list inline.
- **Add New Group** — fill the name, term (required), year, and level fields, then click **Add**. The term field is mandatory — a group must belong to S1 or S2.
- **Import CSV** — import groups from a CSV file. Columns: Group, First Name, Last Name, Date of Birth, Admin Class, Year, Term, Level, SEN.
- **SEN flag** — each student row has a SEN checkbox. SEN students receive the longer preparation time in Schedule Maker by default.

### Student Roster & UUIDs

Student data is stored in a dedicated file `user/students.js` (`STUDENTS_ROSTER` array) separate from `class-groups.js`. Each student and each class group is identified by a stable UUID (`st-…` for students, a random UUID for groups) so renaming never breaks historical links.

- Groups in `class-groups.js` are keyed by UUID, with a `name` field in the metadata object rather than as the map key.
- Students are referenced inside groups as arrays of UUID strings, with their full record (first name, last name, date of birth, admin class, SEN flag) living in `students.js`.
- **One-time migration**: on first launch after upgrading, the app automatically rewrites `class-groups.js`, `planner-config.js`, planner entry files, class-plan data, and participation session files to use UUIDs. The migration is idempotent — running it again on already-migrated data is safe.

### Archiving

Archiving hides groups from all rosters without deleting their data. Participation files are moved to an `archived/` sub-folder and can be restored at any time.

- **Archive a single group** — click the Archive button on the group row.
- **Archive a whole term** — click **Archive S1** or **Archive S2** in the section header.
- **End-of-term offer** — when the active term end date has passed, a yellow banner appears at the top offering to archive the whole term in one click. Dismissing it stores a flag in localStorage so the prompt does not re-appear.
- **Unarchive** — scroll to the *Archived Groups* section and click **Unarchive** on any row.

### Keyboard Shortcuts

No keyboard shortcuts yet.

---

## import-tool.html

Wizard for bulk-importing structured data (students, vocabulary, quizzes…) from CSV, XLSX, or JSON, as well as copying binary files (audio, documents) into their managed folders. Accessible from the Launcher (📥 Import card) or via **📥 Import** in the Class Management settings popup.

### Supported destination types

**Structured data (CSV / XLSX / JSON mapping wizard):** Students, Class Groups, Wordbank, Quiz, Gap-Fill, Quotes, Error Correction, Dictation, Grammar, Sentences, Story.

**File-copy (OS file picker, no CSV step):** Sounds, Documents.

### Supported formats for structured imports

| Format | Notes |
|---|---|
| CSV | First row = column headers. Any standard separator. |
| XLSX / XLS | First sheet only. First row = column headers. Native Excel dates handled correctly. |
| JSON | Array of objects: `[{"firstName":"…","lastName":"…"},…]`. Object keys are treated as column names. |

### Wizard steps (structured data)

1. **Destination** — choose a destination. Step 1 also shows group or file-picker sub-options where relevant.
2. **File** — drag-and-drop or browse. Supported: `.csv`, `.xlsx`, `.xls`, `.json`. A raw preview of the first five rows is shown immediately.
3. **Column mapping** — each destination field gets a dropdown. Common header names in EN, FR, DE, and IT are auto-detected (green border = matched). Optional fields can be skipped.
4. **Preview & conflicts** — all rows are listed. Conflicting rows are highlighted with per-row resolution choices: **Skip**, **Overwrite**, or **Import as new**. Bulk actions apply the same decision to all conflicts.
5. **Done** — summary of records added / updated / skipped.

### File-copy destinations (Sounds & Documents)

Selecting **Sounds** or **Documents** in Step 1 changes the **Next** button to **Pick Files…**. Clicking it opens an OS file picker (multi-select):

- **Sounds** — audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`) are copied into `user/custom-data/sounds`. Open Class Management afterwards to refresh and use them.
- **Documents** — document files (`.html`, `.md`, `.txt`) are copied into the Document Editor's docs folder (`user/document-editor/docs`). Open Document Editor to edit them.

The Done screen shows how many files were copied.

### Class Groups destination

When *Class Groups* is selected, Step 1 expands a group-assignment panel:

- **Create new group** — enter a name, year, semester, and optional level. Year and semester pre-fill from the current active context.
- **Use existing group** — pick from the list of active groups. Imported students are appended; existing members are not duplicated.

Students who do not already exist in `students.js` are created automatically — no separate student import needed.

### Extensibility

Each destination is a self-contained descriptor in `js/import-modules/`. To add a structured destination, create a file there with `id`, `i18nKey`, `hasGroupStep`, `fields[]`, and `conflictKey()`. For a file-copy destination, set `isFileCopy: true` with `target`, `copySubdir`, and `copyFilters`. Register it in the `MODULES` array at the top of `pages/import-tool.html`.

---

## planner.html

Week-by-week planning tool for lessons, tests, assignments, and holidays. Data is saved to `user/planner-config.js` (term configuration) and `user/planner-entries.js` (entries).

### Terms

- Click **+ Term** to create a new term. Enter a label, start date, and end date.
- When Group Editor has active-context dates set, a blue hint in the *Add Term* modal offers to auto-fill the dates from Group Editor in one click.
- Add **Holidays** within a term (school breaks, bank holidays). Entries on holiday days are flagged in the week view.
- Use the term selector in the toolbar to switch between terms. Multiple terms can co-exist (e.g. S1 and S2).

### Classes

- Click **Classes** in the toolbar to configure which class groups are tracked in the Planner.
- Each class gets a **colour** for the week view, is assigned to **Term 1**, **Term 2**, or both, and can have a **weekly schedule** (which days and times it meets) and **learning objectives** for the term.
- The class list is drawn from `class-groups.js` — add groups in Group Editor first.

### Entries

Each entry has a type (Lesson, Test, Assignment Due, Holiday, or custom) and belongs to a class and date. Optional fields: Topic, Objective, Readings, Activities, Homework, Notes.

- **Test entries linked to Grade Sheet** — if a Grade Sheet class with the same name exists and has a free test slot, the test is automatically recorded there.
- **Duplicate** — copy an entry to another date.

### Reminders

Each entry can have a **start reminder** (fires N minutes before the entry starts) and an **end reminder** (fires N minutes before the entry ends). Lesson entries automatically get a 5-minute end reminder — this can be disabled in **Display ▾ → Auto end reminder**.

Reminders appear as toast notifications in every open app window and dismiss across all windows simultaneously after 5 minutes or on manual close.

### To-do list

A collapsible **To-do** panel sits on the right side of the planner. Click the **To-do** tab to open it.

- **Add / edit** to-dos with a task description, optional due date, class tag, fixed date/time reminder, and links to a planner entry, a board constellation map, or a grade-sheet class.
- **Complete** — click the checkbox to archive a to-do. Toggle **Show done** to see archived items.
- **Overdue** items are highlighted in red.
- To-dos are saved to `user/todos.js` and also appear in the Launcher sidebar.

### Export

| Format | Description |
|---|---|
| **ICS** | Calendar file for Google Calendar, Apple Calendar, or Outlook. Filter by class. |
| **PDF** | Print-ready week view for the selected term. |
| **CSV** | Spreadsheet of all entries with full field data. |
| **Markdown** | Structured text document for notes apps or plain-text sharing. |

### Keyboard Shortcuts

No keyboard shortcuts yet.

---

## class-plan.html

Standalone seating-plan designer. Plans are saved as `user/class-plans/plans.js` and synced to `user/config.js` so **Class Management** can read the same data.

### Layout types

| Layout | Description | Configuration |
|---|---|---|
| **Grid** | Standard rows × columns grid of desks | Rows (1–12), Columns (1–14) |
| **U-Shape** | One top row + two side arms forming a U | Width (top row count), Depth (arm length) |
| **Pods** | Clusters of desks arranged in a room grid | Pod size (rows × cols), Room layout (pods rows × pods cols) |

### Workflow

1. Select a class group from the sidebar.
2. Click **+ New Plan**, choose a layout type, and set dimensions.
3. Drag students from the panel onto desk cells to assign seats.
4. Drag from desk to desk to swap students; click **✕** to unassign.
5. Use **🎲 Random** to shuffle all students automatically.
6. Changes auto-save; use **Save** for an immediate write.
7. Use **🖨 Print** to produce a printable A4 seating chart.

### Sharing with Class Management

Plans created here are visible in `class-management.html`'s Class Plans manager after the next load. Plans created in Class Management are imported when Class Plan starts.

---

## schedule-maker.html

Plans oral exam sessions where one student prepares while another presents, accounting for SEN accommodation time and breaks.

### Configuration
| Field | Purpose |
|---|---|
| Exam title | Free-text label printed on the schedule |
| Date / Start time | Session start |
| Class / group | Load students from `class-groups.js` |
| Prep time – standard | Preparation room time for regular students (min) |
| Prep time – SEN | Preparation room time for SEN students (min) |
| Exam time | Duration of each student's presentation (min) |
| Number of breaks | How many breaks to auto-place when clicking Apply |
| Break duration | Duration of each break (min) |
| Initial order | Random, alphabetical, or keep current manual order |

### Timing model
- **First student in each segment** (start or after a break): pure prep time, then exam. No one presents while they prepare.
- **Subsequent students**: enter the prep room as the previous student enters the exam room. Their exam starts as soon as the previous student's exam ends (or when prep is done if prep time > exam time, creating a brief examiner wait).
- **Last student before a break / at the end**: presents with no one preparing behind them.

### Workflow
1. Fill in the configuration and click **Apply** — students are loaded and breaks auto-placed.
2. Drag student rows and break markers to adjust order.
3. Toggle the SEN checkbox per student to override the class-groups.js default for this session.
4. The schedule table updates live.
5. Click **Print** for a print-friendly view or **Save** to save the session for later recall.

---

## oral-marking.html

Runs live oral exam sessions using a schedule from Schedule Maker. Tracks per-student prep and exam timers, collects criteria scores and comments, and saves results directly to Grade Sheet.

### Setup
1. Open **Oral Marking** from the launcher.
2. Click **Load Schedule** and select a saved Schedule Maker session.
3. The student roster, group name, and exam configuration are loaded automatically.
4. Click **Present** to open the live presenter window on a second screen.

### Session flow
| Phase | Description |
|---|---|
| **Prep** | Countdown for the current student's preparation time (SEN students get the longer prep time). |
| **Exam** | Countdown for the student's presentation. The **Finish Exam** button stops the timer early and records the actual duration. |
| **Between students** | Timer pauses. Use **Next Student** to advance, or click a name in the sidebar to jump. |

The **Skip** button marks a student as skipped and moves on without recording a grade.

### Criteria scoring
Criteria are loaded from `correction-criteria.js` (the same file used by Grade Sheet). For each criterion:
- Click a **score pill** to assign a grade (6 / 5.5 / … / 1).
- Type a **comment** below the pills for that criterion.
- The **Overall grade** row shows the auto-computed average; click any pill to override it manually.

A **Personal notes** field at the bottom is saved with the student's result.

### 2-minute warning
When fewer than 2 minutes remain in the exam phase, the timer bar flashes red and the presenter window background flashes dark red.

### Presenter view
The presenter window (opened via **Present**) shows the student's name, current phase, time remaining, and elapsed time in large text for a second display. It receives updates via `BroadcastChannel` — no network required.

### Saving grades
Click **Save Grades** after all students are done. The tool:
1. Looks for an existing Grade Sheet class whose `groupId` matches the schedule's group.
2. If found, appends a new oral-exam test to the next empty slot for that semester.
3. If not found, creates a new class using students from `class-groups.js`.

Results appear immediately in `grade-sheet.html` on the next load.

### Crash recovery
The session is auto-saved to `localStorage` (`cmt-oral-session`) each time a student finishes. If the app closes mid-session, reopening Oral Marking restores the last saved state automatically.

---

## file-manager.html

Browse, rename, and sync data files. Opens as a standalone tool window from the launcher.

### Recent tab
- **Search / filter / sort** — filter by filename, type (constellation, PDF, image, sound, book), and sort order.
- **Open in Board** — reopen any constellation map directly in the Board tool.
- **Rename** — inline rename any session file; edit the name in place and press Enter to save.

### Browse tab
- **Target selector** — switch between Constellation Maps, User Data, Custom Data, Grades, Grade Sheets, or Participation logs.
- **Folder navigation** — click into subdirectories; breadcrumb trail shows your current path.
- **Search** — filter filenames at the current folder level.
- **Rename** — inline rename any file; the change is written to disk immediately.

### Sync tab
- **Sync location** — shows the configured sync folder (set in General Config or directly here).
- **Choose Folder / Sync Now** — pick a sync folder and run an immediate sync.
- **Auto-sync** — keep the sync folder up to date automatically on every save.
- **Conflict resolution** — when both sides differ, choose per file: keep mine, keep sync, or skip.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Enter | Confirm inline rename |
| Escape | Cancel inline rename |

---

## class-management.html

The main classroom control panel. Open at the start of every lesson to manage the roster, run timers, assign teams, and record participation.

### Timer

A countdown or stopwatch displayed as a full-screen overlay.

- Set duration in hours and minutes.
- **Class Mode** shortcuts: 🤫 Quiet Work · 💬 Conversation · 👥 Group Work (also mapped to keys **1 / 2 / 3**).
- **Ambient sound**: white noise, pink noise, brown noise, or a custom MP3 file that loops softly while the timer runs.
- Configurable end-of-timer beeps (1–20), drumroll lead-up, and gavel/alarm sound.
- A progress bar shrinks as time elapses; the overlay collapses when the timer reaches zero.

### Roster

The main panel shows every student in the active class.

- Click a name to award a participation mark (**+**) or deduct (**−**) with configurable coefficients.
- Right-click a name for the context menu: mark **Absent**, **Flag**, **Add Role**, **View Stats**, **View Grades**.
- **Multi-select** (Shift+click or checkboxes) lets you bulk-apply actions — create teams, assign roles, flag a group.
- Inline indicators show badges, strikes, and cumulative points for each student.
- Name size can be adjusted with **−/+** controls so the roster fits any screen.

### Teams & Roles

- **Create Teams**: split the roster into N teams, or into groups of N students. Teams are colour-coded.
- **Reshuffle / Clear** teams at any time.
- **Random Picker**: drumroll animation selects a random student or team, finishing with a gavel sound.
- **Roles**: assign custom role titles (Speaker, Reporter, etc.) to individuals or by random rank; students can read their role description on the Presentation window.

### Scoring & Badges

- Participation marks feed a live ranking (Results & Ranking modal shows medals and a "performance of the day" highlight).
- Custom **badges** (positive or negative tone) can be awarded alongside marks.
- **Autoflag**: automatically highlights low-participation students based on a configurable bottom-percentage threshold.

### Presentation Mode

Opens a second window intended for a projector or secondary screen.

- Displays the roster with optional overlays: roles, badges, autoflag indicators, and animated effects.
- **Freeze** the presentation to pause live updates while you make changes on the control panel.
- Minimize, dock, or maximize the window independently.

### Time Machine & Session History

- The app **autosaves** a snapshot every 20 seconds to localStorage.
- **Time Machine** lets you scroll back through snapshots and restore any previous state.
- **Session History** shows an activity log for the current lesson.
- Export the database as a `.zip` backup or import a previous backup to restore all data.

### Settings

Accessed from the top-right ⚙ menu:

| Setting | What it controls |
|---|---|
| **Edit Groups** | Add/rename classes; each group has a name, year, term, and level |
| **Edit Teams** | Customise team names and colours (palette of 10+ colours) |
| **Edit Badges** | Define badge icons, names, tone, and meaning |
| **Edit Sounds** | Pick audio files or built-in sounds for every event slot (timer end, ambient, drumroll, gavel, score sounds); each slot has a 0–100 volume slider. Use **⊕ Import Audio Files** to copy audio files directly from disk into the sounds folder, then **↻ Refresh** to make them available |
| **Edit Roles** | Manage role titles and descriptions |
| **Edit Autoflag** | Bottom-% threshold, elements to count, and timeline |
| **Class Plan** | Seating layout and weekly schedule |
| **App Title** | Custom teacher or school name shown in the header |
| **Startup Window** | Which tool opens automatically at launch |

### Phone Remote

Lets any phone or tablet control student scoring and badges from a browser — no app install required.

Open the **📱 Phone Remote** panel from the top menu. Two connection modes are available:

#### Local network mode (same WiFi)

1. Select **Local network** and leave the port at the default (8787).
2. Click **▶ Start Remote Server** — the app starts a combined classroom server on your machine.
3. A URL, QR code, and 6-character token appear. Project or share them so phones can connect.
4. Students open the URL in any phone browser, enter the token, and can immediately award or remove points and badges.

> **Windows firewall:** the first time you run the local server, Windows may block port 8787. Follow the PowerShell command shown in the panel to add a firewall rule.

#### External server mode (internet, any network)

1. Deploy `js/classroom-server.js` to any Node.js hosting service (Railway, Render, Fly.io, or a VPS). The file is self-contained; the only dependency is `ws`.
2. Select **External server** in the panel, enter your server's URL, and set a **host secret** — a password of your choice that prevents another host from taking over your relay.
3. Click **▶ Start Remote Server** — the app connects to your hosted relay.
4. Share the URL shown (e.g. `https://your-server.com/?t=ABCDEF`) — students can connect from any network.

The host secret and mode are saved in `user/remote-config.js` so you only need to set them once. The **same Local/External toggle appears in the Multiplayer Quiz panel (Learning Tools) and the Student Input Note popup (Board)** — they all read and write the same config, so switching mode in any one of them applies everywhere.

### Presentation Mode

Opens a second window intended for a projector or secondary screen.

- Displays the roster with optional overlays: roles, badges, autoflag indicators, and animated effects.
- **Freeze** the presentation to pause live updates while you make changes on the control panel.
- Minimize, dock, or maximize the window independently.
- When the Board is also open, timer events and group-activity updates broadcast to it in real time.

### Navigation

The **Links** popup (top menu) gives one-click access to every other tool: Board, Learning Tools, Grade Sheet, Participation Tracker, Database Manager, and Data Location.

A language switcher supports **EN · FR · DE · IT**.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Space | Pick a random student |
| Ctrl+Shift+K | Open Team Maker |
| Ctrl+M | Open Class Mode picker |
| 1 / 2 / 3 (mode/timer open) | Switch mode — Quiet / Talk / Group |
| W (mode/timer open) | Toggle white noise on / off |
| M (mode/timer open) | Mute / unmute white noise |
| [ / ] (mode/timer open) | Decrease / increase white noise volume |

---

## board.html

A companion tool focused on vocabulary and text work. It opens from the Links menu in Class Management. The three sections covered here are **Board**, **History**, and **Search**.

---

### Board (🌐 Board)

An infinite-canvas mind-map and vocabulary board. Words are draggable nodes; you can annotate, group, draw on, and export the board.

#### Adding Words

Right-click anywhere on the blank canvas to open the quick-add menu:

| Suffix | Node type |
|---|---|
| *(none)* | Standard single word |
| `, ` (comma-separated) | Multiple words at once |
| `_` | Phrase group (words treated as a unit) |
| `//` | Two-line node |
| `+` | Co-located group (words pinned together) |
| `--` | Linked chain (nodes connected by an arrow) |

Words from the vocabulary database can be bulk-imported via **📥 Import**; a search box filters the list before adding.

#### Node Interactions

- **Drag** to reposition; **double-click** to edit the text in place.
- Right-click a node for its context menu: edit text, change style, apply a **Preset**, copy/cut, delete.
- **Multi-select** with Ctrl/Cmd+click or drag-select, then align, distribute, or grid-arrange the selection.
- Ctrl/Cmd+G groups selected nodes into a named group container.

#### Styling Nodes

Each node can be styled individually or via **Presets** (up to 15 saved configurations per board):

- Background colour, text colour, border colour/width/style (solid · dashed · dotted · double).
- Highlight glow ring.
- Node shape.
- Font family and formatting (bold · italic · underline · strikethrough).

Right-click → **Preset** row → quick-apply any saved preset. The ⚙ button in the preset row opens the preset editor.

#### Notes

Any node or empty area can have a rich-text **Note** attached:

- Notes support bold, italic, underline, strikethrough, text/background colour, and font family.
- **Ctrl+Space** clears formatting from a selection (or the whole note if nothing is selected).
- Notes also have their own **Presets** (stored separately from node presets).

#### Drawing & Laser

Activate **✎ Draw mode** from the toolbar:

- Freehand pen with colour picker, thickness (1–40 px), and opacity (5–100%).
- **Pen Presets**: save and restore pen configurations (colour, opacity, thickness, shape) — up to 15 presets.
- Shapes: rectangle, circle, line, polygon; each with optional fill and border style.
- **⌫ Erase** removes freehand strokes.
- **⬭ Laser** (Ctrl+L): click to leave a fading mark, drag to draw a trail, double-click for a pulse ring — useful for pointing at things on a projector without permanent marks.

#### Pages

A board can have multiple pages:

- **➕** Add a new blank page; **⎘ Copy** / **⎗ Paste** to duplicate a page.
- **⊞ Preview** shows thumbnails of all pages and lets you reorder or delete them.
- Navigate with ← / → buttons; the current page indicator shows "Page X / N".
- Each page has an editable inline title (up to 60 characters).

#### Vocabulary Overlays

- **[ ] IPA**: toggle International Phonetic Alphabet pronunciation under every word.
- **( ) Translation**: toggle the translation in the current app language under every word (resolved via `getTranslation()` — shows the French, German, or Italian equivalent depending on the active UI language).
- **❓ Unknown**: list words on the board that are not found in the vocabulary database.

#### Pasting Tables

Paste a table from any source (a web page, Word, Excel, Google Sheets) directly onto the board canvas:

- Copy a `<table>` from HTML and paste with **Ctrl/Cmd+V** — the board detects the HTML table structure and creates a draggable table element at the paste position.
- Copy cells from a spreadsheet (tab-separated values) and paste — rows with at least one tab are interpreted as TSV and converted to the same table element.
- The first row is treated as a header when the source `<th>` elements are detected. Column widths can be dragged to resize; rows too.
- Tables are saved as part of the board session and exported with it.

#### Board Operations

| Button | Action |
|---|---|
| ⇢ Spread | Push selected nodes apart to remove overlaps |
| ⇠ Compact | Pull selected nodes closer together |
| 👁 Hide/Show | Toggle visibility of all nodes |
| ▭ Mask | Add a movable opaque rectangle (for revelation effects) |
| ⬡ Group | Insert an empty group container |
| 📐 Snap | Toggle snap-to-align (hold Alt to bypass momentarily) |

#### Saving & Exporting

- **💾 Save** — downloads the board as a `.js` file (includes `_createdAt` / `_savedAt` timestamps; loadable back into the board).
- **📂 Load** — opens a saved `.js` or `.json` board file.
- **✚ New** — saves the current board and starts a fresh one.
- **⬇ Export** — export the board as a **PNG image**, **CSV word list**, or **PDF**.
- **📋 Templates** — save the current board as a reusable template, or load a template to pre-populate a new board.
- **🧩 Media** — attach images, audio, video, or PDFs directly to the board; manage and delete attachments. Includes a **🎙 Record Audio** button to record voice directly from the microphone.

#### Voice Recordings

- **Record**: click **🧩 Media → 🎙 Record Audio**, or right-click the board canvas and choose **🎙 Record Audio**.
- The popup shows a mic level bar, a live timer, and a record/stop toggle (⏺ / ⏹).
- After stopping, a preview player appears. Click **Save to board** to save the clip to the constellation's companion folder (`audio/`) and place it as a sound node.
- If no constellation file is open yet, a **💾 Save constellation & proceed** button appears; saving creates the companion folder so the recording can be attached.
- **Trim**: right-click any audio node on the board and choose **✂ Trim**. Drag the region handles on the waveform to select the portion to keep, then click **Save trimmed**. The trimmed clip is saved as a new `.wav` file alongside the original (the original is never deleted).

#### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+S | Save |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z | Redo |
| Ctrl/Cmd+A | Select all |
| Ctrl/Cmd+C / X / V | Copy / Cut / Paste (in move mode) |
| Ctrl/Cmd+G | Group selection |
| Ctrl/Cmd+H | Hide / reveal selection |
| Ctrl/Cmd+↑ / ↓ | Increase / decrease font size of selection |
| Ctrl/Cmd+L | Toggle laser pointer |
| Delete / Backspace | Remove selection |
| Ctrl+Space | Clear note formatting |
| Esc | Close menus / exit mode |

#### Presentation Mode

- **📽️ Presentation Mode**: mirrors the board to a second monitor window.
- **🖱 Mouse Pointer**: shows a laser dot at the cursor position in the presentation window.
- **❄️ Freeze Board**: stops the presentation from updating while you prepare the next state.

---

### History (🕘 History)

Browses and manages all saved Board sessions stored on disk.

#### View Tabs

| Tab | Contents |
|---|---|
| Manual Saves | Sessions saved explicitly by the user |
| Autosaves | Automatically saved versions |
| 🗄 Archived | Sessions moved to the archive (hidden from the main tabs) |

#### Filtering

A filter bar above the table lets you narrow results by:

- **From / To date** (date pickers) — filters by the session creation date.
- **Class / Group** — dropdown of known group names.
- **✕ Clear** resets all filters instantly.

#### History Table

Columns (all sortable by clicking the header):

| Column | Description |
|---|---|
| Name | Session filename |
| Type | Board |
| Class/Group | Associated class group |
| Created | Original creation timestamp |
| Saved | Last modification timestamp |
| Size | File size |
| Actions | Per-row: Load · Rename · Duplicate · Download · Delete |

Select multiple rows with the header checkbox or individual checkboxes, then use the toolbar:

- **⬇ Export Selected** — download selected files.
- **🗄 Archive Selected** — move to archive.
- **↩ Unarchive Selected** — restore from archive.
- **🗑 Delete Selected** — permanently remove.
- **🧹 Delete All** — clear all sessions (requires confirmation).
- **↻ Refresh** — reload the file list from disk.

---

### Search (🔍 Search)

Searches for a word or phrase across a loaded book or text file, showing every occurrence with its surrounding context.

#### How It Works

1. A book or text document must be loaded into the board's vocabulary database (via the Import system or directly from `data/books/`).
2. Type a word or phrase into the search box.
3. Results show each occurrence with the surrounding paragraph (or up to 200 words of context).
4. Useful for finding collocations, example sentences, and contextual usage before adding a word to the Board.

### Student Input Note

Lets students submit short text responses from their phones that appear as notes on the board. Right-click the canvas → **👥 Student Input Note**.

- Select a **class group** and give the session a **title**.
- Use the **Local / External toggle** to choose the server — reads from the shared `user/remote-config.js` so it is already set if you previously configured Phone Remote or Multiplayer Quiz.
- Click **Connect & Open Room** — a join URL and QR code appear. Share them with the class.
- Students open the URL on any browser, pick their name, and type a short response. Submissions appear live in the board note.
- Click **Copy Join URL** to copy the link, or click the QR image to paste it directly onto the canvas as a scannable node.

---

## learning-tools.html

Student-facing activity hub. Open it on a shared screen or student devices for interactive vocabulary and grammar practice. All content is drawn from the vocabulary database; filters narrow the word pool before starting any activity.

### Filters

Three independent filters sit at the top of the page and carry over as you move between activities:

- **Level** — CEFR level (A1 → C2); select one or more values.
- **Theme** — topic categories (a word can belong to several themes simultaneously).
- **Type** — word type / grammar category.

**Reset** clears all filters back to "All". The active word count updates in real time.

### Vocabulary Games

| Game | How it works |
|---|---|
| **🧩 Definition Match** | Flip card pairs to match each word to its definition. All pairs must be found to win. |
| **😵 Hangman** | Guess the hidden word letter by letter. Choose 4–12 allowed mistakes. 💡 Clue reveals the definition. |
| **🔠 Scrambled Word** | Letters are shuffled — click them in order to reconstruct the word. 💡 Clue reveals the next letter. |
| **🔍 Word Quest** | A definition is shown; unlock up to 4 progressive hints (synonyms, letter clues) then type the answer. |
| **🔉 Phonetic Guess** | An IPA transcription is shown — identify the word it represents (4-choice or free typing). |
| **🔗 Synonyms & Antonyms** | A word is shown; find its synonym or antonym. Toggle Synonym / Antonym / Both modes. Multiple choice or free typing. |

### Grammar Games

| Game | How it works |
|---|---|
| **✍️ Sentence Builder** | Reconstruct a scrambled sentence by clicking words in order. 💡 Clue reveals the next word. |
| **🕳️ Gap Fill** | One word is removed from a sentence — type it back. Filter by grammar type (Relatives, Conditionals…). |
| **🔴 Find the Error** | Spot the grammatical mistake. **Spot** mode: choose correct vs erroneous. **Rewrite** mode: correct the sentence yourself. |
| **📝 Dictation** | A text is read aloud; type what you hear word by word. Difficulty: Easy (10% words hidden) · Medium (50%) · Hard (90%). |

### Tools

| Tool | Description |
|---|---|
| **📐 Grammar Practice** | Reference library of grammar rules — formulas, signal words, common mistakes, and tips. Filter by category or level. |
| **🎴 Flash Cards** | Hover a card to flip and reveal the translation (in the active UI language) and definition. Passive review mode. |
| **📜 Quote Analyser** | A literary quote is displayed; guess its theme and keywords, unlock clues one by one, or request a full analysis. |
| **📋 View All Words** | Browse the entire filtered vocabulary bank. Click any entry for full details. Export to CSV or TXT. |
| **🌐 Board** | Opens the visual word-map in board.html showing connections by theme and meaning. |
| **➕ Add Words to DB** | Add custom vocabulary entries with word, IPA, French/English/German/Italian translations, definition, example sentence, synonyms, antonyms, and more. Saved locally; download an updated DB file to make them permanent. |

### Multiplayer Quiz

Run a quiz as a live multiplayer session where every student answers on their own device simultaneously.

#### Local network mode

1. Load a quiz, then switch to **Multiplayer Host** mode in the quiz panel.
2. Click **Connect** — the app auto-starts the combined classroom server (same one used by Phone Remote).
3. Share the quiz player URL that appears (e.g. `http://192.168.x.x:8787/quiz-player.html`) or its QR code.
4. Students open the URL, select their class and name, and click **Join**.
5. Advance questions from the host panel; students see each question in real time on their screen.
6. At the end of the session, results are saved automatically to `user/game-results/game-results.js`.

#### External server mode

1. In the quiz panel, click **External** in the Local/External toggle.
2. Enter your hosted server URL in the field that appears (pre-filled from the shared config if already set in Phone Remote).
3. Click **Connect** — no local server starts; the app connects to your relay.
4. Students open `https://your-server.com/quiz-player.html` from any network.

> The quiz server and Phone Remote share the same combined server (`js/classroom-server.js`). The Local/External toggle is shared across Phone Remote, Multiplayer Quiz, and Student Input Note in Board — changing it in any panel updates all three.

### Team Mode

- **Add teams** on the home screen — give each a name and colour.
- Teams take turns across all games; the current team's panel is highlighted in that team's colour.
- A correct answer awards points to the active team.
- **Reset Scores** zeroes all scores; **Clear Teams** removes all teams.

### Timer

Most games have a **⏱ Timer** button in the top-right corner. Configure:

- **Grace period** — seconds before points start being deducted.
- **Points deducted per interval** — how many points are lost each tick.
- **Deduction interval** — seconds between deductions.

The timer runs independently of the game, making it usable for timed rounds or team challenges.

### Presentation Mode

Individual games have a presentation icon (📽️) in their toolbar that opens a second window for student-facing display:

- Projects the game interface onto a projector or secondary monitor.
- Teacher controls (team scores, navigation, settings) remain on the main window.
- The presentation window updates live as you advance through questions or activities.
- Close it from either screen via the close button or the presentation indicator in the main toolbar.

### Other Controls

- **Language switcher**: EN · DE · IT · FR (top-right). Affects which translation column is shown in games and flash cards.
- **Font size**: A− · A · A+ buttons to scale the UI text.
- **Mute**: toggle all game sound effects.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Enter | Submit answer |

---

## manage-database.html

The vocabulary database manager. Use it to browse, edit, enrich, and maintain the word bank that powers all other tools.

### Word List & Filters

The main view shows all words in the database with three live filters:

- **Search** — free-text match on the word field.
- **Theme filter** — narrow to a specific theme.
- **Source filter** — All Sources · Custom only · Built-in only.

Click any word to open the **Word Detail** overlay.

### Word Detail Overlay

Displays the full record for a word and supports inline editing (toggle with the ✏️ button):

| Field | Notes |
|---|---|
| Word | The entry's spelling |
| IPA | Phonetic transcription (without slashes) |
| Source Language | The language the word belongs to (`en`, `fr`, `de`, `it`) |
| English | English form of the word |
| French | French translation |
| German | German translation |
| Italian | Italian translation |
| Part of Speech | noun · verb · adjective · etc. |
| Level | CEFR level (A1–C2) |
| Theme | Comma-separated list of themes |
| Keywords | Comma-separated tags (e.g. lesson codes) |
| Definition | English definition |
| Example Sentence | Usage in context |
| Synonyms | Comma-separated |
| Antonyms | Comma-separated |
| Other Forms | Plurals, conjugations, irregular forms |

**Save** options: to browser memory, to the main database file, or to a named custom `.js` file (via the file picker). Navigate between entries with ← Prev / Next → / ↩ Back buttons. Zoom controls (−/+) scale the overlay text.

### Multi-Language Word Schema

Each word entry can carry translations for all supported languages alongside the source word:

```json
{
  "word": "resilient",
  "sourceLanguage": "en",
  "english": "resilient",
  "french": "résilient",
  "german": "belastbar",
  "italian": "resiliente"
}
```

The `getTranslation(word)` helper (shared across all tools) reads the active UI language and returns the correct translation automatically. This means flash cards, vocabulary overlays, and game hints all adapt to the selected language without any per-tool configuration.

### Print to PDF

Choose which columns to include before printing: Word (required), French, IPA, Part of Speech, Level, Theme, Keywords, Definition, Example, Synonyms, Antonyms, Other Forms.

### Database Management Overlay

A slide-over panel with five tabs for bulk operations:

#### 🗂️ Manage Custom
Browse all words (custom and built-in) with search + theme + source filters. Select individual entries or use **Select All**, then **🗑 Delete Selected** to remove them.

#### ➕ Add Words
Form to add a new vocabulary entry, quote, gap-fill sentence, or error pair. Wiktionary auto-lookup can pre-fill IPA and the definition.

#### 🏷️ Themes
Five sub-sections for bulk theme/metadata operations:

| Sub-section | What it does |
|---|---|
| **✏️ Rename Theme** | Rename a theme across every word in the database (including built-in words). Shows a live count of affected entries before confirming. |
| **🔀 Merge Themes** | Drag theme pills into the merge zone, choose a target theme name, and collapse multiple themes into one. |
| **📋 Assign Theme by Word List** | Enter a theme name and a comma-separated word list. Existing words get the theme added; unrecognised words are created as new entries. |
| **🔑 Assign Keyword by Word List** | Same as above but adds a keyword tag instead of a theme. |
| **📊 Assign Level by Word List** | Set the CEFR level for a list of words in one operation. |
| **🏷️ Assign Part of Speech by Word List** | Set the POS for a list of words in one operation. |

#### 🔁 Find Duplicates
Scans for entries with the same base spelling (case-insensitive) and the same word type. For each group of duplicates, choose which entry to keep; the others are removed. **🔄 Rescan** refreshes the list after changes.

#### 🗑️ Delete Words
Search + theme + source filter to locate entries, then select and bulk-delete.

---

## grade-sheet.html

Manages test results by class, term, and grading criterion. Data is persisted to disk in Electron or exportable as JSON for use elsewhere.

### Classes Screen

The landing screen. Shows all configured classes.

- **Add class**: enter a name (e.g. `3ANdf-03`), year (`2025-2026`), term (1 or 2), and level (1–4), then click **Add Class**.
- **Export JSON** / **Import JSON** — back up or restore the entire grade dataset.
- **Edit Criteria / Scales** — opens the Reference Data Editor (see below).

### Summary Screen

Opened by clicking a class card. Shows all tests (T1–T8) for the selected term as a summary table.

- Columns: student names + one column per test + calculated average/total.
- Click a test header to open the individual test sheet.
- Toolbar buttons: **Back to Classes** · **Add Student** · **Add Test** · **Import Test** · **Print Term** · **Import Grades** · **Edit Class** · **Delete Class**.

### Test Screen

The detailed view for one test. An editable table shows one row per student with columns for each grading criterion.

- **Test config** strip at the top shows test metadata (name, date, max score, weight).
- **Apply Criteria to Grades** — auto-calculates student grades from criterion scores.
- **Criteria Reference** — shows descriptor text for each criterion level.
- **Print Results** — prints the test sheet.
- **Duplicate / Import** — copies the test configuration (criteria, scale, weight) from another class/term/test slot.
- **Delete Test** / **Clear Test** — remove or zero the test data.

#### Test Weight
Each test can be weighted as a **Coefficient** multiplier or a **Fixed weight (%)** of the term total.

### Reference Data Editor

Shared configuration stored in `user/correction-criteria.js` and `user/grade-scale-models.js`. Changes apply to all classes immediately.

- **Correction criteria**: define criterion names and grade descriptors (e.g. Grammar → A/B/C/D with descriptions). Add, duplicate, or remove criteria.
- **Grading scale models**: define named scale presets with threshold percentages that map raw scores to letter or number grades. Add, duplicate, or remove models.

### Student Modal

Click a student's name for an individual view:

- Enter or adjust grades per criterion for each test.
- View the calculated overall grade and per-criterion breakdown.
- Save or cancel changes.

### Keyboard Shortcuts

No keyboard shortcuts yet.

---

## participation-tracker.html

An analytics dashboard that reads the session data written by Class Management. Use it after lessons to review participation patterns over time.

### Controls

At the top of the page:

- **Select Group** — toggle buttons for each configured class group. An **Show archived** toggle reveals archived groups.
- **Date Range** — presets: All Data · Last 30 Days · Last 7 Days. Or set a custom **From / To** date range.
- **📂 Import & Merge** — drag-and-drop `.json`, `.js`, or legacy `.txt` session files to merge external data.
- **📥 Export CSV** — download all visible data as a spreadsheet.
- **🖨️ Print** — print the current view.
- **🗑 Reset All Data** / **🗑 Reset Group** — permanently delete data (two-step confirmation).

### Dashboard

Two panels updated live based on the current group and date filter:

- **Participation Trend** — line chart showing Picks, Positive Points, and Negative Points per session over time.
- **Summary Statistics** — four stat cards: Total Picks · Positive Points · Negative Points · Badges Awarded.

### Session History Table

One row per recorded session. Sortable columns:

Date · Time · Picks · Pluses · Minuses · T+ · T− · Badge+ · Badge− · Team/Role Events · Students · Badges · Objectives · Notes · (delete row)

A **Columns ▾** toggle lets you show or hide individual columns. Clicking a row **filters the Class Overview** table below to show only that session's data (with a highlight and title update). A **Clear Session Filter** button restores the full view.

### Class Overview Table

One row per student, aggregated across all sessions in the current filter. Sortable columns:

Student · Sessions · Picks · Absent · + · − · T+ · T− · Badge+ · Badge− · Badges · Team/Role Events · Notes · Net · +/session · −/session · Net/session · Good/Bad ratio · Trend

A **Columns ▾** toggle controls visibility. Click a student's row to open the **Individual Student Analysis** section.

### Individual Student Analysis

Below the Class Overview table, shows a stats summary and a per-session history table for the selected student (Date · Time · Picked · Absent · + · − · T+ · T− · Badges · Team/Role Events · Notes). Click a session row to open the **Notes modal** where you can add or edit a text note for that student's session.

### Keyboard Shortcuts

No keyboard shortcuts yet.

---

## data-location.html

A single-page utility for configuring where the app stores its data, how it backs up, and how it synchronises with a secondary location. The same controls are also available in **General Config**.

### Data Folder

- **Current path** is displayed at the top.
- **Choose Folder** — browse for a new data directory. After selection, a migration prompt appears if existing files are detected at the old location.
- **Reset to Default** — revert to the path next to the app or AppImage.
- **Check for Updates** — manually trigger an update check.

#### First Launch
On the very first run, a banner offers two options: **Select Existing Folder** (point to a previous installation's data) or **Start Fresh** (use the default location).

#### Migration
When the data folder is changed, a yellow banner offers to **Copy Files Now** from the old location to the new one. Other app windows are reloaded automatically to use the new path.

### Backup

- **Choose Folder** — set a destination for manual backups.
- **Backup Now** — copies all user data (logs, settings, custom files) to the backup folder.

### Sync

Synchronises the data folder with a second location (e.g. a network drive or USB).

- **Choose Folder** — set the sync target.
- **Sync Now** — opens a conflict-resolution table before applying changes.
- **Keep target up to date automatically** checkbox — enables auto-sync so the target stays current without manual intervention.

#### Conflict Resolution Table
Before applying a sync, a modal lists every file that differs between source and target. Columns (sortable): file path · source date · target date · source size · target size · status. Per-file action dropdown:

- Keep newer
- Keep source
- Keep target

---

## document-editor.html

**Document Editor** — a dual-pane Markdown editor with live KaTeX maths rendering, custom CSS stylesheets, document/template management, and PDF export.

### Layout

The window is divided into three horizontal regions:

1. **Nav bar** — grouped into hover menus:
   - **File ▾** — New, Open, **Open from disk…** (import any file from anywhere on disk; saves as a copy on first Save), Save, Save As, Save All, History
   - **Insert ▾** — Table, Image, Books (import text from the books folder)
   - **Format ▾** — Open template, Save as template, Page Layout
   - **Export ▾** — Export PDF, Export DOCX, Preview, **Presentation Mode**
   - **⚙ Settings** — snippets, shortcuts, triggers, preferences
   - **☰** — Launcher
2. **CSS panel** — always-visible header row plus a collapsible Monaco CSS editor.
3. **Split pane** — Monaco Markdown editor on the left, live preview on the right. Drag the divider to adjust the split.

### Markdown & Maths

Write standard [GitHub Flavored Markdown](https://github.github.com/gfm/). Maths is rendered by KaTeX:

| Syntax | Rendering |
|---|---|
| `$...$` | Inline maths |
| `$$...$$` | Display (block) maths |

### Documents

Files are saved as `.md` under `custom-data/document-editor/docs/`.

| Action | How |
|---|---|
| **New** | Clears the editor (prompts if unsaved changes) |
| **Open** | Modal list of saved documents; click Open or Delete |
| **Open from disk…** | OS file picker — opens any `.html`, `.md`, or `.txt` file from anywhere on disk. The content is loaded into the editor; use **Save** to store a managed copy in Documents |
| **Save** | Saves under current name; prompts for a filename if new |
| **Save As** | Always prompts for a new filename |
| Ctrl+S | Save | Ctrl+N | New | Ctrl+O | Open |

### Templates

Templates are `.md` files under `custom-data/document-editor/templates/`. Use the **Format ▾** menu to:

- **Open template…** — insert a template into the editor (replaces current content).
- **Save as template…** — save the current editor content as a named template.

### Book Text Import

The **Insert ▾ → Books** dropdown lists all files in `custom-data/books/` (`.epub`, `.html`, `.txt`). Selecting a book opens a picker modal:

- The full book text is displayed in a scrollable area.
- Use the **search bar** to find a passage — type to see the match count, then press **Enter** or **▼/▲** to jump to each match (highlighted by browser selection).
- Select the text you want (adjust the selection with Shift+click or Shift+arrows), then click **Insert selection** to paste it at the editor cursor.

### CSS Panel

The top panel exposes three ways to customise how the preview looks:

| Control | Purpose |
|---|---|
| **Stylesheet picker** | Select, create (New), save, or delete a `.css` file stored under `custom-data/document-editor/stylesheets/` |
| **Quick Rule builder** | Type a CSS selector, choose a property from the dropdown, type a value, press **+ Add** — the rule is appended to the CSS editor and applied immediately |
| **CSS Editor ▾** | Toggle a Monaco CSS editor showing the raw content of the active stylesheet; changes apply to the preview in real time |

Custom CSS scopes to the preview area. Use `.doc-preview` as the root selector to override default document styles (headings, tables, code blocks, etc.).

### Presentation Mode

**Export ▾ → Presentation Mode** opens a separate full-screen window that projects the live document preview — ideal for displaying the formatted document on a second monitor or projector.

- The presentation window opens on a second display when one is detected, otherwise it opens beside the main editor.
- The document updates live: every keystroke, page layout change, or CSS edit is reflected instantly.
- A red **● Presenting** indicator appears in the nav bar while the window is open; click **Stop** to close it.
- The presentation window shows only the rendered document on a dark background, with no editor chrome.

### PDF Export

Click **Export PDF** to render the current preview (including custom CSS and KaTeX fonts) as a PDF and save it via the system save dialog.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+S | Save current document |
| Ctrl/Cmd+Shift+S | Save all open documents |
| Ctrl/Cmd+N | New document |
| Ctrl/Cmd+O | Open document |
| Enter (book import) | Next search result |
| Shift+Enter (book import) | Previous search result |
| Esc | Close modal / full preview |

Bulk-action buttons let you apply one strategy to all files at once. A search bar and status filter narrow the list when many files are involved.
