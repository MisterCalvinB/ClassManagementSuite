(function () {
  'use strict';

  // ── State Management ──
  var state = {
    students: [],
    adminData: {
      students: {},
      actions: []
    },
    config: {
      acronyms: [],
      infractions: [],
      sanctionTiers: [],
      actionTypes: [],
      columns: [],
      periods: []
    },
    currentGroupId: 'all',
    currentPeriodId: 'all',
    activeTab: 'all',
    searchQuery: '',
    selectedStudentId: null,
    exportCategory: 'all',
    exportFormat: 'html',
    pendingImport: null
  };

  // Helper to check if French language is active
  function isFrench() {
    try {
      return (typeof getLang === 'function' && getLang() === 'fr');
    } catch (e) {
      return false;
    }
  }

  // ── Startup & Data Loading ──
  document.addEventListener('DOMContentLoaded', async function () {
    initDefaults();
    await loadAllData();
    setupEventListeners();
    populateGroupSelector();
    populatePeriodSelector();
    renderAll();
    if (typeof applyTranslations === 'function') applyTranslations();
    if (window._cmtApplyNavBrand) window._cmtApplyNavBrand();
    if (typeof initHamburger === 'function') initHamburger('app-hamburger');
  });

  window.onLanguageChanged = function () {
    populateGroupSelector();
    populatePeriodSelector();
    renderAll();
    if (typeof applyTranslations === 'function') applyTranslations();
  };

  function initDefaults() {
    var defs = window.ADMIN_GROUPS_CONFIG || window.ADMIN_GROUPS_DEFAULTS || {};
    state.config = {
      acronyms: Array.isArray(defs.acronyms) ? JSON.parse(JSON.stringify(defs.acronyms)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.acronyms) || []),
      infractions: Array.isArray(defs.infractions) ? JSON.parse(JSON.stringify(defs.infractions)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.infractions) || []),
      sanctionTiers: Array.isArray(defs.sanctionTiers) ? JSON.parse(JSON.stringify(defs.sanctionTiers)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.sanctionTiers) || []),
      actionTypes: Array.isArray(defs.actionTypes) ? JSON.parse(JSON.stringify(defs.actionTypes)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.actionTypes) || []),
      columns: Array.isArray(defs.columns) ? JSON.parse(JSON.stringify(defs.columns)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.columns) || []),
      periods: Array.isArray(defs.periods) ? JSON.parse(JSON.stringify(defs.periods)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.periods) || [])
    };
  }

  async function loadAllData() {
    try {
      var localCfg = localStorage.getItem('cmt-admin-groups-config');
      if (localCfg) {
        window.ADMIN_GROUPS_CONFIG = JSON.parse(localCfg);
        initDefaults();
      }
    } catch (e) {}

    try {
      if (window.Desktop && Desktop.isElectron()) {
        // 1. Read class-groups.js
        var cgRes = await Desktop.readText('user', 'class-groups.js');
        if (cgRes && cgRes.ok && cgRes.content) {
          evalInContext(cgRes.content);
        }

        // 2. Read students.js
        var stRes = await Desktop.readText('user', 'students.js');
        if (stRes && stRes.ok && stRes.content) {
          evalInContext(stRes.content);
        }

        // 3. Read administrative-groups.json
        var admRes = await Desktop.readText('user', 'administrative-groups.json');
        if (admRes && admRes.ok && admRes.content) {
          try { state.adminData = JSON.parse(admRes.content); } catch (e) {}
        }

        // 4. Read custom config if present
        var cfgRes = await Desktop.readText('user', 'admin-groups-config.js');
        if (cfgRes && cfgRes.ok && cfgRes.content) {
          evalInContext(cfgRes.content);
          initDefaults();
        }
      }
    } catch (err) {
      console.warn('Error loading administrative data files:', err);
    }

    mergeStudentData();
  }

  function evalInContext(code) {
    try {
      var fn = new Function(code);
      fn();
    } catch (e) {
      console.warn('Eval context error:', e);
    }
  }

  function mergeStudentData() {
    var rawStudents = window.STUDENTS_ROSTER || [];
    var classMeta = (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta) || window.CLASS_GROUPS_META || {};
    var adminStudents = (state.adminData && state.adminData.students) || {};

    // Group mapping & student collection
    var studentGroupMap = {};
    var knownStudentsMap = {};

    rawStudents.forEach(function (s) {
      var uuid = s.uuid || s.id;
      if (uuid) knownStudentsMap[uuid] = s;
    });

    Object.keys(classMeta).forEach(function (gId) {
      var grp = classMeta[gId];
      (grp.students || []).forEach(function (sItem) {
        var sUuid = typeof sItem === 'string' ? sItem : (sItem.uuid || sItem.id);
        if (sUuid) {
          studentGroupMap[sUuid] = studentGroupMap[sUuid] || [];
          studentGroupMap[sUuid].push({ id: gId, name: grp.name || gId });
          if (!knownStudentsMap[sUuid]) {
            if (typeof sItem === 'object') {
              knownStudentsMap[sUuid] = sItem;
            } else {
              knownStudentsMap[sUuid] = { uuid: sUuid, firstName: sUuid, lastName: '', adminClass: grp.name || gId };
            }
          }
        }
      });
    });

    // Also include students stored directly in administrative-groups.json
    Object.keys(adminStudents).forEach(function (uuid) {
      if (!knownStudentsMap[uuid]) {
        var adm = adminStudents[uuid];
        knownStudentsMap[uuid] = {
          uuid: uuid,
          firstName: adm.firstName || 'Student',
          lastName: adm.lastName || '',
          dob: adm.dob || '',
          adminClass: adm.adminClass || '',
          sen: adm.sen || false
        };
      }
    });

    var allUuids = Object.keys(knownStudentsMap);
    state.students = allUuids.map(function (uuid) {
      var s = knownStudentsMap[uuid];
      var adm = adminStudents[uuid] || {};
      var groups = studentGroupMap[uuid] || [];

      // Calculate age from DOB
      var dob = s.dob || adm.dob || '';
      var age = calculateAge(dob);

      // Points and infractions
      var infractions = adm.infractions || { lates: 0, missingHomework: 0, missingMaterial: 0, disruptive: 0, dismissals: 0, unexcusedAbsence: 0 };
      var points = calculateDisciplinePoints(infractions);
      var sanction = determineSanctionTier(points);

      return {
        uuid: uuid,
        firstName: s.firstName || adm.firstName || '',
        lastName: s.lastName || adm.lastName || '',
        dob: dob,
        age: age,
        adminClass: s.adminClass || adm.adminClass || (groups[0] ? groups[0].name : ''),
        sen: s.sen || adm.sen || false,
        senDetails: adm.senDetails || (s.sen ? 'SEN' : ''),
        gender: adm.gender || '',
        studentNumber: adm.studentNumber || '',
        regime: adm.regime || 'DP',
        exitPermission: adm.exitPermission || 'AUT',
        guardian1Name: adm.guardian1Name || '',
        guardian1Phone: adm.guardian1Phone || '',
        guardian1Email: adm.guardian1Email || '',
        address: adm.address || '',
        emergencyContact: adm.emergencyContact || '',
        medicalNotes: adm.medicalNotes || '',
        infractions: infractions,
        points: points,
        sanction: sanction,
        groups: groups,
        notes: adm.notes || '',
        customFields: adm.customFields || {}
      };
    });
  }

  function calculateAge(dobStr) {
    if (!dobStr) return '';
    var birth = new Date(dobStr);
    if (isNaN(birth.getTime())) return '';
    var today = new Date();
    var age = today.getFullYear() - birth.getFullYear();
    var m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : '';
  }

  function calculateDisciplinePoints(infractions) {
    if (!infractions) return 0;
    var total = 0;
    (state.config.infractions || []).forEach(function (inf) {
      var count = parseInt(infractions[inf.key] || 0, 10);
      var weight = parseFloat(inf.weight || 1);
      total += count * weight;
    });
    return total;
  }

  function isTierApplicableToPeriod(tier, periodId) {
    if (!tier.periodScope || tier.periodScope === 'all') {
      return true;
    }
    if (tier.periodScope === 'any_period') {
      return true;
    }
    var scopeList = Array.isArray(tier.periodScope) ? tier.periodScope : String(tier.periodScope).split(',').map(function (s) { return s.trim(); });
    if (!periodId || periodId === 'all') {
      return true;
    }
    return scopeList.indexOf(periodId) !== -1;
  }

  function determineSanctionTier(points, periodId) {
    if (points <= 0) return null;
    var tiers = state.config.sanctionTiers || [];
    var pid = periodId || state.currentPeriodId || 'all';
    for (var i = tiers.length - 1; i >= 0; i--) {
      var t = tiers[i];
      if (points >= t.minPoints && isTierApplicableToPeriod(t, pid)) {
        if (t.maxPoints && points > t.maxPoints) continue;
        return t;
      }
    }
    return null;
  }

  function populateGroupSelector() {
    var sel = document.getElementById('groupSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="all">' + t('agFilterAllStudents', 'All Students') + '</option>';

    var classMeta = (window.CLASS_GROUPS_DATA && window.CLASS_GROUPS_DATA.classGroupsMeta) || window.CLASS_GROUPS_META || {};
    Object.keys(classMeta).forEach(function (gId) {
      var grp = classMeta[gId];
      var opt = document.createElement('option');
      opt.value = gId;
      opt.textContent = (grp.name || gId) + ' (' + (grp.students ? grp.students.length : 0) + ')';
      sel.appendChild(opt);
    });
    sel.value = state.currentGroupId;
  }

  function setupEventListeners() {
    // Group select
    var sel = document.getElementById('groupSelect');
    if (sel) {
      sel.addEventListener('change', function () {
        state.currentGroupId = sel.value;
        renderAll();
      });
    }

    // Search
    var searchInput = document.getElementById('studentSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.searchQuery = searchInput.value.trim().toLowerCase();
        renderTable();
      });
    }

    // Tabs
    document.querySelectorAll('.ag-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.ag-tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.activeTab = btn.dataset.tab;
        renderTable();
      });
    });

    // Shortcuts
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveAllData();
      }
    });
  }

  // ── Render KPI Cards ──
  function renderKPIs(filtered) {
    var total = filtered.length;
    var senCount = filtered.filter(function (s) { return s.sen; }).length;
    var withSanctions = filtered.filter(function (s) { return s.points >= 3; }).length;
    var actionsCount = (state.adminData.actions || []).length;
    var missingContacts = filtered.filter(function (s) { return !s.guardian1Phone && !s.guardian1Email; }).length;

    var elTotal = document.getElementById('kpiTotalVal');
    if (elTotal) elTotal.textContent = total;

    var elSen = document.getElementById('kpiSenVal');
    if (elSen) elSen.textContent = senCount;

    var elDisc = document.getElementById('kpiDisciplineVal');
    if (elDisc) elDisc.textContent = withSanctions;

    var elAct = document.getElementById('kpiActionsVal');
    if (elAct) elAct.textContent = actionsCount;

    var elMiss = document.getElementById('kpiMissingVal');
    if (elMiss) elMiss.textContent = missingContacts;
  }

  // ── Filter Students ──
  function getFilteredStudents() {
    return state.students.filter(function (s) {
      // Group filter
      if (state.currentGroupId !== 'all') {
        var inGroup = s.groups.some(function (g) { return g.id === state.currentGroupId; });
        if (!inGroup) return false;
      }
      // Text search
      if (state.searchQuery) {
        var full = (s.firstName + ' ' + s.lastName + ' ' + s.adminClass + ' ' + s.studentNumber).toLowerCase();
        if (full.indexOf(state.searchQuery) === -1) return false;
      }
      return true;
    });
  }

  function isColVisible(key) {
    if (!state.config || !state.config.columns) return true;
    var col = state.config.columns.find(function (c) { return c.key === key; });
    return col ? col.visible !== false : true;
  }

  function getColHeader(key, fallbackEn, fallbackFr) {
    var isFr = isFrench();
    if (!state.config || !state.config.columns) return isFr ? (fallbackFr || fallbackEn) : fallbackEn;
    var col = state.config.columns.find(function (c) { return c.key === key; });
    if (!col) return isFr ? (fallbackFr || fallbackEn) : fallbackEn;
    return isFr ? (col.nameFr || fallbackFr || col.name || fallbackEn) : (col.name || fallbackEn);
  }

  function populatePeriodSelector() {
    var sel = document.getElementById('agPeriodSelect');
    if (!sel) return;
    var isFr = isFrench();
    var periods = (state.config && state.config.periods) || [];
    var html = '<option value="all"' + (state.currentPeriodId === 'all' ? ' selected' : '') + '>' + (isFr ? 'Toute l\'année (Cumulatif)' : 'All Year (Cumulative)') + '</option>';
    periods.forEach(function (p) {
      var pName = isFr ? (p.nameFr || p.name) : p.name;
      var dateRange = '';
      if (p.startDate && p.endDate) {
        dateRange = ' (' + p.startDate + ' → ' + p.endDate + ')';
      }
      html += '<option value="' + escapeHtml(p.id) + '"' + (state.currentPeriodId === p.id ? ' selected' : '') + '>' + escapeHtml(pName + dateRange) + '</option>';
    });
    sel.innerHTML = html;
  }

  window.onPeriodFilterChanged = function (val) {
    state.currentPeriodId = val || 'all';
    renderTable();
  };

  function getStudentPeriodInfractions(student, periodId) {
    if (!student) return {};
    if (!periodId || periodId === 'all') {
      if (student.periods && Object.keys(student.periods).length > 0) {
        var totals = {};
        (state.config.infractions || []).forEach(function (inf) {
          totals[inf.key] = 0;
        });
        Object.keys(student.periods).forEach(function (pid) {
          var pData = student.periods[pid];
          if (pData && pData.infractions) {
            Object.keys(pData.infractions).forEach(function (k) {
              totals[k] = (totals[k] || 0) + (parseInt(pData.infractions[k], 10) || 0);
            });
          }
        });
        return totals;
      }
      return student.infractions || {};
    }

    if (student.periods && student.periods[periodId] && student.periods[periodId].infractions) {
      return student.periods[periodId].infractions;
    }
    return { lates: 0, missingHomework: 0, missingMaterial: 0, disruptive: 0, dismissals: 0, unexcusedAbsence: 0 };
  }

  // ── Render Spreadsheet Table ──
  function renderTable() {
    var container = document.getElementById('agGridContainer');
    if (!container) return;

    var list = getFilteredStudents();
    renderKPIs(list);

    var isFr = isFrench();
    var tab = state.activeTab;
    var html = '<table class="ag-table" id="adminGroupsTable"><thead><tr>';

    // Sticky Name Column
    html += '<th class="col-sticky-name">' + getColHeader('student', 'Student', 'Élève') + '</th>';
    if (isColVisible('adminClass')) html += '<th>' + getColHeader('adminClass', 'Class', 'Classe') + '</th>';

    if (tab === 'all' || tab === 'demographics') {
      if (isColVisible('dob')) html += '<th>' + getColHeader('dob', 'DOB', 'Date naiss.') + '</th>';
      if (isColVisible('age')) html += '<th>' + getColHeader('age', 'Age', 'Âge') + '</th>';
      if (isColVisible('gender')) html += '<th>' + getColHeader('gender', 'Gender', 'Sexe') + '</th>';
      if (isColVisible('regime')) html += '<th>' + getColHeader('regime', 'Regimen', 'Régime') + '</th>';
      if (isColVisible('guardian1Name')) html += '<th>' + getColHeader('guardian1Name', 'Guardian 1', 'Responsable 1') + '</th>';
      if (isColVisible('guardian1Phone')) html += '<th>' + getColHeader('guardian1Phone', 'Phone', 'Téléphone') + '</th>';
      if (isColVisible('guardian1Email')) html += '<th>' + getColHeader('guardian1Email', 'Email', 'Courriel') + '</th>';
    }

    if (tab === 'all' || tab === 'accommodations') {
      if (isColVisible('sen')) html += '<th>' + getColHeader('sen', 'SEN / Accomp.', 'Aménagements') + '</th>';
      if (isColVisible('medicalNotes')) html += '<th>' + getColHeader('medicalNotes', 'Medical / PAI', 'Médical / PAI') + '</th>';
    }

    if (tab === 'all' || tab === 'discipline') {
      if (isColVisible('infractions')) {
        (state.config.infractions || []).forEach(function (inf) {
          var infLabel = isFr ? (inf.nameFr || inf.name) : inf.name;
          html += '<th style="text-align:center;">' + svgIcon(inf.icon || 'note') + ' ' + escapeHtml(infLabel) + '</th>';
        });
      }
      if (isColVisible('points')) html += '<th>' + getColHeader('points', 'Points', 'Points') + '</th>';
      if (isColVisible('sanction')) html += '<th>' + getColHeader('sanction', 'Sanction', 'Sanction') + '</th>';
    }

    var customCols = (state.config.columns || []).filter(function (c) { return c.custom === true && c.visible !== false; });
    customCols.forEach(function (c) {
      var cTitle = isFr ? (c.nameFr || c.name) : c.name;
      html += '<th>' + escapeHtml(cTitle) + '</th>';
    });

    if (isColVisible('actionsHistory')) html += '<th>' + getColHeader('actionsHistory', 'Follow-up Log', 'Journal de suivi') + '</th>';
    if (isColVisible('manage')) html += '<th>' + getColHeader('manage', 'Actions', 'Actions') + '</th>';
    html += '</tr></thead><tbody>';

    if (!list.length) {
      html += '<tr><td colspan="20" style="text-align:center; padding: 24px; color:#94a3b8;">' + t('agNoStudentsFound', 'No students found matching current filters.') + '</td></tr>';
    } else {
      list.forEach(function (s) {
        var actionsCount = getStudentActions(s.uuid).length;
        var pInfractions = getStudentPeriodInfractions(s, state.currentPeriodId);
        var pPoints = calculateDisciplinePoints(pInfractions);
        var pSanction = determineSanctionTier(pPoints);

        html += '<tr data-student-id="' + s.uuid + '">';
        // Sticky name cell
        html += '<td class="col-sticky-name" onclick="window.openStudentProfileModal(\'' + s.uuid + '\')"><span style="color:#0284c7; cursor:pointer; font-weight:800;">' + escapeHtml(s.lastName.toUpperCase() + ' ' + s.firstName) + '</span></td>';
        if (isColVisible('adminClass')) html += '<td>' + escapeHtml(s.adminClass) + '</td>';

        if (tab === 'all' || tab === 'demographics') {
          if (isColVisible('dob')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'dob\', this.textContent)" contenteditable="true">' + escapeHtml(s.dob) + '</td>';
          if (isColVisible('age')) html += '<td>' + escapeHtml(s.age) + '</td>';
          if (isColVisible('gender')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'gender\', this.textContent)" contenteditable="true">' + escapeHtml(s.gender) + '</td>';
          if (isColVisible('regime')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'regime\', this.textContent)" contenteditable="true">' + escapeHtml(s.regime) + '</td>';
          if (isColVisible('guardian1Name')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'guardian1Name\', this.textContent)" contenteditable="true">' + escapeHtml(s.guardian1Name) + '</td>';
          if (isColVisible('guardian1Phone')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'guardian1Phone\', this.textContent)" contenteditable="true">' + escapeHtml(s.guardian1Phone) + '</td>';
          if (isColVisible('guardian1Email')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'guardian1Email\', this.textContent)" contenteditable="true">' + escapeHtml(s.guardian1Email) + '</td>';
        }

        if (tab === 'all' || tab === 'accommodations') {
          var senLabel = s.senDetails || (isFr ? 'PAP/PAI' : 'SEN');
          if (isColVisible('sen')) html += '<td>' + (s.sen ? ('<span class="badge badge-sen">' + svgIcon('award') + ' ' + escapeHtml(senLabel) + '</span>') : '<span style="color:#cbd5e1;">—</span>') + '</td>';
          if (isColVisible('medicalNotes')) html += '<td class="ag-cell-editable" onblur="window.updateStudentField(\'' + s.uuid + '\', \'medicalNotes\', this.textContent)" contenteditable="true">' + escapeHtml(s.medicalNotes) + '</td>';
        }

        if (tab === 'all' || tab === 'discipline') {
          if (isColVisible('infractions')) {
            (state.config.infractions || []).forEach(function (inf) {
              var val = pInfractions[inf.key] || 0;
              html += '<td style="text-align:center;">';
              html += '<div class="ag-counter-cell">';
              html += '<button type="button" class="ag-counter-btn" onclick="window.modInfraction(\'' + s.uuid + '\', \'' + inf.key + '\', -1)">-</button>';
              html += '<span class="ag-counter-val">' + val + '</span>';
              html += '<button type="button" class="ag-counter-btn" onclick="window.modInfraction(\'' + s.uuid + '\', \'' + inf.key + '\', 1)">+</button>';
              html += '</div>';
              html += '</td>';
            });
          }

          // Points
          if (isColVisible('points')) html += '<td><strong>' + pPoints + '</strong></td>';

          // Sanction Tier Badge
          if (isColVisible('sanction')) {
            if (pSanction) {
              var sancName = isFr ? (pSanction.nameFr || pSanction.name) : pSanction.name;
              html += '<td><span class="badge ' + (pSanction.badgeClass || 'badge-tier1') + '">' + svgIcon(pSanction.icon || 'error') + ' ' + escapeHtml(sancName) + '</span></td>';
            } else {
              html += '<td><span class="badge badge-clean">' + svgIcon('check') + ' ' + t('agCleanRecord', 'Clean') + '</span></td>';
            }
          }
        }

        // Custom columns data cells
        customCols.forEach(function (c) {
          var val = (s.customFields && s.customFields[c.key]) || '';
          html += '<td class="ag-cell-editable" onblur="window.updateStudentCustomField(\'' + s.uuid + '\', \'' + c.key + '\', this.textContent)" contenteditable="true">' + escapeHtml(val) + '</td>';
        });

        // Action log count badge
        if (isColVisible('actionsHistory')) html += '<td><button type="button" class="badge badge-action" onclick="window.openStudentProfileModal(\'' + s.uuid + '\', \'actions\')">' + svgIcon('history') + ' ' + actionsCount + ' ' + t('agActionsCount', 'actions') + '</button></td>';

        // Manage button
        if (isColVisible('manage')) html += '<td><button type="button" class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="window.openQuickActionMenu(\'' + s.uuid + '\')">' + svgIcon('plus') + ' ' + t('agLogBtn', 'Log') + '</button></td>';

        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderAll() {
    renderTable();
  }

  // ── Global Window Handlers for Direct UI Interactions ──
  window.modInfraction = function (uuid, key, delta) {
    var student = state.students.find(function (s) { return s.uuid === uuid; });
    if (!student) return;

    var targetPeriod = state.currentPeriodId;
    if (targetPeriod === 'all') {
      var firstPeriod = (state.config.periods && state.config.periods[0] && state.config.periods[0].id) || 'p1';
      targetPeriod = firstPeriod;
    }

    student.periods = student.periods || {};
    student.periods[targetPeriod] = student.periods[targetPeriod] || { infractions: {}, startDate: '', endDate: '' };
    student.periods[targetPeriod].infractions = student.periods[targetPeriod].infractions || {};

    var current = parseInt(student.periods[targetPeriod].infractions[key] || 0, 10);
    student.periods[targetPeriod].infractions[key] = Math.max(0, current + delta);

    // Recalculate overall
    student.infractions = getStudentPeriodInfractions(student, 'all');
    student.points = calculateDisciplinePoints(student.infractions);
    student.sanction = determineSanctionTier(student.points);

    // Update state.adminData
    state.adminData.students = state.adminData.students || {};
    state.adminData.students[uuid] = state.adminData.students[uuid] || {};
    state.adminData.students[uuid].periods = student.periods;
    state.adminData.students[uuid].infractions = student.infractions;

    renderTable();
    autoSave();
  };

  window.updateStudentField = function (uuid, field, val) {
    var student = state.students.find(function (s) { return s.uuid === uuid; });
    if (!student) return;
    student[field] = (val || '').trim();
    if (field === 'dob') student.age = calculateAge(student.dob);

    state.adminData.students = state.adminData.students || {};
    state.adminData.students[uuid] = state.adminData.students[uuid] || {};
    state.adminData.students[uuid][field] = student[field];

    autoSave();
  };

  // ── Disciplinary Action & Follow-up Log ──
  function getStudentActions(uuid) {
    var actions = (state.adminData && state.adminData.actions) || [];
    return actions.filter(function (a) { return a.studentId === uuid; });
  }

  window.openStudentProfileModal = function (uuid, tab) {
    var s = state.students.find(function (st) { return st.uuid === uuid; });
    if (!s) return;
    state.selectedStudentId = uuid;

    var modal = document.getElementById('agStudentModal');
    if (!modal) return;

    document.getElementById('modalStudentName').textContent = s.lastName.toUpperCase() + ' ' + s.firstName + ' (' + s.adminClass + ')';
    renderStudentActionsTimeline(uuid);
    modal.classList.add('active');
  };

  window.closeStudentModal = function () {
    var modal = document.getElementById('agStudentModal');
    if (modal) modal.classList.remove('active');
  };

  function renderStudentActionsTimeline(uuid) {
    var container = document.getElementById('studentTimelineContainer');
    if (!container) return;

    var actions = getStudentActions(uuid);
    actions.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });

    if (!actions.length) {
      container.innerHTML = '<div style="padding: 20px; text-align:center; color:#94a3b8;">' + svgIcon('note') + ' ' + t('agNoActionsLogged', 'No follow-up actions or meetings logged yet.') + '</div>';
      return;
    }

    var isFr = isFrench();
    var html = '<div class="ag-timeline">';
    actions.forEach(function (act) {
      var actType = (state.config.actionTypes || []).find(function (t) { return t.id === act.type; }) || { name: act.type, nameFr: act.type, icon: 'chat' };
      var typeLabel = isFr ? (actType.nameFr || actType.name) : actType.name;

      html += '<div class="ag-timeline-item">';
      html += '<div class="ag-timeline-dot"></div>';
      html += '<div class="ag-timeline-hd">';
      html += '<span class="ag-timeline-type">' + svgIcon(actType.icon || 'chat') + ' ' + escapeHtml(typeLabel) + '</span>';
      html += '<span class="ag-timeline-date">' + escapeHtml(act.date) + (act.time ? (' ' + escapeHtml(act.time)) : '') + '</span>';
      html += '</div>';
      html += '<div style="font-weight:700; font-size:0.84rem; margin-top:2px;">' + escapeHtml(act.title || '') + '</div>';
      if (act.summary) html += '<div class="ag-timeline-summary">' + escapeHtml(act.summary) + '</div>';
      if (act.outcome) html += '<div style="font-size:0.75rem; color:#15803d; margin-top:4px; font-weight:700;">' + svgIcon('check') + ' ' + escapeHtml(act.outcome) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  window.openQuickActionMenu = function (uuid) {
    state.selectedStudentId = uuid;
    var s = state.students.find(function (st) { return st.uuid === uuid; });
    var modal = document.getElementById('agNewActionModal');
    if (!modal || !s) return;

    document.getElementById('newActionStudentTitle').textContent = s.lastName.toUpperCase() + ' ' + s.firstName;
    document.getElementById('newActionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('newActionTitle').value = '';
    document.getElementById('newActionSummary').value = '';

    modal.classList.add('active');
  };

  window.closeNewActionModal = function () {
    var modal = document.getElementById('agNewActionModal');
    if (modal) modal.classList.remove('active');
  };

  window.submitNewAction = function () {
    var uuid = state.selectedStudentId;
    if (!uuid) return;

    var type = document.getElementById('newActionType').value;
    var date = document.getElementById('newActionDate').value || new Date().toISOString().split('T')[0];
    var title = document.getElementById('newActionTitle').value.trim();
    var summary = document.getElementById('newActionSummary').value.trim();

    var isFr = isFrench();
    if (!title) {
      var actObj = state.config.actionTypes.find(function (t) { return t.id === type; }) || {};
      title = (isFr ? actObj.nameFr : actObj.name) || (isFr ? 'Suivi' : 'Follow-up');
    }

    var newAction = {
      id: 'act-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'),
      studentId: uuid,
      type: type,
      date: date,
      title: title,
      summary: summary,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    state.adminData.actions = state.adminData.actions || [];
    state.adminData.actions.push(newAction);

    closeNewActionModal();
    renderTable();
    autoSave();
    if (window.showToast) window.showToast(t('agActionLoggedSuccess', 'Action logged successfully'));
  };

  // ── Persistence & Auto-Save ──
  var autoSaveTimer = null;
  function autoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveAllData, 1000);
  }

  async function saveAllData() {
    try {
      if (window.Desktop && Desktop.isElectron()) {
        // Save administrative-groups.json
        await Desktop.saveText('user', 'administrative-groups.json', JSON.stringify(state.adminData, null, 2));
      }
    } catch (e) {
      console.warn('Failed to persist administrative data:', e);
    }
  }

  // ── Export Modal (Modeled after Participation Tracker) ──
  window.openExportModal = function () {
    var modal = document.getElementById('agExportModal');
    if (modal) modal.classList.add('active');
  };

  window.closeExportModal = function () {
    var modal = document.getElementById('agExportModal');
    if (modal) modal.classList.remove('active');
  };

  window.selectExportCategory = function (cat) {
    state.exportCategory = cat;
    document.querySelectorAll('.ag-export-card').forEach(function (c) {
      c.classList.toggle('selected', c.dataset.cat === cat);
    });
  };

  window.selectExportFormat = function (fmt) {
    state.exportFormat = fmt;
    document.querySelectorAll('.ag-format-pill').forEach(function (p) {
      p.classList.toggle('selected', p.dataset.fmt === fmt);
    });
  };

  window.executeExport = async function () {
    var cat = state.exportCategory || 'all';
    var fmt = state.exportFormat || 'html';
    var students = getFilteredStudents();
    var groupName = state.currentGroupId === 'all' ? 'All_Classes' : (state.currentGroupId);
    var timestamp = new Date().toISOString().split('T')[0];
    var baseFilename = 'administrative_groups_' + groupName + '_' + cat + '_' + timestamp;

    if (fmt === 'xlsx') {
      exportToXlsx(students, cat, baseFilename);
    } else if (fmt === 'csv') {
      exportToCsv(students, cat, baseFilename);
    } else if (fmt === 'html') {
      exportToHtml(students, cat, baseFilename);
    } else if (fmt === 'pdf') {
      window.print();
    } else if (fmt === 'docx') {
      exportToDocx(students, cat, baseFilename);
    }
    closeExportModal();
  };

  function exportToXlsx(students, cat, filename) {
    if (typeof XLSX === 'undefined') {
      alert('XLSX library not loaded');
      return;
    }
    var isFr = isFrench();
    var customCols = (state.config.columns || []).filter(function (c) { return c.custom === true && c.visible !== false; });
    var rows = students.map(function (s) {
      var sancName = s.sanction ? (isFr ? (s.sanction.nameFr || s.sanction.name) : s.sanction.name) : (isFr ? 'RAS' : 'None');
      var item;
      if (isFr) {
        item = {
          'Nom': s.lastName.toUpperCase(),
          'Prénom': s.firstName,
          'Classe': s.adminClass,
          'Date de naissance': s.dob,
          'Âge': s.age,
          'Régime': s.regime,
          'Accompagnement (SEN)': s.sen ? (s.senDetails || 'OUI') : 'NON',
          'Points discipline': s.points,
          'Sanction recommandée': sancName,
          'Responsable 1': s.guardian1Name,
          'Téléphone 1': s.guardian1Phone,
          'Email 1': s.guardian1Email,
          'Notes médicales': s.medicalNotes
        };
      } else {
        item = {
          'Last Name': s.lastName.toUpperCase(),
          'First Name': s.firstName,
          'Class': s.adminClass,
          'Date of Birth': s.dob,
          'Age': s.age,
          'Regimen': s.regime,
          'Accommodations (SEN)': s.sen ? (s.senDetails || 'YES') : 'NO',
          'Discipline Points': s.points,
          'Recommended Sanction': sancName,
          'Guardian 1': s.guardian1Name,
          'Phone': s.guardian1Phone,
          'Email': s.guardian1Email,
          'Medical Notes': s.medicalNotes
        };
      }
      customCols.forEach(function (c) {
        var hName = isFr ? (c.nameFr || c.name) : c.name;
        item[hName] = (s.customFields && s.customFields[c.key]) || '';
      });
      return item;
    });
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Administrative');
    XLSX.writeFile(wb, filename + '.xlsx');
  }

  function exportToCsv(students, cat, filename) {
    var isFr = isFrench();
    var customCols = (state.config.columns || []).filter(function (c) { return c.custom === true && c.visible !== false; });
    var headers = isFr
      ? ['Nom', 'Prénom', 'Classe', 'Date de naissance', 'Âge', 'Régime', 'Aménagements', 'Points discipline', 'Sanction', 'Responsable', 'Téléphone', 'Email', 'Remarques']
      : ['Last Name', 'First Name', 'Class', 'Date of Birth', 'Age', 'Regimen', 'SEN', 'Discipline Points', 'Sanction', 'Guardian', 'Phone', 'Email', 'Remarks'];
    customCols.forEach(function (c) {
      headers.push(isFr ? (c.nameFr || c.name) : c.name);
    });
    var lines = [headers.join(';')];
    students.forEach(function (s) {
      var sancName = s.sanction ? (isFr ? (s.sanction.nameFr || s.sanction.name) : s.sanction.name) : (isFr ? 'RAS' : 'None');
      var row = [
        '"' + s.lastName.toUpperCase() + '"',
        '"' + s.firstName + '"',
        '"' + s.adminClass + '"',
        '"' + s.dob + '"',
        s.age,
        '"' + s.regime + '"',
        s.sen ? '1' : '0',
        s.points,
        '"' + sancName + '"',
        '"' + (s.guardian1Name || '') + '"',
        '"' + (s.guardian1Phone || '') + '"',
        '"' + (s.guardian1Email || '') + '"',
        '"' + (s.medicalNotes || '') + '"'
      ];
      customCols.forEach(function (c) {
        var val = (s.customFields && s.customFields[c.key]) || '';
        row.push('"' + String(val).replace(/"/g, '""') + '"');
      });
      lines.push(row.join(';'));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename + '.csv');
  }

  function exportToHtml(students, cat, filename) {
    var isFr = isFrench();
    var customCols = (state.config.columns || []).filter(function (c) { return c.custom === true && c.visible !== false; });
    var rowsHtml = students.map(function (s) {
      var sancName = s.sanction ? (isFr ? (s.sanction.nameFr || s.sanction.name) : s.sanction.name) : (isFr ? 'RAS' : 'None');
      var tr = '<tr>' +
        '<td contenteditable="true">' + escapeHtml(s.lastName.toUpperCase()) + '</td>' +
        '<td contenteditable="true">' + escapeHtml(s.firstName) + '</td>' +
        '<td contenteditable="true">' + escapeHtml(s.adminClass) + '</td>' +
        '<td contenteditable="true">' + escapeHtml(s.dob) + '</td>' +
        '<td>' + escapeHtml(s.age) + '</td>' +
        '<td contenteditable="true">' + escapeHtml(s.regime) + '</td>' +
        '<td>' + (s.sen ? (isFr ? 'OUI' : 'YES') : (isFr ? 'NON' : 'NO')) + '</td>' +
        '<td><strong>' + s.points + '</strong></td>' +
        '<td>' + escapeHtml(sancName) + '</td>' +
        '<td contenteditable="true">' + escapeHtml(s.guardian1Phone) + '</td>';
      customCols.forEach(function (c) {
        var val = (s.customFields && s.customFields[c.key]) || '';
        tr += '<td contenteditable="true">' + escapeHtml(val) + '</td>';
      });
      tr += '</tr>';
      return tr;
    }).join('');

    var customTh = customCols.map(function (c) {
      return '<th>' + escapeHtml(isFr ? (c.nameFr || c.name) : c.name) + '</th>';
    }).join('');

    var thLabels = isFr
      ? '<th>Nom</th><th>Prénom</th><th>Classe</th><th>Date naiss.</th><th>Âge</th><th>Régime</th><th>Aménagements</th><th>Points</th><th>Sanction</th><th>Téléphone</th>' + customTh
      : '<th>Last Name</th><th>First Name</th><th>Class</th><th>DOB</th><th>Age</th><th>Regimen</th><th>SEN</th><th>Points</th><th>Sanction</th><th>Phone</th>' + customTh;

    var fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(filename) + '</title>' +
      '<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:15px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#f1f5f9;}</style>' +
      '</head><body>' +
      '<h2>' + escapeHtml(filename) + '</h2>' +
      '<p>Exported from Class Management Tools — Administrative Group Management</p>' +
      '<table><thead><tr>' + thLabels + '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '</body></html>';

    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    downloadBlob(blob, filename + '.html');
  }

  function exportToDocx(students, cat, filename) {
    var content = 'Administrative Group Management — ' + filename + '\n\n' +
      students.map(function (s) {
        return s.lastName.toUpperCase() + ' ' + s.firstName + ' (' + s.adminClass + ') — DOB: ' + s.dob + ' | Points: ' + s.points + ' | Phone: ' + s.guardian1Phone;
      }).join('\n');
    var blob = new Blob([content], { type: 'application/msword;charset=utf-8;' });
    downloadBlob(blob, filename + '.doc');
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Import PDF or File directly into grid ──
  window.triggerDirectImport = function () {
    var inp = document.getElementById('agDirectFileInput');
    if (inp) inp.click();
  };

  window.handleDirectFile = async function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file || !window.ImportUtils) return;
    e.target.value = '';

    if (window.showToast) window.showToast(t('agParsingFile', 'Parsing file...'));
    var res = await ImportUtils.parseFile(file);
    if (!res || !res.ok) {
      alert('Failed to parse file: ' + ((res && res.error) || 'Unknown error'));
      return;
    }

    // Auto-map fields using window.IMPORT_MODULE_ADMIN_GROUPS
    var fields = (window.IMPORT_MODULE_ADMIN_GROUPS && window.IMPORT_MODULE_ADMIN_GROUPS.fields) || [];
    var mapping = ImportUtils.autoDetectMapping(res.headers, fields);
    var mapped = ImportUtils.applyMapping(res.rows, res.headers, mapping, fields);

    if (!mapped.length) {
      alert('No data rows found in file.');
      return;
    }

    state.pendingImport = {
      rows: mapped,
      filename: file.name
    };

    openImportConfirmModal();
  };

  function openImportConfirmModal() {
    var modal = document.getElementById('agImportConfirmModal');
    if (!modal) return;

    var count = (state.pendingImport && state.pendingImport.rows && state.pendingImport.rows.length) || 0;
    var banner = document.getElementById('agImportSummaryBanner');
    if (banner) {
      banner.textContent = (isFrench() ? 'Fichier analysé : ' : 'Parsed file: ') + (state.pendingImport.filename || '') + ' (' + count + (isFrench() ? ' élèves détectés)' : ' student rows detected)');
    }

    var pSelect = document.getElementById('agImportPeriodSelect');
    if (pSelect) {
      var isFr = isFrench();
      var periods = (state.config && state.config.periods) || [];
      var html = '';
      periods.forEach(function (p, idx) {
        var pName = isFr ? (p.nameFr || p.name) : p.name;
        html += '<option value="' + escapeHtml(p.id) + '"' + (idx === 0 ? ' selected' : '') + '>' + escapeHtml(pName) + '</option>';
      });
      html += '<option value="new_period">' + (isFr ? '+ Nouvelle période...' : '+ New Period...') + '</option>';
      pSelect.innerHTML = html;
    }

    // Set dates from first period
    var periods = (state.config && state.config.periods) || [];
    var firstP = periods[0] || {};
    var startInp = document.getElementById('agImportStartDate');
    var endInp = document.getElementById('agImportEndDate');
    if (startInp) startInp.value = firstP.startDate || '';
    if (endInp) endInp.value = firstP.endDate || '';

    modal.classList.add('active');
  }

  window.closeImportConfirmModal = function () {
    var modal = document.getElementById('agImportConfirmModal');
    if (modal) modal.classList.remove('active');
    state.pendingImport = null;
  };

  window.onImportPeriodSelectChange = function (val) {
    if (val === 'new_period') {
      var startInp = document.getElementById('agImportStartDate');
      var endInp = document.getElementById('agImportEndDate');
      if (startInp) startInp.value = '';
      if (endInp) endInp.value = '';
    } else {
      var p = (state.config && state.config.periods && state.config.periods.find(function (item) { return item.id === val; }));
      if (p) {
        var startInp = document.getElementById('agImportStartDate');
        var endInp = document.getElementById('agImportEndDate');
        if (startInp) startInp.value = p.startDate || '';
        if (endInp) endInp.value = p.endDate || '';
      }
    }
  };

  window.executeConfirmedImport = function () {
    if (!state.pendingImport || !state.pendingImport.rows) {
      window.closeImportConfirmModal();
      return;
    }

    var modeEl = document.querySelector('input[name="agImportMode"]:checked');
    var mode = modeEl ? modeEl.value : 'add'; // 'add' or 'overwrite'

    var pSelect = document.getElementById('agImportPeriodSelect');
    var periodId = pSelect ? pSelect.value : 'p1';
    var startInp = document.getElementById('agImportStartDate');
    var endInp = document.getElementById('agImportEndDate');
    var startDate = startInp ? startInp.value : '';
    var endDate = endInp ? endInp.value : '';

    if (periodId === 'new_period') {
      periodId = 'p_' + Date.now().toString(36);
      state.config.periods = state.config.periods || [];
      state.config.periods.push({
        id: periodId,
        name: 'Period ' + (state.config.periods.length + 1),
        nameFr: 'Période ' + (state.config.periods.length + 1),
        startDate: startDate,
        endDate: endDate
      });
      populatePeriodSelector();
    }

    var mapped = state.pendingImport.rows;

    mapped.forEach(function (row) {
      var firstName = (row.firstName || '').trim().toUpperCase();
      var lastName = (row.lastName || '').trim().toUpperCase();
      if (!firstName && !lastName) return;

      var match = state.students.find(function (s) {
        return s.firstName.toUpperCase() === firstName && s.lastName.toUpperCase() === lastName;
      });

      var rowInfractions = {
        lates: parseInt(row.lates, 10) || 0,
        missingHomework: parseInt(row.missingHomework, 10) || 0,
        missingMaterial: parseInt(row.missingMaterial, 10) || 0,
        disruptive: parseInt(row.disruptive, 10) || 0,
        dismissals: parseInt(row.dismissals, 10) || 0,
        unexcusedAbsence: parseInt(row.unexcusedAbsence, 10) || 0
      };

      if (match) {
        if (row.dob) match.dob = row.dob;
        if (row.gender) match.gender = row.gender;
        if (row.regime) match.regime = row.regime;
        if (row.guardian1Name) match.guardian1Name = row.guardian1Name;
        if (row.guardian1Phone) match.guardian1Phone = row.guardian1Phone;
        if (row.guardian1Email) match.guardian1Email = row.guardian1Email;
        if (row.medicalNotes) match.medicalNotes = row.medicalNotes;
        if (row.sen) match.sen = true;
        if (row.senDetails) match.senDetails = row.senDetails;

        match.periods = match.periods || {};
        match.periods[periodId] = match.periods[periodId] || { infractions: {}, startDate: startDate, endDate: endDate };

        if (mode === 'add') {
          var existInf = match.periods[periodId].infractions || {};
          Object.keys(rowInfractions).forEach(function (k) {
            existInf[k] = (parseInt(existInf[k], 10) || 0) + (rowInfractions[k] || 0);
          });
          match.periods[periodId].infractions = existInf;
        } else {
          // Overwrite mode
          match.periods[periodId].infractions = rowInfractions;
        }

        match.periods[periodId].startDate = startDate;
        match.periods[periodId].endDate = endDate;
        match.infractions = getStudentPeriodInfractions(match, 'all');
        match.points = calculateDisciplinePoints(match.infractions);
        match.sanction = determineSanctionTier(match.points);

        state.adminData.students = state.adminData.students || {};
        state.adminData.students[match.uuid] = state.adminData.students[match.uuid] || {};
        state.adminData.students[match.uuid].periods = match.periods;
        state.adminData.students[match.uuid].infractions = match.infractions;
      } else {
        var newUuid = 'st-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
        var initialPeriods = {};
        initialPeriods[periodId] = {
          infractions: rowInfractions,
          startDate: startDate,
          endDate: endDate
        };

        var newSt = {
          uuid: newUuid,
          firstName: row.firstName || '',
          lastName: row.lastName || '',
          dob: row.dob || '',
          age: calculateAge(row.dob),
          adminClass: row.adminClass || state.currentGroupId || '',
          sen: !!row.sen,
          senDetails: row.senDetails || '',
          gender: row.gender || '',
          studentNumber: row.studentNumber || '',
          regime: row.regime || 'DP',
          exitPermission: row.exitPermission || 'AUT',
          guardian1Name: row.guardian1Name || '',
          guardian1Phone: row.guardian1Phone || '',
          guardian1Email: row.guardian1Email || '',
          address: row.address || '',
          emergencyContact: row.emergencyContact || '',
          medicalNotes: row.medicalNotes || '',
          infractions: rowInfractions,
          periods: initialPeriods,
          points: calculateDisciplinePoints(rowInfractions),
          sanction: determineSanctionTier(calculateDisciplinePoints(rowInfractions)),
          groups: state.currentGroupId !== 'all' ? [{ id: state.currentGroupId, name: state.currentGroupId }] : [],
          notes: '',
          customFields: {}
        };
        state.students.push(newSt);

        state.adminData.students = state.adminData.students || {};
        state.adminData.students[newUuid] = {
          periods: initialPeriods,
          infractions: rowInfractions,
          customFields: {}
        };
      }
    });

    window.closeImportConfirmModal();
    renderTable();
    autoSave();
    if (window.showToast) window.showToast(t('agImportSuccess', 'Imported data rows successfully'));
  };

  // ── Settings Modal & Rules Config ──
  var activeSettingsTab = 'infractions';

  window.openSettingsModal = function () {
    state.tempConfig = JSON.parse(JSON.stringify(state.config));
    window.switchSettingsTab(activeSettingsTab || 'infractions');
    var modal = document.getElementById('agSettingsModal');
    if (modal) modal.classList.add('active');
  };

  window.closeSettingsModal = function () {
    var modal = document.getElementById('agSettingsModal');
    if (modal) modal.classList.remove('active');
  };

  window.switchSettingsTab = function (tab) {
    activeSettingsTab = tab;
    document.querySelectorAll('[data-cfg-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-cfg-tab') === tab);
    });
    document.querySelectorAll('.cfg-tab-pane').forEach(function (pane) {
      pane.style.display = 'none';
    });

    if (tab === 'infractions') {
      var p = document.getElementById('cfgTabContentInfractions');
      if (p) p.style.display = 'block';
      renderSettingsInfractions();
    } else if (tab === 'sanctions') {
      var p = document.getElementById('cfgTabContentSanctions');
      if (p) p.style.display = 'block';
      renderSettingsSanctions();
    } else if (tab === 'acronyms') {
      var p = document.getElementById('cfgTabContentAcronyms');
      if (p) p.style.display = 'block';
      renderSettingsAcronyms();
    } else if (tab === 'columns') {
      var p = document.getElementById('cfgTabContentColumns');
      if (p) p.style.display = 'block';
      renderSettingsColumns();
    } else if (tab === 'periods') {
      var p = document.getElementById('cfgTabContentPeriods');
      if (p) p.style.display = 'block';
      renderSettingsPeriods();
    }
  };

  function renderSettingsPeriods() {
    var tbody = document.getElementById('cfgPeriodsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.periods) || [];
    var html = '';
    list.forEach(function (p, idx) {
      html += '<tr>';
      html += '<td><input type="text" class="ag-input" style="width:80px; font-weight:800;" value="' + escapeHtml(p.id || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'id\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(p.name || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(p.nameFr || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td><input type="date" class="ag-input" style="width:130px;" value="' + (p.startDate || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'startDate\', this.value)"></td>';
      html += '<td><input type="date" class="ag-input" style="width:130px;" value="' + (p.endDate || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'endDate\', this.value)"></td>';
      html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeSettingPeriod(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.updateTempPeriod = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.periods && state.tempConfig.periods[idx]) {
      state.tempConfig.periods[idx][field] = val;
    }
  };

  window.addSettingPeriod = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.periods = state.tempConfig.periods || [];
    var num = state.tempConfig.periods.length + 1;
    state.tempConfig.periods.push({
      id: 'p' + num,
      name: 'Period ' + num,
      nameFr: 'Période ' + num,
      startDate: '',
      endDate: ''
    });
    renderSettingsPeriods();
  };

  window.removeSettingPeriod = function (idx) {
    if (state.tempConfig && state.tempConfig.periods) {
      state.tempConfig.periods.splice(idx, 1);
      renderSettingsPeriods();
    }
  };

  window.generatePeriodsPreset = function (type, customCount) {
    state.tempConfig = state.tempConfig || {};
    if (type === 'trimesters') {
      state.tempConfig.periods = [
        { id: 't1', name: 'Trimester 1 (T1)', nameFr: 'Trimestre 1 (T1)', startDate: '2025-09-01', endDate: '2025-11-28' },
        { id: 't2', name: 'Trimester 2 (T2)', nameFr: 'Trimestre 2 (T2)', startDate: '2025-12-01', endDate: '2026-02-27' },
        { id: 't3', name: 'Trimester 3 (T3)', nameFr: 'Trimestre 3 (T3)', startDate: '2026-03-02', endDate: '2026-07-04' }
      ];
    } else if (type === 'semesters') {
      state.tempConfig.periods = [
        { id: 's1', name: 'Semester 1 (S1)', nameFr: 'Semestre 1 (S1)', startDate: '2025-09-01', endDate: '2026-01-23' },
        { id: 's2', name: 'Semester 2 (S2)', nameFr: 'Semestre 2 (S2)', startDate: '2026-01-26', endDate: '2026-07-04' }
      ];
    } else if (type === 'custom' || typeof type === 'number' || !isNaN(parseInt(type, 10))) {
      var n = parseInt(customCount || type, 10) || 4;
      n = Math.max(1, Math.min(20, n));
      var periods = [];
      for (var i = 1; i <= n; i++) {
        periods.push({
          id: 'p' + i,
          name: 'Period ' + i + ' (P' + i + ')',
          nameFr: 'Période ' + i + ' (P' + i + ')',
          startDate: '',
          endDate: ''
        });
      }
      state.tempConfig.periods = periods;
    }
    renderSettingsPeriods();
  };

  function renderSettingsColumns() {
    var tbody = document.getElementById('cfgColumnsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.columns) || [];
    var html = '';
    list.forEach(function (col, idx) {
      var isLocked = col.locked === true;
      var isCustom = col.custom === true;
      html += '<tr>';
      html += '<td style="text-align:center;"><input type="checkbox" style="width:18px; height:18px; cursor:pointer;" ' + (col.visible !== false ? 'checked' : '') + (isLocked ? ' disabled' : '') + ' onchange="window.toggleTempColumn(' + idx + ', this.checked)"></td>';
      if (isCustom) {
        html += '<td><input type="text" class="ag-input" style="width:110px; font-weight:800;" value="' + escapeHtml(col.key || '') + '" onchange="window.updateTempColumnHeader(' + idx + ', \'key\', this.value)"></td>';
      } else {
        html += '<td><code style="font-size:0.8rem; font-weight:800;">' + escapeHtml(col.key) + '</code></td>';
      }
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(col.name || '') + '" onchange="window.updateTempColumnHeader(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(col.nameFr || '') + '" onchange="window.updateTempColumnHeader(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td><span class="badge" style="background:' + (isCustom ? '#fef08a' : '#f1f5f9') + '; text-transform:uppercase;">' + escapeHtml(col.group || (isCustom ? 'custom' : 'general')) + '</span></td>';
      if (isCustom) {
        html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeCustomColumn(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      } else {
        html += '<td style="text-align:center; color:#94a3b8;">—</td>';
      }
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.toggleTempColumn = function (idx, isChecked) {
    if (state.tempConfig && state.tempConfig.columns && state.tempConfig.columns[idx]) {
      state.tempConfig.columns[idx].visible = isChecked;
    }
  };

  window.updateTempColumnHeader = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.columns && state.tempConfig.columns[idx]) {
      state.tempConfig.columns[idx][field] = val;
    }
  };

  window.addCustomColumn = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.columns = state.tempConfig.columns || [];
    var id = 'custom_' + Date.now().toString(36);
    state.tempConfig.columns.push({
      key: id,
      name: 'Custom Field',
      nameFr: 'Champ personnalisé',
      visible: true,
      locked: false,
      custom: true,
      group: 'custom'
    });
    renderSettingsColumns();
  };

  window.removeCustomColumn = function (idx) {
    if (state.tempConfig && state.tempConfig.columns) {
      state.tempConfig.columns.splice(idx, 1);
      renderSettingsColumns();
    }
  };

  window.toggleAllColumns = function (show) {
    if (state.tempConfig && state.tempConfig.columns) {
      state.tempConfig.columns.forEach(function (col) {
        if (!col.locked) col.visible = show;
      });
      renderSettingsColumns();
    }
  };

  window.updateStudentCustomField = function (uuid, key, val) {
    var student = state.students.find(function (s) { return s.uuid === uuid; });
    if (!student) return;
    student.customFields = student.customFields || {};
    student.customFields[key] = (val || '').trim();

    state.adminData.students = state.adminData.students || {};
    state.adminData.students[uuid] = state.adminData.students[uuid] || {};
    state.adminData.students[uuid].customFields = student.customFields;

    autoSave();
  };

  function renderSettingsInfractions() {
    var tbody = document.getElementById('cfgInfractionsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.infractions) || [];
    var html = '';
    list.forEach(function (inf, idx) {
      html += '<tr>';
      html += '<td><input type="text" class="ag-input" style="width:60px; text-align:center;" value="' + escapeHtml(inf.icon || 'note') + '" onchange="window.updateTempInfraction(' + idx + ', \'icon\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:120px;" value="' + escapeHtml(inf.key || '') + '" onchange="window.updateTempInfraction(' + idx + ', \'key\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%;" value="' + escapeHtml(inf.name || '') + '" onchange="window.updateTempInfraction(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%;" value="' + escapeHtml(inf.nameFr || '') + '" onchange="window.updateTempInfraction(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td><input type="number" class="ag-input" style="width:70px; text-align:center;" min="0" max="50" step="0.5" value="' + (inf.weight || 1) + '" onchange="window.updateTempInfraction(' + idx + ', \'weight\', parseFloat(this.value)||1)"></td>';
      html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeSettingInfraction(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.updateTempInfraction = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.infractions && state.tempConfig.infractions[idx]) {
      state.tempConfig.infractions[idx][field] = val;
    }
  };

  window.addSettingInfraction = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.infractions = state.tempConfig.infractions || [];
    var newKey = 'infraction_' + (state.tempConfig.infractions.length + 1);
    state.tempConfig.infractions.push({
      key: newKey,
      name: 'New Infraction',
      nameFr: 'Nouvelle infraction',
      weight: 1,
      icon: 'note'
    });
    renderSettingsInfractions();
  };

  window.removeSettingInfraction = function (idx) {
    if (state.tempConfig && state.tempConfig.infractions) {
      state.tempConfig.infractions.splice(idx, 1);
      renderSettingsInfractions();
    }
  };

  // ── Period Chips Popup for Sanction Scope ──
  state.activeEditingSanctionIdx = null;
  state.tempSelectedPeriodScope = 'all';

  window.openPeriodChipsModal = function (idx) {
    state.activeEditingSanctionIdx = idx;
    var sanc = (state.tempConfig && state.tempConfig.sanctionTiers && state.tempConfig.sanctionTiers[idx]) || {};
    var rawScope = sanc.periodScope || 'all';

    if (rawScope === 'all' || rawScope === 'any_period') {
      state.tempSelectedPeriodScope = rawScope;
    } else {
      var arr = Array.isArray(rawScope) ? rawScope : String(rawScope).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      state.tempSelectedPeriodScope = arr;
    }

    renderPeriodChipsModalContent();
    var modal = document.getElementById('agPeriodChipsModal');
    if (modal) modal.classList.add('active');
  };

  window.closePeriodChipsModal = function () {
    var modal = document.getElementById('agPeriodChipsModal');
    if (modal) modal.classList.remove('active');
    state.activeEditingSanctionIdx = null;
  };

  function renderPeriodChipsModalContent() {
    var isFr = isFrench();
    var periods = (state.tempConfig && state.tempConfig.periods) || [];
    var wholeYearBtn = document.getElementById('chipPresetWholeYear');
    var eachPeriodBtn = document.getElementById('chipPresetEachPeriod');

    var isAll = state.tempSelectedPeriodScope === 'all';
    var isAny = state.tempSelectedPeriodScope === 'any_period';

    if (wholeYearBtn) wholeYearBtn.classList.toggle('active', isAll);
    if (eachPeriodBtn) eachPeriodBtn.classList.toggle('active', isAny);

    var container = document.getElementById('agPeriodChipsContainer');
    if (!container) return;

    if (!periods.length) {
      container.innerHTML = '<span style="font-size:0.8rem; color:#94a3b8;">' + (isFr ? 'Aucune période configurée dans l\'onglet Périodes.' : 'No periods configured in Periods tab.') + '</span>';
      return;
    }

    var html = '';
    var activeArr = Array.isArray(state.tempSelectedPeriodScope) ? state.tempSelectedPeriodScope : [];

    periods.forEach(function (p) {
      var pName = isFr ? (p.nameFr || p.name) : p.name;
      var isChipActive = activeArr.indexOf(p.id) !== -1;

      html += '<button type="button" class="ag-period-chip' + (isChipActive ? ' active' : '') + '" onclick="window.togglePeriodChip(\'' + escapeHtml(p.id) + '\')">';
      html += (isChipActive ? svgIcon('check') : '') + ' <span>' + escapeHtml(p.id.toUpperCase() + ': ' + pName) + '</span>';
      html += '</button>';
    });

    container.innerHTML = html;
  }

  window.selectPeriodChipPreset = function (preset) {
    state.tempSelectedPeriodScope = preset;
    renderPeriodChipsModalContent();
  };

  window.togglePeriodChip = function (pid) {
    if (state.tempSelectedPeriodScope === 'all' || state.tempSelectedPeriodScope === 'any_period') {
      state.tempSelectedPeriodScope = [pid];
    } else {
      var arr = Array.isArray(state.tempSelectedPeriodScope) ? state.tempSelectedPeriodScope.slice() : [];
      var pos = arr.indexOf(pid);
      if (pos !== -1) {
        arr.splice(pos, 1);
        if (arr.length === 0) {
          state.tempSelectedPeriodScope = 'all';
        } else {
          state.tempSelectedPeriodScope = arr;
        }
      } else {
        arr.push(pid);
        state.tempSelectedPeriodScope = arr;
      }
    }
    renderPeriodChipsModalContent();
  };

  window.applyPeriodChipsSelection = function () {
    if (state.activeEditingSanctionIdx != null && state.tempConfig && state.tempConfig.sanctionTiers && state.tempConfig.sanctionTiers[state.activeEditingSanctionIdx]) {
      var finalScope = 'all';
      if (state.tempSelectedPeriodScope === 'all' || state.tempSelectedPeriodScope === 'any_period') {
        finalScope = state.tempSelectedPeriodScope;
      } else if (Array.isArray(state.tempSelectedPeriodScope)) {
        finalScope = state.tempSelectedPeriodScope.length ? state.tempSelectedPeriodScope.join(',') : 'all';
      }
      state.tempConfig.sanctionTiers[state.activeEditingSanctionIdx].periodScope = finalScope;
    }
    window.closePeriodChipsModal();
    renderSettingsSanctions();
  };

  function renderSettingsSanctions() {
    var tbody = document.getElementById('cfgSanctionsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.sanctionTiers) || [];
    var periods = (state.tempConfig && state.tempConfig.periods) || [];
    var isFr = isFrench();
    var html = '';
    list.forEach(function (sanc, idx) {
      var currentScope = sanc.periodScope || 'all';

      // Scope Badge trigger
      var scopeDisplay = '';
      if (currentScope === 'all') {
        scopeDisplay = '<span class="badge" style="background:#fef08a; color:#000;">' + (isFr ? 'Toute l\'année' : 'Whole Year') + '</span>';
      } else if (currentScope === 'any_period') {
        scopeDisplay = '<span class="badge" style="background:#e0f2fe; color:#000;">' + (isFr ? 'Chaque période' : 'Each Period') + '</span>';
      } else {
        var parts = String(currentScope).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        scopeDisplay = parts.map(function (pid) {
          var pObj = periods.find(function (p) { return p.id === pid; });
          var lbl = pObj ? (isFr ? (pObj.nameFr || pObj.name) : pObj.name) : pid.toUpperCase();
          return '<span class="badge" style="background:#dcfce7; color:#000;">' + escapeHtml(lbl) + '</span>';
        }).join(' ');
      }

      html += '<tr>';
      html += '<td><input type="number" class="ag-input" style="width:65px; text-align:center;" min="1" max="999" value="' + (sanc.minPoints || 0) + '" onchange="window.updateTempSanction(' + idx + ', \'minPoints\', parseInt(this.value,10)||0)"></td>';
      html += '<td><input type="number" class="ag-input" style="width:65px; text-align:center;" min="1" max="999" value="' + (sanc.maxPoints || 999) + '" onchange="window.updateTempSanction(' + idx + ', \'maxPoints\', parseInt(this.value,10)||999)"></td>';
      
      // Period Scope Trigger Button
      html += '<td><button type="button" class="ag-scope-trigger" style="width:100%; justify-content:space-between;" onclick="window.openPeriodChipsModal(' + idx + ')">' +
        '<span>' + scopeDisplay + '</span>' +
        '<span style="font-size:0.7rem; color:#475569; margin-left:4px; display:inline-flex; align-items:center;">' + svgIcon('edit-word') + '</span>' +
        '</button></td>';

      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(sanc.name || '') + '" onchange="window.updateTempSanction(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(sanc.nameFr || '') + '" onchange="window.updateTempSanction(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td><select class="ag-select" style="width:100%;" onchange="window.updateTempSanction(' + idx + ', \'badgeClass\', this.value)">' +
        '<option value="badge-tier1"' + (sanc.badgeClass==='badge-tier1'?' selected':'') + '>Yellow (Tier 1)</option>' +
        '<option value="badge-tier2"' + (sanc.badgeClass==='badge-tier2'?' selected':'') + '>Orange (Tier 2)</option>' +
        '<option value="badge-tier3"' + (sanc.badgeClass==='badge-tier3'?' selected':'') + '>Red-Orange (Tier 3)</option>' +
        '<option value="badge-tier4"' + (sanc.badgeClass==='badge-tier4'?' selected':'') + '>Red (Tier 4)</option>' +
        '</select></td>';
      html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeSettingSanction(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.updateTempSanction = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.sanctionTiers && state.tempConfig.sanctionTiers[idx]) {
      state.tempConfig.sanctionTiers[idx][field] = val;
    }
  };

  window.addSettingSanction = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.sanctionTiers = state.tempConfig.sanctionTiers || [];
    var last = state.tempConfig.sanctionTiers[state.tempConfig.sanctionTiers.length - 1];
    var min = last ? (last.maxPoints + 1) : 3;
    state.tempConfig.sanctionTiers.push({
      id: 'tier_' + Date.now(),
      minPoints: min,
      maxPoints: min + 3,
      periodScope: 'all',
      name: 'New Sanction Action',
      nameFr: 'Nouvelle mesure',
      icon: 'error',
      badgeClass: 'badge-tier2'
    });
    renderSettingsSanctions();
  };

  window.removeSettingSanction = function (idx) {
    if (state.tempConfig && state.tempConfig.sanctionTiers) {
      state.tempConfig.sanctionTiers.splice(idx, 1);
      renderSettingsSanctions();
    }
  };

  function renderSettingsAcronyms() {
    var tbody = document.getElementById('cfgAcronymsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.acronyms) || [];
    var html = '';
    list.forEach(function (ac, idx) {
      html += '<tr>';
      html += '<td><input type="text" class="ag-input" style="width:90px; font-weight:800;" value="' + escapeHtml(ac.code || '') + '" onchange="window.updateTempAcronym(' + idx + ', \'code\', this.value.toUpperCase())"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%;" value="' + escapeHtml(ac.label || '') + '" onchange="window.updateTempAcronym(' + idx + ', \'label\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%;" value="' + escapeHtml(ac.labelFr || '') + '" onchange="window.updateTempAcronym(' + idx + ', \'labelFr\', this.value)"></td>';
      html += '<td><select class="ag-select" style="width:100%;" onchange="window.updateTempAcronym(' + idx + ', \'category\', this.value)">' +
        '<option value="pedagogy"' + (ac.category==='pedagogy'?' selected':'') + '>Pedagogy (SEN)</option>' +
        '<option value="medical"' + (ac.category==='medical'?' selected':'') + '>Medical (PAI)</option>' +
        '<option value="regime"' + (ac.category==='regime'?' selected':'') + '>Regimen (DP/EXT)</option>' +
        '<option value="exit"' + (ac.category==='exit'?' selected':'') + '>Exit (AUT/ACC)</option>' +
        '<option value="discipline"' + (ac.category==='discipline'?' selected':'') + '>Discipline</option>' +
        '<option value="admin"' + (ac.category==='admin'?' selected':'') + '>Admin</option>' +
        '</select></td>';
      html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeSettingAcronym(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.updateTempAcronym = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.acronyms && state.tempConfig.acronyms[idx]) {
      state.tempConfig.acronyms[idx][field] = val;
    }
  };

  window.addSettingAcronym = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.acronyms = state.tempConfig.acronyms || [];
    state.tempConfig.acronyms.push({
      code: 'NEW',
      label: 'New Educational Plan',
      labelFr: 'Nouvel aménagement',
      category: 'pedagogy',
      aliases: []
    });
    renderSettingsAcronyms();
  };

  window.removeSettingAcronym = function (idx) {
    if (state.tempConfig && state.tempConfig.acronyms) {
      state.tempConfig.acronyms.splice(idx, 1);
      renderSettingsAcronyms();
    }
  };

  window.saveSettings = async function () {
    if (state.tempConfig) {
      state.config = JSON.parse(JSON.stringify(state.tempConfig));
      window.ADMIN_GROUPS_CONFIG = JSON.parse(JSON.stringify(state.tempConfig));
    }

    // Save to localStorage as immediate safeguard
    try {
      localStorage.setItem('cmt-admin-groups-config', JSON.stringify(state.config));
    } catch (e) {}

    // Save to user/admin-groups-config.js
    var fileContent = 'window.ADMIN_GROUPS_CONFIG = ' + JSON.stringify(state.config, null, 2) + ';\n';
    try {
      if (window.Desktop && Desktop.isElectron()) {
        await Desktop.saveText('user', 'admin-groups-config.js', fileContent);
      }
    } catch (e) {
      console.warn('Failed to save config file:', e);
    }

    // Recalculate discipline points and sanctions across all loaded students
    state.students.forEach(function (s) {
      s.points = calculateDisciplinePoints(s.infractions);
      s.sanction = determineSanctionTier(s.points);
    });

    populatePeriodSelector();
    renderTable();
    closeSettingsModal();
    if (window.showToast) window.showToast(t('agSettingsSaved', 'Settings and rules saved successfully.'));
  };

  window.resetSettingsToDefault = function () {
    var defs = window.ADMIN_GROUPS_DEFAULTS || {};
    state.tempConfig = {
      acronyms: defs.acronyms ? JSON.parse(JSON.stringify(defs.acronyms)) : [],
      infractions: defs.infractions ? JSON.parse(JSON.stringify(defs.infractions)) : [],
      sanctionTiers: defs.sanctionTiers ? JSON.parse(JSON.stringify(defs.sanctionTiers)) : [],
      actionTypes: defs.actionTypes ? JSON.parse(JSON.stringify(defs.actionTypes)) : [],
      columns: defs.columns ? JSON.parse(JSON.stringify(defs.columns)) : [],
      periods: defs.periods ? JSON.parse(JSON.stringify(defs.periods)) : []
    };
    window.switchSettingsTab(activeSettingsTab);
    if (window.showToast) window.showToast(t('agSettingsReset', 'Reset to factory defaults in editor. Click Save Settings to apply.'));
  };

  // Helper: SVG Icon renderer
  function svgIcon(name) {
    if (!name) return '';
    return '<img src="../assets/icons/' + escapeHtml(name) + '.svg" class="btn-icon" alt="" onerror="this.style.display=\'none\'" />';
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
