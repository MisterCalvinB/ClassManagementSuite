/**
 * Class Management Tools — Board Premade Library Module
 * Provides stock educational templates, interactive widgets, callouts,
 * and user-saved custom node/note structures.
 */

(function () {
  'use strict';

  const STOCK_PREMADE_ITEMS = [
    // --- TEMPLATES ---
    {
      id: 'stock_lesson_objectives',
      name: 'Lesson Objectives',
      category: 'templates',
      description: 'Header node with a structured objectives checklist note.',
      data: {
        nodes: [
          {
            id: 'cn_stock_obj_header',
            baseWord: 'LESSON OBJECTIVES',
            x: 0,
            y: 0,
            bg: '#eff6ff',
            color: '#1e40af',
            border: '#3b82f6',
            borderWidth: 2,
            borderStyle: 'solid',
            fontSize: '18px',
            shape: 'rectangle',
            fmt: { bold: true }
          }
        ],
        notes: [
          {
            id: 'cnn_stock_obj_note',
            nodeId: 'cn_stock_obj_header',
            x: 0,
            y: 55,
            width: 320,
            height: 150,
            manualSize: true,
            bg: '#ffffff',
            color: '#1f2937',
            borderColor: '#bfdbfe',
            borderWidth: 1.5,
            borderStyle: 'solid',
            fontSize: 14,
            text: "Today's Goals:\n• 1. Understand key terms\n• 2. Apply rules in practice\n• 3. Complete exit reflection",
            html: "<b>Today's Goals:</b><ul style=\"margin:6px 0 0 16px;padding:0;\"><li>1. Understand key terms</li><li>2. Apply rules in practice</li><li>3. Complete exit reflection</li></ul>"
          }
        ]
      }
    },
    {
      id: 'stock_exit_ticket',
      name: 'Exit Ticket',
      category: 'templates',
      description: 'End-of-lesson feedback and reflection prompt.',
      data: {
        nodes: [
          {
            id: 'cn_stock_exit_header',
            baseWord: 'EXIT TICKET',
            x: 0,
            y: 0,
            bg: '#fdf2f8',
            color: '#9d174d',
            border: '#f472b6',
            borderWidth: 2,
            borderStyle: 'solid',
            fontSize: '18px',
            shape: 'rectangle',
            fmt: { bold: true }
          }
        ],
        notes: [
          {
            id: 'cnn_stock_exit_note',
            nodeId: 'cn_stock_exit_header',
            x: 0,
            y: 55,
            width: 320,
            height: 160,
            manualSize: true,
            bg: '#ffffff',
            color: '#1f2937',
            borderColor: '#fbcfe8',
            borderWidth: 1.5,
            borderStyle: 'solid',
            fontSize: 13,
            text: "Before you leave:\n1. One key thing I learned today:\n2. One question I still have:\n3. Confidence level (1 - 5):",
            html: "<b>Before you leave:</b><br><br><b>1.</b> One key thing I learned today:<br><i>...</i><br><br><b>2.</b> One question I still have:<br><i>...</i><br><br><b>3.</b> Confidence level (1 - 5): [ 1  2  3  4  5 ]"
          }
        ]
      }
    },
    {
      id: 'stock_homework',
      name: 'Homework & Deadlines',
      category: 'templates',
      description: 'Structured card for assignments, readings, and due dates.',
      data: {
        nodes: [
          {
            id: 'cn_stock_hw_header',
            baseWord: 'HOMEWORK & DUE DATES',
            x: 0,
            y: 0,
            bg: '#ecfdf5',
            color: '#065f46',
            border: '#10b981',
            borderWidth: 2,
            borderStyle: 'solid',
            fontSize: '17px',
            shape: 'rectangle',
            fmt: { bold: true }
          }
        ],
        notes: [
          {
            id: 'cnn_stock_hw_note',
            nodeId: 'cn_stock_hw_header',
            x: 0,
            y: 55,
            width: 320,
            height: 140,
            manualSize: true,
            bg: '#ffffff',
            color: '#1f2937',
            borderColor: '#a7f3d0',
            borderWidth: 1.5,
            borderStyle: 'solid',
            fontSize: 14,
            text: "Assignment:\n• Complete exercises 1 to 4 on page 42\n• Revise vocabulary list #3\nDue Date: Next lesson",
            html: "<b>Assignment:</b><br>• Complete exercises 1 to 4 on page 42<br>• Revise vocabulary list #3<br><br><b>Due Date:</b> Next lesson"
          }
        ]
      }
    },
    {
      id: 'stock_group_roles',
      name: 'Group Work Roles',
      category: 'templates',
      description: '4 assigned cooperative roles for group assignments.',
      data: {
        nodes: [
          { id: 'cn_role_time', baseWord: 'Timekeeper', x: 0, y: 0, bg: '#fef3c7', color: '#92400e', border: '#f59e0b', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } },
          { id: 'cn_role_scribe', baseWord: 'Scribe', x: 190, y: 0, bg: '#e0e7ff', color: '#3730a3', border: '#6366f1', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } },
          { id: 'cn_role_speaker', baseWord: 'Speaker', x: 380, y: 0, bg: '#fee2e2', color: '#991b1b', border: '#ef4444', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } },
          { id: 'cn_role_facilitator', baseWord: 'Facilitator', x: 570, y: 0, bg: '#f3e8ff', color: '#6b21a8', border: '#a855f7', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } }
        ],
        notes: [
          { id: 'cnn_role_time', nodeId: 'cn_role_time', x: 0, y: 48, width: 170, height: 80, manualSize: true, bg: '#ffffff', fontSize: 12, text: 'Monitors time and keeps the group on schedule.' },
          { id: 'cnn_role_scribe', nodeId: 'cn_role_scribe', x: 190, y: 48, width: 170, height: 80, manualSize: true, bg: '#ffffff', fontSize: 12, text: 'Records ideas, decisions, and produces the final draft.' },
          { id: 'cnn_role_speaker', nodeId: 'cn_role_speaker', x: 380, y: 48, width: 170, height: 80, manualSize: true, bg: '#ffffff', fontSize: 12, text: 'Presents the findings and answers questions from the class.' },
          { id: 'cnn_role_facilitator', nodeId: 'cn_role_facilitator', x: 570, y: 48, width: 170, height: 80, manualSize: true, bg: '#ffffff', fontSize: 12, text: 'Ensures everyone speaks and stays respectful and on task.' }
        ]
      }
    },

    // --- WIDGETS ---
    {
      id: 'stock_timer_2m',
      name: '2-Minute Countdown',
      category: 'widgets',
      description: 'Quick 2-minute timer node for pair-shares and quick thinking.',
      data: {
        nodes: [
          {
            id: 'cn_stock_timer_2m',
            baseWord: '02:00',
            x: 0,
            y: 0,
            bg: '#fff7ed',
            color: '#c2410c',
            border: '#f97316',
            borderWidth: 2,
            fontSize: '22px',
            shape: 'oval',
            fmt: { bold: true },
            isTimer: true,
            durationSec: 120,
            remainingSec: 120,
            timerState: 'idle'
          }
        ]
      }
    },
    {
      id: 'stock_timer_5m',
      name: '5-Minute Countdown',
      category: 'widgets',
      description: 'Standard 5-minute activity timer with live countdown.',
      data: {
        nodes: [
          {
            id: 'cn_stock_timer_5m',
            baseWord: '05:00',
            x: 0,
            y: 0,
            bg: '#fff7ed',
            color: '#c2410c',
            border: '#f97316',
            borderWidth: 2,
            fontSize: '22px',
            shape: 'oval',
            fmt: { bold: true },
            isTimer: true,
            durationSec: 300,
            remainingSec: 300,
            timerState: 'idle'
          }
        ]
      }
    },
    {
      id: 'stock_timer_10m',
      name: '10-Minute Countdown',
      category: 'widgets',
      description: '10-minute countdown timer for deep group work or writing.',
      data: {
        nodes: [
          {
            id: 'cn_stock_timer_10m',
            baseWord: '10:00',
            x: 0,
            y: 0,
            bg: '#fff7ed',
            color: '#c2410c',
            border: '#f97316',
            borderWidth: 2,
            fontSize: '22px',
            shape: 'oval',
            fmt: { bold: true },
            isTimer: true,
            durationSec: 600,
            remainingSec: 600,
            timerState: 'idle'
          }
        ]
      }
    },
    {
      id: 'stock_traffic_light',
      name: 'Traffic Light Assessment',
      category: 'widgets',
      description: '3-tier self-assessment indicators for quick pupil feedback.',
      data: {
        nodes: [
          { id: 'cn_tl_green', baseWord: 'Green: I got this completely!', x: 0, y: 0, bg: '#dcfce7', color: '#166534', border: '#22c55e', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } },
          { id: 'cn_tl_amber', baseWord: 'Amber: I need a little more practice', x: 0, y: 55, bg: '#fef9c3', color: '#854d0e', border: '#eab308', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } },
          { id: 'cn_tl_red', baseWord: 'Red: I am stuck and need help', x: 0, y: 110, bg: '#fee2e2', color: '#991b1b', border: '#ef4444', borderWidth: 1.5, fontSize: '15px', fmt: { bold: true } }
        ]
      }
    },
    {
      id: 'stock_checklist_note',
      name: 'Interactive Checklist',
      category: 'widgets',
      description: 'Sticky note equipped with task checkboxes.',
      data: {
        notes: [
          {
            id: 'cnn_stock_checklist',
            x: 0,
            y: 0,
            width: 280,
            height: 160,
            manualSize: true,
            bg: '#fefce8',
            color: '#1c1917',
            borderColor: '#fef08a',
            borderWidth: 1.5,
            borderStyle: 'solid',
            fontSize: 14,
            text: "Tasks to Complete:\n• Step 1: Read the source text\n• Step 2: Underline key arguments\n• Step 3: Write down your thesis",
            html: "<b>Tasks to Complete:</b><br><ul style=\"margin:6px 0 0 16px;padding:0;\"><li>Step 1: Read the source text</li><li>Step 2: Underline key arguments</li><li>Step 3: Write down your thesis</li></ul>"
          }
        ]
      }
    },

    // --- CALLOUTS ---
    {
      id: 'stock_callout_warning',
      name: 'Important / Warning Callout',
      category: 'callouts',
      description: 'Eye-catching highlighted note for key rules and cautions.',
      data: {
        notes: [
          {
            id: 'cnn_stock_warning',
            x: 0,
            y: 0,
            width: 320,
            height: 120,
            manualSize: true,
            bg: '#fff1f2',
            color: '#9f1239',
            borderColor: '#f43f5e',
            borderWidth: 2,
            borderStyle: 'solid',
            fontSize: 14,
            text: "IMPORTANT NOTICE:\nDo not confuse false friends! Make sure to verify spelling in the dictionary.",
            html: "<b style=\"color:#e11d48;\">IMPORTANT NOTICE</b><br><br>Do not confuse false friends! Make sure to verify spelling in the dictionary."
          }
        ]
      }
    },
    {
      id: 'stock_callout_tip',
      name: 'Pro-Tip / Study Hint',
      category: 'callouts',
      description: 'Amber styled note for mnemonic hints and shortcuts.',
      data: {
        notes: [
          {
            id: 'cnn_stock_tip',
            x: 0,
            y: 0,
            width: 300,
            height: 110,
            manualSize: true,
            bg: '#fffbeb',
            color: '#92400e',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderStyle: 'solid',
            fontSize: 14,
            text: "PRO-TIP:\nBreak long complex sentences into smaller clauses before translating.",
            html: "<b style=\"color:#d97706;\">PRO-TIP</b><br><br>Break long complex sentences into smaller clauses before translating."
          }
        ]
      }
    },
    {
      id: 'stock_callout_prompt',
      name: 'Discussion Prompt',
      category: 'callouts',
      description: 'Purple styled note for pair or class conversation prompts.',
      data: {
        notes: [
          {
            id: 'cnn_stock_prompt',
            x: 0,
            y: 0,
            width: 320,
            height: 120,
            manualSize: true,
            bg: '#faf5ff',
            color: '#581c87',
            borderColor: '#a855f7',
            borderWidth: 2,
            borderStyle: 'solid',
            fontSize: 14,
            text: "DISCUSSION QUESTION:\nDiscuss with your partner: What evidence in the text supports this viewpoint?",
            html: "<b style=\"color:#9333ea;\">DISCUSSION QUESTION</b><br><br>Discuss with your partner: What evidence in the text supports this viewpoint?"
          }
        ]
      }
    },
    {
      id: 'stock_definition_card',
      name: 'Definition & Example Card',
      category: 'callouts',
      description: 'A concept node paired with an explanatory definition note.',
      data: {
        nodes: [
          {
            id: 'cn_stock_def_term',
            baseWord: 'Key Term / Concept',
            x: 0,
            y: 0,
            bg: '#f8fafc',
            color: '#0f172a',
            border: '#475569',
            borderWidth: 1.5,
            fontSize: '16px',
            fmt: { bold: true }
          }
        ],
        notes: [
          {
            id: 'cnn_stock_def_note',
            nodeId: 'cn_stock_def_term',
            x: 180,
            y: 0,
            width: 280,
            height: 100,
            manualSize: true,
            bg: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            borderStyle: 'solid',
            fontSize: 13,
            text: "Definition: [State clear definition here]\nExample: [Give concrete example sentence or application]",
            html: "<b>Definition:</b> [State clear definition here]<br><br><b>Example:</b> <i>[Give concrete example sentence or application]</i>"
          }
        ],
        edges: [
          {
            id: 'ce_stock_def_edge',
            a: 'cn_stock_def_term',
            b: 'cnn_stock_def_note',
            type: 'none'
          }
        ]
      }
    }
  ];

  let _customLibraryItems = [];
  let _libraryLoaded = false;

  async function loadPremadeLibraryData(force = false) {
    if (_libraryLoaded && !force) return;
    try {
      let parsed = null;
      let fromDisk = false;
      if (typeof Desktop !== 'undefined') {
        if (typeof Desktop.readJson === 'function') {
          const r = await Desktop.readJson('user', 'board-library.json');
          if (r && (r.ok || r.success) && r.data) {
            parsed = r.data;
            fromDisk = true;
          }
        }
        if (!parsed && typeof Desktop.readText === 'function') {
          const r = await Desktop.readText('user', 'board-library.json');
          if (r && (r.ok || r.success)) {
            const raw = (r.content !== undefined && r.content !== null) ? r.content : r.data;
            if (raw) {
              parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              fromDisk = true;
            }
          }
        }
      }
      if (!parsed) {
        const raw = localStorage.getItem('cmt_board_premade_library');
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch (_) {}
        }
      }

      if (parsed) {
        if (Array.isArray(parsed.customItems)) {
          _customLibraryItems = parsed.customItems;
        } else if (Array.isArray(parsed)) {
          _customLibraryItems = parsed;
        }
        // If loaded from localStorage fallback while in Desktop mode, persist to disk immediately
        if (!fromDisk && _customLibraryItems.length > 0 && typeof Desktop !== 'undefined' && (Desktop.saveJson || Desktop.saveText)) {
          await savePremadeLibraryData();
        }
      }
    } catch (e) {
      console.warn('[Premade Library] Error loading custom items:', e);
    }
    _libraryLoaded = true;
  }

  async function savePremadeLibraryData() {
    const payload = {
      version: 1,
      customItems: _customLibraryItems,
      updatedAt: Date.now()
    };
    try {
      try {
        localStorage.setItem('cmt_board_premade_library', JSON.stringify(payload));
      } catch (_) {}

      if (typeof Desktop !== 'undefined' && Desktop.saveJson) {
        await Desktop.saveJson('user', 'board-library.json', payload);
      } else if (typeof Desktop !== 'undefined' && Desktop.saveText) {
        await Desktop.saveText('user', 'board-library.json', JSON.stringify(payload, null, 2));
      }
    } catch (e) {
      console.error('[Premade Library] Error saving custom items:', e);
    }
  }

  window.conGetPremadeLibraryItems = async function (forceReload = false) {
    if (!_libraryLoaded || forceReload) await loadPremadeLibraryData(forceReload);
    return [...STOCK_PREMADE_ITEMS, ..._customLibraryItems];
  };

  window.conSaveCustomPremadeItem = async function (name, category, description, snippetData) {
    await loadPremadeLibraryData(true);
    const newItem = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name || 'Custom Item',
      category: category || 'custom',
      description: description || 'User-saved premade item',
      isCustom: true,
      createdAt: Date.now(),
      data: snippetData
    };
    _customLibraryItems = [newItem, ..._customLibraryItems.filter(item => item.id !== newItem.id)];
    await savePremadeLibraryData();
    return newItem;
  };

  window.conDeleteCustomPremadeItem = async function (id) {
    await loadPremadeLibraryData(true);
    _customLibraryItems = _customLibraryItems.filter(item => item.id !== id);
    await savePremadeLibraryData();
  };

  if (typeof Desktop !== 'undefined' && typeof Desktop.onDataChanged === 'function') {
    Desktop.onDataChanged(function (data) {
      if (data && data.filename === 'board-library.json') {
        _libraryLoaded = false;
        loadPremadeLibraryData(true).then(() => {
          if (typeof window.conRenderPremadeLibraryList === 'function') {
            const overlay = document.getElementById('con-premade-library-overlay');
            if (overlay && overlay.classList.contains('active')) {
              window.conRenderPremadeLibraryList();
            }
          }
        }).catch(() => {});
      }
    });
  }

  /**
   * Insert a premade library item onto the active board at (targetX, targetY).
   */
  window.conInsertPremadeItem = function (item, targetX, targetY) {
    if (!item || !item.data) return false;
    const boardEl = document.getElementById('constellation-board');
    if (!boardEl) return false;

    if (typeof window.conPushUndo === 'function') window.conPushUndo();

    // Determine insertion center in the middle of the visible page if not explicitly passed
    let cx = targetX;
    let cy = targetY;
    if (cx == null || cy == null) {
      const r = boardEl.getBoundingClientRect();
      const visibleLeft = Math.max(0, r.left);
      const visibleTop = Math.max(0, r.top);
      const visibleRight = Math.min(window.innerWidth, r.right);
      const visibleBottom = Math.min(window.innerHeight, r.bottom);

      if (visibleRight > visibleLeft && visibleBottom > visibleTop) {
        const screenCenterX = (visibleLeft + visibleRight) / 2;
        const screenCenterY = (visibleTop + visibleBottom) / 2;
        cx = Math.round(screenCenterX - r.left + boardEl.scrollLeft);
        cy = Math.round(screenCenterY - r.top + boardEl.scrollTop);
      } else {
        cx = Math.round(boardEl.scrollLeft + Math.min(window.innerWidth, boardEl.clientWidth) / 2);
        cy = Math.round(boardEl.scrollTop + Math.min(window.innerHeight, boardEl.clientHeight) / 2);
      }
    }

    const data = JSON.parse(JSON.stringify(item.data));
    const idMap = {};

    // Calculate bounding box of template items to center around (cx, cy)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (data.nodes || []).forEach(n => {
      const x = Number(n.x) || 0, y = Number(n.y) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 100);
      maxY = Math.max(maxY, y + 40);
    });
    (data.notes || []).forEach(n => {
      const x = Number(n.x) || 0, y = Number(n.y) || 0;
      const w = Number(n.width) || 200, h = Number(n.height) || 100;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    if (!Number.isFinite(minX)) { minX = 0; maxX = 200; }
    if (!Number.isFinite(minY)) { minY = 0; maxY = 100; }

    const itemWidth = maxX - minX;
    const itemHeight = maxY - minY;
    const offsetX = Math.round(cx - itemWidth / 2 - minX);
    const offsetY = Math.round(cy - itemHeight / 2 - minY);

    // 1. Process and insert Nodes
    const insertedNodeIds = [];
    if (Array.isArray(data.nodes)) {
      data.nodes.forEach(n => {
        const origId = n.id;
        const text = n.baseWord || '';
        const posX = Math.max(10, Math.round((Number(n.x) || 0) + offsetX));
        const posY = Math.max(10, Math.round((Number(n.y) || 0) + offsetY));

        let newId;
        if (n.isTimer && typeof window.conAddTimerNodeAt === 'function') {
          newId = window.conAddTimerNodeAt(n.durationSec || 300, posX, posY);
        } else if (typeof window.conAddWordAt === 'function') {
          newId = window.conAddWordAt(text, posX, posY);
        }

        if (newId) {
          idMap[origId] = newId;
          insertedNodeIds.push(newId);
          const liveNode = (window.conGetNodes ? window.conGetNodes() : []).find(node => node.id === newId);
          if (liveNode) {
            if (n.bg && liveNode.el) liveNode.el.style.background = n.bg;
            if (n.color && liveNode.el) liveNode.el.style.color = n.color;
            if (n.border && liveNode.el) liveNode.el.style.borderColor = n.border;
            if (n.borderWidth != null) liveNode.borderWidth = n.borderWidth;
            if (n.borderStyle) liveNode.borderStyle = n.borderStyle;
            if (n.fontSize) {
              liveNode.fontSize = n.fontSize;
              if (liveNode.el) liveNode.el.style.fontSize = n.fontSize;
            }
            if (n.shape) {
              liveNode.shape = n.shape;
              if (liveNode.el) liveNode.el.dataset.shape = n.shape;
            }
            if (n.fmt) liveNode.fmt = { ...n.fmt };
            if (typeof window.conRenderNodeLabel === 'function') window.conRenderNodeLabel(liveNode);
          }
        }
      });
    }

    // 2. Process and insert Notes
    const insertedNoteIds = [];
    if (Array.isArray(data.notes)) {
      data.notes.forEach(n => {
        const origId = n.id;
        const posX = Math.max(10, Math.round((Number(n.x) || 0) + offsetX));
        const posY = Math.max(10, Math.round((Number(n.y) || 0) + offsetY));

        const nextNoteId = (typeof window.conGetNextNoteId === 'function')
          ? window.conGetNextNoteId()
          : ('cnn' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
        idMap[origId] = nextNoteId;

        const linkedNodeId = n.nodeId ? (idMap[n.nodeId] || n.nodeId) : null;
        const noteObj = {
          id: nextNoteId,
          nodeId: linkedNodeId,
          text: n.text || '',
          html: n.html || '',
          x: posX,
          y: posY,
          width: n.width || null,
          height: n.height || null,
          manualSize: !!n.manualSize,
          bg: n.bg || '#ffffff',
          color: n.color || '#111111',
          borderColor: n.borderColor || null,
          borderWidth: n.borderWidth || null,
          borderStyle: n.borderStyle || null,
          fontSize: n.fontSize || 14,
          fontFamily: n.fontFamily || null,
          bold: !!n.bold,
          italic: !!n.italic,
          underline: !!n.underline,
          strike: !!n.strike,
          hidden: !!n.hidden,
          locked: false
        };

        if (typeof window.conAddNoteObject === 'function') {
          window.conAddNoteObject(noteObj);
        } else {
          const notesArr = (window.conGetNotes ? window.conGetNotes() : window.conNotes);
          if (Array.isArray(notesArr)) notesArr.push(noteObj);
          if (typeof window.conNoteBuild === 'function') window.conNoteBuild(noteObj);
        }
        insertedNoteIds.push(nextNoteId);

        if (linkedNodeId) {
          const lnode = (window.conGetNodes ? window.conGetNodes() : []).find(node => node.id === linkedNodeId);
          if (lnode && lnode.el) lnode.el.classList.add('has-con-note');
        }
      });
    }

    // 3. Process Edges
    if (Array.isArray(data.edges) && typeof window.conGetEdges === 'function') {
      const edges = window.conGetEdges();
      data.edges.forEach(e => {
        const mappedA = idMap[e.a] || e.a;
        const mappedB = idMap[e.b] || e.b;
        if (mappedA && mappedB) {
          const edgeId = 'ce' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          edges.push({
            id: edgeId,
            a: mappedA,
            b: mappedB,
            type: e.type || 'none',
            label: e.label || '',
            labelSize: e.labelSize || 11,
            labelColor: e.labelColor || '#333333'
          });
        }
      });
    }

    // 4. Process Groups
    if (Array.isArray(data.groups) && typeof window.conGetGroups === 'function') {
      const groups = window.conGetGroups();
      data.groups.forEach(g => {
        const mappedNodes = (g.nodeIds || []).map(nid => idMap[nid] || nid);
        const mappedNotes = (g.noteIds || []).map(nid => idMap[nid] || nid);
        const newGid = 'cg' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        groups.push({
          id: newGid,
          nodeIds: mappedNodes,
          noteIds: mappedNotes,
          title: g.title || '',
          x: Math.max(10, Math.round((Number(g.x) || 0) + offsetX)),
          y: Math.max(10, Math.round((Number(g.y) || 0) + offsetY)),
          paletteIdx: g.paletteIdx || 0,
          manualW: g.manualW || null,
          manualH: g.manualH || null
        });
      });
    }

    if (typeof window.conRedrawEdges === 'function') window.conRedrawEdges();
    if (typeof window.conRedrawGroups === 'function') window.conRedrawGroups();
    if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();

    // Automatically select newly inserted note(s) or node(s) so they are immediately draggable or deletable
    if (insertedNoteIds.length > 0 && typeof window.conSelectNote === 'function') {
      insertedNoteIds.forEach((nid, i) => window.conSelectNote(nid, i > 0));
    } else if (insertedNodeIds.length > 0 && typeof window.conNodeSelect === 'function') {
      window.conNodeSelect(insertedNodeIds[0]);
    }

    if (typeof window.mdbToast === 'function') {
      window.mdbToast('Inserted: ' + (item.name || 'Premade Item'));
    }
    return true;
  };

  // Expose global namespace
  window.PremadeLibrary = {
    getStockItems: () => [...STOCK_PREMADE_ITEMS],
    load: loadPremadeLibraryData,
    save: savePremadeLibraryData
  };
})();
