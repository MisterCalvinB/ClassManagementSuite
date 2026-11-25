'use strict';

// Test Creator — Unit Sequences, Pull from Lesson, Templates & Test Persistence
// ── Unit Sequence Badge & State ──────────────────────────────────────
function tcUpdateUnitSeqBadge() {
  var disp = document.getElementById('tcUnitSeqDisplay');
  if (!disp) return;
  var seq = currentTest && currentTest.unitSequence;
  var noneTxt = (typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t('tcNone') : '') || 'None';
  if (seq && seq.title && seq.title.trim()) {
    var count = (seq.lessons && Array.isArray(seq.lessons)) ? seq.lessons.length : 1;
    disp.textContent = seq.title + (count > 1 ? (' (' + count + ')') : '');
  } else {
    disp.textContent = noneTxt;
  }
}
window.tcUpdateUnitSeqBadge = tcUpdateUnitSeqBadge;

// ── Unit Sequence Manager & Exporting ────────────────────────────────
window._tcAllSequences = [];
window._tcAllLessons = [];
window._tcAllTests = [];
window._tcPickerFilterType = 'all';

async function tcLoadSequencesAndItems() {
  window._tcAllSequences = [];
  window._tcAllLessons = [];
  window._tcAllTests = [];

  // 1. Load sequence index
  try {
    var rawList = [];
    if (window.Desktop && Desktop.isElectron && typeof Desktop.readText === 'function') {
      var readIdx = await Desktop.readText('user', 'lesson-sequences.json').catch(function () {});
      if (readIdx && readIdx.ok && readIdx.content) {
        try { rawList = JSON.parse(readIdx.content); } catch (_) {}
      }
    } else {
      var raw = localStorage.getItem('cmt-lesson-sequences');
      if (raw) {
        try { rawList = JSON.parse(raw); } catch (_) {}
      }
    }
    if (Array.isArray(rawList)) window._tcAllSequences = rawList;
  } catch (_) {}

  // 2. Load lessons
  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);
  if (isElec && typeof Desktop.listFiles === 'function') {
    try {
      var res = await Desktop.listFiles('lessons', { extensions: ['.json'] });
      var list = Array.isArray(res) ? res : ((res && Array.isArray(res.files)) ? res.files : []);
      for (var i = 0; i < list.length; i++) {
        var fn = typeof list[i] === 'string' ? list[i] : (list[i].filename || list[i].name);
        if (!fn) continue;
        try {
          var rText = await Desktop.readText('lessons', fn);
          if (rText && rText.ok && rText.content) {
            var parsed = JSON.parse(rText.content);
            if (parsed && parsed.id) {
              parsed._filename = fn;
              parsed._itemType = 'lesson';
              window._tcAllLessons.push(parsed);
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  } else {
    for (var k in localStorage) {
      if (k && k.indexOf('cmt-lesson-') === 0) {
        try {
          var p = JSON.parse(localStorage.getItem(k));
          if (p && p.id) {
            p._filename = 'lp_' + p.id + '.json';
            p._itemType = 'lesson';
            window._tcAllLessons.push(p);
          }
        } catch (_) {}
      }
    }
  }

  // 3. Load tests
  if (isElec && typeof Desktop.listFiles === 'function') {
    try {
      var tRes = await Desktop.listFiles('tests', { extensions: ['.json'] });
      var tList = Array.isArray(tRes) ? tRes : ((tRes && Array.isArray(tRes.files)) ? tRes.files : []);
      for (var j = 0; j < tList.length; j++) {
        var tfn = typeof tList[j] === 'string' ? tList[j] : (tList[j].filename || tList[j].name);
        if (!tfn) continue;
        try {
          var trText = await Desktop.readText('tests', tfn);
          if (trText && trText.ok && trText.content) {
            var tParsed = JSON.parse(trText.content);
            if (tParsed && tParsed.id) {
              tParsed._filename = tfn;
              tParsed._itemType = 'test';
              window._tcAllTests.push(tParsed);
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  } else {
    try {
      var rawTests = JSON.parse(localStorage.getItem('cmt_tests'));
      if (Array.isArray(rawTests)) {
        rawTests.forEach(function (t) {
          if (t && t.id) {
            t._filename = 'test_' + t.id + '.json';
            t._itemType = 'test';
            window._tcAllTests.push(t);
          }
        });
      }
    } catch (_) {}
  }
}

function tcEnsureCurrentTestSequence() {
  if (!currentTest.unitSequence) {
    currentTest.unitSequence = { title: '', lessons: [] };
  }
  if (!Array.isArray(currentTest.unitSequence.lessons)) {
    currentTest.unitSequence.lessons = [];
  }
  var myId = currentTest.id || ('test_' + Date.now());
  if (currentTest.unitSequence.lessons.length === 0) {
    currentTest.unitSequence.lessons.push({
      id: myId,
      type: 'test',
      title: currentTest.title || 'Current Test',
      filename: currentTest._filename || ('test_' + myId + '.json')
    });
  }
  return currentTest.unitSequence;
}

function tcRenderSequenceMembers() {
  var container = document.getElementById('tcSequenceMembersList');
  var countBadge = document.getElementById('tcSeqMemberCountBadge');
  if (!container) return;
  var seq = currentTest.unitSequence;
  var lessons = (seq && Array.isArray(seq.lessons)) ? seq.lessons : [];

  if (countBadge) {
    countBadge.textContent = lessons.length + (lessons.length === 1 ? ' item' : ' items');
  }

  if (lessons.length === 0) {
    container.innerHTML = '<div style="color:#666;font-size:0.85rem;padding:8px 0;" data-i18n="lcSeqEmpty">No lessons or tests in sequence yet. Add from the list below.</div>';
    return;
  }

  var lessonTxt = typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t('lcItemLesson') : 'Lesson';
  var testTxt = typeof i18n !== 'undefined' && typeof i18n.t === 'function' ? i18n.t('lcItemTest') : 'Test / Exam';

  container.innerHTML = lessons.map(function (les, idx) {
    var isTest = (les.type === 'test');
    var isCurrent = (les.id === currentTest.id);
    var badgeHtml = isTest
      ? '<span class="seq-item-badge badge-test" style="font-size:0.68rem;font-weight:900;padding:2px 6px;border:1.5px solid #000;border-radius:3px;background:#fef08a;color:#713f12;">' + escapeHtml(testTxt) + '</span>'
      : '<span class="seq-item-badge badge-lesson" style="font-size:0.68rem;font-weight:900;padding:2px 6px;border:1.5px solid #000;border-radius:3px;background:#bfdbfe;color:#1e3a8a;">' + escapeHtml(lessonTxt) + '</span>';

    var actionHtml = '';
    if (isCurrent) {
      actionHtml = '<span style="font-size:0.72rem;font-weight:900;background:#000;color:#fff;padding:2px 6px;border-radius:3px;">' + escapeHtml(i18n.t('lcCurrentBadge') || 'Current') + '</span>';
    } else if (!isTest) {
      actionHtml = '<button type="button" class="neo-btn" style="padding:2px 7px;font-size:0.75rem;" onclick="tcOpenSequenceMemberLesson(\'' + escapeHtml(les.id) + '\', \'' + escapeHtml(les.filename || '') + '\')" title="' + escapeHtml(i18n.t('tcOpenInLessonCreator')) + '">' + escapeHtml(i18n.t('tcOpenBtn')) + '</button>';
    }

    return '<div class="seq-member-row' + (isCurrent ? ' is-current' : '') + '" style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:2px solid #000;border-radius:4px;background:' + (isCurrent ? '#fef08a' : '#fff') + ';margin-bottom:4px;box-shadow:2px 2px 0 #000;">' +
      '<span style="font-weight:900;font-size:0.78rem;min-width:22px;text-align:center;background:#000;color:#fff;border-radius:3px;padding:1px 4px;">' + (idx + 1) + '</span>' +
      badgeHtml +
      '<span style="flex:1;font-weight:700;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(les.title || 'Untitled') + '">' + escapeHtml(les.title || 'Untitled') + '</span>' +
      actionHtml +
      '<button type="button" class="neo-btn" style="padding:2px 7px;font-size:0.75rem;" onclick="tcMoveMemberInSequence(' + idx + ',-1)" ' + (idx === 0 ? 'disabled' : '') + '>▲</button>' +
      '<button type="button" class="neo-btn" style="padding:2px 7px;font-size:0.75rem;" onclick="tcMoveMemberInSequence(' + idx + ',1)" ' + (idx === lessons.length - 1 ? 'disabled' : '') + '>▼</button>' +
      '<button type="button" class="neo-btn danger" style="padding:2px 7px;font-size:0.75rem;" onclick="tcRemoveMemberFromSequence(' + idx + ')">' + escapeHtml(i18n.t('tcRemoveBtn')) + '</button>' +
      '</div>';
  }).join('');
}

function tcRenderPickerList(filter) {
  var container = document.getElementById('tcSeqPickerList');
  if (!container) return;
  var seq = currentTest.unitSequence;
  var seqIds = {};
  if (seq && Array.isArray(seq.lessons)) {
    seq.lessons.forEach(function (l) { seqIds[l.id] = true; });
  }

  var available = [];
  if (_tcPickerFilterType === 'all' || _tcPickerFilterType === 'lessons') {
    (window._tcAllLessons || []).forEach(function (p) {
      if (p && p.id && !seqIds[p.id]) {
        available.push({
          id: p.id,
          title: p.title || 'Untitled Lesson',
          type: 'lesson',
          subtitle: p.subjectId || p.subject || '',
          filename: p._filename || ('lp_' + p.id + '.json')
        });
      }
    });
  }

  if (_tcPickerFilterType === 'all' || _tcPickerFilterType === 'tests') {
    (window._tcAllTests || []).forEach(function (t) {
      if (t && t.id && !seqIds[t.id]) {
        available.push({
          id: t.id,
          title: t.title || 'Untitled Test',
          type: 'test',
          subtitle: t.subject || 'Test',
          filename: t._filename || ('test_' + t.id + '.json')
        });
      }
    });
  }

  filter = (filter || '').toLowerCase().trim();
  if (filter) {
    available = available.filter(function (item) {
      return (item.title || '').toLowerCase().indexOf(filter) !== -1 ||
             (item.subtitle || '').toLowerCase().indexOf(filter) !== -1;
    });
  }

  if (available.length === 0) {
    container.innerHTML = '<div style="color:#666;font-size:0.85rem;padding:8px 0;">' + escapeHtml(i18n.t('tcNoAvailableItems')) + '</div>';
    return;
  }

  container.innerHTML = available.map(function (item) {
    var isTest = (item.type === 'test');
    var badgeStyle = isTest ? 'background:#fef08a;color:#713f12;' : 'background:#bfdbfe;color:#1e3a8a;';
    var badgeTxt = isTest ? 'Test' : 'Lesson';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:4px;background:#f8fafc;margin-bottom:4px;">' +
      '<span style="font-size:0.68rem;font-weight:900;padding:2px 6px;border:1.5px solid #000;border-radius:3px;' + badgeStyle + '">' + badgeTxt + '</span>' +
      '<span style="flex:1;font-weight:700;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(item.title) + '">' + escapeHtml(item.title) + '</span>' +
      (item.subtitle ? '<span style="font-size:0.75rem;color:#666;font-weight:700;">' + escapeHtml(item.subtitle) + '</span>' : '') +
      '<button type="button" class="neo-btn primary" style="padding:3px 8px;font-size:0.75rem;" onclick="tcAddMemberToSequence(\'' + escapeHtml(item.id) + '\', \'' + item.type + '\')">' + escapeHtml(i18n.t('tcAddBtn')) + '</button>' +
      '</div>';
  }).join('');
}

window.tcOpenSequenceModal = async function () {
  await tcLoadSequencesAndItems();
  var seq = tcEnsureCurrentTestSequence();

  var titleInp = document.getElementById('tcSeqTitleInput');
  if (titleInp) titleInp.value = seq.title || '';

  var sel = document.getElementById('tcSavedSequencesSelect');
  if (sel) {
    sel.innerHTML = '<option value="">-- Choose a sequence to assign / open --</option>' +
      window._tcAllSequences.map(function (s, idx) {
        var count = (s.lessons && s.lessons.length) || 0;
        var isSel = (seq.title && s.title && seq.title.trim().toLowerCase() === s.title.trim().toLowerCase());
        return '<option value="' + idx + '" ' + (isSel ? 'selected' : '') + '>' + escapeHtml(s.title + ' (' + count + ' items)') + '</option>';
      }).join('');
    tcOnSavedSequenceSelectChange();
  }

  tcRenderSequenceMembers();
  tcRenderPickerList('');

  var modal = document.getElementById('tcSequenceModal');
  if (modal) modal.classList.add('open');
};

window.tcCloseSequenceModal = function () {
  var modal = document.getElementById('tcSequenceModal');
  if (modal) modal.classList.remove('open');
};

window.tcOnSavedSequenceSelectChange = function () {
  var sel = document.getElementById('tcSavedSequencesSelect');
  var btn = document.getElementById('tcBtnAssignChosenSeq');
  if (btn) btn.disabled = (!sel || sel.value === '');
};

window.tcAssignSelectedSequence = function () {
  var sel = document.getElementById('tcSavedSequencesSelect');
  if (!sel || sel.value === '') return;
  var idx = parseInt(sel.value, 10);
  var chosenSeq = window._tcAllSequences[idx];
  if (!chosenSeq) return;

  var myId = currentTest.id || ('test_' + Date.now());
  var lessons = JSON.parse(JSON.stringify(chosenSeq.lessons || []));
  if (!lessons.some(function (l) { return l.id === myId; })) {
    lessons.push({
      id: myId,
      type: 'test',
      title: currentTest.title || 'Evaluation Test',
      filename: currentTest._filename || ('test_' + myId + '.json')
    });
  }

  currentTest.unitSequence = {
    title: chosenSeq.title,
    lessons: lessons
  };

  var titleInp = document.getElementById('tcSeqTitleInput');
  if (titleInp) titleInp.value = chosenSeq.title;

  tcRenderSequenceMembers();
  tcRenderPickerList('');
  tcUpdateUnitSeqBadge();
  tcOnDirty();
  if (window.showToast) showToast(i18n.tFmt('tcAssignedSequenceToast', { sequence: chosenSeq.title }));
};

window.tcStartNewSequence = function () {
  var myId = currentTest.id || ('test_' + Date.now());
  currentTest.unitSequence = {
    title: '',
    lessons: [{
      id: myId,
      type: 'test',
      title: currentTest.title || 'Current Test',
      filename: currentTest._filename || ('test_' + myId + '.json')
    }]
  };
  var titleInp = document.getElementById('tcSeqTitleInput');
  if (titleInp) {
    titleInp.value = '';
    titleInp.focus();
  }
  var sel = document.getElementById('tcSavedSequencesSelect');
  if (sel) sel.value = '';
  tcOnSavedSequenceSelectChange();

  tcRenderSequenceMembers();
  tcRenderPickerList('');
  tcUpdateUnitSeqBadge();
  tcOnDirty();
};

window.tcSaveSequence = async function () {
  var titleInp = document.getElementById('tcSeqTitleInput');
  var titleVal = titleInp ? titleInp.value.trim() : '';
  if (!titleVal) {
    tcCloseSequenceModal();
    return;
  }

  var seq = tcEnsureCurrentTestSequence();
  seq.title = titleVal;

  // Propagate / update lesson-sequences.json index
  try {
    var seqList = window._tcAllSequences || [];
    var myId = currentTest.id;
    var found = seqList.find(function (s) { return s.title === titleVal || (s.lessons && s.lessons.some(function (l) { return l.id === myId; })); });
    if (!found) {
      found = { id: 'seq_' + Date.now(), title: titleVal, lessons: [] };
      seqList.push(found);
    }
    found.title = titleVal;
    found.lessons = (seq.lessons || []).map(function (l) { return { id: l.id, type: l.type || 'lesson', title: l.title, filename: l.filename }; });

    if (window.Desktop && Desktop.isElectron && typeof Desktop.saveJson === 'function') {
      await Desktop.saveJson('user', 'lesson-sequences.json', seqList);
    } else {
      localStorage.setItem('cmt-lesson-sequences', JSON.stringify(seqList));
    }
  } catch (_) {}

  await tcSaveCurrentTest(false);
  tcUpdateUnitSeqBadge();
  tcCloseSequenceModal();
  if (window.showToast) showToast(i18n.t('tcUnitSequenceSavedLinked'));
};

window.tcSetSeqPickerFilter = function (type) {
  _tcPickerFilterType = type || 'all';
  ['All', 'Lessons', 'Tests'].forEach(function (p) {
    var btn = document.getElementById('tcSeqFilter' + p);
    if (btn) {
      if (p.toLowerCase() === _tcPickerFilterType || (_tcPickerFilterType === 'all' && p === 'All')) {
        btn.classList.add('primary');
      } else {
        btn.classList.remove('primary');
      }
    }
  });
  var searchVal = document.getElementById('tcSeqPickerSearch') ? document.getElementById('tcSeqPickerSearch').value : '';
  tcRenderPickerList(searchVal);
};

window.tcFilterSeqPicker = function () {
  var searchVal = document.getElementById('tcSeqPickerSearch') ? document.getElementById('tcSeqPickerSearch').value : '';
  tcRenderPickerList(searchVal);
};

window.tcAddMemberToSequence = function (id, type) {
  type = type || 'lesson';
  var itemTitle = 'Untitled';
  var itemFilename = '';

  if (type === 'test') {
    var tObj = (window._tcAllTests || []).find(function (t) { return t.id === id; });
    if (tObj) {
      itemTitle = tObj.title || 'Untitled Test';
      itemFilename = tObj._filename || ('test_' + tObj.id + '.json');
    }
  } else {
    var pObj = (window._tcAllLessons || []).find(function (p) { return p.id === id; });
    if (pObj) {
      itemTitle = pObj.title || 'Untitled Lesson';
      itemFilename = pObj._filename || ('lp_' + pObj.id + '.json');
    }
  }

  var seq = tcEnsureCurrentTestSequence();
  if (seq.lessons.some(function (l) { return l.id === id; })) return;
  seq.lessons.push({ id: id, type: type, title: itemTitle, filename: itemFilename });

  tcRenderSequenceMembers();
  var searchVal = document.getElementById('tcSeqPickerSearch') ? document.getElementById('tcSeqPickerSearch').value : '';
  tcRenderPickerList(searchVal);
  tcOnDirty();
};

window.tcRemoveMemberFromSequence = function (idx) {
  var seq = currentTest.unitSequence;
  if (!seq || !seq.lessons || !seq.lessons[idx]) return;
  seq.lessons.splice(idx, 1);
  tcRenderSequenceMembers();
  var searchVal = document.getElementById('tcSeqPickerSearch') ? document.getElementById('tcSeqPickerSearch').value : '';
  tcRenderPickerList(searchVal);
  tcOnDirty();
};

window.tcMoveMemberInSequence = function (idx, dir) {
  var seq = currentTest.unitSequence;
  if (!seq || !seq.lessons) return;
  var targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= seq.lessons.length) return;
  var tmp = seq.lessons[idx];
  seq.lessons[idx] = seq.lessons[targetIdx];
  seq.lessons[targetIdx] = tmp;
  tcRenderSequenceMembers();
  tcOnDirty();
};

window.tcOpenSequenceMemberLesson = function (id, filename) {
  if (!id && !filename) return;
  var url = 'lesson-creator.html?planId=' + encodeURIComponent(id || '') + '&file=' + encodeURIComponent(filename || '');
  if (window.Desktop && Desktop.isElectron && typeof Desktop.openTool === 'function') {
    Desktop.openTool('lesson-creator.html', { query: { planId: id, file: filename }, forceNewWindow: true });
  } else if (window.Desktop && Desktop.isElectron && typeof Desktop.openHtml === 'function') {
    Desktop.openHtml({ pageFile: 'lesson-creator.html', title: 'Lesson Creator', query: { planId: id, file: filename } });
  } else {
    window.open(url, '_blank');
  }
};

// ── Entire Unit Sequence Export Handlers ─────────────────────────────
window.tcSwitchSeqExportTab = function (tab) {
  ['all', 'toc', 'lessons', 'tests'].forEach(function (t) {
    var btn = document.getElementById('tcSeqTabBtn_' + t);
    if (btn) {
      if (t === tab) btn.classList.add('primary');
      else btn.classList.remove('primary');
    }
  });
  ['toc', 'lessons', 'tests'].forEach(function (p) {
    var panel = document.getElementById('tcSeqExportPanel_' + p);
    if (panel) {
      panel.style.display = (tab === 'all' || tab === p) ? 'block' : 'none';
    }
  });
};

window.tcOnSeqCssThemeChange = function () {
  var themeInput = document.querySelector('input[name="tcSeqCssTheme"]:checked');
  var val = themeInput ? themeInput.value : 'neobrutalist';
  if (window.ExportStylesService) {
    var mapped = val === 'editorial' ? 'export-editorial.css' : (val === 'minimal' ? 'export-minimal-grid.css' : 'export-light-neobrutalist.css');
    ExportStylesService.setSelectedStyle('testCreator', mapped);
    ExportStylesService.renderStyleSelector(document.getElementById('tc-seq-export-style-selector-wrap'), {
      toolKey: 'testCreator',
      onChange: function (styleId) {
        var ifr = document.getElementById('exportPreviewIframe');
        if (ifr && document.getElementById('exportPreviewModal').classList.contains('open')) {
          ExportStylesService.applyStyleToIframe(ifr, styleId);
        }
      }
    });
  }
};

window.tcOnSeqExportFormatChange = function () {
  var fmtInput = document.querySelector('input[name="tcSeqExportFormat"]:checked');
  var fmt = fmtInput ? fmtInput.value : 'html';
  var themeRow = document.getElementById('tcSeqThemeRow');
  if (themeRow) {
    themeRow.style.display = (fmt === 'html' || fmt === 'pdf' || fmt === 'docx') ? 'block' : 'none';
  }
};

window.tcApplySeqLessonPreset = function (preset) {
  var map = {
    meta: true,
    objectives: true,
    vocab: true,
    competences: true,
    links: true,
    notes: true,
    phTime: true,
    phActivity: true,
    phInteraction: true,
    phObjective: true,
    phDescription: true,
    phTeacherActions: true,
    phStudentActions: true,
    phDifferentiation: true,
    phAssessment: true,
    phMaterials: true,
    phHomework: true,
    phCompetences: true
  };
  if (preset === 'teacher') {
    map.links = false;
  } else if (preset === 'student') {
    map.competences = false;
    map.links = false;
    map.notes = false;
    map.phTeacherActions = false;
    map.phDifferentiation = false;
    map.phAssessment = false;
    map.phCompetences = false;
  } else if (preset === 'summary') {
    map.vocab = false;
    map.links = false;
    map.notes = false;
    map.phDescription = false;
    map.phTeacherActions = false;
    map.phStudentActions = false;
    map.phDifferentiation = false;
    map.phAssessment = false;
    map.phMaterials = false;
    map.phHomework = false;
  }
  Object.keys(map).forEach(function (k) {
    var chk = document.getElementById('tcSeqLP_' + k);
    if (chk) chk.checked = map[k];
  });
  var phMain = document.getElementById('tcSeqOptPhases');
  if (phMain) phMain.checked = true;
  var vocMain = document.getElementById('tcSeqOptVocab');
  if (vocMain) vocMain.checked = !!map.vocab;
};

window.tcOpenSequenceExportModal = async function () {
  var seq = currentTest && currentTest.unitSequence;
  if (!seq || !seq.title || !seq.lessons || seq.lessons.length === 0) {
    if (window.showToast) showToast(i18n.t('tcAssignSequenceFirst'), true);
    tcOpenSequenceModal();
    return;
  }
  var modal = document.getElementById('tcSequenceExportModal');
  if (modal) modal.classList.add('open');
  tcSwitchSeqExportTab('all');
  tcOnSeqExportFormatChange();
  if (window.ExportStylesService) {
    ExportStylesService.renderStyleSelector(document.getElementById('tc-seq-export-style-selector-wrap'), {
      toolKey: 'testCreator',
      onChange: function (styleId) {
        var ifr = document.getElementById('exportPreviewIframe');
        if (ifr && document.getElementById('exportPreviewModal').classList.contains('open')) {
          ExportStylesService.applyStyleToIframe(ifr, styleId);
        }
      }
    });
  }
  if (window.ExportLangService) {
    ExportLangService.renderLangSelector(document.getElementById('tc-seq-export-lang-selector-wrap'), {
      toolKey: 'testCreator'
    });
  }
};

window.tcCloseSequenceExportModal = function () {
  var modal = document.getElementById('tcSequenceExportModal');
  if (modal) modal.classList.remove('open');
};

function tcGetSequenceExportModalOptions() {
  var fmtInput = document.querySelector('input[name="tcSeqExportFormat"]:checked');
  var format = fmtInput ? fmtInput.value : 'html';

  var themeInput = document.querySelector('input[name="tcSeqCssTheme"]:checked');
  var cssTheme = themeInput ? themeInput.value : 'neobrutalist';

  var compLayoutInput = document.querySelector('input[name="tcSeqCompLayout"]:checked');
  var competenceLayout = compLayoutInput ? compLayoutInput.value : 'column';

  var lessonLayoutInput = document.querySelector('input[name="tcSeqLessonLayout"]:checked');
  var lessonLayout = lessonLayoutInput ? lessonLayoutInput.value : 'cards';

  var testRenderModeInput = document.querySelector('input[name="tcSeqTestRenderMode"]:checked');
  var testRenderMode = testRenderModeInput ? testRenderModeInput.value : 'full_exam';

  var testVariantSel = document.getElementById('tcSeqTestVariantSelect');
  var testVariant = testVariantSel ? testVariantSel.value : 'A';

  var testNumberedLines = document.getElementById('tcSeqTestNumberedLines') ? document.getElementById('tcSeqTestNumberedLines').checked : false;

  var testScaleDisplaySel = document.getElementById('tcSeqTestScaleDisplayMode');
  var testScaleDisplayMode = testScaleDisplaySel ? testScaleDisplaySel.value : 'table';

  var critModeInput = document.querySelector('input[name="tcSeqTestCriteriaMode"]:checked');
  var testCriteriaMode = critModeInput ? critModeInput.value : 'compact';

  var compModeInput = document.querySelector('input[name="tcSeqTestCompetencesMode"]:checked');
  var testCompetencesMode = compModeInput ? compModeInput.value : 'compact';

  var includeSummary = document.getElementById('tcSeqOptSummary') ? document.getElementById('tcSeqOptSummary').checked : true;
  var includeVocab = document.getElementById('tcSeqOptVocab') ? document.getElementById('tcSeqOptVocab').checked : true;
  var includePhases = document.getElementById('tcSeqOptPhases') ? document.getElementById('tcSeqOptPhases').checked : true;
  var includeTests = document.getElementById('tcSeqOptTests') ? document.getElementById('tcSeqOptTests').checked : true;
  var includeGradingScale = document.getElementById('tcSeqOptGradingScale') ? document.getElementById('tcSeqOptGradingScale').checked : true;
  var includeAnswerKeys = document.getElementById('tcSeqOptAnswerKeys') ? document.getElementById('tcSeqOptAnswerKeys').checked : false;

  var getChk = function (id, defVal) {
    var el = document.getElementById(id);
    return el ? el.checked : defVal;
  };

  var tocCols = {
    index: getChk('tcSeqTocCol_index', true),
    type: getChk('tcSeqTocCol_type', true),
    title: getChk('tcSeqTocCol_title', true),
    duration: getChk('tcSeqTocCol_duration', true),
    objectives: getChk('tcSeqTocCol_objectives', true),
    competences: getChk('tcSeqTocCol_competences', true),
    vocab: getChk('tcSeqTocCol_vocab', true),
    homework: getChk('tcSeqTocCol_homework', false)
  };

  var lessonToggles = {
    meta: getChk('tcSeqLP_meta', true),
    objectives: getChk('tcSeqLP_objectives', true),
    vocab: getChk('tcSeqLP_vocab', includeVocab),
    competences: getChk('tcSeqLP_competences', true),
    links: getChk('tcSeqLP_links', true),
    notes: getChk('tcSeqLP_notes', true),
    phases: includePhases,
    phTime: getChk('tcSeqLP_phTime', true),
    phActivity: getChk('tcSeqLP_phActivity', true),
    phInteraction: getChk('tcSeqLP_phInteraction', true),
    phObjective: getChk('tcSeqLP_phObjective', true),
    phDescription: getChk('tcSeqLP_phDescription', true),
    phTeacherActions: getChk('tcSeqLP_phTeacherActions', true),
    phStudentActions: getChk('tcSeqLP_phStudentActions', true),
    phDifferentiation: getChk('tcSeqLP_phDifferentiation', true),
    phAssessment: getChk('tcSeqLP_phAssessment', true),
    phMaterials: getChk('tcSeqLP_phMaterials', true),
    phHomework: getChk('tcSeqLP_phHomework', true),
    phCompetences: getChk('tcSeqLP_phCompetences', true)
  };

  var testHeaderToggles = {
    showTitle: true,
    showStudentName: getChk('tcSeqTestHdr_studentName', true),
    showClass: getChk('tcSeqTestHdr_class', true),
    showDate: getChk('tcSeqTestHdr_date', true),
    showTeacher: getChk('tcSeqTestHdr_teacher', true),
    showDuration: getChk('tcSeqTestHdr_duration', true),
    showMaterials: getChk('tcSeqTestHdr_materials', true),
    showScope: getChk('tcSeqTestHdr_scope', true),
    showTotalPoints: getChk('tcSeqTestHdr_points', true),
    showInstructions: getChk('tcSeqTestHdr_instructions', true),
    showGradingScale: includeGradingScale,
    scaleDisplayMode: testScaleDisplayMode
  };

  var testCompCols = {
    showCodeCol: getChk('tcSeqTcCol_code', true),
    showTitleCol: getChk('tcSeqTcCol_title', true),
    showDescriptions: getChk('tcSeqTcCol_desc', true),
    showLevelCol: getChk('tcSeqTcCol_level', true),
    showScoreCol: getChk('tcSeqTcCol_score', true),
    showCommentsCol: getChk('tcSeqTcCol_comments', false)
  };

  var testCritCols = {
    showCriterionCol: getChk('tcSeqCrCol_criterion', true),
    showLevelsCol: getChk('tcSeqCrCol_levels', true),
    showDescriptions: getChk('tcSeqCrCol_desc', true),
    showMaxCol: getChk('tcSeqCrCol_max', true),
    showScoreCol: getChk('tcSeqCrCol_score', true),
    showCommentsCol: getChk('tcSeqCrCol_comments', false)
  };

  var classMap = {};
  (activeClassGroups || []).forEach(function (g) {
    if (g && (g.id || g.name)) classMap[g.id || g.name] = g.name || g.id;
  });

  var actMap = {};
  var intMap = {};
  if (typeof LessonCreatorService !== 'undefined') {
    (LessonCreatorService.DEFAULT_ACTIVITIES || []).forEach(function (a) { actMap[a.id] = a.name; });
    (LessonCreatorService.DEFAULT_INTERACTIONS || []).forEach(function (x) { intMap[x.id] = x.name; });
  }

  return {
    format: format,
    cssTheme: cssTheme,
    competenceLayout: competenceLayout,
    tocCols: tocCols,
    lessonLayout: lessonLayout,
    lessonToggles: lessonToggles,
    testRenderMode: testRenderMode,
    testVariant: testVariant,
    testNumberedLines: testNumberedLines,
    testHeaderToggles: testHeaderToggles,
    testScaleDisplayMode: testScaleDisplayMode,
    testCriteriaMode: testCriteriaMode,
    testCritCols: testCritCols,
    testCompetencesMode: testCompetencesMode,
    testCompCols: testCompCols,
    includeSummary: includeSummary,
    includeVocab: includeVocab,
    includePhases: includePhases,
    includeTests: includeTests,
    includeGradingScale: includeGradingScale,
    includeAnswerKeys: includeAnswerKeys,
    allCompetences: (typeof _cachedCompetences !== 'undefined' && Array.isArray(_cachedCompetences)) ? _cachedCompetences : [],
    classLookup: classMap,
    activityLookup: actMap,
    interactionLookup: intMap
  };
}

window.tcExecuteSequenceExport = async function () {
  if (window.ExportLangService) {
    return await ExportLangService.withExportLang('testCreator', _tcExecuteSequenceExportInner);
  }
  return await _tcExecuteSequenceExportInner();
};
async function _tcExecuteSequenceExportInner() {
  var seq = (currentTest && currentTest.unitSequence) || (typeof tcEnsureCurrentTestSequence === 'function' ? tcEnsureCurrentTestSequence() : null);
  if (!seq) return;

  await tcLoadSequencesAndItems();
  var fullLessons = [];
  var fullTests = [];

  var lessons = seq.lessons || [];
  for (var i = 0; i < lessons.length; i++) {
    var item = lessons[i];
    if (item.type === 'test') {
      var tObj = (item.id === currentTest.id) ? currentTest : window._tcAllTests.find(function (t) { return t.id === item.id; });
      if (tObj) fullTests.push(tObj);
    } else {
      var lObj = window._tcAllLessons.find(function (l) { return l.id === item.id; });
      if (lObj) fullLessons.push(lObj);
    }
  }

  var opts = tcGetSequenceExportModalOptions();
  var safeSeqName = tcSanitizeFilename(seq.title, 'unit_sequence');

  if (typeof LessonCreatorService === 'undefined') {
    if (window.showToast) showToast(i18n.t('tcLessonServiceNotLoaded'), true);
    return;
  }

  if (opts.format === 'html') {
    var htmlContent = LessonCreatorService.exportSequenceToHtml(seq, fullLessons, fullTests, opts);
    if (window.ExportStylesService) {
      htmlContent = await ExportStylesService.injectStyleIntoHtml(htmlContent, ExportStylesService.getSelectedStyle('testCreator'));
    }
    var htmlFilename = safeSeqName + '_booklet.html';
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: htmlFilename,
        content: htmlContent,
        mimeType: 'text/html;charset=utf-8',
        allowDocEditor: true,
        filters: [{ name: 'HTML Document', extensions: ['html'] }],
        modalTitle: 'Export Unit HTML Booklet'
      });
      tcCloseSequenceExportModal();
    }
  } else if (opts.format === 'docx') {
    var docxMdContent = LessonCreatorService.exportSequenceToMarkdown(seq, fullLessons, fullTests, opts);
    var docxSeqFilename = safeSeqName + '_booklet.docx';
    var docxSeqReq = {
      markdown: docxMdContent,
      defaultName: docxSeqFilename,
      title: (seq.title || 'Unit Sequence') + ' Booklet'
    };
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: docxSeqFilename,
        content: docxMdContent,
        docxRequest: docxSeqReq,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        allowDocEditor: false,
        filters: [{ name: 'Word Document (.docx)', extensions: ['docx'] }, { name: 'All Files', extensions: ['*'] }],
        modalTitle: 'Export Unit Word Document (.docx)'
      });
      tcCloseSequenceExportModal();
    } else if (window.Desktop && Desktop.isElectron && typeof Desktop.exportDocx === 'function') {
      var sDocxRes = await Desktop.exportDocx(docxSeqReq);
      if (sDocxRes && sDocxRes.ok && window.showExportSuccessPopup && sDocxRes.path) {
        window.showExportSuccessPopup(sDocxRes.path, sDocxRes.name || docxSeqFilename);
      }
      tcCloseSequenceExportModal();
    }
  } else if (opts.format === 'odt') {
    var odtMdContent = LessonCreatorService.exportSequenceToMarkdown(seq, fullLessons, fullTests, opts);
    var odtSeqFilename = safeSeqName + '_booklet.odt';
    var odtSeqReq = {
      markdown: odtMdContent,
      defaultName: odtSeqFilename,
      title: (seq.title || 'Unit Sequence') + ' Booklet'
    };
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: odtSeqFilename,
        content: odtMdContent,
        odtRequest: odtSeqReq,
        mimeType: 'application/vnd.oasis.opendocument.text',
        allowDocEditor: true,
        filters: [
          { name: 'LibreOffice Writer Document (.odt)', extensions: ['odt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        modalTitle: 'Export Unit LibreOffice Writer Document'
      });
      tcCloseSequenceExportModal();
    } else if (window.Desktop && Desktop.isElectron && typeof Desktop.exportOdt === 'function') {
      var sOdtRes = await Desktop.exportOdt(odtSeqReq);
      if (sOdtRes && sOdtRes.ok && window.showExportSuccessPopup && sOdtRes.path) {
        window.showExportSuccessPopup(sOdtRes.path, sOdtRes.name || odtSeqFilename);
      }
      tcCloseSequenceExportModal();
    }
  } else if (opts.format === 'xlsx' || opts.format === 'ods') {
    var wb = LessonCreatorService.buildSequenceWorkbook(seq, fullLessons, fullTests, opts);
    if (!wb || typeof XLSX === 'undefined') {
      if (window.showToast) showToast('Spreadsheet library (XLSX) is not loaded.', true);
      return;
    }
    var bookType = opts.format === 'ods' ? 'ods' : 'xlsx';
    var sheetFilename = safeSeqName + '_unit.' + bookType;
    var wbOut = XLSX.write(wb, { bookType: bookType, type: 'array' });
    var mime = bookType === 'ods'
      ? 'application/vnd.oasis.opendocument.spreadsheet'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var blob = new Blob([wbOut], { type: mime });
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: sheetFilename,
        blob: blob,
        mimeType: mime,
        allowDocEditor: false,
        filters: [{ name: bookType.toUpperCase() + ' Workbook', extensions: [bookType] }],
        modalTitle: 'Export Unit ' + bookType.toUpperCase() + ' Workbook'
      });
    } else if (window.Desktop && Desktop.isElectron && typeof Desktop.saveBlob === 'function') {
      var bRes = await Desktop.saveBlob('toPrint', sheetFilename, blob);
      if (bRes && bRes.ok && window.showExportSuccessPopup) {
        window.showExportSuccessPopup(bRes.path, sheetFilename);
      }
    } else {
      var u = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = u;
      a.download = sheetFilename;
      a.click();
      URL.revokeObjectURL(u);
    }
    tcCloseSequenceExportModal();
  } else if (opts.format === 'csv') {
    var csvContent = '\uFEFF' + LessonCreatorService.exportSequenceToCsv(seq, fullLessons, fullTests, opts);
    var csvFilename = safeSeqName + '_unit.csv';
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: csvFilename,
        content: csvContent,
        mimeType: 'text/csv;charset=utf-8',
        allowDocEditor: false,
        filters: [{ name: 'CSV Spreadsheet', extensions: ['csv'] }],
        modalTitle: 'Export Unit CSV Table'
      });
      tcCloseSequenceExportModal();
    }
  } else if (opts.format === 'markdown') {
    var mdContent = LessonCreatorService.exportSequenceToMarkdown(seq, fullLessons, fullTests, opts);
    var mdFilename = safeSeqName + '_unit.md';
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: mdFilename,
        content: mdContent,
        mimeType: 'text/markdown;charset=utf-8',
        allowDocEditor: true,
        filters: [{ name: 'Markdown Document', extensions: ['md'] }],
        modalTitle: 'Export Unit Markdown Document'
      });
      tcCloseSequenceExportModal();
    }
  } else if (opts.format === 'pdf') {
    var pdfOpts = Object.assign({}, opts, { forPrint: true });
    var pdfHtml = LessonCreatorService.exportSequenceToHtml(seq, fullLessons, fullTests, pdfOpts);
    if (window.ExportStylesService) {
      pdfHtml = await ExportStylesService.injectStyleIntoHtml(pdfHtml, ExportStylesService.getSelectedStyle('testCreator'));
    }
    var pdfFilename = safeSeqName + '_booklet.pdf';
    if (window.Desktop && Desktop.isElectron && typeof Desktop.printPdf === 'function') {
      var pRes = await Desktop.printPdf({ html: pdfHtml, title: 'Save Unit PDF Booklet', defaultPath: pdfFilename });
      if (pRes && pRes.ok && window.showExportSuccessPopup) {
        window.showExportSuccessPopup(pRes.path, pRes.name || pdfFilename);
      }
    }
    tcCloseSequenceExportModal();
  } else if (opts.format === 'json') {
    var jsonBundle = LessonCreatorService.createUnitArchiveBundle(seq, fullLessons, fullTests);
    var jsonStr = JSON.stringify(jsonBundle, null, 2);
    var jsonFilename = safeSeqName + '_bundle.json';
    if (window.saveExportWithDestination) {
      await window.saveExportWithDestination({
        filename: jsonFilename,
        content: jsonStr,
        mimeType: 'application/json;charset=utf-8',
        allowDocEditor: false,
        filters: [{ name: 'JSON Archive Bundle', extensions: ['json'] }],
        modalTitle: 'Export Unit JSON Archive'
      });
      tcCloseSequenceExportModal();
    }
  }
};

window.tcPreviewSequenceExport = async function () {
  if (window.ExportLangService) {
    return await ExportLangService.withExportLang('testCreator', _tcPreviewSequenceExportInner);
  }
  return await _tcPreviewSequenceExportInner();
};
async function _tcPreviewSequenceExportInner() {
  var seq = (currentTest && currentTest.unitSequence) || (typeof tcEnsureCurrentTestSequence === 'function' ? tcEnsureCurrentTestSequence() : null);
  if (!seq) return;

  await tcLoadSequencesAndItems();
  var fullLessons = [];
  var fullTests = [];

  var lessons = seq.lessons || [];
  for (var i = 0; i < lessons.length; i++) {
    var item = lessons[i];
    if (item.type === 'test') {
      var tObj = (item.id === currentTest.id) ? currentTest : window._tcAllTests.find(function (t) { return t.id === item.id; });
      if (tObj) fullTests.push(tObj);
    } else {
      var lObj = window._tcAllLessons.find(function (l) { return l.id === item.id; });
      if (lObj) fullLessons.push(lObj);
    }
  }

  var opts = tcGetSequenceExportModalOptions();
  if (typeof LessonCreatorService === 'undefined') {
    if (window.showToast) showToast(i18n.t('tcLessonServiceNotLoaded'), true);
    return;
  }

  var htmlContent = LessonCreatorService.exportSequenceToHtml(seq, fullLessons, fullTests, opts);
  if (window.ExportStylesService) {
    htmlContent = await ExportStylesService.injectStyleIntoHtml(htmlContent, ExportStylesService.getSelectedStyle('testCreator'));
  }
  window._tcLastPreviewType = 'sequence';

  var modal = document.getElementById('exportPreviewModal');
  var iframe = document.getElementById('exportPreviewIframe');
  if (iframe) {
    iframe.srcdoc = htmlContent;
    iframe.onload = function () {
      if (window.ExportStylesService) {
        var sId = ExportStylesService.getSelectedStyle('testCreator');
        ExportStylesService.applyStyleToIframe(iframe, sId);
      }
    };
  }
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
};

// ── Pull from Lesson Plan & Unit Sequence ─────────────────────────────
window._allSavedLessons = [];
window._selectedLessonData = null;
window._pullSourceMode = 'single'; // 'single' or 'unit'

window.tcSetPullSourceMode = function (mode) {
  window._pullSourceMode = mode || 'single';
  var singleBtn = document.getElementById('tcPullModeSingleBtn');
  var unitBtn = document.getElementById('tcPullModeUnitBtn');
  var singleCont = document.getElementById('tcPullSingleContainer');
  var unitCont = document.getElementById('tcPullUnitContainer');

  if (singleBtn && unitBtn) {
    if (window._pullSourceMode === 'unit') {
      unitBtn.classList.add('primary');
      singleBtn.classList.remove('primary');
      if (singleCont) singleCont.style.display = 'none';
      if (unitCont) unitCont.style.display = 'block';
      tcPopulateUnitSequencesForPull();
    } else {
      singleBtn.classList.add('primary');
      unitBtn.classList.remove('primary');
      if (singleCont) singleCont.style.display = 'block';
      if (unitCont) unitCont.style.display = 'none';
    }
  }
};

async function tcPopulateUnitSequencesForPull() {
  var uSel = document.getElementById('tcUnitSelect');
  if (!uSel) return;
  uSel.innerHTML = '<option value="">' + (i18n.t('commonLoading') || 'Loading…') + '</option>';
  await tcLoadSequencesAndItems();

  if (!window._tcAllSequences.length) {
    uSel.innerHTML = '<option value="">No unit sequences found in system.</option>';
    document.getElementById('tcBtnExecutePullLesson').disabled = true;
    return;
  }

  document.getElementById('tcBtnExecutePullLesson').disabled = false;
  uSel.innerHTML = '<option value="">-- Select a unit sequence --</option>' +
    window._tcAllSequences.map(function (s, idx) {
      var count = (s.lessons && s.lessons.length) || 0;
      return '<option value="' + idx + '">' + escapeHtml(s.title + ' (' + count + ' items)') + '</option>';
    }).join('');

  if (currentTest.unitSequence && currentTest.unitSequence.title) {
    var mIdx = window._tcAllSequences.findIndex(function (s) {
      return s.title && s.title.trim().toLowerCase() === currentTest.unitSequence.title.trim().toLowerCase();
    });
    if (mIdx >= 0) {
      uSel.value = mIdx;
      tcOnUnitSelected();
    }
  }
}

window.tcOnUnitSelected = function () {
  var uSel = document.getElementById('tcUnitSelect');
  var idx = uSel ? parseInt(uSel.value, 10) : -1;
  var previewBox = document.getElementById('tcLessonPreviewBox');
  if (isNaN(idx) || idx < 0 || !window._tcAllSequences[idx]) {
    _selectedLessonData = null;
    if (previewBox) previewBox.style.display = 'none';
    return;
  }

  var chosenSeq = window._tcAllSequences[idx];
  var seqLessons = chosenSeq.lessons || [];

  // Aggregate all vocabulary and phase objectives across all lessons in sequence
  var aggregatedVocab = [];
  var aggregatedPhases = [];

  seqLessons.forEach(function (item) {
    if (item.type !== 'test') {
      var fullL = (window._tcAllLessons || []).find(function (l) { return l.id === item.id; });
      if (fullL) {
        var words = [];
        if (Array.isArray(fullL.vocabulary)) words = fullL.vocabulary;
        else if (typeof fullL.vocabulary === 'string') words = fullL.vocabulary.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (Array.isArray(fullL.keyConcepts)) words = words.concat(fullL.keyConcepts);
        else if (typeof fullL.keyConcepts === 'string') words = words.concat(fullL.keyConcepts.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean));

        words.forEach(function (w) {
          var term = typeof w === 'string' ? w.trim() : (w.word || w.term || '');
          if (term && !aggregatedVocab.some(function (x) { return (typeof x === 'string' ? x : (x.word || x.term || '')).toLowerCase() === term.toLowerCase(); })) {
            aggregatedVocab.push(w);
          }
        });

        var phases = Array.isArray(fullL.sections) ? fullL.sections : (Array.isArray(fullL.phases) ? fullL.phases : []);
        phases.forEach(function (ph) {
          if (ph && (ph.objective || ph.title)) {
            aggregatedPhases.push({
              title: (fullL.title ? (fullL.title + ' • ') : '') + (ph.title || 'Phase'),
              objective: ph.objective || ph.description || ''
            });
          }
        });
      }
    }
  });

  _selectedLessonData = {
    title: chosenSeq.title,
    isUnitSequence: true,
    data: {
      theme: chosenSeq.title,
      vocabulary: aggregatedVocab,
      sections: aggregatedPhases
    }
  };

  if (previewBox) previewBox.style.display = 'block';
  document.getElementById('tcLessonPreviewTitle').textContent = chosenSeq.title + ' (Entire Unit)';
  document.getElementById('tcLessonPreviewMeta').textContent = seqLessons.length + ' connected items aggregated';

  var vEl = document.getElementById('tcLessonPreviewVocab');
  if (vEl) {
    if (aggregatedVocab.length) {
      vEl.innerHTML = aggregatedVocab.slice(0, 30).map(function (w) {
        var term = typeof w === 'string' ? w : (w.word || w.term || JSON.stringify(w));
        return '<span style="background:#fef08a;border:1px solid #ca8a04;color:#713f12;font-size:0.75rem;padding:2px 6px;border-radius:3px;font-weight:700;">' + escapeHtml(term) + '</span>';
      }).join('');
    } else {
      vEl.innerHTML = '<span style="color:#888;font-size:0.75rem;">No vocabulary recorded across unit lessons.</span>';
    }
  }

  var pEl = document.getElementById('tcLessonPreviewPhases');
  if (pEl) {
    if (aggregatedPhases.length) {
      pEl.innerHTML = aggregatedPhases.slice(0, 8).map(function (s) {
        return '<div style="margin-bottom:3px;"><strong>' + escapeHtml(s.title) + ':</strong> ' + escapeHtml(s.objective || 'Activity') + '</div>';
      }).join('');
    } else {
      pEl.innerHTML = '<span style="color:#888;font-size:0.75rem;">No detailed phases found across unit.</span>';
    }
  }
};

window.tcOpenPullFromLessonModal = async function () {
  var modal = document.getElementById('tcPullLessonModal');
  if (!modal) return;
  modal.classList.add('open');
  tcSetPullSourceMode('single');

  var sel = document.getElementById('tcLessonSelect');
  if (sel) sel.innerHTML = '<option value="">' + (i18n.t('commonLoading') || 'Loading…') + '</option>';
  var previewBox = document.getElementById('tcLessonPreviewBox');
  if (previewBox) previewBox.style.display = 'none';

  await tcLoadSequencesAndItems();
  _allSavedLessons = window._tcAllLessons.map(function (l) {
    return {
      filename: l._filename,
      title: l.title || l._filename.replace(/\.json$/i, ''),
      subject: l.subjectId || l.subject || '',
      classId: l.classId || '',
      data: l
    };
  });

  if (sel) {
    if (!_allSavedLessons.length) {
      sel.innerHTML = '<option value="">' + (i18n.t('tcNoLessonPlansFound') || 'No saved lesson plans found in user/lessons.') + '</option>';
      document.getElementById('tcBtnExecutePullLesson').disabled = true;
    } else {
      document.getElementById('tcBtnExecutePullLesson').disabled = false;
      sel.innerHTML = '<option value="">' + (i18n.t('tcSelectLessonPrompt') || 'Select a lesson plan…') + '</option>' +
        _allSavedLessons.map(function (l, idx) {
          var subPart = l.subject ? (' • ' + l.subject) : '';
          var clsPart = l.classId ? (' [' + l.classId + ']') : '';
          return '<option value="' + idx + '">' + escapeHtml(l.title + subPart + clsPart) + '</option>';
        }).join('');
      if (currentTest.classId) {
        var matchingIdx = _allSavedLessons.findIndex(function (l) { return l.classId === currentTest.classId; });
        if (matchingIdx >= 0) {
          sel.value = matchingIdx;
          tcOnLessonSelected();
        }
      }
    }
  }
};

window.tcClosePullLessonModal = function () {
  var modal = document.getElementById('tcPullLessonModal');
  if (modal) modal.classList.remove('open');
};

window.tcOnLessonSelected = function () {
  var sel = document.getElementById('tcLessonSelect');
  var idx = sel ? parseInt(sel.value, 10) : -1;
  var previewBox = document.getElementById('tcLessonPreviewBox');
  if (isNaN(idx) || idx < 0 || !_allSavedLessons[idx]) {
    _selectedLessonData = null;
    if (previewBox) previewBox.style.display = 'none';
    return;
  }
  var lesson = _allSavedLessons[idx];
  _selectedLessonData = lesson;

  if (previewBox) previewBox.style.display = 'block';
  document.getElementById('tcLessonPreviewTitle').textContent = lesson.title || 'Lesson';
  document.getElementById('tcLessonPreviewMeta').textContent = (lesson.subject || 'Subject') + (lesson.classId ? (' • Class ' + lesson.classId) : '');

  var d = lesson.data || {};
  var words = [];
  if (Array.isArray(d.vocabulary)) words = d.vocabulary;
  else if (typeof d.vocabulary === 'string') words = d.vocabulary.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  if (Array.isArray(d.keyConcepts)) words = words.concat(d.keyConcepts);
  else if (typeof d.keyConcepts === 'string') words = words.concat(d.keyConcepts.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean));

  var vEl = document.getElementById('tcLessonPreviewVocab');
  if (vEl) {
    if (words.length) {
      vEl.innerHTML = words.slice(0, 20).map(function (w) {
        var term = typeof w === 'string' ? w : (w.word || w.term || JSON.stringify(w));
        return '<span style="background:#fef08a;border:1px solid #ca8a04;color:#713f12;font-size:0.75rem;padding:2px 6px;border-radius:3px;font-weight:700;">' + escapeHtml(term) + '</span>';
      }).join('');
    } else {
      vEl.innerHTML = '<span style="color:#888;font-size:0.75rem;">No explicit vocabulary list recorded in this lesson.</span>';
    }
  }

  var pEl = document.getElementById('tcLessonPreviewPhases');
  var sections = Array.isArray(d.sections) ? d.sections : (Array.isArray(d.phases) ? d.phases : []);
  if (pEl) {
    if (sections.length) {
      pEl.innerHTML = sections.map(function (s, sIdx) {
        var sTitle = s.title || ('Phase ' + (sIdx + 1));
        var sObj = s.objective || s.description || '';
        return '<div style="margin-bottom:3px;"><strong>' + escapeHtml(sTitle) + ':</strong> ' + escapeHtml(sObj || 'Core activity') + '</div>';
      }).join('');
    } else {
      pEl.innerHTML = '<span style="color:#888;font-size:0.75rem;">No detailed phases found.</span>';
    }
  }
};

window.tcExecutePullFromLesson = async function () {
  if (!_selectedLessonData) return;
  var d = _selectedLessonData.data || {};
  var doCloze = document.getElementById('tcPullOptCloze').checked;
  var doMatching = document.getElementById('tcPullOptMatching').checked;
  var doOpenQ = document.getElementById('tcPullOptOpenQ').checked;

  var words = [];
  if (Array.isArray(d.vocabulary)) words = d.vocabulary;
  else if (typeof d.vocabulary === 'string') words = d.vocabulary.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  if (Array.isArray(d.keyConcepts)) words = words.concat(d.keyConcepts);
  else if (typeof d.keyConcepts === 'string') words = words.concat(d.keyConcepts.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean));

  var cleanWords = words.map(function (w) {
    return typeof w === 'string' ? w.trim() : ((w.word || w.term || '') + (w.definition ? (' = ' + w.definition) : '')).trim();
  }).filter(Boolean);

  var sections = Array.isArray(d.sections) ? d.sections : (Array.isArray(d.phases) ? d.phases : []);
  var addedCount = 0;

  // 1. Cloze / Gap Fill from vocabulary
  if (doCloze && cleanWords.length > 0) {
    var sampleWords = cleanWords.slice(0, 6);
    var sentences = sampleWords.map(function (w, i) {
      var term = w.split('=')[0].trim();
      return (i + 1) + '. The concept of [(' + term + ')] was discussed during our exploration of ' + (d.theme || d.unit || _selectedLessonData.title) + '.';
    }).join('\n');
    var clozeEx = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'cloze',
      title: 'Vocabulary & Terminology: ' + (_selectedLessonData.title || 'Unit Review'),
      instructions: 'Complete the sentences using the appropriate vocabulary words learned in class.',
      points: sampleWords.length,
      content: {
        text: sentences,
        wordBank: sampleWords.map(function (w) { return w.split('=')[0].trim(); })
      },
      linkedCompetenceIds: []
    };
    currentTest.exercises.push(clozeEx);
    addedCount++;
  }

  // 2. Matching Exercise
  if (doMatching && cleanWords.length >= 3) {
    var pairs = cleanWords.slice(0, 5).map(function (w, i) {
      var parts = w.split('=');
      var left = parts[0].trim();
      var right = parts[1] ? parts[1].trim() : ('Definition or key property of ' + left);
      return { id: 'p_' + i, left: left, right: right };
    });
    var matchingEx = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'matching',
      title: 'Term & Definition Matching: ' + (_selectedLessonData.title || 'Unit Notions'),
      instructions: 'Match each term on the left with its corresponding definition or explanation on the right.',
      points: pairs.length,
      content: {
        pairs: pairs
      },
      linkedCompetenceIds: []
    };
    currentTest.exercises.push(matchingEx);
    addedCount++;
  }

  // 3. Open Questions from phase objectives
  if (doOpenQ && sections.length > 0) {
    var subQs = sections.filter(function (s) { return s.objective && s.objective.trim(); }).slice(0, 4).map(function (s, i) {
      return {
        id: 'q_' + i,
        prompt: 'Explain: ' + s.objective.trim(),
        lines: 3,
        points: 2
      };
    });
    if (subQs.length > 0) {
      var openEx = {
        id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'open_question',
        title: 'Comprehension & Synthesis: ' + (_selectedLessonData.title || 'Unit Synthesis'),
        instructions: 'Answer each question thoroughly using full sentences and concepts reviewed in class.',
        points: subQs.reduce(function (sum, q) { return sum + q.points; }, 0),
        content: {
          questions: subQs
        },
        linkedCompetenceIds: []
      };
      currentTest.exercises.push(openEx);
      addedCount++;
    }
  }

  // Bidirectional link between test and lesson in LinksService (for single lesson mode)
  if (typeof LinksService !== 'undefined' && _selectedLessonData.filename) {
    var testUrn = tcGetActiveTestUrn();
    var lessonUrn = 'cmt:lesson:' + _selectedLessonData.filename;
    if (testUrn) {
      await LinksService.addLink(testUrn, lessonUrn, {
        relation: 'assesses_lesson',
        meta: {
          testTitle: currentTest.title || 'Class Examination',
          lessonTitle: _selectedLessonData.title
        }
      });
      tcUpdateTestLinksBadge();
    }
  }

  renderExerciseCards();
  updatePointsBadge();
  tcClosePullLessonModal();

  if (window.showToast) {
    var msg = (typeof i18n !== 'undefined' && typeof i18n.tFmt === 'function')
      ? i18n.tFmt('tcExercisesPulledSuccess', { count: addedCount })
      : ('Extracted ' + addedCount + ' exercises!');
    showToast(msg);
  }
};

// ── Export to Document Editor ─────────────────────────────────────────
window.tcExportToDocumentEditor = async function () {
  if (document.getElementById('exportModal')) {
    tcCloseExportModal();
  }
  var isTeacher = false;
  var activeTheme = tcNormalizeThemeId((currentTest.exportStyle && currentTest.exportStyle.theme) || currentTest.stylesheetTheme || (window.ExportStylesService && ExportStylesService.getSelectedStyle('testCreator')) || localStorage.getItem('cmt_default_test_theme') || 'export-light-neobrutalist.css');
  var htmlContent = TestCreatorService.exportToHtml(currentTest, { isTeacherKey: isTeacher, stylesheetTheme: activeTheme });

  var fileNameBase = tcSanitizeFilename(currentTest.title, 'Exam');
  var filename = fileNameBase + '.html';

  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (isElec && typeof Desktop.saveFile === 'function') {
    var saveRes = await Desktop.saveFile({
      target: 'docEditorDocs',
      filename: filename,
      content: htmlContent
    });
    if (saveRes && saveRes.ok) {
      if (typeof LinksService !== 'undefined') {
        var testUrn = tcGetActiveTestUrn();
        if (testUrn) {
          await LinksService.addLink(testUrn, 'cmt:doc:' + filename, {
            relation: 'printable_handout',
            meta: { testTitle: currentTest.title, docTitle: filename }
          });
          tcUpdateTestLinksBadge();
        }
      }
      if (typeof Desktop.openTool === 'function') {
        Desktop.openTool('document-editor.html', { query: { target: 'docEditorDocs', relPath: filename } });
      }
      if (window.showToast) {
        showToast(i18n.t('tcExportedToDocEditorSuccess', 'Test exported to Document Editor!'));
      }
    } else {
      if (window.showToast) showToast(i18n.t('tcFailedSaveDocFile'), true);
    }
  } else {
    try {
      localStorage.setItem('cmt_doc_' + filename, htmlContent);
    } catch (_) {}
    window.open('document-editor.html?target=docEditorDocs&relPath=' + encodeURIComponent(filename), '_blank');
    if (window.showToast) {
      showToast(i18n.t('tcExportedToDocEditorSuccess', 'Test exported to Document Editor!'));
    }
  }
};

// ── Generate Revision Mindmap ─────────────────────────────────────────
window.tcGenerateRevisionMindmap = async function () {
  var title = currentTest.title || 'Exam';
  var mindmapTitle = 'Revision: ' + title;
  var slug = tcSanitizeFilename(title, 'exam').slice(0, 40);
  var filename = 'revision_mindmap_' + slug + '_' + (currentTest.id || Date.now()) + '.json';

  var nodes = [];
  var edges = [];
  var notes = [];

  var rootId = 'node_root_' + Date.now();
  nodes.push({
    id: rootId,
    baseWord: mindmapTitle.toUpperCase(),
    x: 450,
    y: 120,
    bg: '#fef08a',
    color: '#000000',
    border: '#000000',
    borderWidth: 3,
    borderStyle: 'solid',
    fontSize: '20px',
    shape: 'rectangle',
    fmt: { bold: true },
    rotation: 0
  });

  var exs = currentTest.exercises || [];
  var totalExs = exs.length;
  var startAngle = -Math.PI * 0.8;
  var endAngle = Math.PI * 0.8;
  var radius = 280;

  exs.forEach(function (ex, idx) {
    var angle = totalExs > 1 ? (startAngle + (idx / (totalExs - 1)) * (endAngle - startAngle)) : 0;
    var nx = Math.round(450 + radius * Math.cos(angle));
    var ny = Math.round(280 + radius * Math.sin(angle));
    var exNodeId = 'node_ex_' + idx + '_' + Date.now();

    nodes.push({
      id: exNodeId,
      baseWord: ('EX ' + (idx + 1) + ': ' + (ex.title || 'Exercise')).toUpperCase(),
      x: nx,
      y: ny,
      bg: '#ffffff',
      color: '#000000',
      border: '#000000',
      borderWidth: 2,
      borderStyle: 'solid',
      fontSize: '14px',
      shape: 'rectangle',
      fmt: { bold: true },
      rotation: 0
    });

    edges.push({
      id: 'edge_' + idx + '_' + Date.now(),
      a: rootId,
      b: exNodeId,
      color: '#000000',
      thickness: 2,
      type: 'none',
      strokeType: 'solid',
      routing: 'straight'
    });

    var noteText = (ex.instructions ? ('Instructions: ' + ex.instructions + '\n\n') : '') +
      'Points: ' + (ex.points || 1) + ' pts\n' +
      (ex.type ? ('Type: ' + ex.type.toUpperCase() + '\n') : '') +
      (Array.isArray(ex.linkedCompetenceIds) && ex.linkedCompetenceIds.length ? ('Competences: ' + ex.linkedCompetenceIds.join(', ')) : '');

    notes.push({
      id: 'note_ex_' + idx + '_' + Date.now(),
      nodeId: exNodeId,
      x: nx,
      y: ny + 45,
      width: 220,
      height: 100,
      manualSize: true,
      bg: '#f8fafc',
      color: '#1e293b',
      borderColor: '#000000',
      borderWidth: 1.5,
      text: noteText,
      html: ''
    });
  });

  var constellationData = {
    _type: 'constellation',
    _version: 1,
    title: mindmapTitle,
    dateCreated: new Date().toISOString(),
    nodes: nodes,
    edges: edges,
    links: edges,
    notes: notes,
    groups: [],
    masks: [],
    drawings: [],
    shapes: [],
    tables: [],
    media: [],
    attachments: [],
    competences: []
  };

  var isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (isElec && typeof Desktop.saveJson === 'function') {
    var sRes = await Desktop.saveJson('mindmaps', filename, constellationData);
    if (sRes && sRes.ok) {
      if (typeof LinksService !== 'undefined') {
        var testUrn = tcGetActiveTestUrn();
        if (testUrn) {
          await LinksService.addLink(testUrn, 'cmt:board:' + filename, {
            relation: 'revision_mindmap',
            meta: { testTitle: currentTest.title, mindmapTitle: mindmapTitle }
          });
          tcUpdateTestLinksBadge();
        }
      }
      var openBoard = window.showConfirm
        ? await window.showConfirm((i18n.t('tcRevisionMindmapCreated') || 'Revision mindmap created and linked to test!') + '\n\n' + (i18n.t('tcOpenInBoard') || 'Open in Board') + '?')
        : confirm((i18n.t('tcRevisionMindmapCreated') || 'Revision mindmap created and linked to test!') + '\n\nOpen in Board?');
      if (openBoard && typeof Desktop.openTool === 'function') {
        Desktop.openTool('board.html', {
          query: {
            openSession: '1',
            openTarget: 'mindmaps',
            openFilename: filename,
            openSection: 'constellation'
          }
        });
      }
    } else {
      if (window.showToast) showToast(i18n.t('tcFailedSaveMindmap'), true);
    }
  } else {
    try {
      localStorage.setItem('cmt_mindmap_' + filename, JSON.stringify(constellationData));
    } catch (_) {}
    if (window.showToast) {
      showToast(i18n.t('tcRevisionMindmapCreated', 'Revision mindmap created and linked to test!'));
    }
  }
};

// ── Grade Sheet Registration Modal ───────────────────────────────────
window.tcOpenGradeSheetModal = function () {
  if (!currentTest.classId) {
    if (window.showToast) showToast(i18n.t('tcSelectClassFirst', 'Please select a class first'), true);
    return;
  }
  document.getElementById('gsTargetClass').value = currentTest.classId;
  document.getElementById('gsEvalName').value = currentTest.title || 'Class Examination';
  var list = document.getElementById('gsSubCriteriaList');
  var exs = currentTest.exercises || [];
  list.innerHTML = exs.map(function (e, idx) {
    return '<div style="display:flex;justify-content:space-between;padding:2px 0;">' +
      '<span>Ex ' + (idx + 1) + ': ' + escapeHtml(e.title) + '</span>' +
      '<strong>/' + (e.points || 1) + ' pts</strong>' +
      '</div>';
  }).join('');
  document.getElementById('gradeSheetModal').classList.add('open');
};

window.tcCloseGradeSheetModal = function () {
  document.getElementById('gradeSheetModal').classList.remove('open');
};

window.tcSubmitGradeSheetRegistration = async function () {
  var cId = document.getElementById('gsTargetClass').value;
  var term = document.getElementById('gsTargetTerm').value;
  currentTest.title = document.getElementById('gsEvalName').value;
  var res = await TestCreatorService.registerInGradeSheet(currentTest, cId, term);
  tcCloseGradeSheetModal();
  if (res && res.ok) {
    if (window.showToast) showToast(i18n.t('tcTestRegisteredGradeSheet', 'Test registered in Grade Sheet with sub-criteria!'));
  } else {
    if (window.showToast) showToast(i18n.tFmt('tcErrorRegisteringGradeSheet', { error: res.error || i18n.t('tcFailed') }), true);
  }
};

// ── Group A / B Matrix Modal ─────────────────────────────────────────
window.tcOpenVariantMatrixModal = function () {
  var tableWrap = document.getElementById('variantMatrixTableWrap');
  if (!activeStudents.length) {
    tableWrap.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Select a class with students to view matrix.</div>';
  } else {
    tableWrap.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">' +
      '<thead><tr style="background:#f1f5f9;"><th style="padding:6px;text-align:left;">Student</th><th style="padding:6px;width:120px;text-align:center;">Variant</th></tr></thead>' +
      '<tbody>' + activeStudents.map(function (st, idx) {
        var assigned = manualVariantMap[st.id] || (idx % 2 === 0 ? 'A' : 'B');
        return '<tr style="border-bottom:1px solid #e2e8f0;">' +
          '  <td style="padding:6px;">' + escapeHtml(st.name || st.firstName + ' ' + st.lastName) + '</td>' +
          '  <td style="padding:6px;text-align:center;">' +
          '    <label style="margin-right:8px;cursor:pointer;"><input type="radio" name="vm_' + st.id + '" value="A" ' + (assigned === 'A' ? 'checked' : '') + ' onchange="tcSetStudentVariant(\'' + st.id + '\', \'A\')"> A</label>' +
          '    <label style="cursor:pointer;"><input type="radio" name="vm_' + st.id + '" value="B" ' + (assigned === 'B' ? 'checked' : '') + ' onchange="tcSetStudentVariant(\'' + st.id + '\', \'B\')"> B</label>' +
          '  </td>' +
          '</tr>';
      }).join('') + '</tbody></table>';
  }
  document.getElementById('variantMatrixModal').classList.add('open');
};

window.tcCloseVariantMatrixModal = function () {
  document.getElementById('variantMatrixModal').classList.remove('open');
};

window.tcSetStudentVariant = function (stId, v) {
  manualVariantMap[stId] = v;
};

window.tcAutoAssignVariants = function (mode) {
  if (!activeStudents.length) return;
  activeStudents.forEach(function (st, idx) {
    if (mode === 'all_a') {
      manualVariantMap[st.id] = 'A';
    } else {
      manualVariantMap[st.id] = idx % 2 === 0 ? 'A' : 'B';
    }
  });
  tcOpenVariantMatrixModal();
};

// ── Save & File Actions ──────────────────────────────────────────────
window.tcSaveCurrentTest = async function (showToastNotification) {
  if (showToastNotification === undefined) showToastNotification = true;
  tcOnDirty();

  var titleVal = (document.getElementById('testTitle').value || '').trim();
  if (!titleVal) {
    titleVal = (currentTest.title || '').trim();
  }

  if (!titleVal && showToastNotification) {
    var defaultSuggested = (currentTest.subject ? (currentTest.subject + ' Test') : 'Class Test');
    var entered = window.showPrompt
      ? await window.showPrompt((i18n.t('tcEnterTestTitle') || 'Please enter a title for this test:'), defaultSuggested)
      : prompt((i18n.t('tcEnterTestTitle') || 'Please enter a title for this test:'), defaultSuggested);
    if (entered && entered.trim()) {
      titleVal = entered.trim();
    } else if (entered === null) {
      return false; // User explicitly cancelled
    } else {
      titleVal = defaultSuggested;
    }
    document.getElementById('testTitle').value = titleVal;
  } else if (!titleVal) {
    titleVal = (currentTest.subject ? (currentTest.subject + ' Test') : 'Class Test');
  }

  currentTest.title = titleVal;
  var slug = tcSanitizeFilename(titleVal, 'test').slice(0, 40);
  var filename = 'test_' + (currentTest.classId || 'general') + '_' + slug + '_' + currentTest.id + '.json';

  if (!window.Desktop || !window.Desktop.isElectron) {
    currentTest._filename = filename;
    localStorage.setItem('cmt_active_test', JSON.stringify(currentTest));
    try {
      var rawList = localStorage.getItem('cmt_tests');
      var list = rawList ? JSON.parse(rawList) : [];
      var exIdx = list.findIndex(function (t) { return t.id === currentTest.id; });
      if (exIdx >= 0) list[exIdx] = currentTest;
      else list.push(currentTest);
      localStorage.setItem('cmt_tests', JSON.stringify(list));
    } catch (_) {}
    if (showToastNotification && window.showToast) showToast(i18n.t('tcTestSavedLocally', 'Test saved locally!'));
    return true;
  }

  try {
    if (currentTest._filename && currentTest._filename !== filename) {
      try {
        if (typeof Desktop.deleteFile === 'function') {
          await Desktop.deleteFile('tests', currentTest._filename).catch(function () {});
        }
        if (typeof Desktop.deleteByPath === 'function') {
          await Desktop.deleteByPath('tests', currentTest._filename).catch(function () {});
          await Desktop.deleteByPath('user', 'tests/' + currentTest._filename).catch(function () {});
          await Desktop.deleteByPath('user', currentTest._filename).catch(function () {});
        }
      } catch (_) {}
    }
    currentTest._filename = filename;
    currentTest._relPath = 'tests/' + filename;
    var res = await window.Desktop.saveJson('tests', filename, currentTest);
    try {
      localStorage.setItem('cmt_active_test', JSON.stringify(currentTest));
      var rawList = localStorage.getItem('cmt_tests');
      var list = rawList ? JSON.parse(rawList) : [];
      var exIdx = list.findIndex(function (t) { return t.id === currentTest.id; });
      if (exIdx >= 0) list[exIdx] = currentTest;
      else list.push(currentTest);
      localStorage.setItem('cmt_tests', JSON.stringify(list));

      if (Array.isArray(_allSavedTests)) {
        var exSavedIdx = _allSavedTests.findIndex(function (t) { return t.id === currentTest.id; });
        if (exSavedIdx >= 0) {
          _allSavedTests[exSavedIdx] = JSON.parse(JSON.stringify(currentTest));
        } else {
          _allSavedTests.unshift(JSON.parse(JSON.stringify(currentTest)));
        }
      }
    } catch (_) {}

    if (res && res.ok) {
      if (showToastNotification && window.showToast) showToast(i18n.t('tcTestSavedSuccessfully', 'Test saved successfully!'));
      await TestCreatorService.registerCompetencesInPortfolio(currentTest);

      // Sync test and exercise links in LinksService
      if (typeof LinksService !== 'undefined') {
        try {
          var testUrn = 'cmt:test:' + filename;
          if (currentTest.classId) {
            var classUrn = 'cmt:class:' + currentTest.classId;
            await LinksService.addLink(testUrn, classUrn, { relation: 'assigned_to', meta: { title: currentTest.title, className: currentTest.className } });
          }
          var exs = currentTest.exercises || [];
          for (var ei = 0; ei < exs.length; ei++) {
            var exItem = exs[ei];
            if (exItem && Array.isArray(exItem.linkedCompetenceIds)) {
              for (var ci = 0; ci < exItem.linkedCompetenceIds.length; ci++) {
                var cLabel = exItem.linkedCompetenceIds[ci];
                var cCode = cLabel.replace(/^\[[^\]]+\]\s*/, '').split(' - ')[0].trim();
                if (cCode) {
                  await LinksService.addLink(testUrn + '#' + exItem.id, 'cmt:competence:' + cCode, {
                    relation: 'assesses',
                    meta: { exerciseTitle: exItem.title || ('Exercise ' + (ei + 1)), exercisePoints: exItem.points, testTitle: currentTest.title }
                  });
                }
              }
            }
          }
          tcUpdateTestLinksBadge();
        } catch (_) {}
      }

      return true;
    } else {
      if (showToastNotification && window.showToast) showToast(i18n.t('tcFailedToSaveTest', 'Failed to save test'), true);
      return false;
    }
  } catch (e) {
    if (showToastNotification && window.showToast) showToast((typeof tFmt === 'function' ? tFmt('tcErrorSavingTest', { error: e.message }) : ('Error saving test: ' + e.message)), true);
    return false;
  }
};

window.tcSaveTest = async function () {
  return window.tcSaveCurrentTest(true);
};

// ── Saved Tests Picker (Open Test) ───────────────────────────────────
var _allSavedTests = [];

window.tcOpenTestPicker = async function () {
  document.getElementById('testPickerModal').classList.add('open');
  await window.tcLoadTestPickerList();
};

window.tcCloseTestPicker = function () {
  document.getElementById('testPickerModal').classList.remove('open');
};

window.tcFilterTestPicker = function () {
  window.renderTestPickerList();
};

window.tcBrowseAndLoadFile = function () {
  var input = document.getElementById('tcTestFileInput');
  if (input) {
    input.value = '';
    input.click();
  }
};

window.tcImportTestFromFile = function (ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var parsed = JSON.parse(e.target.result);
      if (parsed && typeof parsed === 'object') {
        var loaded = (parsed.data && parsed.ok) ? parsed.data : (parsed.data ? parsed.data : parsed);
        currentTest = JSON.parse(JSON.stringify(loaded));
        currentTest.exercises = currentTest.exercises || [];
        TestCreatorService.ensureHeaderConfig(currentTest);
        ensureTestStyleAndTheme();
        if (currentTest.classId) {
          var matching = activeClassGroups.find(function (g) {
            return g.id === currentTest.classId || g.name === currentTest.classId;
          });
          if (matching) {
            currentTest.className = matching.name || matching.id;
            activeStudents = matching.students || [];
          }
        }
        renderTestMeta();
        renderExerciseCards();
        tcCloseTestPicker();
        try {
          localStorage.setItem('cmt_active_test', JSON.stringify(currentTest));
        } catch (_) {}
        if (window.showToast) showToast(i18n.tFmt('tcLoadedTestToast', { title: currentTest.title || file.name }));
      } else {
        if (window.showToast) showToast(i18n.t('tcInvalidTestFormat'), true);
      }
    } catch (err) {
      if (window.showToast) showToast(i18n.tFmt('tcErrorReadingTest', { error: err.message }), true);
    }
    ev.target.value = '';
  };
  reader.readAsText(file);
};

window.tcLoadTestPickerList = async function () {
  var container = document.getElementById('testPickerList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:#64748b;padding:24px;">' +
    '<div class="full-preview-spinner" style="width:24px;height:24px;border-width:2px;margin:0 auto 8px;"></div>' +
    'Loading saved tests…</div>';

  _allSavedTests = [];

  if (window.Desktop && Desktop.isElectron && typeof Desktop.listFiles === 'function') {
    try {
      var res = await Desktop.listFiles('tests', { extensions: ['.json', '.js'] });
      var files = (res && res.files) || [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var fn = f.filename || f.name || f;
        try {
          var readRes = await Desktop.readJson('tests', fn);
          var testObj = (readRes && readRes.ok && readRes.data) ? readRes.data : (readRes && readRes.data ? readRes.data : readRes);
          if (testObj && typeof testObj === 'object' && testObj.ok !== false) {
            testObj._filename = fn;
            testObj.id = testObj.id || fn.replace(/\.[^.]+$/, '');
            if (!testObj.title && fn) {
              var base = fn.replace(/\.json$/i, '').replace(/^test_[^_]+_/, '');
              testObj.title = base.replace(/_[a-f0-9\-]{10,}$/i, '').replace(/_/g, ' ');
            }
            _allSavedTests.push(testObj);
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Error listing saved tests:', e);
    }
  }

  try {
    var raw = localStorage.getItem('cmt_tests');
    if (raw) {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(function (t) {
          if (t && typeof t === 'object') {
            var tid = t.id || t._filename;
            if (tid && !_allSavedTests.some(function (x) { return x.id === tid || (x._filename && x._filename === t._filename); })) {
              _allSavedTests.push(t);
            }
          }
        });
      }
    }
    var act = localStorage.getItem('cmt_active_test');
    if (act) {
      var actObj = JSON.parse(act);
      if (actObj && typeof actObj === 'object') {
        var aid = actObj.id || actObj._filename;
        if (aid && !_allSavedTests.some(function (x) { return x.id === aid; })) {
          _allSavedTests.unshift(actObj);
        }
      }
    }
  } catch (_) {}

  _allSavedTests = _allSavedTests.filter(function (t) {
    return t && typeof t === 'object' && (t.title || (t.exercises && t.exercises.length) || t._filename || t.id);
  });

  window.renderTestPickerList();
};

window.renderTestPickerList = function () {
  var container = document.getElementById('testPickerList');
  var badge = document.getElementById('testPickerCountBadge');
  if (!container) return;

  var searchEl = document.getElementById('testPickerSearch');
  var query = (searchEl ? searchEl.value : '').trim().toLowerCase();
  var filtered = _allSavedTests.filter(function (t) {
    if (!query) return true;
    var hay = [
      t.title || '',
      t.subject || '',
      t.className || '',
      t.scope || '',
      t.date || ''
    ].join(' ').toLowerCase();
    return hay.indexOf(query) !== -1;
  });

  if (badge) {
    badge.textContent = filtered.length + ' test' + (filtered.length === 1 ? '' : 's');
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#64748b;padding:30px;font-weight:700;">' +
      (i18n.t('tcNoSavedTestsFound') || 'No saved tests found.') + '</div>';
    return;
  }

  container.innerHTML = filtered.map(function (t) {
    var tId = t.id || t._filename || ('test_' + Math.random());
    var tTitle = t.title || 'Untitled Test';
    var tSubject = t.subject || 'General';
    var tClass = t.className || 'No class';
    var tDate = t.date || 'No date';
    var exCount = (t.exercises && t.exercises.length) || 0;
    var totalPts = TestCreatorService.calculateTotalTestPoints(t);

    return '<div class="test-picker-card" onclick="tcSelectTestFromPicker(\'' + escapeAttr(tId) + '\')">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
      '    <div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
      '      <span class="test-picker-subject-badge">' + escapeHtml(tSubject) + '</span>' +
      '      <span class="test-picker-title" title="' + escapeAttr(tTitle) + '">' + escapeHtml(tTitle) + '</span>' +
      '    </div>' +
      '    <span class="test-picker-points-badge">' + totalPts + ' pts</span>' +
      '  </div>' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:0.8rem;color:#475569;">' +
      '    <span>' + escapeHtml(tClass) + ' &bull; ' + escapeHtml(tDate) + ' &bull; ' + exCount + ' exercises</span>' +
      '    <div style="display:flex;gap:6px;" onclick="event.stopPropagation();">' +
      '      <button type="button" class="neo-btn sm primary" style="padding:2px 8px;font-size:0.75rem;" onclick="tcSelectTestFromPicker(\'' + escapeAttr(tId) + '\')">' + (i18n.t('tcLoadTestBtn') || 'Load') + '</button>' +
      '      <button type="button" class="neo-btn sm danger" style="padding:2px 8px;font-size:0.75rem;" onclick="tcDeleteSavedTest(\'' + escapeAttr(tId) + '\', \'' + escapeAttr(t._filename || '') + '\', \'' + escapeAttr(tTitle) + '\')" title="Delete this test">&times;</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
  }).join('');
};

window.tcSelectTestFromPicker = function (testId) {
  var found = _allSavedTests.find(function (t) {
    return t && (t.id === testId || t._filename === testId || String(t.id) === String(testId));
  });
  if (!found) return;
  var loaded = (found.data && found.ok) ? found.data : (found.data ? found.data : found);
  currentTest = JSON.parse(JSON.stringify(loaded));
  currentTest.exercises = currentTest.exercises || [];
  TestCreatorService.ensureHeaderConfig(currentTest);
  ensureTestStyleAndTheme();

  if (currentTest.classId) {
    var matching = activeClassGroups.find(function (g) {
      return g.id === currentTest.classId || g.name === currentTest.classId;
    });
    if (matching) {
      currentTest.className = matching.name || matching.id;
      activeStudents = matching.students || [];
    } else {
      activeStudents = [];
    }
  } else {
    activeStudents = [];
  }

  currentTest._filename = found._filename || loaded._filename || ('test_' + currentTest.id + '.json');
  currentTest._relPath = found._relPath || loaded._relPath || ('tests/' + currentTest._filename);

  renderTestMeta();
  renderExerciseCards();
  if (typeof tcUpdateUnitSeqBadge === 'function') tcUpdateUnitSeqBadge();
  if (typeof tcUpdateTestLinksBadge === 'function') tcUpdateTestLinksBadge();
  tcCloseTestPicker();

  try {
    localStorage.setItem('cmt_active_test', JSON.stringify(currentTest));
  } catch (_) {}

  if (window.showToast) showToast(i18n.tFmt('tcLoadedTestToast', { title: currentTest.title || i18n.t('tcUntitled') }));
};

window.tcDeleteSavedTest = async function (testId, filename, testTitle) {
  var msg = (i18n.t('tcDeleteTestConfirm') || 'Are you sure you want to delete this test?') + (testTitle ? (' (' + testTitle + ')') : '');
  var ok = window.showConfirm ? await window.showConfirm(msg) : confirm(msg);
  if (!ok) return;

  if (window.Desktop && Desktop.isElectron && typeof Desktop.deleteFile === 'function') {
    var fn = filename || (testId + '.json');
    try {
      await Desktop.deleteFile('tests', fn);
    } catch (e) {
      console.warn('Error deleting test file:', e);
    }
  }
  _allSavedTests = _allSavedTests.filter(function (t) {
    return t.id !== testId && (!filename || t._filename !== filename);
  });
  try {
    var raw = localStorage.getItem('cmt_tests');
    if (raw) {
      var list = JSON.parse(raw);
      list = list.filter(function (t) { return t.id !== testId && (!filename || t._filename !== filename); });
      localStorage.setItem('cmt_tests', JSON.stringify(list));
    }
    var act = localStorage.getItem('cmt_active_test');
    if (act) {
      var actObj = JSON.parse(act);
      if (actObj && (actObj.id === testId || actObj._filename === filename)) {
        localStorage.removeItem('cmt_active_test');
      }
    }
  } catch (_) {}

  window.renderTestPickerList();
  if (window.showToast) showToast(i18n.t('tcTestDeletedToast') || 'Test deleted successfully.');
};

// ── Test Models & Templates Controller ────────────────────────────────
var _userCustomTestTemplates = [];
var _activeTemplateTab = 'all';

window.tcLoadCustomTestTemplates = async function () {
  _userCustomTestTemplates = [];
  if (window.Desktop && Desktop.isElectron && typeof Desktop.readJson === 'function') {
    try {
      var res = await Desktop.readJson('user', 'custom-test-templates.json');
      var list = (res && res.ok && res.data) ? res.data : (res && res.data ? res.data : res);
      if (Array.isArray(list)) {
        _userCustomTestTemplates = list;
        return;
      }
    } catch (_) {}
  }
  try {
    var raw = localStorage.getItem('cmt_custom_test_templates');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _userCustomTestTemplates = parsed;
      }
    }
  } catch (_) {}
};

window.tcSaveCustomTestTemplatesToDisk = async function () {
  try {
    localStorage.setItem('cmt_custom_test_templates', JSON.stringify(_userCustomTestTemplates));
  } catch (_) {}
  if (window.Desktop && Desktop.isElectron && typeof Desktop.saveJson === 'function') {
    try {
      await Desktop.saveJson('user', 'custom-test-templates.json', _userCustomTestTemplates);
    } catch (e) {
      console.error('Error saving custom test templates:', e);
    }
  }
};

window.tcOpenTemplatePicker = function () {
  document.getElementById('templateModal').classList.add('open');
  var sIn = document.getElementById('templatePickerSearch');
  if (sIn) sIn.value = '';
  tcSetTemplateTab('all');
};

window.tcCloseTemplatePicker = function () {
  document.getElementById('templateModal').classList.remove('open');
};

window.tcSetTemplateTab = function (tab) {
  _activeTemplateTab = tab;
  ['all', 'builtin', 'custom'].forEach(function (t) {
    var btn = document.getElementById('tmplTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) {
      if (t === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  tcRenderTemplatePickerList();
};

window.tcFilterTemplatePicker = function () {
  tcRenderTemplatePickerList();
};

window.tcRenderTemplatePickerList = function () {
  var container = document.getElementById('templatePickerList');
  if (!container) return;

  var query = ((document.getElementById('templatePickerSearch') && document.getElementById('templatePickerSearch').value) || '').trim().toLowerCase();

  var builtins = TestCreatorService.BUILTIN_TEST_TEMPLATES || [];
  var customs = _userCustomTestTemplates || [];

  var cntAll = document.getElementById('tmplCountAll');
  var cntBuiltin = document.getElementById('tmplCountBuiltin');
  var cntCustom = document.getElementById('tmplCountCustom');
  if (cntAll) cntAll.textContent = builtins.length + customs.length;
  if (cntBuiltin) cntBuiltin.textContent = builtins.length;
  if (cntCustom) cntCustom.textContent = customs.length;

  var all = [];
  if (_activeTemplateTab === 'all' || _activeTemplateTab === 'builtin') {
    all = all.concat(builtins);
  }
  if (_activeTemplateTab === 'all' || _activeTemplateTab === 'custom') {
    all = all.concat(customs);
  }

  var filtered = all.filter(function (t) {
    if (!query) return true;
    var inTitle = (t.title || '').toLowerCase().includes(query);
    var inDesc = (t.description || '').toLowerCase().includes(query);
    var inSubj = (t.subject || '').toLowerCase().includes(query);
    return inTitle || inDesc || inSubj;
  });

  var countBadge = document.getElementById('templatePickerCountBadge');
  if (countBadge) {
    countBadge.textContent = filtered.length + ' ' + (filtered.length === 1 ? 'template' : 'templates');
  }

  if (!filtered.length) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b;font-weight:700;">' +
      (i18n.t('tcNoTemplatesFound') || 'No test models or templates match your filter.') + '</div>';
    return;
  }

  container.innerHTML = filtered.map(function (tmpl) {
    var isCustom = !!tmpl.isCustom;
    var exList = tmpl.exercises || [];
    var totalPts = TestCreatorService.calculateTotalTestPoints(tmpl);
    var chipsHtml = exList.map(function (e, idx) {
      var typeLabel = e.type ? e.type.toUpperCase() : 'EX';
      var pts = (Number(e.points) || 0);
      return '<span class="template-ex-chip">#' + (idx + 1) + ' ' + escapeHtml(e.title || typeLabel) + ' (' + pts + 'p)</span>';
    }).join('');

    return '<div class="template-picker-card">' +
      '  <div class="template-picker-header">' +
      '    <div style="display:flex;flex-direction:column;gap:4px;width:100%;">' +
      '      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
      '        <span class="template-picker-title">' + escapeHtml(tmpl.title || 'Untitled Model') + '</span>' +
      '        <span class="template-badge ' + (isCustom ? 'template-badge-custom' : 'template-badge-builtin') + '">' +
      '          ' + (isCustom ? (i18n.t('tcBadgeCustom') || 'Custom Template') : (i18n.t('tcBadgeBuiltin') || 'Built-in Model')) +
      '        </span>' +
      '        <span class="template-subject-badge">' + escapeHtml(tmpl.subject || 'General') + '</span>' +
      '      </div>' +
      '      <div class="template-picker-desc">' + escapeHtml(tmpl.description || '') + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="template-meta-row">' +
      '    <span class="template-stat"><strong>' + exList.length + '</strong> ' + (i18n.t('tcExercises') || 'exercises') + '</span>' +
      '    <span class="template-stat"><strong>' + (tmpl.duration || 45) + '</strong> min</span>' +
      '    <span class="template-stat"><strong>' + totalPts + '</strong> pts</span>' +
      '  </div>' +
      (chipsHtml ? ('  <div class="template-ex-chips">' + chipsHtml + '</div>') : '') +
      '  <div class="template-actions">' +
      '    <button type="button" class="neo-btn sm primary" onclick="tcUseTemplate(\'' + escapeAttr(tmpl.id) + '\', ' + (!isCustom) + ')">' +
      '      <img src="../assets/icons/check.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /> ' +
      '      ' + (i18n.t('tcUseThisTemplate') || 'Use this Model') +
      '    </button>' +
      '    <button type="button" class="neo-btn sm" onclick="tcExportTemplateFile(\'' + escapeAttr(tmpl.id) + '\', ' + (!isCustom) + ')" title="Export template JSON to disk">' +
      '      <img src="../assets/icons/download.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /> ' +
      '      ' + (i18n.t('tcExportTemplate') || 'Export…') +
      '    </button>' +
      (isCustom ? (
      '    <button type="button" class="neo-btn sm danger" onclick="tcDeleteCustomTemplate(\'' + escapeAttr(tmpl.id) + '\')" title="Delete custom template">' +
      '      <img src="../assets/icons/trash.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /> ' +
      '      ' + (i18n.t('btnDelete') || 'Delete') +
      '    </button>'
      ) : '') +
      '  </div>' +
      '</div>';
  }).join('');
};

window.tcUseTemplate = async function (templateId, isBuiltin) {
  var tmpl = null;
  if (isBuiltin) {
    tmpl = (TestCreatorService.BUILTIN_TEST_TEMPLATES || []).find(function (t) { return t.id === templateId; });
  } else {
    tmpl = (_userCustomTestTemplates || []).find(function (t) { return t.id === templateId; });
  }
  if (!tmpl) {
    if (window.showToast) showToast(i18n.t('tcTemplateNotFound'), true);
    return;
  }

  if (currentTest && currentTest.exercises && currentTest.exercises.length > 0) {
    var warnMsg = i18n.t('tcApplyTemplateWarnMsg');
    var ok = window.showConfirm ? await window.showConfirm(warnMsg) : confirm(warnMsg);
    if (!ok) return;
  }

  var newTest = TestCreatorService.createTestFromTemplate(tmpl, {
    className: currentTest ? currentTest.className : '',
    subject: (tmpl.subject && tmpl.subject !== 'General') ? tmpl.subject : (currentTest ? currentTest.subject : '')
  });

  currentTest = newTest;
  if (currentTest.classId) {
    var matching = activeClassGroups.find(function (g) {
      return g.id === currentTest.classId || g.name === currentTest.classId;
    });
    if (matching) {
      currentTest.className = matching.name || matching.id;
      activeStudents = matching.students || [];
    } else {
      activeStudents = [];
    }
  } else {
    activeStudents = [];
  }

  renderTestMeta();
  renderExerciseCards();
  tcCloseTemplatePicker();

  try {
    localStorage.setItem('cmt_active_test', JSON.stringify(currentTest));
  } catch (_) {}

  tcSaveCurrentTest(false);
  if (window.showToast) {
    showToast((i18n.t('tcTemplateLoaded') || 'Loaded template: ') + (tmpl.title || 'Untitled'));
  }
};

window.tcSaveAsTemplate = async function () {
  if (!currentTest) return;
  var promptTitle = i18n.t('tcSaveTemplatePromptTitle') || 'Enter a title for this template:';
  var defaultTitle = (currentTest.title ? (currentTest.title + ' Template') : 'My Custom Template');
  var enteredTitle = window.showPrompt
    ? await window.showPrompt(promptTitle, defaultTitle)
    : prompt(promptTitle, defaultTitle);
  if (!enteredTitle || !enteredTitle.trim()) return;

  var promptDesc = i18n.t('tcSaveTemplatePromptDesc') || 'Enter a short description of this test model/template:';
  var defaultDesc = (currentTest.exercises ? (currentTest.exercises.length + ' exercises') : '') + (currentTest.subject ? (' for ' + currentTest.subject) : '');
  var enteredDesc = window.showPrompt
    ? await window.showPrompt(promptDesc, defaultDesc)
    : prompt(promptDesc, defaultDesc);

  var tmpl = TestCreatorService.extractTemplateFromTest(currentTest, {
    title: enteredTitle.trim(),
    description: (enteredDesc || '').trim(),
    subject: currentTest.subject || 'General'
  });

  _userCustomTestTemplates.push(tmpl);
  await tcSaveCustomTestTemplatesToDisk();

  if (window.showToast) {
    showToast(i18n.t('tcTemplateSaved') || 'Template saved successfully!');
  }

  var modal = document.getElementById('templateModal');
  if (modal && modal.classList.contains('open')) {
    tcSetTemplateTab('custom');
    tcRenderTemplatePickerList();
  }
};

window.tcDeleteCustomTemplate = async function (templateId) {
  var tmpl = (_userCustomTestTemplates || []).find(function (t) { return t.id === templateId; });
  if (!tmpl) return;

  var msg = (i18n.t('tcDeleteTemplateConfirm') || 'Are you sure you want to delete this template?') + ' "' + tmpl.title + '"';
  var ok = window.showConfirm ? await window.showConfirm(msg) : confirm(msg);
  if (!ok) return;

  _userCustomTestTemplates = _userCustomTestTemplates.filter(function (t) { return t.id !== templateId; });
  await tcSaveCustomTestTemplatesToDisk();
  tcRenderTemplatePickerList();
  if (window.showToast) {
    showToast(i18n.t('tcTemplateDeleted', 'Template deleted'));
  }
};

window.tcExportTemplateFile = async function (templateId, isBuiltin) {
  var tmpl = null;
  if (isBuiltin) {
    tmpl = (TestCreatorService.BUILTIN_TEST_TEMPLATES || []).find(function (t) { return t.id === templateId; });
  } else {
    tmpl = (_userCustomTestTemplates || []).find(function (t) { return t.id === templateId; });
  }
  if (!tmpl) {
    if (window.showToast) showToast(i18n.t('tcTemplateNotFound'), true);
    return;
  }

  var exportObj = {
    title: tmpl.title,
    description: tmpl.description || '',
    subject: tmpl.subject || 'General',
    duration: tmpl.duration || 45,
    headerConfig: tmpl.headerConfig || {},
    materialsAllowed: tmpl.materialsAllowed || [],
    exportStyle: tmpl.exportStyle || {},
    exercises: tmpl.exercises || []
  };

  var slug = tcSanitizeFilename(tmpl.title, 'template').slice(0, 40);
  var filename = 'template_' + slug + '.json';
  var jsonContent = JSON.stringify(exportObj, null, 2);

  if (window.saveExportWithDestination) {
    await window.saveExportWithDestination({
      filename: filename,
      content: jsonContent,
      mimeType: 'application/json;charset=utf-8',
      allowDocEditor: false,
      filters: [{ name: 'JSON Template File', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
      modalTitle: (i18n.t('tcExportTemplate') || 'Export Template')
    });
    return;
  }

  if (window.Desktop && Desktop.isElectron && typeof Desktop.saveFile === 'function') {
    var res = await Desktop.saveFile({
      target: 'user',
      filename: filename,
      content: jsonContent
    });
    if (res && res.ok && window.showExportSuccessPopup) {
      window.showExportSuccessPopup(res.path || ('user/' + filename), filename);
    } else if (window.showToast) {
      showToast(i18n.tFmt('tcTemplateExportedTo', { file: filename }));
    }
  } else {
    var blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    if (window.showToast) showToast(i18n.t('tcTemplateExported', 'Template exported'));
  }
};

window.tcImportTemplateFromFile = function (event) {
  var file = event && event.target && event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = async function (e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') {
        if (window.showToast) showToast(i18n.t('tcInvalidTemplateFormat'), true);
        return;
      }
      var newTmpl = {
        id: 'tmpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: data.title || 'Imported Template',
        description: data.description || '',
        subject: data.subject || 'General',
        duration: data.duration || 45,
        isCustom: true,
        headerConfig: data.headerConfig || {},
        materialsAllowed: Array.isArray(data.materialsAllowed) ? data.materialsAllowed : [],
        exportStyle: data.exportStyle || {},
        exercises: Array.isArray(data.exercises) ? data.exercises : []
      };

      _userCustomTestTemplates.push(newTmpl);
      await tcSaveCustomTestTemplatesToDisk();
      tcSetTemplateTab('custom');
      tcRenderTemplatePickerList();
      if (window.showToast) {
        showToast((i18n.t('tcTemplateImported') || 'Template imported successfully! ') + ' "' + newTmpl.title + '"');
      }
    } catch (err) {
      console.error('Error parsing imported template JSON:', err);
      if (window.showToast) showToast(i18n.tFmt('tcFailedImportTemplate', { error: err.message }), true);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
};

window.tcNewTest = function () {
  currentTest = TestCreatorService.createEmptyTest();
  var defTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('cmt_default_test_theme')) || 'academic';
  if (!currentTest.exportStyle) currentTest.exportStyle = {};
  currentTest.exportStyle.theme = defTheme;
  currentTest.stylesheetTheme = defTheme;
  activeStudents = [];
  try {
    localStorage.removeItem('cmt_active_test');
  } catch (_) {}
  renderTestMeta();
  renderExerciseCards();
  if (window.showToast) showToast(i18n.t('tcCreatedNewTest', 'Created new blank test'));
};

window.tcDuplicateTest = function () {
  currentTest.id = TestCreatorService.createEmptyTest().id;
  delete currentTest._filename;
  currentTest.title = (currentTest.title || 'Exam') + ' (Copy)';
  try {
    localStorage.setItem('cmt_active_test', JSON.stringify(currentTest));
  } catch (_) {}
  renderTestMeta();
  renderExerciseCards();
  if (window.showToast) showToast(i18n.t('tcDuplicatedTest', 'Duplicated test'));
};

window.tcResetTest = function () {
  tcNewTest();
};

window.tcSaveAllExercisesToDb = async function () {
  var exs = currentTest.exercises || [];
  for (var i = 0; i < exs.length; i++) {
    await TestCreatorService.saveExerciseToDatabase(exs[i], currentTest.subject);
  }
  if (window.showToast) showToast(i18n.tFmt('tcSavedAllExercisesCount', { count: exs.length }));
  tcLoadDrawerContent();
};

window.tcOpenManageDatabase = function () {
  if (window.Desktop && Desktop.isElectron) {
    Desktop.openTool('manage-database.html');
  }
};

window.tcSyncWithCompetencePortfolio = async function () {
  await TestCreatorService.registerCompetencesInPortfolio(currentTest);
  if (window.showToast) showToast(i18n.t('tcSyncedPortfolio', 'Synced test with Competence Portfolio!'));
};

