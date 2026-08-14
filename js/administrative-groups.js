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
      tabs: [],
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
    var rawCols = Array.isArray(defs.columns) ? JSON.parse(JSON.stringify(defs.columns)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.columns) || []);

    // Expand legacy single 'infractions' column if present
    var expandedCols = [];
    rawCols.forEach(function (col) {
      if (col.type === 'infractions' || col.key === 'infractions') {
        var infs = Array.isArray(defs.infractions) && defs.infractions.length ? defs.infractions : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.infractions) || []);
        infs.forEach(function (inf) {
          expandedCols.push({
            key: inf.key,
            name: inf.name,
            nameFr: inf.nameFr || inf.name,
            visible: col.visible !== false,
            locked: false,
            tab: col.tab || 'discipline',
            type: 'infraction',
            weight: inf.weight != null ? inf.weight : 1,
            icon: inf.icon || 'note'
          });
        });
      } else {
        expandedCols.push(col);
      }
    });

    state.config = {
      acronyms: Array.isArray(defs.acronyms) ? JSON.parse(JSON.stringify(defs.acronyms)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.acronyms) || []),
      infractions: Array.isArray(defs.infractions) ? JSON.parse(JSON.stringify(defs.infractions)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.infractions) || []),
      sanctionTiers: Array.isArray(defs.sanctionTiers) ? JSON.parse(JSON.stringify(defs.sanctionTiers)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.sanctionTiers) || []),
      actionTypes: Array.isArray(defs.actionTypes) ? JSON.parse(JSON.stringify(defs.actionTypes)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.actionTypes) || []),
      tabs: Array.isArray(defs.tabs) ? JSON.parse(JSON.stringify(defs.tabs)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.tabs) || []),
      columns: expandedCols,
      periods: Array.isArray(defs.periods) ? JSON.parse(JSON.stringify(defs.periods)) : ((window.ADMIN_GROUPS_DEFAULTS && window.ADMIN_GROUPS_DEFAULTS.periods) || [])
    };

    syncInfractionsFromColumns(state.config);
  }

  function syncInfractionsFromColumns(cfg) {
    if (!cfg || !Array.isArray(cfg.columns)) return;
    var infCols = cfg.columns.filter(function (c) { return c.type === 'infraction'; });
    if (infCols.length > 0) {
      cfg.infractions = infCols.map(function (c) {
        return {
          key: c.key,
          name: c.name,
          nameFr: c.nameFr || c.name,
          description: c.description || c.desc || '',
          descriptionFr: c.descriptionFr || c.descFr || '',
          weight: c.weight != null ? parseFloat(c.weight) : 1,
          icon: c.icon || 'note'
        };
      });
    }
  }

  function getInfractionsList() {
    var cols = (state.config && state.config.columns) || [];
    var infCols = cols.filter(function (c) { return c.type === 'infraction'; });
    if (infCols.length > 0) {
      return infCols;
    }
    return (state.config && state.config.infractions) || [];
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
    var infList = getInfractionsList();
    infList.forEach(function (inf) {
      var count = parseInt(infractions[inf.key] || 0, 10);
      var weight = parseFloat(inf.weight != null ? inf.weight : 1);
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

    // Shortcuts
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveAllData();
      }
    });
  }

  // ── Render Main Navigation Tabs ──
  function renderMainTabs() {
    var container = document.getElementById('agMainTabsBar');
    if (!container) return;

    var tabs = (state.config && state.config.tabs) || [];
    var isFr = isFrench();
    var html = '';

    if (tabs.length && !tabs.some(function (t) { return t.id === state.activeTab; })) {
      state.activeTab = tabs[0].id;
    }

    tabs.forEach(function (t) {
      var isActive = state.activeTab === t.id;
      var tName = isFr ? (t.nameFr || t.name) : t.name;
      html += '<button type="button" class="ag-tab-btn' + (isActive ? ' active' : '') + '" onclick="window.switchMainTab(\'' + escapeHtml(t.id) + '\')">';
      html += svgIcon(t.icon || 'table') + ' <span>' + escapeHtml(tName) + '</span>';
      html += '</button>';
    });

    container.innerHTML = html;
  }

  window.switchMainTab = function (tabId) {
    state.activeTab = tabId || 'all';
    renderMainTabs();
    renderTable();
  };

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

  // ── Helpers for Filtering & Values ──
  function getFilteredStudents() {
    var list = state.students || [];
    if (state.currentGroupId && state.currentGroupId !== 'all') {
      list = list.filter(function (s) {
        return s.groups.some(function (g) { return g.id === state.currentGroupId; }) || s.adminClass === state.currentGroupId;
      });
    }
    if (state.searchQuery) {
      var q = state.searchQuery;
      list = list.filter(function (s) {
        var fn = (s.firstName || '').toLowerCase();
        var ln = (s.lastName || '').toLowerCase();
        var cl = (s.adminClass || '').toLowerCase();
        return fn.indexOf(q) !== -1 || ln.indexOf(q) !== -1 || cl.indexOf(q) !== -1;
      });
    }
    return list;
  }

  function getStudentActions(uuid) {
    return (state.adminData.actions || []).filter(function (a) { return a.studentId === uuid; });
  }

  function getStudentPeriodInfractions(student, periodId) {
    if (!student) return {};
    if (!periodId || periodId === 'all') {
      if (student.periods) {
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
    var activeTab = state.activeTab;
    var allCols = (state.config && state.config.columns) || [];

    // Filter columns visible in current view tab
    var visibleCols = allCols.filter(function (col) {
      if (col.visible === false) return false;
      if (activeTab === 'all') return true;
      return (col.tab === activeTab || col.tab === 'all' || col.key === 'student' || col.key === 'adminClass');
    });

    var html = '<table class="ag-table" id="adminGroupsTable"><thead><tr>';
    var totalColCount = 0;

    visibleCols.forEach(function (col) {
      var colTitle = isFr ? (col.nameFr || col.name) : col.name;
      var colDesc = isFr ? (col.descriptionFr || col.descFr || col.description || col.desc || colTitle) : (col.description || col.desc || colTitle);
      var titleAttr = colDesc ? ' title="' + escapeHtml(colDesc) + '"' : '';

      if (col.type === 'student' || col.key === 'student') {
        html += '<th class="col-sticky-name"' + titleAttr + '>' + escapeHtml(colTitle) + '</th>';
        totalColCount++;
      } else if (col.type === 'infraction') {
        html += '<th style="text-align:center;"' + titleAttr + '>' + svgIcon(col.icon || 'note') + ' ' + escapeHtml(colTitle) + '</th>';
        totalColCount++;
      } else if (col.type === 'infractions' || col.key === 'infractions') {
        (state.config.infractions || []).forEach(function (inf) {
          var infLabel = isFr ? (inf.nameFr || inf.name) : inf.name;
          var infDesc = isFr ? (inf.descriptionFr || inf.descFr || inf.description || inf.desc || infLabel) : (inf.description || inf.desc || infLabel);
          var infTitleAttr = infDesc ? ' title="' + escapeHtml(infDesc) + '"' : '';
          html += '<th style="text-align:center;"' + infTitleAttr + '>' + svgIcon(inf.icon || 'note') + ' ' + escapeHtml(infLabel) + '</th>';
          totalColCount++;
        });
      } else {
        html += '<th' + titleAttr + '>' + escapeHtml(colTitle) + '</th>';
        totalColCount++;
      }
    });

    html += '</tr></thead><tbody>';

    if (!list.length) {
      html += '<tr><td colspan="' + Math.max(1, totalColCount) + '" style="text-align:center; padding: 24px; color:#94a3b8;">' + t('agNoStudentsFound', 'No students found matching current filters.') + '</td></tr>';
    } else {
      list.forEach(function (s) {
        var actionsCount = getStudentActions(s.uuid).length;
        var pInfractions = getStudentPeriodInfractions(s, state.currentPeriodId);
        var pPoints = calculateDisciplinePoints(pInfractions);
        var pSanction = determineSanctionTier(pPoints);

        html += '<tr data-student-id="' + s.uuid + '">';

        visibleCols.forEach(function (col) {
          var type = col.type || 'text';
          var key = col.key;

          if (type === 'student' || key === 'student') {
            html += '<td class="col-sticky-name" onclick="window.openStudentProfileModal(\'' + s.uuid + '\')"><span style="color:#0284c7; cursor:pointer; font-weight:800;">' + escapeHtml(s.lastName.toUpperCase() + ' ' + s.firstName) + '</span></td>';
          } else if (type === 'infraction') {
            var val = pInfractions[key] || 0;
            html += '<td style="text-align:center;">';
            html += '<div class="ag-counter-cell">';
            html += '<button type="button" class="ag-counter-btn" onclick="window.modInfraction(\'' + s.uuid + '\', \'' + key + '\', -1)">-</button>';
            html += '<span class="ag-counter-val">' + val + '</span>';
            html += '<button type="button" class="ag-counter-btn" onclick="window.modInfraction(\'' + s.uuid + '\', \'' + key + '\', 1)">+</button>';
            html += '</div>';
            html += '</td>';
          } else if (type === 'infractions' || key === 'infractions') {
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
          } else if (type === 'points' || key === 'points') {
            html += '<td><strong>' + pPoints + '</strong></td>';
          } else if (type === 'sanction' || key === 'sanction') {
            if (pSanction) {
              var sancName = isFr ? (pSanction.nameFr || pSanction.name) : pSanction.name;
              html += '<td><span class="badge ' + (pSanction.badgeClass || 'badge-tier1') + '">' + svgIcon(pSanction.icon || 'error') + ' ' + escapeHtml(sancName) + '</span></td>';
            } else {
              html += '<td><span class="badge badge-clean">' + svgIcon('check') + ' ' + t('agCleanRecord', 'Clean') + '</span></td>';
            }
          } else if (type === 'sen' || key === 'sen') {
            var senLabel = s.senDetails || (isFr ? 'PAP/PAI' : 'SEN');
            html += '<td>' + (s.sen ? ('<span class="badge badge-sen">' + svgIcon('award') + ' ' + escapeHtml(senLabel) + '</span>') : '<span style="color:#cbd5e1;">—</span>') + '</td>';
          } else if (type === 'actionsHistory' || key === 'actionsHistory') {
            html += '<td><button type="button" class="badge badge-action" onclick="window.openStudentProfileModal(\'' + s.uuid + '\', \'actions\')">' + svgIcon('history') + ' ' + actionsCount + ' ' + t('agActionsCount', 'actions') + '</button></td>';
          } else if (type === 'manage' || key === 'manage') {
            html += '<td><button type="button" class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="window.openQuickActionMenu(\'' + s.uuid + '\')">' + svgIcon('plus') + ' ' + t('agLogBtn', 'Log') + '</button></td>';
          } else if (type === 'readonly' || key === 'age') {
            var val = (s[key] != null) ? s[key] : (s.customFields && s.customFields[key] != null ? s.customFields[key] : '');
            html += '<td>' + escapeHtml(val) + '</td>';
          } else {
            // Editable text / custom cell
            var isStandard = ['adminClass', 'dob', 'gender', 'regime', 'guardian1Name', 'guardian1Phone', 'guardian1Email', 'medicalNotes'].indexOf(key) !== -1;
            var cellVal = isStandard ? (s[key] || '') : ((s.customFields && s.customFields[key]) || '');
            var onblurHandler = isStandard ? ('window.updateStudentField(\'' + s.uuid + '\', \'' + key + '\', this.textContent)') : ('window.updateStudentCustomField(\'' + s.uuid + '\', \'' + key + '\', this.textContent)');
            html += '<td class="ag-cell-editable" onblur="' + onblurHandler + '" contenteditable="true">' + escapeHtml(cellVal) + '</td>';
          }
        });

        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderAll() {
    renderMainTabs();
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
    uuid = uuid || state.selectedStudentId;
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
  var activeSettingsTab = 'tabs';

  window.openSettingsModal = function () {
    state.tempConfig = JSON.parse(JSON.stringify(state.config));
    window.switchSettingsTab(activeSettingsTab || 'tabs');
    var modal = document.getElementById('agSettingsModal');
    if (modal) modal.classList.add('active');
  };

  window.closeSettingsModal = function () {
    var modal = document.getElementById('agSettingsModal');
    if (modal) modal.classList.remove('active');
  };

  window.switchSettingsTab = function (tab) {
    activeSettingsTab = tab || 'tabs';
    var tabBtns = {
      tabs: document.getElementById('tabBtnCfgTabs'),
      columns: document.getElementById('tabBtnCfgColumns'),
      sanctions: document.getElementById('tabBtnCfgSanctions'),
      periods: document.getElementById('tabBtnCfgPeriods')
    };
    Object.keys(tabBtns).forEach(function (k) {
      if (tabBtns[k]) tabBtns[k].classList.toggle('active', k === activeSettingsTab);
    });

    document.querySelectorAll('.cfg-tab-pane').forEach(function (pane) {
      pane.style.display = 'none';
    });

    if (activeSettingsTab === 'tabs') {
      var p = document.getElementById('cfgTabContentTabs');
      if (p) p.style.display = 'block';
      renderSettingsTabs();
    } else if (activeSettingsTab === 'columns') {
      var p = document.getElementById('cfgTabContentColumns');
      if (p) p.style.display = 'block';
      renderSettingsColumns();
    } else if (activeSettingsTab === 'sanctions') {
      var p = document.getElementById('cfgTabContentSanctions');
      if (p) p.style.display = 'block';
      renderSettingsSanctions();
    } else if (activeSettingsTab === 'periods') {
      var p = document.getElementById('cfgTabContentPeriods');
      if (p) p.style.display = 'block';
      renderSettingsPeriods();
    }
  };

  // ── Tab 1: View Tabs Manager ──
  function renderSettingsTabs() {
    var tbody = document.getElementById('cfgTabsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.tabs) || [];
    var html = '';
    list.forEach(function (t, idx) {
      html += '<tr>';
      html += '<td><input type="text" class="ag-input" style="width:70px; text-align:center;" value="' + escapeHtml(t.icon || 'table') + '" onchange="window.updateTempTab(' + idx + ', \'icon\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:110px; font-weight:800;" value="' + escapeHtml(t.id || '') + '" onchange="window.updateTempTab(' + idx + ', \'id\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(t.name || '') + '" onchange="window.updateTempTab(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(t.nameFr || '') + '" onchange="window.updateTempTab(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeSettingTab(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.updateTempTab = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.tabs && state.tempConfig.tabs[idx]) {
      state.tempConfig.tabs[idx][field] = val;
    }
  };

  window.addSettingTab = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.tabs = state.tempConfig.tabs || [];
    var num = state.tempConfig.tabs.length + 1;
    state.tempConfig.tabs.push({
      id: 'tab_' + num,
      name: 'Custom Tab ' + num,
      nameFr: 'Onglet ' + num,
      icon: 'table'
    });
    renderSettingsTabs();
  };

  window.removeSettingTab = function (idx) {
    if (state.tempConfig && state.tempConfig.tabs) {
      state.tempConfig.tabs.splice(idx, 1);
      renderSettingsTabs();
    }
  };

  // ── Tab 2: Spreadsheet Columns & Infractions Manager ──
  function renderSettingsColumns() {
    var tbody = document.getElementById('cfgColumnsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.columns) || [];
    var tabs = (state.tempConfig && state.tempConfig.tabs) || [];
    var isFr = isFrench();
    var html = '';

    list.forEach(function (col, idx) {
      var currentTab = col.tab || 'all';
      var currentType = col.type || 'text';
      var isInfraction = currentType === 'infraction';
      var currentIcon = col.icon || (isInfraction ? 'note' : (currentType === 'sen' ? 'award' : 'table'));

      html += '<tr>';
      html += '<td style="text-align:center;"><input type="checkbox" style="width:18px; height:18px; cursor:pointer;" ' + (col.visible !== false ? 'checked' : '') + ' onchange="window.toggleTempColumn(' + idx + ', this.checked)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:55px; text-align:center;" value="' + escapeHtml(currentIcon) + '" placeholder="icon" onchange="window.updateTempColumn(' + idx + ', \'icon\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100px; font-weight:800;" value="' + escapeHtml(col.key || '') + '" onchange="window.updateTempColumn(' + idx + ', \'key\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(col.name || '') + '" onchange="window.updateTempColumn(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(col.nameFr || '') + '" onchange="window.updateTempColumn(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-size:0.8rem;" placeholder="Tooltip explanation on hover..." value="' + escapeHtml(col.description || col.desc || (isFr ? (col.descriptionFr || col.descFr) : '') || '') + '" onchange="window.updateTempColumn(' + idx + ', \'description\', this.value)"></td>';

      // Tab selector
      html += '<td><select class="ag-select" style="width:100%; font-weight:700;" onchange="window.updateTempColumn(' + idx + ', \'tab\', this.value)">';
      html += '<option value="all"' + (currentTab === 'all' ? ' selected' : '') + '>' + (isFr ? 'Tous les onglets' : 'All Tabs') + '</option>';
      tabs.forEach(function (t) {
        var tTitle = isFr ? (t.nameFr || t.name) : t.name;
        html += '<option value="' + escapeHtml(t.id) + '"' + (currentTab === t.id ? ' selected' : '') + '>' + escapeHtml(tTitle) + '</option>';
      });
      html += '</select></td>';

      // Column Type selector
      html += '<td><select class="ag-select" style="width:100%; font-weight:700;" onchange="window.onColumnTypeChange(' + idx + ', this.value)">' +
        '<option value="text"' + (currentType === 'text' ? ' selected' : '') + '>Text / Editable</option>' +
        '<option value="readonly"' + (currentType === 'readonly' ? ' selected' : '') + '>Read-only</option>' +
        '<option value="student"' + (currentType === 'student' ? ' selected' : '') + '>Student Name</option>' +
        '<option value="sen"' + (currentType === 'sen' ? ' selected' : '') + '>Accommodations (SEN / PAP)</option>' +
        '<option value="infraction"' + (currentType === 'infraction' ? ' selected' : '') + '>Infraction Counter</option>' +
        '<option value="points"' + (currentType === 'points' ? ' selected' : '') + '>Discipline Points</option>' +
        '<option value="sanction"' + (currentType === 'sanction' ? ' selected' : '') + '>Sanction Badge</option>' +
        '<option value="actionsHistory"' + (currentType === 'actionsHistory' ? ' selected' : '') + '>Follow-up Log</option>' +
        '<option value="manage"' + (currentType === 'manage' ? ' selected' : '') + '>Log Action Button</option>' +
        '</select></td>';

      // Points weight (for infraction columns)
      if (isInfraction) {
        html += '<td style="text-align:center;"><input type="number" class="ag-input" style="width:65px; text-align:center;" min="0" max="50" step="0.5" value="' + (col.weight != null ? col.weight : 1) + '" onchange="window.updateTempColumn(' + idx + ', \'weight\', parseFloat(this.value)||1)"></td>';
      } else {
        html += '<td style="text-align:center; color:#94a3b8; font-weight:bold;">—</td>';
      }

      html += '<td style="text-align:center;"><button type="button" class="btn btn-secondary" style="padding:2px 6px; color:#b91c1c;" onclick="window.removeSettingColumn(' + idx + ')"><img src="../assets/icons/delete.svg" class="btn-icon" alt="" /></button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  window.onColumnTypeChange = function (idx, newType) {
    if (state.tempConfig && state.tempConfig.columns && state.tempConfig.columns[idx]) {
      state.tempConfig.columns[idx].type = newType;
      if (newType === 'infraction') {
        if (state.tempConfig.columns[idx].weight == null) {
          state.tempConfig.columns[idx].weight = 1;
        }
        if (!state.tempConfig.columns[idx].icon || state.tempConfig.columns[idx].icon === 'table') {
          state.tempConfig.columns[idx].icon = 'note';
        }
      } else if (newType === 'sen') {
        if (!state.tempConfig.columns[idx].icon || state.tempConfig.columns[idx].icon === 'table') {
          state.tempConfig.columns[idx].icon = 'award';
        }
        if (state.tempConfig.columns[idx].tab === 'all') {
          state.tempConfig.columns[idx].tab = 'accommodations';
        }
      }
      renderSettingsColumns();
    }
  };

  window.toggleTempColumn = function (idx, isChecked) {
    if (state.tempConfig && state.tempConfig.columns && state.tempConfig.columns[idx]) {
      state.tempConfig.columns[idx].visible = isChecked;
    }
  };

  window.updateTempColumn = function (idx, field, val) {
    if (state.tempConfig && state.tempConfig.columns && state.tempConfig.columns[idx]) {
      state.tempConfig.columns[idx][field] = val;
    }
  };

  window.addSettingColumn = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.columns = state.tempConfig.columns || [];
    var id = 'col_' + Date.now().toString(36);
    state.tempConfig.columns.push({
      key: id,
      name: 'New Column',
      nameFr: 'Nouvelle colonne',
      description: 'Custom column description',
      descriptionFr: 'Description de la colonne personnalisée',
      tab: 'all',
      type: 'text',
      icon: 'table',
      visible: true
    });
    renderSettingsColumns();
  };

  window.addSettingInfractionColumn = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.columns = state.tempConfig.columns || [];
    var count = state.tempConfig.columns.filter(function (c) { return c.type === 'infraction'; }).length + 1;
    var id = 'infraction_' + count;
    state.tempConfig.columns.push({
      key: id,
      name: 'New Infraction ' + count,
      nameFr: 'Nouvelle infraction ' + count,
      description: 'Infraction counter (1 point)',
      descriptionFr: 'Compteur d\'infraction (1 point)',
      tab: 'discipline',
      type: 'infraction',
      weight: 1,
      icon: 'note',
      visible: true
    });
    renderSettingsColumns();
  };

  window.addSettingAccommodationColumn = function () {
    state.tempConfig = state.tempConfig || {};
    state.tempConfig.columns = state.tempConfig.columns || [];
    var count = state.tempConfig.columns.filter(function (c) { return c.type === 'sen' || c.tab === 'accommodations'; }).length + 1;
    var id = 'sen_' + count;
    state.tempConfig.columns.push({
      key: id,
      name: 'Accommodation Plan ' + count,
      nameFr: 'Aménagement Plan ' + count,
      description: 'Special Educational Needs / Accommodation notes',
      descriptionFr: 'Notes d\'aménagements pédagogiques (PAP/PAI/PPRE)',
      tab: 'accommodations',
      type: 'sen',
      icon: 'award',
      visible: true
    });
    renderSettingsColumns();
  };

  window.removeSettingColumn = function (idx) {
    if (state.tempConfig && state.tempConfig.columns) {
      state.tempConfig.columns.splice(idx, 1);
      renderSettingsColumns();
    }
  };

  window.toggleAllColumns = function (show) {
    if (state.tempConfig && state.tempConfig.columns) {
      state.tempConfig.columns.forEach(function (col) {
        col.visible = show;
      });
      renderSettingsColumns();
    }
  };

  // ── Tab 6: Periods & Terms Manager ──
  function renderSettingsPeriods() {
    var tbody = document.getElementById('cfgPeriodsBody');
    if (!tbody) return;
    var list = (state.tempConfig && state.tempConfig.periods) || [];
    var html = '';
    list.forEach(function (p, idx) {
      html += '<tr>';
      html += '<td><input type="text" class="ag-input" style="width:90px; font-weight:800;" value="' + escapeHtml(p.id || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'id\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(p.name || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'name\', this.value)"></td>';
      html += '<td><input type="text" class="ag-input" style="width:100%; font-weight:700;" value="' + escapeHtml(p.nameFr || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'nameFr\', this.value)"></td>';
      html += '<td><input type="date" class="ag-input" style="width:130px; text-align:center;" value="' + escapeHtml(p.startDate || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'startDate\', this.value)"></td>';
      html += '<td><input type="date" class="ag-input" style="width:130px; text-align:center;" value="' + escapeHtml(p.endDate || '') + '" onchange="window.updateTempPeriod(' + idx + ', \'endDate\', this.value)"></td>';
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
    var now = new Date();
    var y1 = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    var y2 = y1 + 1;
    state.tempConfig.periods.push({
      id: 'p' + num,
      name: 'Period ' + num,
      nameFr: 'Période ' + num,
      startDate: y1 + '-09-01',
      endDate: y2 + '-06-30'
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
    var now = new Date();
    var y1 = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    var y2 = y1 + 1;

    if (type === 'trimesters') {
      state.tempConfig.periods = [
        { id: 't1', name: 'Trimestre 1 (T1)', nameFr: 'Trimestre 1 (T1)', startDate: y1 + '-09-01', endDate: y1 + '-11-30' },
        { id: 't2', name: 'Trimestre 2 (T2)', nameFr: 'Trimestre 2 (T2)', startDate: y1 + '-12-01', endDate: y2 + '-02-28' },
        { id: 't3', name: 'Trimestre 3 (T3)', nameFr: 'Trimestre 3 (T3)', startDate: y2 + '-03-01', endDate: y2 + '-06-30' }
      ];
    } else if (type === 'semesters') {
      state.tempConfig.periods = [
        { id: 's1', name: 'Semester 1 (S1)', nameFr: 'Semestre 1 (S1)', startDate: y1 + '-09-01', endDate: y2 + '-01-31' },
        { id: 's2', name: 'Semester 2 (S2)', nameFr: 'Semestre 2 (S2)', startDate: y2 + '-02-01', endDate: y2 + '-06-30' }
      ];
    } else if (type === 'custom') {
      var cnt = parseInt(customCount, 10);
      if (isNaN(cnt) || cnt < 1) cnt = 4;
      if (cnt > 20) cnt = 20;
      var generated = [];
      for (var i = 1; i <= cnt; i++) {
        generated.push({
          id: 'p' + i,
          name: 'Period ' + i + ' (P' + i + ')',
          nameFr: 'Période ' + i + ' (P' + i + ')',
          startDate: '',
          endDate: ''
        });
      }
      state.tempConfig.periods = generated;
    }
    renderSettingsPeriods();
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



  window.saveSettings = async function () {
    if (state.tempConfig) {
      syncInfractionsFromColumns(state.tempConfig);
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
    renderMainTabs();
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
      tabs: defs.tabs ? JSON.parse(JSON.stringify(defs.tabs)) : [],
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
