/**
 * Class Management Tools — Board Custom Shortcuts & Action Manager
 * Manages custom keyboard shortcuts, quick action dispatchers, and shortcuts help modal.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var conNormalizeColorHex = global.conNormalizeColorHex || window.conNormalizeColorHex || function (hex) {
    if (typeof window !== 'undefined' && typeof window.conNormalizeColorHex === 'function' && window.conNormalizeColorHex !== conNormalizeColorHex) {
      return window.conNormalizeColorHex(hex);
    }
    return String(hex || '');
  };
  var conRenderBoardBgPresetsInContextMenu = global.conRenderBoardBgPresetsInContextMenu || window.conRenderBoardBgPresetsInContextMenu || function () {
    if (typeof window !== 'undefined' && typeof window.conRenderBoardBgPresetsInContextMenu === 'function' && window.conRenderBoardBgPresetsInContextMenu !== conRenderBoardBgPresetsInContextMenu) {
      return window.conRenderBoardBgPresetsInContextMenu();
    }
  };
  var conApplyBoardBgColor = global.conApplyBoardBgColor || window.conApplyBoardBgColor || function () {
    if (typeof window !== 'undefined' && typeof window.conApplyBoardBgColor === 'function' && window.conApplyBoardBgColor !== conApplyBoardBgColor) {
      return window.conApplyBoardBgColor();
    }
  };

  var _BC_A4_SIZE_PX = global._BC_A4_SIZE_PX = window._BC_A4_SIZE_PX = window._BC_A4_SIZE_PX || {
    landscape: { w: 1123, h: 794 },
    portrait: { w: 794, h: 1123 }
  };

  var _bcNormalizeBoardLayoutPreset = global._bcNormalizeBoardLayoutPreset = window._bcNormalizeBoardLayoutPreset = function (v) {
    if (typeof window !== 'undefined' && typeof window._bcNormalizeBoardLayoutPreset === 'function' && window._bcNormalizeBoardLayoutPreset !== _bcNormalizeBoardLayoutPreset) {
      return window._bcNormalizeBoardLayoutPreset(v);
    }
    const s = String(v || '').trim().toLowerCase();
    if (s === 'a4-landscape' || s === 'a4-portrait' || s === 'custom') return s;
    return 'flex';
  };

  var _bcNormalizeBoardOrientation = global._bcNormalizeBoardOrientation = window._bcNormalizeBoardOrientation = function (v) {
    if (typeof window !== 'undefined' && typeof window._bcNormalizeBoardOrientation === 'function' && window._bcNormalizeBoardOrientation !== _bcNormalizeBoardOrientation) {
      return window._bcNormalizeBoardOrientation(v);
    }
    return String(v || '').trim().toLowerCase() === 'portrait' ? 'portrait' : 'landscape';
  };

  var _bcClampBoardDimension = global._bcClampBoardDimension = window._bcClampBoardDimension = function (v, fallback) {
    if (typeof window !== 'undefined' && typeof window._bcClampBoardDimension === 'function' && window._bcClampBoardDimension !== _bcClampBoardDimension) {
      return window._bcClampBoardDimension(v, fallback);
    }
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(320, Math.min(12000, n));
  };

  var _bcResolveBoardLayoutSettings = global._bcResolveBoardLayoutSettings = window._bcResolveBoardLayoutSettings = function (cfg) {
    if (typeof window !== 'undefined' && typeof window._bcResolveBoardLayoutSettings === 'function' && window._bcResolveBoardLayoutSettings !== _bcResolveBoardLayoutSettings) {
      return window._bcResolveBoardLayoutSettings(cfg);
    }
    return { preset: 'flex', customOrientation: 'landscape', customWidth: 1600, customHeight: 1000, dims: null };
  };

  var _bcApplyBoardLayout = global._bcApplyBoardLayout = window._bcApplyBoardLayout = function (layout) {
    if (typeof window !== 'undefined' && typeof window._bcApplyBoardLayout === 'function' && window._bcApplyBoardLayout !== _bcApplyBoardLayout) {
      return window._bcApplyBoardLayout(layout);
    }
  };

  var _bcSyncBoardLayoutControls = global._bcSyncBoardLayoutControls = window._bcSyncBoardLayoutControls = function () {
    if (typeof window !== 'undefined' && typeof window._bcSyncBoardLayoutControls === 'function' && window._bcSyncBoardLayoutControls !== _bcSyncBoardLayoutControls) {
      return window._bcSyncBoardLayoutControls();
    }
  };

  var _bcApplyCustomOrientationInInputs = global._bcApplyCustomOrientationInInputs = window._bcApplyCustomOrientationInInputs = function () {
    if (typeof window !== 'undefined' && typeof window._bcApplyCustomOrientationInInputs === 'function' && window._bcApplyCustomOrientationInInputs !== _bcApplyCustomOrientationInInputs) {
      return window._bcApplyCustomOrientationInInputs();
    }
  };

  var conExtractBoardBgPresetsFromConfig = global.conExtractBoardBgPresetsFromConfig = window.conExtractBoardBgPresetsFromConfig = function (bc) {
    if (typeof window !== 'undefined' && typeof window.conExtractBoardBgPresetsFromConfig === 'function' && window.conExtractBoardBgPresetsFromConfig !== conExtractBoardBgPresetsFromConfig) {
      return window.conExtractBoardBgPresetsFromConfig(bc);
    }
    return ['#ffffff', '#f8fafc', '#f4f1de', '#ecfdf5', '#fff7ed', '#fee2e2', '#e0f2fe', '#ede9fe'];
  };

  var conRenderBoardLayoutOptionsInContextMenu = global.conRenderBoardLayoutOptionsInContextMenu = window.conRenderBoardLayoutOptionsInContextMenu = function () {
    if (typeof window !== 'undefined' && typeof window.conRenderBoardLayoutOptionsInContextMenu === 'function' && window.conRenderBoardLayoutOptionsInContextMenu !== conRenderBoardLayoutOptionsInContextMenu) {
      return window.conRenderBoardLayoutOptionsInContextMenu();
    }
  };

  var _BC_PEN_PRESET_DEFAULTS = global._BC_PEN_PRESET_DEFAULTS = window._BC_PEN_PRESET_DEFAULTS = window._BC_PEN_PRESET_DEFAULTS || [
    { name: 'Red', color: '#e53935', opacity: 1, thickness: 4, shape: '' },
    { name: 'Highlighter', color: '#fdd835', opacity: 0.4, thickness: 16, shape: '' },
    { name: 'Blue thin', color: '#1e88e5', opacity: 1, thickness: 2, shape: '' }
  ];

  var _BC_PEN_SHAPE_OPTIONS = global._BC_PEN_SHAPE_OPTIONS = window._BC_PEN_SHAPE_OPTIONS = window._BC_PEN_SHAPE_OPTIONS || [
    { value: '', label: '✏ Freehand' },
    { value: 'rect', label: '▭ Rect' },
    { value: 'circle', label: '⬭ Ellipse' },
    { value: 'diamond', label: '◇ Diamond' },
    { value: 'polygon', label: '⬡ Polygon' },
    { value: 'line', label: '╲ Line' },
    { value: 'arrow', label: '→ Arrow' }
  ];

  var _BC_FONT_OPTIONS = global._BC_FONT_OPTIONS = window._BC_FONT_OPTIONS = window._BC_FONT_OPTIONS || [];

  var _bcBuildFontSelect = global._bcBuildFontSelect = window._bcBuildFontSelect = (typeof window !== 'undefined' && typeof window._bcBuildFontSelect === 'function')
    ? window._bcBuildFontSelect
    : function (id, selectedValue, onchangeExpr) {
        const sel = document.createElement('select');
        sel.id = id;
        if (selectedValue) sel.value = selectedValue;
        return sel;
      };

  var _bcFontSelectHtml = global._bcFontSelectHtml = window._bcFontSelectHtml = (typeof window !== 'undefined' && typeof window._bcFontSelectHtml === 'function')
    ? window._bcFontSelectHtml
    : function (idAttr) {
        return `<select id="${idAttr}" class="bc-select bc-font-select"><option value="">— Default (inherit) —</option></select>`;
      };

  var _bcBuildPenPresetList = global._bcBuildPenPresetList = window._bcBuildPenPresetList = (typeof window !== 'undefined' && typeof window._bcBuildPenPresetList === 'function')
    ? window._bcBuildPenPresetList
    : function (containerId, presets) {
        if (typeof window !== 'undefined' && typeof window.conDrawInitPenPresets === 'function') {
          return window.conDrawInitPenPresets();
        }
      };

  var _bcGetPenPresets = global._bcGetPenPresets = window._bcGetPenPresets = (typeof window !== 'undefined' && typeof window._bcGetPenPresets === 'function')
    ? window._bcGetPenPresets
    : function () {
        return window._bcPenPresets || [];
      };



    // ============================================================
    // BOARD CUSTOM KEYBOARD SHORTCUTS & QUICK ACTIONS MANAGER
    // ============================================================

    const BOARD_SHORTCUTS_STORAGE_KEY = 'BOARD_CUSTOM_SHORTCUTS_V2';
    const BOARD_QUICK_ACTIONS_STORAGE_KEY = 'BOARD_QUICK_ACTIONS_V2';

    let _bcActiveRecordingActionId = null;
    let _bcRecordingKeydownHandler = null;
    let _bcShortcutsDraftMap = {};
    let _bcQuickActionsDraftList = [];

    function _boardNudgeSelected(dx, dy) {
      const conSelected = window.conGetSelected ? window.conGetSelected() : (typeof conSelected !== 'undefined' ? conSelected : (global.conSelected || null));
      const conMultiSelected = window.conGetMultiSelected ? window.conGetMultiSelected() : (typeof conMultiSelected !== 'undefined' ? conMultiSelected : (global.conMultiSelected || null));
      const conNodes = window.conGetNodes ? window.conGetNodes() : (typeof conNodes !== 'undefined' ? conNodes : (global.conNodes || []));
      const hasSelection = conSelected || (conMultiSelected && conMultiSelected.size > 0);
      if (!hasSelection) return false;
      const targets = (conMultiSelected && conMultiSelected.size > 0)
        ? conNodes.filter(n => conMultiSelected.has(n.id))
        : [conNodes.find(n => n.id === conSelected)].filter(Boolean);
      if (!targets.length) return false;
      if (typeof window.conPushUndo === 'function') window.conPushUndo();
      else if (typeof global.conPushUndo === 'function') global.conPushUndo();
      const movedPhraseGroups = new Set();
      const isLocked = typeof window.conIsNodeLocked === 'function' ? window.conIsNodeLocked : function () { return false; };
      const groupOf = typeof window.conGroupOfNode === 'function' ? window.conGroupOfNode : function () { return null; };
      const phraseLayout = typeof window.conPhraseGroupLayout === 'function' ? window.conPhraseGroupLayout : function () {};
      targets.forEach(node => {
        if (isLocked(node)) return;
        const pg = groupOf(node.id);
        if (pg && pg.phraseGroup) {
          movedPhraseGroups.add(pg);
          if ((node.phraseOrder || 0) !== 0) return;
          const anchor = conNodes.find(n => pg.nodeIds.includes(n.id) && (n.phraseOrder || 0) === 0);
          if (anchor) {
            anchor.x += dx; anchor.y += dy;
            anchor.el.style.left = anchor.x + 'px';
            anchor.el.style.top = anchor.y + 'px';
          }
        } else {
          node.x += dx; node.y += dy;
          node.el.style.left = node.x + 'px';
          node.el.style.top = node.y + 'px';
        }
      });
      movedPhraseGroups.forEach(pg => { phraseLayout(pg); });
      if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
      if (typeof window.conGroupRefitAll === 'function') window.conGroupRefitAll();
      return true;
    }

    const BOARD_ACTION_DEFINITIONS = [
      // History & File
      { id: 'history_undo', name: 'Undo', desc: 'Undo last action', category: 'history', categoryName: 'History & File', icon: '../assets/icons/rewind.svg', defaultShortcut: { ctrl: true, key: 'z' }, fn: () => { if (typeof window.conUndo === 'function') window.conUndo(); else if (typeof global.conUndo === 'function') global.conUndo(); } },
      { id: 'history_redo', name: 'Redo', desc: 'Redo last undone action', category: 'history', categoryName: 'History & File', icon: '../assets/icons/refresh.svg', defaultShortcut: { ctrl: true, key: 'y' }, fn: () => { if (typeof window.conRedo === 'function') window.conRedo(); else if (typeof global.conRedo === 'function') global.conRedo(); } },
      { id: 'file_save', name: 'Save Session', desc: 'Save board session to file', category: 'history', categoryName: 'History & File', icon: '../assets/icons/save.svg', defaultShortcut: { ctrl: true, key: 's' }, fn: () => { if (typeof window.conSaveSession === 'function') window.conSaveSession(); else if (typeof conSaveSession === 'function') conSaveSession(); } },
      { id: 'file_new', name: 'New Session', desc: 'Save current board and start a new one', category: 'history', categoryName: 'History & File', icon: '../assets/icons/plus.svg', defaultShortcut: null, fn: () => { if (typeof window.boardNewSession === 'function') window.boardNewSession('constellation'); else if (typeof boardNewSession === 'function') boardNewSession('constellation'); } },
      { id: 'file_clear', name: 'Clear Board', desc: 'Remove all words and nodes from the board', category: 'history', categoryName: 'History & File', icon: '../assets/icons/clear.svg', defaultShortcut: null, fn: () => { if (typeof window.conClearAll === 'function') window.conClearAll(); else if (typeof conClearAll === 'function') conClearAll(); } },
      { id: 'file_open_native', name: 'Open File', desc: 'Open current board file in default application', category: 'history', categoryName: 'History & File', icon: '../assets/icons/file-text.svg', defaultShortcut: null, fn: () => { if (typeof window.conOpenCurrentFileNative === 'function') window.conOpenCurrentFileNative(); else if (typeof conOpenCurrentFileNative === 'function') conOpenCurrentFileNative(); } },
      { id: 'file_open_folder', name: 'Open Location Folder', desc: 'Open folder containing current board file', category: 'history', categoryName: 'History & File', icon: '../assets/icons/folder.svg', defaultShortcut: null, fn: () => { if (typeof window.conOpenCurrentFileLocationFolder === 'function') window.conOpenCurrentFileLocationFolder(); else if (typeof conOpenCurrentFileLocationFolder === 'function') conOpenCurrentFileLocationFolder(); } },
      { id: 'file_load', name: 'Load Session', desc: 'Load a saved board file', category: 'history', categoryName: 'History & File', icon: '../assets/icons/folder.svg', defaultShortcut: null, fn: () => { if (typeof window.openSessionLoadPopup === 'function') window.openSessionLoadPopup('constellation'); else if (typeof openSessionLoadPopup === 'function') openSessionLoadPopup('constellation'); } },
      { id: 'file_export', name: 'Export Board', desc: 'Export words as PNG, CSV or PDF', category: 'history', categoryName: 'History & File', icon: '../assets/icons/export.svg', defaultShortcut: null, fn: () => { if (typeof window.conExport === 'function') window.conExport(); else if (typeof conExport === 'function') conExport(); else if (typeof window.conExportJS === 'function') window.conExportJS(); else if (typeof conExportJS === 'function') conExportJS(); } },
      { id: 'file_duplicate', name: 'Duplicate File', desc: 'Duplicate the current board file', category: 'history', categoryName: 'History & File', icon: '../assets/icons/duplicate.svg', defaultShortcut: null, fn: () => { if (typeof window.conDuplicateCurrentFile === 'function') window.conDuplicateCurrentFile(); else if (typeof conDuplicateCurrentFile === 'function') conDuplicateCurrentFile(); } },
      { id: 'file_templates', name: 'Templates', desc: 'Save or load reusable board templates', category: 'history', categoryName: 'History & File', icon: '../assets/icons/layout.svg', defaultShortcut: null, fn: () => { if (typeof window.conOpenTemplatePopup === 'function') window.conOpenTemplatePopup(); else if (typeof conOpenTemplatePopup === 'function') conOpenTemplatePopup(); } },
      { id: 'file_media', name: 'Media Attachments', desc: 'Manage media attachments', category: 'history', categoryName: 'History & File', icon: '../assets/icons/media.svg', defaultShortcut: null, fn: () => { const btn = document.getElementById('con-manage-media-btn'); if (typeof window.conOpenManageMediaChooser === 'function') window.conOpenManageMediaChooser(btn); else if (typeof conOpenManageMediaChooser === 'function') conOpenManageMediaChooser(btn); } },
      { id: 'file_competences', name: 'Competence Tags', desc: 'Add or manage competence tags for this board', category: 'history', categoryName: 'History & File', icon: '../assets/icons/award.svg', defaultShortcut: null, fn: () => { if (typeof window.conOpenCompetenceModal === 'function') window.conOpenCompetenceModal('board'); else if (typeof conOpenCompetenceModal === 'function') conOpenCompetenceModal('board'); } },
      { id: 'node_competences', name: 'Tag Node Competences', desc: 'Attach competence tags to selected node', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/award.svg', defaultShortcut: null, fn: () => { if (typeof window.conCtxOpenCompetenceModal === 'function') window.conCtxOpenCompetenceModal(); else if (typeof conCtxOpenCompetenceModal === 'function') conCtxOpenCompetenceModal(); } },

      // Selection & Manipulation
      { id: 'select_all', name: 'Select All', desc: 'Select all items on the board', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/check.svg', defaultShortcut: { ctrl: true, key: 'a' }, fn: () => {
        if (typeof window.conSelectAll === 'function') window.conSelectAll();
        else if (typeof window.conSelectAllNodes === 'function') window.conSelectAllNodes();
      } },
      { id: 'deselect_all', name: 'Deselect / Cancel', desc: 'Deselect all items or cancel current active tool', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/close.svg', defaultShortcut: { key: 'Escape' }, fn: () => {
        const fsMedia = document.querySelector('.con-media-item.con-media-fullscreen');
        if (fsMedia) {
          const fsExit = fsMedia.querySelector('.con-media-fullscreen-exit-btn');
          if (fsExit) { fsExit.click(); return; }
        }
        if (document.body && document.body.classList.contains('laser-active')) { if (typeof window.laserToggle === 'function') window.laserToggle(); return; }
        if (typeof window.conIsLinkModeActive === 'function' && window.conIsLinkModeActive()) { if (typeof window.conCancelLinkMode === 'function') window.conCancelLinkMode(); return; }
        if (typeof window.conGetMode === 'function' && window.conGetMode() === 'draw') { if (typeof window.conSetMode === 'function') window.conSetMode('move'); return; }
        if (typeof _taDrawActive !== 'undefined' && _taDrawActive && typeof window.taToggleDrawMode === 'function') { window.taToggleDrawMode(); return; }
        if (typeof window.conCtxClose === 'function') window.conCtxClose();
        if (typeof window.conCloseNodeWordCard === 'function') window.conCloseNodeWordCard();
        if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
        if (typeof window.conEdgeCtxClose === 'function') window.conEdgeCtxClose();
        if (typeof window.conMaskCtxClose === 'function') window.conMaskCtxClose();
        if (typeof window.conCloseNoteConvertModal === 'function') window.conCloseNoteConvertModal();
        if (typeof window.conRelPickerClose === 'function') window.conRelPickerClose();
        if (typeof window.conDefPickerClose === 'function') window.conDefPickerClose();
        if (typeof window.conTransPickerClose === 'function') window.conTransPickerClose();
        if (typeof window.conMergeChoiceCancel === 'function') window.conMergeChoiceCancel();
        if (typeof window.conImgConvertClose === 'function') window.conImgConvertClose();
        if (typeof window.conPdfPagePickerClose === 'function') window.conPdfPagePickerClose();
        if (typeof window.conDeselectAll === 'function') window.conDeselectAll();
      } },
      { id: 'delete_selected', name: 'Delete Selected', desc: 'Delete selected nodes, notes, or groups', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/delete.svg', defaultShortcut: { key: 'Delete' }, fn: () => {
        if (typeof window.conDeleteSelectedItems === 'function') window.conDeleteSelectedItems();
        else if (typeof window.conDeleteSelected === 'function') window.conDeleteSelected();
      } },
      { id: 'duplicate_selected', name: 'Duplicate Selected', desc: 'Duplicate selected nodes and notes', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/duplicate.svg', defaultShortcut: null, fn: () => {
        if (typeof window.conDuplicateSelected === 'function') window.conDuplicateSelected();
        else if (typeof window.conClipboardCopy === 'function' && typeof window.conClipboardPaste === 'function') {
          window.conClipboardCopy(); window.conClipboardPaste();
        }
      } },
      { id: 'group_selected', name: 'Group Selected', desc: 'Group selected nodes together', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/group.svg', defaultShortcut: { ctrl: true, key: 'g' }, fn: () => { if (typeof window.conGroupSelected === 'function') window.conGroupSelected(); } },
      { id: 'group_selected_invisible', name: 'Group Selected (Invisible)', desc: 'Group selected nodes together without border or background', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/group.svg', defaultShortcut: { ctrl: true, shift: true, key: 'g' }, fn: () => { if (typeof window.conGroupSelected === 'function') window.conGroupSelected(true); } },
      { id: 'ungroup_selected', name: 'Ungroup Group', desc: 'Ungroup currently focused group', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/groups.svg', defaultShortcut: null, fn: () => { const grp = window.conGetGroupFocused ? window.conGetGroupFocused() : null; if (grp && typeof window.conGroupUngroup === 'function') window.conGroupUngroup(grp); } },
      { id: 'toggle_mask', name: 'Hide / Reveal Selected', desc: 'Toggle mask visibility for selected nodes and notes', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/mask.svg', defaultShortcut: { ctrl: true, key: 'h' }, fn: () => {
        if (typeof window.conToggleMaskSelected === 'function') window.conToggleMaskSelected();
      } },
      { id: 'toggle_mask_all', name: 'Hide / Reveal All Words', desc: 'Hide or reveal all words on the board', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/eye.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleMaskAll === 'function') window.conToggleMaskAll(); else if (typeof conToggleMaskAll === 'function') conToggleMaskAll(); } },
      { id: 'add_mask_box', name: 'Add Mask Rectangle', desc: 'Add a movable mask overlay box', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/mask.svg', defaultShortcut: null, fn: () => { if (typeof window.conAddMask === 'function') window.conAddMask(); else if (typeof conAddMask === 'function') conAddMask(); } },
      { id: 'add_table', name: 'Add Table', desc: 'Add an editable table to the board', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/table.svg', defaultShortcut: null, fn: () => { if (typeof window.conAddTableDialog === 'function') window.conAddTableDialog(); else if (typeof conAddTableDialog === 'function') conAddTableDialog(); } },
      { id: 'toggle_snap', name: 'Toggle Snap to Align', desc: 'Toggle snapping when dragging nodes', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/snap.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleSnap === 'function') window.conToggleSnap(); else if (typeof conToggleSnap === 'function') conToggleSnap(); } },
      { id: 'spread_nodes', name: 'Spread Words', desc: 'Spread selected words to remove overlaps', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/spread.svg', defaultShortcut: null, fn: () => { if (typeof window.conCtxSpreadSelected === 'function') window.conCtxSpreadSelected(); } },
      { id: 'compact_nodes', name: 'Compact Words', desc: 'Compact words closer together without overlapping', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/compact.svg', defaultShortcut: null, fn: () => { if (typeof window.conCompactNodes === 'function') window.conCompactNodes(); } },
      { id: 'save_to_library', name: 'Save to Premade Library', desc: 'Save selected elements to the premade library', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/sparkles.svg', defaultShortcut: null, fn: () => { if (typeof window.conSaveSelectionToLibraryPrompt === 'function') window.conSaveSelectionToLibraryPrompt(); } },
      { id: 'note_count_words', name: 'Count Note Words', desc: 'Count words in selected or active note', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/sentence.svg', defaultShortcut: null, fn: () => { if (typeof window.wnStyleCountWords === 'function') window.wnStyleCountWords(); else if (typeof wnStyleCountWords === 'function') wnStyleCountWords(); } },
      { id: 'rotate_node_90', name: 'Rotate Node 90°', desc: 'Rotate selected node(s) 90 degrees clockwise', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/refresh.svg', defaultShortcut: null, fn: () => { if (typeof window.conRotateSelectedNodes === 'function') window.conRotateSelectedNodes(90); } },
      { id: 'node_set_page', name: 'Set Page Number', desc: 'Set or edit page number for selected node', category: 'selection', categoryName: 'Selection & Edit', icon: '../assets/icons/page-number.svg', defaultShortcut: null, fn: () => { if (typeof window.conCtxSetPage === 'function') window.conCtxSetPage(); else if (typeof conCtxSetPage === 'function') conCtxSetPage(); } },

      // Clipboard
      { id: 'clipboard_copy', name: 'Copy', desc: 'Copy selected nodes or notes', category: 'clipboard', categoryName: 'Clipboard', icon: '../assets/icons/copy.svg', defaultShortcut: { ctrl: true, key: 'c' }, fn: () => { if (typeof window.conClipboardCopy === 'function') window.conClipboardCopy({ allowWhileTyping: false }); } },
      { id: 'clipboard_cut', name: 'Cut', desc: 'Cut selected nodes or notes', category: 'clipboard', categoryName: 'Clipboard', icon: '../assets/icons/split.svg', defaultShortcut: { ctrl: true, key: 'x' }, fn: () => { if (typeof window.conClipboardCut === 'function') window.conClipboardCut({ allowWhileTyping: false }); } },
      { id: 'clipboard_paste', name: 'Paste', desc: 'Paste copied nodes, notes or clipboard images', category: 'clipboard', categoryName: 'Clipboard', icon: '../assets/icons/paste.svg', defaultShortcut: { ctrl: true, key: 'v' }, fn: () => { if (typeof window.conClipboardPaste === 'function') window.conClipboardPaste(); } },

      // Modes & Drawing Tools
      { id: 'mode_move', name: 'Text / Selection Mode', desc: 'Switch to text selection and moving mode', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/text.svg', defaultShortcut: { ctrl: true, key: 'w' }, fn: () => { if (typeof window.conSetMode === 'function') window.conSetMode('move'); else if (typeof window.setBoardMode === 'function') window.setBoardMode('text'); else if (typeof setBoardMode === 'function') setBoardMode('text'); } },
      { id: 'mode_draw', name: 'Toggle Drawing Pen', desc: 'Toggle freehand drawing annotation pen', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/draw.svg', defaultShortcut: { ctrl: true, key: 'd' }, fn: () => { if (typeof window.conToggleDrawMode === 'function') window.conToggleDrawMode(); else if (typeof window.setBoardMode === 'function') window.setBoardMode('drawings'); else if (typeof setBoardMode === 'function') setBoardMode('drawings'); } },
      { id: 'mode_hand', name: 'Toggle Hand / Pan Tool', desc: 'Toggle hand tool to pan board or move drawings', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/hand.svg', defaultShortcut: { key: 'h' }, fn: () => {
        if (typeof window.conToggleHandMode === 'function') window.conToggleHandMode();
        else if (typeof window.setBoardMode === 'function') {
          if (window.conMode === 'draw' && window._conDrawHandMode) window.setBoardMode('text');
          else window.setBoardMode('hand');
        } else if (typeof setBoardMode === 'function') {
          if (typeof conMode !== 'undefined' && conMode === 'draw' && typeof _conDrawHandMode !== 'undefined' && _conDrawHandMode) {
            setBoardMode('text');
          } else {
            setBoardMode('hand');
          }
        }
      } },
      { id: 'mode_laser', name: 'Toggle Laser Pointer', desc: 'Toggle interactive laser pointer', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/laser.svg', defaultShortcut: null, fn: () => { if (typeof window.laserToggle === 'function') window.laserToggle(); else if (typeof window.setBoardMode === 'function') window.setBoardMode('laser'); else if (typeof setBoardMode === 'function') setBoardMode('laser'); } },
      { id: 'mode_link', name: 'Link / Connect Nodes', desc: 'Connect selected node or note to another', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/zap.svg', defaultShortcut: { ctrl: true, key: 'j' }, fn: () => {
        if (typeof window.conTriggerLinkShortcut === 'function') window.conTriggerLinkShortcut();
      } },
      { id: 'tool_eraser', name: 'Toggle Drawing Eraser', desc: 'Toggle drawing eraser mode', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/eraser.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleEraserMode === 'function') window.conToggleEraserMode(); else if (typeof conToggleEraserMode === 'function') conToggleEraserMode(); } },

      // Presentation & View Modes
      { id: 'board_search', name: 'Search Board', desc: 'Search words, notes, tables and groups on the board', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/search.svg', defaultShortcut: { ctrl: true, key: 'f' }, fn: () => { if (typeof window.conOpenSearchModal === 'function') window.conOpenSearchModal(); } },
      { id: 'open_presentation', name: 'Open Presentation Window', desc: 'Open presentation mode window on secondary display', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/presentation.svg', defaultShortcut: null, fn: () => { if (typeof window.conOpenMirrorWindow === 'function') window.conOpenMirrorWindow(); else if (typeof conOpenMirrorWindow === 'function') conOpenMirrorWindow(); } },
      { id: 'close_presentation', name: 'Close Presentation Window', desc: 'Close active presentation mode window', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/monitor.svg', defaultShortcut: null, fn: () => { if (typeof window.conCloseMirrorWindow === 'function') window.conCloseMirrorWindow(); else if (typeof conCloseMirrorWindow === 'function') conCloseMirrorWindow(); } },
      { id: 'freeze_presentation', name: 'Freeze Presentation', desc: 'Freeze or unfreeze presentation window', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/snowflake.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleMirrorFreeze === 'function') window.conToggleMirrorFreeze(); else if (typeof conToggleMirrorFreeze === 'function') conToggleMirrorFreeze(); } },
      { id: 'pin_presentation', name: 'Always on Top', desc: 'Keep presentation window always on top', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/pin.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleMirrorAlwaysOnTop === 'function') window.conToggleMirrorAlwaysOnTop(); else if (typeof conToggleMirrorAlwaysOnTop === 'function') conToggleMirrorAlwaysOnTop(); } },
      { id: 'mouse_pointer', name: 'Mouse Light Pointer (Presentation)', desc: 'Show mouse position as red laser light dot on the board and in presentation display', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/laser.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleMirrorPointer === 'function') window.conToggleMirrorPointer(); else if (typeof conToggleMirrorPointer === 'function') conToggleMirrorPointer(); } },
      { id: 'tool_dictate', name: 'Voice Dictation (STT)', desc: 'Toggle speech-to-text voice dictation into notes or words', category: 'modes', categoryName: 'Modes & Tools', icon: '../assets/icons/mic.svg', defaultShortcut: { ctrl: true, alt: true, key: 'v' }, fn: () => { if (typeof window.boardToggleDictation === 'function') window.boardToggleDictation(); else if (typeof boardToggleDictation === 'function') boardToggleDictation(); } },
      { id: 'tool_record', name: 'Record Board Video', desc: 'Record live video and microphone audio of the board', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/record.svg', defaultShortcut: null, fn: () => { if (typeof window.boardVideoOpenSetup === 'function') window.boardVideoOpenSetup(); else if (typeof boardVideoOpenSetup === 'function') boardVideoOpenSetup(); } },
      { id: 'zoom_in', name: 'Zoom In', desc: 'Increase board zoom by 10%', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/zoom-in.svg', defaultShortcut: null, fn: () => { if (typeof window.updateZoom === 'function') window.updateZoom((window.conCurrentZoom || 1) + 0.1); else if (typeof updateZoom === 'function') updateZoom((window.conCurrentZoom || 1) + 0.1); } },
      { id: 'zoom_out', name: 'Zoom Out', desc: 'Decrease board zoom by 10%', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/zoom-out.svg', defaultShortcut: null, fn: () => { if (typeof window.updateZoom === 'function') window.updateZoom((window.conCurrentZoom || 1) - 0.1); else if (typeof updateZoom === 'function') updateZoom((window.conCurrentZoom || 1) - 0.1); } },
      { id: 'zoom_reset', name: 'Reset Zoom', desc: 'Reset zoom to 100%', category: 'presentation', categoryName: 'Presentation & View', icon: '../assets/icons/maximize.svg', defaultShortcut: null, fn: () => { if (typeof window.updateZoom === 'function') window.updateZoom(1); else if (typeof updateZoom === 'function') updateZoom(1); } },

      // Vocab & Language Tools
      { id: 'vocab_import', name: 'Import Vocab Words', desc: 'Import words from word bank database', category: 'vocab', categoryName: 'Vocab & Language', icon: '../assets/icons/import.svg', defaultShortcut: null, fn: () => { if (typeof window.conImportOpen === 'function') window.conImportOpen(); else if (typeof conImportOpen === 'function') conImportOpen(); } },
      { id: 'vocab_unknown', name: 'List Unknown Words', desc: 'List all words not in database', category: 'vocab', categoryName: 'Vocab & Language', icon: '../assets/icons/search.svg', defaultShortcut: null, fn: () => { if (typeof window.unknownWordsOpen === 'function') window.unknownWordsOpen('constellation'); else if (typeof unknownWordsOpen === 'function') unknownWordsOpen('constellation'); } },
      { id: 'vocab_toggle_ipa', name: 'Toggle IPA Pronunciation', desc: 'Show or hide IPA for all words', category: 'vocab', categoryName: 'Vocab & Language', icon: '../assets/icons/ipa.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleAllIpa === 'function') window.conToggleAllIpa(); else if (typeof conToggleAllIpa === 'function') conToggleAllIpa(); } },
      { id: 'vocab_ipa_keyboard', name: 'IPA Phonetic Keyboard', desc: 'Toggle the International Phonetic Alphabet keyboard (Alt+I)', category: 'vocab', categoryName: 'Vocab & Language', icon: '../assets/icons/ipa.svg', defaultShortcut: { alt: true, key: 'i' }, fn: () => { if (typeof window.boardToggleIpaKeyboard === 'function') window.boardToggleIpaKeyboard(); else if (typeof boardToggleIpaKeyboard === 'function') boardToggleIpaKeyboard(); } },
      { id: 'vocab_toggle_fr', name: 'Toggle French Translation', desc: 'Show or hide French translation for all words', category: 'vocab', categoryName: 'Vocab & Language', icon: '../assets/icons/french.svg', defaultShortcut: null, fn: () => { if (typeof window.conToggleAllFrench === 'function') window.conToggleAllFrench(); else if (typeof conToggleAllFrench === 'function') conToggleAllFrench(); } },
      { id: 'vocab_export_db', name: 'Export to Word Bank', desc: 'Export board words into a custom word bank database', category: 'vocab', categoryName: 'Vocab & Language', icon: '../assets/icons/add-db.svg', defaultShortcut: null, fn: () => { if (typeof window.conDbExportOpen === 'function') window.conDbExportOpen(); else if (typeof conDbExportOpen === 'function') conDbExportOpen(); } },

      // Text & Formatting
      { id: 'font_size_increase', name: 'Increase Node Font Size', desc: 'Increase font size for selected nodes', category: 'formatting', categoryName: 'Text & Formatting', symbol: 'A+', defaultShortcut: { ctrl: true, key: 'ArrowUp' }, fn: () => {
        if (typeof window.conAdjustSelectedFontSize === 'function') window.conAdjustSelectedFontSize(1);
      } },
      { id: 'font_size_decrease', name: 'Decrease Node Font Size', desc: 'Decrease font size for selected nodes', category: 'formatting', categoryName: 'Text & Formatting', symbol: 'A-', defaultShortcut: { ctrl: true, key: 'ArrowDown' }, fn: () => {
        if (typeof window.conAdjustSelectedFontSize === 'function') window.conAdjustSelectedFontSize(-1);
      } },
      { id: 'align_left', name: 'Align Left', desc: 'Align selected nodes to left edge', category: 'formatting', categoryName: 'Text & Formatting', icon: '../assets/icons/arrow-left.svg', defaultShortcut: { ctrl: true, key: 'ArrowLeft' }, fn: () => { if (typeof window.conCtxAlignSelected === 'function') window.conCtxAlignSelected('vertical', 'left'); else if (typeof conCtxAlignSelected === 'function') conCtxAlignSelected('vertical', 'left'); } },
      { id: 'align_right', name: 'Align Right', desc: 'Align selected nodes to right edge', category: 'formatting', categoryName: 'Text & Formatting', icon: '../assets/icons/arrow-right.svg', defaultShortcut: { ctrl: true, key: 'ArrowRight' }, fn: () => { if (typeof window.conCtxAlignSelected === 'function') window.conCtxAlignSelected('vertical', 'right'); else if (typeof conCtxAlignSelected === 'function') conCtxAlignSelected('vertical', 'right'); } },
      { id: 'align_center', name: 'Align Center', desc: 'Align selected nodes horizontally center', category: 'formatting', categoryName: 'Text & Formatting', symbol: '⫿', defaultShortcut: null, fn: () => { if (typeof window.conCtxAlignSelected === 'function') window.conCtxAlignSelected('vertical', 'center'); else if (typeof conCtxAlignSelected === 'function') conCtxAlignSelected('vertical', 'center'); } },
      { id: 'align_top', name: 'Align Top', desc: 'Align selected nodes to top edge', category: 'formatting', categoryName: 'Text & Formatting', symbol: '⊼', defaultShortcut: null, fn: () => { if (typeof window.conCtxAlignSelected === 'function') window.conCtxAlignSelected('horizontal', 'top'); else if (typeof conCtxAlignSelected === 'function') conCtxAlignSelected('horizontal', 'top'); } },
      { id: 'align_bottom', name: 'Align Bottom', desc: 'Align selected nodes to bottom edge', category: 'formatting', categoryName: 'Text & Formatting', symbol: '⊻', defaultShortcut: null, fn: () => { if (typeof window.conCtxAlignSelected === 'function') window.conCtxAlignSelected('horizontal', 'bottom'); else if (typeof conCtxAlignSelected === 'function') conCtxAlignSelected('horizontal', 'bottom'); } },

      // Movement & Nudging
      { id: 'nudge_up', name: 'Nudge 1px Up', desc: 'Nudge selected nodes 1px up', category: 'movement', categoryName: 'Movement & Nudging', symbol: '↑', defaultShortcut: { key: 'ArrowUp' }, fn: () => { return _boardNudgeSelected(0, -1); } },
      { id: 'nudge_down', name: 'Nudge 1px Down', desc: 'Nudge selected nodes 1px down', category: 'movement', categoryName: 'Movement & Nudging', symbol: '↓', defaultShortcut: { key: 'ArrowDown' }, fn: () => { return _boardNudgeSelected(0, 1); } },
      { id: 'nudge_left', name: 'Nudge 1px Left', desc: 'Nudge selected nodes 1px left', category: 'movement', categoryName: 'Movement & Nudging', symbol: '←', defaultShortcut: { key: 'ArrowLeft' }, fn: () => { return _boardNudgeSelected(-1, 0); } },
      { id: 'nudge_right', name: 'Nudge 1px Right', desc: 'Nudge selected nodes 1px right', category: 'movement', categoryName: 'Movement & Nudging', symbol: '→', defaultShortcut: { key: 'ArrowRight' }, fn: () => { return _boardNudgeSelected(1, 0); } },
      { id: 'nudge_fast_up', name: 'Fast Nudge 10px Up', desc: 'Nudge selected nodes 10px up', category: 'movement', categoryName: 'Movement & Nudging', symbol: '⇑', defaultShortcut: { shift: true, key: 'ArrowUp' }, fn: () => { return _boardNudgeSelected(0, -10); } },
      { id: 'nudge_fast_down', name: 'Fast Nudge 10px Down', desc: 'Nudge selected nodes 10px down', category: 'movement', categoryName: 'Movement & Nudging', symbol: '⇓', defaultShortcut: { shift: true, key: 'ArrowDown' }, fn: () => { return _boardNudgeSelected(0, 10); } },
      { id: 'nudge_fast_left', name: 'Fast Nudge 10px Left', desc: 'Nudge selected nodes 10px left', category: 'movement', categoryName: 'Movement & Nudging', symbol: '⇐', defaultShortcut: { shift: true, key: 'ArrowLeft' }, fn: () => { return _boardNudgeSelected(-10, 0); } },
      { id: 'nudge_fast_right', name: 'Fast Nudge 10px Right', desc: 'Nudge selected nodes 10px right', category: 'movement', categoryName: 'Movement & Nudging', symbol: '⇒', defaultShortcut: { shift: true, key: 'ArrowRight' }, fn: () => { return _boardNudgeSelected(10, 0); } },

      // Creation & Pages
      { id: 'create_note', name: 'Add Sticky Note', desc: 'Create a new sticky note on the board', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/note.svg', defaultShortcut: null, fn: () => { if (typeof window.wnCreateNote === 'function') window.wnCreateNote(); else if (typeof wnCreateNote === 'function') wnCreateNote(); } },
      { id: 'page_add', name: 'Add Page', desc: 'Add a new page to current board', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/plus.svg', defaultShortcut: null, fn: () => { if (window.conAddPage) window.conAddPage(); } },
      { id: 'page_copy', name: 'Copy Current Page', desc: 'Copy current page', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/copy.svg', defaultShortcut: null, fn: () => { if (window.conCopyPage) window.conCopyPage(); } },
      { id: 'page_paste', name: 'Paste Page', desc: 'Paste copied page', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/paste.svg', defaultShortcut: null, fn: () => { if (window.conPastePage) window.conPastePage(); } },
      { id: 'page_preview', name: 'Preview & Manage Pages', desc: 'Open page preview and organizer', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/page-number.svg', defaultShortcut: null, fn: () => { if (typeof window.conOpenPagePreview === 'function') window.conOpenPagePreview(); else if (typeof conOpenPagePreview === 'function') conOpenPagePreview(); } },
      { id: 'page_prev', name: 'Previous Page', desc: 'Navigate to previous page', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/arrow-left.svg', defaultShortcut: null, fn: () => { if (window.conGoToPrevPage) window.conGoToPrevPage(); } },
      { id: 'page_next', name: 'Next Page', desc: 'Navigate to next page', category: 'creation', categoryName: 'Creation & Pages', icon: '../assets/icons/arrow-right.svg', defaultShortcut: null, fn: () => { if (window.conGoToNextPage) window.conGoToNextPage(); } },

      // Modals & Settings
      { id: 'open_customise', name: 'Customise Board', desc: 'Open board customization modal', category: 'modals', categoryName: 'Modals & Settings', icon: '../assets/icons/palette.svg', defaultShortcut: null, fn: () => { if (typeof window.boardCustomiseOpen === 'function') window.boardCustomiseOpen(); else if (typeof boardCustomiseOpen === 'function') boardCustomiseOpen(); } },
      { id: 'open_shortcuts_help', name: 'Keyboard Shortcuts Help', desc: 'Open keyboard shortcuts helper modal', category: 'modals', categoryName: 'Modals & Settings', icon: '../assets/icons/how-to.svg', defaultShortcut: null, fn: () => { if (typeof window.openBoardShortcuts === 'function') window.openBoardShortcuts(); else if (typeof openBoardShortcuts === 'function') openBoardShortcuts(); } }
    ];

    function getBoardCustomShortcutsMap() {
      const cfg = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      if (cfg && cfg.shortcuts && typeof cfg.shortcuts === 'object' && !Array.isArray(cfg.shortcuts) && Object.keys(cfg.shortcuts).length > 0) {
        return { ...cfg.shortcuts };
      }
      try {
        const raw = localStorage.getItem(BOARD_SHORTCUTS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    function saveBoardCustomShortcutsMap(map) {
      try {
        localStorage.setItem(BOARD_SHORTCUTS_STORAGE_KEY, JSON.stringify(map));
      } catch (e) { }
      if (typeof window !== 'undefined') {
        if (!window.BOARD_CONFIG || typeof window.BOARD_CONFIG !== 'object') window.BOARD_CONFIG = {};
        window.BOARD_CONFIG.shortcuts = { ...map };
      }
    }

    function getBoardQuickActionsList() {
      const cfg = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      if (cfg && Array.isArray(cfg.quickActions) && cfg.quickActions.length > 0) {
        return [...cfg.quickActions];
      }
      try {
        const raw = localStorage.getItem(BOARD_QUICK_ACTIONS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    function saveBoardQuickActionsList(list) {
      try {
        localStorage.setItem(BOARD_QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) { }
      if (typeof window !== 'undefined') {
        if (!window.BOARD_CONFIG || typeof window.BOARD_CONFIG !== 'object') window.BOARD_CONFIG = {};
        window.BOARD_CONFIG.quickActions = [...list];
      }
    }

    function getActiveShortcutForDef(def, customMap = null) {
      const map = customMap || getBoardCustomShortcutsMap();
      if (map[def.id] !== undefined) return map[def.id];
      return def.defaultShortcut;
    }

    function formatShortcutKeysList(sc) {
      if (!sc || !sc.key) return [];
      const list = [];
      if (sc.ctrl) list.push('Ctrl');
      if (sc.alt) list.push('Alt');
      if (sc.shift) list.push('Shift');
      let k = String(sc.key);
      if (k === ' ') k = 'Space';
      else if (k.toLowerCase() === 'arrowleft') k = '←';
      else if (k.toLowerCase() === 'arrowright') k = '→';
      else if (k.toLowerCase() === 'arrowup') k = '↑';
      else if (k.toLowerCase() === 'arrowdown') k = '↓';
      else if (k.length === 1) k = k.toUpperCase();
      list.push(k);
      return list;
    }

    function formatShortcutKeyHtml(sc) {
      const keys = formatShortcutKeysList(sc);
      if (!keys.length) {
        return '<span style="color:#94a3b8; font-style:italic;">Unassigned</span>';
      }
      return keys.map(k => '<kbd>' + k + '</kbd>').join(' + ');
    }

    function shortcutKeysMatch(scA, scB) {
      if (!scA || !scB || !scA.key || !scB.key) return false;
      return !!scA.ctrl === !!scB.ctrl &&
             !!scA.alt === !!scB.alt &&
             !!scA.shift === !!scB.shift &&
             String(scA.key).toLowerCase() === String(scB.key).toLowerCase();
    }

    function findShortcutConflict(defId, sc, customMap) {
      if (!sc || !sc.key) return null;
      for (const other of BOARD_ACTION_DEFINITIONS) {
        if (other.id === defId) continue;
        const otherSc = getActiveShortcutForDef(other, customMap);
        if (shortcutKeysMatch(sc, otherSc)) {
          return other.name;
        }
      }
      return null;
    }

    function renderQuickActionsToolbar() {
      const group = document.getElementById('con-tb-quick-actions');
      const barWrap = document.getElementById('con-quick-actions-bar-wrap');
      const bar = document.getElementById('con-quick-actions-bar');
      const menuList = document.getElementById('con-quick-actions-menu-list');
      const ctxPinnedSec = document.getElementById('con-board-ctx-pinned-section');
      const ctxPinnedList = document.getElementById('con-board-ctx-pinned-list');

      const pinnedIds = getBoardQuickActionsList();
      if (!pinnedIds || !pinnedIds.length) {
        if (group) group.style.display = 'none';
        if (barWrap) barWrap.style.display = 'none';
        if (bar) bar.innerHTML = '';
        if (menuList) menuList.innerHTML = '';
        if (ctxPinnedSec) ctxPinnedSec.style.display = 'none';
        if (ctxPinnedList) ctxPinnedList.innerHTML = '';
        return;
      }

      if (group) group.style.display = '';
      if (barWrap) barWrap.style.display = 'inline-flex';
      if (ctxPinnedSec) ctxPinnedSec.style.display = '';

      const customMap = getBoardCustomShortcutsMap();

      // 1. Populate compact toolbar buttons
      if (bar) {
        bar.innerHTML = '';
        pinnedIds.forEach(id => {
          const def = BOARD_ACTION_DEFINITIONS.find(a => a.id === id);
          if (!def) return;
          const sc = getActiveShortcutForDef(def, customMap);
          const scText = sc && sc.key ? ' (' + formatShortcutKeysList(sc).join('+') + ')' : '';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'action-btn btn-grey con-quick-action-btn';
          btn.dataset.action = def.id;
          btn.title = def.name + ' — ' + def.desc + scText;
          if (def.id === 'mouse_pointer' && (window._mirrorPointerOn || (typeof _mirrorPointerOn !== 'undefined' && _mirrorPointerOn))) {
            btn.classList.add('laser-btn-active', 'con-quick-active');
          }
          if (def.icon) {
            const img = document.createElement('img');
            img.src = def.icon;
            img.className = 'btn-icon';
            img.alt = '';
            btn.appendChild(img);
          } else if (def.symbol) {
            const span = document.createElement('span');
            span.style.fontWeight = '700';
            span.style.fontSize = '0.74rem';
            span.textContent = def.symbol;
            btn.appendChild(span);
          } else {
            const span = document.createElement('span');
            span.style.fontWeight = '700';
            span.style.fontSize = '0.68rem';
            span.textContent = (def.name || '').slice(0, 2);
            btn.appendChild(span);
          }
          btn.onclick = (e) => {
            e.stopPropagation();
            if (typeof def.fn === 'function') def.fn();
          };
          bar.appendChild(btn);
        });
      }

      // 2. Populate toolbar dropdown menu list
      if (menuList) {
        menuList.innerHTML = '';
        pinnedIds.forEach(id => {
          const def = BOARD_ACTION_DEFINITIONS.find(a => a.id === id);
          if (!def) return;
          const sc = getActiveShortcutForDef(def, customMap);
          const scBadge = sc && sc.key ? `<span class="con-tb-shortcut-badge">${formatShortcutKeysList(sc).join('+')}</span>` : '';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'action-btn btn-grey con-menu-action-item';
          btn.dataset.action = def.id;
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'space-between';
          btn.style.width = '100%';
          btn.style.gap = '8px';
          btn.title = def.desc;
          if (def.id === 'mouse_pointer' && (window._mirrorPointerOn || (typeof _mirrorPointerOn !== 'undefined' && _mirrorPointerOn))) {
            btn.classList.add('laser-btn-active', 'con-quick-active');
          }

          let iconHtml = '';
          if (def.icon) {
            iconHtml = `<img src="${def.icon}" class="btn-icon" alt="" />`;
          } else if (def.symbol) {
            iconHtml = `<span style="font-weight:700; font-size:0.8rem; width:14px; text-align:center;">${def.symbol}</span>`;
          }

          btn.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
              ${iconHtml}
              <span>${def.name}</span>
            </div>
            ${scBadge}
          `;
          btn.onclick = (e) => {
            e.stopPropagation();
            if (typeof def.fn === 'function') def.fn();
          };
          menuList.appendChild(btn);
        });
      }

      // 3. Populate board right-click context menu pinned list
      if (ctxPinnedList) {
        ctxPinnedList.innerHTML = '';
        pinnedIds.forEach(id => {
          const def = BOARD_ACTION_DEFINITIONS.find(a => a.id === id);
          if (!def) return;
          const sc = getActiveShortcutForDef(def, customMap);
          const scBadge = sc && sc.key ? `<span class="con-ctx-shortcut-badge" style="margin-left:auto; font-size:0.65rem; color:#888; font-weight:600; padding:1px 4px; background:#e5e5e0; border-radius:3px;">${formatShortcutKeysList(sc).join('+')}</span>` : '';
          const item = document.createElement('div');
          item.className = 'con-ctx-item con-ctx-pinned-item';
          item.dataset.action = def.id;
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '6px';
          
          let iconHtml = '';
          if (def.icon) {
            iconHtml = `<img src="${def.icon}" class="btn-icon" alt="" />`;
          } else if (def.symbol) {
            iconHtml = `<span style="font-weight:700; width:14px; text-align:center;">${def.symbol}</span>`;
          }

          item.innerHTML = `
            ${iconHtml}
            <span>${def.name}</span>
            ${scBadge}
          `;
          item.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.conBoardCtxClose === 'function') window.conBoardCtxClose();
            if (typeof def.fn === 'function') def.fn();
          };
          ctxPinnedList.appendChild(item);
        });
      }
    }

    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderQuickActionsToolbar);
      } else {
        setTimeout(renderQuickActionsToolbar, 10);
      }
    }

    window.renderQuickActionsToolbar = renderQuickActionsToolbar;
    window.boardExecuteActionById = function (actionId) {
      const def = BOARD_ACTION_DEFINITIONS.find(a => a.id === actionId);
      if (def && typeof def.fn === 'function') def.fn();
    };

    function _cancelRecording() {
      if (_bcRecordingKeydownHandler) {
        document.removeEventListener('keydown', _bcRecordingKeydownHandler, true);
        _bcRecordingKeydownHandler = null;
      }
      _bcActiveRecordingActionId = null;
    }

    function startRecordingBoardShortcut(actionId) {
      _cancelRecording();
      _bcActiveRecordingActionId = actionId;
      renderBoardShortcutsTable();

      _bcRecordingKeydownHandler = function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          _cancelRecording();
          renderBoardShortcutsTable();
          return;
        }
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const ctrl = !!(e.ctrlKey || e.metaKey);
        const alt = !!e.altKey;
        const shift = !!e.shiftKey;
        let key = e.key;
        if (key === ' ' || key === 'Spacebar') key = 'Space';

        _bcShortcutsDraftMap[_bcActiveRecordingActionId] = { ctrl, alt, shift, key };
        _cancelRecording();
        renderBoardShortcutsTable();
      };

      document.addEventListener('keydown', _bcRecordingKeydownHandler, true);
    }

    function clearBoardShortcut(actionId) {
      _cancelRecording();
      _bcShortcutsDraftMap[actionId] = null;
      renderBoardShortcutsTable();
    }

    function toggleBoardQuickActionPin(actionId, isPinned) {
      if (isPinned) {
        if (!_bcQuickActionsDraftList.includes(actionId)) _bcQuickActionsDraftList.push(actionId);
      } else {
        _bcQuickActionsDraftList = _bcQuickActionsDraftList.filter(id => id !== actionId);
      }
      renderBoardShortcutsTable();
    }

    function boardFilterShortcutsTable() {
      renderBoardShortcutsTable();
    }

    function resetBoardShortcutsToDefault() {
      _cancelRecording();
      _bcShortcutsDraftMap = {};
      _bcQuickActionsDraftList = [];
      renderBoardShortcutsTable();
    }

    function renderBoardShortcutsTable() {
      const container = document.getElementById('bc-shortcuts-table-container');
      if (!container) return;

      const searchInput = document.getElementById('bc-shortcuts-search');
      const catFilter = document.getElementById('bc-shortcuts-cat-filter');
      const search = (searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '');
      const cat = (catFilter ? catFilter.value : 'all');

      let hasAnyConflict = false;
      let rowsHtml = '';

      const filtered = BOARD_ACTION_DEFINITIONS.filter(def => {
        if (cat !== 'all' && def.category !== cat) return false;
        if (!search) return true;
        const sc = getActiveShortcutForDef(def, _bcShortcutsDraftMap);
        const scText = formatShortcutKeysList(sc).join(' ').toLowerCase();
        return def.name.toLowerCase().includes(search) ||
               def.desc.toLowerCase().includes(search) ||
               def.categoryName.toLowerCase().includes(search) ||
               scText.includes(search);
      });

      filtered.forEach(def => {
        const sc = getActiveShortcutForDef(def, _bcShortcutsDraftMap);
        const isRec = _bcActiveRecordingActionId === def.id;
        const isPinned = _bcQuickActionsDraftList.includes(def.id);
        const conflict = findShortcutConflict(def.id, sc, _bcShortcutsDraftMap);
        if (conflict) hasAnyConflict = true;

        const catClass = 'skm-cat-' + def.category;
        const keyDisplayHtml = isRec
          ? '<span style="color:#2563eb; font-weight:700;">Press shortcut keys (Esc to cancel)...</span>'
          : formatShortcutKeyHtml(sc);

        const conflictBadge = (!isRec && conflict)
          ? `<span class="skm-conflict-tag" title="Conflict with: ${conflict}">Conflict: ${conflict}</span>`
          : '';

        rowsHtml += `
          <tr>
            <td style="width:40%;">
              <div style="font-weight:700; color:#111; font-size:0.83rem;">${def.name}</div>
              <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">${def.desc}</div>
              <div style="margin-top:4px;"><span class="skm-cat-tag ${catClass}">${def.categoryName}</span></div>
            </td>
            <td style="width:35%;">
              <button type="button" class="skm-btn-key ${isRec ? 'recording' : ''}" onclick="startRecordingBoardShortcut('${def.id}')" title="Click to record new shortcut">
                ${keyDisplayHtml}
              </button>
              ${conflictBadge}
            </td>
            <td style="width:10%; text-align:center;">
              ${sc && sc.key ? `<button type="button" class="skm-btn-clear" onclick="clearBoardShortcut('${def.id}')" title="Clear shortcut">Clear</button>` : ''}
            </td>
            <td style="width:15%; text-align:center;">
              <label style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; cursor:pointer; font-weight:600; color:#334155;">
                <input type="checkbox" ${isPinned ? 'checked' : ''} onchange="toggleBoardQuickActionPin('${def.id}', this.checked)" style="accent-color:#111; cursor:pointer;">
                Pin
              </label>
            </td>
          </tr>
        `;
      });

      container.innerHTML = `
        <table class="skm-editor-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Shortcut Key</th>
              <th style="text-align:center;">Clear</th>
              <th style="text-align:center;">Quick Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="4" style="text-align:center; color:#888; padding:18px;">No matching actions found.</td></tr>'}
          </tbody>
        </table>
      `;

      const alertEl = document.getElementById('bc-shortcuts-conflict-alert');
      if (alertEl) {
        if (hasAnyConflict) {
          alertEl.style.display = 'block';
          alertEl.textContent = 'Notice: One or more keyboard shortcuts have conflicting key assignments.';
        } else {
          alertEl.style.display = 'none';
        }
      }
    }

    function _bcGetCustomShortcutsMap() {
      return { ..._bcShortcutsDraftMap };
    }

    function _bcGetQuickActionsList() {
      return [..._bcQuickActionsDraftList];
    }

    function boardDispatchCustomShortcut(e) {
      if (_bcActiveRecordingActionId) return false;
      const tag = document.activeElement && document.activeElement.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || 
        (document.activeElement && document.activeElement.isContentEditable) ||
        (document.activeElement && document.activeElement.closest && document.activeElement.closest('[contenteditable="true"]')) ||
        (e.target && e.target.closest && e.target.closest('[contenteditable="true"], .wn-note-editor'));
      
      // If user is actively typing in a text field, allow Escape, search shortcut (Ctrl+F), save shortcut (Ctrl+S), and link shortcut (Ctrl+J)
      const isSearchShortcut = (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'f';
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === 's';
      const isLinkShortcut = (e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === 'j';
      if (isInput && e.key !== 'Escape' && !isSearchShortcut && !isSaveShortcut && !isLinkShortcut) return false;

      // When constellation section is hidden, only allow Escape and search shortcut
      const sec = document.getElementById('constellation-section');
      if (sec && sec.classList.contains('hidden') && e.key !== 'Escape' && !isSearchShortcut) {
        return false;
      }

      const customMap = getBoardCustomShortcutsMap();
      for (const def of BOARD_ACTION_DEFINITIONS) {
        const sc = getActiveShortcutForDef(def, customMap);
        if (!sc || !sc.key) continue;

        const ctrl = !!(e.ctrlKey || e.metaKey);
        const alt = !!e.altKey;
        const shift = !!e.shiftKey;

        if (ctrl !== !!sc.ctrl) continue;
        if (alt !== !!sc.alt) continue;
        if (shift !== !!sc.shift) continue;

        let eventKey = e.key;
        let targetKey = sc.key;
        if (eventKey === ' ' || eventKey === 'Spacebar') eventKey = 'Space';
        if (targetKey === ' ' || targetKey === 'Spacebar') targetKey = 'Space';
        if (eventKey === 'Del') eventKey = 'Delete';
        if (targetKey === 'Del') targetKey = 'Delete';

        let keyMatches = String(eventKey).toLowerCase() === String(targetKey).toLowerCase();
        if (!keyMatches && def.id === 'delete_selected' && (eventKey === 'Backspace' || eventKey === 'Delete') && (targetKey === 'Delete' || targetKey === 'Backspace')) {
          keyMatches = true;
        }

        if (keyMatches) {
          // If def is clipboard_paste, let the native 'paste' event fire so system images & text are handled
          if (def.id === 'clipboard_paste') {
            return false;
          }
          if (typeof def.fn === 'function') {
            const res = def.fn();
            if (res === false) return false;
          }
          e.preventDefault();
          return true;
        }
      }

      // Check if this key matches the default shortcut of an action that was overridden or cleared
      for (const def of BOARD_ACTION_DEFINITIONS) {
        if (!def.defaultShortcut || !def.defaultShortcut.key) continue;
        if (customMap[def.id] === undefined) continue; // default still active
        // User customized this action! Check if event matches the old default
        const dsc = def.defaultShortcut;
        const ctrl = !!(e.ctrlKey || e.metaKey);
        const alt = !!e.altKey;
        const shift = !!e.shiftKey;
        if (ctrl === !!dsc.ctrl && alt === !!dsc.alt && shift === !!dsc.shift) {
          let eventKey = e.key;
          let targetKey = dsc.key;
          if (eventKey === ' ' || eventKey === 'Spacebar') eventKey = 'Space';
          if (targetKey === ' ' || targetKey === 'Spacebar') targetKey = 'Space';
          if (eventKey === 'Del') eventKey = 'Delete';
          if (targetKey === 'Del') targetKey = 'Delete';
          if (String(eventKey).toLowerCase() === String(targetKey).toLowerCase()) {
            // Default was cleared or changed to something else — suppress hardcoded fallback!
            e.preventDefault();
            return true;
          }
        }
      }
      return false;
    }

    
    // ---- Board Sound Effects Management in Customise Modal ----
    let _bcSoundTableData = null;

    function _bcEscapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function _bcBuildSoundTable(soundConfig) {
      if (typeof BoardAudioService === 'undefined') return;
      const container = document.getElementById('bc-sound-table-container');
      if (!container) return;

      const actions = BoardAudioService.getActionMetadata();
      const presets = BoardAudioService.getPresetDefinitions();
      const grouped = BoardAudioService.getSubfolderGroupedFiles();
      const cfg = soundConfig || (window.BOARD_CONFIG && window.BOARD_CONFIG.soundEffects) || BoardAudioService.getDefaultConfig();
      _bcSoundTableData = cfg;

      let html = '<table class="bc-sound-table"><thead><tr>' +
        '<th style="width:40px; text-align:center;"><input type="checkbox" id="bc-sound-select-all-cb" title="Select / Deselect All" style="cursor:pointer;" onchange="boardSoundToggleSelectAll(this.checked)"></th>' +
        '<th style="width:200px;">Action</th>' +
        '<th style="width:110px;">Category</th>' +
        '<th>Sound Source</th>' +
        '<th style="width:140px;">Volume</th>' +
        '<th style="width:90px; text-align:center;">Test</th>' +
        '</tr></thead><tbody>';

      actions.forEach(act => {
        const actCfg = (cfg.actions && cfg.actions[act.id]) || { sound: 'preset:chime', volume: 1.0, enabled: true };
        const isEnabled = actCfg.enabled !== false;
        const currentSound = actCfg.sound || 'preset:chime';
        const volVal = Math.round((typeof actCfg.volume === 'number' ? actCfg.volume : 1.0) * 100);
        const nameText = (typeof t === 'function' ? t(act.nameKey) : null) || act.defaultName;
        const catText = (typeof t === 'function' ? t(act.categoryKey) : null) || act.defaultCat;

        html += '<tr class="bc-sound-row" data-action-id="' + act.id + '" data-category="' + act.category + '" data-name="' + _bcEscapeHtml(nameText.toLowerCase()) + '">';
        
        // Enabled checkbox
        html += '<td style="text-align:center;"><input type="checkbox" class="bc-sound-act-enable" ' + (isEnabled ? 'checked' : '') + ' onchange="_bcUpdateSoundRowState(this.closest(\'tr\').dataset.actionId, this.checked)"></td>';

        // Action Name
        html += '<td><strong>' + _bcEscapeHtml(nameText) + '</strong><br><span style="font-size:0.68rem; color:#666;">' + act.id + '</span></td>';

        // Category Badge
        html += '<td><span class="skm-cat-tag bc-sound-cat-' + act.category + '">' + _bcEscapeHtml(catText) + '</span></td>';

        // Sound Source Selector
        html += '<td><div style="display:flex; flex-direction:column; gap:4px;">';
        html += '<select class="bc-select bc-sound-select" id="bc-sound-sel-' + act.id + '" style="font-size:0.78rem; padding:4px 6px;" onchange="_bcHandleSoundSourceChange(this.closest(\'tr\').dataset.actionId, this.value)">';
        
        // None
        html += '<option value="none" ' + (currentSound === 'none' ? 'selected' : '') + '>' + (typeof t === 'function' ? t('bcSoundSourceNone') : 'None (Disabled)') + '</option>';

        // Built-in Synthesizers
        html += '<optgroup label="' + (typeof t === 'function' ? t('bcSoundBuiltinHeader') : 'Built-in Synthesizers') + '">';
        presets.forEach(p => {
          html += '<option value="' + p.id + '" ' + (currentSound === p.id ? 'selected' : '') + '>' + p.name + '</option>';
        });
        html += '</optgroup>';

        // Custom Sound Files (subfolders)
        if (grouped.rootFiles.length || grouped.folderGroups.size > 0) {
          if (grouped.rootFiles.length) {
            html += '<optgroup label="General / Root">';
            grouped.rootFiles.forEach(f => {
              const val = 'file:' + f.full;
              html += '<option value="' + val + '" ' + (currentSound === val ? 'selected' : '') + '>' + _bcEscapeHtml(f.name) + '</option>';
            });
            html += '</optgroup>';
          }

          const sortedFolders = Array.from(grouped.folderGroups.keys()).sort((a, b) => a.localeCompare(b));
          sortedFolders.forEach(folder => {
            html += '<optgroup label="' + _bcEscapeHtml(folder) + '">';
            grouped.folderGroups.get(folder).forEach(f => {
              const val = 'file:' + f.full;
              html += '<option value="' + val + '" ' + (currentSound === val ? 'selected' : '') + '>' + _bcEscapeHtml(f.name) + '</option>';
            });
            html += '</optgroup>';
          });
        }

        // Custom manual option if path not in list
        if (currentSound && currentSound.startsWith('file:') && !html.includes('value="' + currentSound + '"')) {
          html += '<optgroup label="Custom File">';
          html += '<option value="' + currentSound + '" selected>' + _bcEscapeHtml(currentSound.replace(/^file:/, '')) + '</option>';
          html += '</optgroup>';
        }

        html += '</select>';

        // Browse external file button & custom path container
        html += '<div style="display:flex; align-items:center; gap:4px;">';
        html += '<button type="button" class="action-btn btn-grey" onclick="boardSoundBrowseCustomFile(this.closest(\'tr\').dataset.actionId)" style="font-size:0.68rem; padding:2px 6px;">' + (typeof t === 'function' ? t('bcSoundBrowseBtn') : 'Browse...') + '</button>';
        html += '<span class="bc-sound-path-label" id="bc-sound-path-' + act.id + '" style="font-size:0.68rem; color:#777; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">' + (currentSound.startsWith('file:') ? currentSound.replace(/^file:/, '') : '') + '</span>';
        html += '</div></div></td>';

        // Volume Slider
        html += '<td><div style="display:flex; align-items:center; gap:6px;">';
        html += '<input type="range" class="bc-sound-vol" min="0" max="100" value="' + volVal + '" style="flex:1; cursor:pointer;" oninput="this.nextElementSibling.textContent = this.value + \'%\'">';
        html += '<span id="bc-sound-vol-val-' + act.id + '" style="min-width:32px; font-size:0.75rem; font-weight:600; color:#444;">' + volVal + '%</span>';
        html += '</div></td>';

        // Test Preview Button
        html += '<td style="text-align:center;">';
        html += '<button type="button" class="action-btn btn-grey" onclick="boardSoundPreviewAction(this.closest(\'tr\').dataset.actionId)" title="Test Sound" style="padding:4px 8px; font-size:0.75rem; display:inline-flex; align-items:center; justify-content:center;">';
        html += '<img src="../assets/icons/play.svg" class="btn-icon" style="width:12px; height:12px;" alt="" />';
        html += '</button></td>';

        html += '</tr>';
      });

      html += '</tbody></table>';
      container.innerHTML = html;
      _bcSyncSelectAllCheckbox();
    }

    function _bcSyncSelectAllCheckbox() {
      const masterCb = document.getElementById('bc-sound-select-all-cb');
      if (!masterCb) return;
      const visibleRows = Array.from(document.querySelectorAll('#bc-sound-table-container .bc-sound-row')).filter(r => r.style.display !== 'none');
      if (!visibleRows.length) {
        masterCb.checked = false;
        masterCb.indeterminate = false;
        return;
      }
      const checkedCount = visibleRows.filter(r => {
        const cb = r.querySelector('.bc-sound-act-enable');
        return cb && cb.checked;
      }).length;

      if (checkedCount === 0) {
        masterCb.checked = false;
        masterCb.indeterminate = false;
      } else if (checkedCount === visibleRows.length) {
        masterCb.checked = true;
        masterCb.indeterminate = false;
      } else {
        masterCb.checked = false;
        masterCb.indeterminate = true;
      }
    }

    function boardSoundToggleSelectAll(isChecked) {
      const visibleRows = Array.from(document.querySelectorAll('#bc-sound-table-container .bc-sound-row')).filter(r => r.style.display !== 'none');
      visibleRows.forEach(row => {
        const cb = row.querySelector('.bc-sound-act-enable');
        if (cb) cb.checked = isChecked;
        const actId = row.dataset.actionId;
        if (actId) {
          const select = row.querySelector('.bc-sound-select');
          const vol = row.querySelector('.bc-sound-vol');
          if (select) select.disabled = !isChecked;
          if (vol) vol.disabled = !isChecked;
        }
      });
      _bcSyncSelectAllCheckbox();
    }

    function boardSoundSelectAll(isChecked) {
      const masterCb = document.getElementById('bc-sound-select-all-cb');
      if (masterCb) masterCb.checked = isChecked;
      boardSoundToggleSelectAll(isChecked);
    }

    function _bcUpdateSoundRowState(actionId, isEnabled) {
      const row = document.querySelector('.bc-sound-row[data-action-id="' + actionId + '"]');
      if (!row) return;
      const select = row.querySelector('.bc-sound-select');
      const vol = row.querySelector('.bc-sound-vol');
      if (select) select.disabled = !isEnabled;
      if (vol) vol.disabled = !isEnabled;
      _bcSyncSelectAllCheckbox();
    }

    function _bcHandleSoundSourceChange(actionId, value) {
      const pathLbl = document.getElementById('bc-sound-path-' + actionId);
      if (pathLbl) {
        pathLbl.textContent = value.startsWith('file:') ? value.replace(/^file:/, '') : '';
      }
    }

    function boardFilterSoundTable() {
      const query = (document.getElementById('bc-sound-search')?.value || '').trim().toLowerCase();
      const cat = (document.getElementById('bc-sound-cat-filter')?.value || 'all').toLowerCase();
      document.querySelectorAll('#bc-sound-table-container .bc-sound-row').forEach(row => {
        const name = (row.dataset.name || '').toLowerCase();
        const rowCat = (row.dataset.category || '').toLowerCase();
        const actId = (row.dataset.actionId || '').toLowerCase();
        const selVal = (row.querySelector('.bc-sound-select')?.value || '').toLowerCase();
        const matchesText = !query || name.includes(query) || actId.includes(query) || selVal.includes(query);
        const matchesCat = cat === 'all' || rowCat === cat;
        row.style.display = (matchesText && matchesCat) ? '' : 'none';
      });
      _bcSyncSelectAllCheckbox();
    }

    function boardSoundToggleMasterEnable(enabled) {
      const tbl = document.getElementById('bc-sound-table-container');
      if (tbl) {
        tbl.style.opacity = enabled ? '1' : '0.5';
        tbl.style.pointerEvents = enabled ? '' : 'none';
      }
    }

    async function boardSoundRescanFiles() {
      if (typeof BoardAudioService === 'undefined') return;
      const btn = event?.target;
      if (btn) btn.disabled = true;
      try {
        await BoardAudioService.scanSoundFiles();
        const currentCfg = _bcGetSoundSettings();
        _bcBuildSoundTable(currentCfg);
        if (typeof mdbToast === 'function') {
          mdbToast('Sound files and subfolders rescanned successfully (' + BoardAudioService.availableSoundFiles.length + ' files found)');
        }
      } catch (e) {
        if (typeof mdbToast === 'function') mdbToast('Error rescanning sound folders: ' + e.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function boardSoundBrowseCustomFile(actionId) {
      if (!window.Desktop || !Desktop.isElectron() || typeof Desktop.chooseFile !== 'function') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            _bcApplyCustomFileToAction(actionId, 'file:' + file.name);
          }
        };
        input.click();
        return;
      }

      try {
        const res = await Desktop.chooseFile({
          title: 'Select Sound File for Action',
          filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus'] }]
        });
        if (res && res.path) {
          const relPath = res.path.replace(/\\/g, '/');
          _bcApplyCustomFileToAction(actionId, 'file:' + relPath);
        }
      } catch (err) { }
    }

    function _bcApplyCustomFileToAction(actionId, customSoundVal) {
      const sel = document.getElementById('bc-sound-sel-' + actionId);
      if (!sel) return;
      let opt = sel.querySelector('option[value="' + customSoundVal + '"]');
      if (!opt) {
        opt = document.createElement('option');
        opt.value = customSoundVal;
        opt.textContent = customSoundVal.replace(/^file:/, '');
        sel.appendChild(opt);
      }
      sel.value = customSoundVal;
      _bcHandleSoundSourceChange(actionId, customSoundVal);
    }

    function boardSoundPreviewAction(actionId) {
      if (typeof BoardAudioService === 'undefined') return;
      const row = document.querySelector('.bc-sound-row[data-action-id="' + actionId + '"]');
      if (!row) return;
      const sel = row.querySelector('.bc-sound-select');
      const vol = row.querySelector('.bc-sound-vol');
      const source = sel ? sel.value : 'preset:chime';
      const volume = vol ? (parseInt(vol.value, 10) / 100) : 1.0;
      BoardAudioService.testSound(source, volume);
    }

    function resetBoardSoundsToDefault() {
      if (typeof BoardAudioService === 'undefined') return;
      const defaultCfg = BoardAudioService.getDefaultConfig();
      _bcBuildSoundTable(defaultCfg);
      const enableEl = document.getElementById('bc-sound-master-enable');
      if (enableEl) enableEl.checked = defaultCfg.enabled;
      const hostOnlyEl = document.getElementById('bc-sound-host-only');
      if (hostOnlyEl) hostOnlyEl.checked = defaultCfg.hostOnly;
      const volEl = document.getElementById('bc-sound-master-vol');
      if (volEl) volEl.value = Math.round(defaultCfg.masterVolume * 100);
      const volLbl = document.getElementById('bc-sound-master-vol-val');
      if (volLbl) volLbl.textContent = Math.round(defaultCfg.masterVolume * 100) + '%';
    }

    function _bcGetSoundSettings() {
      if (typeof BoardAudioService === 'undefined') return null;
      const enableEl = document.getElementById('bc-sound-master-enable');
      const hostOnlyEl = document.getElementById('bc-sound-host-only');
      const volEl = document.getElementById('bc-sound-master-vol');
      
      const settings = {
        enabled: enableEl ? enableEl.checked : true,
        masterVolume: volEl ? (parseInt(volEl.value, 10) / 100) : 0.6,
        hostOnly: hostOnlyEl ? hostOnlyEl.checked : true,
        actions: {}
      };

      document.querySelectorAll('#bc-sound-table-container .bc-sound-row').forEach(row => {
        const actId = row.dataset.actionId;
        const enableCb = row.querySelector('.bc-sound-act-enable');
        const sel = row.querySelector('.bc-sound-select');
        const vol = row.querySelector('.bc-sound-vol');
        if (actId) {
          settings.actions[actId] = {
            enabled: enableCb ? enableCb.checked : true,
            sound: sel ? sel.value : 'none',
            volume: vol ? (parseInt(vol.value, 10) / 100) : 1.0
          };
        }
      });

      return settings;
    }

    function _bcUpdateLinkPreview() {
      const svgEl = document.getElementById('bc-link-preview-svg');
      if (!svgEl) return;

      const thickEl = document.getElementById('bc-link-stroke-thickness');
      const typeEl = document.getElementById('bc-link-stroke-type');
      const routingEl = document.getElementById('bc-link-routing');
      const dirEl = document.getElementById('bc-link-direction');
      const termEl = document.getElementById('bc-link-terminator');
      const colorEl = document.getElementById('bc-link-color');
      const opEl = document.getElementById('bc-link-opacity');
      const animEl = document.getElementById('bc-link-animated');
      const labelBgEl = document.getElementById('bc-link-label-bg');
      const labelSizeEl = document.getElementById('bc-link-label-size');

      const thickness = Math.max(1, Math.min(20, parseFloat(thickEl ? thickEl.value : 2) || 2));
      const strokeType = typeEl ? typeEl.value : 'solid';
      const routing = routingEl ? routingEl.value : 'straight';
      const dir = dirEl ? dirEl.value : 'none';
      const terminator = termEl ? termEl.value : 'arrow';
      const color = (colorEl && /^#[0-9a-fA-F]{6}$/i.test(colorEl.value)) ? colorEl.value : '#333333';
      const opacity = opEl ? (Math.max(10, Math.min(100, parseInt(opEl.value, 10) || 100)) / 100) : 1;
      const animated = animEl ? !!animEl.checked : false;
      const labelBg = labelBgEl ? !!labelBgEl.checked : false;
      const labelSize = labelSizeEl ? Math.max(8, Math.min(36, parseInt(labelSizeEl.value, 10) || 16)) : 16;

      const x1 = 34, y1 = (routing === 'orthogonal' ? 27 : 21);
      const x2 = 286, y2 = (routing === 'orthogonal' ? 15 : 21);
      const curvature = 18;

      let geo;
      if (typeof window.conComputeEdgeGeometry === 'function') {
        geo = window.conComputeEdgeGeometry(x1, y1, x2, y2, routing, strokeType, curvature, thickness, dir, terminator);
      } else if (typeof conComputeEdgeGeometry === 'function') {
        geo = conComputeEdgeGeometry(x1, y1, x2, y2, routing, strokeType, curvature, thickness, dir, terminator);
      } else {
        geo = { d: `M ${x1} ${y1} L ${x2} ${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, angle: 0 };
      }

      const mEnd = (dir === 'forward' || dir === 'both') ? `url(#bc-pv-${terminator}-end)` : '';
      const mStart = (dir === 'backward' || dir === 'both') ? `url(#bc-pv-${terminator}-start)` : '';

      let dasharray = '';
      let linecap = (dir !== 'none') ? 'butt' : 'round';
      if (strokeType === 'dashed') {
        dasharray = `${thickness * 4} ${thickness * 2}`;
        linecap = 'butt';
      } else if (strokeType === 'dotted') {
        dasharray = `${thickness * 0.4} ${thickness * 2.5}`;
        linecap = (dir !== 'none') ? 'butt' : 'round';
      } else if (animated) {
        dasharray = `${thickness * 4} ${thickness * 2}`;
        linecap = (dir !== 'none') ? 'butt' : 'round';
      }

      const animClass = animated ? (dir === 'backward' ? 'con-edge-animated-reverse' : 'con-edge-animated') : '';

      const labelText = 'Link';
      const dispFontSize = Math.max(9, Math.min(15, Math.round(labelSize * 0.72)));
      const mx = geo.mx;
      const my = geo.my;
      const dy = -Math.max(4, Math.round(dispFontSize * 0.45));
      const pillW = Math.max(26, Math.round(labelText.length * dispFontSize * 0.65 + 10));
      const pillH = Math.max(13, Math.round(dispFontSize * 1.3));
      const pillX = Math.round(mx - pillW / 2);
      const pillY = Math.round(my + dy - pillH * 0.75);

      svgEl.innerHTML = `
        <defs>
          <marker id="bc-pv-arrow-end" markerWidth="11" markerHeight="9" refX="1" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 1 1 L 9.5 4.5 L 1 8 Z" fill="${color}" stroke="${color}" stroke-linejoin="round" />
          </marker>
          <marker id="bc-pv-arrow-start" markerWidth="11" markerHeight="9" refX="9.5" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 9.5 1 L 1 4.5 L 9.5 8 Z" fill="${color}" stroke="${color}" stroke-linejoin="round" />
          </marker>
          <marker id="bc-pv-open-end" markerWidth="10" markerHeight="10" refX="1.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </marker>
          <marker id="bc-pv-open-start" markerWidth="10" markerHeight="10" refX="8.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </marker>
          <marker id="bc-pv-circle-end" markerWidth="10" markerHeight="10" refX="1.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="3.5" fill="${color}" stroke="${color}" />
          </marker>
          <marker id="bc-pv-circle-start" markerWidth="10" markerHeight="10" refX="8.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="3.5" fill="${color}" stroke="${color}" />
          </marker>
          <marker id="bc-pv-diamond-end" markerWidth="12" markerHeight="10" refX="1" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="6,1 11,5 6,9 1,5" fill="${color}" stroke="${color}" stroke-linejoin="round" />
          </marker>
          <marker id="bc-pv-diamond-start" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="6,1 1,5 6,9 11,5" fill="${color}" stroke="${color}" stroke-linejoin="round" />
          </marker>
        </defs>
        <!-- Mock endpoint nodes -->
        <rect x="6" y="${y1 - 10}" width="28" height="20" rx="5" fill="#f4f4f5" stroke="#333333" stroke-width="1.8" />
        <text x="20" y="${y1 + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#222">A</text>

        <rect x="286" y="${y2 - 10}" width="28" height="20" rx="5" fill="#f4f4f5" stroke="#333333" stroke-width="1.8" />
        <text x="300" y="${y2 + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#222">B</text>

        <!-- Preview link path -->
        <path d="${geo.d}"
          fill="none"
          stroke="${color}"
          stroke-width="${thickness}"
          stroke-opacity="${opacity}"
          stroke-linecap="${linecap}"
          stroke-dasharray="${dasharray}"
          ${mEnd ? `marker-end="${mEnd}"` : ''}
          ${mStart ? `marker-start="${mStart}"` : ''}
          class="${animClass}"
        />

        <!-- Label pill background & text -->
        ${labelBg ? `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="3" fill="#ffffff" stroke="#e0e0e0" stroke-width="1" />` : ''}
        <text x="${mx}" y="${my}" dy="${dy}" text-anchor="middle" font-size="${dispFontSize}px" font-weight="700" fill="${color}" opacity="${opacity}">${labelText}</text>
      `;
    }

    function _bcBindLinkPreviewListeners() {
      const ids = [
        'bc-link-stroke-thickness', 'bc-link-stroke-type', 'bc-link-routing',
        'bc-link-direction', 'bc-link-terminator', 'bc-link-color', 'bc-link-color-text',
        'bc-link-opacity', 'bc-link-animated', 'bc-link-label-bg', 'bc-link-label-size'
      ];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el._bcLinkBound) return;
        el._bcLinkBound = true;
        el.addEventListener('input', () => {
          if (id === 'bc-link-color') {
            const txt = document.getElementById('bc-link-color-text');
            if (txt) txt.value = el.value.toUpperCase();
          } else if (id === 'bc-link-color-text') {
            if (/^#[0-9a-fA-F]{6}$/i.test(el.value)) {
              const picker = document.getElementById('bc-link-color');
              if (picker) picker.value = el.value;
            }
          } else if (id === 'bc-link-opacity') {
            const v = document.getElementById('bc-link-opacity-val');
            if (v) v.textContent = el.value + '%';
          }
          _bcUpdateLinkPreview();
        });
        el.addEventListener('change', () => {
          if (id === 'bc-link-color-text' && /^#[0-9a-fA-F]{6}$/i.test(el.value)) {
            const picker = document.getElementById('bc-link-color');
            if (picker) picker.value = el.value;
          }
          _bcUpdateLinkPreview();
        });
      });
    }

    async function boardCustomiseOpen() {
      let bc = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG && Object.keys(BOARD_CONFIG).length) ? BOARD_CONFIG : {};
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.readJson === 'function') {
        try {
          const _bcResult = await Desktop.readJson('user', 'board-config.js');
          if (_bcResult && _bcResult.ok && _bcResult.data && Object.keys(_bcResult.data).length) {
            bc = _bcResult.data;
            window.BOARD_CONFIG = bc;
          }
        } catch (e) { }
      }

      _bcBuildNodePaletteGrid(bc.nodePalette || null);
      _bcBuildSwatchList('bc-note-bg-list', bc.noteSwatch || (window.WN_BGS ? window.WN_BGS.slice() : []));
      _bcBuildSwatchList('bc-note-text-list', bc.noteTextSwatch || _BC_NOTE_TEXT_DEFAULTS.slice());
      _bcBuildSwatchList('bc-note-hl-list', (bc.noteHighlightSwatch || (window.WN_HIGHLIGHT_COLORS ? window.WN_HIGHLIGHT_COLORS.slice() : [])).map(c => c === '__blink__' ? 'blink' : c));
      _bcBuildSwatchList('bc-node-border-list', bc.nodeBorderSwatch || (window.CON_BORDER_SWATCHES ? window.CON_BORDER_SWATCHES.slice() : _BC_NODE_BORDER_DEFAULTS.slice()));
      _bcBuildSwatchList('bc-note-border-list', bc.noteBorderSwatch || (window.WN_BORDER_SWATCHES ? window.WN_BORDER_SWATCHES.slice() : _BC_NOTE_BORDER_DEFAULTS.slice()));

      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('bc-node-font-size', bc.nodeDefaultFontSize !== undefined ? bc.nodeDefaultFontSize : 16);
      set('bc-note-font-free', bc.noteDefaultFontSizeFree !== undefined ? bc.noteDefaultFontSizeFree : 26);
      set('bc-note-font-linked', bc.noteDefaultFontSizeLinked !== undefined ? bc.noteDefaultFontSizeLinked : 14);
      set('bc-node-casing', bc.nodeDefaultCasing || 'none');
      set('bc-note-casing', bc.noteDefaultCasing || 'none');
      set('bc-node-border-width', bc.nodeDefaultBorderWidth !== undefined ? bc.nodeDefaultBorderWidth : 2);
      const bsEl = document.getElementById('bc-node-border-style');
      if (bsEl) bsEl.value = bc.nodeDefaultBorderStyle || 'solid';
      set('bc-node-border-color', bc.nodeDefaultBorderColor || '#111111');
      set('bc-pen-color', bc.penDefaultColor || '#e53935');
      const pt = bc.penDefaultThickness !== undefined ? bc.penDefaultThickness : 4;
      set('bc-pen-thickness', pt);
      const ptv = document.getElementById('bc-pen-thickness-val');
      if (ptv) ptv.textContent = pt + 'px';
      set('bc-laser-color', bc.laserColor || '#ff2200');
      set('bc-media-pdf-width', bc.pdfInsertWidth !== undefined ? bc.pdfInsertWidth : 0);
      const lst = bc.linkDefaultStrokeThickness !== undefined ? bc.linkDefaultStrokeThickness : 2;
      set('bc-link-stroke-thickness', lst);
      set('bc-link-stroke-type', bc.linkDefaultStrokeType || 'solid');
      set('bc-link-routing', bc.linkDefaultRouting || 'straight');
      set('bc-link-direction', bc.linkDefaultDirection || 'none');
      set('bc-link-terminator', bc.linkDefaultTerminator || 'arrow');
      const lColor = (typeof conNormalizeColorHex === 'function' ? conNormalizeColorHex(bc.linkDefaultColor) : '') || bc.linkDefaultColor || '#333333';
      set('bc-link-color', lColor);
      set('bc-link-color-text', lColor.toUpperCase());
      const lOpPercent = Math.round((bc.linkDefaultOpacity !== undefined ? Number(bc.linkDefaultOpacity) : 1) * 100);
      set('bc-link-opacity', lOpPercent);
      const lOpVal = document.getElementById('bc-link-opacity-val');
      if (lOpVal) lOpVal.textContent = lOpPercent + '%';
      const lAnimEl = document.getElementById('bc-link-animated');
      if (lAnimEl) lAnimEl.checked = !!bc.linkDefaultAnimated;
      const lBgEl = document.getElementById('bc-link-label-bg');
      if (lBgEl) lBgEl.checked = !!bc.linkDefaultLabelBg;
      set('bc-link-label-size', bc.linkDefaultLabelSize !== undefined ? bc.linkDefaultLabelSize : 16);
      _bcBindLinkPreviewListeners();
      _bcUpdateLinkPreview();
      set('bc-media-image-width', bc.imageInsertWidth !== undefined ? bc.imageInsertWidth : 260);
      set('bc-media-video-width', bc.videoInsertWidth !== undefined ? bc.videoInsertWidth : 260);
      set('bc-media-sound-width', bc.soundInsertWidth !== undefined ? bc.soundInsertWidth : 320);
      set('bc-board-bg-color', bc.boardDefaultBackgroundColor || '#ffffff');
      set('bc-board-layout-preset', _bcNormalizeBoardLayoutPreset(bc.boardLayoutPreset));
      set('bc-board-custom-orientation', _bcNormalizeBoardOrientation(bc.boardCustomOrientation));
      set('bc-board-custom-width', _bcClampBoardDimension(bc.boardCustomWidthPx, 1600));
      set('bc-board-custom-height', _bcClampBoardDimension(bc.boardCustomHeightPx, 1000));
      _bcBuildSwatchList('bc-board-bg-preset-list', conExtractBoardBgPresetsFromConfig(bc));
      set('bc-font-unit-select', bc.fontUnit || window.conFontUnit || 'pt');
      set('bc-thickness-unit-select', bc.thicknessUnit || window.conThicknessUnit || 'mm');
      const autosaveIntervalEl = document.getElementById('bc-autosave-interval');
      const autosaveCustomRowEl = document.getElementById('bc-autosave-custom-row');
      const autosaveCustomInputEl = document.getElementById('bc-autosave-custom-minutes');
      const standardIntervals = [0, 15, 30, 45, 60, 90, 120, 300, 600];
      const curAutosaveSec = bc.autosaveDebounceSec !== undefined ? Number(bc.autosaveDebounceSec) : 45;

      if (standardIntervals.includes(curAutosaveSec)) {
        set('bc-autosave-interval', curAutosaveSec);
        if (autosaveCustomRowEl) autosaveCustomRowEl.style.display = 'none';
        if (autosaveCustomInputEl) autosaveCustomInputEl.value = Math.max(0.5, Math.round((curAutosaveSec / 60) * 10) / 10 || 10);
      } else {
        set('bc-autosave-interval', 'custom');
        if (autosaveCustomRowEl) autosaveCustomRowEl.style.display = 'flex';
        if (autosaveCustomInputEl) autosaveCustomInputEl.value = Math.max(0.5, Math.round((curAutosaveSec / 60) * 10) / 10);
      }

      if (autosaveIntervalEl) {
        autosaveIntervalEl.onchange = () => {
          if (autosaveCustomRowEl) {
            autosaveCustomRowEl.style.display = autosaveIntervalEl.value === 'custom' ? 'flex' : 'none';
          }
        };
      }

      if (typeof t === 'function') {
        const _tr = (id, k) => { const el = document.getElementById(id); if (el) el.textContent = t(k); };
        const _opt = (selId, val, k) => {
          const opt = document.querySelector('#' + selId + ' option[value="' + val + '"]');
          if (opt) opt.textContent = t(k);
        };
        _tr('bc-autosave-title', 'bcAutosaveTitle');
        _tr('bc-autosave-hint', 'bcAutosaveHint');
        _tr('bc-autosave-label', 'bcAutosaveInterval');
        _opt('bc-autosave-interval', '15', 'bcAutosave15s');
        _opt('bc-autosave-interval', '30', 'bcAutosave30s');
        _opt('bc-autosave-interval', '45', 'bcAutosave45s');
        _opt('bc-autosave-interval', '60', 'bcAutosave1m');
        _opt('bc-autosave-interval', '90', 'bcAutosave90s');
        _opt('bc-autosave-interval', '120', 'bcAutosave2m');
        _opt('bc-autosave-interval', '300', 'bcAutosave5m');
        _opt('bc-autosave-interval', '600', 'bcAutosave10m');
        _opt('bc-autosave-interval', 'custom', 'bcAutosaveCustom');
        _opt('bc-autosave-interval', '0', 'bcAutosaveDisabled');
      }

      const layoutPresetEl = document.getElementById('bc-board-layout-preset');
      const layoutOrientationEl = document.getElementById('bc-board-custom-orientation');
      if (layoutPresetEl) layoutPresetEl.onchange = () => _bcSyncBoardLayoutControls();
      if (layoutOrientationEl) layoutOrientationEl.onchange = () => _bcSyncBoardLayoutControls();
      _bcSyncBoardLayoutControls();

      _bcBuildPenPresetList('bc-pen-preset-list', Array.isArray(bc.penPresets) && bc.penPresets.length ? bc.penPresets : _BC_PEN_PRESET_DEFAULTS.slice());

      if (typeof BoardAudioService !== 'undefined') {
        const soundCfg = bc.soundEffects || BoardAudioService.getDefaultConfig();
        const enableEl = document.getElementById('bc-sound-master-enable');
        if (enableEl) enableEl.checked = soundCfg.enabled !== false;
        const hostOnlyEl = document.getElementById('bc-sound-host-only');
        if (hostOnlyEl) hostOnlyEl.checked = soundCfg.hostOnly !== false;
        const volEl = document.getElementById('bc-sound-master-vol');
        const volVal = Math.round((soundCfg.masterVolume !== undefined ? soundCfg.masterVolume : 0.6) * 100);
        if (volEl) volEl.value = volVal;
        const volLbl = document.getElementById('bc-sound-master-vol-val');
        if (volLbl) volLbl.textContent = volVal + '%';
        _bcBuildSoundTable(soundCfg);
      }


      // Font selects: inject into wrap containers
      function _bcUpdateFontPreview(type) {
        const isNode = type === 'node';
        const preview = document.getElementById(isNode ? 'bc-node-font-preview' : 'bc-note-font-preview');
        const casingSel = document.getElementById(isNode ? 'bc-node-casing' : 'bc-note-casing');
        if (!preview) return;
        const sample = "The quick brown fox";
        const casing = casingSel ? casingSel.value : 'none';
        if (casing === 'smallcaps') {
          preview.style.fontVariant = 'small-caps';
          preview.style.textTransform = 'none';
          preview.textContent = sample;
        } else {
          preview.style.fontVariant = 'normal';
          preview.style.textTransform = 'none';
          preview.textContent = boardTransformCasingText(sample, casing);
        }
      }

      ['bc-node-font-family-wrap', 'bc-note-font-family-wrap'].forEach((wrapId, idx) => {
        const wrap = document.getElementById(wrapId);
        if (!wrap) return;
        wrap.innerHTML = '';
        const selId = idx === 0 ? 'bc-node-font-family' : 'bc-note-font-family';
        const previewId = idx === 0 ? 'bc-node-font-preview' : 'bc-note-font-preview';
        const savedVal = idx === 0 ? (bc.nodeDefaultFontFamily || '') : (bc.noteDefaultFontFamily || '');
        const fsel = _bcBuildFontSelect(selId, savedVal, '');
        fsel.addEventListener('change', () => {
          const preview = document.getElementById(previewId);
          if (preview) preview.style.fontFamily = fsel.value || '';
        });
        wrap.appendChild(fsel);
        // set initial preview
        const preview = document.getElementById(previewId);
        if (preview) preview.style.fontFamily = savedVal || '';
      });

      const nodeCasingEl = document.getElementById('bc-node-casing');
      if (nodeCasingEl) {
        nodeCasingEl.onchange = () => _bcUpdateFontPreview('node');
        _bcUpdateFontPreview('node');
      }
      const noteCasingEl = document.getElementById('bc-note-casing');
      if (noteCasingEl) {
        noteCasingEl.onchange = () => _bcUpdateFontPreview('note');
        _bcUpdateFontPreview('note');
      }

      // Initialize Node presets inline
      if (typeof window.conSetPresetEditorDraft === 'function' && typeof window._conPresetEditorRender === 'function' && typeof window.conGetNodePresets === 'function') {
        window.conSetPresetEditorDraft(window.conGetNodePresets().map(p => ({ ...p })));
        window._conPresetEditorRender();
      }

      // Initialize Note presets inline
      if (typeof window.noteSetPresetEditorDraft === 'function' && typeof window._notePresetEditorRender === 'function' && typeof window.conGetNotePresets === 'function') {
        window.noteSetPresetEditorDraft(window.conGetNotePresets().map(p => ({ ...p })));
        window._notePresetEditorRender();
      }

      // Initialize Shortcuts & Quick Actions drafts
      _bcShortcutsDraftMap = { ...getBoardCustomShortcutsMap() };
      _bcQuickActionsDraftList = [...getBoardQuickActionsList()];
      renderBoardShortcutsTable();

      if (typeof window.boardCustomiseSetTab === 'function') {
        window.boardCustomiseSetTab(window._bcActiveTab || 'nodes');
      }

      document.body.style.overflow = 'hidden';
      document.getElementById('board-customise-overlay').classList.add('active');
    }

    function boardCustomiseClose() {
      const ov = document.getElementById('board-customise-overlay');
      if (ov) ov.classList.remove('active');
      document.body.style.overflow = '';
    }

    window._bcActiveTab = 'nodes';
    window.boardCustomiseSetTab = function (tabName) {
      window._bcActiveTab = tabName;
      document.querySelectorAll('#board-customise-modal .bc-sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
      });
      document.querySelectorAll('#board-customise-modal .bc-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.pane === tabName);
      });
    };

    window.boardCustomiseExpandAll = function () {
      document.querySelectorAll('#board-customise-modal .bc-section').forEach(sec => {
        sec.classList.remove('collapsed');
      });
    };

    window.boardCustomiseCollapseAll = function () {
      document.querySelectorAll('#board-customise-modal .bc-section').forEach(sec => {
        sec.classList.add('collapsed');
      });
    };

    window.initBoardCustomiseCollapsible = function () {
      // Collapse sections by default
      document.querySelectorAll('#board-customise-modal .bc-section').forEach(sec => {
        sec.classList.add('collapsed');
      });
      // Attach click handlers to section titles
      document.querySelectorAll('#board-customise-modal .bc-section-title').forEach(title => {
        title.addEventListener('click', () => {
          title.parentElement.classList.toggle('collapsed');
        });
      });
    };

    function _bcEnableDragReorder(container, rowSelector) {
      let dragSrc = null;
      function attachRow(row) {
        if (row.dataset.dragInit) return;
        row.dataset.dragInit = '1';
        const handle = row.querySelector('.bc-drag-handle');
        if (handle) {
          handle.addEventListener('mousedown', () => { row.draggable = true; });
          handle.addEventListener('mouseup', () => { row.draggable = false; });
        }
        row.addEventListener('dragstart', e => {
          dragSrc = row;
          e.dataTransfer.effectAllowed = 'move';
          row.classList.add('bc-row-dragging');
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('bc-row-dragging');
          container.querySelectorAll(rowSelector).forEach(r => r.classList.remove('bc-row-drag-over'));
          dragSrc = null;
        });
        row.addEventListener('dragover', e => {
          e.preventDefault();
          if (dragSrc && dragSrc !== row) row.classList.add('bc-row-drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('bc-row-drag-over'));
        row.addEventListener('drop', e => {
          e.preventDefault();
          row.classList.remove('bc-row-drag-over');
          if (!dragSrc || dragSrc === row) return;
          container.insertBefore(dragSrc, row);
        });
      }
      container.querySelectorAll(rowSelector).forEach(attachRow);
    }

    function _bcBuildNodePaletteGrid(customPalette) {
      const defaults = window.CON_PALETTES || [
        ['#ffffff', '#111111', '#111111'], ['#374151', '#ffffff', '#111111'],
        ['#111111', '#ffffff', '#555555'], ['#fee2e2', '#111111', '#dc2626'],
        ['#ffedd5', '#111111', '#ea580c'], ['#fef3c7', '#111111', '#d97706'],
        ['#dcfce7', '#111111', '#16a34a'], ['#ccfbf1', '#111111', '#0d9488'],
        ['#dbeafe', '#111111', '#2563eb'], ['#e0f2fe', '#111111', '#0284c7'],
        ['#f3e8ff', '#111111', '#7c3aed'], ['#fce7f3', '#111111', '#db2777']
      ];
      const defaultLabels = ['White', 'Dark Grey', 'Black', 'Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Blue', 'Sky', 'Purple', 'Pink'];
      const source = customPalette || defaults;
      const grid = document.getElementById('bc-node-palette-grid');
      if (!grid) return;
      grid.innerHTML = '';

      function _bcMakePaletteColorCell(colorVal, title, onColorChange) {
        const cell = document.createElement('div');
        cell.className = 'bc-palette-color-cell';

        const colorBtn = document.createElement('input');
        colorBtn.type = 'color';
        colorBtn.className = 'bc-palette-color-btn';
        colorBtn.title = title;
        _bcSyncPickerFromText(colorBtn, colorVal);

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'bc-palette-color-input';
        textInput.value = colorVal || '';
        textInput.placeholder = '#hex or rgba(...)';
        textInput.title = title;

        textInput.oninput = () => {
          _bcSyncPickerFromText(colorBtn, textInput.value.trim());
          if (typeof onColorChange === 'function') onColorChange();
        };

        colorBtn.oninput = () => {
          const hex = colorBtn.value;
          const curText = textInput.value.trim();
          const rgbaMatch = curText.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i);
          if (rgbaMatch) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const alpha = rgbaMatch[4];
            textInput.value = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          } else {
            textInput.value = hex;
          }
          if (typeof onColorChange === 'function') onColorChange();
        };

        cell.appendChild(colorBtn);
        cell.appendChild(textInput);
        return { cell, textInput, colorBtn };
      }

      function _bcMakePaletteRow(bg, text, border, name) {
        const row = document.createElement('div');
        row.className = 'bc-palette-row';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'bc-palette-name';
        nameInput.value = name || '';
        nameInput.placeholder = 'Name…';

        const previewWrap = document.createElement('div');
        previewWrap.className = 'bc-palette-preview-wrap';
        const preview = document.createElement('div');
        preview.className = 'bc-palette-preview';
        previewWrap.appendChild(preview);

        function updatePreview() {
          const bgVal = bgCell.textInput.value.trim() || 'transparent';
          const txVal = txCell.textInput.value.trim() || '#111111';
          const brVal = brCell.textInput.value.trim() || '#111111';
          preview.style.background = bgVal;
          preview.style.color = txVal;
          preview.style.borderColor = brVal;
          preview.textContent = nameInput.value.slice(0, 6) || 'Aa';
        }

        nameInput.oninput = () => updatePreview();

        const bgCell = _bcMakePaletteColorCell(bg, 'Background colour (hex, rgba, transparent)', updatePreview);
        const txCell = _bcMakePaletteColorCell(text, 'Text colour (hex, rgba)', updatePreview);
        const brCell = _bcMakePaletteColorCell(border, 'Border colour (hex, rgba)', updatePreview);

        updatePreview();

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.className = 'bc-swatch-remove';
        removeBtn.title = 'Remove this swatch';
        removeBtn.style.cssText = 'width:22px;height:22px;display:flex;align-items:center;justify-content:center;padding:0;font-size:0.7rem;';
        removeBtn.onclick = () => row.remove();

        const dragHandle = document.createElement('span');
        dragHandle.className = 'bc-drag-handle';
        dragHandle.textContent = '\u2807';
        dragHandle.title = 'Drag to reorder';

        row.appendChild(dragHandle);
        row.appendChild(nameInput);
        row.appendChild(previewWrap);
        row.appendChild(bgCell.cell);
        row.appendChild(txCell.cell);
        row.appendChild(brCell.cell);
        row.appendChild(removeBtn);
        return row;
      }

      source.forEach(([bg, text, border, name], i) => {
        grid.appendChild(_bcMakePaletteRow(bg, text, border, name || defaultLabels[i] || ''));
      });

      const addBtn = document.createElement('button');
      addBtn.textContent = '＋ Add colour';
      addBtn.className = 'action-btn btn-grey bc-add-btn';
      addBtn.onclick = () => {
        grid.insertBefore(_bcMakePaletteRow('#ffffff', '#111111', '#111111', ''), addBtn);
        _bcEnableDragReorder(grid, '.bc-palette-row');
      };
      grid.appendChild(addBtn);
      _bcEnableDragReorder(grid, '.bc-palette-row');
    }

    function _bcApplySwatchPreview(preview, color) {
      if (color === 'blink') {
        preview.style.background = '#ffa0a0';
        preview.style.animation = 'wn-blink-hl-anim 3s ease-in-out infinite';
      } else if (!color || color === 'transparent') {
        preview.style.background = 'repeating-linear-gradient(45deg,#ccc,#ccc 3px,#fff 3px,#fff 6px)';
        preview.style.animation = '';
      } else {
        preview.style.background = color;
        preview.style.animation = '';
      }
    }

    function _bcSyncPickerFromText(picker, val) {
      const v = (val || '').trim();
      if (!v || v === 'blink' || v === 'transparent') { picker.value = '#ffffff'; return; }
      try {
        const tmp = document.createElement('div');
        tmp.style.color = v;
        document.body.appendChild(tmp);
        const comp = getComputedStyle(tmp).color;
        document.body.removeChild(tmp);
        const m = comp.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const h = n => parseInt(n).toString(16).padStart(2, '0');
          picker.value = '#' + h(m[1]) + h(m[2]) + h(m[3]);
        }
      } catch (e) { }
    }

    function _bcBuildSwatchList(containerId, colors) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      function makeRow(color) {
        const row = document.createElement('div');
        row.className = 'bc-swatch-row';

        const preview = document.createElement('div');
        preview.className = 'bc-swatch-preview';
        _bcApplySwatchPreview(preview, color);

        const colorBtn = document.createElement('input');
        colorBtn.type = 'color'; colorBtn.className = 'bc-swatch-color-btn';
        colorBtn.title = 'Open colour picker';
        _bcSyncPickerFromText(colorBtn, color);

        const input = document.createElement('input');
        input.type = 'text'; input.value = color; input.className = 'bc-swatch-input';
        input.placeholder = 'CSS colour, e.g. #fff  ·  rgba(255,229,0,.9)  ·  blink';
        input.oninput = () => {
          _bcApplySwatchPreview(preview, input.value.trim());
          _bcSyncPickerFromText(colorBtn, input.value.trim());
        };

        colorBtn.oninput = () => {
          input.value = colorBtn.value;
          _bcApplySwatchPreview(preview, colorBtn.value);
        };

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕'; removeBtn.className = 'bc-swatch-remove';
        removeBtn.title = 'Remove this colour';
        removeBtn.onclick = () => row.remove();

        const dragHandle = document.createElement('span');
        dragHandle.className = 'bc-drag-handle';
        dragHandle.textContent = '\u2807';
        dragHandle.title = 'Drag to reorder';
        row.appendChild(dragHandle);
        row.appendChild(preview);
        row.appendChild(colorBtn);
        row.appendChild(input);
        row.appendChild(removeBtn);
        return row;
      }

      colors.forEach(c => container.appendChild(makeRow(c)));

      const addBtn = document.createElement('button');
      addBtn.textContent = '＋ Add colour';
      addBtn.className = 'action-btn btn-grey bc-add-btn';
      addBtn.onclick = () => { container.insertBefore(makeRow('#ffffff'), addBtn); _bcEnableDragReorder(container, '.bc-swatch-row'); };
      container.appendChild(addBtn);
      _bcEnableDragReorder(container, '.bc-swatch-row');
    }

    function _bcGetPalette() {
      const rows = document.querySelectorAll('#bc-node-palette-grid .bc-palette-row');
      return Array.from(rows).map(row => {
        const nameInput = row.querySelector('.bc-palette-name');
        const colorInputs = row.querySelectorAll('.bc-palette-color-input');
        if (colorInputs.length >= 3) {
          return [
            colorInputs[0].value.trim() || '#ffffff',
            colorInputs[1].value.trim() || '#111111',
            colorInputs[2].value.trim() || '#111111',
            nameInput ? nameInput.value.trim() : ''
          ];
        }
        const pickers = row.querySelectorAll('input[type="color"]');
        return [
          pickers[0] ? pickers[0].value : '#ffffff',
          pickers[1] ? pickers[1].value : '#111111',
          pickers[2] ? pickers[2].value : '#111111',
          nameInput ? nameInput.value.trim() : ''
        ];
      });
    }

    function _bcGetSwatchList(containerId) {
      const rows = document.querySelectorAll('#' + containerId + ' .bc-swatch-row');
      return Array.from(rows).map(row => {
        const input = row.querySelector('input[type="text"]');
        return input ? input.value.trim() : '';
      }).filter(Boolean);
    }

    async function boardCustomiseSave() {
      const getNum = (id, fallback) => { const el = document.getElementById(id); return el ? (parseInt(el.value, 10) || fallback) : fallback; };
      const getVal = (id, fallback) => { const el = document.getElementById(id); return el ? (el.value || fallback) : fallback; };
      const existing = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG) ? BOARD_CONFIG : {};
      const boardLayout = _bcResolveBoardLayoutSettings({
        boardLayoutPreset: getVal('bc-board-layout-preset', 'flex'),
        boardCustomOrientation: getVal('bc-board-custom-orientation', 'landscape'),
        boardCustomWidthPx: getNum('bc-board-custom-width', 1600),
        boardCustomHeightPx: getNum('bc-board-custom-height', 1000)
      });
      const boardDefaultBackgroundColor = getVal('bc-board-bg-color', '#ffffff');
      const boardBackgroundPresets = conExtractBoardBgPresetsFromConfig({
        boardDefaultBackgroundColor,
        boardBackgroundPresets: _bcGetSwatchList('bc-board-bg-preset-list')
      });

      const bc = {
        nodePalette: _bcGetPalette(),
        noteSwatch: _bcGetSwatchList('bc-note-bg-list'),
        noteTextSwatch: _bcGetSwatchList('bc-note-text-list'),
        noteHighlightSwatch: _bcGetSwatchList('bc-note-hl-list').map(c => c === 'blink' ? '__blink__' : c),
        nodeBorderSwatch: _bcGetSwatchList('bc-node-border-list'),
        noteBorderSwatch: _bcGetSwatchList('bc-note-border-list'),
        nodeDefaultFontSize: getNum('bc-node-font-size', 16),
        noteDefaultFontSizeFree: getNum('bc-note-font-free', 26),
        noteDefaultFontSizeLinked: getNum('bc-note-font-linked', 14),
        nodeDefaultFontFamily: getVal('bc-node-font-family', ''),
        noteDefaultFontFamily: getVal('bc-note-font-family', ''),
        nodeDefaultCasing: getVal('bc-node-casing', 'none'),
        noteDefaultCasing: getVal('bc-note-casing', 'none'),
        nodeDefaultBorderWidth: getNum('bc-node-border-width', 2),
        nodeDefaultBorderStyle: getVal('bc-node-border-style', 'solid'),
        nodeDefaultBorderColor: getVal('bc-node-border-color', '#111111'),
        penDefaultColor: getVal('bc-pen-color', '#e53935'),
        penDefaultThickness: getNum('bc-pen-thickness', 4),
        laserColor: getVal('bc-laser-color', '#ff2200'),
        linkDefaultStrokeThickness: (() => { const el = document.getElementById('bc-link-stroke-thickness'); return el ? Math.max(1, Math.min(20, parseFloat(el.value) || 2)) : 2; })(),
        linkDefaultStrokeType: getVal('bc-link-stroke-type', 'solid'),
        linkDefaultRouting: getVal('bc-link-routing', 'straight'),
        linkDefaultDirection: getVal('bc-link-direction', 'none'),
        linkDefaultTerminator: getVal('bc-link-terminator', 'arrow'),
        linkDefaultColor: (() => { const el = document.getElementById('bc-link-color'); return el && /^#[0-9a-fA-F]{6}$/i.test(el.value) ? el.value : '#333333'; })(),
        linkDefaultOpacity: (() => { const el = document.getElementById('bc-link-opacity'); return el ? Math.max(0.1, Math.min(1, (parseInt(el.value, 10) || 100) / 100)) : 1; })(),
        linkDefaultAnimated: (() => { const el = document.getElementById('bc-link-animated'); return !!(el && el.checked); })(),
        linkDefaultLabelBg: (() => { const el = document.getElementById('bc-link-label-bg'); return !!(el && el.checked); })(),
        linkDefaultLabelSize: getNum('bc-link-label-size', 16),
        pdfInsertWidth: getNum('bc-media-pdf-width', 0),
        imageInsertWidth: getNum('bc-media-image-width', 260),
        videoInsertWidth: getNum('bc-media-video-width', 260),
        soundInsertWidth: getNum('bc-media-sound-width', 320),
        boardDefaultBackgroundColor,
        boardLayoutPreset: boardLayout.preset,
        boardCustomOrientation: boardLayout.customOrientation,
        boardCustomWidthPx: boardLayout.customWidth,
        boardCustomHeightPx: boardLayout.customHeight,
        boardBackgroundPresets,
        boardBgPresets: boardBackgroundPresets.slice(),
        constellationPresets: Array.isArray(existing.constellationPresets) ? existing.constellationPresets : [],
        notePresets: Array.isArray(existing.notePresets) ? existing.notePresets : [],
        penPresets: _bcGetPenPresets(),
        shortcuts: _bcGetCustomShortcutsMap(),
        soundEffects: _bcGetSoundSettings(),
        quickActions: _bcGetQuickActionsList(),
        autosaveDebounceSec: (() => {
          const autosaveIntervalVal = (document.getElementById('bc-autosave-interval')?.value || '45').trim();
          if (autosaveIntervalVal === 'custom') {
            const customMin = parseFloat(document.getElementById('bc-autosave-custom-minutes')?.value || '10');
            return Math.max(5, Math.round((Number.isFinite(customMin) ? customMin : 10) * 60));
          }
          return getNum('bc-autosave-interval', 45);
        })(),
        fontUnit: document.getElementById('bc-font-unit-select')?.value || window.conFontUnit || 'pt',
        thicknessUnit: document.getElementById('bc-thickness-unit-select')?.value || window.conThicknessUnit || 'mm',
      };

      window.BOARD_CONFIG = bc;
      _boardCustomiseApply(bc);
      if (typeof BoardAudioService !== 'undefined') BoardAudioService.init(bc.soundEffects);

      const lines = 'const BOARD_CONFIG = ' + JSON.stringify(bc, null, 2) + ';\nwindow.BOARD_CONFIG = BOARD_CONFIG;\n';

      if (window.Desktop && typeof Desktop.saveText === 'function') {
        try {
          await Desktop.saveText('user', 'board-config.js', lines);
          mdbToast('✅ Customise settings saved to board-config.js');
        } catch (err) {
          mdbToast('⚠️ Could not save: ' + (err && err.message ? err.message : String(err)));
        }
      } else {
        const blob = new Blob([lines], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'board-config.js'; a.click();
        URL.revokeObjectURL(url);
        mdbToast('📥 board-config.js downloaded — replace the file in user/');
      }
      boardCustomiseClose();
    }

    function _boardCustomiseApply(bc) {
      if (!bc) return;

      if (bc.fontUnit && typeof window.conSwitchFontUnit === 'function') {
        window.conSwitchFontUnit(bc.fontUnit);
      }
      if (bc.thicknessUnit && typeof window.conSwitchThicknessUnit === 'function') {
        window.conSwitchThicknessUnit(bc.thicknessUnit);
      }

      // 1. Node colour palette
      if (Array.isArray(bc.nodePalette) && bc.nodePalette.length > 0) {
        const pal = window.CON_PALETTES;
        if (pal) {
          // Replace palette entries in-place (resize array to match saved)
          pal.length = 0;
          bc.nodePalette.forEach(entry => {
            if (Array.isArray(entry) && entry.length >= 3) {
              // Store [bg, text, border, name]
              pal.push([String(entry[0]), String(entry[1]), String(entry[2]), String(entry[3] || '')]);
            }
          });
          if (typeof window.conInitSwatches === 'function') window.conInitSwatches();
        }
      }

      // 2. Default node font size
      if (bc.nodeDefaultFontSize && typeof window.conSetDefaultWordFontSize === 'function') {
        window.conSetDefaultWordFontSize(bc.nodeDefaultFontSize);
      }

      // 2b. Default font families & casing
      document.documentElement.style.setProperty('--bc-node-font-family', bc.nodeDefaultFontFamily || '');
      document.documentElement.style.setProperty('--bc-note-font-family', bc.noteDefaultFontFamily || '');
      window._bcNodeFontFamily = bc.nodeDefaultFontFamily || '';
      window._bcNoteFontFamily = bc.noteDefaultFontFamily || '';
      window._bcNodeDefaultCasing = bc.nodeDefaultCasing || 'none';
      window._bcNoteDefaultCasing = bc.noteDefaultCasing || 'none';
      if (window.conNodes && Array.isArray(window.conNodes)) {
        window.conNodes.forEach(node => {
          if (!node.fmt || !node.fmt.casing || node.fmt.casing === 'none') {
            if (typeof conRenderNodeLabel === 'function') conRenderNodeLabel(node);
          }
        });
        if (typeof conRedrawEdges === 'function') conRedrawEdges();
      }
      if (window.conNotes && Array.isArray(window.conNotes)) {
        window.conNotes.forEach(note => {
          if (!note.casing || note.casing === 'none') {
            if (note._applyStyle) note._applyStyle();
          }
        });
      }

      // 3. Default node border (CSS variables, affect all un-styled nodes)
      if (bc.nodeDefaultBorderWidth !== undefined) {
        document.documentElement.style.setProperty('--bc-node-border-width', bc.nodeDefaultBorderWidth + 'px');
      }
      if (bc.nodeDefaultBorderStyle) {
        document.documentElement.style.setProperty('--bc-node-border-style', bc.nodeDefaultBorderStyle);
      }
      if (bc.nodeDefaultBorderColor) {
        document.documentElement.style.setProperty('--bc-node-border-color', bc.nodeDefaultBorderColor);
      }

      // 4. Note background swatches
      if (Array.isArray(bc.noteSwatch) && bc.noteSwatch.length > 0 && window.WN_BGS) {
        window.WN_BGS.splice(0, window.WN_BGS.length, ...bc.noteSwatch);
      }

      // 5. Note text-colour swatches (rebuild context-menu dots + note style popup)
      if (Array.isArray(bc.noteTextSwatch) && bc.noteTextSwatch.length > 0) {
        if (window.WN_COLORS) window.WN_COLORS.splice(0, window.WN_COLORS.length, ...bc.noteTextSwatch);
        const container = document.querySelector('.note-ctx-swatches');
        if (container) {
          container.innerHTML = '';
          bc.noteTextSwatch.forEach(c => {
            const span = document.createElement('span');
            span.className = 'note-ctx-swatch';
            span.style.background = c;
            if (c === '#ffffff' || /^rgba?\(255,\s*255,\s*255/.test(c)) span.style.borderColor = '#555';
            span.title = c;
            span.onclick = () => { if (typeof noteCtxSetColor === 'function') noteCtxSetColor(c); };
            container.appendChild(span);
          });
        }
      }

      // 6. Note highlight swatches
      if (Array.isArray(bc.noteHighlightSwatch) && bc.noteHighlightSwatch.length > 0 && window.WN_HIGHLIGHT_COLORS) {
        window.WN_HIGHLIGHT_COLORS.splice(0, window.WN_HIGHLIGHT_COLORS.length, ...bc.noteHighlightSwatch);
      }

      // 6b. Node border colour swatches
      if (Array.isArray(bc.nodeBorderSwatch) && bc.nodeBorderSwatch.length > 0) {
        if (!window.CON_BORDER_SWATCHES) window.CON_BORDER_SWATCHES = [];
        window.CON_BORDER_SWATCHES.splice(0, window.CON_BORDER_SWATCHES.length, ...bc.nodeBorderSwatch);
        if (typeof window.conInitBorderSwatches === 'function') window.conInitBorderSwatches();
      }

      // 6c. Note border colour swatches
      if (Array.isArray(bc.noteBorderSwatch) && bc.noteBorderSwatch.length > 0) {
        if (!window.WN_BORDER_SWATCHES) window.WN_BORDER_SWATCHES = [];
        window.WN_BORDER_SWATCHES.splice(0, window.WN_BORDER_SWATCHES.length, ...bc.noteBorderSwatch);
      }

      // 7. Drawing pen defaults
      if (bc.penDefaultColor && typeof window.conDrawSetColor === 'function') {
        window.conDrawSetColor(bc.penDefaultColor);
      }
      if (bc.penDefaultThickness !== undefined && typeof window.conDrawSetThickness === 'function') {
        window.conDrawSetThickness(bc.penDefaultThickness);
      }

      // 7b. Pen presets
      window._bcPenPresets = Array.isArray(bc.penPresets) && bc.penPresets.length
        ? bc.penPresets
        : _BC_PEN_PRESET_DEFAULTS.slice();
      if (typeof window.conDrawInitPenPresets === 'function') window.conDrawInitPenPresets();

      // Default link stroke thickness & style customization
      if (bc.linkDefaultStrokeThickness !== undefined) {
        window._conDefaultLinkThickness = Math.max(1, Math.min(20, Number(bc.linkDefaultStrokeThickness) || 2));
      }
      if (bc.linkDefaultStrokeType !== undefined) {
        window._conDefaultLinkStrokeType = bc.linkDefaultStrokeType || 'solid';
      }
      if (bc.linkDefaultRouting !== undefined) {
        window._conDefaultLinkRouting = bc.linkDefaultRouting || 'straight';
      }
      if (bc.linkDefaultDirection !== undefined) {
        window._conDefaultLinkDirection = bc.linkDefaultDirection || 'none';
      }
      if (bc.linkDefaultTerminator !== undefined) {
        window._conDefaultLinkTerminator = bc.linkDefaultTerminator || 'arrow';
      }
      if (bc.linkDefaultColor !== undefined) {
        window._conDefaultLinkColor = bc.linkDefaultColor || '#333333';
      }
      if (bc.linkDefaultOpacity !== undefined) {
        window._conDefaultLinkOpacity = Math.max(0.1, Math.min(1, Number(bc.linkDefaultOpacity) || 1));
      }
      if (bc.linkDefaultAnimated !== undefined) {
        window._conDefaultLinkAnimated = !!bc.linkDefaultAnimated;
      }
      if (bc.linkDefaultLabelBg !== undefined) {
        window._conDefaultLinkLabelBg = !!bc.linkDefaultLabelBg;
      }
      if (bc.linkDefaultLabelSize !== undefined) {
        window._conDefaultLinkLabelSize = Math.max(8, Math.min(36, Number(bc.linkDefaultLabelSize) || 16));
      }

      // 8. Laser pointer colour
      if (bc.laserColor) {
        const hex = bc.laserColor.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        document.documentElement.style.setProperty('--laser-color', bc.laserColor);
        document.documentElement.style.setProperty('--laser-glow', `rgba(${r},${g},${b},0.55)`);
        document.documentElement.style.setProperty('--laser-glow2', `rgba(${r},${g},${b},0.2)`);
      }

      // 9. Media insert sizes (read at insert time via window globals)
      if (bc.pdfInsertWidth !== undefined) window._bcPdfInsertWidth = bc.pdfInsertWidth;
      if (bc.imageInsertWidth !== undefined) window._bcImageInsertWidth = bc.imageInsertWidth;
      if (bc.videoInsertWidth !== undefined) window._bcVideoInsertWidth = bc.videoInsertWidth;
      if (bc.soundInsertWidth !== undefined) window._bcSoundInsertWidth = bc.soundInsertWidth;

      // 9b. Default board background colour
      window._bcBoardDefaultBgColor = conNormalizeColorHex(bc.boardDefaultBackgroundColor) || '';
      window._bcBoardBgPresets = conExtractBoardBgPresetsFromConfig(bc);
      conRenderBoardBgPresetsInContextMenu();
      if (!_conBoardBgColor && window._bcBoardDefaultBgColor) {
        window.conSetBoardBackgroundColor(window._bcBoardDefaultBgColor, { silent: true, skipBroadcast: true });
      } else {
        conApplyBoardBgColor();
      }

      // 9c. Default board layout
      const boardLayout = _bcResolveBoardLayoutSettings(bc);
      window._bcBoardLayoutConfig = boardLayout;
      _bcApplyBoardLayout(boardLayout);
      conRenderBoardLayoutOptionsInContextMenu();

      // 9. Note font size globals (read at note-creation time)
      if (bc.noteDefaultFontSizeFree !== undefined) window._bcNoteFontSizeFree = bc.noteDefaultFontSizeFree;
      if (bc.noteDefaultFontSizeLinked !== undefined) window._bcNoteFontSizeLinked = bc.noteDefaultFontSizeLinked;

      // 10. Shortcuts & Quick Actions
      if (bc.shortcuts && typeof bc.shortcuts === 'object') {
        saveBoardCustomShortcutsMap(bc.shortcuts);
      }
      if (Array.isArray(bc.quickActions)) {
        saveBoardQuickActionsList(bc.quickActions);
      }
      renderQuickActionsToolbar();

      // 11. Session Autosave
      if (bc.autosaveDebounceSec !== undefined && _boardIsDirty) {
        _boardScheduleSave('constellation');
      }
    }

    // Auto-apply saved customise settings on load
    (async function () {
      let bc = (typeof BOARD_CONFIG !== 'undefined' && BOARD_CONFIG && Object.keys(BOARD_CONFIG).length)
        ? BOARD_CONFIG
        : ((typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG && CLASS_MANAGEMENT_CONFIG.boardCustomise)
          ? CLASS_MANAGEMENT_CONFIG.boardCustomise : null);
      if (window.Desktop && Desktop.isElectron() && typeof Desktop.readJson === 'function') {
        try {
          const _bcR = await Desktop.readJson('user', 'board-config.js');
          if (_bcR && _bcR.ok && _bcR.data && Object.keys(_bcR.data).length) {
            bc = _bcR.data;
            window.BOARD_CONFIG = bc;
          }
        } catch (e) { }
      }
      if (bc) {
        try { _boardCustomiseApply(bc); } catch (e) { }
      } else {
        renderQuickActionsToolbar();
      }
    })();

    // ================================================================
    // END BOARD CUSTOMISE
    // ================================================================


    function openBoardShortcuts() {
      const customMap = getBoardCustomShortcutsMap();
      const rows = [];
      let currentCat = null;

      BOARD_ACTION_DEFINITIONS.forEach(def => {
        const sc = getActiveShortcutForDef(def, customMap);
        if (!sc || !sc.key) return;

        if (def.categoryName !== currentCat) {
          currentCat = def.categoryName;
          rows.push({ section: currentCat });
        }
        rows.push({
          keys: formatShortcutKeysList(sc),
          desc: def.name + ' — ' + def.desc
        });
      });

      ShortcutsModal.open({
        title: (typeof t === 'function' ? t('skmTitle') : null) || 'Keyboard Shortcuts',
        noShortcutsText: (typeof t === 'function' ? t('skmNone') : null) || 'No keyboard shortcuts configured.',
        rows: rows
      });
    }

    function showTourChoice() {
      var el = document.getElementById('tour-choice-overlay');
      if (el) {
        if (el.parentNode !== document.body) document.body.appendChild(el);
        el.classList.add('active');
      }
    }
    function closeTourChoice() {
      document.getElementById('tour-choice-overlay').classList.remove('active');
    }
    function startTourChoice(tourType) {
      closeTourChoice();
      var labels = { next: t('tutNext'), prev: t('tutPrev'), skip: t('tutSkip'), done: t('tutDone') };
      if (tourType === 'main') {
        Tutorial.start([
          { selector: '#main-menu .menu-grid', title: t('tutMv1Title'), text: t('tutMv1Text') },
          { selector: '#history-section h2', title: t('tutMv2Title'), text: t('tutMv2Text') },
          { selector: '#history-toolbar', title: t('tutHi2Title'), text: t('tutHi2Text') },
          { selector: '#history-view-tabs', title: t('tutHi3Title'), text: t('tutHi3Text') },
          { selector: '#history-filter-bar', title: t('tutHi4Title'), text: t('tutHi4Text') },
          { selector: '#history-search-bar', title: t('tutHi5Title'), text: t('tutHi5Text') },
          { selector: '#history-table-wrap', title: t('tutHi6Title'), text: t('tutHi6Text') }
        ], labels);
      } else if (tourType === 'history') {
        Tutorial.start([
          { selector: '#history-section h2', title: t('tutHi1Title'), text: t('tutHi1Text') },
          { selector: '#history-toolbar', title: t('tutHi2Title'), text: t('tutHi2Text') },
          { selector: '#history-view-tabs', title: t('tutHi3Title'), text: t('tutHi3Text') },
          { selector: '#history-filter-bar', title: t('tutHi4Title'), text: t('tutHi4Text') },
          { selector: '#history-search-bar', title: t('tutHi5Title'), text: t('tutHi5Text') },
          { selector: '#history-table-wrap', title: t('tutHi6Title'), text: t('tutHi6Text') }
        ], labels);
      } else if (tourType === 'board') {
        navTo('constellation-section');
        setTimeout(function () {
          Tutorial.start([
            { selector: '#constellation-section .board-section-tabs', title: t('tutBd1Title'), text: t('tutBd1Text') },
            { selector: '#con-tb-file', title: t('tutBd2Title'), text: t('tutBd2Text') },
            { selector: '#con-tb-board', title: t('tutBd3Title'), text: t('tutBd3Text') },
            { selector: '#con-tb-draw', title: t('tutBd4Title'), text: t('tutBd4Text') },
            { selector: '#con-tb-vocab', title: t('tutBd5Title'), text: t('tutBd5Text') },
            { selector: '#con-tb-view', title: t('tutBd6Title'), text: t('tutBd6Text') },
            { selector: '#con-tb-pages', title: t('tutBd7Title'), text: t('tutBd7Text') },
            { selector: '#con-title-group', title: t('tutBd8Title'), text: t('tutBd8Text') },
            { selector: '#con-page-nav', title: t('tutBd9Title'), text: t('tutBd9Text') },
            { selector: '#constellation-board', title: t('tutBd10Title'), text: t('tutBd10Text') },
            { selector: '#constellation-board', title: t('tutBd11Title'), text: t('tutBd11Text') },
            { selector: '#con-draw-btn', title: t('tutBd12Title'), text: t('tutBd12Text') },
            { selector: '#con-add-table-btn', title: t('tutBd13Title'), text: t('tutBd13Text') }
          ], labels);
        }, 350);
      }
    }

    function showBoardTour() {
      var active = '';
      document.querySelectorAll('.game').forEach(function (el) {
        if (!el.classList.contains('hidden')) active = el.id;
      });

      var labels = { next: t('tutNext'), prev: t('tutPrev'), skip: t('tutSkip'), done: t('tutDone') };

      if (active === 'main-menu') {
        showTourChoice();
        return;
      }

      var launch = function () {
        Tutorial.start([
          { selector: '#constellation-section .board-section-tabs', title: t('tutBd1Title'), text: t('tutBd1Text') },
          { selector: '#con-tb-file', title: t('tutBd2Title'), text: t('tutBd2Text') },
          { selector: '#con-tb-board', title: t('tutBd3Title'), text: t('tutBd3Text') },
          { selector: '#con-tb-draw', title: t('tutBd4Title'), text: t('tutBd4Text') },
          { selector: '#con-tb-vocab', title: t('tutBd5Title'), text: t('tutBd5Text') },
          { selector: '#con-tb-view', title: t('tutBd6Title'), text: t('tutBd6Text') },
          { selector: '#con-tb-pages', title: t('tutBd7Title'), text: t('tutBd7Text') },
          { selector: '#con-title-group', title: t('tutBd8Title'), text: t('tutBd8Text') },
          { selector: '#con-page-nav', title: t('tutBd9Title'), text: t('tutBd9Text') },
          { selector: '#constellation-board', title: t('tutBd10Title'), text: t('tutBd10Text') },
          { selector: '#constellation-board', title: t('tutBd11Title'), text: t('tutBd11Text') },
          { selector: '#con-draw-btn', title: t('tutBd12Title'), text: t('tutBd12Text') },
          { selector: '#con-add-table-btn', title: t('tutBd13Title'), text: t('tutBd13Text') }
        ], labels);
      };

      if (active !== 'constellation-section') {
        navTo('constellation-section');
        setTimeout(launch, 350);
      } else {
        launch();
      }
    }

  Board.shortcuts = Board.shortcuts || {};
  Board.shortcuts.boardSoundPreviewAction = boardSoundPreviewAction;
  Board.shortcuts.boardSoundBrowseCustomFile = boardSoundBrowseCustomFile;
  Board.shortcuts.boardSoundToggleSelectAll = boardSoundToggleSelectAll;
  Board.shortcuts.boardSoundSelectAll = boardSoundSelectAll;
  Board.shortcuts.boardSoundToggleMasterEnable = boardSoundToggleMasterEnable;
  Board.shortcuts.boardSoundRescanFiles = boardSoundRescanFiles;
  Board.shortcuts.resetBoardSoundsToDefault = resetBoardSoundsToDefault;
  Board.shortcuts.boardFilterSoundTable = boardFilterSoundTable;
  Board.shortcuts._bcUpdateSoundRowState = _bcUpdateSoundRowState;
  Board.shortcuts._bcHandleSoundSourceChange = _bcHandleSoundSourceChange;
  Board.shortcuts.startRecordingBoardShortcut = startRecordingBoardShortcut;
  Board.shortcuts.clearBoardShortcut = clearBoardShortcut;
  Board.shortcuts.toggleBoardQuickActionPin = toggleBoardQuickActionPin;
  Board.shortcuts.boardFilterShortcutsTable = boardFilterShortcutsTable;
  Board.shortcuts.resetBoardShortcutsToDefault = resetBoardShortcutsToDefault;
  Board.shortcuts.renderBoardShortcutsTable = renderBoardShortcutsTable;
  Board.shortcuts.renderQuickActionsToolbar = renderQuickActionsToolbar;
  Board.shortcuts.getBoardCustomShortcutsMap = getBoardCustomShortcutsMap;
  Board.shortcuts.saveBoardCustomShortcutsMap = saveBoardCustomShortcutsMap;
  Board.shortcuts.getBoardQuickActionsList = getBoardQuickActionsList;
  Board.shortcuts.saveBoardQuickActionsList = saveBoardQuickActionsList;
  Board.shortcuts.getActiveShortcutForDef = getActiveShortcutForDef;
  Board.shortcuts.boardDispatchCustomShortcut = boardDispatchCustomShortcut;
  Board.shortcuts.openBoardShortcuts = openBoardShortcuts;
  Board.shortcuts.boardCustomiseOpen = boardCustomiseOpen;
  Board.shortcuts.boardCustomiseClose = boardCustomiseClose;
  Board.shortcuts.boardCustomiseSave = boardCustomiseSave;

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.boardSoundPreviewAction = global.boardSoundPreviewAction = boardSoundPreviewAction;
  window.boardSoundBrowseCustomFile = global.boardSoundBrowseCustomFile = boardSoundBrowseCustomFile;
  window.boardSoundToggleSelectAll = global.boardSoundToggleSelectAll = boardSoundToggleSelectAll;
  window.boardSoundSelectAll = global.boardSoundSelectAll = boardSoundSelectAll;
  window.boardFilterSoundTable = global.boardFilterSoundTable = boardFilterSoundTable;
  window.boardSoundToggleMasterEnable = global.boardSoundToggleMasterEnable = boardSoundToggleMasterEnable;
  window.boardSoundRescanFiles = global.boardSoundRescanFiles = boardSoundRescanFiles;
  window.resetBoardSoundsToDefault = global.resetBoardSoundsToDefault = resetBoardSoundsToDefault;
  window._bcUpdateSoundRowState = global._bcUpdateSoundRowState = _bcUpdateSoundRowState;
  window._bcHandleSoundSourceChange = global._bcHandleSoundSourceChange = _bcHandleSoundSourceChange;
  window._bcBuildSoundTable = global._bcBuildSoundTable = _bcBuildSoundTable;
  window._bcGetSoundSettings = global._bcGetSoundSettings = _bcGetSoundSettings;

  window.startRecordingBoardShortcut = global.startRecordingBoardShortcut = startRecordingBoardShortcut;
  window.clearBoardShortcut = global.clearBoardShortcut = clearBoardShortcut;
  window.toggleBoardQuickActionPin = global.toggleBoardQuickActionPin = toggleBoardQuickActionPin;
  window.boardFilterShortcutsTable = global.boardFilterShortcutsTable = boardFilterShortcutsTable;
  window.resetBoardShortcutsToDefault = global.resetBoardShortcutsToDefault = resetBoardShortcutsToDefault;
  window.renderBoardShortcutsTable = global.renderBoardShortcutsTable = renderBoardShortcutsTable;
  window.renderQuickActionsToolbar = global.renderQuickActionsToolbar = renderQuickActionsToolbar;
  window.saveBoardCustomShortcutsMap = global.saveBoardCustomShortcutsMap = saveBoardCustomShortcutsMap;
  window.saveBoardQuickActionsList = global.saveBoardQuickActionsList = saveBoardQuickActionsList;
  window.formatShortcutKeysList = global.formatShortcutKeysList = formatShortcutKeysList;
  window.formatShortcutKeyHtml = global.formatShortcutKeyHtml = formatShortcutKeyHtml;
  window._cancelRecording = global._cancelRecording = _cancelRecording;

  window.boardCustomiseOpen = global.boardCustomiseOpen = boardCustomiseOpen;
  window.boardCustomiseClose = global.boardCustomiseClose = boardCustomiseClose;
  window.boardCustomiseSave = global.boardCustomiseSave = boardCustomiseSave;
  window.openBoardShortcuts = global.openBoardShortcuts = openBoardShortcuts;
  window.closeTourChoice = global.closeTourChoice = closeTourChoice;
  window.startTourChoice = global.startTourChoice = startTourChoice;
  window.showBoardTour = global.showBoardTour = showBoardTour;

  window._bcSyncPickerFromText = global._bcSyncPickerFromText = _bcSyncPickerFromText;
  window.boardDispatchCustomShortcut = global.boardDispatchCustomShortcut = boardDispatchCustomShortcut;
  window.BOARD_ACTION_DEFINITIONS = global.BOARD_ACTION_DEFINITIONS = BOARD_ACTION_DEFINITIONS;
  window.getActiveShortcutForDef = global.getActiveShortcutForDef = getActiveShortcutForDef;
  window.getBoardCustomShortcutsMap = global.getBoardCustomShortcutsMap = getBoardCustomShortcutsMap;
  window.getBoardQuickActionsList = global.getBoardQuickActionsList = getBoardQuickActionsList;
  window._bcEnableDragReorder = global._bcEnableDragReorder = _bcEnableDragReorder;

})(typeof window !== "undefined" ? window : this);