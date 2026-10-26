/**
 * Class Management Tools — Board Learning Tools & Data Import Engine
 * Quizzes, vocabulary games, grammar tools, novel character network, and class data import.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

  var escapeSearchHtml = global.escapeSearchHtml = window.escapeSearchHtml || function (str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  var boardEscapeHtml = global.boardEscapeHtml = window.boardEscapeHtml || escapeSearchHtml;

    // ================================================================
    // BOARD LINK & TAG INTEGRATION (Planner, Docs, PDFs, Word Bank)
    // ================================================================

    window.boardGetActiveSessionUrn = function () {
      const fn = ((typeof _conCurrentFileName !== 'undefined' && _conCurrentFileName) ? _conCurrentFileName : 'untitled.js').trim();
      if (typeof LinksService !== 'undefined') {
        if (typeof LinksService.createUrn === 'function') return LinksService.createUrn('board', fn);
        if (typeof LinksService.makeUrn === 'function') return LinksService.makeUrn('board', fn);
      }
      return `cmt:board:${encodeURIComponent(fn)}`;
    };

    window.conGetActiveNodeUrn = function (node) {
      if (!node) return '';
      const boardId = ((typeof _conCurrentFileName !== 'undefined' && _conCurrentFileName) ? _conCurrentFileName : 'untitled.js').trim();
      const nodeId = node.id || 'cn0';
      const idPayload = `${encodeURIComponent(boardId)}:${encodeURIComponent(nodeId)}`;
      if (typeof LinksService !== 'undefined') {
        if (typeof LinksService.createUrn === 'function') return LinksService.createUrn('board-node', idPayload);
        if (typeof LinksService.makeUrn === 'function') return LinksService.makeUrn('board-node', idPayload);
      }
      return `cmt:board-node:${idPayload}`;
    };

    window.boardOpenSessionLinksModal = function () {
      if (typeof TagLinkModal === 'undefined') {
        if (typeof showToast === 'function') showToast('Links module is not available.', true);
        return;
      }
      const sessionUrn = boardGetActiveSessionUrn();
      const sessionTitle = _conCurrentFileName || 'Board Session';
      TagLinkModal.open({
        urn: sessionUrn,
        sourceUrn: sessionUrn,
        title: sessionTitle,
        label: sessionTitle,
        type: 'board',
        sourceMeta: {
          title: sessionTitle,
          type: 'board',
          filename: _conCurrentFileName || ''
        },
        onUpdate: () => {
          boardUpdateToolbarLinksCount();
          boardUpdateLinkedLessonBadge();
        },
        onLinksChanged: () => {
          boardUpdateToolbarLinksCount();
          boardUpdateLinkedLessonBadge();
        }
      });
    };

    window.boardUpdateToolbarLinksCount = function () {
      const btnText = document.getElementById('con-tb-links-btn-text');
      if (!btnText || typeof LinksService === 'undefined') return;
      const sessionUrn = boardGetActiveSessionUrn();
      const sessionLinks = LinksService.getLinksForSync(sessionUrn) || [];
      let totalLinks = sessionLinks.length;
      const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
      if (Array.isArray(allNodes)) {
        allNodes.forEach(n => {
          if (!n) return;
          const u = conGetActiveNodeUrn(n);
          const nl = LinksService.getLinksForSync(u) || [];
          totalLinks += nl.length;
        });
      }
      btnText.textContent = `[LINKS: ${totalLinks}]`;
      boardUpdateLinkedLessonBadge();
    };

    window.boardUpdateLinkedLessonBadge = function () {
      const hdrBtn = document.getElementById('con-linked-lesson-btn');
      if (!hdrBtn || typeof LinksService === 'undefined') return;
      const sessionUrn = boardGetActiveSessionUrn();
      const sessionLinks = LinksService.getLinksForSync(sessionUrn) || [];
      const planLink = sessionLinks.find(l => {
        const p = LinksService.parseUrn(l.otherUrn);
        return p && p.type === 'planner-entry';
      });
      if (planLink) {
        const title = (planLink.targetMeta && planLink.targetMeta.title) ? planLink.targetMeta.title : 'Lesson Plan';
        hdrBtn.textContent = `[PLAN: ${title.toUpperCase()}]`;
        hdrBtn.style.display = 'inline-flex';
        hdrBtn.dataset.urn = planLink.otherUrn;
      } else {
        hdrBtn.style.display = 'none';
        hdrBtn.dataset.urn = '';
      }
    };

    window.boardOpenLinkedLessonPlan = function () {
      const hdrBtn = document.getElementById('con-linked-lesson-btn');
      const urn = hdrBtn ? hdrBtn.dataset.urn : null;
      if (urn && typeof LinksService !== 'undefined') {
        LinksService.navigateToUrn(urn);
      }
    };

    window.conCtxOpenLinksModal = function () {
      const allNodes = (typeof window.conGetNodes === 'function')
        ? window.conGetNodes()
        : ((typeof conNodes !== 'undefined') ? conNodes : []);
      const nodeId = (window.conGetCtxNodeId && window.conGetCtxNodeId())
        || (typeof window.conCtxNodeId !== 'undefined' ? window.conCtxNodeId : null)
        || (typeof conCtxNodeId !== 'undefined' ? conCtxNodeId : null)
        || (window.conGetSelected ? window.conGetSelected() : (typeof conSelected !== 'undefined' ? conSelected : null));
      const node = allNodes.find(n => n && n.id === nodeId);
      if (!node) {
        // Also check if a sticky note is selected
        const allNotes = (typeof window.conGetNotes === 'function')
          ? window.conGetNotes()
          : ((typeof conNotes !== 'undefined') ? conNotes : []);
        const note = allNotes.find(n => n && n.id === nodeId);
        if (note) {
          if (typeof conCtxClose === 'function') conCtxClose();
          else if (typeof window.conCtxClose === 'function') window.conCtxClose();
          if (typeof TagLinkModal === 'undefined') {
            if (typeof showToast === 'function') showToast('Links module is not available.', true);
            return;
          }
          const curBoardFileName = (typeof _conCurrentFileName !== 'undefined' && _conCurrentFileName) ? _conCurrentFileName : 'untitled.js';
          const noteUrn = 'cmt:board-note:' + encodeURIComponent(curBoardFileName) + ':' + encodeURIComponent(note.id);
          const rawText = note.text || note.content || 'Note';
          const title = rawText.split('\n')[0].replace(/^#+\s*/, '').trim() || ('Note ' + note.id);
          TagLinkModal.open({
            urn: noteUrn,
            sourceUrn: noteUrn,
            title: title,
            label: title,
            type: 'board-note',
            sourceMeta: {
              title: title,
              type: 'board-note',
              boardFile: curBoardFileName,
              noteId: note.id
            }
          });
        }
        return;
      }
      if (typeof conCtxClose === 'function') conCtxClose();
      else if (typeof window.conCtxClose === 'function') window.conCtxClose();
      else {
        const m = document.getElementById('con-ctx-menu');
        if (m) m.classList.remove('visible');
      }
      if (typeof TagLinkModal === 'undefined') {
        if (typeof showToast === 'function') showToast('Links module is not available.', true);
        return;
      }
      const nodeUrn = (typeof conGetActiveNodeUrn === 'function')
        ? conGetActiveNodeUrn(node)
        : (typeof window.conGetActiveNodeUrn === 'function' ? window.conGetActiveNodeUrn(node) : ('cmt:board-node:untitled.js:' + node.id));
      const word = node.baseWord || (node.el && node.el.dataset.baseWord) || (node.el && node.el.textContent) || 'Word';
      TagLinkModal.open({
        urn: nodeUrn,
        sourceUrn: nodeUrn,
        title: word,
        label: word,
        type: 'board-node',
        sourceMeta: {
          title: word,
          type: 'board-node',
          boardFile: _conCurrentFileName || '',
          nodeId: node.id
        },
        onUpdate: () => {
          conUpdateNodeLinkBadges(node);
          boardUpdateToolbarLinksCount();
        },
        onLinksChanged: () => {
          conUpdateNodeLinkBadges(node);
          boardUpdateToolbarLinksCount();
        }
      });
    };

    window.conUpdateNodeLinkBadges = function (node) {
      if (!node || !node.el || typeof LinksService === 'undefined') return;
      let bar = node.el.querySelector('.con-node-links-bar');
      const nodeUrn = conGetActiveNodeUrn(node);
      const links = LinksService.getLinksForSync(nodeUrn) || [];

      if (links.length === 0) {
        if (bar) bar.remove();
        return;
      }

      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'con-node-links-bar';
        node.el.appendChild(bar);
      } else {
        bar.innerHTML = '';
      }

      links.forEach(l => {
        const p = LinksService.parseUrn(l.otherUrn);
        if (!p) return;
        let badgeText = '[LINK]';
        let badgeClass = 'general';
        let titleText = (l.targetMeta && l.targetMeta.title) ? l.targetMeta.title : l.otherUrn;
        let isVocabLink = false;

        if (p.type === 'tag') {
          badgeText = '#' + p.id.toUpperCase();
          badgeClass = 'tag';
        } else if (p.type === 'planner-entry') {
          let planDateOrTitle = '';
          if (l.targetMeta && l.targetMeta.date) planDateOrTitle = ': ' + l.targetMeta.date;
          else if (l.targetMeta && l.targetMeta.title) planDateOrTitle = ': ' + l.targetMeta.title.slice(0, 10).toUpperCase();
          badgeText = `[PLAN${planDateOrTitle}]`;
          badgeClass = 'plan';
        } else if (p.type === 'document') {
          badgeText = '[DOC]';
          badgeClass = 'doc';
        } else if (p.type === 'file') {
          const isPdf = p.id.toLowerCase().endsWith('.pdf') || (l.targetMeta && l.targetMeta.relativePath && l.targetMeta.relativePath.toLowerCase().endsWith('.pdf'));
          const pageInfo = (l.targetMeta && l.targetMeta.page) ? `: P. ${l.targetMeta.page}` : '';
          badgeText = isPdf ? `[PDF${pageInfo}]` : '[FILE]';
          badgeClass = isPdf ? 'pdf' : 'general';
        } else if (p.type === 'grade-test' || p.type === 'test' || p.type === 'test-exercise') {
          let exNum = null;
          if (p.anchor && (p.anchor.startsWith('ex-') || p.anchor.startsWith('exercise-') || /^\d+$/.test(p.anchor))) {
            exNum = p.anchor.replace(/^(ex-|exercise-)/, '');
          } else if (l.targetMeta && (l.targetMeta.exerciseIndex || l.targetMeta.exerciseId)) {
            exNum = l.targetMeta.exerciseIndex || l.targetMeta.exerciseId;
          }
          badgeText = exNum ? `[TEST EX: ${exNum}]` : '[TEST]';
          badgeClass = 'test';
        } else if (p.type === 'vocab' || p.type === 'word' || p.type === 'wordbank') {
          badgeText = '[VOCAB]';
          badgeClass = 'vocab';
          isVocabLink = true;
          titleText = titleText + ' • Click to view lexical card (IPA, definition, audio)';
        } else if (p.type === 'board') {
          badgeText = '[BOARD]';
        }

        const pill = document.createElement('span');
        pill.className = `con-node-link-pill ${badgeClass}`;
        const iconHtml = '<img src="../assets/icons/links.svg" class="btn-icon" alt="" style="width:10px;height:10px;vertical-align:-1px;margin-right:2px;" />';
        pill.innerHTML = (p.type === 'tag' ? '' : iconHtml) + badgeText;
        pill.title = titleText;
        pill.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (isVocabLink && typeof conOpenNodeWordCard === 'function') {
            conOpenNodeWordCard(node.id, e.clientX, e.clientY);
          } else {
            LinksService.navigateToUrn(l.otherUrn);
          }
        };
        bar.appendChild(pill);
      });
    };

    window.conUpdateAllNodeLinkBadges = function () {
      const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
      if (Array.isArray(allNodes)) {
        allNodes.forEach(node => conUpdateNodeLinkBadges(node));
      }
    };

    window.conFocusAndHighlightNode = function (nodeIdOrText) {
      if (!nodeIdOrText) return;
      const target = String(nodeIdOrText).trim().toLowerCase();
      const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
      let node = allNodes.find(n => n && String(n.id).toLowerCase() === target);
      if (!node) {
        node = allNodes.find(n => {
          if (!n) return false;
          const w = String(n.baseWord || (n.el && n.el.dataset.baseWord) || (n.el && n.el.textContent) || '').trim().toLowerCase();
          return w === target;
        });
      }
      if (!node && allNodes.length > 0) {
        node = allNodes.find(n => {
          if (!n) return false;
          const w = String(n.baseWord || (n.el && n.el.dataset.baseWord) || (n.el && n.el.textContent) || '').trim().toLowerCase();
          return w.includes(target) || target.includes(w);
        });
      }
      if (!node || !node.el) return;

      if (typeof conSelect === 'function') conSelect(node.id);
      else if (typeof window.conSelect === 'function') window.conSelect(node.id);

      node.el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      node.el.classList.add('con-node-highlight-pulse');
      setTimeout(() => {
        if (node && node.el) node.el.classList.remove('con-node-highlight-pulse');
      }, 2500);
    };

    window.conCtxExtractPdfPageToCanvas = async function () {
      const extractRow = document.getElementById('con-ctx-extract-pdf-row');
      const pdfUrn = extractRow ? extractRow.dataset.pdfUrn : null;
      if (typeof conCtxClose === 'function') conCtxClose();
      else if (typeof window.conCtxClose === 'function') window.conCtxClose();
      else {
        const m = document.getElementById('con-ctx-menu');
        if (m) m.classList.remove('visible');
      }
      if (!pdfUrn) {
        if (typeof showToast === 'function') showToast('No linked PDF found for this node.', true);
        return;
      }
      const parsed = LinksService.parseUrn(pdfUrn);
      if (!parsed || parsed.type !== 'file') return;
      const fileNameOrRelPath = parsed.id;

      const allAtts = (typeof conAttachments !== 'undefined') ? conAttachments : (window.conAttachments || []);
      let att = allAtts.find(a => a.kind === 'pdf' && (a.name === fileNameOrRelPath || a.relativePath === fileNameOrRelPath || a.id === fileNameOrRelPath));
      if (!att) {
        const baseName = fileNameOrRelPath.split(/[\/\\]/).pop();
        att = allAtts.find(a => a.kind === 'pdf' && (a.name === baseName || (a.name && a.name.toLowerCase() === baseName.toLowerCase())));
      }

      if (att && typeof conGetPdfPageCount === 'function' && typeof conPdfPagePickerOpen === 'function') {
        const pageCount = await conGetPdfPageCount(att);
        conPdfPagePickerOpen(att, pageCount);
      } else {
        LinksService.navigateToUrn(pdfUrn);
      }
    };

    window.conBoardCtxSuggestDbWords = function (val) {
      const dl = document.getElementById('con-board-ctx-datalist');
      if (!dl) return;
      if (!val || val.trim().length < 1 || typeof vocabBank === 'undefined' || !Array.isArray(vocabBank)) {
        dl.innerHTML = '';
        return;
      }
      const q = val.trim().toLowerCase();
      const matches = [];
      for (let i = 0; i < vocabBank.length && matches.length < 15; i++) {
        const entry = vocabBank[i];
        if (!entry || !entry.word) continue;
        const w = entry.word.trim();
        if (w.toLowerCase().startsWith(q) && !matches.includes(w)) {
          matches.push(w);
        }
      }
      dl.innerHTML = matches.map(m => `<option value="${escapeSearchHtml(m)}"></option>`).join('');
    };

    window.conGenerateMindmapFromDb = async function () {
      if (typeof vocabBank === 'undefined' || !Array.isArray(vocabBank) || vocabBank.length === 0) {
        if (typeof showToast === 'function') showToast('Word bank is empty or not yet loaded.', true);
        return;
      }
      const categories = new Set();
      const posSet = new Set();
      vocabBank.forEach(e => {
        if (e && e.category) categories.add(String(e.category).trim());
        if (e && e.theme) categories.add(String(e.theme).trim());
        if (e && e.pos) posSet.add(String(e.pos).trim());
      });
      const catList = Array.from(categories).filter(Boolean);
      const posList = Array.from(posSet).filter(Boolean);

      let defaultPrompt = catList.length > 0 ? catList[0] : (posList.length > 0 ? posList[0] : '');
      let choice = await showPrompt('Generate Mind Map from Database\nEnter category, theme, or part of speech to cluster:', defaultPrompt);
      if (choice === null) return;

      const filter = (choice || '').trim().toLowerCase();
      let matching = vocabBank.filter(e => {
        if (!e) return false;
        if (!filter) return true;
        const cat = String(e.category || '').toLowerCase();
        const th = String(e.theme || '').toLowerCase();
        const pos = String(e.pos || '').toLowerCase();
        const w = String(e.word || '').toLowerCase();
        return cat.includes(filter) || th.includes(filter) || pos === filter || w.includes(filter);
      });

      if (matching.length === 0) {
        if (typeof showToast === 'function') showToast('No words found matching "' + choice + '".', true);
        return;
      }

      matching = matching.slice(0, 14);

      const brd = (typeof board === 'function') ? board() : (window.conGetBoard ? window.conGetBoard() : document.getElementById('constellation-board'));
      const cx = Math.max(300, Math.floor(((brd && brd.clientWidth) || 1000) / 2));
      const cy = Math.max(250, Math.floor(((brd && brd.clientHeight) || 800) / 2));

      if (typeof conPushUndo === 'function') conPushUndo();
      else if (typeof window.conPushUndo === 'function') window.conPushUndo();

      const addWordFn = (typeof conAddWordAt === 'function') ? conAddWordAt : (window.conAddWordAt ? window.conAddWordAt : null);
      const addEdgeFn = (typeof conAddEdge === 'function') ? conAddEdge : (window.conAddEdge ? window.conAddEdge : null);
      if (!addWordFn) {
        if (typeof showToast === 'function') showToast('Board builder is not ready.', true);
        return;
      }

      const hubTitle = (choice ? choice.toUpperCase() : 'VOCABULARY');
      const hubId = addWordFn(hubTitle, cx - 50, cy - 20);
      const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
      const hubNode = allNodes.find(n => n && n.id === hubId);
      if (hubNode && hubNode.el) {
        hubNode.el.style.fontWeight = '900';
        hubNode.el.style.backgroundColor = '#fde047';
        hubNode.el.style.borderColor = '#000000';
      }

      const radius = 230;
      const angleStep = (2 * Math.PI) / matching.length;
      matching.forEach((entry, idx) => {
        const angle = idx * angleStep;
        const x = Math.round(cx + radius * Math.cos(angle) - 40);
        const y = Math.round(cy + radius * Math.sin(angle) - 15);
        const wordId = addWordFn(entry.word, x, y);
        if (wordId && hubId && addEdgeFn) {
          addEdgeFn(hubId, wordId, 'none');
        }
      });

      if (typeof showToast === 'function') {
        showToast(`Generated mind map with ${matching.length} words around "${hubTitle}".`);
      }
    };

    window.conSyncNewNodesToDb = async function () {
      if (typeof vocabBank === 'undefined') window.vocabBank = [];
      const existingSet = new Set(vocabBank.map(e => e && e.word ? stripParens(e.word).toLowerCase().trim() : '').filter(Boolean));

      const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
      const newWords = [];
      allNodes.forEach(n => {
        if (!n || n.isTimer || n.isRandom) return;
        const raw = String(n.baseWord || (n.el && n.el.dataset.baseWord) || (n.el && n.el.textContent) || '').trim();
        if (!raw || raw.startsWith('//') || raw.startsWith('=')) return;
        const clean = stripParens(raw).toLowerCase();
        if (clean && !existingSet.has(clean) && !newWords.includes(raw)) {
          newWords.push(raw);
        }
      });

      if (newWords.length === 0) {
        if (typeof showToast === 'function') showToast('All words on the board already exist in the database!');
        return;
      }

      const ok = await showConfirm(`Found ${newWords.length} new brainstormed word(s) not in the database:\n\n${newWords.slice(0, 8).join(', ')}${newWords.length > 8 ? '...' : ''}\n\nAdd them to the word database now?`);
      if (!ok) return;

      newWords.forEach(w => {
        vocabBank.push({
          word: w,
          created: new Date().toISOString(),
          source: 'Board Brainstorm'
        });
      });

      try {
        if (window.electronBridge && typeof window.electronBridge.saveJson === 'function') {
          await window.electronBridge.saveJson('data', 'vocab.json', vocabBank);
        }
      } catch (err) {
        console.warn('Could not auto-save to vocab.json:', err);
      }

      if (typeof showToast === 'function') {
        showToast(`Added ${newWords.length} word(s) to the database.`);
      }
    };

    // ================================================================
    // CLASS DATA IMPORT ENGINE (ROSTERS, SEATING PLANS, TEAMS)
    // ================================================================

    let _conImportActiveTab = 'roster';
    let _conImportClassesCache = null;
    let _conImportPlansCache = null;
    let _conImportSavedTeamsCache = null;
    let _conImportRandomTeams = null;
    let _conImportPlannerClass = null;
    let _conImportFilterToPlanner = false;
    let _conImportNameDisplayMode = 'full';

    function _conResolveStudentName(st, mode) {
      if (!st) return '';
      const m = mode || _conImportNameDisplayMode || 'full';
      let stId = '';
      let fallbackName = '';
      let rawStudent = null;

      if (typeof st === 'object') {
        rawStudent = st;
        stId = st.id || st.uuid || '';
        fallbackName = ((st.firstName || '') + ' ' + (st.lastName || '')).trim() || st.name || '';
      } else if (typeof st === 'string') {
        stId = st.trim();
        fallbackName = stId;
      }

      const cleanId = stId.replace(/^cmt:student:/i, '').replace(/^student:/i, '').trim();

      // Find the student object in window.STUDENTS_ROSTER
      const roster = window.STUDENTS_ROSTER || (typeof STUDENTS_ROSTER !== 'undefined' ? STUDENTS_ROSTER : null);
      let found = null;
      if (Array.isArray(roster)) {
        found = roster.find(s => s && (s.uuid === cleanId || s.id === cleanId));
      }

      // If not in STUDENTS_ROSTER, check CLASS_GROUPS_DATA.students
      if (!found) {
        const cgData = window.CLASS_GROUPS_DATA || (typeof CLASS_GROUPS_DATA !== 'undefined' ? CLASS_GROUPS_DATA : null);
        if (cgData && Array.isArray(cgData.students)) {
          found = cgData.students.find(s => s && (s.uuid === cleanId || s.id === cleanId));
        }
      }

      const studentObj = found || (rawStudent && (rawStudent.firstName || rawStudent.lastName || rawStudent.customName) ? rawStudent : null);

      if (studentObj) {
        if (window.StudentNameUtils && typeof StudentNameUtils.formatStudentDisplayName === 'function') {
          const res = StudentNameUtils.formatStudentDisplayName(studentObj, m, 'firstLastInitial');
          if (res) return res;
        }
        const fn = (studentObj.firstName || '').trim();
        const ln = (studentObj.lastName || '').trim();
        const cn = (studentObj.customName || '').trim();
        if (m === 'first') return fn || ln || cn || cleanId;
        if (m === 'last') return ln || fn || cn || cleanId;
        if (m === 'custom') return cn || (fn && ln ? (fn + ' ' + ln.charAt(0).toUpperCase() + '.') : (fn || ln || cleanId));
        return ((fn + ' ' + ln).trim()) || cn || cleanId;
      }

      // If cleanId was not found in roster but LinksService has it
      if (window.LinksService && typeof LinksService.resolveStudentName === 'function') {
        const lName = LinksService.resolveStudentName(cleanId);
        if (lName && !lName.startsWith('st-') && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(lName)) {
          if (window.StudentNameUtils && typeof StudentNameUtils.formatStudentDisplayName === 'function') {
            return StudentNameUtils.formatStudentDisplayName(lName, m, 'firstLastInitial');
          }
          return lName;
        }
      }

      // If fallbackName is a real name (not a UUID)
      if (fallbackName && !fallbackName.startsWith('st-') && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(fallbackName)) {
        if (window.StudentNameUtils && typeof StudentNameUtils.formatStudentDisplayName === 'function') {
          return StudentNameUtils.formatStudentDisplayName(fallbackName, m, 'firstLastInitial');
        }
        return fallbackName;
      }

      return cleanId;
    }

    async function _conGetClassList() {
      if (_conImportClassesCache && _conImportClassesCache.length > 0) {
        return _conImportClassesCache;
      }

      if (window.LinksService && typeof LinksService.ensureRosterLoaded === 'function') {
        try { await LinksService.ensureRosterLoaded(); } catch (_) {}
      }
      if (!window.STUDENTS_ROSTER && window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const sRes = await Desktop.readText('user', 'students.js');
          if (sRes && sRes.ok && sRes.content) {
            const sandbox = {};
            const fn = new Function('window', sRes.content + '; if (typeof STUDENTS_ROSTER !== "undefined") window.STUDENTS_ROSTER = STUDENTS_ROSTER;');
            fn(sandbox);
            if (Array.isArray(sandbox.STUDENTS_ROSTER)) {
              window.STUDENTS_ROSTER = sandbox.STUDENTS_ROSTER;
            }
          }
        } catch (_) {}
      }

      const classes = [];
      const seen = new Set();

      // 1. Try in-memory CLASS_GROUPS_META
      const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META)
        ? CLASS_GROUPS_META
        : ((typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA && CLASS_GROUPS_DATA.classGroupsMeta)
          ? CLASS_GROUPS_DATA.classGroupsMeta
          : (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta));

      if (meta && typeof meta === 'object') {
        Object.entries(meta).forEach(([key, val]) => {
          if (!val || val.archived) return;
          const classId = val.id || key;
          const className = val.name || val.title || key;
          const students = [];
          if (Array.isArray(val.students)) {
            val.students.forEach(st => {
              const name = _conResolveStudentName(st, 'full');
              const id = (typeof st === 'object' ? (st.id || st.uuid || '') : String(st || '')).trim();
              if (name) students.push({ id, name });
            });
          }
          students.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
          classes.push({ id: classId, name: className, students });
          seen.add(classId);
          seen.add(className);
        });
      }

      // 2. Try legacy CLASS_GROUPS array/dict
      const legacy = (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) ? CLASS_GROUPS : (window.CLASS_GROUPS || null);
      if (legacy) {
        if (Array.isArray(legacy)) {
          legacy.forEach(cg => {
            if (!cg || !cg.name || seen.has(cg.id || cg.name)) return;
            const students = [];
            if (Array.isArray(cg.students)) {
              cg.students.forEach(st => {
                const name = _conResolveStudentName(st, 'full');
                const id = (typeof st === 'object' ? (st.id || st.uuid || '') : String(st || '')).trim();
                if (name) students.push({ id, name });
              });
            }
            students.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            classes.push({ id: cg.id || cg.name, name: cg.name, students });
            seen.add(cg.id || cg.name);
          });
        } else if (typeof legacy === 'object') {
          Object.entries(legacy).forEach(([k, list]) => {
            if (seen.has(k)) return;
            const students = Array.isArray(list) ? list.map(s => {
              const name = _conResolveStudentName(s, 'full');
              const id = (typeof s === 'object' ? (s.id || s.uuid || '') : String(s || '')).trim();
              return { id, name };
            }).filter(s => !!s.name) : [];
            students.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            classes.push({ id: k, name: k, students });
            seen.add(k);
          });
        }
      }

      // 3. Fallback to reading user/class-groups.js via Desktop
      if (classes.length === 0 && window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const res = await Desktop.readText('user', 'class-groups.js');
          if (res && res.ok && res.content) {
            const sandbox = {};
            const fn = new Function('window', res.content + '; if (typeof CLASS_GROUPS_DATA !== "undefined") window.CLASS_GROUPS_DATA = CLASS_GROUPS_DATA; if (typeof CLASS_GROUPS_META !== "undefined") window.CLASS_GROUPS_META = CLASS_GROUPS_META;');
            fn(sandbox);
            const loadedMeta = sandbox.CLASS_GROUPS_META || (sandbox.CLASS_GROUPS_DATA && sandbox.CLASS_GROUPS_DATA.classGroupsMeta);
            if (loadedMeta && typeof loadedMeta === 'object') {
              Object.entries(loadedMeta).forEach(([key, val]) => {
                if (!val || val.archived) return;
                const classId = val.id || key;
                const className = val.name || val.title || key;
                const students = [];
                if (Array.isArray(val.students)) {
                  val.students.forEach(st => {
                    const name = _conResolveStudentName(st, 'full');
                    const id = (typeof st === 'object' ? (st.id || st.uuid || '') : String(st || '')).trim();
                    if (name) students.push({ id, name });
                  });
                }
                students.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
                classes.push({ id: classId, name: className, students });
              });
            }
          }
        } catch (_) {}
      }

      _conImportClassesCache = classes;
      return classes;
    }

    async function _conGetAssociatedPlannerClass() {
      // 1. Direct activePlannerEntryId
      let plannerId = typeof activePlannerEntryId === 'string' ? activePlannerEntryId.trim() : '';

      // 2. Fallback: check session data in memory
      if (!plannerId && typeof conBuildSessionData === 'function') {
        try {
          const curData = conBuildSessionData();
          if (curData && (curData._plannerEntryId || curData.plannerEntryId)) {
            plannerId = String(curData._plannerEntryId || curData.plannerEntryId).trim();
          }
        } catch (_) {}
      }

      // 3. Fallback: check sessionStorage active request
      if (!plannerId) {
        try {
          const raw = sessionStorage.getItem('cmt-board-active-open-request');
          if (raw) {
            const req = JSON.parse(raw);
            if (req && req.plannerEntryId) plannerId = String(req.plannerEntryId).trim();
          }
        } catch (_) {}
      }

      // 4. Fallback: check LinksService edges for the current board file
      if (!plannerId && window.LinksService && typeof LinksService.getLinksFor === 'function') {
        try {
          const urnsToCheck = [];
          if (_conCurrentFileName) {
            urnsToCheck.push('cmt:board:' + _conCurrentFileName);
            urnsToCheck.push('cmt:mindmap:' + _conCurrentFileName);
            if (_conCurrentFolderName) {
              urnsToCheck.push('cmt:board:' + _conCurrentFolderName + '/' + _conCurrentFileName);
              urnsToCheck.push('cmt:mindmap:' + _conCurrentFolderName + '/' + _conCurrentFileName);
            }
          }
          for (const u of urnsToCheck) {
            const links = await LinksService.getLinksFor(u);
            const pLink = links.find(l => l.otherUrn && l.otherUrn.startsWith('cmt:planner:'));
            if (pLink) {
              plannerId = pLink.otherUrn.replace(/^cmt:planner:/, '').trim();
              break;
            }
            const cLink = links.find(l => l.otherUrn && l.otherUrn.startsWith('cmt:class:'));
            if (cLink) {
              return cLink.otherUrn.replace(/^cmt:class:/, '').trim();
            }
          }
        } catch (_) {}
      }

      // If we have a plannerId:
      if (plannerId) {
        // 5a. If it's a schedule link (sched:classId:date:time)
        if (plannerId.startsWith('sched:')) {
          const parts = plannerId.split(':');
          if (parts[1]) return parts[1];
        }
        // 5b. Search in bpGetAllEntries()
        if (typeof bpGetAllEntries === 'function') {
          const all = bpGetAllEntries();
          const hit = all.find(e => e && e.id === plannerId);
          if (hit && (hit.classId || hit.class || hit.className)) {
            return hit.classId || hit.class || hit.className;
          }
        }
        // 5c. Search in window.PLANNER_ENTRIES_BY_CLASS
        if (window.PLANNER_ENTRIES_BY_CLASS) {
          const byClass = window.PLANNER_ENTRIES_BY_CLASS;
          for (const cid of Object.keys(byClass)) {
            const arr = Array.isArray(byClass[cid]) ? byClass[cid] : [];
            if (arr.some(e => e && (e.id === plannerId || String(e.id) === plannerId))) {
              return cid;
            }
          }
        }
        // 5d. Check LinksService for the planner entry itself:
        if (window.LinksService && typeof LinksService.getLinksFor === 'function') {
          try {
            const pLinks = await LinksService.getLinksFor('cmt:planner:' + plannerId);
            const cLink = pLinks.find(l => l.otherUrn && l.otherUrn.startsWith('cmt:class:'));
            if (cLink) {
              return cLink.otherUrn.replace(/^cmt:class:/, '').trim();
            }
          } catch (_) {}
        }
      }

      // 6. If no planner entry ID, but activeClassGroup is set:
      if (typeof activeClassGroup === 'string' && activeClassGroup.trim()) {
        return activeClassGroup.trim();
      }

      return '';
    }

    async function _conLoadClassPlans() {
      if (_conImportPlansCache) return _conImportPlansCache;
      let plans = {};
      if (typeof SAVED_CLASS_PLANS !== 'undefined' && SAVED_CLASS_PLANS) {
        plans = SAVED_CLASS_PLANS;
      } else if (window.Desktop && typeof Desktop.readText === 'function') {
        try {
          const res = await Desktop.readText('classPlans', 'plans.js');
          if (res && res.ok && res.content) {
            const sandbox = {};
            const fn = new Function('var SAVED_CLASS_PLANS; ' + res.content + '; return typeof SAVED_CLASS_PLANS !== "undefined" ? SAVED_CLASS_PLANS : (typeof classPlans !== "undefined" ? classPlans : {});');
            plans = fn() || {};
          }
        } catch (_) {}
      }
      _conImportPlansCache = plans;
      return plans;
    }

    function conRenderClassImportDropdowns(preferredClassId) {
      const classes = _conImportClassesCache || [];
      const banner = document.getElementById('con-imp-planner-banner');
      const bannerText = document.getElementById('con-imp-planner-banner-text');
      const bannerToggle = document.getElementById('con-imp-planner-banner-toggle');

      const isFiltered = _conImportFilterToPlanner && _conImportPlannerClass;
      if (banner) {
        if (_conImportPlannerClass) {
          banner.style.display = 'flex';
          const tFn = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t.bind(i18n) : null;
          if (bannerText) {
            bannerText.textContent = isFiltered
              ? (tFn ? tFn('conImportFilteredToPlanner', { class: _conImportPlannerClass.name }) : `Filtered to Planner slot class: ${_conImportPlannerClass.name}`)
              : (tFn ? tFn('conImportShowingAllClasses', { class: _conImportPlannerClass.name }) : `Showing all classes (Planner slot is ${_conImportPlannerClass.name})`);
          }
          if (bannerToggle) {
            bannerToggle.textContent = isFiltered
              ? (tFn ? tFn('conImportBtnShowAll') : '[SHOW ALL CLASSES]')
              : (tFn ? tFn('conImportBtnFilterPlanner') : '[FILTER TO PLANNER CLASS]');
          }
        } else {
          banner.style.display = 'none';
        }
      }

      const displayClasses = isFiltered ? [_conImportPlannerClass] : classes;

      const rSel = document.getElementById('con-imp-roster-class-select');
      const pSel = document.getElementById('con-imp-plan-class-select');
      const tSel = document.getElementById('con-imp-teams-class-select');

      const optionsHtml = displayClasses.length === 0
        ? '<option value="">No classes found (check Group Editor)</option>'
        : displayClasses.map(c => `<option value="${conEscHtml(c.id)}">${conEscHtml(c.name)} (${c.students.length} students)</option>`).join('');

      if (rSel) rSel.innerHTML = optionsHtml;
      if (pSel) pSel.innerHTML = optionsHtml;
      if (tSel) tSel.innerHTML = optionsHtml;

      // Sync name format dropdowns
      ['con-imp-roster-name-format', 'con-imp-plan-name-format', 'con-imp-teams-name-format'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = _conImportNameDisplayMode;
      });

      const activeId = preferredClassId || (displayClasses.length > 0 ? displayClasses[0].id : '');
      if (activeId) {
        if (rSel) rSel.value = activeId;
        if (pSel) pSel.value = activeId;
        if (tSel) tSel.value = activeId;
        conOnRosterClassSelect(activeId);
        conOnPlanClassSelect(activeId);
        conOnTeamsClassSelect(activeId);
      }
    }
    window.conRenderClassImportDropdowns = conRenderClassImportDropdowns;

    function conToggleClassImportPlannerFilter() {
      _conImportFilterToPlanner = !_conImportFilterToPlanner;
      window._conImportFilterToPlanner = _conImportFilterToPlanner;
      const targetId = _conImportPlannerClass ? _conImportPlannerClass.id : '';
      conRenderClassImportDropdowns(targetId);
    }
    window.conToggleClassImportPlannerFilter = conToggleClassImportPlannerFilter;

    window.conOnNameFormatChange = function (mode) {
      if (!['first', 'last', 'full', 'custom'].includes(mode)) mode = 'full';
      _conImportNameDisplayMode = mode;
      localStorage.setItem('cmt-gs-name-display', mode);
      ['con-imp-roster-name-format', 'con-imp-plan-name-format', 'con-imp-teams-name-format'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== mode) el.value = mode;
      });

      // Instantly re-render current tab contents
      const rSel = document.getElementById('con-imp-roster-class-select');
      if (rSel && rSel.value) conOnRosterClassSelect(rSel.value);

      const pSel = document.getElementById('con-imp-plan-select');
      if (pSel && pSel.value) conOnPlanSelect(pSel.value);

      const tSel = document.getElementById('con-imp-teams-class-select');
      if (tSel && tSel.value) conOnTeamsClassSelect(tSel.value);
    };

    window.conOpenClassImportModal = async function () {
      if (typeof conOpenUniversalImportModal === 'function') {
        conOpenUniversalImportModal('class', 'roster');
        return;
      }
      const modal = document.getElementById('con-class-import-overlay');
      if (!modal) return;

      _conImportClassesCache = null; // force fresh read
      const classes = await _conGetClassList();

      const savedNameMode = localStorage.getItem('cmt-gs-name-display') || (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG?.nameDisplayMode) || 'full';
      if (['first', 'last', 'full', 'custom'].includes(savedNameMode)) {
        _conImportNameDisplayMode = savedNameMode;
      } else {
        _conImportNameDisplayMode = 'full';
      }

      const associatedClass = await _conGetAssociatedPlannerClass();
      let matchedClass = null;
      if (associatedClass) {
        matchedClass = classes.find(c =>
          c.id === associatedClass ||
          c.name === associatedClass ||
          c.id.toLowerCase() === associatedClass.toLowerCase() ||
          c.name.toLowerCase() === associatedClass.toLowerCase()
        );
      }

      _conImportPlannerClass = matchedClass || null;
      window._conImportPlannerClass = _conImportPlannerClass;
      _conImportFilterToPlanner = !!matchedClass;
      window._conImportFilterToPlanner = _conImportFilterToPlanner;

      const defaultId = matchedClass ? matchedClass.id : (activeClassGroup || (classes.length > 0 ? classes[0].id : ''));
      conRenderClassImportDropdowns(defaultId);

      modal.style.display = 'flex';
      conSwitchClassImportTab(_conImportActiveTab || 'roster');
    };

    window.conCloseClassImportModal = function () {
      const modal = document.getElementById('con-class-import-overlay');
      if (modal) modal.style.display = 'none';
    };

    window.conSwitchClassImportTab = function (tab) {
      _conImportActiveTab = tab;
      const tabRoster = document.getElementById('con-imp-tab-roster');
      const tabPlan = document.getElementById('con-imp-tab-plan');
      const tabTeams = document.getElementById('con-imp-tab-teams');

      const pRoster = document.getElementById('con-imp-panel-roster');
      const pPlan = document.getElementById('con-imp-panel-plan');
      const pTeams = document.getElementById('con-imp-panel-teams');

      if (tabRoster) {
        tabRoster.style.background = tab === 'roster' ? '#000' : '#fff';
        tabRoster.style.color = tab === 'roster' ? '#fff' : '#000';
      }
      if (tabPlan) {
        tabPlan.style.background = tab === 'plan' ? '#000' : '#fff';
        tabPlan.style.color = tab === 'plan' ? '#fff' : '#000';
      }
      if (tabTeams) {
        tabTeams.style.background = tab === 'teams' ? '#000' : '#fff';
        tabTeams.style.color = tab === 'teams' ? '#fff' : '#000';
      }

      if (pRoster) pRoster.style.display = tab === 'roster' ? 'flex' : 'none';
      if (pPlan) pPlan.style.display = tab === 'plan' ? 'flex' : 'none';
      if (pTeams) pTeams.style.display = tab === 'teams' ? 'flex' : 'none';

      // Update footer actions
      const ft = document.getElementById('con-imp-footer-actions');
      if (!ft) return;
      if (tab === 'roster') {
        ft.innerHTML = `
          <button type="button" class="action-btn btn-black" onclick="conClassImportExecuteRoster()" style="font-weight:900;background:#000;color:#fff;border:2px solid #000;box-shadow:3px 3px 0px #000;">
            <img src="../assets/icons/plus.svg" class="btn-icon" style="filter:brightness(0) invert(1);" alt="" /> [IMPORT ROSTER TO BOARD]
          </button>
        `;
      } else if (tab === 'plan') {
        ft.innerHTML = `
          <button type="button" class="action-btn btn-black" onclick="conClassImportExecutePlan()" style="font-weight:900;background:#000;color:#fff;border:2px solid #000;box-shadow:3px 3px 0px #000;">
            <img src="../assets/icons/table.svg" class="btn-icon" style="filter:brightness(0) invert(1);" alt="" /> [IMPORT SEATING PLAN TO CANVAS]
          </button>
        `;
      } else if (tab === 'teams') {
        ft.innerHTML = `
          <button type="button" class="action-btn btn-grey" onclick="conClassImportExecuteTeams('scoreboard')" style="font-weight:900;border:2px solid #000;">[SET ACTIVE TEAMS]</button>
          <button type="button" class="action-btn btn-grey" onclick="conClassImportExecuteTeams('groups')" style="font-weight:900;border:2px solid #000;">[SPAWN TEAM GROUPS]</button>
          <button type="button" class="action-btn btn-black" onclick="conClassImportExecuteTeams('both')" style="font-weight:900;background:#000;color:#fff;border:2px solid #000;box-shadow:3px 3px 0px #000;">[BOTH: GROUPS &amp; SCOREBOARD]</button>
        `;
      }
    };

    // --- Tab 1: Roster Methods ---
    window.conOnRosterClassSelect = function (classId) {
      const pSel = document.getElementById('con-imp-plan-class-select');
      if (pSel && pSel.value !== classId) { pSel.value = classId; conOnPlanClassSelect(classId); }
      const tSel = document.getElementById('con-imp-teams-class-select');
      if (tSel && tSel.value !== classId) { tSel.value = classId; conOnTeamsClassSelect(classId); }
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const listEl = document.getElementById('con-imp-roster-students-list');
      const countEl = document.getElementById('con-imp-roster-count');
      if (!listEl) return;

      if (!cls || !cls.students || cls.students.length === 0) {
        listEl.innerHTML = '<span style="color:#888;font-size:0.82rem;font-style:italic;padding:8px;">No students enrolled in this class.</span>';
        if (countEl) countEl.textContent = '0 students selected';
        return;
      }

      listEl.innerHTML = cls.students.map((st, i) => {
        const displayName = _conResolveStudentName(st.id || st, _conImportNameDisplayMode);
        return `
        <label style="display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #000;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:700;cursor:pointer;">
          <input type="checkbox" class="con-imp-st-cb" value="${conEscHtml(displayName)}" data-id="${conEscHtml(st.id)}" checked onchange="conUpdateRosterSelectedCount()" />
          <span>${conEscHtml(displayName)}</span>
        </label>
      `;
      }).join('');

      conUpdateRosterSelectedCount();
    };

    window.conUpdateRosterSelectedCount = function () {
      const countEl = document.getElementById('con-imp-roster-count');
      const cbs = document.querySelectorAll('.con-imp-st-cb:checked');
      if (countEl) {
        countEl.textContent = `${cbs.length} student${cbs.length === 1 ? '' : 's'} selected`;
      }
    };

    window.conSelectAllRosterStudents = function (selectAll) {
      document.querySelectorAll('.con-imp-st-cb').forEach(cb => {
        cb.checked = !!selectAll;
      });
      conUpdateRosterSelectedCount();
    };

    window.conClassImportExecuteRoster = function () {
      const rSel = document.getElementById('con-imp-roster-class-select');
      const classId = rSel ? rSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : 'Class';

      const selectedCbs = Array.from(document.querySelectorAll('.con-imp-st-cb:checked'));
      const studentNames = selectedCbs.map(cb => cb.value.trim()).filter(Boolean);

      if (studentNames.length === 0) {
        if (typeof showToast === 'function') showToast('Please select at least one student to import.', true);
        return;
      }

      const modeRadio = document.querySelector('input[name="con-imp-roster-target"]:checked');
      const mode = modeRadio ? modeRadio.value : 'group';

      if (mode === 'tray') {
        if (typeof conImportTrayOpen === 'function') {
          conImportTrayOpen(studentNames);
        }
        conCloseClassImportModal();
        if (typeof showToast === 'function') showToast(`Added ${studentNames.length} students to staging tray.`);
        return;
      }

      if (typeof conPushUndo === 'function') conPushUndo();
      else if (typeof window.conPushUndo === 'function') window.conPushUndo();

      const brd = (typeof board === 'function') ? board() : (window.conGetBoard ? window.conGetBoard() : document.getElementById('constellation-board'));
      const startX = brd ? Math.round(brd.scrollLeft + Math.max(40, (brd.clientWidth / 2) - 340)) : 100;
      const startY = brd ? Math.round(brd.scrollTop + Math.max(40, (brd.clientHeight / 2) - 180)) : 100;

      if (mode === 'note') {
        const text = `## ${className} Roster (${studentNames.length} Students)\n\n` +
          studentNames.map(s => `- [ ] ${s}`).join('\n');
        if (typeof conNoteAdd === 'function') {
          conNoteAdd(startX, startY, text);
        } else if (typeof window.conNoteAdd === 'function') {
          window.conNoteAdd(startX, startY, text);
        }
        conCloseClassImportModal();
        if (typeof showToast === 'function') showToast(`Created roster note card for ${className}.`);
        return;
      }

      // mode === 'group'
      const nodeIds = [];
      const count = studentNames.length;
      let cols = 4;
      if (count <= 4) cols = Math.max(2, count);
      else if (count <= 12) cols = 4;
      else if (count <= 20) cols = 5;
      else cols = 6;

      const COL_W = 180;
      const ROW_H = 60;
      const startGridX = startX + 24;
      const startGridY = startY + 24;

      const addWordFn = (typeof conAddWordAt === 'function') ? conAddWordAt : (window.conAddWordAt || null);
      const groupCreateFn = (typeof conGroupCreate === 'function') ? conGroupCreate : (window.conGroupCreate || null);
      const groupRefitFn = (typeof conGroupRefit === 'function') ? conGroupRefit : (window.conGroupRefit || null);
      const groupStyleFn = (typeof conGroupApplyStyle === 'function') ? conGroupApplyStyle : (window.conGroupApplyStyle || null);

      if (!addWordFn) {
        if (typeof showToast === 'function') showToast('Board node creator is not ready.', true);
        return;
      }

      studentNames.forEach((name, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const nx = startGridX + (col * COL_W);
        const ny = startGridY + (row * ROW_H);
        const nid = addWordFn(name, nx, ny);
        if (nid) {
          nodeIds.push(nid);
          const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
          const nodeObj = allNodes.find(n => n && n.id === nid);
          if (nodeObj && brd) {
            const zoom = (typeof conCurrentZoom !== 'undefined' && conCurrentZoom) ? conCurrentZoom : (window.conCurrentZoom || 1);
            const bcx = brd.clientWidth / 2, bcy = brd.clientHeight / 2;
            nodeObj.baseX = bcx + (nodeObj.x - bcx) / zoom;
            nodeObj.baseY = bcy + (nodeObj.y - bcy) / zoom;
          }
        }
      });

      if (nodeIds.length > 0 && groupCreateFn) {
        const group = groupCreateFn(nodeIds, startX, startY);
        if (group) {
          group.title = `${className} — Roster`;
          if (groupRefitFn) groupRefitFn(group);
          if (groupStyleFn) groupStyleFn(group);
        }
      }
      if (typeof conSelect === 'function') conSelect(null);
      else if (typeof window.conSelect === 'function') window.conSelect(null);

      conCloseClassImportModal();
      if (typeof showToast === 'function') showToast(`Imported ${studentNames.length} students inside class group on board.`);
    };

    // --- Tab 2: Seating Plan Methods ---
    window.conOnPlanClassSelect = async function (classId) {
      const rSel = document.getElementById('con-imp-roster-class-select');
      if (rSel && rSel.value !== classId) { rSel.value = classId; conOnRosterClassSelect(classId); }
      const tSel = document.getElementById('con-imp-teams-class-select');
      if (tSel && tSel.value !== classId) { tSel.value = classId; conOnTeamsClassSelect(classId); }
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : classId;

      const pSel = document.getElementById('con-imp-plan-select');
      if (!pSel) return;

      const allPlans = await _conLoadClassPlans();
      const plansForClass = (allPlans && (allPlans[className] || allPlans[classId])) || [];

      if (!Array.isArray(plansForClass) || plansForClass.length === 0) {
        pSel.innerHTML = '<option value="">No saved seating plans for this class</option>';
        conOnPlanSelect('');
        return;
      }

      pSel.innerHTML = plansForClass.map((p, idx) => `
        <option value="${conEscHtml(p.id || String(idx))}">${conEscHtml(p.name || ('Plan ' + (idx + 1)))}${p.roomNumber ? ' (Room ' + conEscHtml(p.roomNumber) + ')' : ''}</option>
      `).join('');

      conOnPlanSelect(pSel.value);
    };

    window.conOnPlanSelect = async function (planId) {
      const previewBox = document.getElementById('con-imp-plan-preview-box');
      if (!previewBox) return;

      if (!planId) {
        previewBox.innerHTML = '<span style="color:#888;font-style:italic;">No seating plan selected. You can create seating plans in Class Plan tool.</span>';
        return;
      }

      const pClassSel = document.getElementById('con-imp-plan-class-select');
      const classId = pClassSel ? pClassSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : classId;

      const allPlans = await _conLoadClassPlans();
      const plansForClass = (allPlans && (allPlans[className] || allPlans[classId])) || [];
      const plan = plansForClass.find((p, idx) => (p.id || String(idx)) === planId);

      if (!plan) {
        previewBox.innerHTML = '<span style="color:#888;font-style:italic;">Plan details not found.</span>';
        return;
      }

      const seats = Array.isArray(plan.seats) ? plan.seats : [];
      const assignedCount = seats.filter(s => s && (s.studentName || s.studentId)).length;
      const layoutType = plan.layoutType || (plan.rows && plan.cols ? 'Grid' : 'Custom');

      previewBox.innerHTML = `
        <div style="font-weight:800;font-size:0.92rem;margin-bottom:4px;color:#0f172a;">${conEscHtml(plan.name || 'Seating Plan')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:0.8rem;color:#475569;">
          <span><strong>Room:</strong> ${conEscHtml(plan.roomNumber || 'Default')}</span>
          <span><strong>Layout:</strong> ${conEscHtml(layoutType)}</span>
          <span><strong>Desks:</strong> ${seats.length || (plan.rows * plan.cols) || 0}</span>
          <span><strong>Assigned Students:</strong> ${assignedCount}</span>
        </div>
      `;
    };

    window.conClassImportExecutePlan = async function () {
      const pClassSel = document.getElementById('con-imp-plan-class-select');
      const classId = pClassSel ? pClassSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : classId;

      const pSel = document.getElementById('con-imp-plan-select');
      const planId = pSel ? pSel.value : '';
      if (!planId) {
        if (typeof showToast === 'function') showToast('Please select a valid seating plan.', true);
        return;
      }

      const allPlans = await _conLoadClassPlans();
      const plansForClass = (allPlans && (allPlans[className] || allPlans[classId])) || [];
      const plan = plansForClass.find((p, idx) => (p.id || String(idx)) === planId);
      if (!plan) return;

      if (typeof conPushUndo === 'function') conPushUndo();
      else if (typeof window.conPushUndo === 'function') window.conPushUndo();

      const brd = (typeof board === 'function') ? board() : (window.conGetBoard ? window.conGetBoard() : document.getElementById('constellation-board'));
      const startX = brd ? Math.round(brd.scrollLeft + Math.max(40, (brd.clientWidth / 2) - 360)) : 100;
      const startY = brd ? Math.round(brd.scrollTop + Math.max(40, (brd.clientHeight / 2) - 220)) : 100;

      const wrapInGroup = document.getElementById('con-imp-plan-opt-group')?.checked ?? true;
      const placeNames = document.getElementById('con-imp-plan-opt-names')?.checked ?? true;

      const addWordFn = (typeof conAddWordAt === 'function') ? conAddWordAt : (window.conAddWordAt || null);
      const groupCreateFn = (typeof conGroupCreate === 'function') ? conGroupCreate : (window.conGroupCreate || null);
      const groupRefitFn = (typeof conGroupRefit === 'function') ? conGroupRefit : (window.conGroupRefit || null);
      const groupStyleFn = (typeof conGroupApplyStyle === 'function') ? conGroupApplyStyle : (window.conGroupApplyStyle || null);

      if (!addWordFn) {
        if (typeof showToast === 'function') showToast('Board node creator is not ready.', true);
        return;
      }

      const layoutType = String(plan.layoutType || (plan.rows && plan.cols ? 'grid' : 'grid')).toLowerCase();
      const deskItems = [];

      // Map existing assigned seats by seatId
      const seatMap = new Map();
      if (Array.isArray(plan.seats)) {
        plan.seats.forEach(s => {
          if (!s) return;
          if (s.seatId) seatMap.set(String(s.seatId), s);
          if (s.row !== undefined && s.col !== undefined) {
            seatMap.set(`${s.row}:${s.col}`, s);
          }
        });
      }

      if (layoutType === 'ushape') {
        const w = Math.max(3, Number(plan.uWidth) || 6);
        const d = Math.max(1, Number(plan.uDepth) || 3);
        const COL_GAP = 180;
        const ROW_GAP = 60;
        let deskCounter = 1;

        // Top row (c from 0 to w - 1)
        for (let c = 0; c < w; c++) {
          const seatId = `top:${c}`;
          const seat = seatMap.get(seatId);
          deskItems.push({
            seatId,
            seat,
            defaultLabel: (seat && seat.deskName) || `Desk ${deskCounter++}`,
            x: startX + 24 + c * COL_GAP,
            y: startY + 24
          });
        }

        // Left and Right arms (r from 1 to d)
        for (let r = 1; r <= d; r++) {
          const leftSeatId = `left:${r}`;
          const leftSeat = seatMap.get(leftSeatId);
          deskItems.push({
            seatId: leftSeatId,
            seat: leftSeat,
            defaultLabel: (leftSeat && leftSeat.deskName) || `Desk ${deskCounter++}`,
            x: startX + 24,
            y: startY + 24 + r * ROW_GAP
          });

          const rightSeatId = `right:${r}`;
          const rightSeat = seatMap.get(rightSeatId);
          deskItems.push({
            seatId: rightSeatId,
            seat: rightSeat,
            defaultLabel: (rightSeat && rightSeat.deskName) || `Desk ${deskCounter++}`,
            x: startX + 24 + (w - 1) * COL_GAP,
            y: startY + 24 + r * ROW_GAP
          });
        }
      } else if (layoutType === 'pods') {
        const roomRows = Math.max(1, Number(plan.roomRows) || 2);
        const roomCols = Math.max(1, Number(plan.roomCols) || 3);
        const podRows = Math.max(1, Number(plan.podRows) || 2);
        const podCols = Math.max(1, Number(plan.podCols) || 3);
        const DESK_W = 160;
        const DESK_H = 55;
        const POD_GAP_X = 60;
        const POD_GAP_Y = 50;
        const POD_BLOCK_W = podCols * DESK_W;
        const POD_BLOCK_H = podRows * DESK_H;
        let deskCounter = 1;

        for (let pr = 0; pr < roomRows; pr++) {
          for (let pc = 0; pc < roomCols; pc++) {
            for (let r = 0; r < podRows; r++) {
              for (let c = 0; c < podCols; c++) {
                const seatId = `${pr}:${pc}:${r}:${c}`;
                const seat = seatMap.get(seatId);
                deskItems.push({
                  seatId,
                  seat,
                  defaultLabel: (seat && seat.deskName) || `Desk ${deskCounter++}`,
                  x: startX + 24 + pc * (POD_BLOCK_W + POD_GAP_X) + c * DESK_W,
                  y: startY + 24 + pr * (POD_BLOCK_H + POD_GAP_Y) + r * DESK_H
                });
              }
            }
          }
        }
      } else {
        // Default: Grid layout
        const rows = Math.max(1, Number(plan.rows) || 4);
        const cols = Math.max(1, Number(plan.cols) || 5);
        const COL_GAP = 180;
        const ROW_GAP = 60;
        let deskCounter = 1;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const seatId = `${r}:${c}`;
            const seat = seatMap.get(seatId);
            deskItems.push({
              seatId,
              seat,
              defaultLabel: (seat && seat.deskName) || `Desk ${deskCounter++}`,
              x: startX + 24 + c * COL_GAP,
              y: startY + 24 + r * ROW_GAP
            });
          }
        }
      }

      // Fallback: If layout generated 0 desks but seats array has entries
      if (deskItems.length === 0 && Array.isArray(plan.seats) && plan.seats.length > 0) {
        const cols = 5;
        const COL_GAP = 180;
        const ROW_GAP = 60;
        plan.seats.forEach((seat, idx) => {
          if (!seat) return;
          let dx = startX + 24 + (idx % cols) * COL_GAP;
          let dy = startY + 24 + Math.floor(idx / cols) * ROW_GAP;
          if (seat.x !== undefined && seat.y !== undefined) {
            dx = startX + 24 + seat.x;
            dy = startY + 24 + seat.y;
          } else if (seat.col !== undefined && seat.row !== undefined) {
            dx = startX + 24 + seat.col * COL_GAP;
            dy = startY + 24 + seat.row * ROW_GAP;
          }
          deskItems.push({
            seatId: seat.seatId || String(idx),
            seat,
            defaultLabel: seat.deskName || `Desk ${idx + 1}`,
            x: dx,
            y: dy
          });
        });
      }

      const nodeIds = [];
      deskItems.forEach((item, idx) => {
        const seat = item.seat;
        let studentName = (seat ? (seat.studentName || seat.name || '') : '').trim();
        if (seat && seat.studentId) {
          studentName = _conResolveStudentName(seat.studentId, _conImportNameDisplayMode) || studentName;
        } else if (studentName) {
          studentName = _conResolveStudentName(studentName, _conImportNameDisplayMode) || studentName;
        }

        let label = '';
        if (placeNames && studentName) {
          label = studentName;
        } else {
          label = item.defaultLabel || `Desk ${idx + 1}`;
        }

        const nid = addWordFn(label, item.x, item.y);
        if (nid) {
          nodeIds.push(nid);
          const allNodes = (typeof conNodes !== 'undefined') ? conNodes : (window.conGetNodes ? window.conGetNodes() : []);
          const nodeObj = allNodes.find(n => n && n.id === nid);
          if (nodeObj && brd) {
            const zoom = (typeof conCurrentZoom !== 'undefined' && conCurrentZoom) ? conCurrentZoom : (window.conCurrentZoom || 1);
            const bcx = brd.clientWidth / 2, bcy = brd.clientHeight / 2;
            nodeObj.baseX = bcx + (nodeObj.x - bcx) / zoom;
            nodeObj.baseY = bcy + (nodeObj.y - bcy) / zoom;
          }
        }
      });

      if (wrapInGroup && nodeIds.length > 0 && groupCreateFn) {
        const group = groupCreateFn(nodeIds, startX, startY);
        if (group) {
          group.title = `${className} — ${plan.name || 'Seating Plan'}${plan.roomNumber ? ' (Room ' + plan.roomNumber + ')' : ''}`;
          if (groupRefitFn) groupRefitFn(group);
          if (groupStyleFn) groupStyleFn(group);
        }
      }
      if (typeof conSelect === 'function') conSelect(null);
      else if (typeof window.conSelect === 'function') window.conSelect(null);

      conCloseClassImportModal();
      if (typeof showToast === 'function') showToast(`Imported seating plan "${plan.name || 'Plan'}" onto canvas.`);
    };

    // --- Tab 3: Teams Methods ---
    window.conOnTeamsClassSelect = function (classId) {
      const rSel = document.getElementById('con-imp-roster-class-select');
      if (rSel && rSel.value !== classId) { rSel.value = classId; conOnRosterClassSelect(classId); }
      const pSel = document.getElementById('con-imp-plan-class-select');
      if (pSel && pSel.value !== classId) { pSel.value = classId; conOnPlanClassSelect(classId); }
      conOnTeamsModeChange(document.querySelector('input[name="con-imp-teams-mode"]:checked')?.value || 'saved');
    };

    window.conOnTeamsModeChange = function (mode) {
      const isSaved = mode === 'saved';
      const savedRow = document.getElementById('con-imp-teams-saved-row');
      const randomRow = document.getElementById('con-imp-teams-random-row');
      if (savedRow) savedRow.style.display = isSaved ? 'flex' : 'none';
      if (randomRow) randomRow.style.display = isSaved ? 'none' : 'flex';

      const tClassSel = document.getElementById('con-imp-teams-class-select');
      const classId = tClassSel ? tClassSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : classId;

      if (isSaved) {
        const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
        const setups = allSaved[className] || allSaved[classId] || {};
        const titles = Object.keys(setups);
        const setupSel = document.getElementById('con-imp-teams-setup-select');
        if (setupSel) {
          if (titles.length === 0) {
            setupSel.innerHTML = '<option value="">No saved setups for this class</option>';
          } else {
            setupSel.innerHTML = titles.map(t => `<option value="${conEscHtml(t)}">${conEscHtml(t)}</option>`).join('');
          }
        }
        conOnTeamsSetupSelect(setupSel ? setupSel.value : '');
      } else {
        conReshuffleRandomTeams();
      }
    };

    window.conOnTeamsSetupSelect = function (setupTitle) {
      const previewBox = document.getElementById('con-imp-teams-preview-box');
      if (!previewBox) return;

      const tClassSel = document.getElementById('con-imp-teams-class-select');
      const classId = tClassSel ? tClassSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : classId;

      const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
      const setups = allSaved[className] || allSaved[classId] || {};
      const setup = setups[setupTitle];

      if (!setup || !setup.assignments) {
        previewBox.innerHTML = '<span style="color:#888;font-style:italic;">No team setup selected. Switch to Random Balanced Teams to generate on the fly.</span>';
        return;
      }

      // Group assignments by team
      const byTeam = {};
      Object.entries(setup.assignments).forEach(([stName, tId]) => {
        const tKey = String(tId);
        if (!byTeam[tKey]) byTeam[tKey] = [];
        byTeam[tKey].push(_conResolveStudentName(stName, _conImportNameDisplayMode) || stName);
      });

      const teamNames = ['Team Blue', 'Team Red', 'Team Green', 'Team Yellow', 'Team Purple', 'Team Orange'];
      previewBox.innerHTML = Object.entries(byTeam).map(([tId, members], idx) => {
        const name = (setup.teams && setup.teams[tId] && setup.teams[tId].name) || teamNames[idx % teamNames.length] || `Team ${Number(tId) + 1}`;
        return `
          <div style="background:#fff;border:1.5px solid #000;border-radius:4px;padding:6px 10px;">
            <div style="font-weight:800;font-size:0.85rem;color:#0f172a;margin-bottom:3px;">${conEscHtml(name)} (${members.length} members)</div>
            <div style="font-size:0.78rem;color:#475569;">${members.map(conEscHtml).join(', ')}</div>
          </div>
        `;
      }).join('');
    };

    window.conOnTeamsCountSelect = function () {
      conReshuffleRandomTeams();
    };

    window.conReshuffleRandomTeams = function () {
      const tClassSel = document.getElementById('con-imp-teams-class-select');
      const classId = tClassSel ? tClassSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const students = cls && Array.isArray(cls.students) ? cls.students.map(s => _conResolveStudentName(s.id || s, _conImportNameDisplayMode)) : [];

      const countSel = document.getElementById('con-imp-teams-count-select');
      const k = countSel ? Math.max(2, Number(countSel.value) || 4) : 4;

      // Shuffle students
      const shuffled = students.slice().sort(() => Math.random() - 0.5);
      const teamsArr = [];
      const defaultNames = ['Team Blue', 'Team Red', 'Team Green', 'Team Yellow', 'Team Purple', 'Team Orange'];

      for (let i = 0; i < k; i++) {
        teamsArr.push({
          name: defaultNames[i % defaultNames.length] || `Team ${i + 1}`,
          members: []
        });
      }

      shuffled.forEach((name, idx) => {
        teamsArr[idx % k].members.push(name);
      });

      _conImportRandomTeams = teamsArr;

      const previewBox = document.getElementById('con-imp-teams-preview-box');
      if (!previewBox) return;

      previewBox.innerHTML = teamsArr.map((t, idx) => `
        <div style="background:#fff;border:1.5px solid #000;border-radius:4px;padding:6px 10px;">
          <div style="font-weight:800;font-size:0.85rem;color:#0f172a;margin-bottom:3px;">${conEscHtml(t.name)} (${t.members.length} members)</div>
          <div style="font-size:0.78rem;color:#475569;">${t.members.map(conEscHtml).join(', ')}</div>
        </div>
      `).join('');
    };

    function _conGetActiveTeamsForImport() {
      const mode = document.querySelector('input[name="con-imp-teams-mode"]:checked')?.value || 'saved';
      if (mode === 'random') {
        if (!_conImportRandomTeams || _conImportRandomTeams.length === 0) {
          conReshuffleRandomTeams();
        }
        return _conImportRandomTeams || [];
      }

      const tClassSel = document.getElementById('con-imp-teams-class-select');
      const classId = tClassSel ? tClassSel.value : '';
      const classes = _conImportClassesCache || [];
      const cls = classes.find(c => c.id === classId || c.name === classId);
      const className = cls ? cls.name : classId;

      const setupTitle = document.getElementById('con-imp-teams-setup-select')?.value || '';
      const allSaved = JSON.parse(localStorage.getItem('cms-saved-teams') || '{}');
      const setups = allSaved[className] || allSaved[classId] || {};
      const setup = setups[setupTitle];

      if (!setup || !setup.assignments) return [];

      const byTeam = {};
      Object.entries(setup.assignments).forEach(([stName, tId]) => {
        const tKey = String(tId);
        if (!byTeam[tKey]) byTeam[tKey] = [];
        byTeam[tKey].push(_conResolveStudentName(stName, _conImportNameDisplayMode) || stName);
      });

      const teamNames = ['Team Blue', 'Team Red', 'Team Green', 'Team Yellow', 'Team Purple', 'Team Orange'];
      return Object.entries(byTeam).map(([tId, members], idx) => ({
        name: (setup.teams && setup.teams[tId] && setup.teams[tId].name) || teamNames[idx % teamNames.length] || `Team ${Number(tId) + 1}`,
        members
      }));
    }

    window.conClassImportExecuteTeams = function (action) {
      const teamList = _conGetActiveTeamsForImport();
      if (!teamList || teamList.length === 0) {
        if (typeof showToast === 'function') showToast('No teams configured to import.', true);
        return;
      }

      if (action === 'groups' || action === 'both') {
        if (typeof conPushUndo === 'function') conPushUndo();
        const brd = (typeof board === 'function') ? board() : document.getElementById('constellation-board');
        const startX = brd ? Math.round(brd.scrollLeft + Math.max(40, (brd.clientWidth / 2) - 400)) : 100;
        const startY = brd ? Math.round(brd.scrollTop + Math.max(40, (brd.clientHeight / 2) - 250)) : 100;

        const addWordFn = (typeof conAddWordAt === 'function') ? conAddWordAt : (window.conAddWordAt || null);
        const groupCreateFn = (typeof conGroupCreate === 'function') ? conGroupCreate : (window.conGroupCreate || null);
        const groupRefitFn = (typeof conGroupRefit === 'function') ? conGroupRefit : (window.conGroupRefit || null);
        const groupStyleFn = (typeof conGroupApplyStyle === 'function') ? conGroupApplyStyle : (window.conGroupApplyStyle || null);

        teamList.forEach((team, tIdx) => {
          const teamX = startX + (tIdx % 2) * 380;
          const teamY = startY + Math.floor(tIdx / 2) * 260;
          const memberNodeIds = [];

          team.members.forEach((m, mIdx) => {
            const mx = teamX + (mIdx % 2) * 160;
            const my = teamY + Math.floor(mIdx / 2) * 50;
            if (addWordFn) {
              const nid = addWordFn(m, mx, my);
              if (nid) {
                memberNodeIds.push(nid);
                if (typeof conNodes !== 'undefined' && conNodes[nid]) {
                  conNodes[nid].baseX = mx;
                  conNodes[nid].baseY = my;
                }
              }
            }
          });

          if (memberNodeIds.length > 0 && groupCreateFn) {
            const grp = groupCreateFn(memberNodeIds, teamX, teamY);
            if (grp) {
              grp.title = team.name;
              grp.paletteIdx = (tIdx % 8);
              if (groupRefitFn) groupRefitFn(grp);
              if (groupStyleFn) groupStyleFn(grp);
            }
          }
        });

        if (typeof conDeselectAll === 'function') {
          conDeselectAll();
        }
      }

      if (action === 'scoreboard' || action === 'both') {
        if (typeof teams !== 'undefined') {
          teams = teamList.map(t => ({
            name: t.name,
            score: 0,
            members: t.members
          }));
          currentTeamIdx = 0;
          if (typeof renderMainScoreboard === 'function') {
            renderMainScoreboard();
          }
        }
      }

      conCloseClassImportModal();
      if (typeof showToast === 'function') {
        if (action === 'both') showToast(`Spawned ${teamList.length} team groups on canvas & active scoreboard.`);
        else if (action === 'groups') showToast(`Spawned ${teamList.length} team groups on canvas.`);
        else showToast(`Applied ${teamList.length} teams to Board scoreboard.`);
      }
    };

    function conEscHtml(str) {
      return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // =========================================================================
    // PART 1: LEARNING TOOLS & QUIZ DATA BRIDGE FOR BOARD
    // =========================================================================
    let _boardLearningBanksLoadPromise = null;
    window._boardLearningBanks = {
      wordbanks: [],
      quizzes: [],
      gapfillbanks: [],
      errorbanks: [],
      sentencebanks: [],
      dictations: [],
      quotebanks: [],
      grammarbanks: [],
      storybanks: []
    };

    if (!Array.isArray(window.vocabBank)) window.vocabBank = [];
    if (!Array.isArray(window.quizBank)) window.quizBank = [];
    if (!Array.isArray(window.gapFillBank)) window.gapFillBank = [];
    if (!Array.isArray(window.errorBank)) window.errorBank = [];
    if (!Array.isArray(window.orderSentences)) window.orderSentences = [];
    if (!Array.isArray(window.dictationBank)) window.dictationBank = [];
    if (!Array.isArray(window.quoteBank)) window.quoteBank = [];
    if (!Array.isArray(window.grammarData)) window.grammarData = [];
    if (!Array.isArray(window.chooseStoryBank)) window.chooseStoryBank = [];

    function _boardNormalizeQuizQuestion(raw, sourceFile = '') {
      if (!raw || typeof raw !== 'object') return null;
      const question = String(raw.question || raw.prompt || raw.text || '').trim();
      if (!question) return null;

      let answers = [];
      if (Array.isArray(raw.answers)) {
        answers = raw.answers.map(a => String(a ?? '').trim()).filter(Boolean);
      } else {
        const a1 = raw['answer 1'] ?? raw.answer1 ?? raw.option1 ?? raw.a;
        const a2 = raw['answer 2'] ?? raw.answer2 ?? raw.option2 ?? raw.b;
        const a3 = raw['answer 3'] ?? raw.answer3 ?? raw.option3 ?? raw.c;
        const a4 = raw['answer 4'] ?? raw.answer4 ?? raw.option4 ?? raw.d;
        [a1, a2, a3, a4].forEach(v => {
          if (v !== undefined && v !== null && String(v).trim()) {
            answers.push(String(v).trim());
          }
        });
      }

      let correctIndex = 0;
      const cRaw = raw.correctAnswer ?? raw.correctIndex ?? raw.answer ?? raw.correct;
      if (typeof cRaw === 'number' && Number.isFinite(cRaw)) {
        correctIndex = (cRaw >= 1 && cRaw <= 4 && (!raw.correctIndex || raw.correctIndex > 0)) ? Math.floor(cRaw) - 1 : Math.max(0, Math.floor(cRaw));
      } else if (typeof cRaw === 'string') {
        const cStr = cRaw.trim().toLowerCase();
        if (/^[1-4]$/.test(cStr)) {
          correctIndex = Number(cStr) - 1;
        } else {
          const matchIdx = answers.findIndex(a => a.toLowerCase() === cStr);
          if (matchIdx !== -1) correctIndex = matchIdx;
        }
      }

      if (correctIndex < 0 || (answers.length > 0 && correctIndex >= answers.length)) {
        correctIndex = 0;
      }

      const theme = String(raw.theme || raw.category || raw.topic || 'General').trim();
      const level = String(raw.level || raw.cefr || 'All').trim().toUpperCase();
      const keyword = String(raw.keyword || raw.tag || '').trim();
      const explanation = String(raw.explanation || raw.feedback || raw.notes || '').trim();
      const type = raw.type || (answers.length === 2 && /true|false|vrai|faux/i.test(answers.join(' ')) ? 'boolean' : (Array.isArray(raw.correctAnswers) ? 'multiple' : 'single'));

      return {
        id: raw.id || ('q_' + Math.random().toString(36).substring(2, 9)),
        question,
        answers,
        correctIndex,
        theme,
        level,
        keyword,
        explanation,
        type,
        _source: sourceFile || raw._source || ''
      };
    }

    function _boardNormalizeVocabItem(raw, sourceFile = '') {
      if (!raw || typeof raw !== 'object') return null;
      const word = String(raw.word || raw.term || raw.lemma || '').trim();
      if (!word) return null;

      let translation = String(raw.translation || raw.meaning || raw.definitionFr || raw.traduction || '').trim();
      let definition = String(raw.definition || raw.def || raw.meaningEn || '').trim();
      let ipa = String(raw.ipa || raw.phonetic || raw.pronunciation || '').trim();
      let partOfSpeech = raw.partOfSpeech || raw.pos || raw.type || '';
      if (Array.isArray(partOfSpeech)) partOfSpeech = partOfSpeech.join(', ');
      partOfSpeech = String(partOfSpeech).trim();

      let theme = raw.theme || raw.category || raw.topic || 'General';
      if (Array.isArray(theme)) theme = theme.join(', ');
      theme = String(theme).trim();

      let keywords = Array.isArray(raw.keywords) ? raw.keywords : (raw.keyword ? [raw.keyword] : []);
      let level = String(raw.level || raw.cefr || 'All').trim().toUpperCase();
      let examples = Array.isArray(raw.examples) ? raw.examples : (raw.example ? [raw.example] : []);

      return {
        id: raw.id || ('v_' + Math.random().toString(36).substring(2, 9)),
        word,
        translation,
        definition,
        ipa,
        partOfSpeech,
        theme,
        keywords,
        level,
        examples,
        synonyms: Array.isArray(raw.synonyms) ? raw.synonyms : [],
        antonyms: Array.isArray(raw.antonyms) ? raw.antonyms : [],
        _custom: !!raw._custom,
        _source: sourceFile || raw._source || ''
      };
    }

    function _boardParseRecordsFromContent(content, defaultVarName = '') {
      if (!content || typeof content !== 'string') return null;
      const trimmed = content.trim();

      // JSON parsing attempt
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && typeof parsed === 'object') {
            for (const key of ['records', 'items', 'questions', 'words', 'quotes', 'data', 'exercises', defaultVarName]) {
              if (Array.isArray(parsed[key])) return parsed[key];
            }
          }
        } catch (_) {}
      }

      // JS evaluation attempt
      try {
        const fn = new Function(
          String(content) +
          '\n; return (' +
          (defaultVarName ? `(typeof ${defaultVarName} !== "undefined" ? ${defaultVarName} : null) || ` : '') +
          '(typeof customVocabBank !== "undefined" ? customVocabBank : null) || ' +
          '(typeof vocabBank !== "undefined" ? vocabBank : null) || ' +
          '(typeof customQuizBank !== "undefined" ? customQuizBank : null) || ' +
          '(typeof quizBank !== "undefined" ? quizBank : null) || ' +
          '(typeof quizzes !== "undefined" ? quizzes : null) || ' +
          '(typeof customGapFillBank !== "undefined" ? customGapFillBank : null) || ' +
          '(typeof gapFillBank !== "undefined" ? gapFillBank : null) || ' +
          '(typeof customErrorBank !== "undefined" ? customErrorBank : null) || ' +
          '(typeof errorBank !== "undefined" ? errorBank : null) || ' +
          '(typeof customSentenceBank !== "undefined" ? customSentenceBank : null) || ' +
          '(typeof orderSentences !== "undefined" ? orderSentences : null) || ' +
          '(typeof customDictationBank !== "undefined" ? customDictationBank : null) || ' +
          '(typeof dictationBank !== "undefined" ? dictationBank : null) || ' +
          '(typeof customQuoteBank !== "undefined" ? customQuoteBank : null) || ' +
          '(typeof quoteBank !== "undefined" ? quoteBank : null) || ' +
          '(typeof customGrammarBank !== "undefined" ? customGrammarBank : null) || ' +
          '(typeof grammarData !== "undefined" ? grammarData : null) || ' +
          '(typeof customStoryBank !== "undefined" ? customStoryBank : null) || ' +
          '(typeof chooseStoryBank !== "undefined" ? chooseStoryBank : null) || ' +
          'null);'
        );
        const result = fn();
        if (Array.isArray(result)) return result;
      } catch (_) {
        try {
          const firstBracket = trimmed.indexOf('[');
          const lastBracket = trimmed.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket > firstBracket) {
            const slice = trimmed.slice(firstBracket, lastBracket + 1);
            const fn2 = new Function('return ' + slice + ';');
            const res2 = fn2();
            if (Array.isArray(res2)) return res2;
          }
        } catch (__) {}
      }

      return null;
    }

    async function boardEnsureLearningBanksLoaded(forceReload = false) {
      if (_boardLearningBanksLoadPromise && !forceReload) {
        return _boardLearningBanksLoadPromise;
      }

      const BANK_CONFIGS = [
        {
          key: 'wordbanks',
          globalVar: 'vocabBank',
          target: 'customWordbanks',
          subFolder: 'wordbanks',
          defaultVar: 'customVocabBank',
          defaultFiles: ['wordDb.js'],
          normalizer: _boardNormalizeVocabItem
        },
        {
          key: 'quizzes',
          globalVar: 'quizBank',
          target: 'customQuizzes',
          subFolder: 'quizzes',
          defaultVar: 'customQuizBank',
          defaultFiles: ['quiz.js'],
          normalizer: _boardNormalizeQuizQuestion
        },
        {
          key: 'gapfillbanks',
          globalVar: 'gapFillBank',
          target: 'customGapfillbanks',
          subFolder: 'gapfillbanks',
          defaultVar: 'customGapFillBank',
          defaultFiles: ['gapFillBank.js', 'gapfill.js']
        },
        {
          key: 'errorbanks',
          globalVar: 'errorBank',
          target: 'customErrorbanks',
          subFolder: 'errorbanks',
          defaultVar: 'customErrorBank',
          defaultFiles: ['errorBank.js', 'error.js']
        },
        {
          key: 'sentencebanks',
          globalVar: 'orderSentences',
          target: 'customSentences',
          subFolder: 'sentencebanks',
          defaultVar: 'customSentenceBank',
          defaultFiles: ['orderSentences.js', 'sentence.js']
        },
        {
          key: 'dictations',
          globalVar: 'dictationBank',
          target: 'customDictations',
          subFolder: 'dictations',
          defaultVar: 'customDictationBank',
          defaultFiles: ['dictation.js']
        },
        {
          key: 'quotebanks',
          globalVar: 'quoteBank',
          target: 'customQuotes',
          subFolder: 'quotebanks',
          defaultVar: 'customQuoteBank',
          defaultFiles: ['quoteBank.js', 'quote.js']
        },
        {
          key: 'grammarbanks',
          globalVar: 'grammarData',
          target: 'customGrammarbanks',
          subFolder: 'grammarbanks',
          defaultVar: 'customGrammarBank',
          defaultFiles: ['grammar.js']
        },
        {
          key: 'storybanks',
          globalVar: 'chooseStoryBank',
          target: 'customStorybanks',
          subFolder: 'storybanks',
          defaultVar: 'customStoryBank',
          defaultFiles: ['chooseStory.js', 'story.js']
        }
      ];

      const IGNORED_BULK_FILES = new Set([
        'simple-wiktionary-core.js',
        'simple-wiktionary.js',
        'simple-wiktionary-core.zip',
        'barrasdb.js'
      ]);

      _boardLearningBanksLoadPromise = (async () => {
        const isEl = !!(window.Desktop && Desktop.isElectron());

        for (const cfg of BANK_CONFIGS) {
          const loadedFileSets = [];
          const combinedRecords = [];
          const seenRecordKeys = new Map();
          const filesToTry = new Set(cfg.defaultFiles);

          // 1. In Electron, discover any user-created files in the target directory
          if (isEl && typeof Desktop.listFiles === 'function') {
            try {
              const listRes = await Desktop.listFiles(cfg.target, { extensions: ['.js', '.json'] });
              const fileList = listRes?.files || (Array.isArray(listRes) ? listRes : []);
              fileList.forEach(f => {
                const name = typeof f === 'string' ? f : f.filename;
                if (!name) return;
                const lower = name.toLowerCase();
                if (IGNORED_BULK_FILES.has(lower) || lower.endsWith('.bak') || lower.endsWith('.zip')) return;
                filesToTry.add(name);
              });
            } catch (err) {
              console.warn(`[BoardBankLoader] Failed listing files for ${cfg.target}:`, err);
            }
          }

          // 2. Load and parse each file
          for (const filename of filesToTry) {
            let content = '';
            if (isEl) {
              try {
                if (typeof Desktop.readText === 'function') {
                  const r = await Desktop.readText(cfg.target, filename);
                  if (r && r.ok && r.content) content = r.content;
                }
                if (!content && typeof Desktop.readByPath === 'function') {
                  const r2 = await Desktop.readByPath('customData', `${cfg.subFolder}/${filename}`);
                  if (r2 && r2.ok && r2.content) content = r2.content;
                }
              } catch (_) {}
            }

            // Web / fallback candidates
            if (!content) {
              const webCandidates = [
                `user/custom-data/${cfg.subFolder}/${filename}`,
                `data/${filename}`,
                `js/import-modules/${filename}`
              ];
              for (const url of webCandidates) {
                try {
                  const res = await fetch(url, { cache: 'no-store' });
                  if (res.ok) {
                    content = await res.text();
                    break;
                  }
                } catch (_) {}
              }
            }

            if (!content) continue;

            const rawRecords = _boardParseRecordsFromContent(content, cfg.defaultVar);
            if (Array.isArray(rawRecords) && rawRecords.length > 0) {
              const normalizedList = cfg.normalizer
                ? rawRecords.map(r => cfg.normalizer(r, filename)).filter(Boolean)
                : rawRecords;

              if (normalizedList.length > 0) {
                loadedFileSets.push({
                  filename,
                  target: cfg.target,
                  count: normalizedList.length,
                  records: normalizedList,
                  title: filename.replace(/\.(js|json)$/i, '').replace(/[-_]/g, ' ')
                });

                // Fast O(1) deduplication into combined global array
                normalizedList.forEach((item, itemIdx) => {
                  let key = '';
                  if (cfg.key === 'wordbanks' && item.word) {
                    key = String(item.word).toLowerCase().trim();
                  } else if (cfg.key === 'quizzes' && item.question) {
                    key = String(item.question).toLowerCase().trim();
                  } else {
                    key = item.id || item.sentence || item.quote || item.text || item.title || ('item_' + itemIdx);
                  }

                  if (key && seenRecordKeys.has(key)) {
                    const existingIdx = seenRecordKeys.get(key);
                    combinedRecords[existingIdx] = item;
                  } else {
                    combinedRecords.push(item);
                    if (key) seenRecordKeys.set(key, combinedRecords.length - 1);
                  }
                });
              }
            }
          }

          window._boardLearningBanks[cfg.key] = loadedFileSets;
          window[cfg.globalVar] = combinedRecords;
        }

        console.log('[BoardBankLoader] Learning & Quiz banks successfully loaded:', {
          wordbanks: (window.vocabBank || []).length,
          quizzes: (window.quizBank || []).length,
          gapfill: (window.gapFillBank || []).length,
          errors: (window.errorBank || []).length,
          sentences: (window.orderSentences || []).length,
          dictations: (window.dictationBank || []).length,
          quotes: (window.quoteBank || []).length,
          grammar: (window.grammarData || []).length,
          stories: (window.chooseStoryBank || []).length
        });

        return {
          vocabBank: window.vocabBank,
          quizBank: window.quizBank,
          gapFillBank: window.gapFillBank,
          errorBank: window.errorBank,
          orderSentences: window.orderSentences,
          dictationBank: window.dictationBank,
          quoteBank: window.quoteBank,
          grammarData: window.grammarData,
          chooseStoryBank: window.chooseStoryBank,
          fileSets: window._boardLearningBanks
        };
      })();

      return _boardLearningBanksLoadPromise;
    }

    // =========================================================================
    // PART 2: LEARNING IMPORT MODAL CONTROLLER & TAB SWITCHING
    // =========================================================================
    let _conActiveLearningTab = 'quizzes';
    let _conSelectedQuizQuestions = new Set();
    let _conSelectedVocabWords = new Set();
    let _conSelectedGrammarItems = new Set();

    let _conQuizDisplayLimit = 100;
    let _conVocabDisplayLimit = 100;
    let _conGrammarDisplayLimit = 100;

    let _conLastFilteredQuizCount = 0;
    let _conLastFilteredVocabCount = 0;
    let _conLastFilteredGrammarCount = 0;

    // =========================================================================
    // UNIVERSAL IMPORTER INTEGRATION (5 DOMAINS)
    // =========================================================================
    window.conOpenUniversalImportModal = function (initialDomain = 'learning', initialSubType = null, insertPos = null) {
      if (typeof UniversalImporter === 'undefined') {
        console.error('[Board] UniversalImporter module is not loaded.');
        if (typeof showToast === 'function') showToast('Universal Importer module not loaded.', true);
        return;
      }

      const activePlannerClass = (typeof _conImportPlannerClass !== 'undefined' && _conImportPlannerClass) ? _conImportPlannerClass.id : null;
      const hostUrn = (typeof _conCurrentFileName !== 'undefined' && _conCurrentFileName) ? ('cmt:board:' + _conCurrentFileName) : 'cmt:board:active';

      const pos = insertPos || (window._lastBoardPastePoint ? { x: window._lastBoardPastePoint.x, y: window._lastBoardPastePoint.y } : (window._boardCtxNoteX != null ? { x: window._boardCtxNoteX, y: window._boardCtxNoteY } : null));
      window._conLastInsertPos = pos;

      UniversalImporter.open({
        host: 'board',
        hostUrn: hostUrn,
        autoLink: true,
        initialDomain: initialDomain || 'learning',
        initialSubType: initialSubType || (initialDomain === 'class' ? 'roster' : (initialDomain === 'grades' ? 'grades-term' : 'wordbanks')),
        classContext: activePlannerClass,
        insertPosition: pos,
        onInsert: (selectedItems, chosenFormat, meta) => {
          conExecuteUniversalBoardInsert(selectedItems, chosenFormat, meta);
        }
      });
    };

    window.conExecuteUniversalBoardInsert = function (selectedItems, chosenFormat, meta) {
      if (!Array.isArray(selectedItems) || selectedItems.length === 0) return;

      const brd = document.getElementById('constellation-board');
      if (!brd) return;

      const addWordFn = (typeof conAddWordAt === 'function') ? conAddWordAt : (window.conAddWordAt || null);

      if (window.conPushUndo) window.conPushUndo();

      let targetX = null;
      let targetY = null;

      if (meta && meta.insertPlacement === 'center') {
        targetX = Math.max(40, Math.round(brd.scrollLeft + (brd.clientWidth / 2)));
        targetY = Math.max(40, Math.round(brd.scrollTop + (brd.clientHeight / 2)));
      } else if (meta && meta.insertPos && meta.insertPos.x != null) {
        targetX = meta.insertPos.x;
        targetY = meta.insertPos.y;
      } else if (window._conLastInsertPos && window._conLastInsertPos.x != null) {
        targetX = window._conLastInsertPos.x;
        targetY = window._conLastInsertPos.y;
      } else if (window._lastBoardPastePoint && window._lastBoardPastePoint.x != null) {
        targetX = window._lastBoardPastePoint.x;
        targetY = window._lastBoardPastePoint.y;
      } else if (window._boardCtxNoteX != null && window._boardCtxNoteY != null) {
        targetX = window._boardCtxNoteX;
        targetY = window._boardCtxNoteY;
      } else {
        targetX = Math.max(40, Math.round(brd.scrollLeft + (brd.clientWidth / 2)));
        targetY = Math.max(40, Math.round(brd.scrollTop + (brd.clientHeight / 2)));
      }

      const centerX = targetX;
      const centerY = targetY;

      const importField = (meta && meta.importField) || 'title';
      const nameDisplayMode = (meta && meta.nameDisplayMode) || 'full';

      // Output 0: Class Plan Visual Card
      if (chosenFormat === 'classplan' || (meta.subType === 'seating' && chosenFormat !== 'table' && chosenFormat !== 'note' && chosenFormat !== 'nodes' && chosenFormat !== 'tray' && chosenFormat !== 'mindmap')) {
        selectedItems.forEach((it, idx) => {
          const planPayload = it.raw?.rawPlan || it.raw || it;
          if (typeof conCreateClassPlanCard === 'function') {
            const rawClassName = it.className || planPayload.className || '';
            const resolvedClass = (typeof _cgDisplayName === 'function' ? _cgDisplayName(rawClassName) : '') || rawClassName;
            conCreateClassPlanCard({
              plan: planPayload,
              className: resolvedClass,
              title: it.title || planPayload.name
            }, centerX + (idx * 30), centerY + (idx * 30));
          }
        });
        if (typeof showToast === 'function') showToast(`Created class plan card for ${selectedItems.length} plan(s).`);
        return;
      }

      // Output 1: Staging Tray
      if (chosenFormat === 'tray') {
        const labels = selectedItems.map(it => {
          if (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.getItemText === 'function') {
            return UniversalImporter.getItemText(it, importField, nameDisplayMode);
          }
          return it.title || it.raw?.word || it.raw?.question || '';
        }).filter(Boolean);
        if (typeof conImportTrayOpen === 'function') {
          conImportTrayOpen(labels);
        }
        if (typeof showToast === 'function') showToast(`Added ${labels.length} items to staging tray.`);
        return;
      }

      // Output 2: Interactive Game / Activity Launcher Card
      if (chosenFormat === 'launcher') {
        const activityPayload = {
          id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          activityType: meta.subType === 'quizzes' ? 'quizzes' : (meta.subType === 'wordbanks' ? 'vocab' : 'grammar'),
          subType: meta.subType,
          title: `${selectedItems[0]?.theme || selectedItems[0]?.title || 'Activity'}: ${selectedItems.length} items`,
          icon: meta.subType === 'quizzes' ? 'quiz.svg' : (meta.subType === 'wordbanks' ? 'book.svg' : 'grammar.svg'),
          theme: selectedItems[0]?.theme || '',
          level: selectedItems[0]?.level || '',
          items: selectedItems.map(it => it.raw || it)
        };
        if (typeof conCreateGameLauncherCard === 'function') {
          conCreateGameLauncherCard(activityPayload, centerX, centerY);
        }
        if (typeof showToast === 'function') showToast(`Created launcher card for ${selectedItems.length} items.`);
        return;
      }

      // Output 3: Mindmap Radial Cluster
      if (chosenFormat === 'mindmap') {
        const rootText = selectedItems[0]?.theme || selectedItems[0]?.level || (meta.subType ? meta.subType.toUpperCase() : 'Mindmap');
        if (addWordFn) {
          const rootId = addWordFn(rootText, centerX, centerY);
          const radius = Math.min(260, Math.max(140, selectedItems.length * 16));
          const step = (Math.PI * 2) / Math.max(1, selectedItems.length);

          selectedItems.forEach((it, idx) => {
            const angle = idx * step;
            const cx = Math.round(centerX + Math.cos(angle) * radius);
            const cy = Math.round(centerY + Math.sin(angle) * radius);

            if (importField === 'both_nodes') {
              const primaryLabel = (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.getItemText === 'function')
                ? UniversalImporter.getItemText(it, 'title', nameDisplayMode)
                : (it.title || 'Item');
              const secondaryLabel = it.subtitle || primaryLabel;

              const childId = addWordFn(primaryLabel, cx, cy);
              if (childId && rootId && typeof conCreateEdge === 'function') {
                conCreateEdge(rootId, childId);
              }
              const pairAngle = angle + 0.15;
              const px = Math.round(centerX + Math.cos(pairAngle) * (radius + 90));
              const py = Math.round(centerY + Math.sin(pairAngle) * (radius + 90));
              const pairId = addWordFn(secondaryLabel, px, py);
              if (pairId && childId && typeof conCreateEdge === 'function') {
                conCreateEdge(childId, pairId);
              }
            } else {
              const itemLabel = (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.getItemText === 'function')
                ? UniversalImporter.getItemText(it, importField, nameDisplayMode)
                : (it.title || 'Item');
              const childId = addWordFn(itemLabel, cx, cy);
              if (childId && rootId && typeof conCreateEdge === 'function') {
                conCreateEdge(rootId, childId);
              }
            }
          });
          if (typeof conRedrawEdges === 'function') conRedrawEdges();
        }
        if (typeof showToast === 'function') showToast(`Created mindmap cluster with ${selectedItems.length} items.`);
        return;
      }

      // Output 4: Sticky Note / Checklist Card
      if (chosenFormat === 'note') {
        const headerTitle = selectedItems[0]?.theme ? `${selectedItems[0].theme} (${selectedItems.length} Items)` : `Imported Items (${selectedItems.length})`;
        const mdText = `## ${headerTitle}\n\n` +
          selectedItems.map(it => {
            const itemText = (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.getItemText === 'function')
              ? UniversalImporter.getItemText(it, importField, nameDisplayMode)
              : (`${it.title}${it.subtitle ? ' — ' + it.subtitle : ''}`);
            return `- [ ] **${itemText}**`;
          }).join('\n');
        if (typeof conNoteAdd === 'function') {
          conNoteAdd(centerX - 160, centerY - 100, mdText);
        }
        if (typeof showToast === 'function') showToast(`Created note card for ${selectedItems.length} items.`);
        return;
      }

      // Output 5: Table Grid
      if (chosenFormat === 'table') {
        const mdTable = UniversalImporter.toMarkdown(selectedItems, 'md-table', meta);
        if (typeof conNoteAdd === 'function') {
          conNoteAdd(centerX - 180, centerY - 100, mdTable);
        }
        if (typeof showToast === 'function') showToast(`Created table for ${selectedItems.length} items.`);
        return;
      }

      // Output 6: Spatial Seating Plan Layout (Preserves Room & Desk Topology)
      if (meta.subType === 'seating' && selectedItems.length > 0 && selectedItems[0]?.raw) {
        const plan = selectedItems[0].raw.rawPlan || selectedItems[0].raw;
        const layoutType = String(plan.layoutType || (plan.rows && plan.cols ? 'grid' : 'grid')).toLowerCase();
        const deskItems = [];
        const seatMap = new Map();
        if (Array.isArray(plan.seats)) {
          plan.seats.forEach(s => {
            if (!s) return;
            if (s.seatId) seatMap.set(String(s.seatId), s);
            if (s.row !== undefined && s.col !== undefined) seatMap.set(`${s.row}:${s.col}`, s);
          });
        }

        const COL_GAP = 180;
        const ROW_GAP = 65;
        const planStartX = centerX - 320;
        const planStartY = centerY - 180;

        if (layoutType === 'ushape') {
          const w = Math.max(3, Number(plan.uWidth) || 6);
          const d = Math.max(1, Number(plan.uDepth) || 3);
          let deskCounter = 1;
          for (let c = 0; c < w; c++) {
            const seatId = `top:${c}`;
            const seat = seatMap.get(seatId);
            deskItems.push({ seat, defaultLabel: seat?.deskName || `Desk ${deskCounter++}`, x: planStartX + c * COL_GAP, y: planStartY });
          }
          for (let r = 1; r <= d; r++) {
            const leftSeat = seatMap.get(`left:${r}`);
            deskItems.push({ seat: leftSeat, defaultLabel: leftSeat?.deskName || `Desk ${deskCounter++}`, x: planStartX, y: planStartY + r * ROW_GAP });
            const rightSeat = seatMap.get(`right:${r}`);
            deskItems.push({ seat: rightSeat, defaultLabel: rightSeat?.deskName || `Desk ${deskCounter++}`, x: planStartX + (w - 1) * COL_GAP, y: planStartY + r * ROW_GAP });
          }
        } else if (layoutType === 'pods') {
          const roomRows = Math.max(1, Number(plan.roomRows) || 2);
          const roomCols = Math.max(1, Number(plan.roomCols) || 3);
          const podRows = Math.max(1, Number(plan.podRows) || 2);
          const podCols = Math.max(1, Number(plan.podCols) || 3);
          const DESK_W = 160, DESK_H = 55, POD_GAP_X = 60, POD_GAP_Y = 50;
          const POD_BLOCK_W = podCols * DESK_W;
          const POD_BLOCK_H = podRows * DESK_H;
          let deskCounter = 1;
          for (let pr = 0; pr < roomRows; pr++) {
            for (let pc = 0; pc < roomCols; pc++) {
              for (let r = 0; r < podRows; r++) {
                for (let c = 0; c < podCols; c++) {
                  const seat = seatMap.get(`${pr}:${pc}:${r}:${c}`);
                  deskItems.push({
                    seat,
                    defaultLabel: seat?.deskName || `Desk ${deskCounter++}`,
                    x: planStartX + pc * (POD_BLOCK_W + POD_GAP_X) + c * DESK_W,
                    y: planStartY + pr * (POD_BLOCK_H + POD_GAP_Y) + r * DESK_H
                  });
                }
              }
            }
          }
        } else {
          // Default: Grid layout
          const rows = Math.max(1, Number(plan.rows) || 4);
          const cols = Math.max(1, Number(plan.cols) || 5);
          let deskCounter = 1;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const seat = seatMap.get(`${r}:${c}`);
              deskItems.push({
                seat,
                defaultLabel: seat?.deskName || `Desk ${deskCounter++}`,
                x: planStartX + c * COL_GAP,
                y: planStartY + r * ROW_GAP
              });
            }
          }
        }

        const planNodeIds = [];
        deskItems.forEach((di, idx) => {
          const seat = di.seat;
          let studentName = (seat ? (seat.studentName || seat.name || '') : '').trim();
          if (seat?.studentId) {
            studentName = (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.formatStudentName === 'function')
              ? UniversalImporter.formatStudentName(seat.studentId, nameDisplayMode, studentName)
              : (studentName || seat.studentId);
          }
          const label = studentName || di.defaultLabel || `Desk ${idx + 1}`;
          if (addWordFn) {
            const nid = addWordFn(label, di.x, di.y);
            if (nid) {
              planNodeIds.push(nid);
              if (typeof conNodes !== 'undefined') {
                const nodeObj = conNodes.find(n => n && n.id === nid);
                if (nodeObj) {
                  nodeObj.urn = selectedItems[0].urn || `cmt:plan:${plan.id || plan.name}`;
                  nodeObj.subType = 'seating';
                  nodeObj.domain = 'class';
                  if (nodeObj.el && nodeObj.urn) nodeObj.el.setAttribute('data-urn', nodeObj.urn);
                }
              }
            }
          }
        });

        if (planNodeIds.length > 0 && typeof conGroupCreate === 'function') {
          const group = conGroupCreate(planNodeIds, planStartX - 20, planStartY - 20);
          if (group) {
            group.title = `${selectedItems[0].title || plan.name || 'Class'} — Seating Layout (${layoutType.toUpperCase()})`;
            if (typeof conGroupRefit === 'function') conGroupRefit(group);
            if (typeof conGroupApplyStyle === 'function') conGroupApplyStyle(group);
          }
        }
        if (typeof showToast === 'function') {
          showToast(`Imported seating plan with ${deskItems.length} desks onto the board.`);
        }
        return;
      }

      // Default / Output 7: Individual Canvas Nodes with Staggered Layout & URN Links
      if (!addWordFn) {
        if (typeof showToast === 'function') showToast('Node creator not available.', true);
        return;
      }

      const count = selectedItems.length;
      let cols = 4;
      if (count <= 4) cols = Math.max(2, count);
      else if (count <= 12) cols = 4;
      else if (count <= 20) cols = 5;
      else cols = 6;

      const COL_W = (importField === 'both_nodes') ? 290 : 180;
      const ROW_H = 65;
      const startX = centerX - Math.round((cols * COL_W) / 2);
      const startY = centerY - Math.round((Math.ceil(count / cols) * ROW_H) / 2);

      const nodeIds = [];
      selectedItems.forEach((it, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const nx = startX + (col * COL_W);
        const ny = startY + (row * ROW_H);

        if (importField === 'both_nodes') {
          const primaryLabel = (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.getItemText === 'function')
            ? UniversalImporter.getItemText(it, 'title', nameDisplayMode)
            : (it.title || 'Item');
          const secondaryLabel = it.subtitle || primaryLabel;

          const nid1 = addWordFn(primaryLabel, nx, ny);
          const nid2 = addWordFn(secondaryLabel, nx + 130, ny);
          if (nid1) {
            nodeIds.push(nid1);
            if (typeof conNodes !== 'undefined') {
              const nodeObj1 = conNodes.find(n => n && n.id === nid1);
              if (nodeObj1) {
                nodeObj1.urn = it.urn;
                nodeObj1.subType = it.subType;
                nodeObj1.domain = it.domain;
                if (nodeObj1.el && it.urn) nodeObj1.el.setAttribute('data-urn', it.urn);
              }
            }
          }
          if (nid2) {
            nodeIds.push(nid2);
            if (typeof conNodes !== 'undefined') {
              const nodeObj2 = conNodes.find(n => n && n.id === nid2);
              if (nodeObj2) {
                nodeObj2.urn = it.urn ? `${it.urn}#details` : '';
                nodeObj2.subType = it.subType;
                nodeObj2.domain = it.domain;
                if (nodeObj2.el && nodeObj2.urn) nodeObj2.el.setAttribute('data-urn', nodeObj2.urn);
              }
            }
          }
          if (nid1 && nid2 && typeof conCreateEdge === 'function') {
            conCreateEdge(nid1, nid2);
          }
        } else {
          const nodeText = (typeof UniversalImporter !== 'undefined' && typeof UniversalImporter.getItemText === 'function')
            ? UniversalImporter.getItemText(it, importField, nameDisplayMode)
            : (it.title || 'Item');
          const nid = addWordFn(nodeText, nx, ny);
          if (nid) {
            nodeIds.push(nid);
            if (typeof conNodes !== 'undefined') {
              const nodeObj = conNodes.find(n => n && n.id === nid);
              if (nodeObj) {
                nodeObj.urn = it.urn;
                nodeObj.subType = it.subType;
                nodeObj.domain = it.domain;
                if (nodeObj.el && it.urn) nodeObj.el.setAttribute('data-urn', it.urn);
              }
            }
          }
        }
      });

      if (importField === 'both_nodes' && typeof conRedrawEdges === 'function') {
        conRedrawEdges();
      }

      if (meta.domain === 'class' && nodeIds.length > 0 && typeof conGroupCreate === 'function') {
        const group = conGroupCreate(nodeIds, startX - 10, startY - 10);
        if (group) {
          group.title = `${selectedItems[0]?.subtitle || 'Class'} — Roster`;
          if (typeof conGroupRefit === 'function') conGroupRefit(group);
          if (typeof conGroupApplyStyle === 'function') conGroupApplyStyle(group);
        }
      }

      if (typeof showToast === 'function') {
        showToast(`Imported ${selectedItems.length} items onto the board.`);
      }
    };

    window.conOpenLearningImportModal = async function (initialTab = 'quizzes') {
      const subType = initialTab === 'vocab' ? 'wordbanks' : (initialTab === 'grammar' ? 'grammarbanks' : 'quizzes');
      conOpenUniversalImportModal('learning', subType);
    };

    window.conCloseLearningImportModal = function () {
      const overlay = document.getElementById('con-learning-import-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    };

    window.conSwitchLearningTab = function (tabName) {
      const validTabs = ['quizzes', 'vocab', 'grammar'];
      _conActiveLearningTab = validTabs.includes(tabName) ? tabName : 'quizzes';

      // Update tab buttons appearance (Light Neobrutalist styling)
      const tabs = [
        { id: 'con-ltab-quizzes', key: 'quizzes' },
        { id: 'con-ltab-vocab', key: 'vocab' },
        { id: 'con-ltab-grammar', key: 'grammar' }
      ];

      tabs.forEach(t => {
        const btn = document.getElementById(t.id);
        if (!btn) return;
        if (t.key === _conActiveLearningTab) {
          btn.classList.add('active');
          btn.style.background = '#ffffff';
          btn.style.color = '#111111';
          btn.style.fontWeight = '900';
          btn.style.borderBottom = '2px solid #ffffff';
        } else {
          btn.classList.remove('active');
          btn.style.background = '#e5e5dc';
          btn.style.color = '#444444';
          btn.style.fontWeight = '800';
          btn.style.borderBottom = '2px solid #333333';
        }
      });

      // Show active pane and hide others
      const panes = [
        { id: 'con-learning-pane-quizzes', key: 'quizzes' },
        { id: 'con-learning-pane-vocab', key: 'vocab' },
        { id: 'con-learning-pane-grammar', key: 'grammar' }
      ];

      panes.forEach(p => {
        const el = document.getElementById(p.id);
        if (!el) return;
        el.style.display = (p.key === _conActiveLearningTab) ? 'flex' : 'none';
      });

      // Refresh contents of active tab
      if (_conActiveLearningTab === 'quizzes' && typeof conRefreshQuizTab === 'function') {
        conRefreshQuizTab();
      } else if (_conActiveLearningTab === 'vocab' && typeof conRefreshVocabTab === 'function') {
        conRefreshVocabTab();
      } else if (_conActiveLearningTab === 'grammar' && typeof conRefreshGrammarTab === 'function') {
        conRefreshGrammarTab();
      }

      conUpdateLearningTotalSelected();
    };

    window.conUpdateLearningTotalSelected = function () {
      const totalEl = document.getElementById('con-learning-total-selected');
      if (!totalEl) return;

      let count = 0;
      if (_conActiveLearningTab === 'quizzes') {
        count = _conSelectedQuizQuestions.size;
      } else if (_conActiveLearningTab === 'vocab') {
        count = _conSelectedVocabWords.size;
      } else if (_conActiveLearningTab === 'grammar') {
        count = _conSelectedGrammarItems.size;
      }

      if (typeof i18n !== 'undefined' && typeof i18n.t === 'function') {
        totalEl.textContent = i18n.t('boardSelectedCount').replace('{count}', count);
      } else {
        totalEl.textContent = `${count} selected`;
      }
    };

    // =========================================================================
    // PART 3: QUIZZES TAB CONTROLLER & DYNAMIC FILTERS
    // =========================================================================
    window.conRefreshQuizTab = function () {
      const setSelect = document.getElementById('con-lquiz-set-select');
      const levelSelect = document.getElementById('con-lquiz-level-select');
      const themeSelect = document.getElementById('con-lquiz-theme-select');
      if (!setSelect || !levelSelect || !themeSelect) return;

      const quizSets = (window._boardLearningBanks && window._boardLearningBanks.quizzes) || [];
      const curSetVal = setSelect.value || 'all';
      const allQzLabel = (window.i18n ? i18n.t('boardFilterAllQuizzes') : null) || 'All Quiz Sets';
      setSelect.innerHTML = '<option value="all">' + boardEscapeHtml(allQzLabel) + ' (' + ((window.quizBank && window.quizBank.length) || 0) + ')</option>';
      quizSets.forEach(qs => {
        const opt = document.createElement('option');
        opt.value = qs.filename;
        opt.textContent = `${qs.title || qs.filename} (${qs.count || 0})`;
        setSelect.appendChild(opt);
      });
      if (quizSets.some(qs => qs.filename === curSetVal)) {
        setSelect.value = curSetVal;
      }

      const allQuizzes = window.quizBank || [];
      const levels = new Set();
      const themes = new Set();
      allQuizzes.forEach(q => {
        if (q.level || q.cefr) levels.add(String(q.level || q.cefr).trim().toUpperCase());
        if (q.theme || q.category) themes.add(String(q.theme || q.category).trim());
      });

      const curLevel = levelSelect.value || '';
      const allLvlLabel = (window.i18n ? i18n.t('boardFilterAllLevels') : null) || 'All Levels';
      levelSelect.innerHTML = '<option value="">' + boardEscapeHtml(allLvlLabel) + '</option>';
      Array.from(levels).sort().forEach(lvl => {
        const opt = document.createElement('option');
        opt.value = lvl;
        opt.textContent = lvl;
        levelSelect.appendChild(opt);
      });
      levelSelect.value = curLevel;

      const curTheme = themeSelect.value || '';
      const allThmLabel = (window.i18n ? i18n.t('boardFilterAllThemes') : null) || 'All Themes';
      themeSelect.innerHTML = '<option value="">' + boardEscapeHtml(allThmLabel) + '</option>';
      Array.from(themes).sort((a, b) => a.localeCompare(b)).forEach(thm => {
        const opt = document.createElement('option');
        opt.value = thm;
        opt.textContent = thm;
        themeSelect.appendChild(opt);
      });
      themeSelect.value = curTheme;

      _conQuizDisplayLimit = 100;
      conRefreshQuizTabList();
    };

    window.conShowMoreQuizItems = function () {
      _conQuizDisplayLimit += 100;
      conRefreshQuizTabList();
    };

    window.conRefreshQuizTabList = function () {
      const listEl = document.getElementById('con-lquiz-items-list');
      const counterEl = document.getElementById('con-lquiz-counter');
      const setSelect = document.getElementById('con-lquiz-set-select');
      const levelSelect = document.getElementById('con-lquiz-level-select');
      const themeSelect = document.getElementById('con-lquiz-theme-select');
      const searchInput = document.getElementById('con-lquiz-search-input');
      if (!listEl) return;

      const setFilter = setSelect ? setSelect.value : 'all';
      const levelFilter = (levelSelect ? levelSelect.value : '').toLowerCase();
      const themeFilter = (themeSelect ? themeSelect.value : '').toLowerCase();
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

      let questions = window.quizBank || [];
      if (setFilter !== 'all') {
        questions = questions.filter(q => q.fileSet === setFilter);
      }
      if (levelFilter) {
        questions = questions.filter(q => String(q.level || q.cefr || '').toLowerCase() === levelFilter);
      }
      if (themeFilter) {
        questions = questions.filter(q => String(q.theme || q.category || '').toLowerCase() === themeFilter);
      }
      if (query) {
        questions = questions.filter(q => {
          const qText = String(q.question || '').toLowerCase();
          const opts = Array.isArray(q.options) ? q.options.join(' ').toLowerCase() : '';
          const exp = String(q.explanation || '').toLowerCase();
          return qText.includes(query) || opts.includes(query) || exp.includes(query);
        });
      }

      _conLastFilteredQuizCount = questions.length;

      if (counterEl) {
        counterEl.textContent = `${questions.length} questions available (${_conSelectedQuizQuestions.size} selected)`;
      }

      if (questions.length === 0) {
        const noItemsTxt = (window.i18n ? i18n.t('boardNoItemsFound') : null) || 'No matching records found.';
        listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-weight:700;font-size:0.85rem;">' + boardEscapeHtml(noItemsTxt) + '</div>';
        return;
      }

      const visibleQuestions = questions.slice(0, _conQuizDisplayLimit);
      let html = '';
      visibleQuestions.forEach((q, idx) => {
        const qId = q.id || `quiz_q_${idx}`;
        const isChecked = _conSelectedQuizQuestions.has(qId);
        const lvl = q.level || q.cefr || '';
        const thm = q.theme || q.category || '';
        const opts = Array.isArray(q.options) ? q.options : (Array.isArray(q.answers) ? q.answers : []);
        const ans = q.correctIndex !== undefined ? q.correctIndex : q.answer;

        html += `
          <div class="con-litem-card" data-qid="${boardEscapeHtml(qId)}" style="display:flex; gap:10px; padding:8px 10px; background:#ffffff; border:1.5px solid ${isChecked ? '#2563eb' : '#cbd5e1'}; border-radius:6px; align-items:flex-start; cursor:pointer; transition:border-color 0.15s ease;" onclick="conToggleQuizItem('${boardEscapeHtml(qId)}')">
            <input type="checkbox" style="margin-top:3px; cursor:pointer;" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); conToggleQuizItem('${boardEscapeHtml(qId)}')" />
            <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                <span style="font-weight:800; font-size:0.85rem; color:#1e293b;">${boardEscapeHtml(q.question || '')}</span>
                <div style="display:flex; gap:4px; flex-shrink:0;">
                  ${lvl ? `<span style="padding:1px 5px; font-size:0.7rem; font-weight:800; background:#f1f5f9; border:1px solid #94a3b8; border-radius:4px; color:#334155;">${boardEscapeHtml(lvl)}</span>` : ''}
                  ${thm ? `<span style="padding:1px 5px; font-size:0.7rem; font-weight:800; background:#eff6ff; border:1px solid #93c5fd; border-radius:4px; color:#1d4ed8;">${boardEscapeHtml(thm)}</span>` : ''}
                </div>
              </div>
              ${opts.length > 0 ? `
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;">
                  ${opts.map((opt, optIdx) => {
                    const isCorrect = (ans === optIdx || ans === opt || (Array.isArray(ans) && (ans.includes(optIdx) || ans.includes(opt))));
                    return `<span style="font-size:0.72rem; padding:1px 6px; border-radius:4px; border:1px solid ${isCorrect ? '#86efac' : '#e2e8f0'}; background:${isCorrect ? '#dcfce7' : '#f8fafc'}; color:${isCorrect ? '#15803d' : '#475569'}; font-weight:${isCorrect ? '800' : '600'};">${boardEscapeHtml(opt)}</span>`;
                  }).join('')}
                </div>
              ` : ''}
              ${q.explanation ? `<div style="font-size:0.72rem; color:#64748b; font-style:italic; margin-top:2px;">${boardEscapeHtml(q.explanation)}</div>` : ''}
            </div>
          </div>
        `;
      });

      if (questions.length > _conQuizDisplayLimit) {
        const showMoreTxt = (window.i18n ? i18n.t('boardShowMoreBtn') : null) || 'Show More (+100)';
        html += `
          <div style="padding:10px; text-align:center; background:#f1f5f9; border:1.5px dashed #cbd5e1; border-radius:6px; margin-top:4px;">
            <span style="font-size:0.8rem; font-weight:700; color:#475569; margin-right:10px;">Showing ${_conQuizDisplayLimit} / ${questions.length}</span>
            <button type="button" class="action-btn btn-grey" onclick="conShowMoreQuizItems()" style="padding:3px 10px; font-size:0.75rem; font-weight:800; border-radius:4px; border:1.5px solid #333333; cursor:pointer;">${boardEscapeHtml(showMoreTxt)}</button>
          </div>
        `;
      }

      listEl.innerHTML = html;
    };

    let _conQuizSearchTimer = null;
    window.conDebouncedRefreshQuizTabList = function () {
      clearTimeout(_conQuizSearchTimer);
      _conQuizSearchTimer = setTimeout(() => {
        _conQuizDisplayLimit = 100;
        conRefreshQuizTabList();
      }, 180);
    };

    window.conToggleQuizItem = function (qId) {
      if (_conSelectedQuizQuestions.has(qId)) {
        _conSelectedQuizQuestions.delete(qId);
      } else {
        _conSelectedQuizQuestions.add(qId);
      }
      const isChecked = _conSelectedQuizQuestions.has(qId);
      const card = document.querySelector(`.con-litem-card[data-qid="${boardEscapeHtml(qId)}"]`);
      if (card) {
        card.style.borderColor = isChecked ? '#2563eb' : '#cbd5e1';
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isChecked;
      }
      const counterEl = document.getElementById('con-lquiz-counter');
      if (counterEl) {
        counterEl.textContent = `${_conLastFilteredQuizCount} questions available (${_conSelectedQuizQuestions.size} selected)`;
      }
      conUpdateLearningTotalSelected();
    };

    window.conQuizSelectAll = function (selectAll) {
      const setSelect = document.getElementById('con-lquiz-set-select');
      const levelSelect = document.getElementById('con-lquiz-level-select');
      const themeSelect = document.getElementById('con-lquiz-theme-select');
      const searchInput = document.getElementById('con-lquiz-search-input');

      const setFilter = setSelect ? setSelect.value : 'all';
      const levelFilter = (levelSelect ? levelSelect.value : '').toLowerCase();
      const themeFilter = (themeSelect ? themeSelect.value : '').toLowerCase();
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

      let questions = window.quizBank || [];
      if (setFilter !== 'all') questions = questions.filter(q => q.fileSet === setFilter);
      if (levelFilter) questions = questions.filter(q => String(q.level || q.cefr || '').toLowerCase() === levelFilter);
      if (themeFilter) questions = questions.filter(q => String(q.theme || q.category || '').toLowerCase() === themeFilter);
      if (query) {
        questions = questions.filter(q => {
          const qText = String(q.question || '').toLowerCase();
          const opts = Array.isArray(q.options) ? q.options.join(' ').toLowerCase() : '';
          const exp = String(q.explanation || '').toLowerCase();
          return qText.includes(query) || opts.includes(query) || exp.includes(query);
        });
      }

      questions.forEach((q, idx) => {
        const qId = q.id || `quiz_q_${idx}`;
        if (selectAll) {
          _conSelectedQuizQuestions.add(qId);
        } else {
          _conSelectedQuizQuestions.delete(qId);
        }
      });

      document.querySelectorAll('#con-lquiz-items-list .con-litem-card').forEach(card => {
        const qId = card.getAttribute('data-qid');
        const isChecked = _conSelectedQuizQuestions.has(qId);
        card.style.borderColor = isChecked ? '#2563eb' : '#cbd5e1';
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isChecked;
      });

      const counterEl = document.getElementById('con-lquiz-counter');
      if (counterEl) {
        counterEl.textContent = `${questions.length} questions available (${_conSelectedQuizQuestions.size} selected)`;
      }
      conUpdateLearningTotalSelected();
    };

    // =========================================================================
    // PART 4: VOCABULARY GAMES TAB CONTROLLER
    // =========================================================================
    let _conActiveVocabGameMode = 'match';

    window.conSetVocabGameMode = function (mode) {
      _conActiveVocabGameMode = mode;
      const btns = document.querySelectorAll('.con-lgame-mode-btn');
      btns.forEach(b => {
        if (b.dataset.game === mode) {
          b.classList.add('active');
          b.style.background = '#e0f2fe';
          b.style.color = '#0369a1';
          b.style.boxShadow = '2px 2px 0 #333333';
          b.style.border = '2px solid #333333';
        } else {
          b.classList.remove('active');
          b.style.background = '#ffffff';
          b.style.color = '#333333';
          b.style.boxShadow = 'none';
          b.style.border = '1.5px solid #333333';
        }
      });
    };

    window.conRefreshVocabTab = function () {
      const srcSelect = document.getElementById('con-lvocab-source-select');
      const levelSelect = document.getElementById('con-lvocab-level-select');
      const themeSelect = document.getElementById('con-lvocab-theme-select');
      const posSelect = document.getElementById('con-lvocab-pos-select');
      if (!srcSelect || !levelSelect || !themeSelect || !posSelect) return;

      const wordFiles = (window._boardLearningBanks && window._boardLearningBanks.wordbanks) || [];
      const curSrc = srcSelect.value || 'all';
      const allSrcLabel = (window.i18n ? i18n.t('boardFilterAllSources') : null) || 'All Sources';
      srcSelect.innerHTML = '<option value="all">' + boardEscapeHtml(allSrcLabel) + ' (' + ((window.vocabBank && window.vocabBank.length) || 0) + ')</option>';
      wordFiles.forEach(wf => {
        const opt = document.createElement('option');
        opt.value = wf.filename;
        opt.textContent = `${wf.title || wf.filename} (${wf.count || 0})`;
        srcSelect.appendChild(opt);
      });
      srcSelect.value = curSrc;

      const allWords = window.vocabBank || [];
      const levels = new Set();
      const themes = new Set();
      const posSet = new Set();

      allWords.forEach(w => {
        if (w.level || w.cefr) levels.add(String(w.level || w.cefr).trim().toUpperCase());
        if (w.theme || w.category) themes.add(String(w.theme || w.category).trim());
        if (w.pos || w.partOfSpeech) posSet.add(String(w.pos || w.partOfSpeech).trim().toLowerCase());
      });

      const curLvl = levelSelect.value || '';
      const allLvlLabelVocab = (window.i18n ? i18n.t('boardFilterAllLevels') : null) || 'All Levels';
      levelSelect.innerHTML = '<option value="">' + boardEscapeHtml(allLvlLabelVocab) + '</option>';
      Array.from(levels).sort().forEach(lvl => {
        const opt = document.createElement('option');
        opt.value = lvl;
        opt.textContent = lvl;
        levelSelect.appendChild(opt);
      });
      levelSelect.value = curLvl;

      const curThm = themeSelect.value || '';
      const allThmLabelVocab = (window.i18n ? i18n.t('boardFilterAllThemes') : null) || 'All Themes';
      themeSelect.innerHTML = '<option value="">' + boardEscapeHtml(allThmLabelVocab) + '</option>';
      Array.from(themes).sort((a, b) => a.localeCompare(b)).forEach(thm => {
        const opt = document.createElement('option');
        opt.value = thm;
        opt.textContent = thm;
        themeSelect.appendChild(opt);
      });
      themeSelect.value = curThm;

      const curPos = posSelect.value || '';
      const allPosLabel = (window.i18n ? i18n.t('boardFilterAllPos') : null) || 'All Types';
      posSelect.innerHTML = '<option value="">' + boardEscapeHtml(allPosLabel) + '</option>';
      Array.from(posSet).sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        posSelect.appendChild(opt);
      });
      posSelect.value = curPos;

      _conVocabDisplayLimit = 100;
      conRefreshVocabTabList();
    };

    window.conShowMoreVocabItems = function () {
      _conVocabDisplayLimit += 100;
      conRefreshVocabTabList();
    };

    window.conRefreshVocabTabList = function () {
      const listEl = document.getElementById('con-lvocab-items-list');
      const counterEl = document.getElementById('con-lvocab-counter');
      const srcSelect = document.getElementById('con-lvocab-source-select');
      const levelSelect = document.getElementById('con-lvocab-level-select');
      const themeSelect = document.getElementById('con-lvocab-theme-select');
      const posSelect = document.getElementById('con-lvocab-pos-select');
      const searchInput = document.getElementById('con-lvocab-search-input');
      if (!listEl) return;

      const srcFilter = srcSelect ? srcSelect.value : 'all';
      const levelFilter = (levelSelect ? levelSelect.value : '').toLowerCase();
      const themeFilter = (themeSelect ? themeSelect.value : '').toLowerCase();
      const posFilter = (posSelect ? posSelect.value : '').toLowerCase();
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

      let words = window.vocabBank || [];
      if (srcFilter !== 'all') words = words.filter(w => w.fileSet === srcFilter || w._source === srcFilter);
      if (levelFilter) words = words.filter(w => String(w.level || w.cefr || '').toLowerCase() === levelFilter);
      if (themeFilter) words = words.filter(w => String(w.theme || w.category || '').toLowerCase() === themeFilter);
      if (posFilter) words = words.filter(w => String(w.pos || w.partOfSpeech || '').toLowerCase() === posFilter);
      if (query) {
        words = words.filter(w => {
          const wText = String(w.word || '').toLowerCase();
          const tr = String(w.translation || w.trad || w.french || '').toLowerCase();
          const def = String(w.definition || w.def || '').toLowerCase();
          return wText.includes(query) || tr.includes(query) || def.includes(query);
        });
      }

      _conLastFilteredVocabCount = words.length;

      if (counterEl) {
        counterEl.textContent = `${words.length} words available (${_conSelectedVocabWords.size} selected)`;
      }

      if (words.length === 0) {
        const noItemsTxt = (window.i18n ? i18n.t('boardNoItemsFound') : null) || 'No matching records found.';
        listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-weight:700;font-size:0.85rem;">' + boardEscapeHtml(noItemsTxt) + '</div>';
        return;
      }

      const visibleWords = words.slice(0, _conVocabDisplayLimit);
      let html = '';
      visibleWords.forEach((w, idx) => {
        const wId = w.id || w.word || `vocab_${idx}`;
        const isChecked = _conSelectedVocabWords.has(wId);
        const lvl = w.level || w.cefr || '';
        const thm = w.theme || w.category || '';
        const pos = w.pos || w.partOfSpeech || '';
        const ipa = w.phonetic || w.ipa || '';
        const tr = w.translation || w.trad || (Array.isArray(w.french) ? w.french.join(', ') : w.french) || '';
        const def = w.definition || (Array.isArray(w.def) ? w.def[0] : w.def) || '';

        html += `
          <div class="con-litem-card" data-wid="${boardEscapeHtml(wId)}" style="display:flex; gap:10px; padding:8px 10px; background:#ffffff; border:1.5px solid ${isChecked ? '#0284c7' : '#cbd5e1'}; border-radius:6px; align-items:flex-start; cursor:pointer; transition:border-color 0.15s ease;" onclick="conToggleVocabItem('${boardEscapeHtml(wId)}')">
            <input type="checkbox" style="margin-top:3px; cursor:pointer;" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); conToggleVocabItem('${boardEscapeHtml(wId)}')" />
            <div style="flex:1; display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                <div style="display:flex; align-items:baseline; gap:8px;">
                  <span style="font-weight:900; font-size:0.9rem; color:#0f172a;">${boardEscapeHtml(w.word || '')}</span>
                  ${ipa ? `<span style="font-family:monospace; font-size:0.75rem; color:#64748b;">/${boardEscapeHtml(ipa)}/</span>` : ''}
                  ${tr ? `<span style="font-size:0.8rem; font-weight:700; color:#0369a1;">(${boardEscapeHtml(tr)})</span>` : ''}
                </div>
                <div style="display:flex; gap:4px; flex-shrink:0;">
                  ${pos ? `<span style="padding:1px 5px; font-size:0.68rem; font-weight:800; background:#f1f5f9; border:1px solid #94a3b8; border-radius:4px; color:#475569;">${boardEscapeHtml(pos)}</span>` : ''}
                  ${lvl ? `<span style="padding:1px 5px; font-size:0.68rem; font-weight:800; background:#fef9c3; border:1px solid #ca8a04; border-radius:4px; color:#854d0e;">${boardEscapeHtml(lvl)}</span>` : ''}
                  ${thm ? `<span style="padding:1px 5px; font-size:0.68rem; font-weight:800; background:#f0fdf4; border:1px solid #86efac; border-radius:4px; color:#166534;">${boardEscapeHtml(thm)}</span>` : ''}
                </div>
              </div>
              ${def ? `<div style="font-size:0.75rem; color:#475569; margin-top:1px;">${boardEscapeHtml(def)}</div>` : ''}
            </div>
          </div>
        `;
      });

      if (words.length > _conVocabDisplayLimit) {
        const showMoreTxt = (window.i18n ? i18n.t('boardShowMoreBtn') : null) || 'Show More (+100)';
        html += `
          <div style="padding:10px; text-align:center; background:#f1f5f9; border:1.5px dashed #cbd5e1; border-radius:6px; margin-top:4px;">
            <span style="font-size:0.8rem; font-weight:700; color:#475569; margin-right:10px;">Showing ${_conVocabDisplayLimit} / ${words.length}</span>
            <button type="button" class="action-btn btn-grey" onclick="conShowMoreVocabItems()" style="padding:3px 10px; font-size:0.75rem; font-weight:800; border-radius:4px; border:1.5px solid #333333; cursor:pointer;">${boardEscapeHtml(showMoreTxt)}</button>
          </div>
        `;
      }

      listEl.innerHTML = html;
    };

    let _conVocabSearchTimer = null;
    window.conDebouncedRefreshVocabTabList = function () {
      clearTimeout(_conVocabSearchTimer);
      _conVocabSearchTimer = setTimeout(() => {
        _conVocabDisplayLimit = 100;
        conRefreshVocabTabList();
      }, 180);
    };

    window.conToggleVocabItem = function (wId) {
      if (_conSelectedVocabWords.has(wId)) {
        _conSelectedVocabWords.delete(wId);
      } else {
        _conSelectedVocabWords.add(wId);
      }
      const isChecked = _conSelectedVocabWords.has(wId);
      const card = document.querySelector(`.con-litem-card[data-wid="${boardEscapeHtml(wId)}"]`);
      if (card) {
        card.style.borderColor = isChecked ? '#0284c7' : '#cbd5e1';
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isChecked;
      }
      const counterEl = document.getElementById('con-lvocab-counter');
      if (counterEl) {
        counterEl.textContent = `${_conLastFilteredVocabCount} words available (${_conSelectedVocabWords.size} selected)`;
      }
      conUpdateLearningTotalSelected();
    };

    window.conVocabSelectAll = function (selectAll) {
      const srcSelect = document.getElementById('con-lvocab-source-select');
      const levelSelect = document.getElementById('con-lvocab-level-select');
      const themeSelect = document.getElementById('con-lvocab-theme-select');
      const posSelect = document.getElementById('con-lvocab-pos-select');
      const searchInput = document.getElementById('con-lvocab-search-input');

      const srcFilter = srcSelect ? srcSelect.value : 'all';
      const levelFilter = (levelSelect ? levelSelect.value : '').toLowerCase();
      const themeFilter = (themeSelect ? themeSelect.value : '').toLowerCase();
      const posFilter = (posSelect ? posSelect.value : '').toLowerCase();
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

      let words = window.vocabBank || [];
      if (srcFilter !== 'all') words = words.filter(w => w.fileSet === srcFilter || w._source === srcFilter);
      if (levelFilter) words = words.filter(w => String(w.level || w.cefr || '').toLowerCase() === levelFilter);
      if (themeFilter) words = words.filter(w => String(w.theme || w.category || '').toLowerCase() === themeFilter);
      if (posFilter) words = words.filter(w => String(w.pos || w.partOfSpeech || '').toLowerCase() === posFilter);
      if (query) {
        words = words.filter(w => {
          const wText = String(w.word || '').toLowerCase();
          const tr = String(w.translation || w.trad || w.french || '').toLowerCase();
          const def = String(w.definition || w.def || '').toLowerCase();
          return wText.includes(query) || tr.includes(query) || def.includes(query);
        });
      }

      words.forEach((w, idx) => {
        const wId = w.id || w.word || `vocab_${idx}`;
        if (selectAll) {
          _conSelectedVocabWords.add(wId);
        } else {
          _conSelectedVocabWords.delete(wId);
        }
      });

      document.querySelectorAll('#con-lvocab-items-list .con-litem-card').forEach(card => {
        const wId = card.getAttribute('data-wid');
        const isChecked = _conSelectedVocabWords.has(wId);
        card.style.borderColor = isChecked ? '#0284c7' : '#cbd5e1';
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isChecked;
      });

      const counterEl = document.getElementById('con-lvocab-counter');
      if (counterEl) {
        counterEl.textContent = `${words.length} words available (${_conSelectedVocabWords.size} selected)`;
      }
      conUpdateLearningTotalSelected();
    };

    // =========================================================================
    // PART 5: GRAMMAR & LANGUAGE TOOLS TAB CONTROLLER
    // =========================================================================
    let _conActiveGrammarTool = 'sentence';

    window.conSetGrammarTool = function (tool) {
      _conActiveGrammarTool = tool;
      const btns = document.querySelectorAll('.con-lgrammar-tool-btn');
      btns.forEach(b => {
        if (b.dataset.tool === tool) {
          b.classList.add('active');
          b.style.background = '#fef3c7';
          b.style.color = '#92400e';
          b.style.boxShadow = '2px 2px 0 #333333';
          b.style.border = '2px solid #333333';
        } else {
          b.classList.remove('active');
          b.style.background = '#ffffff';
          b.style.color = '#333333';
          b.style.boxShadow = 'none';
          b.style.border = '1.5px solid #333333';
        }
      });
      conRefreshGrammarTab();
    };

    function conGetActiveGrammarBank() {
      switch (_conActiveGrammarTool) {
        case 'sentence': return window.orderSentences || [];
        case 'gapfill': return window.gapFillBank || [];
        case 'error': return window.errorBank || [];
        case 'dictation': return window.dictationBank || [];
        case 'order': return window.orderSentences || [];
        case 'quote': return window.quoteBank || [];
        case 'werewolf': return window.chooseStoryBank || [];
        default: return window.grammarData || [];
      }
    }

    window.conRefreshGrammarTab = function () {
      const levelSelect = document.getElementById('con-lgrammar-level-select');
      const themeSelect = document.getElementById('con-lgrammar-theme-select');
      if (!levelSelect || !themeSelect) return;

      const bank = conGetActiveGrammarBank();
      const levels = new Set();
      const themes = new Set();

      bank.forEach(item => {
        if (item.level || item.cefr) levels.add(String(item.level || item.cefr).trim().toUpperCase());
        if (item.theme || item.category) themes.add(String(item.theme || item.category).trim());
      });

      const curLvl = levelSelect.value || '';
      const allLvlLabelGrammar = (window.i18n ? i18n.t('boardFilterAllLevels') : null) || 'All Levels';
      levelSelect.innerHTML = '<option value="">' + boardEscapeHtml(allLvlLabelGrammar) + '</option>';
      Array.from(levels).sort().forEach(lvl => {
        const opt = document.createElement('option');
        opt.value = lvl;
        opt.textContent = lvl;
        levelSelect.appendChild(opt);
      });
      levelSelect.value = curLvl;

      const curThm = themeSelect.value || '';
      const allThmLabelGrammar = (window.i18n ? i18n.t('boardFilterAllThemes') : null) || 'All Themes';
      themeSelect.innerHTML = '<option value="">' + boardEscapeHtml(allThmLabelGrammar) + '</option>';
      Array.from(themes).sort((a, b) => a.localeCompare(b)).forEach(thm => {
        const opt = document.createElement('option');
        opt.value = thm;
        opt.textContent = thm;
        themeSelect.appendChild(opt);
      });
      themeSelect.value = curThm;

      _conGrammarDisplayLimit = 100;
      conRefreshGrammarTabList();
    };

    window.conShowMoreGrammarItems = function () {
      _conGrammarDisplayLimit += 100;
      conRefreshGrammarTabList();
    };

    window.conRefreshGrammarTabList = function () {
      const listEl = document.getElementById('con-lgrammar-items-list');
      const counterEl = document.getElementById('con-lgrammar-counter');
      const levelSelect = document.getElementById('con-lgrammar-level-select');
      const themeSelect = document.getElementById('con-lgrammar-theme-select');
      const searchInput = document.getElementById('con-lgrammar-search-input');
      if (!listEl) return;

      const levelFilter = (levelSelect ? levelSelect.value : '').toLowerCase();
      const themeFilter = (themeSelect ? themeSelect.value : '').toLowerCase();
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

      let items = conGetActiveGrammarBank();
      if (levelFilter) items = items.filter(i => String(i.level || i.cefr || '').toLowerCase() === levelFilter);
      if (themeFilter) items = items.filter(i => String(i.theme || i.category || '').toLowerCase() === themeFilter);
      if (query) {
        items = items.filter(i => {
          const text = String(i.text || i.sentence || i.quote || i.original || i.title || i.prompt || '').toLowerCase();
          const ans = String(i.correction || (Array.isArray(i.answers) ? i.answers.join(' ') : (i.author || ''))).toLowerCase();
          return text.includes(query) || ans.includes(query);
        });
      }

      _conLastFilteredGrammarCount = items.length;

      if (counterEl) {
        counterEl.textContent = `${items.length} items available (${_conSelectedGrammarItems.size} selected)`;
      }

      if (items.length === 0) {
        const noItemsTxt = (window.i18n ? i18n.t('boardNoItemsFound') : null) || 'No matching records found.';
        listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-weight:700;font-size:0.85rem;">' + boardEscapeHtml(noItemsTxt) + '</div>';
        return;
      }

      const visibleItems = items.slice(0, _conGrammarDisplayLimit);
      let html = '';
      visibleItems.forEach((item, idx) => {
        const itemId = item.id || `grammar_${_conActiveGrammarTool}_${idx}`;
        const isChecked = _conSelectedGrammarItems.has(itemId);
        const lvl = item.level || item.cefr || '';
        const thm = item.theme || item.category || '';
        const mainText = item.text || item.sentence || item.quote || item.original || item.title || item.prompt || `Item #${idx + 1}`;
        const subText = item.correction || item.author || (Array.isArray(item.answers) ? `Answers: ${item.answers.join(', ')}` : (item.explanation || ''));

        html += `
          <div class="con-litem-card" data-gid="${boardEscapeHtml(itemId)}" style="display:flex; gap:10px; padding:8px 10px; background:#ffffff; border:1.5px solid ${isChecked ? '#d97706' : '#cbd5e1'}; border-radius:6px; align-items:flex-start; cursor:pointer; transition:border-color 0.15s ease;" onclick="conToggleGrammarItem('${boardEscapeHtml(itemId)}')">
            <input type="checkbox" style="margin-top:3px; cursor:pointer;" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); conToggleGrammarItem('${boardEscapeHtml(itemId)}')" />
            <div style="flex:1; display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                <span style="font-weight:800; font-size:0.85rem; color:#1e293b;">${boardEscapeHtml(mainText)}</span>
                <div style="display:flex; gap:4px; flex-shrink:0;">
                  ${lvl ? `<span style="padding:1px 5px; font-size:0.68rem; font-weight:800; background:#fef3c7; border:1px solid #f59e0b; border-radius:4px; color:#92400e;">${boardEscapeHtml(lvl)}</span>` : ''}
                  ${thm ? `<span style="padding:1px 5px; font-size:0.68rem; font-weight:800; background:#f1f5f9; border:1px solid #94a3b8; border-radius:4px; color:#334155;">${boardEscapeHtml(thm)}</span>` : ''}
                </div>
              </div>
              ${subText ? `<div style="font-size:0.75rem; color:#475569; font-style:italic;">${boardEscapeHtml(subText)}</div>` : ''}
            </div>
          </div>
        `;
      });

      if (items.length > _conGrammarDisplayLimit) {
        const showMoreTxt = (window.i18n ? i18n.t('boardShowMoreBtn') : null) || 'Show More (+100)';
        html += `
          <div style="padding:10px; text-align:center; background:#f1f5f9; border:1.5px dashed #cbd5e1; border-radius:6px; margin-top:4px;">
            <span style="font-size:0.8rem; font-weight:700; color:#475569; margin-right:10px;">Showing ${_conGrammarDisplayLimit} / ${items.length}</span>
            <button type="button" class="action-btn btn-grey" onclick="conShowMoreGrammarItems()" style="padding:3px 10px; font-size:0.75rem; font-weight:800; border-radius:4px; border:1.5px solid #333333; cursor:pointer;">${boardEscapeHtml(showMoreTxt)}</button>
          </div>
        `;
      }

      listEl.innerHTML = html;
    };

    let _conGrammarSearchTimer = null;
    window.conDebouncedRefreshGrammarTabList = function () {
      clearTimeout(_conGrammarSearchTimer);
      _conGrammarSearchTimer = setTimeout(() => {
        _conGrammarDisplayLimit = 100;
        conRefreshGrammarTabList();
      }, 180);
    };

    window.conToggleGrammarItem = function (itemId) {
      if (_conSelectedGrammarItems.has(itemId)) {
        _conSelectedGrammarItems.delete(itemId);
      } else {
        _conSelectedGrammarItems.add(itemId);
      }
      const isChecked = _conSelectedGrammarItems.has(itemId);
      const card = document.querySelector(`.con-litem-card[data-gid="${boardEscapeHtml(itemId)}"]`);
      if (card) {
        card.style.borderColor = isChecked ? '#d97706' : '#cbd5e1';
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isChecked;
      }
      const counterEl = document.getElementById('con-lgrammar-counter');
      if (counterEl) {
        counterEl.textContent = `${_conLastFilteredGrammarCount} items available (${_conSelectedGrammarItems.size} selected)`;
      }
      conUpdateLearningTotalSelected();
    };

    window.conGrammarSelectAll = function (selectAll) {
      const levelSelect = document.getElementById('con-lgrammar-level-select');
      const themeSelect = document.getElementById('con-lgrammar-theme-select');
      const searchInput = document.getElementById('con-lgrammar-search-input');

      const levelFilter = (levelSelect ? levelSelect.value : '').toLowerCase();
      const themeFilter = (themeSelect ? themeSelect.value : '').toLowerCase();
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

      let items = conGetActiveGrammarBank();
      if (levelFilter) items = items.filter(i => String(i.level || i.cefr || '').toLowerCase() === levelFilter);
      if (themeFilter) items = items.filter(i => String(i.theme || i.category || '').toLowerCase() === themeFilter);
      if (query) {
        items = items.filter(i => {
          const text = String(i.text || i.sentence || i.quote || i.original || i.title || i.prompt || '').toLowerCase();
          const ans = String(i.correction || (Array.isArray(i.answers) ? i.answers.join(' ') : (i.author || ''))).toLowerCase();
          return text.includes(query) || ans.includes(query);
        });
      }

      items.forEach((item, idx) => {
        const itemId = item.id || `grammar_${_conActiveGrammarTool}_${idx}`;
        if (selectAll) {
          _conSelectedGrammarItems.add(itemId);
        } else {
          _conSelectedGrammarItems.delete(itemId);
        }
      });

      document.querySelectorAll('#con-lgrammar-items-list .con-litem-card').forEach(card => {
        const itemId = card.getAttribute('data-gid');
        const isChecked = _conSelectedGrammarItems.has(itemId);
        card.style.borderColor = isChecked ? '#d97706' : '#cbd5e1';
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isChecked;
      });

      const counterEl = document.getElementById('con-lgrammar-counter');
      if (counterEl) {
        counterEl.textContent = `${items.length} items available (${_conSelectedGrammarItems.size} selected)`;
      }
      conUpdateLearningTotalSelected();
    };

    // =========================================================================
    // PART 6 & 7: CANVAS FORMAT BUILDERS & ACTIVITY CONFIRMATION
    // =========================================================================
    function conGetVocabGameIcon(mode) {
      switch (mode) {
        case 'match': return 'match.svg';
        case 'hangman': return 'hangman.svg';
        case 'scramble': return 'scramble.svg';
        case 'wordquest': return 'search.svg';
        case 'phonetic': return 'ipa.svg';
        case 'synant': return 'syn.svg';
        case 'flashcards': return 'word-card.svg';
        case 'wordsearch': return 'wordsearch.svg';
        default: return 'book.svg';
      }
    }

    function conGetVocabGameTitle(mode) {
      switch (mode) {
        case 'match': return 'Definition Match';
        case 'hangman': return 'Hangman';
        case 'scramble': return 'Scrambled Word';
        case 'wordquest': return 'Word Quest';
        case 'phonetic': return 'Phonetics / IPA';
        case 'synant': return 'Synonyms & Antonyms';
        case 'flashcards': return 'Flash Cards';
        case 'wordsearch': return 'Word Search';
        default: return 'Vocabulary Game';
      }
    }

    function conGetGrammarToolIcon(tool) {
      switch (tool) {
        case 'sentence': return 'sentence.svg';
        case 'gapfill': return 'gapfill.svg';
        case 'error': return 'error.svg';
        case 'dictation': return 'dictation.svg';
        case 'order': return 'order.svg';
        case 'quote': return 'quote.svg';
        case 'werewolf': return 'werewolf.svg';
        default: return 'grammar.svg';
      }
    }

    function conGetGrammarToolTitle(tool) {
      switch (tool) {
        case 'sentence': return 'Sentence Builder';
        case 'gapfill': return 'Gap Fill';
        case 'error': return 'Find the Error';
        case 'dictation': return 'Dictation';
        case 'order': return 'Order Sentences';
        case 'quote': return 'Quote Analyser';
        case 'werewolf': return 'Werewolf Game';
        default: return 'Language Tool';
      }
    }

    window.conConfirmLearningImport = function () {
      const formatSelect = document.getElementById('con-learning-format-select');
      const format = formatSelect ? formatSelect.value : 'launcher';

      const activityType = _conActiveLearningTab; // 'quizzes' | 'vocab' | 'grammar'
      let subType = '';
      let title = '';
      let icon = '';
      let theme = '';
      let level = '';
      let selectedItems = [];

      if (activityType === 'quizzes') {
        subType = 'quiz';
        icon = 'quiz.svg';
        title = 'Classroom Quiz';
        const allQuizzes = window.quizBank || [];
        selectedItems = allQuizzes.filter((q, idx) => _conSelectedQuizQuestions.has(q.id || `quiz_q_${idx}`));
        if (selectedItems.length === 0) {
          if (typeof showToast === 'function') showToast('Please select at least one quiz question.', true);
          return;
        }
        theme = selectedItems[0].theme || selectedItems[0].category || '';
        level = selectedItems[0].level || selectedItems[0].cefr || '';
        if (theme) title = `Quiz: ${theme}`;
      } else if (activityType === 'vocab') {
        subType = _conActiveVocabGameMode;
        icon = conGetVocabGameIcon(subType);
        title = conGetVocabGameTitle(subType);
        const allWords = window.vocabBank || [];
        selectedItems = allWords.filter((w, idx) => _conSelectedVocabWords.has(w.id || w.word || `vocab_${idx}`));
        if (selectedItems.length === 0) {
          if (typeof showToast === 'function') showToast('Please select at least one vocabulary word.', true);
          return;
        }
        theme = selectedItems[0].theme || selectedItems[0].category || '';
        level = selectedItems[0].level || selectedItems[0].cefr || '';
        if (theme) title = `${conGetVocabGameTitle(subType)}: ${theme}`;
      } else if (activityType === 'grammar') {
        subType = _conActiveGrammarTool;
        icon = conGetGrammarToolIcon(subType);
        title = conGetGrammarToolTitle(subType);
        const allItems = conGetActiveGrammarBank();
        selectedItems = allItems.filter((item, idx) => _conSelectedGrammarItems.has(item.id || `grammar_${subType}_${idx}`));
        if (selectedItems.length === 0) {
          if (typeof showToast === 'function') showToast('Please select at least one grammar item.', true);
          return;
        }
        theme = selectedItems[0].theme || selectedItems[0].category || '';
        level = selectedItems[0].level || selectedItems[0].cefr || '';
        if (theme) title = `${conGetGrammarToolTitle(subType)}: ${theme}`;
      }

      const activityPayload = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        activityType,
        subType,
        title,
        icon,
        theme,
        level,
        items: selectedItems
      };

      if (format === 'launcher') {
        conCreateGameLauncherCard(activityPayload);
      } else if (format === 'mindmap') {
        conCreateGameMindmapCluster(activityPayload);
      } else if (format === 'note') {
        conCreateGameNoteChecklist(activityPayload);
      } else if (format === 'tray') {
        const wordLabels = selectedItems.map(it => it.word || it.question || it.sentence || it.quote || it.text || it.original || it.title || '').filter(Boolean);
        if (typeof conImportTrayOpen === 'function') {
          conImportTrayOpen(wordLabels);
        }
      }

      conCloseLearningImportModal();
      if (typeof showToast === 'function') {
        showToast(`Inserted "${title}" (${selectedItems.length} items)`);
      }
    };

    // Format 0: Visual Class Plan Card Generator (Interactive Floor Plan & Deep Link)
    function conCreateClassPlanCard(planPayload, targetX, targetY) {
      const board = document.getElementById('constellation-board');
      if (!board) return null;

      if (window.conPushUndo) window.conPushUndo();

      const x = (targetX != null) ? targetX : Math.max(40, Math.round(board.clientWidth / 2 - 220));
      const y = (targetY != null) ? targetY : Math.max(40, Math.round(board.clientHeight / 2 - 160));

      const nid = (typeof window.conGetNextNoteId === 'function') ? window.conGetNextNoteId() : ('cnn' + (conNoteNextId++));
      const plan = planPayload.plan || planPayload.rawPlan || planPayload.raw || planPayload;
      const rawCName = (planPayload.className || plan.className || 'Class').trim();
      const className = (typeof _cgDisplayName === 'function' ? _cgDisplayName(rawCName) : '') || rawCName;
      const planTitle = (planPayload.title || plan.name || plan.title || 'Seating Plan').trim();
      const layoutType = String(plan.layoutType || (plan.rows && plan.cols ? 'grid' : 'grid')).toLowerCase();

      // Index seats
      const seatMap = new Map();
      const assignedStudents = [];
      if (Array.isArray(plan.seats)) {
        plan.seats.forEach(s => {
          if (!s) return;
          if (s.seatId) seatMap.set(String(s.seatId), s);
          if (s.row !== undefined && s.col !== undefined) seatMap.set(`${s.row}:${s.col}`, s);
          const sName = (s.studentName || s.name || '').trim();
          if (sName) assignedStudents.push(sName);
        });
      }

      // Generate Floor Plan Layout HTML
      let floorPlanHtml = '';
      if (layoutType === 'ushape') {
        const w = Math.max(3, Math.min(10, Number(plan.uWidth) || 6));
        const d = Math.max(1, Math.min(6, Number(plan.uDepth) || 3));
        let topDesksHtml = '';
        for (let c = 0; c < w; c++) {
          const seat = seatMap.get(`top:${c}`);
          const sName = seat ? (seat.studentName || seat.name || '') : '';
          topDesksHtml += `<div class="cp-mini-desk ${sName ? 'occupied' : 'empty'}" title="${boardEscapeHtml(sName || `Top Desk ${c + 1}`)}">${boardEscapeHtml(sName || `D${c+1}`)}</div>`;
        }
        let sidesHtml = '';
        for (let r = 1; r <= d; r++) {
          const leftSeat = seatMap.get(`left:${r}`);
          const rightSeat = seatMap.get(`right:${r}`);
          const leftName = leftSeat ? (leftSeat.studentName || leftSeat.name || '') : '';
          const rightName = rightSeat ? (rightSeat.studentName || rightSeat.name || '') : '';
          sidesHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div class="cp-mini-desk ${leftName ? 'occupied' : 'empty'}" title="${boardEscapeHtml(leftName || `Left Desk ${r}`)}">${boardEscapeHtml(leftName || `L${r}`)}</div>
              <div style="flex:1; font-size:0.65rem; color:#94a3b8; text-align:center; font-style:italic;">— Aisle —</div>
              <div class="cp-mini-desk ${rightName ? 'occupied' : 'empty'}" title="${boardEscapeHtml(rightName || `Right Desk ${r}`)}">${boardEscapeHtml(rightName || `R${r}`)}</div>
            </div>
          `;
        }
        floorPlanHtml = `
          <div style="display:flex; flex-direction:column; gap:6px; background:#f8fafc; padding:8px; border-radius:6px; border:1.5px solid #cbd5e1;">
            <div style="display:grid; grid-template-columns:repeat(${w}, 1fr); gap:4px;">${topDesksHtml}</div>
            ${sidesHtml}
          </div>
        `;
      } else if (layoutType === 'pods') {
        const roomRows = Math.max(1, Math.min(4, Number(plan.roomRows) || 2));
        const roomCols = Math.max(1, Math.min(4, Number(plan.roomCols) || 3));
        const podRows = Math.max(1, Math.min(3, Number(plan.podRows) || 2));
        const podCols = Math.max(1, Math.min(3, Number(plan.podCols) || 2));
        let podsMatrixHtml = '';
        for (let pr = 0; pr < roomRows; pr++) {
          let podsRowHtml = '';
          for (let pc = 0; pc < roomCols; pc++) {
            let podDesksHtml = '';
            for (let r = 0; r < podRows; r++) {
              for (let c = 0; c < podCols; c++) {
                const seat = seatMap.get(`${pr}:${pc}:${r}:${c}`);
                const sName = seat ? (seat.studentName || seat.name || '') : '';
                podDesksHtml += `<div class="cp-mini-desk ${sName ? 'occupied' : 'empty'}" title="${boardEscapeHtml(sName || `Pod ${pr+1}.${pc+1}`)}">${boardEscapeHtml(sName || `P${pr+1}.${pc+1}`)}</div>`;
              }
            }
            podsRowHtml += `
              <div style="border:1.5px dashed #94a3b8; border-radius:5px; padding:4px; background:#ffffff; display:grid; grid-template-columns:repeat(${podCols}, 1fr); gap:3px;">
                ${podDesksHtml}
              </div>
            `;
          }
          podsMatrixHtml += `<div style="display:grid; grid-template-columns:repeat(${roomCols}, 1fr); gap:8px;">${podsRowHtml}</div>`;
        }
        floorPlanHtml = `
          <div style="display:flex; flex-direction:column; gap:8px; background:#f8fafc; padding:8px; border-radius:6px; border:1.5px solid #cbd5e1;">
            ${podsMatrixHtml}
          </div>
        `;
      } else {
        // Grid Layout (Default)
        const rows = Math.max(1, Math.min(10, Number(plan.rows) || 4));
        const cols = Math.max(1, Math.min(10, Number(plan.cols) || 5));
        let gridCellsHtml = '';
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const seat = seatMap.get(`${r}:${c}`);
            const sName = seat ? (seat.studentName || seat.name || '') : '';
            gridCellsHtml += `<div class="cp-mini-desk ${sName ? 'occupied' : 'empty'}" title="${boardEscapeHtml(sName || `Row ${r+1}, Col ${c+1}`)}">${boardEscapeHtml(sName || `D${r+1}.${c+1}`)}</div>`;
          }
        }
        floorPlanHtml = `
          <div style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:5px; background:#f8fafc; padding:8px; border-radius:6px; border:1.5px solid #cbd5e1;">
            ${gridCellsHtml}
          </div>
        `;
      }

      const totalSeatsCount = Array.isArray(plan.seats) ? plan.seats.length : (plan.rows && plan.cols ? plan.rows * plan.cols : assignedStudents.length);

      const cardHtml = `
        <div class="con-class-plan-widget" data-plan-id="${boardEscapeHtml(plan.id || '')}" style="display:flex; flex-direction:column; gap:8px; min-width:340px; max-width:480px; font-family:inherit; pointer-events:auto;">
          <style>
            .cp-mini-desk {
              padding: 4px 5px;
              font-size: 0.7rem;
              font-weight: 700;
              text-align: center;
              border-radius: 4px;
              border: 1.5px solid #333333;
              box-shadow: 1px 1px 0 #333333;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 100%;
            }
            .cp-mini-desk.occupied {
              background: #e0f2fe;
              color: #0369a1;
              font-weight: 800;
            }
            .cp-mini-desk.empty {
              background: #ffffff;
              color: #94a3b8;
              font-style: italic;
              border-color: #94a3b8;
              box-shadow: none;
            }
          </style>
          
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; border-bottom:2px solid #333333; padding-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="../assets/icons/class-plan.svg" class="btn-icon" alt="" style="width:22px; height:22px; margin:0;" />
              <div>
                <strong style="font-size:0.95rem; color:#111111; font-weight:900;">${boardEscapeHtml(planTitle)}</strong>
                ${className ? `<div style="font-size:0.75rem; font-weight:700; color:#475569;">${boardEscapeHtml(className)}</div>` : ''}
              </div>
            </div>
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
              <span style="padding:2px 6px; font-size:0.7rem; font-weight:900; background:#fef3c7; border:1.5px solid #333333; border-radius:4px; color:#92400e; box-shadow:1px 1px 0 #333333;">${boardEscapeHtml(layoutType.toUpperCase())}</span>
              <span style="padding:2px 6px; font-size:0.7rem; font-weight:900; background:#e0f2fe; border:1.5px solid #333333; border-radius:4px; color:#0369a1; box-shadow:1px 1px 0 #333333;">${totalSeatsCount} seats</span>
            </div>
          </div>

          <div style="background:#1e293b; color:#ffffff; font-size:0.68rem; font-weight:900; text-align:center; padding:3px 8px; border-radius:4px; letter-spacing:0.06em; border:1.5px solid #0f172a; box-shadow:1px 1px 0 #0f172a;">
            ▲ TEACHER BOARD / FRONT OF CLASSROOM ▲
          </div>

          ${floorPlanHtml}

          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="action-btn btn-blue" onclick="conOpenClassPlan('${boardEscapeHtml(className)}', '${boardEscapeHtml(plan.id || '')}')" style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; font-size:0.78rem; font-weight:800; border-radius:5px; border:1.5px solid #333333; box-shadow:2px 2px 0 #333333; cursor:pointer;" title="Open in Class Plan Designer">
                <img src="../assets/icons/class-plan.svg" class="btn-icon" alt="" style="width:14px; height:14px; margin:0; filter:brightness(0) invert(1);" />
                <span>Open in Class Plan</span>
              </button>

              <button type="button" class="action-btn btn-grey" onclick="conToggleCardItemsPreview('${nid}')" style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; font-size:0.78rem; font-weight:800; border-radius:5px; border:1.5px solid #333333; box-shadow:2px 2px 0 #333333; cursor:pointer;" title="Toggle Student Roster">
                <img src="../assets/icons/groups.svg" class="btn-icon" alt="" style="width:14px; height:14px; margin:0;" />
                <span>Students (${assignedStudents.length})</span>
              </button>
            </div>
            
            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">
              ${assignedStudents.length}/${totalSeatsCount} occupied
            </div>
          </div>

          <div id="con-preview-list-${nid}" style="display:none; max-height:140px; overflow-y:auto; border:1.5px solid #cbd5e1; border-radius:6px; padding:6px; background:#f8fafc; margin-top:4px; font-size:0.75rem;">
            ${assignedStudents.length > 0 ? assignedStudents.map((name, i) => `
              <div style="padding:2px 0; border-bottom:1px dashed #e2e8f0; display:flex; justify-content:space-between; gap:4px;">
                <strong style="color:#1e293b;">${i + 1}. ${boardEscapeHtml(name)}</strong>
              </div>
            `).join('') : '<div style="color:#94a3b8; font-style:italic;">No students assigned to seats in this plan yet.</div>'}
          </div>
        </div>
      `;

      const noteData = {
        id: nid,
        nodeId: null,
        text: '',
        html: cardHtml,
        x, y,
        color: '#111111',
        bg: '#ffffff',
        fontSize: 14,
        bold: false, italic: false, underline: false, strike: false,
        hidden: false, locked: false, manualSize: true,
        width: 440, height: null,
        isClassPlanCard: true,
        planPayload: planPayload
      };

      conNotes.push(noteData);
      conNoteBuild(noteData);

      const noteEl = document.querySelector(`.con-word-note[data-id="${nid}"]`);
      if (noteEl) {
        noteEl.classList.add('class-plan-card');
        noteEl.style.border = '2.5px solid #333333';
        noteEl.style.boxShadow = '4px 4px 0px #333333';
        noteEl.style.borderRadius = '10px';
        noteEl.style.background = '#ffffff';
        noteEl.style.padding = '10px 12px';
      }

      if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
      return noteData;
    }

    window.conOpenClassPlan = async function (classId, planId) {
      const query = {};
      if (classId) query.classId = classId;
      if (planId) query.planId = planId;
      if (window.Desktop && typeof window.Desktop.openTool === 'function') {
        await window.Desktop.openTool('class-plan.html', { query });
      } else {
        const qs = new URLSearchParams(query).toString();
        window.open('class-plan.html' + (qs ? '?' + qs : ''), '_blank');
      }
    };

    // Format 1: Interactive Launcher Card Generator
    function conCreateGameLauncherCard(activity, targetX, targetY) {
      const board = document.getElementById('constellation-board');
      if (!board) return null;

      if (window.conPushUndo) window.conPushUndo();

      const x = (targetX != null) ? targetX : Math.max(40, Math.round(board.clientWidth / 2 - 180 + Math.random() * 40 - 20));
      const y = (targetY != null) ? targetY : Math.max(40, Math.round(board.clientHeight / 2 - 120 + Math.random() * 40 - 20));

      const nid = (typeof window.conGetNextNoteId === 'function') ? window.conGetNextNoteId() : ('cnn' + (conNoteNextId++));
      const itemCount = (activity.items || []).length;
      const itemLabel = activity.activityType === 'quizzes'
        ? (itemCount === 1 ? 'Question' : 'Questions')
        : (activity.activityType === 'vocab' ? (itemCount === 1 ? 'Word' : 'Words') : (itemCount === 1 ? 'Item' : 'Items'));

      const cardHtml = `
        <div class="con-game-launcher-widget" data-activity-id="${boardEscapeHtml(activity.id)}" style="display:flex; flex-direction:column; gap:8px; min-width:300px; max-width:420px; font-family:inherit; pointer-events:auto;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; border-bottom:2px solid #333333; padding-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="../assets/icons/${boardEscapeHtml(activity.icon)}" class="btn-icon" alt="" style="width:22px; height:22px; margin:0;" />
              <strong style="font-size:0.95rem; color:#111111; font-weight:900;">${boardEscapeHtml(activity.title)}</strong>
            </div>
            <div style="display:flex; gap:4px; align-items:center;">
              ${activity.level ? `<span style="padding:2px 6px; font-size:0.7rem; font-weight:900; background:#fef3c7; border:1.5px solid #333333; border-radius:4px; color:#92400e; box-shadow:1px 1px 0 #333333;">${boardEscapeHtml(activity.level)}</span>` : ''}
              <span style="padding:2px 6px; font-size:0.7rem; font-weight:900; background:#e0f2fe; border:1.5px solid #333333; border-radius:4px; color:#0369a1; box-shadow:1px 1px 0 #333333;">${itemCount} ${itemLabel}</span>
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:2px;">
            <button type="button" class="action-btn btn-blue" onclick="conLaunchLearningActivity('${boardEscapeHtml(activity.id)}')" style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; font-size:0.78rem; font-weight:800; border-radius:5px; border:1.5px solid #333333; box-shadow:2px 2px 0 #333333; cursor:pointer;" title="Open Activity in Learning Tools / Quiz Window">
              <img src="../assets/icons/play.svg" class="btn-icon" alt="" style="width:14px; height:14px; margin:0; filter:brightness(0) invert(1);" />
              <span>Play Activity</span>
            </button>

            ${activity.activityType === 'quizzes' ? `
              <button type="button" class="action-btn btn-grey" onclick="conLaunchMultiplayerQuiz('${boardEscapeHtml(activity.id)}')" style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; font-size:0.78rem; font-weight:800; border-radius:5px; border:1.5px solid #333333; box-shadow:2px 2px 0 #333333; cursor:pointer;" title="Host Multiplayer Quiz for Students">
                <img src="../assets/icons/group.svg" class="btn-icon" alt="" style="width:14px; height:14px; margin:0;" />
                <span>Multiplayer</span>
              </button>
            ` : ''}

            <button type="button" class="action-btn btn-grey" onclick="conToggleCardItemsPreview('${nid}')" style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; font-size:0.78rem; font-weight:800; border-radius:5px; border:1.5px solid #333333; box-shadow:2px 2px 0 #333333; cursor:pointer;" title="Toggle Items List">
              <img src="../assets/icons/file-text.svg" class="btn-icon" alt="" style="width:14px; height:14px; margin:0;" />
              <span>Preview</span>
            </button>
          </div>

          <div id="con-preview-list-${nid}" style="display:none; max-height:160px; overflow-y:auto; border:1.5px solid #cbd5e1; border-radius:6px; padding:6px; background:#f8fafc; margin-top:4px; font-size:0.75rem;">
            ${(activity.items || []).map((item, i) => {
              const main = item.question || item.word || item.sentence || item.quote || item.text || item.original || item.title || `Item ${i + 1}`;
              const sub = item.translation || (Array.isArray(item.options) ? `[${item.options.length} options]` : (item.correction || ''));
              return `<div style="padding:2px 0; border-bottom:1px dashed #e2e8f0; display:flex; justify-content:space-between; gap:4px;">
                <strong style="color:#1e293b;">${i + 1}. ${boardEscapeHtml(main)}</strong>
                ${sub ? `<span style="color:#64748b; font-style:italic;">${boardEscapeHtml(sub)}</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
      `;

      const noteData = {
        id: nid,
        nodeId: null,
        text: '',
        html: cardHtml,
        x, y,
        color: '#111111',
        bg: '#ffffff',
        fontSize: 14,
        bold: false, italic: false, underline: false, strike: false,
        hidden: false, locked: false, manualSize: true,
        width: 360, height: null,
        isGameLauncherCard: true,
        activityPayload: activity
      };

      conNotes.push(noteData);
      conNoteBuild(noteData);

      const noteEl = document.querySelector(`.con-word-note[data-id="${nid}"]`);
      if (noteEl) {
        noteEl.classList.add('game-launcher-card');
        noteEl.style.border = '2.5px solid #333333';
        noteEl.style.boxShadow = '4px 4px 0px #333333';
        noteEl.style.borderRadius = '10px';
        noteEl.style.background = '#ffffff';
        noteEl.style.padding = '10px 12px';
      }

      if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
      return noteData;
    }

    // Format 2: Mindmap Node Cluster Generator
    function conCreateGameMindmapCluster(activity) {
      const board = document.getElementById('constellation-board');
      if (!board) return;

      if (window.conPushUndo) window.conPushUndo();

      const centerX = Math.max(140, Math.round(board.clientWidth / 2 - 50));
      const centerY = Math.max(140, Math.round(board.clientHeight / 2 - 30));

      const parentText = `[${activity.title}]`;
      const parentNodeId = conAddWordAt(parentText, centerX, centerY);
      const createdNodeIds = [parentNodeId];

      const items = (activity.items || []).slice(0, 24); // max 24 in mindmap circle
      const N = items.length;
      if (N > 0) {
        const radius = Math.max(140, Math.min(260, 25 * N));
        items.forEach((item, i) => {
          const angle = (2 * Math.PI * i) / N;
          const childX = Math.round(centerX + radius * Math.cos(angle));
          const childY = Math.round(centerY + radius * Math.sin(angle));
          const childText = item.word || item.question || item.sentence || item.quote || item.text || item.original || item.title || `Item ${i + 1}`;
          const childNodeId = conAddWordAt(childText, childX, childY);
          createdNodeIds.push(childNodeId);

          if (typeof conAddEdge === 'function') {
            conAddEdge(parentNodeId, childNodeId, 'solid', '#333333');
          }
        });
      }

      // Group all created nodes together
      const grpFn = (typeof conGroupCreate === 'function') ? conGroupCreate : (window.conGroupCreate || null);
      if (grpFn && createdNodeIds.length >= 2) {
        const groupObj = grpFn(createdNodeIds);
        if (groupObj) {
          groupObj.title = activity.title || '';
          if (typeof conGroupApplyStyle === 'function') conGroupApplyStyle(groupObj);
        }
      }

      if (typeof conMarkBoardDirty === 'function') conMarkBoardDirty();
    }

    // Format 3: Markdown Note Checklist Generator
    function conCreateGameNoteChecklist(activity) {
      const items = activity.items || [];
      let md = `### ${activity.title}\n\n`;
      if (activity.level || activity.theme) {
        md += `*${activity.level ? `[${activity.level}] ` : ''}${activity.theme || ''}*\n\n`;
      }
      items.forEach((item, i) => {
        const main = item.question || item.word || item.sentence || item.quote || item.text || item.original || item.title || `Item ${i + 1}`;
        const sub = item.translation || (item.correction ? ` -> ${item.correction}` : '');
        md += `- [ ] **${main}** ${sub ? `*(${sub})*` : ''}\n`;
      });

      const board = document.getElementById('constellation-board');
      const x = Math.max(40, Math.round((board ? board.clientWidth : 800) / 2 - 120));
      const y = Math.max(40, Math.round((board ? board.clientHeight : 600) / 2 - 100));

      if (window.conNoteAdd) {
        conNoteAdd(x, y, md);
      }
    }

    // =========================================================================
    // PART 8 & 9: TOOL EXECUTION ENGINE & MIRROR SYNC
    // =========================================================================
    function conMapVocabGameToSection(mode) {
      switch (mode) {
        case 'match': return 'match-game-section';
        case 'hangman': return 'hangman-game-section';
        case 'scramble': return 'scramble-game-section';
        case 'wordquest': return 'clue-game-section';
        case 'phonetic': return 'ipa-game-section';
        case 'synant': return 'synonym-game-section';
        case 'flashcards': return 'flip-game-section';
        case 'wordsearch': return 'wordsearch-game-section';
        default: return 'match-game-section';
      }
    }

    function conMapGrammarToSection(tool) {
      switch (tool) {
        case 'sentence': return 'sentence-game-section';
        case 'gapfill': return 'gap-game-section';
        case 'error': return 'error-game-section';
        case 'dictation': return 'dictation-section';
        case 'order': return 'order-sentences-section';
        case 'quote': return 'quote-game-section';
        case 'werewolf': return 'werewolf-section';
        default: return 'sentence-game-section';
      }
    }

    window.conLaunchLearningActivity = async function (activityId) {
      // Look up activity payload from noteData
      const note = conNotes.find(n => n.activityPayload && n.activityPayload.id === activityId);
      const act = note ? note.activityPayload : null;

      if (!act) {
        if (typeof showToast === 'function') showToast('Activity details not found.', true);
        return;
      }

      if (act.activityType === 'quizzes') {
        const query = {
          section: 'quiz-section',
          quizTheme: act.theme || '',
          quizLevel: act.level || ''
        };
        if (window.Desktop && typeof window.Desktop.openTool === 'function') {
          await window.Desktop.openTool('learning-tools.html', { query });
        } else {
          window.open('learning-tools.html?' + new URLSearchParams(query).toString(), '_blank');
        }
      } else if (act.activityType === 'vocab') {
        const targetSection = conMapVocabGameToSection(act.subType);
        const wordList = (act.items || []).map(w => w.word).filter(Boolean);
        const query = {
          section: targetSection,
          theme: act.theme || '',
          level: act.level || '',
          words: wordList.join(',')
        };
        if (window.Desktop && typeof window.Desktop.openTool === 'function') {
          await window.Desktop.openTool('learning-tools.html', { query });
        } else {
          window.open('learning-tools.html?' + new URLSearchParams(query).toString(), '_blank');
        }
      } else if (act.activityType === 'grammar') {
        const targetSection = conMapGrammarToSection(act.subType);
        const query = {
          section: targetSection,
          theme: act.theme || '',
          level: act.level || ''
        };
        if (window.Desktop && typeof window.Desktop.openTool === 'function') {
          await window.Desktop.openTool('learning-tools.html', { query });
        } else {
          window.open('learning-tools.html?' + new URLSearchParams(query).toString(), '_blank');
        }
      }
    };

    window.conLaunchMultiplayerQuiz = async function (activityId) {
      const note = conNotes.find(n => n.activityPayload && n.activityPayload.id === activityId);
      const act = note ? note.activityPayload : null;
      const query = {
        multiplayer: '1',
        theme: (act && act.theme) || '',
        level: (act && act.level) || ''
      };
      if (window.Desktop && typeof window.Desktop.openTool === 'function') {
        await window.Desktop.openTool('learning-tools.html', { query });
      } else {
        window.open('learning-tools.html?' + new URLSearchParams(query).toString(), '_blank');
      }
    };

    window.conToggleCardItemsPreview = function (nid) {
      const el = document.getElementById(`con-preview-list-${nid}`);
      if (!el) return;
      const isHidden = (el.style.display === 'none' || !el.style.display);
      el.style.display = isHidden ? 'block' : 'none';

      // Mirror / secondary display micro-message (smooth-dom-sync)
      if (typeof _conMirrorSend === 'function') {
        _conMirrorSend('toggle-card-preview', { noteId: nid, visible: isHidden });
      }
    };

    // Global escape key handler to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('con-learning-import-overlay');
        if (overlay && overlay.style.display !== 'none') {
          conCloseLearningImportModal();
        }
      }
    });

    // Tour helper trigger stub
    window.conOpenLearningToolsTour = function () {
      if (typeof window.startTour === 'function') {
        window.startTour('board-learning-tools');
      } else if (typeof showToast === 'function') {
        showToast('Spotlight tour for Learning Activities will be available once tour guide is loaded.');
      }
    };

    // Expose alias for cross-window sync
    window.boardEnsureLearningBanksLoaded = boardEnsureLearningBanksLoaded;
    window.ensureWordDbLoaded = boardEnsureLearningBanksLoaded;

    // Auto-listen to global link changes
    window.addEventListener('cmt-links-changed', () => {
      boardUpdateToolbarLinksCount();
      conUpdateAllNodeLinkBadges();
    });
    if (typeof LinksService !== 'undefined' && typeof LinksService.on === 'function') {
      LinksService.on('links-changed', () => {
        boardUpdateToolbarLinksCount();
        conUpdateAllNodeLinkBadges();
      });
    }

    try {
      const _dataSyncChannel = new BroadcastChannel('cmt_data_sync');
      _dataSyncChannel.onmessage = async (ev) => {
        if (ev && ev.data && (ev.data.file === 'vocab.json' || ev.data.file === 'wordDb.js' || ev.data.type === 'vocab' || ev.data.type === 'wordbanks' || ev.data.type === 'quizzes')) {
          if (typeof boardEnsureLearningBanksLoaded === 'function') {
            await boardEnsureLearningBanksLoaded(true);
          }
          conUpdateAllNodeLinkBadges();
        }
      };
    } catch (_) {}

    // Initial update
    setTimeout(() => {
      boardUpdateToolbarLinksCount();
      conUpdateAllNodeLinkBadges();
    }, 500);

    // ================================================================
    // NOVEL CHARACTER NETWORK CONTROLLER
    // ================================================================
    const characterNetworkState = {
      rawText: '',
      bookLabel: '',
      detectedCharacters: [],
      pairExcerpts: {},
      isScanning: false
    };

    async function characterNetworkOpenModal(presetText) {
      const overlay = document.getElementById('character-network-overlay');
      if (!overlay) return;

      const bookSelect = document.getElementById('char-net-book-select');
      const bookStatus = document.getElementById('char-net-book-status');

      if (typeof searchInitShortcutMenu === 'function' && (!searchAvailableBooks || searchAvailableBooks.length === 0)) {
        try { await searchInitShortcutMenu(); } catch (_) {}
      }

      if (bookSelect) {
        bookSelect.innerHTML = '<option value="">' + (typeof i18n !== 'undefined' ? i18n.t('charNetChooseBookPrompt') : '-- Choose a novel --') + '</option>';
        if (typeof searchBookText === 'string' && searchBookText.trim().length > 0) {
          const optLoaded = document.createElement('option');
          optLoaded.value = '__loaded_search_book__';
          optLoaded.textContent = '★ ' + (typeof i18n !== 'undefined' ? i18n.t('charNetLoadedSearchBook') : 'Currently Loaded Book');
          bookSelect.appendChild(optLoaded);
        }

        if (Array.isArray(searchAvailableBooks)) {
          searchAvailableBooks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id || b.path;
            opt.textContent = b.label || b.fileName;
            bookSelect.appendChild(opt);
          });
        }
      }

      if (typeof presetText === 'string' && presetText.trim().length > 0) {
        characterNetworkState.rawText = presetText;
        characterNetworkState.bookLabel = 'Current Book';
        if (bookSelect) bookSelect.value = '__loaded_search_book__';
        if (bookStatus) bookStatus.textContent = 'Ready (' + Math.round(presetText.length / 1024) + ' KB)';
      } else if (typeof searchBookText === 'string' && searchBookText.trim().length > 0) {
        characterNetworkState.rawText = searchBookText;
        characterNetworkState.bookLabel = 'Current Book';
        if (bookSelect) bookSelect.value = '__loaded_search_book__';
        if (bookStatus) bookStatus.textContent = 'Ready (' + Math.round(searchBookText.length / 1024) + ' KB)';
      } else {
        characterNetworkState.rawText = '';
        characterNetworkState.bookLabel = '';
        if (bookStatus) bookStatus.textContent = '';
      }

      overlay.style.display = 'flex';
      if (typeof i18n !== 'undefined' && typeof i18n.applyTranslations === 'function') {
        i18n.applyTranslations(overlay);
      }
    }
    window.characterNetworkOpenModal = characterNetworkOpenModal;

    function characterNetworkCloseModal() {
      const overlay = document.getElementById('character-network-overlay');
      if (overlay) overlay.style.display = 'none';
    }
    window.characterNetworkCloseModal = characterNetworkCloseModal;

    async function characterNetworkOnBookChange() {
      const bookSelect = document.getElementById('char-net-book-select');
      const bookStatus = document.getElementById('char-net-book-status');
      if (!bookSelect || !bookSelect.value) {
        characterNetworkState.rawText = '';
        characterNetworkState.bookLabel = '';
        if (bookStatus) bookStatus.textContent = '';
        return;
      }

      if (bookSelect.value === '__loaded_search_book__') {
        characterNetworkState.rawText = searchBookText || '';
        characterNetworkState.bookLabel = 'Current Book';
        if (bookStatus) bookStatus.textContent = 'Ready (' + Math.round(characterNetworkState.rawText.length / 1024) + ' KB)';
        return;
      }

      const match = Array.isArray(searchAvailableBooks) ? searchAvailableBooks.find(b => b.id === bookSelect.value || b.path === bookSelect.value) : null;
      if (!match) return;

      try {
        if (bookStatus) bookStatus.textContent = 'Loading text...';
        const target = match.target || (match.path.startsWith('books/') ? 'data' : 'customBooks');
        const text = await searchReadShortcutBook(match.path, target);
        if (!text) throw new Error('File produced no readable text.');

        characterNetworkState.rawText = text;
        characterNetworkState.bookLabel = match.label || match.fileName;
        if (bookStatus) bookStatus.textContent = 'Loaded (' + Math.round(text.length / 1024) + ' KB)';
      } catch (err) {
        console.error('Character network book read error:', err);
        if (bookStatus) bookStatus.textContent = 'Failed to load';
        if (typeof showToast === 'function') showToast(err && err.message ? err.message : 'Failed to read novel', true);
      }
    }
    window.characterNetworkOnBookChange = characterNetworkOnBookChange;

    async function characterNetworkScanText() {
      if (!characterNetworkState.rawText || characterNetworkState.rawText.trim().length === 0) {
        const msg = typeof i18n !== 'undefined' ? i18n.t('charNetNoBookError') : 'Please select or load a novel first.';
        if (typeof showToast === 'function') showToast(msg, true);
        else alert(msg);
        return;
      }

      const scanBtn = document.getElementById('char-net-scan-btn');
      const progressWrap = document.getElementById('char-net-progress-wrap');
      const progressFill = document.getElementById('char-net-progress-fill');

      try {
        if (scanBtn) scanBtn.disabled = true;
        if (progressWrap) progressWrap.style.display = 'block';
        if (progressFill) progressFill.style.width = '30%';

        await new Promise(r => setTimeout(r, 40));

        if (typeof CharacterNetworkService === 'undefined') {
          throw new Error('CharacterNetworkService module not loaded.');
        }

        const candidates = CharacterNetworkService.detectCandidates(characterNetworkState.rawText, {
          minOccurrences: 3,
          maxCandidates: 35
        });

        if (progressFill) progressFill.style.width = '100%';
        await new Promise(r => setTimeout(r, 60));

        characterNetworkState.detectedCharacters = candidates;
        characterNetworkRenderTable();

        if (typeof showToast === 'function') {
          showToast(candidates.length + ' character entities identified.', false);
        }
      } catch (e) {
        console.error('Error scanning characters:', e);
        if (typeof showToast === 'function') showToast(e && e.message ? e.message : 'Error scanning characters', true);
      } finally {
        if (scanBtn) scanBtn.disabled = false;
        if (progressWrap) progressWrap.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
      }
    }
    window.characterNetworkScanText = characterNetworkScanText;

    function characterNetworkRenderTable() {
      const tbody = document.getElementById('char-net-chars-tbody');
      if (!tbody) return;

      const chars = characterNetworkState.detectedCharacters;
      if (!chars || chars.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888; padding:16px;">No character entities detected. Try adding a custom character below.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      chars.forEach((c) => {
        const tr = document.createElement('tr');

        // Checkbox
        const tdCheck = document.createElement('td');
        tdCheck.style.textAlign = 'center';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = c.enabled !== false;
        chk.style.cursor = 'pointer';
        chk.style.accentColor = '#333';
        chk.onchange = function () { c.enabled = this.checked; };
        tdCheck.appendChild(chk);
        tr.appendChild(tdCheck);

        // Name (editable)
        const tdName = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = c.name || '';
        nameInput.className = 'char-net-alias-input';
        nameInput.style.fontWeight = '700';
        nameInput.onchange = function () { c.name = this.value.trim(); };
        tdName.appendChild(nameInput);
        tr.appendChild(tdName);

        // Mentions Badge
        const tdCount = document.createElement('td');
        tdCount.style.textAlign = 'center';
        const badge = document.createElement('span');
        badge.className = 'char-net-badge';
        badge.textContent = c.count || 0;
        tdCount.appendChild(badge);
        tr.appendChild(tdCount);

        // Aliases (comma-separated editable)
        const tdAlias = document.createElement('td');
        const aliasInput = document.createElement('input');
        aliasInput.type = 'text';
        aliasInput.value = (c.aliases || []).join(', ');
        aliasInput.className = 'char-net-alias-input';
        aliasInput.placeholder = 'e.g. Nickname, Title';
        aliasInput.onchange = function () {
          c.aliases = this.value.split(',').map(s => s.trim()).filter(Boolean);
        };
        tdAlias.appendChild(aliasInput);
        tr.appendChild(tdAlias);

        tbody.appendChild(tr);
      });
    }
    window.characterNetworkRenderTable = characterNetworkRenderTable;

    function characterNetworkToggleAll(state) {
      if (!Array.isArray(characterNetworkState.detectedCharacters)) return;
      characterNetworkState.detectedCharacters.forEach(c => { c.enabled = !!state; });
      characterNetworkRenderTable();
    }
    window.characterNetworkToggleAll = characterNetworkToggleAll;

    function characterNetworkAddCustomChar() {
      const name = prompt(typeof i18n !== 'undefined' ? i18n.t('charNetCharCol') : 'Character name:');
      if (!name || !name.trim()) return;

      const newChar = {
        id: 'char_' + (characterNetworkState.detectedCharacters.length + 1) + '_' + Date.now().toString(36),
        name: name.trim(),
        count: 1,
        aliases: [],
        enabled: true
      };

      characterNetworkState.detectedCharacters.unshift(newChar);
      characterNetworkRenderTable();
    }
    window.characterNetworkAddCustomChar = characterNetworkAddCustomChar;

    async function characterNetworkGenerate() {
      if (!characterNetworkState.rawText || characterNetworkState.rawText.trim().length === 0) {
        const msg = typeof i18n !== 'undefined' ? i18n.t('charNetNoBookError') : 'Please select or load a novel first.';
        if (typeof showToast === 'function') showToast(msg, true);
        return;
      }

      const activeChars = (characterNetworkState.detectedCharacters || []).filter(c => c && c.enabled !== false && c.name && c.name.trim());
      if (activeChars.length < 2) {
        const msg = typeof i18n !== 'undefined' ? i18n.t('charNetNoCharsSelected') : 'Please select at least 2 characters to analyze.';
        if (typeof showToast === 'function') showToast(msg, true);
        return;
      }

      const winMode = (document.getElementById('char-net-window-mode') || {}).value || 'sliding';
      const minCooc = Number((document.getElementById('char-net-min-cooc') || {}).value) || 1;
      const targetLoc = (document.getElementById('char-net-target-location') || {}).value || 'new_page';

      const generateBtn = document.getElementById('char-net-generate-btn');
      const progressWrap = document.getElementById('char-net-progress-wrap');
      const progressFill = document.getElementById('char-net-progress-fill');

      try {
        if (generateBtn) generateBtn.disabled = true;
        if (progressWrap) progressWrap.style.display = 'block';
        if (progressFill) progressFill.style.width = '10%';

        // 1. Build Co-occurrence matrix asynchronously
        const matrixResult = await CharacterNetworkService.buildCooccurrenceMatrix(
          characterNetworkState.rawText,
          activeChars,
          { windowMode: winMode, minCooccurrences: minCooc },
          pct => {
            if (progressFill) progressFill.style.width = Math.min(85, Math.max(10, pct)) + '%';
          }
        );

        characterNetworkState.pairExcerpts = matrixResult.pairExcerpts || {};

        if (Object.keys(matrixResult.matrix).length === 0) {
          const msg = typeof i18n !== 'undefined' ? i18n.t('charNetNoCooccurrences') : 'No interactions met the minimum co-occurrence threshold.';
          if (typeof showToast === 'function') showToast(msg, true);
          return;
        }

        // 2. Compute centrality metrics
        const metrics = CharacterNetworkService.computeMetrics(matrixResult.matrix, activeChars);

        // 3. Switch to constellation section first so container dimensions & DOM element fonts are active
        characterNetworkCloseModal();
        if (typeof navTo === 'function') navTo('constellation-section');

        // 4. Handle target location (new page / clear / current)
        if (typeof window.conPushUndo === 'function') window.conPushUndo();

        if (targetLoc === 'new_page' && typeof window.conAddPage === 'function') {
          window.conAddPage();
        } else if (targetLoc === 'clear') {
          if (typeof window.conClearAll === 'function') {
            window.conClearAll({ skipConfirm: true });
          }
        }

        // 5. Force-directed layout calculation dynamically proportioned to character count
        const brd = document.getElementById('constellation-board');
        const viewW = (brd && brd.clientWidth > 400) ? brd.clientWidth : (window.innerWidth - 60);
        const viewH = (brd && brd.clientHeight > 300) ? brd.clientHeight : (window.innerHeight - 180);
        const scrollX = (brd && brd.scrollLeft > 0) ? brd.scrollLeft : 0;
        const scrollY = (brd && brd.scrollTop > 0) ? brd.scrollTop : 0;

        const nodeCount = metrics.nodes.length;
        const dynamicW = Math.round(Math.sqrt(nodeCount) * 340) + 260;
        const dynamicH = Math.round(Math.sqrt(nodeCount) * 230) + 200;

        const bWidth = Math.max(viewW, dynamicW);
        const bHeight = Math.max(viewH, dynamicH);
        const offsetX = scrollX + 40;
        const offsetY = scrollY + 40;

        const layoutNodes = CharacterNetworkService.computeLayout(metrics.nodes, metrics.edges, bWidth, bHeight, {
          iterations: 140,
          paddingX: 90,
          paddingY: 70,
          offsetX: offsetX,
          offsetY: offsetY
        });

        // Palette presets for character nodes (Light Neobrutalist accents)
        const charColorPalette = [
          { bg: '#ffffff', color: '#111111', border: '#2d7d46' }, // sage green
          { bg: '#ffffff', color: '#111111', border: '#2563eb' }, // slate blue
          { bg: '#ffffff', color: '#111111', border: '#d97706' }, // amber
          { bg: '#ffffff', color: '#111111', border: '#7c3aed' }, // violet
          { bg: '#ffffff', color: '#111111', border: '#dc2626' }, // rose
          { bg: '#ffffff', color: '#111111', border: '#0891b2' }  // teal
        ];

        const addWordFn = (typeof conAddWordAt === 'function') ? conAddWordAt : window.conAddWordAt;
        const addEdgeFn = (typeof conAddEdge === 'function') ? conAddEdge : window.conAddEdge;
        const getNodesFn = (typeof window.conGetNodes === 'function') ? window.conGetNodes : () => [];
        const getEdgesFn = (typeof window.conGetEdges === 'function') ? window.conGetEdges : () => [];
        const updateEdgeFn = (typeof conUpdateEdge === 'function') ? conUpdateEdge : window.conUpdateEdge;
        const redrawEdgesFn = (typeof window.conRedrawEdges === 'function') ? window.conRedrawEdges : (typeof conRedrawEdges === 'function' ? conRedrawEdges : null);

        // 6. Create Board Nodes
        const createdNodeMap = new Map(); // char.id -> boardNode.id
        layoutNodes.forEach((nd, idx) => {
          if (typeof addWordFn !== 'function') return;

          const nodeId = addWordFn(nd.name, nd.x, nd.y);
          createdNodeMap.set(nd.id, nodeId);

          const liveNode = getNodesFn().find(n => n.id === nodeId);
          if (liveNode) {
            const pal = charColorPalette[idx % charColorPalette.length];
            liveNode.color = pal.color;
            liveNode.border = pal.border;
            liveNode.borderWidth = (nd.normDegree > 0.5) ? 3 : 2;

            if (liveNode.el) {
              liveNode.el.style.color = pal.color;
              liveNode.el.style.borderColor = pal.border;
              liveNode.el.style.borderWidth = liveNode.borderWidth + 'px';

              const fontSize = Math.round(13 + (nd.normDegree * 9));
              liveNode.el.style.fontSize = fontSize + 'px';
              liveNode.el.style.fontWeight = (nd.normDegree > 0.3) ? '800' : '600';
            }
            if (typeof conSyncNodeBasePosition === 'function') conSyncNodeBasePosition(liveNode);
          }
        });

        // 7. Create Board Links with thickness proportional to shared co-occurrences
        let maxWeight = 1;
        metrics.edges.forEach(e => { if (e.weight > maxWeight) maxWeight = e.weight; });

        const minThick = 2.8;
        const maxThick = 13.0;

        metrics.edges.forEach(edge => {
          const aNodeId = createdNodeMap.get(edge.source);
          const bNodeId = createdNodeMap.get(edge.target);
          if (!aNodeId || !bNodeId) return;

          if (typeof addEdgeFn !== 'function') return;

          // Rich logarithmic thickness scaling:
          // gives clear, bold differentiation between single meetings, moderate ties, and deep relationships
          let thickness = minThick;
          if (maxWeight > 1) {
            const tNorm = Math.log(1 + (edge.weight - 1)) / Math.log(1 + (maxWeight - 1));
            thickness = Math.round((minThick + tNorm * (maxThick - minThick)) * 10) / 10;
          } else {
            thickness = 4.5;
          }

          const createdEdge = addEdgeFn(aNodeId, bNodeId, 'none', '#333333', null, thickness);
          const liveEdge = createdEdge || getEdgesFn().find(e => (e.a === aNodeId && e.b === bNodeId) || (e.a === bNodeId && e.b === aNodeId));
          if (liveEdge) {
            liveEdge.thickness = thickness;
            liveEdge.label = String(edge.weight);
            liveEdge.labelBgActive = true;
            liveEdge.labelSize = Math.max(12, Math.min(18, Math.round(11 + Math.sqrt(edge.weight))));
            liveEdge.labelWeight = 700;

            if (liveEdge.line) {
              liveEdge.line.style.setProperty('stroke-width', thickness + 'px', 'important');
              liveEdge.line.setAttribute('stroke-width', String(thickness));
            }
            if (liveEdge.hit) {
              liveEdge.hit.style.strokeWidth = Math.max(18, thickness + 12) + 'px';
            }

            const pk = (edge.source < edge.target) ? (edge.source + '::' + edge.target) : (edge.target + '::' + edge.source);
            liveEdge.excerpts = matrixResult.pairExcerpts[pk] || [];
            liveEdge.charAName = (activeChars.find(c => c.id === edge.source) || {}).name || '';
            liveEdge.charBName = (activeChars.find(c => c.id === edge.target) || {}).name || '';

            if (typeof updateEdgeFn === 'function') updateEdgeFn(liveEdge);
          }
        });

        if (typeof redrawEdgesFn === 'function') redrawEdgesFn();
        if (typeof window.conMirrorBroadcastAll === 'function') window.conMirrorBroadcastAll();

        if (typeof showToast === 'function') {
          showToast('Character network generated: ' + layoutNodes.length + ' characters, ' + metrics.edges.length + ' links.', false);
        }
      } catch (err) {
        console.error('Character network generation error:', err);
        if (typeof showToast === 'function') showToast(err && err.message ? err.message : 'Error generating network', true);
      } finally {
        if (generateBtn) generateBtn.disabled = false;
        if (progressWrap) progressWrap.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
      }
    }
    window.characterNetworkGenerate = characterNetworkGenerate;

    function characterNetworkShowExcerpts(edgeId) {
      const getEdgesFn = (typeof window.conGetEdges === 'function') ? window.conGetEdges : () => [];
      const edge = getEdgesFn().find(e => e && e.id === edgeId);
      if (!edge || !Array.isArray(edge.excerpts) || edge.excerpts.length === 0) return;

      const overlay = document.getElementById('char-net-excerpts-overlay');
      const titleEl = document.getElementById('char-net-excerpts-title');
      const countEl = document.getElementById('char-net-excerpts-count');
      const listEl = document.getElementById('char-net-excerpts-list');

      const nameA = edge.charAName || 'Character A';
      const nameB = edge.charBName || 'Character B';

      if (titleEl) titleEl.textContent = nameA + ' ⟷ ' + nameB;
      if (countEl) {
        const tpl = typeof i18n !== 'undefined' ? i18n.t('charNetExcerptCount') : '{count} shared scene(s) found in novel text.';
        countEl.textContent = tpl.replace('{count}', edge.excerpts.length);
      }

      if (listEl && typeof CharacterNetworkService !== 'undefined') {
        listEl.innerHTML = '';
        const formatted = CharacterNetworkService.formatExcerpts(edge.excerpts, nameA, nameB);
        formatted.forEach(html => {
          const card = document.createElement('div');
          card.className = 'char-excerpt-card';
          card.innerHTML = html;
          listEl.appendChild(card);
        });
      }

      if (overlay) overlay.style.display = 'flex';
    }
    window.characterNetworkShowExcerpts = characterNetworkShowExcerpts;

    function characterNetworkCloseExcerpts() {
      const overlay = document.getElementById('char-net-excerpts-overlay');
      if (overlay) overlay.style.display = 'none';
    }
    window.characterNetworkCloseExcerpts = characterNetworkCloseExcerpts;

    function characterNetworkOpenExcerptsFromActiveEdge() {
      if (window._conEdgeCtxId) {
        if (typeof window.conEdgeCtxClose === 'function') window.conEdgeCtxClose(false);
        characterNetworkShowExcerpts(window._conEdgeCtxId);
      }
    }
    window.characterNetworkOpenExcerptsFromActiveEdge = characterNetworkOpenExcerptsFromActiveEdge;

  Board.learning = Board.learning || {};
})(typeof window !== "undefined" ? window : this);