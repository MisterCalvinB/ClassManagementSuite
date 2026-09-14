/**
 * Competence Aggregator Service
 * Class Management Tools (CMT)
 *
 * Provides a unified cross-tool aggregator for curriculum competences:
 * - Loads master competences from user/custom-data/competences/, lesson-competences.json, localStorage
 * - Resolves class metadata (name, level, subject) from class-groups.js
 * - Cross-queries Planner, Lesson Creator, Board constellations, and Grade Sheet assessments
 * - Automatically pre-filters competence pickers across all tools by class subject and level
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CompetenceAggregatorService = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let _cachedCompetences = null;
  let _loadingPromise = null;

  // ── Helper: Parse Competence Records from file text ────────────────
  function parseCompetenceFileContent(content) {
    if (!content || typeof content !== 'string') return [];
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const obj = JSON.parse(trimmed);
        if (Array.isArray(obj)) return obj;
        if (Array.isArray(obj.competences)) return obj.competences;
        if (Array.isArray(obj.customCompetenceBank)) return obj.customCompetenceBank;
        if (Array.isArray(obj.customDescriptorBank)) return obj.customDescriptorBank;
        if (Array.isArray(obj.descriptors)) return obj.descriptors;
        if (Array.isArray(obj.records)) return obj.records;
      } catch (_) {}
    }
    try {
      const fn = new Function(
        content +
        '\n;try{' +
        'if(typeof customCompetenceBank!=="undefined")return customCompetenceBank;' +
        'if(typeof window!=="undefined"&&window.customCompetenceBank)return window.customCompetenceBank;' +
        'if(typeof customDescriptorBank!=="undefined")return customDescriptorBank;' +
        'if(typeof window!=="undefined"&&window.customDescriptorBank)return window.customDescriptorBank;' +
        'if(typeof LESSON_COMPETENCES!=="undefined")return LESSON_COMPETENCES;' +
        'if(typeof LESSON_DESCRIPTORS!=="undefined")return LESSON_DESCRIPTORS;' +
        '}catch(e){}return [];'
      );
      const res = fn();
      if (Array.isArray(res) && res.length > 0) return res;
    } catch (_) {}
    return [];
  }

  // ── Standardize Competence Item ────────────────────────────────────
  function normalizeCompetence(item, sourceDb = '') {
    if (!item || typeof item !== 'object') return null;
    const id = String(item.id || item.code || item.title || '').trim();
    if (!id) return null;
    const code = String(item.code || '').trim() || id;
    const title = String(item.title || item.name || code).trim();
    const category = String(item.category || item.domain || item.competence || item.subject || item.strand || 'General').trim();
    const subCategory = String(item.subCategory || item.subdomain || '').trim();
    const subjectId = String(item.subjectId || item.subject || '').trim();
    const level = String(item.level || '').trim();
    const yearLevel = String(item.yearLevel || item.year || item.grade || '').trim();
    const description = String(item.description || item.statement || '').trim();
    const tags = Array.isArray(item.tags)
      ? item.tags
      : (item.tags ? String(item.tags).split(',').map(s => s.trim()).filter(Boolean) : []);
    const linkedCompetenceIds = Array.isArray(item.linkedCompetenceIds)
      ? item.linkedCompetenceIds.map(s => String(s).trim()).filter(Boolean)
      : (typeof item.linkedCompetenceIds === 'string'
        ? item.linkedCompetenceIds.split(',').map(s => s.trim()).filter(Boolean)
        : []);
    const _sourceDb = String(item._sourceDb || sourceDb || '').trim();
    const qualifiedId = _sourceDb ? `${_sourceDb}::${id}` : id;

    return {
      id,
      qualifiedId,
      _sourceDb,
      code,
      title,
      category,
      subCategory,
      subjectId,
      level,
      yearLevel,
      description,
      tags,
      linkedCompetenceIds
    };
  }

  // ── Load All Master Competences ─────────────────────────────────────
  async function loadAllCompetences(forceReload = false) {
    if (_cachedCompetences && !forceReload) {
      return _cachedCompetences;
    }
    if (_loadingPromise && !forceReload) {
      return _loadingPromise;
    }

    _loadingPromise = (async () => {
      const compMap = new Map();

      function ingest(rawArr, sourceDb = '') {
        if (!Array.isArray(rawArr)) return;
        for (const r of rawArr) {
          const c = normalizeCompetence(r, sourceDb);
          if (!c) continue;
          if (!compMap.has(c.id)) {
            compMap.set(c.id, c);
          } else {
            // merge non-empty attributes
            const ex = compMap.get(c.id);
            if (!ex._sourceDb && c._sourceDb) ex._sourceDb = c._sourceDb;
            if ((!ex.qualifiedId || ex.qualifiedId === ex.id) && c.qualifiedId) ex.qualifiedId = c.qualifiedId;
            if (!ex.code && c.code) ex.code = c.code;
            if (!ex.title && c.title) ex.title = c.title;
            if (!ex.category && c.category) ex.category = c.category;
            if (!ex.subCategory && c.subCategory) ex.subCategory = c.subCategory;
            if (!ex.subjectId && c.subjectId) ex.subjectId = c.subjectId;
            if (!ex.level && c.level) ex.level = c.level;
            if (!ex.yearLevel && c.yearLevel) ex.yearLevel = c.yearLevel;
            if (!ex.description && c.description) ex.description = c.description;
            if (c.tags.length && !ex.tags.length) ex.tags = c.tags;
            if (Array.isArray(c.linkedCompetenceIds) && c.linkedCompetenceIds.length) {
              const merged = new Set([...(ex.linkedCompetenceIds || []), ...c.linkedCompetenceIds]);
              ex.linkedCompetenceIds = Array.from(merged);
            }
          }
        }
      }

      // 1. Desktop customCompetences / customDescriptors
      if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.listFiles === 'function') {
        try {
          const res = await window.Desktop.listFiles('customCompetences', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn || fn === 'competence-links.json') continue;
            const r = await window.Desktop.readText('customCompetences', fn);
            if (r && r.ok && r.content) ingest(parseCompetenceFileContent(r.content), fn);
          }
        } catch (_) {}

        try {
          const res = await window.Desktop.listFiles('customDescriptors', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn || fn === 'competence-links.json') continue;
            const r = await window.Desktop.readText('customDescriptors', fn);
            if (r && r.ok && r.content) ingest(parseCompetenceFileContent(r.content), fn);
          }
        } catch (_) {}

        // Root files: lesson-competences.json / lesson-descriptors.json
        try {
          let r = await window.Desktop.readText('user', 'lesson-competences.json');
          if (r && r.ok && r.content) ingest(parseCompetenceFileContent(r.content), 'lesson-competences.json');
          let r2 = await window.Desktop.readText('user', 'lesson-descriptors.json');
          if (r2 && r2.ok && r2.content) ingest(parseCompetenceFileContent(r2.content), 'lesson-descriptors.json');
        } catch (_) {}
      }

      // 2. Browser localStorage fallback
      if (typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem('cmt-lesson-competences') || localStorage.getItem('cmt-lesson-descriptors');
          if (stored) {
            const p = JSON.parse(stored);
            if (Array.isArray(p)) ingest(p, 'localStorage');
          }
        } catch (_) {}
      }

      _cachedCompetences = Array.from(compMap.values());
      return _cachedCompetences;
    })();

    const result = await _loadingPromise;
    _loadingPromise = null;
    return result;
  }

  // ── Competence Cross-Database Links Registry ────────────────────────
  let _cachedLinks = null;
  let _linksLoadingPromise = null;

  async function loadCompetenceLinks(forceReload = false) {
    if (_cachedLinks && !forceReload) return _cachedLinks;
    if (_linksLoadingPromise && !forceReload) return _linksLoadingPromise;

    _linksLoadingPromise = (async () => {
      let rawContent = null;
      if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.readText === 'function') {
        try {
          let r = await window.Desktop.readText('customCompetences', 'competence-links.json');
          if (!r || !r.ok) r = await window.Desktop.readText('user', 'competence-links.json');
          if (r && r.ok && r.content) rawContent = r.content;
        } catch (_) {}
      }
      if (!rawContent && typeof localStorage !== 'undefined') {
        try {
          rawContent = localStorage.getItem('cmt-competence-links');
        } catch (_) {}
      }

      let parsedLinks = [];
      if (rawContent) {
        try {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed)) parsedLinks = parsed;
          else if (parsed && Array.isArray(parsed.links)) parsedLinks = parsed.links;
        } catch (err) {
          console.warn('Failed to parse competence-links.json:', err);
        }
      }

      // Ingest any inline linkedCompetenceIds from loaded competences
      const allComps = await loadAllCompetences();
      const existingKeySet = new Set(parsedLinks.map(l => `${String(l.source).trim().toLowerCase()}:::${String(l.target).trim().toLowerCase()}`));

      allComps.forEach(comp => {
        if (Array.isArray(comp.linkedCompetenceIds)) {
          const sourceKey = comp.qualifiedId || comp.id;
          comp.linkedCompetenceIds.forEach(targetId => {
            const sNorm = String(sourceKey).trim().toLowerCase();
            const tNorm = String(targetId).trim().toLowerCase();
            const keyForward = `${sNorm}:::${tNorm}`;
            const keyReverse = `${tNorm}:::${sNorm}`;
            if (!existingKeySet.has(keyForward) && !existingKeySet.has(keyReverse)) {
              parsedLinks.push({
                source: sourceKey,
                target: targetId,
                relation: 'related'
              });
              existingKeySet.add(keyForward);
            }
          });
        }
      });

      _cachedLinks = parsedLinks;
      return _cachedLinks;
    })();

    const res = await _linksLoadingPromise;
    _linksLoadingPromise = null;
    return res;
  }

  async function saveCompetenceLinks(links) {
    _cachedLinks = Array.isArray(links) ? links : [];
    const payload = JSON.stringify({ version: 1, updated: new Date().toISOString(), links: _cachedLinks }, null, 2);
    let saved = false;

    if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.saveText === 'function') {
      try {
        const res = await window.Desktop.saveText('customCompetences', 'competence-links.json', payload);
        if (res && res.ok) saved = true;
      } catch (_) {}
      if (!saved) {
        try {
          const res2 = await window.Desktop.saveText('user', 'competence-links.json', payload);
          if (res2 && res2.ok) saved = true;
        } catch (_) {}
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cmt-competence-links', payload);
        saved = true;
      } catch (_) {}
    }
    return saved;
  }

  async function getLinkedCompetences(compIdOrCode) {
    if (!compIdOrCode) return [];
    const norm = String(compIdOrCode).trim().toLowerCase();
    const allComps = await loadAllCompetences();
    const links = await loadCompetenceLinks();

    // Find the competence matching compIdOrCode
    const comp = allComps.find(c =>
      (c.id && String(c.id).trim().toLowerCase() === norm) ||
      (c.qualifiedId && String(c.qualifiedId).trim().toLowerCase() === norm) ||
      (c.code && String(c.code).trim().toLowerCase() === norm)
    );

    const matchKeys = new Set([norm]);
    if (comp) {
      if (comp.id) matchKeys.add(String(comp.id).trim().toLowerCase());
      if (comp.qualifiedId) matchKeys.add(String(comp.qualifiedId).trim().toLowerCase());
      if (comp.code) matchKeys.add(String(comp.code).trim().toLowerCase());
    }

    const linkedTargetIds = new Set();
    links.forEach(l => {
      const s = String(l.source || '').trim().toLowerCase();
      const t = String(l.target || '').trim().toLowerCase();
      if (matchKeys.has(s) && !matchKeys.has(t)) {
        linkedTargetIds.add(String(l.target || '').trim());
      } else if (matchKeys.has(t) && !matchKeys.has(s)) {
        linkedTargetIds.add(String(l.source || '').trim());
      }
    });

    const result = [];
    const seenResultIds = new Set();
    if (comp && comp.id) seenResultIds.add(comp.id);
    if (comp && comp.qualifiedId) seenResultIds.add(comp.qualifiedId);

    linkedTargetIds.forEach(targetId => {
      const tNorm = targetId.toLowerCase();
      const found = allComps.find(c =>
        (c.qualifiedId && c.qualifiedId.toLowerCase() === tNorm) ||
        (c.id && c.id.toLowerCase() === tNorm) ||
        (c.code && c.code.toLowerCase() === tNorm)
      );
      if (found && !seenResultIds.has(found.id)) {
        seenResultIds.add(found.id);
        result.push(found);
      } else if (!found && !seenResultIds.has(targetId)) {
        seenResultIds.add(targetId);
        result.push({
          id: targetId,
          code: targetId.includes('::') ? targetId.split('::')[1] : targetId,
          title: targetId,
          _sourceDb: targetId.includes('::') ? targetId.split('::')[0] : '',
          category: 'External'
        });
      }
    });

    return result;
  }

  async function addCompetenceLink(idA, idB, relation = 'related') {
    if (!idA || !idB || idA === idB) return false;
    const links = await loadCompetenceLinks();
    const sNorm = String(idA).trim();
    const tNorm = String(idB).trim();
    const exists = links.some(l => {
      const s = String(l.source).trim();
      const t = String(l.target).trim();
      return (s === sNorm && t === tNorm) || (s === tNorm && t === sNorm);
    });
    if (!exists) {
      links.push({ source: sNorm, target: tNorm, relation });
      await saveCompetenceLinks(links);
    }
    return true;
  }

  async function removeCompetenceLink(idA, idB) {
    if (!idA || !idB) return false;
    const links = await loadCompetenceLinks();
    const sNorm = String(idA).trim().toLowerCase();
    const tNorm = String(idB).trim().toLowerCase();
    const filtered = links.filter(l => {
      const ls = String(l.source || '').trim().toLowerCase();
      const lt = String(l.target || '').trim().toLowerCase();
      return !((ls === sNorm && lt === tNorm) || (ls === tNorm && lt === sNorm));
    });
    if (filtered.length !== links.length) {
      await saveCompetenceLinks(filtered);
      return true;
    }
    return false;
  }

  // ── Neobrutalist Linked Competences Prompt Modal ──────────────────────
  let _linkedPromptInjected = false;
  function _ensureLinkedPromptStyles() {
    if (_linkedPromptInjected) return;
    _linkedPromptInjected = true;
    const style = document.createElement('style');
    style.id = 'cmt-linked-prompt-styles';
    style.textContent = `
      .cmt-linked-overlay {
        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55);
        z-index: 100085; display: flex; align-items: center; justify-content: center;
        padding: 16px; box-sizing: border-box;
      }
      .cmt-linked-modal {
        background: #fff; border: 3px solid #000; border-radius: 8px;
        box-shadow: 6px 6px 0px #000; width: min(520px, 95vw);
        max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
        font-family: inherit; color: #111;
      }
      .cmt-linked-hd {
        background: #ffe600; padding: 12px 18px; border-bottom: 3px solid #000;
        display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 1.05rem;
      }
      .cmt-linked-hd img { width: 20px; height: 20px; }
      .cmt-linked-bd {
        padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
      }
      .cmt-linked-card {
        border: 2px solid #000; border-radius: 6px; padding: 10px 12px;
        background: #f8fafc; box-shadow: 2px 2px 0px #000; display: flex;
        align-items: flex-start; gap: 10px; cursor: pointer; transition: background 0.15s;
      }
      .cmt-linked-card:hover { background: #eff6ff; }
      .cmt-linked-card.selected { background: #e0f2fe; border-color: #0284c7; }
      .cmt-linked-badge-code {
        background: #0284c7; color: #fff; border-radius: 4px; padding: 2px 6px;
        font-size: 0.75rem; font-weight: 800; border: 1.5px solid #000;
      }
      .cmt-linked-badge-db {
        background: #f1f5f9; color: #334155; border-radius: 4px; padding: 2px 6px;
        font-size: 0.72rem; font-weight: 700; border: 1px solid #cbd5e1;
      }
      .cmt-linked-dont-ask {
        display: flex; align-items: center; gap: 8px; font-size: 0.8rem;
        color: #475569; font-weight: 600; cursor: pointer; margin-top: 4px;
        user-select: none;
      }
      .cmt-linked-ft {
        padding: 12px 18px; border-top: 2px solid #000; background: #f8fafc;
        display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
      }
      .cmt-linked-btn {
        padding: 8px 16px; border: 2px solid #000; border-radius: 6px;
        font-weight: 800; font-size: 0.85rem; cursor: pointer; font-family: inherit;
        box-shadow: 2px 2px 0px #000; transition: transform 0.1s, box-shadow 0.1s;
      }
      .cmt-linked-btn:hover {
        transform: translate(-1px, -1px); box-shadow: 3px 3px 0px #000;
      }
      .cmt-linked-btn:active {
        transform: translate(1px, 1px); box-shadow: 1px 1px 0px #000;
      }
      .cmt-linked-btn-primary { background: #ffe600; color: #000; }
      .cmt-linked-btn-secondary { background: #fff; color: #000; }
    `;
    document.head.appendChild(style);
  }

  async function promptAddLinkedCompetences(targetComp, currentSelectedIds, options = {}) {
    if (!targetComp) return false;
    const linked = await getLinkedCompetences(targetComp.id || targetComp.qualifiedId || targetComp.code);
    if (!linked || !linked.length) return false;

    // Filter to only those not already selected/tagged
    const selectedSet = new Set(
      Array.isArray(currentSelectedIds)
        ? currentSelectedIds.map(s => String(s).trim().toLowerCase())
        : (currentSelectedIds instanceof Set ? Array.from(currentSelectedIds).map(s => String(s).trim().toLowerCase()) : [])
    );

    const unselectedLinks = linked.filter(l => {
      const id = String(l.id || '').trim().toLowerCase();
      const code = String(l.code || '').trim().toLowerCase();
      const qid = String(l.qualifiedId || '').trim().toLowerCase();
      return !selectedSet.has(id) && !selectedSet.has(code) && !selectedSet.has(qid);
    });

    if (!unselectedLinks.length) return false;

    // Check session preference: "auto-add linked competences"
    const autoAddSession = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('cmt_auto_add_linked_competences') === '1');
    if (autoAddSession) {
      if (typeof options.onAdd === 'function') {
        options.onAdd(unselectedLinks);
      }
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        const tFn = (typeof window.t === 'function') ? window.t : ((k, d) => d);
        const sourceName = targetComp.code || targetComp.title || 'selected';
        const codes = unselectedLinks.map(c => c.code || c.title).join(', ');
        window.showToast(tFn('compLinkedAutoAdded', `Automatically linked ${codes} to match ${sourceName}`).replace('{codes}', codes).replace('{source}', sourceName));
      }
      return true;
    }

    _ensureLinkedPromptStyles();
    const tFn = (typeof window !== 'undefined' && typeof window.t === 'function') ? window.t : ((k, d) => d);

    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'cmt-linked-overlay';

      const selectedMap = new Map();
      unselectedLinks.forEach(c => selectedMap.set(c.id, true));

      const titleText = tFn('compLinkedPromptTitle', 'Linked Competences Detected');
      const targetCode = targetComp.code || targetComp.title || 'Competence';
      const msgText = tFn('compLinkedPromptMsg', `The competence **{code}** is linked with {count} other competence(s). Would you like to add them as well?`)
        .replace('{code}', `<strong>${targetCode}</strong>`)
        .replace('{count}', unselectedLinks.length);

      const cardsHtml = unselectedLinks.map(c => {
        const dbBadge = c._sourceDb ? `<span class="cmt-linked-badge-db">${c._sourceDb}</span>` : '';
        const levelBadge = c.level ? `<span class="cmt-linked-badge-db" style="background:#fef3c7;border-color:#fde68a;">${c.level}</span>` : '';
        return `
          <div class="cmt-linked-card selected" data-cid="${c.id}">
            <input type="checkbox" checked style="cursor:pointer;margin-top:2px;" data-chk-id="${c.id}">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">
                <span class="cmt-linked-badge-code">${c.code || c.id}</span>
                ${dbBadge}
                ${levelBadge}
                <strong style="font-size:0.86rem;">${c.title || ''}</strong>
              </div>
              ${c.description ? `<div style="font-size:0.77rem;color:#64748b;line-height:1.3;max-height:42px;overflow:hidden;text-overflow:ellipsis;">${c.description}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      overlay.innerHTML = `
        <div class="cmt-linked-modal" onclick="event.stopPropagation()">
          <div class="cmt-linked-hd">
            <img src="../assets/icons/award.svg" alt="" onerror="this.style.display='none'">
            <span>${titleText}</span>
          </div>
          <div class="cmt-linked-bd">
            <div style="font-size:0.88rem;line-height:1.45;">${msgText}</div>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding-right:4px;">
              ${cardsHtml}
            </div>
            <label class="cmt-linked-dont-ask">
              <input type="checkbox" id="cmt-linked-dont-ask-chk">
              <span>${tFn('compLinkedDontAskAgain', "Don't ask again this session (auto-add linked)")}</span>
            </label>
          </div>
          <div class="cmt-linked-ft">
            <button type="button" class="cmt-linked-btn cmt-linked-btn-secondary" id="cmt-linked-skip-btn">${tFn('compLinkedBtnSkip', 'Keep Only Selected')}</button>
            <button type="button" class="cmt-linked-btn cmt-linked-btn-primary" id="cmt-linked-add-btn">${tFn('compLinkedBtnAdd', '+ Add Linked Competence(s)')}</button>
          </div>
        </div>
      `;

      function cleanup() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }

      // Card clicks and checkboxes
      overlay.querySelectorAll('.cmt-linked-card').forEach(card => {
        const cid = card.dataset.cid;
        const chk = card.querySelector(`input[data-chk-id="${cid}"]`);
        function toggle() {
          const next = !selectedMap.get(cid);
          selectedMap.set(cid, next);
          if (chk) chk.checked = next;
          card.classList.toggle('selected', next);
        }
        card.addEventListener('click', e => {
          if (e.target === chk) return;
          toggle();
        });
        if (chk) {
          chk.addEventListener('change', () => {
            selectedMap.set(cid, chk.checked);
            card.classList.toggle('selected', chk.checked);
          });
        }
      });

      overlay.querySelector('#cmt-linked-skip-btn').addEventListener('click', () => {
        cleanup();
        if (typeof options.onDismiss === 'function') options.onDismiss();
        resolve(false);
      });

      overlay.querySelector('#cmt-linked-add-btn').addEventListener('click', () => {
        const dontAskChk = overlay.querySelector('#cmt-linked-dont-ask-chk');
        if (dontAskChk && dontAskChk.checked && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('cmt_auto_add_linked_competences', '1');
        }
        const toAdd = unselectedLinks.filter(c => selectedMap.get(c.id) !== false);
        cleanup();
        if (toAdd.length && typeof options.onAdd === 'function') {
          options.onAdd(toAdd);
        }
        resolve(toAdd);
      });

      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          cleanup();
          if (typeof options.onDismiss === 'function') options.onDismiss();
          resolve(false);
        }
      });

      document.body.appendChild(overlay);
    });
  }

  // ── Extract Available Filter Options ────────────────────────────────
  async function getAvailableYearLevels() {
    const list = await loadAllCompetences();
    const set = new Set();
    list.forEach(c => {
      if (c.yearLevel) set.add(c.yearLevel.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  async function getAvailableSubjects() {
    const list = await loadAllCompetences();
    const set = new Set();
    list.forEach(c => {
      if (c.subjectId) set.add(c.subjectId.trim());
      else if (c.category && (c.category.toLowerCase().includes('english') || c.category.toLowerCase().includes('science') || c.category.toLowerCase().includes('math') || c.category.toLowerCase().includes('history') || c.category.toLowerCase().includes('french'))) {
        set.add(c.category.trim());
      }
    });
    return Array.from(set).sort();
  }

  async function getAvailableDomains(filterSubject = null) {
    const list = await loadAllCompetences();
    const set = new Set();
    list.forEach(c => {
      if (filterSubject && filterSubject !== 'all' && c.subjectId && c.subjectId.toLowerCase() !== filterSubject.toLowerCase()) {
        return;
      }
      if (c.category) set.add(c.category.trim());
    });
    return Array.from(set).sort();
  }

  let _cachedGroups = null;

  // ── Resolve Group / Class Metadata ──────────────────────────────────
  async function getAllGroups(forceReload = false) {
    if (_cachedGroups && !forceReload) {
      return _cachedGroups;
    }

    let rawData = null;

    // 1. Check window globals first if already loaded
    if (typeof window !== 'undefined') {
      if (window.CLASS_GROUPS_DATA && typeof window.CLASS_GROUPS_DATA === 'object') {
        rawData = window.CLASS_GROUPS_DATA;
      } else if (window.CLASS_GROUPS_META && typeof window.CLASS_GROUPS_META === 'object') {
        rawData = {
          classGroupsMeta: window.CLASS_GROUPS_META,
          classGroups: (typeof window.CLASS_GROUPS === 'object') ? window.CLASS_GROUPS : {}
        };
      } else if (window.CLASS_GROUPS && typeof window.CLASS_GROUPS === 'object') {
        rawData = {
          classGroups: window.CLASS_GROUPS,
          classGroupsMeta: {}
        };
      }
    }

    // 2. Read from disk via Desktop.readText if in Electron or not yet found
    if (!rawData && typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.readText === 'function') {
      try {
        const r = await window.Desktop.readText('user', 'class-groups.js');
        if (r && r.ok && r.content) {
          try {
            const fn = new Function(
              r.content +
              '\n;try {' +
              '  if (typeof CLASS_GROUPS_DATA !== "undefined" && CLASS_GROUPS_DATA) return CLASS_GROUPS_DATA;' +
              '  if (typeof CLASS_GROUPS_META !== "undefined" && CLASS_GROUPS_META) return { classGroupsMeta: CLASS_GROUPS_META, classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : {}) };' +
              '  if (typeof CLASS_GROUPS !== "undefined" && CLASS_GROUPS) return { classGroups: CLASS_GROUPS, classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : {}) };' +
              '} catch (e) {}' +
              'return {};'
            );
            const parsed = fn();
            if (parsed && typeof parsed === 'object') {
              rawData = parsed;
            }
          } catch (e) {
            console.warn('Failed to parse class-groups.js in CompetenceAggregatorService:', e);
          }
        }
      } catch (err) {
        console.warn('Failed to read class-groups.js in CompetenceAggregatorService:', err);
      }
    }

    // 3. Fallback: try fetch if running in standard browser environment
    if (!rawData && typeof fetch === 'function') {
      try {
        const paths = ['../user/class-groups.js', 'user/class-groups.js', '/user/class-groups.js'];
        for (const p of paths) {
          try {
            const resp = await fetch(p);
            if (resp.ok) {
              const text = await resp.text();
              const fn = new Function(
                text +
                '\n;try {' +
                '  if (typeof CLASS_GROUPS_DATA !== "undefined" && CLASS_GROUPS_DATA) return CLASS_GROUPS_DATA;' +
                '  if (typeof CLASS_GROUPS_META !== "undefined" && CLASS_GROUPS_META) return { classGroupsMeta: CLASS_GROUPS_META, classGroups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : {}) };' +
                '  if (typeof CLASS_GROUPS !== "undefined" && CLASS_GROUPS) return { classGroups: CLASS_GROUPS, classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : {}) };' +
                '} catch (e) {}' +
                'return {};'
              );
              const parsed = fn();
              if (parsed && typeof parsed === 'object') {
                rawData = parsed;
                break;
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    const normalized = {};
    const metaMap = {};

    if (rawData) {
      const rawMeta = rawData.classGroupsMeta || (rawData.classGroups && rawData.classGroupsMeta) || {};
      const rawGroups = rawData.classGroups || (typeof rawData === 'object' && !rawData.classGroupsMeta && !rawData.activeYear ? rawData : {});

      // Ingest modern classGroupsMeta (UUID-keyed)
      if (rawMeta && typeof rawMeta === 'object') {
        for (const [id, m] of Object.entries(rawMeta)) {
          if (!id || id === '_meta' || typeof m !== 'object' || !m) continue;
          const groupObj = {
            id,
            uuid: id,
            name: m.name || id,
            level: m.level !== undefined && m.level !== null ? String(m.level).trim() : '',
            subject: m.subject !== undefined && m.subject !== null ? String(m.subject).trim() : '',
            year: m.year !== undefined && m.year !== null ? String(m.year).trim() : '',
            semester: m.semester !== undefined && m.semester !== null ? m.semester : '',
            students: Array.isArray(m.students) ? m.students : [],
            archived: !!m.archived,
            isAdminGroup: !!m.isAdminGroup,
            halfGroups: m.halfGroups || null,
            rawMeta: m
          };
          groupObj._meta = groupObj;
          normalized[id] = groupObj;
          metaMap[id] = groupObj;
        }
      }

      // Ingest legacy classGroups if any keys were not in classGroupsMeta
      if (rawGroups && typeof rawGroups === 'object') {
        for (const [id, students] of Object.entries(rawGroups)) {
          if (!id || id === '_meta' || id.startsWith('_')) continue;
          if (normalized[id]) {
            if ((!normalized[id].students || !normalized[id].students.length) && Array.isArray(students)) {
              normalized[id].students = students;
            }
          } else {
            const m = (rawMeta && rawMeta[id]) || {};
            const groupObj = {
              id,
              uuid: id,
              name: m.name || id,
              level: m.level !== undefined && m.level !== null ? String(m.level).trim() : '',
              subject: m.subject !== undefined && m.subject !== null ? String(m.subject).trim() : '',
              year: m.year !== undefined && m.year !== null ? String(m.year).trim() : '',
              semester: m.semester !== undefined && m.semester !== null ? m.semester : '',
              students: Array.isArray(students) ? students : (Array.isArray(m.students) ? m.students : []),
              archived: !!m.archived,
              isAdminGroup: !!m.isAdminGroup,
              halfGroups: m.halfGroups || null,
              rawMeta: m
            };
            groupObj._meta = groupObj;
            normalized[id] = groupObj;
            metaMap[id] = groupObj;
          }
        }
      }
    }

    normalized._meta = metaMap;
    _cachedGroups = normalized;
    return normalized;
  }

  async function getGroupMetadata(classId) {
    if (!classId) return null;
    const all = await getAllGroups();
    // 1. Match by key directly (UUID or legacy key)
    let group = (all && all[classId]) || (all && all._meta && all._meta[classId]) || null;

    // 2. If not found by key, search by name or trimmed case-insensitive name
    if (!group && all && typeof all === 'object') {
      const lowerTarget = String(classId).toLowerCase().trim();
      for (const [key, g] of Object.entries(all)) {
        if (key === '_meta' || !g) continue;
        const gName = String(g.name || '').toLowerCase().trim();
        const gId = String(g.id || key).toLowerCase().trim();
        if (gName === lowerTarget || gId === lowerTarget) {
          group = g;
          break;
        }
      }
    }

    if (!group) {
      return {
        classId,
        name: classId,
        level: '',
        subject: '',
        year: '',
        studentCount: 0,
        archived: false,
        rawMeta: null
      };
    }

    const meta = group.rawMeta || group._meta || group;
    const name = group.name || meta.name || classId;
    const level = group.level || ((meta.level !== undefined && meta.level !== null) ? String(meta.level).trim() : '');
    const subject = group.subject || ((meta.subject !== undefined && meta.subject !== null) ? String(meta.subject).trim() : '');
    const year = group.year || (meta.year ? String(meta.year).trim() : '');
    const students = Array.isArray(group.students) ? group.students : (Array.isArray(meta.students) ? meta.students : []);

    return {
      classId: group.id || classId,
      name,
      level,
      subject,
      year,
      studentCount: students.length,
      archived: !!group.archived,
      rawMeta: meta
    };
  }

  // ── Universal Pre-Filtering Helper ──────────────────────────────────
  /**
   * Automatically pre-selects the Subject and Level dropdowns in a modal
   * based on the given classId or classObj.
   *
   * @param {string|object} classContext - classId string or class object
   * @param {object} selectors - { subjectSelectId, yearSelectId, domainSelectId }
   */
  async function applyClassPrefilters(classContext, selectors = {}) {
    if (!classContext) return;
    let meta = null;
    if (typeof classContext === 'object') {
      meta = {
        classId: classContext.id || classContext.classId || '',
        name: classContext.name || '',
        level: String(classContext.level || '').trim(),
        subject: String(classContext.subject || classContext.subjectId || '').trim()
      };
    } else {
      meta = await getGroupMetadata(classContext);
    }
    if (!meta) return;

    // 1. Year / Level Select
    if (selectors.yearSelectId) {
      const yearEl = typeof selectors.yearSelectId === 'string'
        ? document.getElementById(selectors.yearSelectId)
        : selectors.yearSelectId;
      if (yearEl && meta.level) {
        const targetLvl = meta.level.toLowerCase();
        let matched = false;
        for (let i = 0; i < yearEl.options.length; i++) {
          const optVal = (yearEl.options[i].value || '').toLowerCase();
          const optTxt = (yearEl.options[i].textContent || '').toLowerCase();
          if (optVal === targetLvl || optTxt === targetLvl || optVal.includes(targetLvl) || targetLvl.includes(optVal)) {
            yearEl.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (matched && typeof yearEl.onchange === 'function') {
          try { yearEl.onchange(new Event('change')); } catch (_) {}
        }
      }
    }

    // 2. Subject Select
    if (selectors.subjectSelectId) {
      const subjEl = typeof selectors.subjectSelectId === 'string'
        ? document.getElementById(selectors.subjectSelectId)
        : selectors.subjectSelectId;
      if (subjEl && meta.subject) {
        const targetSubj = meta.subject.toLowerCase();
        let matched = false;
        for (let i = 0; i < subjEl.options.length; i++) {
          const optVal = (subjEl.options[i].value || '').toLowerCase();
          const optTxt = (subjEl.options[i].textContent || '').toLowerCase();
          if (optVal === targetSubj || optTxt === targetSubj || optVal.includes(targetSubj) || targetSubj.includes(optVal)) {
            subjEl.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (matched && typeof subjEl.onchange === 'function') {
          try { subjEl.onchange(new Event('change')); } catch (_) {}
        }
      }
    }
  }

  const SUBJECT_SYNONYMS = {
    english: ['anglais', 'en', 'eng'],
    anglais: ['english', 'en', 'eng'],
    french: ['français', 'francais', 'fr'],
    français: ['french', 'francais', 'fr'],
    francais: ['french', 'français', 'fr'],
    german: ['allemand', 'deutsch', 'de', 'ger'],
    allemand: ['german', 'deutsch', 'de', 'ger'],
    deutsch: ['german', 'allemand', 'de', 'ger'],
    italian: ['italien', 'italiano', 'it'],
    italien: ['italian', 'italiano', 'it'],
    italiano: ['italian', 'italien', 'it'],
    spanish: ['espagnol', 'español', 'es'],
    espagnol: ['spanish', 'español', 'es'],
    español: ['spanish', 'espagnol', 'es']
  };

  function matchSubject(s1, s2) {
    if (!s1 || !s2) return false;
    const a = String(s1).trim().toLowerCase();
    const b = String(s2).trim().toLowerCase();
    if (a === 'all' || b === 'all') return true;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const synsA = SUBJECT_SYNONYMS[a] || [];
    if (synsA.includes(b)) return true;
    const synsB = SUBJECT_SYNONYMS[b] || [];
    if (synsB.includes(a)) return true;
    return false;
  }

  function matchYearLevel(y1, y2) {
    if (!y1 || !y2) return true;
    const a = String(y1).trim().toLowerCase();
    const b = String(y2).trim().toLowerCase();
    if (a === 'all' || b === 'all') return true;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const numA = a.match(/\d+/);
    const numB = b.match(/\d+/);
    if (numA && numB && numA[0] === numB[0]) return true;
    return false;
  }

  // ── Main Aggregator: Compile Class Competence Portfolio ─────────────
  /**
   * Scans Planner, Lesson Creator, Board constellations, and Grade Sheet
   * assessments for a specific class, mapping occurrences to master competences.
   *
   * @param {string} classId
   * @param {object} filterOptions - { subject, yearLevel, domain, status, search }
   */
  async function compileGroupCompetencePortfolio(classId, filterOptions = {}) {
    filterOptions = filterOptions || {};
    const [allComps, groupMeta] = await Promise.all([
      loadAllCompetences(),
      getGroupMetadata(classId)
    ]);

    const activeSubject = filterOptions.subject !== undefined
      ? filterOptions.subject
      : ((groupMeta && groupMeta.subject) || 'all');

    const activeYearLevel = filterOptions.yearLevel !== undefined
      ? filterOptions.yearLevel
      : ((groupMeta && groupMeta.level) || 'all');

    // 1. Initialize Coverage Ledger for Master Competences
    const ledger = new Map();
    allComps.forEach(comp => {
      // Check subject match
      if (activeSubject && activeSubject !== 'all') {
        const cSubj = comp.subjectId || comp.category || '';
        if (!matchSubject(activeSubject, cSubj)) return;
      }
      // Check yearLevel match
      if (activeYearLevel && activeYearLevel !== 'all') {
        const cYear = comp.yearLevel || '';
        if (!matchYearLevel(activeYearLevel, cYear)) return;
      }

      ledger.set(comp.id, {
        competence: comp,
        plannedCount: 0,
        deliveredCount: 0,
        assessedCount: 0,
        totalOccurrences: 0,
        latestDate: '',
        history: [],
        averageScorePct: null
      });
    });

    const todayStr = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })();

    // Helper to log an occurrence
    function recordOccurrence(compIdentifier, tool, meta) {
      if (!compIdentifier) return;
      const cleanId = String(compIdentifier).trim();
      let entry = ledger.get(cleanId);
      if (!entry) {
        // Find by code or title in current ledger
        for (const item of ledger.values()) {
          if (item.competence.code.toLowerCase() === cleanId.toLowerCase() ||
              item.competence.title.toLowerCase() === cleanId.toLowerCase()) {
            entry = item;
            break;
          }
        }
      }
      // If not in ledger (e.g. cross-level or unassigned), look in allComps so it is never dropped
      if (!entry) {
        const foundMaster = allComps.find(c => c.id === cleanId ||
          c.code.toLowerCase() === cleanId.toLowerCase() ||
          c.title.toLowerCase() === cleanId.toLowerCase());
        if (foundMaster) {
          entry = {
            competence: foundMaster,
            plannedCount: 0,
            deliveredCount: 0,
            assessedCount: 0,
            totalOccurrences: 0,
            latestDate: '',
            history: [],
            averageScorePct: null
          };
          ledger.set(foundMaster.id, entry);
        }
      }
      if (!entry) return;

      const date = meta.date || '';
      if (date && (!entry.latestDate || date > entry.latestDate)) {
        entry.latestDate = date;
      }
      entry.totalOccurrences++;

      const isUpcoming = Boolean(meta.isUpcoming || (date && date > todayStr));

      if (tool === 'planner') {
        entry.plannedCount++;
      } else if (tool === 'lesson' || tool === 'board') {
        if (isUpcoming) {
          entry.plannedCount++;
        } else {
          entry.deliveredCount++;
        }
      } else if (tool === 'grade-sheet') {
        entry.assessedCount++;
      }

      entry.history.push({
        tool,
        title: meta.title || '',
        date: date,
        details: meta.details || (isUpcoming ? 'Scheduled (Upcoming)' : ''),
        scorePct: meta.scorePct !== undefined ? meta.scorePct : null,
        refId: meta.refId || null,
        isUpcoming
      });
    }

    const plannerEntriesMap = new Map();

    // 2. Query Source A: Planner Entries
    await (async function scanPlanner() {
      const entries = [];

      // A1. In-memory or planner-config.js (legacy/global entries)
      let plannerConfig = null;
      if (typeof window !== 'undefined' && window.PLANNER_CONFIG) {
        plannerConfig = window.PLANNER_CONFIG;
      } else if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.readText === 'function') {
        try {
          const r = await window.Desktop.readText('user', 'planner-config.js');
          if (r && r.ok && r.content) {
            const fn = new Function(r.content + '\n;try{if(typeof PLANNER_CONFIG!=="undefined")return PLANNER_CONFIG;if(typeof window!=="undefined"&&window.PLANNER_CONFIG)return window.PLANNER_CONFIG;}catch(e){}return null;');
            plannerConfig = fn();
          }
        } catch (_) {}
      }
      if (plannerConfig && Array.isArray(plannerConfig.entries)) {
        entries.push(...plannerConfig.entries);
      }

      // A2. Dedicated class planner file: user/planner/${classId}.js
      if (typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.readByPath === 'function') {
        const candidateFiles = new Set([`${classId}.js`]);
        if (groupMeta && groupMeta.classId) candidateFiles.add(`${groupMeta.classId}.js`);
        if (groupMeta && groupMeta.name) candidateFiles.add(`${groupMeta.name}.js`);

        for (const cFile of candidateFiles) {
          try {
            const r = await window.Desktop.readByPath('user', `planner/${cFile}`);
            if (r && r.ok && r.content) {
              const winMock = { PLANNER_ENTRIES_BY_CLASS: {} };
              const fn = new Function('window', r.content + '\n;try{return window.PLANNER_ENTRIES_BY_CLASS || PLANNER_ENTRIES_BY_CLASS;}catch(e){}return null;');
              const byClass = fn(winMock);
              if (byClass && typeof byClass === 'object') {
                Object.values(byClass).forEach(arr => {
                  if (Array.isArray(arr)) entries.push(...arr);
                });
              }
            }
          } catch (_) {}
        }
      }

      // Index and process entries
      const processedEntryIds = new Set();
      entries.forEach(e => {
        if (!e) return;
        const eId = e.id || '';
        if (eId) {
          plannerEntriesMap.set(eId, e);
          if (processedEntryIds.has(eId)) return;
          processedEntryIds.add(eId);
        }

        const belongs = (e.classId === classId) ||
                        (groupMeta && e.classId === groupMeta.name) ||
                        (groupMeta && e.classId === groupMeta.classId) ||
                        (Array.isArray(e.classIds) && (e.classIds.includes(classId) || (groupMeta && (e.classIds.includes(groupMeta.name) || e.classIds.includes(groupMeta.classId)))));
        if (!belongs) return;

        const compIds = Array.isArray(e.competenceIds)
          ? e.competenceIds
          : (Array.isArray(e.competences) ? e.competences.map(c => c.id || c.code || c) : []);

        const isUpcoming = Boolean(e.date && e.date > todayStr);

        compIds.forEach(cid => {
          recordOccurrence(cid, 'planner', {
            date: e.date || '',
            title: e.topic || (typeof t === 'function' ? t('pl_plannedLesson') : 'Planned Lesson'),
            details: e.objective ? `Objective: ${e.objective}` : (isUpcoming ? 'Scheduled Lesson (Upcoming)' : ''),
            refId: e.id,
            isUpcoming
          });
        });
      });
    })();

    // 3. Query Source B: Lesson Creator Plans
    await (async function scanLessonPlans() {
      if (typeof window === 'undefined' || !window.Desktop || typeof window.Desktop.listFiles !== 'function') return;
      try {
        const res = await window.Desktop.listFiles('lessons', { extensions: ['.json'] });
        const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
        for (const item of flist) {
          const fn = typeof item === 'string' ? item : (item && item.filename);
          if (!fn) continue;
          const r = await window.Desktop.readText('lessons', fn);
          if (!r || !r.ok || !r.content) continue;
          try {
            const plan = JSON.parse(r.content);
            if (!plan) continue;
            const matchesPlan = (plan.classId === classId) ||
                                (groupMeta && plan.classId === groupMeta.name) ||
                                (groupMeta && plan.classId === groupMeta.classId);
            if (!matchesPlan) continue;

            const descSet = new Set();
            (plan.descriptorIds || []).forEach(id => descSet.add(id));
            (plan.competenceIds || []).forEach(id => descSet.add(id));
            (plan.sections || []).forEach(sec => {
              (sec.descriptorIds || []).forEach(id => descSet.add(id));
              (sec.competenceIds || []).forEach(id => descSet.add(id));
            });

            const isUpcoming = Boolean(plan.date && plan.date > todayStr);

            descSet.forEach(cid => {
              recordOccurrence(cid, 'lesson', {
                date: plan.date || '',
                title: plan.title || 'Lesson Plan',
                details: plan.subjectId ? `Subject: ${plan.subjectId}` : (isUpcoming ? 'Scheduled Lesson (Upcoming)' : 'Delivered Lesson Plan'),
                refId: plan.id || fn,
                isUpcoming
              });
            });
          } catch (_) {}
        }
      } catch (_) {}
    })();

    // 4. Query Source C: Board Constellations (.cstz and .json)
    await (async function scanBoardSessions() {
      if (typeof window === 'undefined' || !window.Desktop) return;
      try {
        let flist = [];
        if (typeof window.Desktop.listByPath === 'function') {
          const res = await window.Desktop.listByPath('mindmaps', '', { extensions: ['.cstz', '.json'], recursive: false });
          flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
        } else if (typeof window.Desktop.listFiles === 'function') {
          const res = await window.Desktop.listFiles('mindmaps', { extensions: ['.cstz', '.json'] });
          flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
        }

        const targetClassId = String(classId || '').trim();
        const targetClassName = String((groupMeta && groupMeta.name) || '').trim().toLowerCase();
        const targetGroupId = String((groupMeta && groupMeta.classId) || '').trim();

        for (const item of flist) {
          const fn = typeof item === 'string' ? item : (item && (item.filename || item.name || item.relativePath));
          if (!fn) continue;
          if (fn.includes('-Autosave') || fn.includes('.bak')) continue;

          let b = null;
          let manifest = null;

          if (fn.endsWith('.cstz') || fn.endsWith('.zip')) {
            if (typeof window.Desktop.readBoardArchive === 'function') {
              try {
                const arch = await window.Desktop.readBoardArchive('mindmaps', fn);
                if (arch && arch.ok && arch.boardData) {
                  b = arch.boardData;
                  manifest = arch.manifest;
                }
              } catch (_) {}
            }
          } else if (fn.endsWith('.json')) {
            try {
              const r = await window.Desktop.readText('mindmaps', fn);
              if (r && r.ok && r.content) {
                b = JSON.parse(r.content);
              }
            } catch (_) {}
          }

          if (!b) continue;

          // Resolve class of board
          const bClass = String(b._classGroup || b.classGroup || b.activeClassId || b.classId || (b.metadata && b.metadata.classId) || (manifest && manifest.classGroup) || '').trim();
          const pEntryId = String(b._plannerEntryId || (b.manifest && b.manifest.plannerEntryId) || (manifest && manifest.plannerEntryId) || '').trim();

          let matchesBoard = false;
          if (bClass) {
            matchesBoard = (bClass === targetClassId) ||
                           (targetGroupId && bClass === targetGroupId) ||
                           (targetClassName && bClass.toLowerCase() === targetClassName);
          }

          // Check planner entry id (e.g. sched:ge-b464b83f:... or by lookup in plannerEntriesMap)
          if (!matchesBoard && pEntryId) {
            if (pEntryId.startsWith('sched:') && (pEntryId.includes(':' + targetClassId + ':') || (targetGroupId && pEntryId.includes(':' + targetGroupId + ':')))) {
              matchesBoard = true;
            } else if (plannerEntriesMap.has(pEntryId)) {
              const pe = plannerEntriesMap.get(pEntryId);
              if (pe && ((pe.classId === targetClassId) || (targetGroupId && pe.classId === targetGroupId) || (targetClassName && String(pe.classId).toLowerCase() === targetClassName))) {
                matchesBoard = true;
              }
            }
          }

          // Fallback: Check filename or board title for class name
          if (!matchesBoard && targetClassName) {
            const lowTitle = String(b.title || fn).toLowerCase();
            if (lowTitle.includes(targetClassName)) {
              matchesBoard = true;
            }
          }

          if (!matchesBoard) continue;

          // Collect competences from root and all pages / nodes
          const compList = [];
          if (Array.isArray(b.competences)) compList.push(...b.competences);
          if (manifest && Array.isArray(manifest.competences)) compList.push(...manifest.competences);

          if (Array.isArray(b.pages)) {
            b.pages.forEach(p => {
              if (Array.isArray(p.nodes)) {
                p.nodes.forEach(n => {
                  if (Array.isArray(n.competences)) compList.push(...n.competences);
                });
              }
            });
          }
          if (Array.isArray(b.nodes)) {
            b.nodes.forEach(n => {
              if (Array.isArray(n.competences)) compList.push(...n.competences);
            });
          }

          if (compList.length === 0) continue;

          // Determine date
          const dateMatch = String(b.title || fn).match(/^(\d{4}-\d{2}-\d{2})/);
          let sessionDate = dateMatch ? dateMatch[1] : '';
          if (!sessionDate && pEntryId && plannerEntriesMap.has(pEntryId)) {
            const pe = plannerEntriesMap.get(pEntryId);
            if (pe && pe.date) sessionDate = pe.date;
          }
          if (!sessionDate) {
            sessionDate = b.updatedAt ? b.updatedAt.slice(0, 10) : (b.createdAt ? b.createdAt.slice(0, 10) : (b.dateCreated ? b.dateCreated.slice(0, 10) : ''));
          }

          const isUpcoming = Boolean(sessionDate && sessionDate > todayStr);

          compList.forEach(c => {
            const cid = c.id || c.code || c;
            recordOccurrence(cid, 'board', {
              date: sessionDate,
              title: b.title || fn.replace(/\.(cstz|json|zip)$/i, ''),
              details: isUpcoming ? 'Scheduled Board Lesson (Upcoming)' : 'Delivered Board Lesson',
              refId: fn,
              isUpcoming
            });
          });
        }
      } catch (_) {}
    })();

    // 5. Query Source D: Grade Sheet Assessments
    await (async function scanGradeSheet() {
      if (typeof window === 'undefined' || !window.Desktop) return;
      try {
        const targetClassId = String(classId || '').trim();
        const targetClassName = String((groupMeta && groupMeta.name) || '').trim();
        const targetGroupId = String((groupMeta && groupMeta.classId) || '').trim();

        // 1. Search directory structure in grades/ (standard Grade Sheet folders)
        if (typeof window.Desktop.listByPath === 'function') {
          const listRes = await window.Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js', '.json'] });
          const allFiles = Array.isArray(listRes) ? listRes : ((listRes && Array.isArray(listRes.files)) ? listRes.files : []);

          const classFiles = allFiles.filter(f => {
            const fn = typeof f === 'string' ? f : (f && f.filename);
            return fn === '_class.js';
          });

          const matchedSubdirs = new Set();
          for (const cf of classFiles) {
            const rel = typeof cf === 'string' ? cf : (cf && cf.relativePath);
            if (!rel) continue;
            try {
              const r = await window.Desktop.readByPath('grades', rel);
              if (!r || !r.ok || !r.content) continue;
              const fn = new Function('window', r.content + '\n;try{if(typeof GRADE_CLASS!=="undefined")return GRADE_CLASS;if(typeof window!=="undefined"&&window.GRADE_CLASS)return window.GRADE_CLASS;}catch(e){}return null;');
              const cData = fn({});
              if (cData) {
                const cId = String(cData.classId || '').trim();
                const gId = String(cData.groupId || '').trim();
                const cName = String(cData.className || '').trim();
                if ((targetClassId && (cId === targetClassId || gId === targetClassId || cName.toLowerCase() === targetClassId.toLowerCase())) ||
                    (targetClassName && (cName.toLowerCase() === targetClassName.toLowerCase() || gId === targetClassName || cId === targetClassName)) ||
                    (targetGroupId && (gId === targetGroupId || cId === targetGroupId))) {
                  const parts = rel.replace(/\\/g, '/').split('/');
                  parts.pop(); // remove _class.js
                  matchedSubdirs.add(parts.join('/'));
                }
              }
            } catch (_) {}
          }

          const testFiles = allFiles.filter(f => {
            const rel = typeof f === 'string' ? f : (f && f.relativePath);
            if (!rel) return false;
            const normRel = rel.replace(/\\/g, '/');
            const parts = normRel.split('/');
            const fn = parts[parts.length - 1];
            if (fn === '_class.js') return false;
            const folder = parts.slice(0, -1).join('/');
            return matchedSubdirs.has(folder);
          });

          for (const tf of testFiles) {
            const rel = typeof tf === 'string' ? tf : (tf && tf.relativePath);
            if (!rel) continue;
            try {
              const r = await window.Desktop.readByPath('grades', rel);
              if (!r || !r.ok || !r.content) continue;
              const fn = new Function('window', r.content + '\n;try{if(typeof GRADE_TEST_DATA!=="undefined")return GRADE_TEST_DATA;if(typeof window!=="undefined"&&window.GRADE_TEST_DATA)return window.GRADE_TEST_DATA;}catch(e){}return null;');
              const tData = fn({});
              if (!tData || !tData.testConfig) continue;
              const testConfig = tData.testConfig;
              const criteria = Array.isArray(testConfig.criteria) ? testConfig.criteria : [];
              const results = Array.isArray(tData.results) ? tData.results : [];

              criteria.forEach((crit, critIdx) => {
                const compIds = Array.isArray(crit.competenceIds) ? crit.competenceIds : [];
                if (!compIds.length) return;

                let totalPct = 0;
                let scoredCount = 0;
                const minPts = Number(crit.minPoints) || 0;
                const maxPts = Number(crit.maxPoints) || 10;
                const ptRange = (maxPts - minPts) || 1;

                results.forEach(res => {
                  if (!res || !Array.isArray(res.grades)) return;
                  const gVal = res.grades[critIdx];
                  if (gVal !== undefined && gVal !== null && gVal !== '') {
                    const num = Number(gVal);
                    if (!isNaN(num)) {
                      totalPct += Math.max(0, Math.min(100, ((num - minPts) / ptRange) * 100));
                      scoredCount++;
                    }
                  }
                });

                const avgPct = scoredCount > 0 ? Math.round(totalPct / scoredCount) : null;

                compIds.forEach(cid => {
                  recordOccurrence(cid, 'grade-sheet', {
                    date: testConfig.testDate || tData.date || '',
                    title: testConfig.testName || 'Assessment',
                    details: `Criterion: ${crit.name || 'Evaluation'}${avgPct !== null ? ` (Class Mean: ${avgPct}%)` : ''}`,
                    scorePct: avgPct,
                    refId: crit.id || `${rel}_crit_${critIdx}`
                  });
                });
              });
            } catch (_) {}
          }
        }

        // 2. Direct fallback file `${classId}.json` or `${classId}.js`
        if (typeof window.Desktop.readText === 'function') {
          const directFiles = [`${classId}.json`, `${classId}.js`];
          for (const df of directFiles) {
            try {
              const r = await window.Desktop.readText('grades', df);
              if (!r || !r.ok || !r.content) continue;
              let gData = null;
              try { gData = JSON.parse(r.content); } catch (_) {
                const fn = new Function('window', r.content + '\n;try{if(typeof CLASS_GRADES!=="undefined")return CLASS_GRADES;if(typeof window!=="undefined"&&window.CLASS_GRADES)return window.CLASS_GRADES;}catch(e){}return null;');
                gData = fn({});
              }
              if (!gData || !Array.isArray(gData.tests)) continue;
              gData.tests.forEach(test => {
                if (!test || !Array.isArray(test.criteria)) return;
                test.criteria.forEach((crit, critIdx) => {
                  const compIds = Array.isArray(crit.competenceIds) ? crit.competenceIds : [];
                  if (!compIds.length) return;
                  compIds.forEach(cid => {
                    recordOccurrence(cid, 'grade-sheet', {
                      date: test.date || '',
                      title: test.name || 'Assessment',
                      details: `Criterion: ${crit.name || 'Evaluation'}`,
                      scorePct: null,
                      refId: test.id || `direct_${critIdx}`
                    });
                  });
                });
              });
            } catch (_) {}
          }
        }
      } catch (_) {}
    })();

    // 6. Compute Final Statistics & Domain Categories
    const categories = {};
    const timeline = [];
    let total = 0;
    let covered = 0;
    let plannedOnly = 0;
    let delivered = 0;
    let assessed = 0;

    for (const item of ledger.values()) {
      total++;
      const cat = item.competence.category || 'General';
      if (!categories[cat]) categories[cat] = [];

      // Determine Status
      if (item.assessedCount > 0) {
        item.status = 'assessed';
        assessed++;
        covered++;
      } else if (item.deliveredCount > 0) {
        item.status = 'delivered';
        delivered++;
        covered++;
      } else if (item.plannedCount > 0) {
        item.status = 'planned';
        plannedOnly++;
        covered++;
      } else {
        item.status = 'untouched';
      }

      // Calculate average score if assessed
      const scores = item.history.filter(h => h.scorePct !== null).map(h => h.scorePct);
      if (scores.length > 0) {
        item.averageScorePct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }

      // Sort item history descending by date
      item.history.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      categories[cat].push(item);

      // Ingest into global timeline
      item.history.forEach(h => {
        timeline.push({
          competence: item.competence,
          ...h
        });
      });
    }

    // Sort timeline descending by date
    timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

    return {
      classId,
      className: (groupMeta && groupMeta.name) || classId,
      groupLevel: activeYearLevel,
      groupSubject: activeSubject,
      groupMeta,
      stats: {
        total,
        covered,
        plannedOnly,
        delivered,
        assessed,
        untouched: total - covered,
        percentage
      },
      categories,
      timeline
    };
  }

  return {
    loadAllCompetences,
    getAvailableYearLevels,
    getAvailableSubjects,
    getAvailableDomains,
    getAllGroups,
    getGroupMetadata,
    applyClassPrefilters,
    matchSubject,
    matchYearLevel,
    compileGroupCompetencePortfolio,
    loadCompetenceLinks,
    saveCompetenceLinks,
    getLinkedCompetences,
    addCompetenceLink,
    removeCompetenceLink,
    promptAddLinkedCompetences
  };
});
