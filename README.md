# Class Management Tools — User Guide

## Overview

| File | Purpose |
|---|---|
| `class-management.html` | Classroom session manager — students, teams, timer, scoring, and settings |
| `board.html` | Visual tools — Board, session History, and vocabulary Search |
| `learning-tools.html` | Student-facing vocabulary and grammar games with team scoring |
| `manage-database.html` | Vocabulary database browser, editor, and bulk-management tool |
| `grade-sheet.html` | Test and grade tracking per class, semester, and criterion |
| `participation-tracker.html` | Participation analytics dashboard sourced from Class Management sessions |
| `data-location.html` | Configure the shared data folder, backups, and sync |

All tools run as standalone HTML files in a browser or via Electron (desktop builds available through the `.bat` launcher scripts).

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
| **Edit Groups** | Add/rename classes; each group has a name, year, semester, and level |
| **Edit Teams** | Customise team names and colours (palette of 10+ colours) |
| **Edit Badges** | Define badge icons, names, tone, and meaning |
| **Edit Sounds** | Pick audio files or built-in sounds for every event slot (timer end, ambient, drumroll, gavel, score sounds); each slot has a 0–100 volume slider |
| **Edit Roles** | Manage role titles and descriptions |
| **Edit Autoflag** | Bottom-% threshold, elements to count, and timeline |
| **Class Plan** | Seating layout and weekly schedule |
| **App Title** | Custom teacher or school name shown in the header |
| **Startup Window** | Which tool opens automatically at launch |

### Navigation

The **Links** popup (top menu) gives one-click access to every other tool: Board, Learning Tools, Grade Sheet, Participation Tracker, Database Manager, and Data Location.

A language switcher supports **EN · FR · DE · IT**.

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
- **( ) FR**: toggle French translations under every word.
- **❓ Unknown**: list words on the board that are not found in the vocabulary database.

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
- **🧩 Media** — attach images, audio, video, or PDFs directly to the board; manage and delete attachments.

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

Browses and manages all saved Board, Text Analysis, and Notes sessions stored on disk.

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
| Type | Board · Text Analysis · Notes |
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
| **🎴 Flash Cards** | Hover a card to flip and reveal the French translation and definition. Passive review mode. |
| **📜 Quote Analyser** | A literary quote is displayed; guess its theme and keywords, unlock clues one by one, or request a full analysis. |
| **📋 View All Words** | Browse the entire filtered vocabulary bank. Click any entry for full details. Export to CSV or TXT. |
| **🌐 Board** | Opens the visual word-map in board.html showing connections by theme and meaning. |
| **➕ Add Words to DB** | Add custom vocabulary, quotes, gap-fill sentences, and error pairs. Saved locally; download an updated DB file to make them permanent. |

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

### Other Controls

- **Language switcher**: EN · DE · IT · FR (top-right).
- **Font size**: A− · A · A+ buttons to scale the UI text.
- **Mute**: toggle all game sound effects.

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
| Translation | French equivalent |
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

Manages test results by class, semester, and grading criterion. Data is persisted to disk in Electron or exportable as JSON for use elsewhere.

### Classes Screen

The landing screen. Shows all configured classes.

- **Add class**: enter a name (e.g. `3ANdf-03`), year (`2025-2026`), semester (1 or 2), and level (1–4), then click **Add Class**.
- **Export JSON** / **Import JSON** — back up or restore the entire grade dataset.
- **Edit Criteria / Scales** — opens the Reference Data Editor (see below).

### Summary Screen

Opened by clicking a class card. Shows all tests (T1–T8) for the selected semester as a summary table.

- Columns: student names + one column per test + calculated average/total.
- Click a test header to open the individual test sheet.
- Toolbar buttons: **Back to Classes** · **Add Student** · **Add Test** · **Import Test** · **Print Semester** · **Import Grades** · **Edit Class** · **Delete Class**.

### Test Screen

The detailed view for one test. An editable table shows one row per student with columns for each grading criterion.

- **Test config** strip at the top shows test metadata (name, date, max score, weight).
- **Apply Criteria to Grades** — auto-calculates student grades from criterion scores.
- **Criteria Reference** — shows descriptor text for each criterion level.
- **Print Results** — prints the test sheet.
- **Duplicate / Import** — copies the test configuration (criteria, scale, weight) from another class/semester/test slot.
- **Delete Test** / **Clear Test** — remove or zero the test data.

#### Test Weight
Each test can be weighted as a **Coefficient** multiplier or a **Fixed weight (%)** of the semester total.

### Reference Data Editor

Shared configuration stored in `user/correction-criteria.js` and `user/grade-scale-models.js`. Changes apply to all classes immediately.

- **Correction criteria**: define criterion names and grade descriptors (e.g. Grammar → A/B/C/D with descriptions). Add, duplicate, or remove criteria.
- **Grading scale models**: define named scale presets with threshold percentages that map raw scores to letter or number grades. Add, duplicate, or remove models.

### Student Modal

Click a student's name for an individual view:

- Enter or adjust grades per criterion for each test.
- View the calculated overall grade and per-criterion breakdown.
- Save or cancel changes.

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

---

## data-location.html

A single-page utility for configuring where the app stores its data, how it backs up, and how it synchronises with a secondary location.

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

Bulk-action buttons let you apply one strategy to all files at once. A search bar and status filter narrow the list when many files are involved.
