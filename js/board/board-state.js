/**
 * Class Management Tools — Board State Layer
 * Centralized state registry for the Board constellation canvas, nodes, drawings,
 * shapes, notes, tables, and multi-page snapshots.
 *
 * Exposes state on window.Board.state while aliasing legacy globals on window
 * to guarantee 100% backward compatibility with inline HTML event handlers.
 */
(function (global) {
  'use strict';

  var Board = global.Board = global.Board || {};

  // --- Constants & Storage Keys ---
  var CLASS_GROUP_STORAGE_KEY = 'active_class_group';
  var CON_FONT_UNIT_KEY = 'con_pref_font_unit';
  var AW_STORAGE_KEY = 'custom_words';
  var AW_QUOTES_KEY = 'custom_quotes';
  var AW_GAP_KEY = 'custom_gap_fill';
  var AW_ERROR_KEY = 'custom_errors';
  var MDB_DELETED_KEY = 'deleted_words';
  var BOARD_SAVED_SESSIONS_KEY = 'board_saved_sessions_v1';
  var CON_MASK_COLORS = [
    '#111111', '#444444', '#888888', '#bbbbbb', '#ffffff',
    '#e2c96e', '#6abf8e', '#5b8fcc', '#8b7cc2', '#c96b6b'
  ];
  var CON_PALETTES = global.CON_PALETTES = global.CON_PALETTES || [
    ['#ffffff', '#111111', '#111111'],  // White (default)
    ['#374151', '#ffffff', '#111111'],  // Dark Grey
    ['#111111', '#ffffff', '#555555'],  // Black
    ['#fee2e2', '#111111', '#dc2626'],  // Red
    ['#ffedd5', '#111111', '#ea580c'],  // Orange
    ['#fef3c7', '#111111', '#d97706'],  // Yellow
    ['#dcfce7', '#111111', '#16a34a'],  // Green
    ['#ccfbf1', '#111111', '#0d9488'],  // Teal
    ['#dbeafe', '#111111', '#2563eb'],  // Blue
    ['#e0f2fe', '#111111', '#0284c7'],  // Sky
    ['#f3e8ff', '#111111', '#7c3aed'],  // Purple
    ['#fce7f3', '#111111', '#db2777']   // Pink
  ];
  var CON_DRAW_COLORS = global.CON_DRAW_COLORS = global.CON_DRAW_COLORS || [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
    '#3949ab', '#1e88e5', '#039be5', '#00acc1',
    '#00897b', '#43a047', '#7cb342', '#c0ca33',
    '#fdd835', '#ffb300', '#fb8c00', '#f4511e',
    '#6d4c41', '#757575', '#546e7a', '#111111'
  ];

  // --- Canvas & Session State Collections ---
  var conNodes = global.conNodes = global.conNodes || [];
  var conEdges = global.conEdges = global.conEdges || [];
  var conDrawings = global.conDrawings = global.conDrawings || [];
  var conShapes = global.conShapes = global.conShapes || [];
  var conTables = global.conTables = global.conTables || [];
  var conNotes = global.conNotes = global.conNotes || [];
  var conGroups = global.conGroups = global.conGroups || [];
  var conMasks = global.conMasks = global.conMasks || [];
  var conPageSnapshots = global.conPageSnapshots = global.conPageSnapshots || [{}];
  var conTitle = global.conTitle = global.conTitle || '';
  var _conCurrentPageIndex = 0;

  // Global property descriptor for conCurrentPageIndex so all files read/write the shared active index
  try {
    Object.defineProperty(global, 'conCurrentPageIndex', {
      get: function () { return _conCurrentPageIndex; },
      set: function (v) { _conCurrentPageIndex = (typeof v === 'number' && !isNaN(v)) ? v : 0; },
      configurable: true,
      enumerable: true
    });
  } catch (_) {
    global.conCurrentPageIndex = 0;
  }

  // --- Page Background, Attachments, and Media Collections ---
  var _conPageBackgroundPdf = null;
  try {
    Object.defineProperty(global, 'conPageBackgroundPdf', {
      get: function () { return _conPageBackgroundPdf; },
      set: function (v) { _conPageBackgroundPdf = v; },
      configurable: true,
      enumerable: true
    });
    if (typeof window !== 'undefined' && window !== global) {
      Object.defineProperty(window, 'conPageBackgroundPdf', {
        get: function () { return _conPageBackgroundPdf; },
        set: function (v) { _conPageBackgroundPdf = v; },
        configurable: true,
        enumerable: true
      });
    }
  } catch (_) {
    global.conPageBackgroundPdf = null;
    if (typeof window !== 'undefined') window.conPageBackgroundPdf = null;
  }

  var _conBoardBgVal = null;
  try {
    Object.defineProperty(global, '_conBoardBg', {
      get: function () { return _conBoardBgVal; },
      set: function (v) { _conBoardBgVal = v; },
      configurable: true,
      enumerable: true
    });
    if (typeof window !== 'undefined' && window !== global) {
      Object.defineProperty(window, '_conBoardBg', {
        get: function () { return _conBoardBgVal; },
        set: function (v) { _conBoardBgVal = v; },
        configurable: true,
        enumerable: true
      });
    }
  } catch (_) {
    global._conBoardBg = null;
    if (typeof window !== 'undefined') window._conBoardBg = null;
  }

  var _conBoardBgColorVal = '';
  try {
    Object.defineProperty(global, '_conBoardBgColor', {
      get: function () { return _conBoardBgColorVal; },
      set: function (v) { _conBoardBgColorVal = (v != null) ? String(v) : ''; },
      configurable: true,
      enumerable: true
    });
    if (typeof window !== 'undefined' && window !== global) {
      Object.defineProperty(window, '_conBoardBgColor', {
        get: function () { return _conBoardBgColorVal; },
        set: function (v) { _conBoardBgColorVal = (v != null) ? String(v) : ''; },
        configurable: true,
        enumerable: true
      });
    }
  } catch (_) {
    global._conBoardBgColor = '';
    if (typeof window !== 'undefined') window._conBoardBgColor = '';
  }

  var _conAttachments = [];
  try {
    Object.defineProperty(global, 'conAttachments', {
      get: function () { return _conAttachments; },
      set: function (v) { _conAttachments = Array.isArray(v) ? v : []; },
      configurable: true,
      enumerable: true
    });
    if (typeof window !== 'undefined' && window !== global) {
      Object.defineProperty(window, 'conAttachments', {
        get: function () { return _conAttachments; },
        set: function (v) { _conAttachments = Array.isArray(v) ? v : []; },
        configurable: true,
        enumerable: true
      });
    }
  } catch (_) {
    global.conAttachments = _conAttachments;
    if (typeof window !== 'undefined') window.conAttachments = _conAttachments;
  }

  var _conMediaItems = [];
  try {
    Object.defineProperty(global, 'conMediaItems', {
      get: function () { return _conMediaItems; },
      set: function (v) { _conMediaItems = Array.isArray(v) ? v : []; },
      configurable: true,
      enumerable: true
    });
    if (typeof window !== 'undefined' && window !== global) {
      Object.defineProperty(window, 'conMediaItems', {
        get: function () { return _conMediaItems; },
        set: function (v) { _conMediaItems = Array.isArray(v) ? v : []; },
        configurable: true,
        enumerable: true
      });
    }
  } catch (_) {
    global.conMediaItems = _conMediaItems;
    if (typeof window !== 'undefined') window.conMediaItems = _conMediaItems;
  }


  function board() { return document.getElementById('constellation-board'); }
  global.board = (typeof window !== 'undefined') ? (window.board = board) : board;
  global.conGetBoard = board;
  if (typeof window !== 'undefined') window.conGetBoard = board;

  function svg() { return document.getElementById('constellation-svg'); }
  global.svg = (typeof window !== 'undefined') ? (window.svg = svg) : svg;
  global.conGetSvg = svg;
  if (typeof window !== 'undefined') window.conGetSvg = svg;

  var _conMaskCtxIdVal = null;

  // --- Active Selection Sets & Registers ---
  var conSelected = global.conSelected = global.conSelected || null;
  var conMultiSelected = global.conMultiSelected = global.conMultiSelected || new Set();
  var conDrawingSelected = global.conDrawingSelected = global.conDrawingSelected || new Set();
  var conNoteSelected = global.conNoteSelected = global.conNoteSelected || new Set();
  var _conShapeSelected = global._conShapeSelected = global._conShapeSelected || new Set();
  var conTableSelected = global.conTableSelected = global.conTableSelected || new Set();
  var conMediaSelected = global.conMediaSelected = global.conMediaSelected || new Set();

  // --- Canvas Modes & State Flags ---
  var _conModeVal = (global && global.conMode) || 'move';
  var _conCurrentFolderNameVal = (global && global._conCurrentFolderName) || null;
  var _conCurrentFileNameVal = (global && global._conCurrentFileName) || null;
  var _conBoardRevision = global._conBoardRevision = global._conBoardRevision || 1;
  var _conActiveLibCategory = global._conActiveLibCategory = global._conActiveLibCategory || 'all';
  var _conSearchScope = global._conSearchScope = global._conSearchScope || 'current';
  var activeSection = global.activeSection = global.activeSection || 'main-menu';
  var currentGameWord = global.currentGameWord = global.currentGameWord || null;
  var usedWords = global.usedWords = global.usedWords || new Set();

  function _bindGlobalProp(propName, getFn, setFn) {
    try {
      Object.defineProperty(global, propName, {
        get: getFn,
        set: setFn,
        configurable: true,
        enumerable: true
      });
      if (typeof window !== 'undefined' && window !== global) {
        Object.defineProperty(window, propName, {
          get: getFn,
          set: setFn,
          configurable: true,
          enumerable: true
        });
      }
    } catch (_) {
      global[propName] = getFn();
      if (typeof window !== 'undefined') window[propName] = getFn();
    }
  }

  _bindGlobalProp('_conCurrentFileName',
    function () { return _conCurrentFileNameVal; },
    function (v) { _conCurrentFileNameVal = v; }
  );

  _bindGlobalProp('_conCurrentFolderName',
    function () { return _conCurrentFolderNameVal; },
    function (v) { _conCurrentFolderNameVal = v; }
  );

  _bindGlobalProp('conMode',
    function () {
      if (typeof window !== 'undefined' && typeof window.conGetMode === 'function') {
        return window.conGetMode();
      }
      return _conModeVal;
    },
    function (v) {
      _conModeVal = v;
      if (typeof window !== 'undefined' && typeof window.conSetMode === 'function' && window.conGetMode && window.conGetMode() !== v) {
        window.conSetMode(v);
      }
    }
  );

  // --- Drawing & Vector Shapes Engine State ---
  var _conDrawColorVal = '#e53935';
  var _conDrawThicknessVal = 4;
  var _conDrawOpacityVal = 1;
  var _conDrawHandModeVal = false;
  var _conDrawEraserModeVal = false;
  var _conDrawNextIdVal = 1;
  var _conDrawCtxIdVal = null;
  var _conShapeNextIdVal = 1;
  var _conShapeCtxIdVal = null;
  var _conDrawShapeToolVal = null;
  var _conDrawShapeFillVal = 'none';
  var _conDrawShapeDashVal = 'solid';
  var _conDrawArrowheadSizeVal = 20;
  var _conGroupNextIdVal = 1;
  var _conMaskNextIdVal = 1;

  _bindGlobalProp('_conDrawColor', function () { return _conDrawColorVal; }, function (v) { _conDrawColorVal = (v != null) ? String(v) : '#e53935'; });
  _bindGlobalProp('_conDrawThickness', function () { return _conDrawThicknessVal; }, function (v) { _conDrawThicknessVal = Number(v) || 4; });
  _bindGlobalProp('_conDrawOpacity', function () { return _conDrawOpacityVal; }, function (v) { _conDrawOpacityVal = (typeof v === 'number') ? v : (Number(v) || 1); });
  _bindGlobalProp('_conDrawEraserMode', function () { return _conDrawEraserModeVal; }, function (v) { _conDrawEraserModeVal = !!v; });
  _bindGlobalProp('_conDrawHandMode', function () { return _conDrawHandModeVal; }, function (v) { _conDrawHandModeVal = !!v; });
  _bindGlobalProp('_conDrawNextId', function () { return _conDrawNextIdVal; }, function (v) { _conDrawNextIdVal = Number(v) || 1; });
  _bindGlobalProp('_conDrawCtxId', function () { return _conDrawCtxIdVal; }, function (v) { _conDrawCtxIdVal = v; });

  _bindGlobalProp('_conShapeNextId', function () { return _conShapeNextIdVal; }, function (v) { _conShapeNextIdVal = Number(v) || 1; });
  _bindGlobalProp('_conShapeCtxId', function () { return _conShapeCtxIdVal; }, function (v) { _conShapeCtxIdVal = v; });
  _bindGlobalProp('_conDrawShapeTool', function () { return _conDrawShapeToolVal; }, function (v) { _conDrawShapeToolVal = v; });
  _bindGlobalProp('_conDrawShapeFill', function () { return _conDrawShapeFillVal; }, function (v) { _conDrawShapeFillVal = (v != null) ? String(v) : 'none'; });
  _bindGlobalProp('_conDrawShapeDash', function () { return _conDrawShapeDashVal; }, function (v) { _conDrawShapeDashVal = (v != null) ? String(v) : 'solid'; });
  _bindGlobalProp('_conDrawArrowheadSize', function () { return _conDrawArrowheadSizeVal; }, function (v) { _conDrawArrowheadSizeVal = Number(v) || 20; });
  _bindGlobalProp('_conMaskCtxId', function () { return _conMaskCtxIdVal; }, function (v) { _conMaskCtxIdVal = v; });
  _bindGlobalProp('_conMaskNextId', function () { return _conMaskNextIdVal; }, function (v) { _conMaskNextIdVal = Number(v) || 1; });
  _bindGlobalProp('_conGroupNextId', function () { return _conGroupNextIdVal; }, function (v) { _conGroupNextIdVal = Number(v) || 1; });

  function _conShapeDashArr(style, thickness) {
    var sw = Math.max(1, thickness);
    if (style === 'dashed') return String(sw * 4) + ' ' + String(sw * 2);
    if (style === 'dotted') return String(sw) + ' ' + String(sw * 2);
    return null;
  }
  global._conShapeDashArr = (typeof window !== 'undefined') ? (window._conShapeDashArr = _conShapeDashArr) : _conShapeDashArr;

  var CON_SHAPE_TYPES = [
    { id: 'rect', icon: 'Rectangle', title: 'Rectangle' },
    { id: 'circle', icon: 'Circle', title: 'Circle / Ellipse' },
    { id: 'diamond', icon: 'Diamond', title: 'Diamond' },
    { id: 'line', icon: 'Line', title: 'Line' },
    { id: 'arrow', icon: 'Arrow', title: 'Arrow' },
    { id: 'polygon', icon: 'Polygon', title: 'Polygon (click to add points · Ctrl = snap angles · click start point or double-click to close)' }
  ];
  global.CON_SHAPE_TYPES = (typeof window !== 'undefined') ? (window.CON_SHAPE_TYPES = CON_SHAPE_TYPES) : CON_SHAPE_TYPES;

  var _boardIsDirtyVal = false;
  _bindGlobalProp('_boardIsDirty',
    function () { return _boardIsDirtyVal; },
    function (v) { _boardIsDirtyVal = !!v; }
  );

  var _boardInitCompleteVal = false;
  _bindGlobalProp('_boardInitComplete',
    function () { return _boardInitCompleteVal; },
    function (v) { _boardInitCompleteVal = !!v; }
  );

  var _conIsRestoringSessionVal = false;
  _bindGlobalProp('_conIsRestoringSession',
    function () { return _conIsRestoringSessionVal; },
    function (v) { _conIsRestoringSessionVal = !!v; }
  );

  var _conIsSavingVal = false;
  _bindGlobalProp('_conIsSaving',
    function () { return _conIsSavingVal; },
    function (v) { _conIsSavingVal = !!v; }
  );

  var _conPendingManualSaveVal = false;
  _bindGlobalProp('_conPendingManualSave',
    function () { return _conPendingManualSaveVal; },
    function (v) { _conPendingManualSaveVal = !!v; }
  );

  var _conLastSaveTimestampVal = 0;
  _bindGlobalProp('_conLastSaveTimestamp',
    function () { return _conLastSaveTimestampVal; },
    function (v) { _conLastSaveTimestampVal = v; }
  );

  var _boardMutationFirstDirtyAtVal = 0;
  _bindGlobalProp('_boardMutationFirstDirtyAt',
    function () { return _boardMutationFirstDirtyAtVal; },
    function (v) { _boardMutationFirstDirtyAtVal = v; }
  );

  var boardAutosaveFingerprint = global.boardAutosaveFingerprint = global.boardAutosaveFingerprint || {
    constellation: '',
    textanalysis: '',
    notes: ''
  };
  if (typeof window !== 'undefined') window.boardAutosaveFingerprint = boardAutosaveFingerprint;

  var boardSessionDateCreated = global.boardSessionDateCreated = global.boardSessionDateCreated || {
    constellation: '',
    textanalysis: '',
    notes: ''
  };
  if (typeof window !== 'undefined') window.boardSessionDateCreated = boardSessionDateCreated;

  var boardSessionFileMeta = global.boardSessionFileMeta = global.boardSessionFileMeta || {
    constellation: { createdAt: 0, savedAt: 0 },
    textanalysis: { createdAt: 0, savedAt: 0 },
    notes: { createdAt: 0, savedAt: 0 }
  };
  if (typeof window !== 'undefined') window.boardSessionFileMeta = boardSessionFileMeta;

  // --- Shared Core Filename & Class Roster Utilities ---
  function sanitizeFilenamePart(raw) {
    return String(raw || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_');
  }
  global.sanitizeFilenamePart = (typeof window !== 'undefined') ? (window.sanitizeFilenamePart = sanitizeFilenamePart) : sanitizeFilenamePart;

  function boardStripJsonExt(name) {
    return String(name || '').replace(/\.(json|js|cstz|zip)$/i, '');
  }
  global.boardStripJsonExt = (typeof window !== 'undefined') ? (window.boardStripJsonExt = boardStripJsonExt) : boardStripJsonExt;

  function getClassGroupLabel(groupName) {
    const label = String(groupName || '').trim();
    if (!label) return 'No class prefix';
    if (typeof _cgDisplayName === 'function') {
      return _cgDisplayName(label) || label;
    }
    if (typeof window._cgDisplayName === 'function') {
      return window._cgDisplayName(label) || label;
    }
    return label;
  }
  global.getClassGroupLabel = (typeof window !== 'undefined') ? (window.getClassGroupLabel = getClassGroupLabel) : getClassGroupLabel;

  // --- Shared Canvas Coordinates & Interaction State ---
  var _boardCtxXVal = 0;
  var _boardCtxYVal = 0;
  _bindGlobalProp('_boardCtxX', function () { return _boardCtxXVal; }, function (v) { _boardCtxXVal = Number(v) || 0; });
  _bindGlobalProp('_boardCtxY', function () { return _boardCtxYVal; }, function (v) { _boardCtxYVal = Number(v) || 0; });

  var _conUndoStackVal = [];
  var _conRedoStackVal = [];
  _bindGlobalProp('_conUndoStack', function () { return _conUndoStackVal; }, function (v) { _conUndoStackVal = Array.isArray(v) ? v : []; });
  _bindGlobalProp('_conRedoStack', function () { return _conRedoStackVal; }, function (v) { _conRedoStackVal = Array.isArray(v) ? v : []; });

  var _conLinkSrcVal = null;
  _bindGlobalProp('_conLinkSrc', function () { return _conLinkSrcVal; }, function (v) { _conLinkSrcVal = v; });

  var _conPendingDuplicateRelinkRenameVal = false;
  _bindGlobalProp('_conPendingDuplicateRelinkRename', function () { return _conPendingDuplicateRelinkRenameVal; }, function (v) { _conPendingDuplicateRelinkRenameVal = !!v; });

  var taDrawings = global.taDrawings = global.taDrawings || [];
  if (typeof window !== 'undefined') window.taDrawings = taDrawings;

  // --- Board DOM element helper ---
  function conGetBoard() {
    return document.getElementById('constellation-board');
  }
  global.conGetBoard = window.conGetBoard = conGetBoard;
  global.board = window.board = conGetBoard;

  // --- Bank Fallbacks ---
  if (!Array.isArray(global.vocabBank)) global.vocabBank = [];
  if (!Array.isArray(global.quoteBank)) global.quoteBank = [];
  if (!Array.isArray(global.gapFillBank)) global.gapFillBank = [];
  if (!Array.isArray(global.errorBank)) global.errorBank = [];

  // --- Media & Attachment Forward Stubs ---
  global.conGetAttachmentDataUrl = global.conGetAttachmentDataUrl || async function (att) {
    if (!att) return '';
    if (att._cachedObjectUrl) return att._cachedObjectUrl;
    if (att.dataUrl) return att.dataUrl;
    return '';
  };
  global.conGetDrawingSelected = global.conGetDrawingSelected || function () {
    return global.conDrawingSelected;
  };

  // --- Edge & Overlay Forward Stubs (Prevent early ReferenceErrors before full load) ---
  global.conEdgeCtxApplyLive = global.conEdgeCtxApplyLive || function () {};
  global.conEdgeCtxSetAutoColor = global.conEdgeCtxSetAutoColor || function () {};
  global.conEdgeCtxSetStroke = global.conEdgeCtxSetStroke || function () {};
  global.conEdgeCtxSetRouting = global.conEdgeCtxSetRouting || function () {};
  global.conEdgeCtxSetDir = global.conEdgeCtxSetDir || function () {};
  global.conEdgeCtxSetPreset = global.conEdgeCtxSetPreset || function () {};
  global.conEdgeCtxClose = global.conEdgeCtxClose || function () {};
  global.conEdgeCtxDelete = global.conEdgeCtxDelete || function () {};
  global.conEdgeCtxSave = global.conEdgeCtxSave || function () {};
  global.conEdgeCtxOpen = global.conEdgeCtxOpen || function () {};
  global._conSyncDrawOverlaySize = global._conSyncDrawOverlaySize || function () {};
  global.conInitSwatches = global.conInitSwatches || function () {};

  // --- Drawing, Shape & Mode Forward Stubs ---
  global.conShapeBuild = global.conShapeBuild || function () {};
  global._conDrawSyncOverlayCursor = global._conDrawSyncOverlayCursor || function () {};
  global._conSyncEraserToolbarBtn = global._conSyncEraserToolbarBtn || function () {};
  global.conDrawInitPanel = global.conDrawInitPanel || function () {};
  global.conShapeInitPanel = global.conShapeInitPanel || function () {};
  global._conShapeSyncPanelState = global._conShapeSyncPanelState || function () {};
  global.conPushUndo = global.conPushUndo || function () {};
  global.conSetMode = global.conSetMode || function () {};
  global._conPolygonReset = global._conPolygonReset || function () {};
  global.conDrawSetColor = global.conDrawSetColor || function () {};
  global.conDrawSetThickness = global.conDrawSetThickness || function () {};
  global.conDrawSetOpacity = global.conDrawSetOpacity || function () {};
  global.conToggleDrawMode = global.conToggleDrawMode || function () {};
  global.conUndo = global.conUndo || function () {};
  global.conRedo = global.conRedo || function () {};
  global.conGetMode = global.conGetMode || function () { return 'move'; };
  global.conDuplicateSelected = global.conDuplicateSelected || function () {};
  global.mdbToast = global.mdbToast || function (msg) {
    if (typeof showToast === 'function') return showToast(msg);
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') return window.showToast(msg);
    try {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:11px 26px;border-radius:8px;font-size:0.95rem;font-weight:700;color:#fff;background:#111;box-shadow:0 4px 18px rgba(0,0,0,0.25);white-space:nowrap;pointer-events:none;';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    } catch (_) {}
  };

  global.boardT = function (key) {
    if (typeof window !== 'undefined' && typeof window.t === 'function') return window.t(key);
    if (typeof t === 'function') return t(key);
    return key;
  };

  global.boardSectionLabel = function (section) {
    if (section === 'constellation') return 'Constellation';
    if (section === 'notes') return 'Notes';
    return 'Textual Analysis';
  };

  global.boardSessionType = function (section) {
    if (section === 'constellation') return 'constellation';
    if (section === 'notes') return 'notes';
    return 'textanalysis';
  };

  if (typeof window !== 'undefined') {
    window.boardT = window.boardT || global.boardT;
    window.boardSectionLabel = window.boardSectionLabel || global.boardSectionLabel;
    window.boardSessionType = window.boardSessionType || global.boardSessionType;
    window.conShapeBuild = window.conShapeBuild || global.conShapeBuild;
    window._conDrawSyncOverlayCursor = window._conDrawSyncOverlayCursor || global._conDrawSyncOverlayCursor;
    window._conSyncEraserToolbarBtn = window._conSyncEraserToolbarBtn || global._conSyncEraserToolbarBtn;
    window.conDrawInitPanel = window.conDrawInitPanel || global.conDrawInitPanel;
    window.conShapeInitPanel = window.conShapeInitPanel || global.conShapeInitPanel;
    window._conShapeSyncPanelState = window._conShapeSyncPanelState || global._conShapeSyncPanelState;
    window.conPushUndo = window.conPushUndo || global.conPushUndo;
    window.conSetMode = window.conSetMode || global.conSetMode;
    window._conPolygonReset = window._conPolygonReset || global._conPolygonReset;
    window.conDrawSetColor = window.conDrawSetColor || global.conDrawSetColor;
    window.conDrawSetThickness = window.conDrawSetThickness || global.conDrawSetThickness;
    window.conDrawSetOpacity = window.conDrawSetOpacity || global.conDrawSetOpacity;
    window.conToggleDrawMode = window.conToggleDrawMode || global.conToggleDrawMode;
    window.conUndo = window.conUndo || global.conUndo;
    window.conRedo = window.conRedo || global.conRedo;
    window.conGetMode = window.conGetMode || global.conGetMode;
    window.conDuplicateSelected = window.conDuplicateSelected || global.conDuplicateSelected;
    window.mdbToast = window.mdbToast || global.mdbToast;
  }

  // --- Expose State on window.Board.state ---
  Board.state = {
    // Constants
    CLASS_GROUP_STORAGE_KEY: CLASS_GROUP_STORAGE_KEY,
    CON_FONT_UNIT_KEY: CON_FONT_UNIT_KEY,
    CON_MASK_COLORS: CON_MASK_COLORS,
    CON_PALETTES: CON_PALETTES,
    CON_DRAW_COLORS: CON_DRAW_COLORS,
    AW_STORAGE_KEY: AW_STORAGE_KEY,
    AW_QUOTES_KEY: AW_QUOTES_KEY,
    AW_GAP_KEY: AW_GAP_KEY,
    AW_ERROR_KEY: AW_ERROR_KEY,
    MDB_DELETED_KEY: MDB_DELETED_KEY,
    BOARD_SAVED_SESSIONS_KEY: BOARD_SAVED_SESSIONS_KEY,

    // Collections getters
    get nodes() { return global.conNodes; },
    set nodes(val) { global.conNodes = val; },

    get edges() { return global.conEdges; },
    set edges(val) { global.conEdges = val; },

    get drawings() { return global.conDrawings; },
    set drawings(val) { global.conDrawings = val; },

    get shapes() { return global.conShapes; },
    set shapes(val) { global.conShapes = val; },

    get tables() { return global.conTables; },
    set tables(val) { global.conTables = val; },

    get notes() { return global.conNotes; },
    set notes(val) { global.conNotes = val; },

    get groups() { return global.conGroups; },
    set groups(val) { global.conGroups = val; },

    get masks() { return global.conMasks; },
    set masks(val) { global.conMasks = val; },

    get pageSnapshots() { return global.conPageSnapshots; },
    set pageSnapshots(val) { global.conPageSnapshots = val; },

    get currentPageIndex() { return _conCurrentPageIndex; },
    set currentPageIndex(val) { _conCurrentPageIndex = (typeof val === 'number') ? val : 0; },

    // Selection & Revision
    get selected() { return global.conSelected; },
    set selected(val) { global.conSelected = val; },

    get multiSelected() { return global.conMultiSelected; },
    get drawingSelected() { return global.conDrawingSelected; },
    get noteSelected() { return global.conNoteSelected; },
    get shapeSelected() { return global._conShapeSelected; },
    get tableSelected() { return global.conTableSelected; },
    get mediaSelected() { return global.conMediaSelected; },

    get currentFileName() { return global._conCurrentFileName; },
    set currentFileName(val) { global._conCurrentFileName = val; },

    get currentFolderName() { return global._conCurrentFolderName; },
    set currentFolderName(val) { global._conCurrentFolderName = val; },

    get isDirty() { return global._boardIsDirty; },
    set isDirty(val) { global._boardIsDirty = !!val; },

    get initComplete() { return global._boardInitComplete; },
    set initComplete(val) { global._boardInitComplete = !!val; },

    get isRestoringSession() { return global._conIsRestoringSession; },
    set isRestoringSession(val) { global._conIsRestoringSession = !!val; },

    get isSaving() { return global._conIsSaving; },
    set isSaving(val) { global._conIsSaving = !!val; },

    get revision() { return global._conBoardRevision; },
    set revision(val) { global._conBoardRevision = val; },

    bumpRevision: function () {
      global._conBoardRevision = (global._conBoardRevision || 0) + 1;
      return global._conBoardRevision;
    }
  };

  // Expose global constants and shared state for backward compatibility
  global.CLASS_GROUP_STORAGE_KEY = CLASS_GROUP_STORAGE_KEY;
  global.CON_FONT_UNIT_KEY = CON_FONT_UNIT_KEY;
  global.CON_MASK_COLORS = CON_MASK_COLORS;
  global.CON_PALETTES = CON_PALETTES;
  global.CON_DRAW_COLORS = CON_DRAW_COLORS;
  global.AW_STORAGE_KEY = AW_STORAGE_KEY;
  global.AW_QUOTES_KEY = AW_QUOTES_KEY;
  global.AW_GAP_KEY = AW_GAP_KEY;
  global.AW_ERROR_KEY = AW_ERROR_KEY;
  global.MDB_DELETED_KEY = MDB_DELETED_KEY;
  global.BOARD_SAVED_SESSIONS_KEY = BOARD_SAVED_SESSIONS_KEY;
  global.conMultiSelected = conMultiSelected;
  global.conDrawingSelected = conDrawingSelected;
  global.conNoteSelected = conNoteSelected;
  global.conNotes = conNotes;
  global.conNodes = conNodes;
  global.conGroups = conGroups;
  global.conDrawings = conDrawings;
  global.conShapes = conShapes;
  global.conTables = conTables;
  global._conShapeSelected = _conShapeSelected;
  global.conTableSelected = conTableSelected;
  global.conMediaSelected = conMediaSelected;
  global.conMasks = conMasks;
  global.conTitle = conTitle;
  global.sanitizeFilenamePart = sanitizeFilenamePart;
  global.boardStripJsonExt = boardStripJsonExt;
  global.getClassGroupLabel = getClassGroupLabel;
  if (typeof window !== 'undefined') {
    window.conNotes = conNotes;
    window.conNoteSelected = conNoteSelected;
    window.conMediaSelected = conMediaSelected;
    window.sanitizeFilenamePart = sanitizeFilenamePart;
    window.boardStripJsonExt = boardStripJsonExt;
    window.getClassGroupLabel = getClassGroupLabel;
  }

})(typeof window !== 'undefined' ? window : this);
