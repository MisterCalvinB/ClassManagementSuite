# Class Management Tools — Agent Workspace Instructions

> This workspace customization file links directly to the primary project architecture documentation.

Please refer to the full architectural guide and instructions in [AGENTS.md](file:///c:/Users/arnau/Class%20Management%20Tools/AGENTS.md).

## Quick Summary of Key Principles
1. **Vanilla Web Stack + Electron Shell**: HTML5, Vanilla JS, CSS3. No framework transpilation step.
2. **Offline-First Storage**: User data lives in `user/` or custom data path using `electron-bridge.js`.
3. **Master Roster**: `class-groups.js` (managed by Group Editor) is the single source of truth. Preserve UUIDs.
4. **IPC File I/O**: Use `electron-bridge.js` API functions in renderer pages rather than raw Node `fs`.
5. **Cross-Window Sync**: Shared state edits trigger `showDataChangedBanner()` notifications.
6. **i18n**: Support EN, FR, DE, IT via `js/i18n.js`.
