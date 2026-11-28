// Participation Tracker — Core State, Columns, Badges, Init & Import/Merge
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function cloneDbSessions(source) {
    try {
        return JSON.parse(JSON.stringify(Array.isArray(source) ? source : []));
    } catch (error) {
        return [];
    }
}

let DB_EXPORT = cloneDbSessions(
    Array.isArray(window.CMS_DB_EXPORT) ? window.CMS_DB_EXPORT : window.DB_EXPORT
);

function syncGlobalDbExport() {
    window.CMS_DB_EXPORT = DB_EXPORT;
    window.DB_EXPORT = DB_EXPORT;
}

syncGlobalDbExport();

let currentSessionId = null;
let currentGroupId = null;
let currentStudentName = null;
let currentHalfGroup = null; // null = all, 'A' or 'B' = half group filter
let selectedHistorySessionId = null;
let editingStudentId = null;
let ELECTRON_AVAILABLE = false;
let pendingImportData = null;
let pendingResetAction = null;
let compareGroupIds = [];

function _ptRoster() {
    if (typeof STUDENTS_ROSTER === 'undefined' || !Array.isArray(STUDENTS_ROSTER)) return {};
    const map = {};
    STUDENTS_ROSTER.forEach(s => { if (s && s.uuid) map[s.uuid] = s; });
    return map;
}

function getHalfGroupMembers(groupId, half) {
    try {
        const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
        const hg = meta[groupId] && meta[groupId].halfGroups;
        if (!hg || !half || !hg[half]) return null;
        const arr = hg[half];
        // UUID format: resolve to display names for comparison
        if (arr.length > 0 && typeof arr[0] === 'string' && arr[0].startsWith('st-')) {
            const roster = _ptRoster();
            return arr.map(sid => {
                const s = roster[sid];
                return s ? ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toUpperCase() : sid.toUpperCase();
            });
        }
        return arr.map(s => s.toUpperCase());
    } catch (e) {}
    return null;
}

function getGroupHalfGroups(groupId) {
    try {
        const meta = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META : {};
        const hg = meta[groupId] && meta[groupId].halfGroups;
        if (hg && Object.keys(hg).length > 0) return hg;
    } catch (e) {}
    return null;
}

function isStudentInCurrentHalfGroup(studentName) {
    if (!currentHalfGroup || !currentGroupId) return true;
    const members = getHalfGroupMembers(currentGroupId, currentHalfGroup);
    if (!members) return true;
    return members.includes(String(studentName).toUpperCase());
}

function selectHalfGroup(half) {
    currentHalfGroup = half;
    // Update button active states
    document.querySelectorAll('.half-group-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.half === (half || ''));
    });
    currentStudentName = null;
    document.getElementById('studentDetailsArea').classList.add('hidden');
    document.getElementById('studentDetailTitle').classList.add('hidden');
    updateDashboard();
}

// ─── Column Management: Resizing, Reordering, and Visibility ─────────
let _wasColumnDragging = false;
let _wasColumnResizing = false;
let currentColumnsModalTableId = null;

const TABLE_COL_CONFIGS = {
    classOverviewTable: [
        { id: 'name',             label: 'Student',          i18nKey: 'ptColStudent',          defaultWidth: 160, minWidth: 90,  canHide: false, fixed: true },
        { id: 'sessions',         label: 'Sess.',            i18nKey: 'ptColSess',             defaultWidth: 65,  minWidth: 45 },
        { id: 'picks',            label: 'Pick.',            i18nKey: 'ptColPick',             defaultWidth: 65,  minWidth: 45 },
        { id: 'absent',           label: 'Abs.',             i18nKey: 'ptColAbs',              defaultWidth: 65,  minWidth: 45 },
        { id: 'pluses',           label: '+',                                                  defaultWidth: 55,  minWidth: 40 },
        { id: 'minuses',          label: '-',                                                  defaultWidth: 55,  minWidth: 40 },
        { id: 'teamPluses',       label: 'T+',               i18nKey: 'ptColT',                defaultWidth: 55,  minWidth: 40 },
        { id: 'teamMinuses',      label: 'T-',               i18nKey: 'ptColTm',               defaultWidth: 55,  minWidth: 40 },
        { id: 'badgePositive',    label: 'Badge +',          i18nKey: 'ptColBadgePlus',        defaultWidth: 80,  minWidth: 55 },
        { id: 'badgeNegative',    label: 'Badge -',          i18nKey: 'ptColBadgeMinus',       defaultWidth: 80,  minWidth: 55 },
        { id: 'badges',           label: 'Badges',           i18nKey: 'ptColBadges',           defaultWidth: 110, minWidth: 70 },
        { id: 'teamRoleEvents',   label: 'Team/Role Events', i18nKey: 'ptColTeamRole',         defaultWidth: 150, minWidth: 90 },
        { id: 'notes',            label: 'Notes',            i18nKey: 'ptColNotes',            defaultWidth: 140, minWidth: 80 },
        { id: 'provisionalGrade', label: 'Prov. Grade',      i18nKey: 'ptColProvisionalGrade', defaultWidth: 95,  minWidth: 65 },
        { id: 'net',              label: 'Net',              i18nKey: 'ptColNet',              defaultWidth: 65,  minWidth: 45 },
        { id: 'posRatio',         label: '+/s',              i18nKey: 'ptColPosRatio',         defaultWidth: 65,  minWidth: 45 },
        { id: 'negRatio',         label: '-/s',              i18nKey: 'ptColNegRatio',         defaultWidth: 65,  minWidth: 45 },
        { id: 'netRatio',         label: 'Net/s',            i18nKey: 'ptColNetRatio',         defaultWidth: 65,  minWidth: 45 },
        { id: 'ratio',            label: 'Good/Bad',         i18nKey: 'ptColGoodBad',          defaultWidth: 80,  minWidth: 55 },
        { id: 'trend',            label: 'Trend',            i18nKey: 'ptColTrend',            defaultWidth: 65,  minWidth: 45 }
    ],
    historyTable: [
        { id: 'date',             label: 'Date',             i18nKey: 'ptColDate',             defaultWidth: 130, minWidth: 85,  canHide: false, fixed: true },
        { id: 'time',             label: 'Time',             i18nKey: 'ptColTime',             defaultWidth: 80,  minWidth: 50 },
        { id: 'picks',            label: 'Picks',            i18nKey: 'ptColPicks',            defaultWidth: 65,  minWidth: 45 },
        { id: 'pluses',           label: 'Pluses',           i18nKey: 'ptColPluses',           defaultWidth: 65,  minWidth: 45 },
        { id: 'minuses',          label: 'Minuses',          i18nKey: 'ptColMinuses',          defaultWidth: 70,  minWidth: 45 },
        { id: 'teamPluses',       label: 'T+',               i18nKey: 'ptColT',                defaultWidth: 55,  minWidth: 40 },
        { id: 'teamMinuses',      label: 'T-',               i18nKey: 'ptColTm',               defaultWidth: 55,  minWidth: 40 },
        { id: 'badgePositive',    label: 'Badge +',          i18nKey: 'ptColBadgePlus',        defaultWidth: 80,  minWidth: 55 },
        { id: 'badgeNegative',    label: 'Badge -',          i18nKey: 'ptColBadgeMinus',       defaultWidth: 80,  minWidth: 55 },
        { id: 'teamRoleEvents',   label: 'Team/Role Events', i18nKey: 'ptColTeamRole',         defaultWidth: 140, minWidth: 85 },
        { id: 'students',         label: 'Students',         i18nKey: 'ptColStudents',         defaultWidth: 75,  minWidth: 50 },
        { id: 'badges',           label: 'Badges',           i18nKey: 'ptColBadges',           defaultWidth: 100, minWidth: 60 },
        { id: 'objectives',       label: 'Objectives',       i18nKey: 'ptColObjectives',       defaultWidth: 150, minWidth: 80 },
        { id: 'notes',            label: 'Notes',            i18nKey: 'ptColNotes',            defaultWidth: 150, minWidth: 80 },
        { id: 'actions',          label: '',                 i18nKey: '',                      defaultWidth: 155, minWidth: 120, canHide: false, fixed: true, noSort: true }
    ],
    studentTable: [
        { id: 'date',             label: 'Date',             i18nKey: 'ptColDate',             defaultWidth: 130, minWidth: 85,  canHide: false, fixed: true },
        { id: 'time',             label: 'Time',             i18nKey: 'ptColTime',             defaultWidth: 80,  minWidth: 50 },
        { id: 'picked',           label: 'Picked',           i18nKey: 'ptColPicked',           defaultWidth: 65,  minWidth: 45 },
        { id: 'absent',           label: 'Absent',           i18nKey: 'ptColAbsent',           defaultWidth: 65,  minWidth: 45 },
        { id: 'pluses',           label: '+',                                                  defaultWidth: 55,  minWidth: 40 },
        { id: 'minuses',          label: '-',                                                  defaultWidth: 55,  minWidth: 40 },
        { id: 'teamPluses',       label: 'T+',               i18nKey: 'ptColT',                defaultWidth: 55,  minWidth: 40 },
        { id: 'teamMinuses',      label: 'T-',               i18nKey: 'ptColTm',               defaultWidth: 55,  minWidth: 40 },
        { id: 'badges',           label: 'Badges',           i18nKey: 'ptColBadges',           defaultWidth: 120, minWidth: 70 },
        { id: 'teamRoleEvents',   label: 'Team/Role Events', i18nKey: 'ptColTeamRole',         defaultWidth: 150, minWidth: 85 },
        { id: 'notes',            label: 'Notes',            i18nKey: 'ptColNotes',            defaultWidth: 150, minWidth: 80 }
    ]
};

const ptTableColState = {
    classOverviewTable: { order: [], widths: {}, hidden: new Set() },
    historyTable:       { order: [], widths: {}, hidden: new Set() },
    studentTable:       { order: [], widths: {}, hidden: new Set() }
};

function _initPtColumnsState() {
    const cfg = (typeof window.PARTICIPATION_TRACKER_CONFIG === 'object' && window.PARTICIPATION_TRACKER_CONFIG?.columns)
        ? window.PARTICIPATION_TRACKER_CONFIG.columns
        : null;

    let localOrders = {}, localWidths = {}, localHidden = {};
    try { localOrders = JSON.parse(localStorage.getItem('cms_col_orders') || '{}'); } catch (_) {}
    try { localWidths = JSON.parse(localStorage.getItem('cms_col_widths') || '{}'); } catch (_) {}
    try { localHidden = JSON.parse(localStorage.getItem('cms_hidden_cols') || '{}'); } catch (_) {}

    ['classOverviewTable', 'historyTable', 'studentTable'].forEach(tableId => {
        const defs = TABLE_COL_CONFIGS[tableId] || [];
        const defaultOrder = defs.map(c => c.id);
        const defaultWidths = {};
        defs.forEach(c => { defaultWidths[c.id] = c.defaultWidth; });

        // Order
        let order = cfg?.[tableId]?.order || localOrders[tableId] || [];
        if (!Array.isArray(order) || !order.length) {
            order = [...defaultOrder];
        } else {
            order = order.filter(id => defs.some(c => c.id === id));
            defaultOrder.forEach(id => { if (!order.includes(id)) order.push(id); });
        }

        // Widths
        const widths = Object.assign({}, defaultWidths, localWidths[tableId] || {}, cfg?.[tableId]?.widths || {});

        // Hidden
        const rawHidden = cfg?.[tableId]?.hidden || localHidden[tableId] || [];
        const hiddenSet = new Set();
        if (Array.isArray(rawHidden)) {
            rawHidden.forEach(item => {
                if (typeof item === 'number' && defs[item]) {
                    if (defs[item].canHide !== false) hiddenSet.add(defs[item].id);
                } else if (typeof item === 'string') {
                    const found = defs.find(c => c.id === item);
                    if (found && found.canHide !== false) hiddenSet.add(item);
                }
            });
        }

        ptTableColState[tableId] = { order, widths, hidden: hiddenSet };
    });
}

// Initialize state right away from localStorage / preloaded config
_initPtColumnsState();

let _savePtConfigTimer = null;
function savePtColumnsConfig() {
    const serializableOrders = {};
    const serializableWidths = {};
    const serializableHidden = {};
    const filePayload = { columns: {} };

    ['classOverviewTable', 'historyTable', 'studentTable'].forEach(tableId => {
        const st = ptTableColState[tableId];
        serializableOrders[tableId] = st.order;
        serializableWidths[tableId] = st.widths;
        serializableHidden[tableId] = Array.from(st.hidden);

        filePayload.columns[tableId] = {
            order: st.order,
            widths: st.widths,
            hidden: Array.from(st.hidden)
        };
    });

    try {
        localStorage.setItem('cms_col_orders', JSON.stringify(serializableOrders));
        localStorage.setItem('cms_col_widths', JSON.stringify(serializableWidths));
        localStorage.setItem('cms_hidden_cols', JSON.stringify(serializableHidden));
    } catch (_) {}

    window.PARTICIPATION_TRACKER_CONFIG = filePayload;

    clearTimeout(_savePtConfigTimer);
    _savePtConfigTimer = setTimeout(async () => {
        if (window.Desktop && typeof Desktop.saveJson === 'function') {
            try {
                await Desktop.saveJson('user', 'participation-tracker-config.json', filePayload);
            } catch (err) {
                console.warn('Failed to save user/participation-tracker-config.json:', err);
            }
        }
    }, 400);
}

async function loadPtColumnsConfigFile() {
    if (window.Desktop && typeof Desktop.readJson === 'function') {
        try {
            let parsed = null;
            const rJson = await Desktop.readJson('user', 'participation-tracker-config.json');
            if (rJson && rJson.ok && rJson.data && typeof rJson.data === 'object') {
                parsed = rJson.data;
            } else if (typeof Desktop.readText === 'function') {
                const rLegacy = await Desktop.readText('user', 'participation-tracker-config.js');
                if (rLegacy && rLegacy.ok && rLegacy.content) {
                    const match = rLegacy.content.match(/window\.PARTICIPATION_TRACKER_CONFIG\s*=\s*(\{[\s\S]*?\});/);
                    if (match) parsed = JSON.parse(match[1]);
                }
            }
            if (parsed) {
                window.PARTICIPATION_TRACKER_CONFIG = parsed;
                _initPtColumnsState();
                renderTableHeader('historyTable');
                renderTableHeader('classOverviewTable');
                renderTableHeader('studentTable');
                if (classOverviewData && classOverviewData.length) renderClassOverviewRows();
            }
        } catch (_) {}
    }
}

function getColOrder(tableId) {
    return ptTableColState[tableId]?.order || (TABLE_COL_CONFIGS[tableId] || []).map(c => c.id);
}

function getColDef(tableId, colId) {
    return (TABLE_COL_CONFIGS[tableId] || []).find(c => c.id === colId) || null;
}

function getColWidths(tableId) {
    return ptTableColState[tableId]?.widths || {};
}

function getHiddenColsSet(tableId) {
    if (!ptTableColState[tableId] || !(ptTableColState[tableId].hidden instanceof Set)) {
        ptTableColState[tableId] = ptTableColState[tableId] || {};
        ptTableColState[tableId].hidden = new Set();
    }
    return ptTableColState[tableId].hidden;
}

// Backward compatibility shim
const hiddenCols = {
    get historyTable() { return getHiddenColsSet('historyTable'); },
    get classOverviewTable() { return getHiddenColsSet('classOverviewTable'); },
    get studentTable() { return getHiddenColsSet('studentTable'); }
};

function applyHiddenCols(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const hidden = getHiddenColsSet(tableId);
    table.querySelectorAll('col[data-col]').forEach(col => {
        const id = col.getAttribute('data-col');
        const isHidden = hidden.has(id);
        col.classList.toggle('col-hidden', isHidden);
        col.style.display = isHidden ? 'none' : '';
    });
    table.querySelectorAll('th[data-col], td[data-col]').forEach(cell => {
        const id = cell.getAttribute('data-col');
        const isHidden = hidden.has(id);
        cell.classList.toggle('col-hidden', isHidden);
        cell.style.display = isHidden ? 'none' : '';
    });
}

function renderTableHeader(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const order = getColOrder(tableId);
    const widths = getColWidths(tableId);
    const hidden = getHiddenColsSet(tableId);

    // 1. Render <colgroup>
    let colgroup = table.querySelector('colgroup');
    if (!colgroup) {
        colgroup = document.createElement('colgroup');
        colgroup.id = tableId + 'ColGroup';
        table.insertBefore(colgroup, table.firstChild);
    }
    colgroup.innerHTML = order.map(colId => {
        const w = widths[colId] || 70;
        const isHidden = hidden.has(colId);
        return `<col data-col="${colId}" class="${isHidden ? 'col-hidden' : ''}" style="width:${w}px;${isHidden ? 'display:none;' : ''}">`;
    }).join('');

    // 2. Render <thead>
    let thead = table.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        table.appendChild(thead);
    }

    let activeSortCol = null;
    let activeSortDir = 1;
    if (tableId === 'classOverviewTable') {
        activeSortCol = classOverviewSortCol;
        activeSortDir = classOverviewSortDir;
    } else if (tableId === 'historyTable') {
        activeSortCol = historySortCol;
        activeSortDir = historySortDir;
    } else if (tableId === 'studentTable') {
        activeSortCol = studentTableSortCol;
        activeSortDir = studentTableSortDir;
    }

    const trHtml = order.map(colId => {
        const def = getColDef(tableId, colId) || { id: colId, label: colId };
        const label = (def.i18nKey ? t(def.i18nKey) : '') || def.label;
        const isHidden = hidden.has(colId);
        const isSorted = (activeSortCol === colId);
        const sortClass = def.noSort ? '' : ('sortable' + (isSorted ? (activeSortDir === 1 ? ' sort-asc' : ' sort-desc') : ''));
        const w = widths[colId] || def.defaultWidth || 70;
        const minW = def.minWidth || 40;

        return `<th data-col="${colId}" class="${sortClass} ${isHidden ? 'col-hidden' : ''}" draggable="true" style="width:${w}px; min-width:${minW}px;${isHidden ? 'display:none;' : ''}">` +
               `<div class="th-content">` +
               `<span class="col-drag-handle" title="${t('ptDragToReorder')}">⋮⋮</span>` +
               `<span class="th-label">${label}</span>` +
               `</div>` +
               `<span class="col-resizer" data-col="${colId}" title="${t('ptDragToResize')}"></span>` +
               `</th>`;
    }).join('');

    thead.innerHTML = `<tr>${trHtml}</tr>`;

    // 3. Attach drag-and-drop column reordering listeners
    const thList = thead.querySelectorAll('th');
    thList.forEach(th => {
        const colId = th.dataset.col;

        th.addEventListener('dragstart', e => {
            if (e.target.closest('.col-resizer')) {
                e.preventDefault();
                return;
            }
            _wasColumnDragging = true;
            e.dataTransfer.setData('text/plain', JSON.stringify({ tableId, colId }));
            e.dataTransfer.effectAllowed = 'move';
            th.classList.add('col-dragging');
        });

        th.addEventListener('dragend', () => {
            th.classList.remove('col-dragging');
            thead.querySelectorAll('th').forEach(h => h.classList.remove('drag-over-left', 'drag-over-right'));
            setTimeout(() => { _wasColumnDragging = false; }, 250);
        });

        th.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = th.getBoundingClientRect();
            const isRight = (e.clientX - rect.left) > (rect.width / 2);
            th.classList.toggle('drag-over-left', !isRight);
            th.classList.toggle('drag-over-right', isRight);
        });

        th.addEventListener('dragleave', () => {
            th.classList.remove('drag-over-left', 'drag-over-right');
        });

        th.addEventListener('drop', e => {
            e.preventDefault();
            th.classList.remove('drag-over-left', 'drag-over-right');
            let rawData = null;
            try { rawData = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (_) {}
            if (!rawData || rawData.tableId !== tableId) return;

            const srcId = rawData.colId;
            const tgtId = th.dataset.col;
            if (!srcId || !tgtId || srcId === tgtId) return;

            const rect = th.getBoundingClientRect();
            const isRight = (e.clientX - rect.left) > (rect.width / 2);

            const currentOrder = [...getColOrder(tableId)];
            const srcIdx = currentOrder.indexOf(srcId);
            if (srcIdx === -1) return;
            currentOrder.splice(srcIdx, 1);

            let tgtIdx = currentOrder.indexOf(tgtId);
            if (tgtIdx === -1) tgtIdx = currentOrder.length;
            else if (isRight) tgtIdx += 1;

            currentOrder.splice(tgtIdx, 0, srcId);
            ptTableColState[tableId].order = currentOrder;
            savePtColumnsConfig();

            renderTableHeader(tableId);
            refreshTableBody(tableId);

            setTimeout(() => { _wasColumnDragging = false; }, 250);
        });
    });

    // 4. Attach column resizer handle listeners
    thead.querySelectorAll('.col-resizer').forEach(handle => {
        handle.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            _wasColumnResizing = true;

            const colId = handle.dataset.col;
            const th = handle.closest('th');
            const startX = e.clientX;
            const startWidth = th.getBoundingClientRect().width;
            const def = getColDef(tableId, colId);
            const minWidth = def?.minWidth || 40;

            document.body.classList.add('resizing-col');
            handle.classList.add('is-resizing');

            const colEl = table.querySelector(`col[data-col="${colId}"]`);

            function onMove(evt) {
                evt.preventDefault();
                const currentWidth = Math.max(minWidth, Math.round(startWidth + (evt.clientX - startX)));
                if (colEl) colEl.style.width = currentWidth + 'px';
                th.style.width = currentWidth + 'px';
            }

            function onUp(evt) {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                document.body.classList.remove('resizing-col');
                handle.classList.remove('is-resizing');

                const finalWidth = Math.max(minWidth, Math.round(startWidth + (evt.clientX - startX)));
                ptTableColState[tableId].widths[colId] = finalWidth;
                savePtColumnsConfig();

                setTimeout(() => { _wasColumnResizing = false; }, 250);
            }

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    });
}

function refreshTableBody(tableId) {
    if (tableId === 'classOverviewTable') {
        if (typeof renderClassOverviewRows === 'function' && classOverviewData) {
            renderClassOverviewRows();
        }
    } else if (tableId === 'historyTable') {
        if (typeof updateHistoryTable === 'function' && typeof getFilteredSessions === 'function') {
            updateHistoryTable(getFilteredSessions());
        }
    } else if (tableId === 'studentTable') {
        if (typeof updateStudentDetails === 'function' && currentStudentName) {
            updateStudentDetails();
        }
    }
}

// ─── Columns Configuration Modal UI ──────────────────────────────────
function openColumnsConfigModal(tableId) {
    currentColumnsModalTableId = tableId || 'classOverviewTable';
    if (!ptTableColState[currentColumnsModalTableId] || !ptTableColState[currentColumnsModalTableId].order?.length) {
        _initPtColumnsState();
    }
    const modal = document.getElementById('columnsConfigModal');
    if (!modal) return;

    const titleEl = document.getElementById('columnsModalTitle');
    if (titleEl) {
        let name = t('ptColToggleOverview') || 'Class Overview';
        if (currentColumnsModalTableId === 'historyTable') name = t('ptColToggleHistory') || 'Session History';
        else if (currentColumnsModalTableId === 'studentTable') name = t('ptColToggleStudent') || 'Student Details';
        titleEl.textContent = `${t('ptConfigureColumns') || 'Configure Columns'} — ${name}`;
    }

    renderColumnsModalList();
    modal.classList.add('active');
}

function closeColumnsConfigModal() {
    const modal = document.getElementById('columnsConfigModal');
    if (modal) modal.classList.remove('active');
    currentColumnsModalTableId = null;
}

function renderColumnsModalList() {
    const tableId = currentColumnsModalTableId;
    if (!tableId) return;
    const container = document.getElementById('columnsModalList');
    if (!container) return;
    container.innerHTML = '';

    const order = getColOrder(tableId);
    const widths = getColWidths(tableId);
    const hidden = getHiddenColsSet(tableId);

    order.forEach((colId, index) => {
        const def = getColDef(tableId, colId) || { id: colId, label: colId };
        const label = (def.i18nKey ? t(def.i18nKey) : '') || def.label;
        const isFixed = def.canHide === false;
        const isVisible = !hidden.has(colId);
        const widthVal = widths[colId] || def.defaultWidth || 70;

        const card = document.createElement('div');
        card.className = 'column-item-card' + (isFixed ? ' is-fixed' : '');
        card.dataset.col = colId;
        card.draggable = true;

        card.innerHTML = `
            <span class="card-drag-handle" title="${t('ptDragToReorder')}">::</span>
            <label class="card-checkbox-label">
                <input type="checkbox" ${isVisible ? 'checked' : ''} ${isFixed ? 'disabled' : ''} data-col="${colId}">
                <span>${escapeHtml(label)}</span>
            </label>
            <span class="card-width-badge">${widthVal}px</span>
            <div class="card-btn-group">
                <button type="button" class="card-action-btn btn-move-up" title="${t('ptMoveUp')}" aria-label="${t('ptMoveUp')}" ${index === 0 ? 'disabled' : ''}><svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8l4-4 4 4"/></svg></button>
                <button type="button" class="card-action-btn btn-move-down" title="${t('ptMoveDown')}" aria-label="${t('ptMoveDown')}" ${index === order.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg></button>
            </div>
        `;

        // Checkbox toggle
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox && !isFixed) {
            checkbox.addEventListener('change', () => {
                toggleColVisibility(tableId, colId, checkbox.checked);
            });
        }

        // Move buttons
        const btnUp = card.querySelector('.btn-move-up');
        if (btnUp) {
            btnUp.addEventListener('click', (e) => {
                e.stopPropagation();
                moveColumnInOrder(tableId, colId, -1);
            });
        }

        const btnDown = card.querySelector('.btn-move-down');
        if (btnDown) {
            btnDown.addEventListener('click', (e) => {
                e.stopPropagation();
                moveColumnInOrder(tableId, colId, 1);
            });
        }

        // Modal drag-and-drop reorder
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', colId);
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('is-dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('is-dragging');
            container.querySelectorAll('.column-item-card').forEach(c => c.classList.remove('drag-over-item'));
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over-item');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over-item');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over-item');
            const srcId = e.dataTransfer.getData('text/plain');
            if (!srcId || srcId === colId) return;

            const curOrder = [...getColOrder(tableId)];
            const sIdx = curOrder.indexOf(srcId);
            const tIdx = curOrder.indexOf(colId);
            if (sIdx === -1 || tIdx === -1) return;

            curOrder.splice(sIdx, 1);
            curOrder.splice(tIdx, 0, srcId);
            ptTableColState[tableId].order = curOrder;
            savePtColumnsConfig();

            renderTableHeader(tableId);
            refreshTableBody(tableId);
            renderColumnsModalList();
        });

        container.appendChild(card);
    });
}

function toggleColVisibility(tableId, colId, isVisible) {
    const hidden = getHiddenColsSet(tableId);
    if (isVisible) {
        hidden.delete(colId);
    } else {
        hidden.add(colId);
    }
    savePtColumnsConfig();
    applyHiddenCols(tableId);
}

function moveColumnInOrder(tableId, colId, offset) {
    const curOrder = [...getColOrder(tableId)];
    const idx = curOrder.indexOf(colId);
    if (idx === -1) return;
    const newIdx = idx + offset;
    if (newIdx < 0 || newIdx >= curOrder.length) return;

    curOrder.splice(idx, 1);
    curOrder.splice(newIdx, 0, colId);
    ptTableColState[tableId].order = curOrder;
    savePtColumnsConfig();

    renderTableHeader(tableId);
    refreshTableBody(tableId);
    renderColumnsModalList();
}

function showAllColumnsInModal() {
    const tableId = currentColumnsModalTableId;
    if (!tableId) return;
    getHiddenColsSet(tableId).clear();
    savePtColumnsConfig();
    applyHiddenCols(tableId);
    renderColumnsModalList();
}

function resetColumnsOrderAndWidthsInModal() {
    const tableId = currentColumnsModalTableId;
    if (!tableId) return;
    const defs = TABLE_COL_CONFIGS[tableId] || [];
    ptTableColState[tableId].order = defs.map(c => c.id);
    ptTableColState[tableId].widths = {};
    defs.forEach(c => { ptTableColState[tableId].widths[c.id] = c.defaultWidth; });
    ptTableColState[tableId].hidden.clear();

    savePtColumnsConfig();
    renderTableHeader(tableId);
    refreshTableBody(tableId);
    renderColumnsModalList();
}




const DEFAULT_BADGE_DEFINITIONS = [
    { icon: '💎', label: 'Diamond', tone: 'positive', meaning: 'Outstanding contribution' },
    { icon: '👍', label: 'Good Job', tone: 'positive', meaning: 'Solid work and focus' },
    { icon: '👏', label: 'Well Tried', tone: 'positive', meaning: 'Strong effort and perseverance' },
    { icon: 'RV', label: 'RV', tone: 'negative', meaning: 'Renvoi' },
    { icon: 'DNF', label: 'DNF', tone: 'negative', meaning: 'Devoir non fait' },
    { icon: 'OM', label: 'OM', tone: 'negative', meaning: 'Oubli matériel' },
    { icon: 'AT', label: 'AT', tone: 'negative', meaning: 'Arrivée tardive' },
    { icon: '1️⃣', label: 'Level 1', tone: 'negative', meaning: 'Progress marker' },
    { icon: '2️⃣', label: 'Level 2', tone: 'negative', meaning: 'Progress marker' },
    { icon: '3️⃣', label: 'Level 3', tone: 'negative', meaning: 'Progress marker' },
    { icon: '4️⃣', label: 'Level 4', tone: 'positive', meaning: 'Progress marker' },
    { icon: '5️⃣', label: 'Level 5', tone: 'positive', meaning: 'Progress marker' },
    { icon: '6️⃣', label: 'Level 6', tone: 'positive', meaning: 'Progress marker' }
];

function normalizeBadgeLabel(label) {
    return String(label || '').trim().toLowerCase();
}

function normalizeBadgeTone(tone) {
    const value = String(tone || '').trim().toLowerCase();
    if (value === 'negative') return 'negative';
    if (value === 'positive') return 'positive';
    if (value === 'neutral') return 'neutral';
    return '';
}

function normalizeBadgeDefinitions(definitions) {
    const source = Array.isArray(definitions) ? definitions : [];
    const seen = new Set();

    return source.map(entry => ({
        icon: String(entry?.icon || '').trim(),
        label: String(entry?.label || '').trim(),
        tone: normalizeBadgeTone(entry?.tone) || 'positive',
        meaning: String(entry?.meaning || '').trim(),
        coefficient: Number.isFinite(Number(entry?.coefficient)) ? Number(entry.coefficient) : 1,
        scope: String(entry?.scope || 'individual').trim().toLowerCase(),
        hidden: entry?.hidden === true,
        isBuiltin: entry?.isBuiltin === true
    })).filter(entry => {
        const key = `${normalizeBadgeLabel(entry.icon)}|${normalizeBadgeLabel(entry.label)}`;
        if (!entry.icon || !entry.label || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getConfiguredBadgeDefinitions() {
    try {
        const config = (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG)
            ? CLASS_MANAGEMENT_CONFIG
            : null;
        const normalized = normalizeBadgeDefinitions(config?.badgeDefinitions);
        if (normalized.length) return normalized;
    } catch (error) {
        console.warn('Unable to read badge definitions from config.js:', error);
    }

    return DEFAULT_BADGE_DEFINITIONS.map(entry => ({ ...entry }));
}

function resolveBadgeDefinition(badge) {
    if (!badge) return null;
    let icon = '';
    let label = '';

    if (typeof badge === 'object') {
        icon = normalizeBadgeLabel(badge.icon);
        label = normalizeBadgeLabel(badge.label);
    } else if (typeof badge === 'string') {
        label = normalizeBadgeLabel(badge);
    }

    const definitions = getConfiguredBadgeDefinitions();

    if (icon && label) {
        const exact = definitions.find(def => normalizeBadgeLabel(def.icon) === icon && normalizeBadgeLabel(def.label) === label);
        if (exact) return exact;
    }

    if (icon) {
        const iconMatch = definitions.find(def => normalizeBadgeLabel(def.icon) === icon);
        if (iconMatch) return iconMatch;
    }

    if (label) {
        const labelMatch = definitions.find(def => normalizeBadgeLabel(def.label) === label);
        if (labelMatch) return labelMatch;
        const comboMatch = definitions.find(def => normalizeBadgeLabel(`${def.icon} ${def.label}`) === label);
        if (comboMatch) return comboMatch;
    }

    return null;
}

function resolveBadgeData(badge) {
    const configured = resolveBadgeDefinition(badge);
    const rawCoeff = configured?.coefficient !== undefined ? configured.coefficient : (typeof badge === 'object' ? badge?.coefficient : 1);
    const coefficient = Number.isFinite(Number(rawCoeff)) ? Number(rawCoeff) : 1;

    let icon = String(configured?.icon || (typeof badge === 'object' ? badge?.icon : '') || '').trim();
    let label = String(configured?.label || (typeof badge === 'object' ? badge?.label : (typeof badge === 'string' ? badge : 'Badge')) || '').trim();

    if (!icon && typeof badge === 'string') {
        const parts = badge.trim().split(/\s+/);
        if (parts.length > 1 && (parts[0].length <= 4 || /\p{Extended_Pictographic}/u.test(parts[0]))) {
            icon = parts[0];
            label = parts.slice(1).join(' ');
        }
    }

    return {
        icon,
        label,
        meaning: String(configured?.meaning || (typeof badge === 'object' ? badge?.meaning : '') || '').trim(),
        tone: normalizeBadgeTone(configured?.tone || (typeof badge === 'object' ? badge?.tone : '')) || 'neutral',
        coefficient
    };
}

// ─── Name display mode and student resolution helpers ─────────────
function getPtNameDisplayMode() {
    const saved = localStorage.getItem('cmt-pt-name-display');
    if (saved && ['full', 'first', 'last', 'custom'].includes(saved)) return saved;
    try {
        if (typeof CLASS_MANAGEMENT_CONFIG !== 'undefined' && CLASS_MANAGEMENT_CONFIG?.nameDisplayMode) {
            return CLASS_MANAGEMENT_CONFIG.nameDisplayMode;
        }
    } catch (_) {}
    return 'full';
}

function setPtNameDisplayMode(mode) {
    if (!['full', 'first', 'last', 'custom'].includes(mode)) mode = 'full';
    localStorage.setItem('cmt-pt-name-display', mode);
    const sel = document.getElementById('ptNameDisplaySelect');
    if (sel && sel.value !== mode) sel.value = mode;
    updateDashboard();
}

function resolvePtStudent(nameOrUuid) {
    if (!nameOrUuid) return null;
    const roster = (typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER))
        ? window.STUDENTS_ROSTER
        : (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER) ? STUDENTS_ROSTER : []);
    
    if (typeof nameOrUuid === 'object') return nameOrUuid;
    const str = String(nameOrUuid).trim();
    
    const byUuid = roster.find(s => s && (s.uuid === str || s.id === str));
    if (byUuid) return byUuid;

    const upper = str.toUpperCase();
    const byName = roster.find(s => {
        if (!s) return false;
        const fn = (s.firstName || '').trim().toUpperCase();
        const ln = (s.lastName || '').trim().toUpperCase();
        const cn = (s.customName || '').trim().toUpperCase();
        const full = (fn + (ln ? ' ' + ln : '')).trim();
        const fullRev = (ln + (fn ? ' ' + fn : '')).trim();
        return full === upper || fullRev === upper || (cn && cn === upper);
    });
    if (byName) return byName;

    const spaceIdx = str.indexOf(' ');
    return {
        firstName: spaceIdx > 0 ? str.slice(0, spaceIdx) : str,
        lastName: spaceIdx > 0 ? str.slice(spaceIdx + 1) : '',
        customName: ''
    };
}

function getPtStudentDisplayName(rawName) {
    const s = resolvePtStudent(rawName);
    const mode = getPtNameDisplayMode();
    if (window.StudentNameUtils && typeof StudentNameUtils.formatStudentName === 'function') {
        return StudentNameUtils.formatStudentName(s, mode);
    }
    if (mode === 'custom' && s && s.customName) return s.customName;
    if (mode === 'first' && s && s.firstName) return s.firstName;
    if (mode === 'last' && s && s.lastName) return s.lastName;
    return rawName;
}


// Initialize app
async function initializeApp() {
    initHamburger();
    if (typeof applyTranslations === 'function') applyTranslations();
    await Promise.resolve(window.__ptUserBootstrapPromise).catch(function () {});
    _initPtColumnsState();
    renderTableHeader('historyTable');
    renderTableHeader('classOverviewTable');
    renderTableHeader('studentTable');
    await loadPtColumnsConfigFile().catch(function () {});
    // Check if electron is available
    ELECTRON_AVAILABLE = !!(window.electronApi && window.electronApi.isElectron);

    // In a regular browser or file:// launch, cms-db.js is preloaded above.
    // In Electron, load per-class files from class subfolders (new format),
    // falling back to the legacy flat cms-db.js if no subfoldered files exist.
    if (ELECTRON_AVAILABLE && window.Desktop) {
        let loaded = false;
        try {
            const listResult = await window.Desktop.listByPath('groupParticipation', '.', { extensions: ['.js'] });
            const subFiles = (listResult?.files || []).filter(f => f.relativePath && f.relativePath.includes('/'));
            if (subFiles.length > 0) {
                const allSessions = [];
                const seenIds = new Set();
                for (const fileInfo of subFiles) {
                    try {
                        const result = await window.Desktop.readByPath('groupParticipation', fileInfo.relativePath);
                        if (result && result.ok && result.content) {
                            const sessions = extractSessionsFromContent(result.content);
                            for (const s of sessions) {
                                if (!s || !s.id) continue;
                                if (seenIds.has(s.id)) {
                                    const existingSess = allSessions.find(item => item.id === s.id);
                                    const isSameClass = existingSess && existingSess.activeGroup === s.activeGroup;
                                    if (isSameClass && typeof areEqualByData === 'function' && areEqualByData(existingSess, s)) {
                                        continue;
                                    }
                                    // Collision on different session or class! Auto-heal with unique timestamp
                                    let ms = new Date(s.id).getTime();
                                    if (Number.isNaN(ms)) ms = Date.now();
                                    let cand = new Date(ms).toISOString();
                                    while (seenIds.has(cand)) {
                                        ms += 1;
                                        cand = new Date(ms).toISOString();
                                    }
                                    s.id = cand;
                                }
                                // Ensure student IDs within the session are unique
                                if (s.groups && typeof s.groups === 'object') {
                                    Object.keys(s.groups).forEach(gName => {
                                        const grp = s.groups[gName];
                                        if (Array.isArray(grp)) {
                                            const stSeen = new Set();
                                            grp.forEach(st => {
                                                if (st.id == null || stSeen.has(st.id)) {
                                                    let nid = Date.now() + Math.random();
                                                    while (stSeen.has(nid)) nid = Date.now() + Math.random();
                                                    st.id = nid;
                                                }
                                                stSeen.add(st.id);
                                            });
                                        }
                                    });
                                }
                                seenIds.add(s.id);
                                allSessions.push(s);
                            }
                        }
                    } catch (e) { /* skip unreadable file */ }
                }
                if (allSessions.length > 0) {
                    DB_EXPORT.splice(0, DB_EXPORT.length, ...allSessions);
                    syncGlobalDbExport();
                    loaded = true;
                }
            }
        } catch (e) { /* fall through to legacy */ }

        if (!loaded) {
            // Legacy fallback: flat cms-db.js / cms-db.json / cms-db.txt
            const candidates = ['cms-db.js', 'cms-db.json', 'cms-db.txt'];
            for (const filename of candidates) {
                try {
                    const result = await window.Desktop.readText('groupParticipation', filename);
                    if (result && result.ok && result.content) {
                        const sessions = extractSessionsFromContent(result.content);
                        DB_EXPORT.splice(0, DB_EXPORT.length, ...sessions);
                        syncGlobalDbExport();
                        break;
                    }
                } catch (e) {
                    // Try the next legacy filename.
                }
            }
        }
    } else {
        syncGlobalDbExport();
    }

    applySessionNormalization('startup');

    // Apply tombstone (deleted sessions) and notes overlay
    if (ELECTRON_AVAILABLE && window.Desktop) {
        try {
            const tomb = await Desktop.readText('groupParticipation', 'pt-deleted.js');
            if (tomb?.ok && tomb.content) {
                const m = tomb.content.match(/window\.CMS_DELETED_SESSIONS\s*=\s*(\[[\s\S]*?\]);?/);
                if (m) {
                    const deletedIds = new Set(JSON.parse(m[1]));
                    if (deletedIds.size > 0) {
                        const kept = DB_EXPORT.filter(s => !deletedIds.has(s.id));
                        DB_EXPORT.splice(0, DB_EXPORT.length, ...kept);
                        syncGlobalDbExport();
                    }
                }
            }
        } catch (e) {}
        try {
            const np = await Desktop.readText('groupParticipation', 'pt-notes.js');
            if (np?.ok && np.content) {
                const m = np.content.match(/window\.CMS_NOTES_PATCH\s*=\s*(\{[\s\S]*\});?\s*$/);
                if (m) {
                    const patch = JSON.parse(m[1]);
                    DB_EXPORT.forEach(session => {
                        const sp = patch[session.id];
                        if (!sp) return;
                        Object.values(session.groups || {}).forEach(students => {
                            students.forEach(student => {
                                if (Object.prototype.hasOwnProperty.call(sp, student.name)) {
                                    student.notes = sp[student.name];
                                }
                            });
                        });
                    });
                }
            }
        } catch (e) {}
        try {
            window.CMS_PARTICIPATION_RULES = {};
            const rp = await Desktop.readText('groupParticipation', 'pt-rules.js');
            if (rp?.ok && rp.content) {
                const m = rp.content.match(/window\.CMS_PARTICIPATION_RULES\s*=\s*(\{[\s\S]*\});?\s*$/);
                if (m) {
                    window.CMS_PARTICIPATION_RULES = JSON.parse(m[1]);
                }
            }
        } catch (e) {
            console.warn('Failed to load pt-rules.js:', e);
        }
        try {
            window.CMS_PARTICIPATION_PRESETS = [];
            const pp = await Desktop.readText('groupParticipation', 'pt-presets.js');
            if (pp?.ok && pp.content) {
                const m2 = pp.content.match(/window\.CMS_PARTICIPATION_PRESETS\s*=\s*(\[[\s\S]*\]);?\s*$/);
                if (m2) {
                    window.CMS_PARTICIPATION_PRESETS = JSON.parse(m2[1]);
                }
            }
            // One-time migration: move any presets from localStorage into the file
            if (window.CMS_PARTICIPATION_PRESETS.length === 0) {
                try {
                    const legacy = localStorage.getItem('CMS_PARTICIPATION_RULES_PRESETS');
                    if (legacy) {
                        const legacyArr = JSON.parse(legacy);
                        if (Array.isArray(legacyArr) && legacyArr.length > 0) {
                            window.CMS_PARTICIPATION_PRESETS = legacyArr;
                            await Desktop.saveText('groupParticipation', 'pt-presets.js',
                                `window.CMS_PARTICIPATION_PRESETS = ${JSON.stringify(legacyArr, null, 2)};\n`);
                            localStorage.removeItem('CMS_PARTICIPATION_RULES_PRESETS');
                            console.log('[PT] Migrated', legacyArr.length, 'presets from localStorage to pt-presets.js');
                        }
                    }
                } catch (me) {
                    console.warn('Preset localStorage migration failed:', me);
                }
            }
        } catch (e) {
            console.warn('Failed to load pt-presets.js:', e);
        }
    }


    setupImportHandlers();
    setupEventListeners();

    if (DB_EXPORT.length === 0) {
        showMessage(t('ptMsgNoData'), 'error');
        return;
    }

    if (typeof CLASS_GROUPS_META === 'undefined' || !CLASS_GROUPS_META || Object.keys(CLASS_GROUPS_META).length === 0 || typeof CLASS_GROUPS_DATA === 'undefined' || !CLASS_GROUPS_DATA) {
        // Try loading from user data folder (class-groups.js is not bundled in the packaged app).
        if (window.Desktop && typeof Desktop.readText === 'function') {
            try {
                const gr = await Desktop.readText('user', 'class-groups.js');
                if (gr?.ok && gr.content) {
                    const fn = new Function(gr.content + '; return typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : {};');
                    const parsed = fn();
                    if (parsed) {
                        window.CLASS_GROUPS_DATA = parsed;
                        if (parsed.classGroupsMeta) window.CLASS_GROUPS_META = parsed.classGroupsMeta;
                    }
                }
            } catch (e) { /* ignore */ }
        }
    }

    if (typeof PLANNER_CONFIG === 'undefined' || !PLANNER_CONFIG) {
        if (window.Desktop && typeof Desktop.readText === 'function') {
            try {
                const pr = await Desktop.readText('user', 'planner-config.js');
                if (pr?.ok && pr.content) {
                    const fn = new Function('window', pr.content + '; return window.PLANNER_CONFIG || null;');
                    const pcfg = fn({});
                    if (pcfg) window.PLANNER_CONFIG = pcfg;
                }
            } catch (e) { /* ignore */ }
        }
    }

    if (typeof CLASS_GROUPS_META === 'undefined' || !CLASS_GROUPS_META || Object.keys(CLASS_GROUPS_META).length === 0) {
        showMessage(t('ptMsgNoGroups'), 'error');
        return;
    }

    populateGroups();
    const urlParams = new URLSearchParams(window.location.search);
    const targetGroup = urlParams.get('group') || urlParams.get('class') || urlParams.get('classId') || urlParams.get('className');
    const targetGroupName = urlParams.get('className');
    const targetStudent = urlParams.get('student') || urlParams.get('studentName') || urlParams.get('studentId');

    const allGroups = extractGroupsFromData();
    function findMatchingGroup(param) {
        if (!param || allGroups.length === 0) return null;
        const norm = param.trim().toLowerCase();
        return allGroups.find(g => g === param) ||
               allGroups.find(g => {
                   const m = (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) ? CLASS_GROUPS_META[g] : null;
                   return m && (m.id === param || m.uuid === param);
               }) ||
               allGroups.find(g => groupDisplayName(g).trim().toLowerCase() === norm) ||
               null;
    }

    let selectedG = findMatchingGroup(targetGroup);
    if (!selectedG && targetGroupName && targetGroupName !== targetGroup) {
        selectedG = findMatchingGroup(targetGroupName);
    }

    if (selectedG) {
        selectGroup(selectedG);
        if (targetStudent) {
            let sName = targetStudent;
            const roster = _ptRoster();
            if (roster[targetStudent]) {
                const s = roster[targetStudent];
                sName = ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || sName;
            }
            const groupStudents = extractStudentsForGroup(selectedG);
            const candidates = [sName, urlParams.get('studentName')].filter(Boolean);
            let match = null;
            for (const cand of candidates) {
                const norm = cand.trim().toUpperCase();
                const rev = cand.trim().split(/\s+/).reverse().join(' ').toUpperCase();
                match = groupStudents.find(s => s.toUpperCase() === norm) ||
                        groupStudents.find(s => s.toUpperCase() === rev) ||
                        groupStudents.find(s => s.toUpperCase().includes(norm)) ||
                        groupStudents.find(s => s.toUpperCase().includes(rev)) ||
                        null;
                if (match) break;
            }
            selectStudentFromSearch(match || sName, selectedG);
        }
    } else {
        selectFirstGroup();
    }
    _initActiveContext();
    showMessage(t('ptMsgReady'), 'success');
}

// Import & Merge functionality - Define BEFORE setupEventListeners
function setupImportHandlers() {
    const importBtn = document.getElementById('importBtn');
    const dragDropZone = document.getElementById('dragDropZone');
    const fileInput = document.getElementById('fileInput');

    // Import button
    importBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processImportedFiles(e.target.files);
            fileInput.value = ''; // Reset input
        }
    });

    // Drag & drop
    dragDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropZone.classList.add('active');
    });

    dragDropZone.addEventListener('dragleave', () => {
        dragDropZone.classList.remove('active');
    });

    dragDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropZone.classList.remove('active');
        processImportedFiles(e.dataTransfer.files);
    });

    // Click on drag zone to select files
    dragDropZone.querySelector('.link-button').addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });
}

async function processImportedFiles(files) {
    const importedSessions = [];

    for (const file of files) {
        try {
            const content = await file.text();
            const sessions = extractSessionsFromContent(content);
            importedSessions.push(...sessions);
            showMessage(tFmt('ptMsgParsedFile', { name: file.name, n: sessions.length }), 'success');
        } catch (error) {
            showMessage(tFmt('ptMsgErrReadingFile', { name: file.name, msg: error.message }), 'error');
        }
    }

    if (importedSessions.length === 0) {
        showMessage(t('ptMsgNoValidData'), 'error');
        return;
    }

    pendingImportData = importedSessions;
    showImportPreview(importedSessions);
}

function extractSessionsFromContent(content) {
    const text = String(content || '').trim();

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {}

    const match = text.match(/(?:const|let|var)?\s*(?:window\.)?(?:CMS_)?DB_EXPORT\s*=\s*(\[[\s\S]*\]);?/);
    if (!match) {
        throw new Error('Could not find a valid DB export in file');
    }

    try {
        return JSON.parse(match[1]);
    } catch (e) {
        throw new Error('Invalid JSON in DB export');
    }
}

function getSessionDate(session) {
    return String(session && session.id ? session.id : '').split('T')[0];
}

function getSessionLocalDateStr(session) {
    if (!session) return new Date().toLocaleDateString('en-CA');
    const rawId = String(session.id || '').trim();
    if (rawId.includes('T')) {
        const dt = new Date(rawId);
        if (!Number.isNaN(dt.getTime())) {
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(rawId)) {
        return rawId.slice(0, 10);
    }
    const rawDate = String(session.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        return rawDate.slice(0, 10);
    }
    if (rawDate) {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
        }
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function deepSortObject(value) {
    if (Array.isArray(value)) {
        return value.map(deepSortObject);
    }

    if (value && typeof value === 'object') {
        const sorted = {};
        Object.keys(value).sort().forEach(key => {
            sorted[key] = deepSortObject(value[key]);
        });
        return sorted;
    }

    return value;
}

function areEqualByData(left, right) {
    return JSON.stringify(deepSortObject(left)) === JSON.stringify(deepSortObject(right));
}

function hasGroups(session) {
    return !!(session && session.groups && Object.keys(session.groups).length > 0);
}

function cloneSessions(sessions) {
    return JSON.parse(JSON.stringify(sessions || []));
}

function getSessionTimestamp(session) {
    const ts = Date.parse(String(session && session.id ? session.id : ''));
    return Number.isFinite(ts) ? ts : 0;
}

function buildGroupDayKey(session, groupId) {
    const date = getSessionDate(session);
    if (!date) {
        return `${groupId}|id:${String(session && session.id ? session.id : '')}`;
    }
    return `${groupId}|${date}`;
}

function normalizeSessionsForTracker(sessions) {
    const source = cloneSessions(Array.isArray(sessions) ? sessions : []);
    const byId = new Map();
    const withoutId = [];

    source.forEach(session => {
        if (!session || !session.id) {
            withoutId.push(session);
            return;
        }

        // Ensure student IDs in this session are unique
        if (session.groups && typeof session.groups === 'object') {
            Object.keys(session.groups).forEach(gName => {
                const grp = session.groups[gName];
                if (Array.isArray(grp)) {
                    const stSeen = new Set();
                    grp.forEach(st => {
                        if (st.id == null || stSeen.has(st.id)) {
                            let nid = Date.now() + Math.random();
                            while (stSeen.has(nid)) nid = Date.now() + Math.random();
                            st.id = nid;
                        }
                        stSeen.add(st.id);
                    });
                }
            });
        }

        if (session.plannerSlot && typeof session.plannerSlot === 'object') {
            const ps = session.plannerSlot;
            let time = String(ps.time || '').trim();
            let timeEnd = String(ps.timeEnd || '').trim();
            let halfGroup = String(ps.halfGroup || '').trim();
            if (/^\d{1,2}$/.test(time) && /^\d{1,2}$/.test(timeEnd)) {
                time = `${time.padStart(2, '0')}:${timeEnd.padStart(2, '0')}`;
                timeEnd = '';
            } else if (/^\d{1,2}$/.test(time)) {
                time = `${time.padStart(2, '0')}:00`;
            }
            if (/^\d{1,2}$/.test(halfGroup)) {
                halfGroup = '';
            }
            ps.time = time;
            ps.timeEnd = timeEnd;
            ps.halfGroup = halfGroup;
        }

        const existing = byId.get(session.id);
        if (!existing || getSessionTimestamp(session) >= getSessionTimestamp(existing)) {
            byId.set(session.id, session);
        }
    });

    const ordered = [...byId.values(), ...withoutId]
        .sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a));

    // Group sessions by (groupId, day) to merge any fragmented session entries on the same day
    const sessionsByGroupDay = new Map();
    ordered.forEach(session => {
        const groups = (session && session.groups && typeof session.groups === 'object') ? session.groups : {};
        Object.keys(groups).forEach(groupId => {
            const key = buildGroupDayKey(session, groupId);
            if (!sessionsByGroupDay.has(key)) {
                sessionsByGroupDay.set(key, []);
            }
            sessionsByGroupDay.get(key).push({ session, students: groups[groupId] || [] });
        });
    });

    let mergedGroups = 0;
    sessionsByGroupDay.forEach((entries, key) => {
        if (entries.length <= 1) return;

        // Sort so the session with the largest roster is primary
        entries.sort((a, b) => (b.students.length || 0) - (a.students.length || 0));
        const primary = entries[0];
        const groupId = key.split('|')[0];

        for (let i = 1; i < entries.length; i++) {
            const secondary = entries[i];
            const secStudents = secondary.students || [];
            const priStudents = primary.session.groups[groupId] || [];

            secStudents.forEach(st => {
                if (!st || !st.name) return;
                const matchIdx = priStudents.findIndex(p =>
                    (p.uuid && st.uuid && p.uuid === st.uuid) ||
                    (p.name && String(p.name).trim().toUpperCase() === String(st.name).trim().toUpperCase())
                );

                if (matchIdx !== -1) {
                    const p = priStudents[matchIdx];
                    p.pluses = Math.max(p.pluses || 0, st.pluses || 0);
                    p.minuses = Math.max(p.minuses || 0, st.minuses || 0);
                    p.teamPluses = Math.max(p.teamPluses || 0, st.teamPluses || 0);
                    p.teamMinuses = Math.max(p.teamMinuses || 0, st.teamMinuses || 0);
                    p.isPicked = !!(p.isPicked || st.isPicked);
                    if (st.isAbsent !== undefined) p.isAbsent = st.isAbsent;
                    if (Array.isArray(st.badges) && st.badges.length) {
                        p.badges = p.badges || [];
                        st.badges.forEach(b => {
                            const bKey = typeof b === 'string' ? b : `${b.icon || ''}|${b.label || ''}|${b.time || ''}`;
                            const exists = p.badges.some(pb => (typeof pb === 'string' ? pb : `${pb.icon || ''}|${pb.label || ''}|${pb.time || ''}`) === bKey);
                            if (!exists) p.badges.push(b);
                        });
                    }
                    if (st.notes && (!p.notes || !p.notes.includes(st.notes))) {
                        p.notes = p.notes ? `${p.notes} | ${st.notes}` : st.notes;
                    }
                } else {
                    priStudents.push(cloneSessions(st));
                }
            });

            delete secondary.session.groups[groupId];
            mergedGroups++;
        }
    });

    const normalized = ordered.filter(hasGroups);
    return {
        sessions: normalized,
        stats: {
            droppedById: source.length - withoutId.length - byId.size,
            removedGroups: mergedGroups,
            removedEmptySessions: ordered.length - normalized.length
        }
    };
}

function applySessionNormalization(reason = 'runtime') {
    const result = normalizeSessionsForTracker(DB_EXPORT);
    DB_EXPORT.splice(0, DB_EXPORT.length, ...result.sessions);
    syncGlobalDbExport();

    if (result.stats.droppedById > 0 || result.stats.removedGroups > 0 || result.stats.removedEmptySessions > 0) {
        console.info(
            `[tracker] Normalized sessions (${reason}): ` +
            `droppedById=${result.stats.droppedById}, ` +
            `removedGroups=${result.stats.removedGroups}, ` +
            `removedEmptySessions=${result.stats.removedEmptySessions}`
        );
    }

    return result.stats;
}

async function resolveAppendImportConflicts(existingSessions, importedSessions) {
    const existing = cloneSessions(existingSessions);
    const incoming = cloneSessions(importedSessions);
    const stats = {
        skippedIdentical: 0,
        keptExisting: 0,
        keptImported: 0,
        prompts: 0
    };

    for (const importedSession of incoming) {
        if (!importedSession.groups) importedSession.groups = {};

        const sessionDate = getSessionDate(importedSession);
        for (const groupId of Object.keys(importedSession.groups)) {
            const importedGroupData = importedSession.groups[groupId];
            const conflicts = existing.filter(existingSession =>
                getSessionDate(existingSession) === sessionDate &&
                existingSession.groups &&
                existingSession.groups[groupId]
            );

            if (conflicts.length === 0) continue;

            const identicalConflict = conflicts.some(existingSession =>
                areEqualByData(existingSession.groups[groupId], importedGroupData)
            );

            if (identicalConflict) {
                delete importedSession.groups[groupId];
                stats.skippedIdentical++;
                continue;
            }

            stats.prompts++;
            const keepImported = await showConfirm(
                tFmt('ptConfirmImportConflict', { groupId: groupDisplayName(groupId), sessionDate, n: conflicts.length })
            );

            if (keepImported) {
                conflicts.forEach(existingSession => {
                    delete existingSession.groups[groupId];
                });
                stats.keptImported++;
            } else {
                delete importedSession.groups[groupId];
                stats.keptExisting++;
            }
        }
    }

    const merged = [
        ...existing.filter(hasGroups),
        ...incoming.filter(hasGroups)
    ];

    return {
        merged,
        stats,
        addedSessions: incoming.filter(hasGroups).length
    };
}

function showImportPreview(sessions) {
    const previewContent = document.getElementById('importPreviewContent');
    
    // Group sessions by group
    const groupCounts = {};
    const sessionDates = [];
    let totalStudents = 0;

    sessions.forEach(session => {
        sessionDates.push(new Date(session.id).toLocaleDateString());
        Object.keys(session.groups || {}).forEach(groupId => {
            groupCounts[groupId] = (groupCounts[groupId] || 0) + 1;
            totalStudents += (session.groups[groupId] || []).length;
        });
    });

    let html = `
        <div style="margin-bottom: 15px;">
            <p><strong><img src="../assets/icons/table.svg" class="btn-icon" alt="" /> Import Summary</strong></p>
            <ul style="margin-top: 8px; margin-left: 20px;">
                <li><strong>${sessions.length}</strong> sessions</li>
                <li><strong>${Object.keys(groupCounts).length}</strong> groups included</li>
                <li><strong>${totalStudents}</strong> total student records</li>
                <li>Date range: ${sessionDates[0]} to ${sessionDates[sessionDates.length - 1]}</li>
            </ul>
        </div>

        <div style="margin-bottom: 15px;">
            <p><strong><img src="../assets/icons/groups.svg" class="btn-icon" alt="" /> Groups by session count:</strong></p>
            <ul style="margin-top: 8px; margin-left: 20px; font-size: 12px;">
    `;

    Object.entries(groupCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([groupId, count]) => {
            html += `<li>${groupDisplayName(groupId)}: ${count} session(s)</li>`;
        });

    html += `
            </ul>
        </div>

        <div>
            <p><strong><img src="../assets/icons/error.svg" class="btn-icon" alt="" /> Duplicate Note:</strong></p>
            <p style="font-size: 12px; color: #666;">
                If you choose "Append", exact duplicate group+date data is skipped automatically.
                For conflicting group+date data, you will be asked which one to keep.
                If you choose "Replace", all current data will be overwritten.
            </p>
        </div>
    `;

    previewContent.innerHTML = html;
    document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    pendingImportData = null;
}

async function confirmImportAndMerge() {
    const strategy = document.querySelector('input[name="mergeStrategy"]:checked').value;

    if (!pendingImportData || pendingImportData.length === 0) {
        showMessage(t('ptMsgNoDataMerge'), 'error');
        return;
    }

    if (strategy === 'replace') {
        DB_EXPORT.splice(0, DB_EXPORT.length, ...pendingImportData);
        const normalizationStats = applySessionNormalization('import-replace');
        const dedupeNote = normalizationStats.removedGroups > 0
            ? ` (${normalizationStats.removedGroups} duplicate group/day entr${normalizationStats.removedGroups === 1 ? 'y' : 'ies'} removed)`
            : '';
        showMessage(`✓ Replaced with ${pendingImportData.length} sessions${dedupeNote}`, 'success');
    } else {
        // Append strategy with per group/date conflict resolution
        const mergeResult = await resolveAppendImportConflicts(DB_EXPORT, pendingImportData);
        DB_EXPORT.splice(0, DB_EXPORT.length, ...mergeResult.merged);
        const normalizationStats = applySessionNormalization('import-append');

        const summary = [];
        if (mergeResult.stats.skippedIdentical > 0) {
            summary.push(`${mergeResult.stats.skippedIdentical} identical group+date entr${mergeResult.stats.skippedIdentical === 1 ? 'y' : 'ies'} skipped`);
        }
        if (mergeResult.stats.keptImported > 0) {
            summary.push(`${mergeResult.stats.keptImported} conflict${mergeResult.stats.keptImported === 1 ? '' : 's'} kept imported`);
        }
        if (mergeResult.stats.keptExisting > 0) {
            summary.push(`${mergeResult.stats.keptExisting} conflict${mergeResult.stats.keptExisting === 1 ? '' : 's'} kept existing`);
        }
        if (normalizationStats.removedGroups > 0) {
            summary.push(`${normalizationStats.removedGroups} duplicate group+date entr${normalizationStats.removedGroups === 1 ? 'y' : 'ies'} auto-removed`);
        }

        const summaryText = summary.length ? ` (${summary.join('; ')})` : '';
        showMessage(
            `✓ Merged ${mergeResult.addedSessions} session(s) (total: ${DB_EXPORT.length})${summaryText}`,
            'success'
        );
    }

    // Refresh UI with merged data
    closeImportModal();
    updateDashboard();
    populateGroups();
    selectFirstGroup();
}

function setupEventListeners() {
    // Date preset buttons
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const preset = this.dataset.preset;
            applyDatePreset(preset);
            updateDashboard();
        });
    });

    // Custom date inputs
    document.getElementById('dateFrom').addEventListener('change', () => {
        document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
        updateDashboard();
    });

    document.getElementById('dateTo').addEventListener('change', () => {
        document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
        updateDashboard();
    });

    // Table header sorting event delegation across all 3 tables
    ['historyTable', 'classOverviewTable', 'studentTable'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        const thead = table.querySelector('thead');
        if (!thead) return;
        thead.addEventListener('click', function(e) {
            if (_wasColumnDragging || _wasColumnResizing) return;
            if (e.target.closest('.col-resizer') || e.target.closest('.col-drag-handle')) return;
            const th = e.target.closest('th');
            if (!th) return;
            const col = th.dataset.col || th.dataset.sort;
            if (!col || col === 'actions') return;
            if (tableId === 'historyTable') {
                sortHistoryTable(col);
            } else if (tableId === 'classOverviewTable') {
                sortClassOverviewTable(col);
            } else if (tableId === 'studentTable') {
                sortStudentTable(col);
            }
        });
    });

    // Reset buttons
    const resetGroupBtn = document.getElementById('resetGroupBtn');
    if (resetGroupBtn) {
        resetGroupBtn.addEventListener('click', handleResetGroupClick);
    }

    document.getElementById('clearSessionFilterBtn').addEventListener('click', () => {
        if (!selectedHistorySessionId) return;
        selectedHistorySessionId = null;
        currentStudentName = null;
        document.getElementById('studentDetailsArea').classList.add('hidden');
        document.getElementById('studentDetailTitle').classList.add('hidden');
        updateDashboard();
    });

    // Export and Print
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    const compareBtn = document.getElementById('openCompareGroupsBtn');
    if (compareBtn) compareBtn.addEventListener('click', openCompareGroupsModal);

    const nameDisplaySel = document.getElementById('ptNameDisplaySelect');
    if (nameDisplaySel) {
        nameDisplaySel.value = getPtNameDisplayMode();
        nameDisplaySel.addEventListener('change', () => {
            setPtNameDisplayMode(nameDisplaySel.value);
        });
    }

    const clearCompareBtn = document.getElementById('clearCompareBtn');
    if (clearCompareBtn) {
        clearCompareBtn.addEventListener('click', () => {
            compareGroupIds = [];
            renderCompareGroupsSummary();
        });
    }

    // Context menu event delegation for student rows & cells
    document.addEventListener('contextmenu', function(e) {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const table = tr.closest('table');
        if (!table) return;
        if (tr.parentNode && (tr.parentNode.tagName === 'THEAD' || tr.parentNode.tagName === 'TFOOT')) return;

        if (table.id === 'studentTable') {
            const td = e.target.closest('td[data-col]');
            const sessionId = tr.dataset.sessionId;
            const studentName = tr.dataset.studentName || currentStudentName;
            if (td && sessionId && studentName && typeof openStudentCellPopover === 'function') {
                e.preventDefault();
                e.stopPropagation();
                openStudentCellPopover(td, sessionId, studentName, td.dataset.col, e.clientX, e.clientY);
            }
            return;
        }

        if (table.id === 'classOverviewTable' || table.classList.contains('class-overview-table')) {
            const studentName = tr.dataset.studentName || (tr.cells && tr.cells[0] ? tr.cells[0].textContent.trim() : null);
            if (studentName && !['Total', 'Class Total', 'Class Avg', 'TOTAL', 'AVERAGE'].includes(studentName)) {
                e.preventDefault();
                e.stopPropagation();
                openStudentEditModal(studentName);
            }
        }
    });

    setupStudentSearchListeners();
}

