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
  function normalizeCompetence(item) {
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

    return {
      id,
      code,
      title,
      category,
      subCategory,
      subjectId,
      level,
      yearLevel,
      description,
      tags
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

      function ingest(rawArr) {
        if (!Array.isArray(rawArr)) return;
        for (const r of rawArr) {
          const c = normalizeCompetence(r);
          if (!c) continue;
          if (!compMap.has(c.id)) {
            compMap.set(c.id, c);
          } else {
            // merge non-empty attributes
            const ex = compMap.get(c.id);
            if (!ex.code && c.code) ex.code = c.code;
            if (!ex.title && c.title) ex.title = c.title;
            if (!ex.category && c.category) ex.category = c.category;
            if (!ex.subCategory && c.subCategory) ex.subCategory = c.subCategory;
            if (!ex.subjectId && c.subjectId) ex.subjectId = c.subjectId;
            if (!ex.level && c.level) ex.level = c.level;
            if (!ex.yearLevel && c.yearLevel) ex.yearLevel = c.yearLevel;
            if (!ex.description && c.description) ex.description = c.description;
            if (c.tags.length && !ex.tags.length) ex.tags = c.tags;
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
            if (!fn) continue;
            const r = await window.Desktop.readText('customCompetences', fn);
            if (r && r.ok && r.content) ingest(parseCompetenceFileContent(r.content));
          }
        } catch (_) {}

        try {
          const res = await window.Desktop.listFiles('customDescriptors', { extensions: ['.js', '.json'] });
          const flist = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
          for (const item of flist) {
            const fn = typeof item === 'string' ? item : (item && item.filename);
            if (!fn) continue;
            const r = await window.Desktop.readText('customDescriptors', fn);
            if (r && r.ok && r.content) ingest(parseCompetenceFileContent(r.content));
          }
        } catch (_) {}

        // Root files: lesson-competences.json / lesson-descriptors.json
        try {
          let r = await window.Desktop.readText('user', 'lesson-competences.json');
          if (!r || !r.ok) r = await window.Desktop.readText('user', 'lesson-descriptors.json');
          if (r && r.ok && r.content) ingest(parseCompetenceFileContent(r.content));
        } catch (_) {}
      }

      // 2. Browser localStorage fallback
      if (typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem('cmt-lesson-competences') || localStorage.getItem('cmt-lesson-descriptors');
          if (stored) {
            const p = JSON.parse(stored);
            if (Array.isArray(p)) ingest(p);
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
    compileGroupCompetencePortfolio
  };
});
