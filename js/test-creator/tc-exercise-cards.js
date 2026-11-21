'use strict';

// Test Creator — Exercise Cards, Section Cards, PDF & Subitem WYSIWYG
var _tcLivePreviewDebounceTimer = null;
window.tcScheduleLivePreviewUpdate = function (delayMs) {
  if (window._tcPreviewIsFrozen) return;
  if (_tcLivePreviewDebounceTimer) clearTimeout(_tcLivePreviewDebounceTimer);
  var effectiveDelay = typeof delayMs === 'number' ? Math.max(delayMs, 450) : 450;
  _tcLivePreviewDebounceTimer = setTimeout(function () {
    if (typeof tcUpdatePrintPreview === 'function') {
      tcUpdatePrintPreview();
    }
  }, effectiveDelay);
};

window.tcUpdateBlockBadges = function () {
  if (!currentTest) return;
  var total = typeof TestCreatorService !== 'undefined' ? TestCreatorService.calculateTotalTestPoints(currentTest) : 0;
  var dur = currentTest.durationMinutes || 45;
  var exCount = Array.isArray(currentTest.exercises) ? currentTest.exercises.length : 0;
  var compCount = Array.isArray(currentTest.competences) ? currentTest.competences.length : 0;
  var rawCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
    ? currentTest.criteria
    : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
  var critCount = rawCrits.length;
  var critPts = 0;
  rawCrits.forEach(function (c) {
    var w = Number(c.weight || c.pointCoefficient) || 1;
    var cp = (c.maxPoints != null && c.maxPoints !== '')
      ? Number(c.maxPoints)
      : ((Array.isArray(c.grades) && c.grades.length && !isNaN(Number(c.grades[0])))
        ? Number(c.grades[0])
        : ((c.points != null && c.points !== '') ? Number(c.points) : 0));
    if (isNaN(cp)) cp = 0;
    critPts += (cp * w);
  });
  critPts = Math.round(critPts * 10) / 10;

  var hBadge = document.getElementById('hdrSummaryBadge');
  if (hBadge) hBadge.textContent = dur + ' min • ' + total + ' pts';

  var compBadge = document.getElementById('blockCompCountBadge');
  if (compBadge) compBadge.textContent = compCount + ' linked';

  var critBadge = document.getElementById('blockCritCountBadge');
  if (critBadge) critBadge.textContent = critCount + ' active' + (critPts > 0 ? ' (' + critPts + ' pts)' : '');

  var scBadge = document.getElementById('blockScaleNameBadge');
  if (scBadge) {
    var scId = currentTest.scaleModelId || (currentTest.scaleModel && currentTest.scaleModel.id) || 'none';
    scBadge.textContent = scId === 'none' ? 'None' : (currentTest.scaleModel ? (currentTest.scaleModel.name || scId) : scId);
  }

  var exBadge = document.getElementById('exerciseCountBadge');
  if (exBadge) exBadge.textContent = exCount + (exCount === 1 ? ' exercise' : ' exercises');
};

window.tcToggleBlockCard = function (blockId) {
  var card = document.getElementById(blockId);
  if (!card) return;
  card.classList.toggle('collapsed');
  var chevron = card.querySelector('.card-drag-handle');
  if (chevron) {
    chevron.textContent = card.classList.contains('collapsed') ? '▸' : '▾';
  }
};

window.tcCollapseAllBlocks = function () {
  ['blockExamHeader', 'blockCompetences', 'blockCriteria', 'blockGradeScale'].forEach(function (id) {
    var c = document.getElementById(id);
    if (c) {
      c.classList.add('collapsed');
      var ch = c.querySelector('.card-drag-handle');
      if (ch) ch.textContent = '▸';
    }
  });
};

window.tcExpandAllBlocks = function () {
  ['blockExamHeader', 'blockCompetences', 'blockCriteria', 'blockGradeScale'].forEach(function (id) {
    var c = document.getElementById(id);
    if (c) {
      c.classList.remove('collapsed');
      var ch = c.querySelector('.card-drag-handle');
      if (ch) ch.textContent = '▾';
    }
  });
};

window.tcSetPreviewZoom = function (zoomVal) {
  var col = document.getElementById('tcPreviewColumn');
  if (!col) return;
  col.classList.remove('zoom-fit', 'zoom-100', 'zoom-75');
  col.classList.add('zoom-' + zoomVal);
  var sel = document.getElementById('previewZoomSelect');
  if (sel && sel.value !== zoomVal) sel.value = zoomVal;
  try { localStorage.setItem('cmt_tc_preview_zoom', zoomVal); } catch (_) {}
};

window.tcSyncHeaderBlockFromState = function () {
  if (!currentTest) return;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);

  var chkMap = {
    blockHdrNameChk: hc.showStudentName !== false,
    blockHdrClassChk: hc.showClass !== false,
    blockHdrDateChk: hc.showDate !== false,
    blockHdrTeacherChk: hc.showTeacher !== false,
    blockHdrDurationChk: hc.showDuration !== false,
    blockHdrPointsBoxChk: hc.showTotalPoints !== false,
    blockHdrGradeBoxChk: !!hc.showGradingScale,
    blockHdrMaterialsPrintChk: hc.showMaterials !== false,
    blockHdrInstructionsPrintChk: !!hc.showInstructions
  };
  for (var k in chkMap) {
    var el = document.getElementById(k);
    if (el) el.checked = chkMap[k];
  }

  var instEl = document.getElementById('blockHdrInstructionsInput');
  if (instEl) {
    instEl.value = hc.instructionsText || '';
  }

  // Render allowed materials preset chips
  var pool = document.getElementById('blockMaterialsChipsPool');
  if (pool) {
    var curMats = Array.isArray(currentTest.materialsAllowed) ? currentTest.materialsAllowed : ['Pen & Pencil only'];
    var builtins = (TestCreatorService && TestCreatorService.DEFAULT_MATERIALS) ? TestCreatorService.DEFAULT_MATERIALS : [
      'Pen & Pencil only', 'Ruler', 'Calculator', 'Dictionary', 'Rough paper', 'Highlighter', 'Formula sheet'
    ];
    var allPresets = builtins.slice();
    curMats.forEach(function (m) {
      if (allPresets.indexOf(m) === -1) allPresets.push(m);
    });
    pool.innerHTML = allPresets.map(function (mat) {
      var isSel = curMats.indexOf(mat) !== -1;
      return '<label class="tc-chip-toggle">' +
        '<input type="checkbox" ' + (isSel ? 'checked' : '') + ' onchange="tcToggleBlockMaterialPreset(\'' + escapeAttr(mat) + '\', this.checked)">' +
        '<span>' + escapeHtml(mat) + '</span>' +
      '</label>';
    }).join('');
  }
};

window.tcToggleBlockMaterialPreset = function (mat, isChecked) {
  if (!currentTest) return;
  if (!Array.isArray(currentTest.materialsAllowed)) {
    currentTest.materialsAllowed = [];
  }
  var idx = currentTest.materialsAllowed.indexOf(mat);
  if (isChecked && idx === -1) {
    currentTest.materialsAllowed.push(mat);
  } else if (!isChecked && idx !== -1) {
    currentTest.materialsAllowed.splice(idx, 1);
  }
  tcOnDirty();
};

window.tcSyncHeaderBlockToState = function () {
  if (!currentTest) return;
  var hc = TestCreatorService.ensureHeaderConfig(currentTest);

  var nEl = document.getElementById('blockHdrNameChk');
  if (nEl) hc.showStudentName = nEl.checked;
  var cEl = document.getElementById('blockHdrClassChk');
  if (cEl) hc.showClass = cEl.checked;
  var dEl = document.getElementById('blockHdrDateChk');
  if (dEl) hc.showDate = dEl.checked;
  var tEl = document.getElementById('blockHdrTeacherChk');
  if (tEl) hc.showTeacher = tEl.checked;
  var duEl = document.getElementById('blockHdrDurationChk');
  if (duEl) hc.showDuration = duEl.checked;
  var pEl = document.getElementById('blockHdrPointsBoxChk');
  if (pEl) hc.showTotalPoints = pEl.checked;
  var gEl = document.getElementById('blockHdrGradeBoxChk');
  if (gEl) hc.showGradingScale = gEl.checked;
  var mEl = document.getElementById('blockHdrMaterialsPrintChk');
  if (mEl) hc.showMaterials = mEl.checked;
  var iEl = document.getElementById('blockHdrInstructionsPrintChk');
  if (iEl) hc.showInstructions = iEl.checked;
  var inTextEl = document.getElementById('blockHdrInstructionsInput');
  if (inTextEl) hc.instructionsText = inTextEl.value.trim();

  tcOnDirty();
};

window.tcOnDirty = function () {
  currentTest.title = document.getElementById('testTitle').value.trim();
  currentTest.subject = document.getElementById('testSubject').value;
  currentTest.date = document.getElementById('testDate').value;
  currentTest.durationMinutes = Number(document.getElementById('testDuration').value) || 45;
  currentTest.scope = document.getElementById('testScope').value.trim();
  currentTest.teacher = document.getElementById('testTeacher').value.trim();
  var selectedScale = document.getElementById('testScale').value;
  if (selectedScale !== currentTest.scaleModelId) {
    if (typeof tcResolveAndSetScaleModel === 'function') {
      tcResolveAndSetScaleModel(selectedScale);
    } else {
      currentTest.scaleModelId = selectedScale;
    }
  }
  updatePointsBadge();
  if (typeof tcUpdateBlockBadges === 'function') {
    tcUpdateBlockBadges();
  }
  tcScheduleLivePreviewUpdate();
};

window.tcOnClassChange = async function () {
  var cId = document.getElementById('testClass').value;
  currentTest.classId = cId;
  var group = activeClassGroups.find(function (g) { return g.id === cId || g.name === cId; });
  if (group) {
    currentTest.className = group.name || group.id;
    activeStudents = group.students || [];
    if (group.subject && group.subject.trim()) {
      var gSub = group.subject.trim();
      tcAddSubjectOption(gSub, true);
      currentTest.subject = gSub;
      var subSel = document.getElementById('testSubject');
      if (subSel) subSel.value = gSub;
      var dSub = document.getElementById('drawerCompFilterSubject');
      if (dSub) {
        var tSub = gSub.toLowerCase();
        for (var j = 0; j < dSub.options.length; j++) {
          var dv = (dSub.options[j].value || '').toLowerCase().trim();
          if (dv !== 'all' && dv !== '' && (dv === tSub || tSub.includes(dv) || dv.includes(tSub))) {
            dSub.selectedIndex = j;
            break;
          }
        }
      }
      if (typeof tcPopulateCompCategoryDropdown === 'function') tcPopulateCompCategoryDropdown(gSub);
      if (window.showToast && typeof i18n !== 'undefined' && typeof i18n.tFmt === 'function') {
        showToast(i18n.tFmt('tcSubjectSyncedFromClass', { subject: gSub }));
      }
    }
    if (group.level) {
      var dYr = document.getElementById('drawerCompFilterYear');
      if (dYr) {
        var tLvl = String(group.level).trim().toLowerCase();
        var matchedYr = false;
        for (var k = 0; k < dYr.options.length; k++) {
          var yv = (dYr.options[k].value || '').toLowerCase().trim();
          if (yv !== 'all' && yv !== '' && yv === tLvl) {
            dYr.selectedIndex = k;
            matchedYr = true;
            break;
          }
        }
        if (!matchedYr) {
          var numMatch = tLvl.match(/(?:^|\D)([1-6])(?:\D|$)/);
          var targetNum = numMatch ? numMatch[1] : null;
          if (targetNum) {
            var re = new RegExp('(?:^|\\D)' + targetNum + '(?:[eè]me?|e|th)?(?:\\D|$)', 'i');
            for (var m = 0; m < dYr.options.length; m++) {
              var mv = (dYr.options[m].value || '').toLowerCase().trim();
              if (mv !== 'all' && mv !== '' && re.test(mv)) {
                dYr.selectedIndex = m;
                matchedYr = true;
                break;
              }
            }
          }
        }
      }
    }
    if (typeof tcFilterCompetences === 'function') tcFilterCompetences();
  } else {
    currentTest.className = '';
    activeStudents = [];
  }
  await tcResolveClassInheritedContext(cId);
  tcOnDirty();
};

window.tcUpdateCriteriaInheritedBadge = function (sourceLabel) {
  var badge = document.getElementById('tcCriteriaInheritedBadge');
  if (!badge) return;
  if (sourceLabel) {
    var text = (typeof i18n !== 'undefined' && typeof i18n.tFmt === 'function')
      ? i18n.tFmt('tcCriteriaInheritedBadge', { source: sourceLabel })
      : ('[INHERITED: ' + sourceLabel + ']');
    badge.textContent = text;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
};

window.tcUpdateScaleInheritedBadge = function (sourceLabel) {
  var b1 = document.getElementById('tcScaleInheritedBadge');
  var b2 = document.getElementById('tcScaleDrawerInheritedBadge');
  var text = sourceLabel
    ? ((typeof i18n !== 'undefined' && typeof i18n.tFmt === 'function')
        ? i18n.tFmt('tcScaleInheritedBadge', { source: sourceLabel })
        : ('[INHERITED: ' + sourceLabel + ']'))
    : '';
  [b1, b2].forEach(function (b) {
    if (!b) return;
    if (sourceLabel) {
      b.textContent = text;
      b.style.display = 'inline-block';
    } else {
      b.style.display = 'none';
    }
  });
};

window.tcUpdateClassObjectivesBanner = function (list, className) {
  var banner = document.getElementById('tcClassObjectivesBanner');
  var listEl = document.getElementById('tcClassObjectivesList');
  var badgeEl = document.getElementById('tcClassObjBadge');
  if (!banner || !listEl) return;
  if (!list || !list.length) {
    banner.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  if (badgeEl && className) {
    badgeEl.textContent = '[INHERITED: ' + className + ']';
  }
  banner.style.display = 'block';
  listEl.innerHTML = list.map(function (code) {
    return '<span style="background:#eff6ff;border:1.5px solid #2563eb;color:#1e40af;font-size:0.72rem;font-weight:800;padding:2px 6px;border-radius:3px;">' +
      escapeHtml(code) +
      '</span>';
  }).join('');
};

window.tcResolveClassInheritedContext = async function (cId) {
  if (!cId) {
    tcUpdateCriteriaInheritedBadge(null);
    tcUpdateScaleInheritedBadge(null);
    tcUpdateClassObjectivesBanner([], null);
    return;
  }
  var group = activeClassGroups.find(function (g) { return g.id === cId || g.name === cId; });
  var inheritedCtx = null;
  if (typeof LinksService !== 'undefined') {
    try {
      var testCtxType = (currentTest && currentTest.id) ? 'test' : 'class';
      var testCtxId = (currentTest && currentTest.id) ? currentTest.id : cId;
      inheritedCtx = await LinksService.resolveContext({ type: testCtxType, id: testCtxId, classId: cId });
    } catch (_) {}
  }

  var className = (group && (group.name || group.id)) || (inheritedCtx && inheritedCtx.inheritedFrom) || 'Class';

  // 1. Criteria Rubric Inheritance
  var critPreset = (inheritedCtx && inheritedCtx.criteriaPreset) || (group && (group.criteriaPreset || group.criteriaBank));
  if (critPreset && Array.isArray(_allCriteriaBanks)) {
    var bankMatch = _allCriteriaBanks.find(function (b) {
      return b.id === critPreset || b.filename === critPreset || (b.name && b.name.toLowerCase() === String(critPreset).toLowerCase());
    });
    if (bankMatch) {
      var cSel = document.getElementById('criteriaBankSource');
      if (cSel) cSel.value = bankMatch.id;
      _cachedCriteria = bankMatch.criteria || [];
      tcRenderCriteriaList(_cachedCriteria);
      tcUpdateCriteriaInheritedBadge(className);
    } else {
      tcUpdateCriteriaInheritedBadge(null);
    }
  } else {
    tcUpdateCriteriaInheritedBadge(null);
  }

  // 2. Grading Scale Inheritance
  var scalePreset = (inheritedCtx && inheritedCtx.gradingScale) || (group && (group.gradingScale || group.defaultScale));
  if (scalePreset) {
    if (typeof tcResolveAndSetScaleModel === 'function') {
      tcResolveAndSetScaleModel(scalePreset);
    } else {
      currentTest.scaleModelId = scalePreset;
      var scSel = document.getElementById('testScale');
      if (scSel) scSel.value = scalePreset;
    }
    tcUpdateScaleInheritedBadge(className);
    updatePointsBadge();
  } else {
    tcUpdateScaleInheritedBadge(null);
  }

  // 3. Class Objectives / Competences
  var rawComps = (inheritedCtx && inheritedCtx.competences) || [];
  var compList = [];
  rawComps.forEach(function (rc) {
    var code = (rc.targetMeta && rc.targetMeta.title) || (rc.meta && (rc.meta.code || rc.meta.label)) || (LinksService && LinksService.parseUrn(rc.otherUrn) && LinksService.parseUrn(rc.otherUrn).id);
    if (code && compList.indexOf(code) === -1) compList.push(code);
  });
  if (group && Array.isArray(group.targetCompetences)) {
    group.targetCompetences.forEach(function (tc) {
      var cCode = typeof tc === 'string' ? tc : (tc.code || tc.id);
      if (cCode && compList.indexOf(cCode) === -1) compList.push(cCode);
    });
  }
  if (group && Array.isArray(group.competences)) {
    group.competences.forEach(function (tc) {
      var cCode = typeof tc === 'string' ? tc : (tc.code || tc.id);
      if (cCode && compList.indexOf(cCode) === -1) compList.push(cCode);
    });
  }
  window._activeClassObjectives = compList;
  tcUpdateClassObjectivesBanner(compList, className);
};

window.tcAttachClassObjectives = function () {
  var list = window._activeClassObjectives || [];
  if (!list.length) {
    if (window.showToast) showToast(i18n.t('tcNoClassObjectivesFound', 'No target objectives defined for this class.'), true);
    return;
  }
  var targetSel = document.getElementById('competenceTargetExSelect');
  var targetVal = targetSel ? targetSel.value : (_targetAttachExId || '__exam__');
  var targetEx = null;
  if (targetVal && targetVal !== '__exam__') {
    targetEx = currentTest.exercises.find(function (e) { return e.id === targetVal; });
  } else if (_targetAttachExId && _targetAttachExId !== '__exam__') {
    targetEx = currentTest.exercises.find(function (e) { return e.id === _targetAttachExId; });
  }

  var count = 0;
  list.forEach(function (code) {
    var label = code;
    if (targetEx) {
      if (!Array.isArray(targetEx.linkedCompetenceIds)) targetEx.linkedCompetenceIds = [];
      if (targetEx.linkedCompetenceIds.indexOf(label) === -1) {
        targetEx.linkedCompetenceIds.push(label);
        count++;
      }
    }
    if (!Array.isArray(currentTest.linkedCompetenceIds)) currentTest.linkedCompetenceIds = [];
    if (currentTest.linkedCompetenceIds.indexOf(label) === -1) {
      currentTest.linkedCompetenceIds.push(label);
      if (!targetEx) count++;
    }
  });

  renderExerciseCards();
  renderTestCompetenceBadges();
  var targetName = targetEx ? ('"' + (targetEx.title || 'Exercise') + '"') : 'entire exam';
  if (window.showToast) {
    var msg = (typeof i18n !== 'undefined' && typeof i18n.tFmt === 'function')
      ? i18n.tFmt('tcClassObjectivesAttached', { count: list.length, target: targetName })
      : ('Attached ' + list.length + ' class objectives to ' + targetName);
    showToast(msg);
  }
};

// ── Multi-Unit Helpers & Reordering Handlers ──────────────────────────
window.tcParseUnitVal = function (val, defaultUnit) {
  if (typeof TestCreatorService !== 'undefined' && TestCreatorService.parseUnitValue) {
    return TestCreatorService.parseUnitValue(val, defaultUnit);
  }
  var num = parseFloat(val);
  var unit = String(val || '').replace(/^[0-9.-]+/, '').trim() || defaultUnit || 'px';
  return { value: isNaN(num) ? 0 : num, unit: unit, css: (isNaN(num) ? 0 : num) + unit };
};

window.tcBuildUnitInputHtml = function (currentVal, defaultUnit, allowedUnits, onchangeJs, inputAttrs) {
  var p = tcParseUnitVal(currentVal, defaultUnit);
  var units = allowedUnits || ['px', 'pt', 'cm', 'mm', 'em'];
  var idPfx = 'tcU_' + Math.random().toString(36).substr(2, 6);
  var attrStr = inputAttrs || '';
  return '<div class="tc-unit-input-wrap">' +
    '<input type="number" class="tc-unit-val" id="' + idPfx + '_val" value="' + p.value + '" ' + attrStr + ' onchange="' + onchangeJs.replace('__VAL__', '(this.value + document.getElementById(\'' + idPfx + '_sel\').value)') + '">' +
    '<select class="tc-unit-sel" id="' + idPfx + '_sel" onchange="' + onchangeJs.replace('__VAL__', '(document.getElementById(\'' + idPfx + '_val\').value + this.value)') + '">' +
    units.map(function (u) {
      return '<option value="' + u + '"' + (p.unit === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('') +
    '</select>' +
    '</div>';
};

window.tcMoveSubItem = function (exId, arrayProp, idx, dir) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var targetContainer = (ex.content && ex.content[arrayProp] !== undefined) ? ex.content :
                        (ex[arrayProp] !== undefined ? ex :
                        (ex.options && ex.options[arrayProp] !== undefined ? ex.options : null));
  if (!targetContainer || !Array.isArray(targetContainer[arrayProp])) return;
  var arr = targetContainer[arrayProp];
  var targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= arr.length) return;
  var item = arr.splice(idx, 1)[0];
  arr.splice(targetIdx, 0, item);
  renderExerciseCards();
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

window.tcMoveExerciseComponent = function (exId, idx, dir) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  if (!Array.isArray(o.componentOrder)) {
    o.componentOrder = ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'];
  }
  var arr = o.componentOrder;
  var target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  var item = arr.splice(idx, 1)[0];
  arr.splice(target, 0, item);
  renderExerciseCards();
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

// ── Exercise & Section Cards Rendering ───────────────────────────────
function renderExerciseCards() {
  var list = document.getElementById('exerciseCardsList');
  var badge = document.getElementById('exerciseCountBadge');
  var exs = currentTest.exercises || [];
  var regularCount = exs.filter(function (e) { return !e.type || (!e.type.startsWith('section_') && e.type !== 'custom_block'); }).length;
  var sectionCount = exs.length - regularCount;
  if (badge) {
    badge.textContent = regularCount + ' exercise' + (regularCount === 1 ? '' : 's') + (sectionCount > 0 ? ' (' + sectionCount + ' section block' + (sectionCount === 1 ? '' : 's') + ')' : '');
  }

  if (!exs.length) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:0.95rem;font-weight:700;">' +
      'No exercises yet. Click "+ Add Exercise" or choose a question type below to get started.' +
      '</div>';
    renderTestCompetenceBadges();
    if (typeof window.tcRenderTestCriteriaBar === 'function') window.tcRenderTestCriteriaBar();
    if (typeof window.tcRenderTestGradingScaleBar === 'function') window.tcRenderTestGradingScaleBar();
    return;
  }

  var exIndexCounter = 0;
  list.innerHTML = exs.map(function (ex, idx) {
    if (ex.type === 'section_competences') {
      return buildCompetencesSectionCardHtml(ex, idx);
    } else if (ex.type === 'section_criteria') {
      return buildCriteriaSectionCardHtml(ex, idx);
    } else if (ex.type === 'section_grading_scale') {
      return buildGradingScaleSectionCardHtml(ex, idx);
    } else if (ex.type === 'section_custom' || ex.type === 'custom_block') {
      return buildCustomSectionCardHtml(ex, idx);
    } else if (ex.type === 'section_lines') {
      return buildLinesSectionCardHtml(ex, idx);
    } else if (ex.type === 'section_pdf') {
      return buildPdfSectionCardHtml(ex, idx);
    } else {
      exIndexCounter++;
      return buildExerciseCardHtml(ex, idx, exIndexCounter);
    }
  }).join('');

  renderTestCompetenceBadges();
  if (typeof window.tcRenderTestCriteriaBar === 'function') window.tcRenderTestCriteriaBar();
  if (typeof window.tcRenderTestGradingScaleBar === 'function') window.tcRenderTestGradingScaleBar();
  if (typeof updateCompetenceTargetDropdown === 'function') updateCompetenceTargetDropdown();
  if (typeof updateCriteriaTargetDropdown === 'function') updateCriteriaTargetDropdown();
  if (typeof updateScaleTargetDropdown === 'function') updateScaleTargetDropdown();
}
window.tcRenderAllExercises = renderExerciseCards;

function buildCompetencesSectionCardHtml(ex, idx) {
  var isOpen = window._openOptionsExerciseIds && window._openOptionsExerciseIds.has(ex.id);
  var opts = TestCreatorService.ensureExerciseOptions(ex);
  var curMode = opts.displayMode || 'table';
  var curBg = opts.background || 'default';
  var curPad = opts.padding || 'standard';
  var curBorder = opts.border || 'solid';
  var curOrient = opts.pageOrientation || 'portrait';
  var curSepPage = !!(ex.forcePageBreak || opts.separatePage || curOrient === 'landscape');
  var rawComps = (Array.isArray(ex.linkedCompetences) && ex.linkedCompetences.length)
    ? ex.linkedCompetences
    : (Array.isArray(ex.linkedCompetenceIds) && ex.linkedCompetenceIds.length ? ex.linkedCompetenceIds : []);

  var previewContent = '';
  if (rawComps.length === 0) {
    previewContent = '<div style="font-size:0.8rem;color:#64748b;font-style:italic;padding:4px 0;">' +
      escapeHtml(i18n.t('tcNoCompetencesInBlock') || 'No objectives attached to this block yet. Click \'Open Drawer…\' to add competences.') +
      '</div>';
  } else {
    previewContent = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' +
      rawComps.map(function (c, cIdx) {
        var title = (c && c.title) || (c && c.code) || c;
        var desc = (c && (c.description || c.descriptors)) || '';
        return '<span style="background:#eff6ff;border:1.5px solid #2563eb;color:#1e40af;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:900;display:inline-flex;align-items:center;gap:6px;">' +
          '<span' + tcDetailTriggerAttr(c, ex.id, cIdx) + '>' + escapeHtml(title) + '</span>' +
          (desc && opts.showDescriptions !== false ? ' <span style="font-size:0.68rem;font-weight:700;color:#3b82f6;">[+desc]</span>' : '') +
          '<button type="button" class="neo-btn sm" style="padding:1px 5px;font-size:0.66rem;background:#fff;color:#1e40af;border-color:#2563eb;display:inline-flex;align-items:center;gap:3px;" onclick="tcOpenCompetenceLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcCompLayoutTooltip') || 'Customise competence table columns, orientation, and appearance') + '">' +
          '<img src="../assets/icons/layout.svg" style="width:11px;height:11px;" alt="">' + escapeHtml(i18n.t('tcLayoutBtn') || 'Layout') +
          '</button>' +
          ' <button type="button" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveCompFromSection(\'' + ex.id + '\', ' + cIdx + ')" title="Remove objective">&times;</button>' +
          '</span>';
      }).join('') +
      '</div>';
  }

  return '<div class="exercise-card-item section-card-blue" id="card-' + ex.id + '" data-index="' + idx + '" data-id="' + ex.id + '">' +
    '  <div class="exercise-card-header">' +
    '    <div class="card-header-left">' +
    '      <span class="card-drag-handle" title="Drag to reorder"><img class="tc-ico" src="../assets/icons/grip.svg" alt=""></span>' +
    '      <span class="card-type-badge badge-blue">' + (i18n.t('tcTypeSectionCompetences') || 'Competences Block') + '</span>' +
    '    </div>' +
    '    <div class="card-header-title-wrap">' +
    '      <input type="text" id="exTitle_' + ex.id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title || 'Curriculum Objectives & Competences') + '" placeholder="Section Title" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value)">' +
    '    </div>' +
    '    <div class="card-header-right">' +
    tcCardActionsHtml(ex, idx, isOpen) +
    '    </div>' +
    '  </div>' +
    '  <div class="card-body">' +
    '      <input type="text" id="exInstr_' + ex.id + '" class="instructions-input tc-fmt-field" value="' + escapeAttr(ex.instructions || '') + '" placeholder="Optional instructions or subtitle for this block" onchange="tcUpdateExField(\'' + ex.id + '\', \'instructions\', this.value)">' +
    '    <div class="section-block-preview">' +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;">' +
    '        <span style="font-size:0.75rem;font-weight:900;text-transform:uppercase;color:#1e40af;">' + (i18n.t('tcActiveCompetencesInBlock') || 'Curriculum objectives displayed by this block:') + '</span>' +
    '        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '          <button type="button" class="neo-btn sm" style="background:#eff6ff;color:#1e40af;border-color:#2563eb;font-size:0.75rem;padding:2px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenCompetenceLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcCompLayoutTooltip') || 'Customise competence table columns, orientation, and appearance') + '">' +
    '            <img src="../assets/icons/layout.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(i18n.t('tcRubricLayoutAppearance') || 'Layout & Appearance') +
    '          </button>' +
    '          <button type="button" class="neo-btn sm" style="background:#dbeafe;color:#1e40af;border-color:#2563eb;font-size:0.75rem;padding:2px 8px;" onclick="tcOpenCompetenceDrawerForSection(\'' + ex.id + '\')">' + (i18n.t('tcManageInDrawer') || 'Open Drawer…') + '</button>' +
    '        </div>' +
    '      </div>' +
    previewContent +
    '    </div>' +
    '    <div class="exercise-options-panel" id="optionsPanel_' + ex.id + '" style="display:' + (isOpen ? 'block' : 'none') + ';">' +
    tcStyleRowHtml(ex) +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-top:4px;flex-wrap:wrap;gap:6px;">' +
    '        <span style="font-size:0.78rem;font-weight:900;color:#1e40af;display:inline-flex;align-items:center;gap:5px;">' +
    '          <img src="../assets/icons/award.svg" style="width:14px;height:14px;" alt="">' +
    '          ' + escapeHtml(i18n.t('tcCompLayoutModalTitle') || 'Competences & Objectives Layout & Appearance') +
    '        </span>' +
    '        <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.74rem;background:#eff6ff;color:#1e40af;border-color:#2563eb;" onclick="tcOpenCompetenceLayoutModal(\'' + ex.id + '\')">' +
    '          ' + escapeHtml(i18n.t('tcOpenCompCustomizer') || 'Live Preview & Column Customizer…') +
    '        </button>' +
    '      </div>' +
    '      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;padding:4px 0 8px 0;">' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcCompHeadingLabel') || 'Competence Heading / Title:') + '</label>' +
    '          <input type="text" class="meta-input sm" style="width:100%;" placeholder="' + escapeAttr(ex.title || 'Competences & Curriculum Objectives') + '" value="' + escapeAttr(opts.compTitle || '') + '" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'compTitle\', this.value)">' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcSectionDisplayMode') || 'Display Mode:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'displayMode\', this.value)">' +
    '            <option value="table"' + (curMode === 'table' ? ' selected' : '') + '>' + (i18n.t('tcObjectivesTable') || 'Objectives Table') + '</option>' +
    '            <option value="badges"' + (curMode === 'badges' ? ' selected' : '') + '>' + (i18n.t('tcCurriculumBadges') || 'Curriculum Badges') + '</option>' +
    '            <option value="list"' + (curMode === 'list' ? ' selected' : '') + '>' + (i18n.t('tcBulletedList') || 'Bullet List') + '</option>' +
    '            <option value="compact"' + (curMode === 'compact' ? ' selected' : '') + '>' + (i18n.t('tcDisplayCompact') || 'Compact Summary') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricBg') || 'Container Background:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'background\', this.value)">' +
    '            <option value="default"' + (curBg === 'default' ? ' selected' : '') + '>' + (i18n.t('tcOptBgDefaultBlue') || 'Default (Soft Blue Tint)') + '</option>' +
    '            <option value="white"' + (curBg === 'white' ? ' selected' : '') + '>' + (i18n.t('tcOptBgWhite') || 'Crisp White') + '</option>' +
    '            <option value="ivory"' + (curBg === 'ivory' ? ' selected' : '') + '>' + (i18n.t('tcOptBgIvory') || 'Ivory Cream') + '</option>' +
    '            <option value="tint"' + (curBg === 'tint' ? ' selected' : '') + '>' + (i18n.t('tcOptBgSkyTint') || 'Sky Tint') + '</option>' +
    '            <option value="light_gray"' + (curBg === 'light_gray' ? ' selected' : '') + '>' + (i18n.t('tcOptBgLightGray') || 'Subtle Gray') + '</option>' +
    '            <option value="none"' + (curBg === 'none' ? ' selected' : '') + '>' + (i18n.t('tcOptBgNone') || 'None (Transparent)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricPadding') || 'Container Padding:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'padding\', this.value)">' +
    '            <option value="compact"' + (curPad === 'compact' ? ' selected' : '') + '>' + (i18n.t('tcOptPadCompact') || 'Compact (4px 8px)') + '</option>' +
    '            <option value="standard"' + (curPad === 'standard' ? ' selected' : '') + '>' + (i18n.t('tcOptPadStandard') || 'Standard (8px 14px)') + '</option>' +
    '            <option value="spacious"' + (curPad === 'spacious' ? ' selected' : '') + '>' + (i18n.t('tcOptPadSpacious') || 'Spacious (14px 18px)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricBorder') || 'Container Border:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'border\', this.value)">' +
    '            <option value="solid"' + (curBorder === 'solid' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderSolidBlue') || 'Solid (2px Blue)') + '</option>' +
    '            <option value="neobrutalist"' + (curBorder === 'neobrutalist' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderNeobrutalist') || 'Neobrutalist (Thick + Shadow)') + '</option>' +
    '            <option value="double"' + (curBorder === 'double' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderDouble') || 'Double Rule') + '</option>' +
    '            <option value="dashed"' + (curBorder === 'dashed' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderDashed') || 'Dashed Border') + '</option>' +
    '            <option value="minimal"' + (curBorder === 'minimal' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderMinimal') || 'Minimal (Top/Bottom only)') + '</option>' +
    '            <option value="none"' + (curBorder === 'none' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderNone') || 'None (Borderless)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcPageOrientationLabel') || 'Page Orientation:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'pageOrientation\', this.value)">' +
    '            <option value="portrait"' + (curOrient === 'portrait' ? ' selected' : '') + '>' + (i18n.t('tcOrientationPortrait') || 'Portrait (A4 Vertical)') + '</option>' +
    '            <option value="landscape"' + (curOrient === 'landscape' ? ' selected' : '') + '>' + (i18n.t('tcOrientationLandscape') || 'Landscape (A4 Horizontal)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '      </div>' +
    '      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:6px 0;border-top:1px dashed #cbd5e1;font-size:0.76rem;">' +
    '        <strong style="color:#1e40af;">' + (i18n.t('tcVisibleColumnsLabel') || 'Table Columns:') + '</strong>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showCodeCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showCodeCol\', this.checked)"><span>' + (i18n.t('tcColCompCode') || 'Code / Ref') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showTitleCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showTitleCol\', this.checked)"><span>' + (i18n.t('tcColCompTitle') || 'Objective / Title') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showDescriptions !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showDescriptions\', this.checked)"><span>' + (i18n.t('tcColCompDesc') || 'Descriptors') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showLevelCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showLevelCol\', this.checked)"><span>' + (i18n.t('tcColCompLevel') || 'Level') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showScoreCol ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showScoreCol\', this.checked)"><span>' + (i18n.t('tcColCompScore') || 'Mastery / Score') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showCommentsCol ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showCommentsCol\', this.checked)"><span>' + (i18n.t('tcColCritComments') || 'Feedback & Comments') + '</span></label>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="card-footer">' +
    '    <div class="card-toggles" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
    '      <label class="card-checkbox-label">' +
    '        <input type="checkbox" ' + (curSepPage ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'separatePage\', this.checked)">' +
    '        <span>' + (i18n.t('tcPrintCompOnSeparatePage') || 'Separate Page for Competences') + '</span>' +
    '      </label>' +
    '      <select class="meta-input sm" style="padding:1px 6px;font-size:0.74rem;width:auto;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'pageOrientation\', this.value)" title="Page Orientation">' +
    '        <option value="portrait"' + (curOrient === 'portrait' ? ' selected' : '') + '>' + (i18n.t('tcOrientationPortraitShort') || 'Portrait') + '</option>' +
    '        <option value="landscape"' + (curOrient === 'landscape' ? ' selected' : '') + '>' + (i18n.t('tcOrientationLandscapeShort') || 'Landscape') + '</option>' +
    '      </select>' +
    '    </div>' +
    '    <div style="display:flex;align-items:center;gap:6px;">' +
    '      <button type="button" class="neo-btn sm" style="background:#eff6ff;color:#1e40af;border-color:#2563eb;" onclick="tcOpenCompetenceDrawerForSection(\'' + ex.id + '\')" title="Attach curriculum competences from database">+ Competences</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

function buildCriteriaSectionCardHtml(ex, idx) {
  var isOpen = window._openOptionsExerciseIds && window._openOptionsExerciseIds.has(ex.id);
  var opts = TestCreatorService.ensureExerciseOptions(ex);
  var curMode = opts.displayMode || opts.rubricDisplayMode || 'matrix';
  var curBg = opts.background || opts.rubricBg || 'default';
  var curPad = opts.padding || opts.rubricPadding || 'standard';
  var curBorder = opts.border || opts.rubricBorder || 'solid';
  var curShowDesc = (opts.showDescriptions !== undefined) ? opts.showDescriptions : (opts.showRubricDescriptions !== false);
  var rawCrits = (Array.isArray(ex.criteria) && ex.criteria.length)
    ? ex.criteria
    : ((Array.isArray(ex.markingRubric) && ex.markingRubric.length) ? ex.markingRubric : ((Array.isArray(ex.linkedCriteria) && ex.linkedCriteria.length) ? ex.linkedCriteria : []));

  var critPts = TestCreatorService.calculateExercisePoints(ex, currentTest);
  if (rawCrits.length === 0 && currentTest) {
    var testLevelCrits = (Array.isArray(currentTest.criteria) && currentTest.criteria.length)
      ? currentTest.criteria
      : ((Array.isArray(currentTest.linkedCriteria) && currentTest.linkedCriteria.length) ? currentTest.linkedCriteria : []);
    if (testLevelCrits.length > 0) {
      rawCrits = testLevelCrits;
    }
  }

  var previewContent = '';
  if (rawCrits.length === 0) {
    previewContent = '<div style="font-size:0.8rem;color:#64748b;font-style:italic;padding:4px 0;">' +
      escapeHtml(i18n.t('tcNoCriteriaInBlock') || 'No assessment criteria attached to this block yet. Click \'Open Drawer…\' to attach rubrics.') +
      '</div>';
  } else {
    previewContent = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' +
      rawCrits.map(function (c, cIdx) {
        var title = (c && c.title) || (c && c.name) || (c && c.label) || 'Criterion';
        var pts = (c && c.points !== undefined) ? c.points : ((c && c.maxPoints !== undefined) ? c.maxPoints : '');
        var desc = (c && (c.description || c.descriptors)) || '';
        var lvlCount = (c && c.comments && typeof c.comments === 'object') ? Object.keys(c.comments).length : (c && Array.isArray(c.grades) ? c.grades.length : 0);
        var lvlInfo = lvlCount > 0 ? ' <span style="font-size:0.68rem;opacity:0.85;text-decoration:underline;cursor:pointer;" onclick="tcOpenRubricMatrixModal(\'' + ex.id + '\', ' + cIdx + ')">[' + lvlCount + ' levels]</span>' : '';
        return '<span style="background:#ecfdf5;border:1.5px solid #059669;color:#065f46;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:900;display:inline-flex;align-items:center;gap:6px;">' +
          '<span>' + escapeHtml(title) + (pts !== '' ? ' (/' + pts + ' pts)' : '') + lvlInfo + '</span>' +
          (desc && curShowDesc ? ' <span style="font-size:0.68rem;font-weight:700;color:#10b981;">[+desc]</span>' : '') +
          '<button type="button" class="neo-btn sm" style="padding:1px 5px;font-size:0.66rem;background:#d1fae5;color:#065f46;border-color:#059669;display:inline-flex;align-items:center;gap:3px;" onclick="tcOpenRubricMatrixModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcViewRubricMatrix') || 'View Rubric Matrix') + '">' +
          '<img src="../assets/icons/eye.svg" style="width:11px;height:11px;" alt="">' + escapeHtml(i18n.t('tcMatrixBtn') || 'Matrix') +
          '</button>' +
          '<button type="button" class="neo-btn sm" style="padding:1px 5px;font-size:0.66rem;background:#fff;color:#065f46;border-color:#059669;display:inline-flex;align-items:center;gap:3px;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcRubricLayoutTooltip') || 'Customise rubric layout, border, padding, and display mode') + '">' +
          '<img src="../assets/icons/layout.svg" style="width:11px;height:11px;" alt="">' + escapeHtml(i18n.t('tcLayoutBtn') || 'Layout') +
          '</button>' +
          ' <button type="button" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveCriterionFromSection(\'' + ex.id + '\', ' + cIdx + ')" title="Remove criterion">&times;</button>' +
          '</span>';
      }).join('') +
      '</div>';
  }

  return '<div class="exercise-card-item section-card-green" id="card-' + ex.id + '" data-index="' + idx + '" data-id="' + ex.id + '">' +
    '  <div class="exercise-card-header">' +
    '    <div class="card-header-left">' +
    '      <span class="card-drag-handle" title="Drag to reorder"><img class="tc-ico" src="../assets/icons/grip.svg" alt=""></span>' +
    '      <span class="card-type-badge badge-green">' + (i18n.t('tcTypeSectionCriteria') || 'Criteria Block') + '</span>' +
    '    </div>' +
    '    <div class="card-header-title-wrap">' +
    '      <input type="text" id="exTitle_' + ex.id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title || 'Assessment Criteria & Rubric') + '" placeholder="Section Title" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value)">' +
    '    </div>' +
    '    <div class="card-header-right">' +
    '      <div class="card-points-wrap">' +
    '        <span class="card-pts-label">PTS:</span>' +
    '        <input type="number" class="card-points-input" value="' + (critPts || ex.points || 0) + '" step="0.5" min="0"' + (TestCreatorService.isPointsFromRubric(ex) ? ' readonly tabindex="-1" title="' + escapeAttr(i18n.t('tcPointsFromRubric') || 'Points come from the attached rubric') + '"' : '') + ' onchange="tcUpdateExField(\'' + ex.id + '\', \'points\', Number(this.value)); updatePointsBadge();">' +
    '      </div>' +
    tcCardActionsHtml(ex, idx, isOpen) +
    '    </div>' +
    '  </div>' +
    '  <div class="card-body">' +
    '      <input type="text" id="exInstr_' + ex.id + '" class="instructions-input tc-fmt-field" value="' + escapeAttr(ex.instructions || '') + '" placeholder="Optional instructions or subtitle for this block" onchange="tcUpdateExField(\'' + ex.id + '\', \'instructions\', this.value)">' +
    '    <div class="section-block-preview">' +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;">' +
    '        <span style="font-size:0.75rem;font-weight:900;text-transform:uppercase;color:#065f46;">' + (i18n.t('tcActiveCriteriaInBlock') || 'Assessment criteria rubrics displayed by this block:') + '</span>' +
    '        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '          <button type="button" class="neo-btn sm" style="background:#ecfdf5;color:#065f46;border-color:#059669;font-size:0.75rem;padding:2px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcRubricLayoutTooltip') || 'Customise rubric layout, border, padding, and display mode') + '">' +
    '            <img src="../assets/icons/layout.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(i18n.t('tcRubricLayoutAppearance') || 'Layout & Appearance') +
    '          </button>' +
    '          <button type="button" class="neo-btn sm" style="background:#ecfdf5;color:#065f46;border-color:#059669;font-size:0.75rem;padding:2px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenRubricMatrixModal(\'' + ex.id + '\')">' +
    '            <img src="../assets/icons/eye.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(i18n.t('tcViewRubricMatrix') || 'View Rubric Matrix') +
    '          </button>' +
    '          <button type="button" class="neo-btn sm" style="background:#d1fae5;color:#065f46;border-color:#059669;font-size:0.75rem;padding:2px 8px;" onclick="tcOpenCriteriaDrawerForSection(\'' + ex.id + '\')">' + (i18n.t('tcManageInDrawer') || 'Open Drawer…') + '</button>' +
    '        </div>' +
    '      </div>' +
    previewContent +
    '    </div>' +
    '    <div class="exercise-options-panel" id="optionsPanel_' + ex.id + '" style="display:' + (isOpen ? 'block' : 'none') + ';">' +
    tcStyleRowHtml(ex) +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-top:4px;flex-wrap:wrap;gap:6px;">' +
    '        <span style="font-size:0.78rem;font-weight:900;color:#065f46;display:inline-flex;align-items:center;gap:5px;">' +
    '          <img src="../assets/icons/award.svg" style="width:14px;height:14px;" alt="">' +
    '          ' + escapeHtml(i18n.t('tcRubricLayoutAppearance') || 'Rubric Layout & Appearance') +
    '        </span>' +
    '        <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.74rem;background:#ecfdf5;color:#065f46;border-color:#059669;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')">' +
    '          ' + escapeHtml(i18n.t('tcOpenRubricCustomizer') || 'Live Preview & Customizer Modal…') +
    '        </button>' +
    '      </div>' +
    '      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;padding:4px 0 8px 0;">' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricHeadingLabel') || 'Rubric Heading / Title:') + '</label>' +
    '          <input type="text" class="meta-input sm" style="width:100%;" placeholder="' + escapeAttr(ex.title || (i18n.t('tcDefaultRubricTitle') || 'Assessment Criteria & Evaluation Rubric')) + '" value="' + escapeAttr(opts.rubricTitle || '') + '" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'rubricTitle\', this.value)">' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcSectionDisplayMode') || 'Display Mode:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'displayMode\', this.value)">' +
    '            <option value="matrix"' + (curMode === 'matrix' ? ' selected' : '') + '>' + (i18n.t('tcDisplayMatrix') || 'Full Rubric Matrix Grid') + '</option>' +
    '            <option value="table"' + (curMode === 'table' ? ' selected' : '') + '>' + (i18n.t('tcDisplayTable') || 'Summary Rubric Table') + '</option>' +
    '            <option value="badges"' + (curMode === 'badges' ? ' selected' : '') + '>' + (i18n.t('tcDisplayBadges') || 'Badges / Tags') + '</option>' +
    '            <option value="list"' + (curMode === 'list' ? ' selected' : '') + '>' + (i18n.t('tcDisplayList') || 'Bullet List') + '</option>' +
    '            <option value="compact"' + (curMode === 'compact' ? ' selected' : '') + '>' + (i18n.t('tcDisplayCompact') || 'Compact Summary') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricBg') || 'Container Background:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'background\', this.value)">' +
    '            <option value="default"' + (curBg === 'default' ? ' selected' : '') + '>' + (i18n.t('tcOptBgDefaultGreen') || 'Default (Soft Green Tint)') + '</option>' +
    '            <option value="white"' + (curBg === 'white' ? ' selected' : '') + '>' + (i18n.t('tcOptBgWhite') || 'Crisp White') + '</option>' +
    '            <option value="ivory"' + (curBg === 'ivory' ? ' selected' : '') + '>' + (i18n.t('tcOptBgIvory') || 'Ivory Cream') + '</option>' +
    '            <option value="amber"' + (curBg === 'amber' ? ' selected' : '') + '>' + (i18n.t('tcOptBgAmber') || 'Warm Amber') + '</option>' +
    '            <option value="light_gray"' + (curBg === 'light_gray' ? ' selected' : '') + '>' + (i18n.t('tcOptBgLightGray') || 'Subtle Gray') + '</option>' +
    '            <option value="none"' + (curBg === 'none' ? ' selected' : '') + '>' + (i18n.t('tcOptBgNone') || 'None (Transparent)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricPadding') || 'Container Padding:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'padding\', this.value)">' +
    '            <option value="compact"' + (curPad === 'compact' ? ' selected' : '') + '>' + (i18n.t('tcOptPadCompact') || 'Compact (4px 8px)') + '</option>' +
    '            <option value="standard"' + (curPad === 'standard' ? ' selected' : '') + '>' + (i18n.t('tcOptPadStandard') || 'Standard (8px 14px)') + '</option>' +
    '            <option value="spacious"' + (curPad === 'spacious' ? ' selected' : '') + '>' + (i18n.t('tcOptPadSpacious') || 'Spacious (14px 18px)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcRubricBorder') || 'Container Border:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'border\', this.value)">' +
    '            <option value="solid"' + (curBorder === 'solid' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderSolid') || 'Solid (2px Green / Charcoal)') + '</option>' +
    '            <option value="neobrutalist"' + (curBorder === 'neobrutalist' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderNeobrutalist') || 'Neobrutalist (Thick + Shadow)') + '</option>' +
    '            <option value="double"' + (curBorder === 'double' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderDouble') || 'Double Rule') + '</option>' +
    '            <option value="dashed"' + (curBorder === 'dashed' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderDashed') || 'Dashed Border') + '</option>' +
    '            <option value="minimal"' + (curBorder === 'minimal' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderMinimal') || 'Minimal (Top/Bottom only)') + '</option>' +
    '            <option value="none"' + (curBorder === 'none' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderNone') || 'None (Borderless)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">' + (i18n.t('tcPageOrientationLabel') || 'Page Orientation:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'pageOrientation\', this.value)">' +
    '            <option value="portrait"' + ((opts.pageOrientation || opts.rubricPageOrientation || 'portrait') === 'portrait' ? ' selected' : '') + '>' + (i18n.t('tcOrientationPortrait') || 'Portrait (A4 Vertical)') + '</option>' +
    '            <option value="landscape"' + ((opts.pageOrientation || opts.rubricPageOrientation || 'portrait') === 'landscape' ? ' selected' : '') + '>' + (i18n.t('tcOrientationLandscape') || 'Landscape (A4 Horizontal)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '      </div>' +
    '      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:6px 0;border-top:1px dashed #cbd5e1;font-size:0.76rem;">' +
    '        <strong style="color:#065f46;">' + (i18n.t('tcVisibleColumnsLabel') || 'Table Columns:') + '</strong>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showCriterionCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showCriterionCol\', this.checked)"><span>' + (i18n.t('tcColCritName') || 'Criterion Name') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showLevelsCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showLevelsCol\', this.checked)"><span>' + (i18n.t('tcColCritLevels') || 'Grade Levels') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (curShowDesc ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showDescriptions\', this.checked)"><span>' + (i18n.t('tcColCritDesc') || 'Descriptors & Comments') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showMaxCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showMaxCol\', this.checked)"><span>' + (i18n.t('tcColCritMax') || 'Max Points') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showScoreCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showScoreCol\', this.checked)"><span>' + (i18n.t('tcColCritScore') || 'Score Box') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showCommentsCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showCommentsCol\', this.checked)"><span>' + (i18n.t('tcColCritComments') || 'Feedback & Comments') + '</span></label>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="card-footer">' +
    '    <div class="card-toggles" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
    '      <label class="card-checkbox-label">' +
    '        <input type="checkbox" ' + ((ex.forcePageBreak || opts.separatePage || opts.rubricSeparatePage || (opts.pageOrientation || opts.rubricPageOrientation) === 'landscape') ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'separatePage\', this.checked)">' +
    '        <span>' + (i18n.t('tcPrintCriteriaOnSeparatePage') || 'Separate Page for Criteria') + '</span>' +
    '      </label>' +
    '      <select class="meta-input sm" style="padding:1px 6px;font-size:0.74rem;width:auto;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'pageOrientation\', this.value)" title="Page Orientation">' +
    '        <option value="portrait"' + ((opts.pageOrientation || opts.rubricPageOrientation || 'portrait') === 'portrait' ? ' selected' : '') + '>' + (i18n.t('tcOrientationPortraitShort') || 'Portrait') + '</option>' +
    '        <option value="landscape"' + ((opts.pageOrientation || opts.rubricPageOrientation || 'portrait') === 'landscape' ? ' selected' : '') + '>' + (i18n.t('tcOrientationLandscapeShort') || 'Landscape') + '</option>' +
    '      </select>' +
    '    </div>' +
    '    <div style="display:flex;align-items:center;gap:6px;">' +
    '      <button type="button" class="neo-btn sm" style="background:#ecfdf5;color:#065f46;border-color:#059669;" onclick="tcOpenCriteriaDrawerForSection(\'' + ex.id + '\')" title="Attach scoring rubric criteria from database">+ Rubric Criteria</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

function buildGradingScaleSectionCardHtml(ex, idx) {
  var isOpen = window._openOptionsExerciseIds && window._openOptionsExerciseIds.has(ex.id);
  var opts = TestCreatorService.ensureExerciseOptions(ex);
  var curMode = opts.displayMode || 'table';
  var curBg = opts.background || 'default';
  var curPad = opts.padding || 'standard';
  var curBorder = opts.border || 'solid';
  var curOrient = opts.pageOrientation || 'portrait';
  var curSepPage = !!(ex.forcePageBreak || opts.separatePage || curOrient === 'landscape');

  var scaleId = currentTest.scaleModelId;
  var model = currentTest.scaleModel;
  if (!model && scaleId && scaleId !== 'none' && typeof tcFindScaleModel === 'function') {
    var resolved = tcFindScaleModel(scaleId);
    if (resolved) {
      model = resolved.model;
    }
  }

  var previewContent = '';
  if (!model || scaleId === 'none') {
    previewContent = '<div style="font-size:0.8rem;color:#64748b;font-style:italic;padding:4px 0;">' +
      escapeHtml(i18n.t('tcNoScaleActive') || 'No grading scale assigned to this test yet. Open Grading Scales in drawer to pick a model.') +
      '</div>';
  } else {
    var totalPoints = TestCreatorService.calculateTotalTestPoints(currentTest);
    var convTable = TestCreatorService.calculateGradeConversionTable(model, totalPoints);
    if (convTable && convTable.intervals && convTable.intervals.length > 0) {
      var showG = opts.showGradeCol !== false;
      var showT = opts.showThresholdCol !== false;
      var showP = opts.showPointsCol !== false;
      var showN = opts.showNotesCol !== false;
      if (!showG && !showT && !showP && !showN) { showG = true; showP = true; }

      var modeLabel = (curMode === 'inline' || curMode === 'inline_grades')
        ? (i18n.t('tcDisplayInlineGrades') || 'Inline Grades')
        : (curMode === 'compact' ? (i18n.t('tcDisplayCompact') || 'Compact Summary') : (i18n.t('tcDisplayTable') || 'Table / Grid'));

      var modeBadge = '<span style="font-size:0.7rem;background:#fef3c7;border:1.5px solid #d97706;color:#92400e;padding:2px 7px;border-radius:4px;font-weight:900;display:inline-flex;align-items:center;gap:3px;">' +
        '<span>' + escapeHtml(modeLabel) + '</span>' +
        '</span>';

      if (curMode === 'inline' || curMode === 'inline_grades') {
        var inlineItems = TestCreatorService.buildInlineGradeItems(convTable, totalPoints, true, {
          showGradeCol: showG,
          showThresholdCol: showT,
          showPointsCol: showP,
          showNotesCol: showN
        });
        previewContent = '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:0.75rem;">' +
          modeBadge +
          (inlineItems.length ? inlineItems.join('<span style="color:#b45309;font-weight:700;"> · </span>') : escapeHtml(model.name || 'Scale')) +
          '</div>';
      } else if (curMode === 'compact') {
        previewContent = '<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;">' +
          modeBadge +
          convTable.intervals.map(function (it) {
            var parts = [];
            if (showG) parts.push('<strong>' + escapeHtml(it.grade) + '</strong>');
            if (showP) parts.push(it.minPoints + '–' + it.maxPoints + ' pts');
            if (showT) parts.push('<span style="font-size:0.68rem;color:#b45309;font-weight:700;">(≥' + it.pct + '%)</span>');
            if (showN && it.desc) parts.push('<span style="font-size:0.68rem;opacity:0.85;">[' + escapeHtml(it.desc) + ']</span>');
            if (!parts.length) parts.push('<strong>' + escapeHtml(it.grade) + '</strong>: ' + it.minPoints + ' pts');
            return '<span style="background:#fff;border:1.5px solid #d97706;color:#92400e;font-size:0.75rem;padding:2px 7px;border-radius:4px;font-weight:800;display:inline-flex;align-items:center;gap:4px;">' +
              parts.join(' ') +
              '</span>';
          }).join('') +
          '</div>';
      } else {
        previewContent = '<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;">' +
          modeBadge +
          convTable.intervals.map(function (it) {
            var parts = [];
            if (showG) parts.push('<strong>' + escapeHtml(it.grade) + '</strong>');
            if (showP) parts.push(it.minPoints + '–' + it.maxPoints + ' pts');
            if (showT) parts.push('<span style="font-size:0.68rem;color:#b45309;font-weight:700;">(≥' + it.pct + '%)</span>');
            if (showN && it.desc) parts.push('<span style="font-size:0.68rem;opacity:0.85;">[' + escapeHtml(it.desc) + ']</span>');
            if (!parts.length) parts.push('<strong>' + escapeHtml(it.grade) + '</strong>: ' + it.minPoints + ' pts');
            return '<span style="background:#fff;border:1.5px solid #d97706;color:#92400e;font-size:0.75rem;padding:2px 7px;border-radius:4px;font-weight:800;display:inline-flex;align-items:center;gap:4px;">' +
              parts.join(': ') +
              '</span>';
          }).join('') +
          '</div>';
      }
    } else {
      previewContent = '<div style="font-size:0.75rem;color:#92400e;font-weight:700;">' +
        escapeHtml(model.name || model.title || 'Grading Scale Active') +
        '</div>';
    }
  }

  return '<div class="exercise-card-item section-card-amber" id="card-' + ex.id + '" data-index="' + idx + '" data-id="' + ex.id + '">' +
    '  <div class="exercise-card-header">' +
    '    <div class="card-header-left">' +
    '      <span class="card-drag-handle" title="Drag to reorder"><img class="tc-ico" src="../assets/icons/grip.svg" alt=""></span>' +
    '      <span class="card-type-badge badge-amber">' + (i18n.t('tcTypeSectionGradingScale') || 'Grading Scale Block') + '</span>' +
    '    </div>' +
    '    <div class="card-header-title-wrap">' +
    '      <input type="text" id="exTitle_' + ex.id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title || 'Grading Scale & Conversion Table') + '" placeholder="Section Title" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value); tcUpdateExOptionField(\'' + ex.id + '\', \'scaleTitle\', this.value);">' +
    '    </div>' +
    '    <div class="card-header-right">' +
    tcCardActionsHtml(ex, idx, isOpen) +
    '    </div>' +
    '  </div>' +
    '  <div class="card-body">' +
    '      <input type="text" id="exInstr_' + ex.id + '" class="instructions-input tc-fmt-field" value="' + escapeAttr(ex.instructions || '') + '" placeholder="Optional instructions or subtitle for this block" onchange="tcUpdateExField(\'' + ex.id + '\', \'instructions\', this.value)">' +
    '    <div class="section-block-preview">' +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;">' +
    '        <span style="font-size:0.75rem;font-weight:900;text-transform:uppercase;color:#92400e;">' + (i18n.t('tcActiveScaleInBlock') || 'Active grading scale conversion table:') + '</span>' +
    '        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '          <button type="button" class="neo-btn sm" style="background:#fef3c7;color:#92400e;border-color:#d97706;font-size:0.75rem;padding:2px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenScaleLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcScaleLayoutTooltip') || 'Customise grading scale layout, columns, border, and display mode') + '">' +
    '            <img src="../assets/icons/layout.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(i18n.t('tcScaleLayoutAppearance') || 'Layout & Appearance') +
    '          </button>' +
    '          <button type="button" class="neo-btn sm" style="background:#fde68a;color:#92400e;border-color:#d97706;font-size:0.75rem;padding:2px 8px;" onclick="tcOpenScalesDrawerForSection(\'' + ex.id + '\')">' + (i18n.t('tcManageInDrawer') || 'Open Drawer…') + '</button>' +
    '        </div>' +
    '      </div>' +
    previewContent +
    '    </div>' +
    '    <div class="exercise-options-panel" id="optionsPanel_' + ex.id + '" style="display:' + (isOpen ? 'block' : 'none') + ';">' +
    tcStyleRowHtml(ex) +
    '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-top:4px;flex-wrap:wrap;gap:6px;">' +
    '        <span style="font-size:0.78rem;font-weight:900;color:#92400e;display:inline-flex;align-items:center;gap:5px;">' +
    '          <img src="../assets/icons/layout.svg" style="width:14px;height:14px;" alt="">' +
    '          ' + escapeHtml(i18n.t('tcScaleLayoutAppearance') || 'Grading Scale Layout & Appearance') +
    '        </span>' +
    '        <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.74rem;background:#fef3c7;color:#92400e;border-color:#d97706;" onclick="tcOpenScaleLayoutModal(\'' + ex.id + '\')">' +
    '          ' + escapeHtml(i18n.t('tcOpenScaleCustomizer') || 'Live Preview & Column Customizer…') +
    '        </button>' +
    '      </div>' +
    '      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;padding:4px 0 8px 0;">' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;color:#92400e;">' + (i18n.t('tcScaleHeadingLabel') || 'Scale Heading / Title:') + '</label>' +
    '          <input type="text" class="meta-input sm" style="width:100%;" placeholder="' + escapeAttr(ex.title || 'Grading Scale & Score Conversion') + '" value="' + escapeAttr(opts.scaleTitle || '') + '" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value); tcUpdateExOptionField(\'' + ex.id + '\', \'scaleTitle\', this.value);">' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;color:#92400e;">' + (i18n.t('tcSectionDisplayMode') || 'Display Mode:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'displayMode\', this.value)">' +
    '            <option value="table"' + (curMode === 'table' ? ' selected' : '') + '>' + (i18n.t('tcDisplayTable') || 'Table / Grid') + '</option>' +
    '            <option value="inline"' + (curMode === 'inline' || curMode === 'inline_grades' ? ' selected' : '') + '>' + (i18n.t('tcDisplayInlineGrades') || 'Inline Grades') + '</option>' +
    '            <option value="compact"' + (curMode === 'compact' ? ' selected' : '') + '>' + (i18n.t('tcDisplayCompact') || 'Compact Summary') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;color:#92400e;">' + (i18n.t('tcScaleBg') || 'Container Background:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'background\', this.value)">' +
    '            <option value="default"' + (curBg === 'default' ? ' selected' : '') + '>' + (i18n.t('tcOptBgDefaultAmber') || 'Default (Warm Amber Tint)') + '</option>' +
    '            <option value="white"' + (curBg === 'white' ? ' selected' : '') + '>' + (i18n.t('tcOptBgWhite') || 'Crisp White') + '</option>' +
    '            <option value="ivory"' + (curBg === 'ivory' ? ' selected' : '') + '>' + (i18n.t('tcOptBgIvory') || 'Ivory Cream') + '</option>' +
    '            <option value="amber"' + (curBg === 'amber' ? ' selected' : '') + '>' + (i18n.t('tcOptBgAmber') || 'Warm Amber') + '</option>' +
    '            <option value="light_gray"' + (curBg === 'light_gray' ? ' selected' : '') + '>' + (i18n.t('tcOptBgLightGray') || 'Subtle Gray') + '</option>' +
    '            <option value="none"' + (curBg === 'none' ? ' selected' : '') + '>' + (i18n.t('tcOptBgNone') || 'None (Transparent)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;color:#92400e;">' + (i18n.t('tcScalePadding') || 'Container Padding:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'padding\', this.value)">' +
    '            <option value="compact"' + (curPad === 'compact' ? ' selected' : '') + '>' + (i18n.t('tcOptPadCompact') || 'Compact (4px 8px)') + '</option>' +
    '            <option value="standard"' + (curPad === 'standard' ? ' selected' : '') + '>' + (i18n.t('tcOptPadStandard') || 'Standard (8px 14px)') + '</option>' +
    '            <option value="spacious"' + (curPad === 'spacious' ? ' selected' : '') + '>' + (i18n.t('tcOptPadSpacious') || 'Spacious (14px 18px)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;color:#92400e;">' + (i18n.t('tcScaleBorder') || 'Container Border:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'border\', this.value)">' +
    '            <option value="solid"' + (curBorder === 'solid' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderSolid') || 'Solid (2px Amber / Charcoal)') + '</option>' +
    '            <option value="neobrutalist"' + (curBorder === 'neobrutalist' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderNeobrutalist') || 'Neobrutalist (Thick + Shadow)') + '</option>' +
    '            <option value="double"' + (curBorder === 'double' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderDouble') || 'Double Rule') + '</option>' +
    '            <option value="dashed"' + (curBorder === 'dashed' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderDashed') || 'Dashed Border') + '</option>' +
    '            <option value="minimal"' + (curBorder === 'minimal' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderMinimal') || 'Minimal (Top/Bottom only)') + '</option>' +
    '            <option value="none"' + (curBorder === 'none' ? ' selected' : '') + '>' + (i18n.t('tcOptBorderNone') || 'None (Borderless)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;color:#92400e;">' + (i18n.t('tcPageOrientationLabel') || 'Page Orientation:') + '</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'pageOrientation\', this.value)">' +
    '            <option value="portrait"' + (curOrient === 'portrait' ? ' selected' : '') + '>' + (i18n.t('tcOrientationPortrait') || 'Portrait (A4 Vertical)') + '</option>' +
    '            <option value="landscape"' + (curOrient === 'landscape' ? ' selected' : '') + '>' + (i18n.t('tcOrientationLandscape') || 'Landscape (A4 Horizontal)') + '</option>' +
    '          </select>' +
    '        </div>' +
    '      </div>' +
    '      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:6px 0;border-top:1px dashed #cbd5e1;font-size:0.76rem;">' +
    '        <strong style="color:#92400e;">' + (i18n.t('tcVisibleColumnsLabel') || 'Table Columns:') + '</strong>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showGradeCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showGradeCol\', this.checked)"><span>' + (i18n.t('tcColScaleGrade') || 'Grade / Mark') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showThresholdCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showThresholdCol\', this.checked)"><span>' + (i18n.t('tcColScaleThreshold') || 'Threshold (%)') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showPointsCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showPointsCol\', this.checked)"><span>' + (i18n.t('tcColScalePoints') || 'Required Score') + '</span></label>' +
    '        <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (opts.showNotesCol !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showNotesCol\', this.checked)"><span>' + (i18n.t('tcColScaleNotes') || 'Evaluation / Notes') + '</span></label>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="card-footer">' +
    '    <div class="card-toggles" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
    '      <label class="card-checkbox-label">' +
    '        <input type="checkbox" ' + (curSepPage ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'separatePage\', this.checked)">' +
    '        <span>' + (i18n.t('tcPrintScaleOnSeparatePage') || 'Separate Page for Grading Scale') + '</span>' +
    '      </label>' +
    '      <select class="meta-input sm" style="padding:1px 6px;font-size:0.74rem;width:auto;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'pageOrientation\', this.value)" title="Page Orientation">' +
    '        <option value="portrait"' + (curOrient === 'portrait' ? ' selected' : '') + '>' + (i18n.t('tcOrientationPortraitShort') || 'Portrait') + '</option>' +
    '        <option value="landscape"' + (curOrient === 'landscape' ? ' selected' : '') + '>' + (i18n.t('tcOrientationLandscapeShort') || 'Landscape') + '</option>' +
    '      </select>' +
    '    </div>' +
    '    <div style="display:flex;align-items:center;gap:6px;">' +
    '      <button type="button" class="neo-btn sm" style="background:#fef3c7;color:#92400e;border-color:#d97706;" onclick="tcOpenScalesDrawerForSection(\'' + ex.id + '\')" title="Choose scale model from drawer">+ Scale Model</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

function buildLinesSectionCardHtml(ex, idx) {
  var c = ex.content || {};
  var mode = c.lineMode || 'lines';
  var count = Math.max(1, Math.min(500, parseInt(c.lineCount, 10) || 6));
  var pageCount = Math.max(1, Math.min(20, parseInt(c.pageCount, 10) || 1));
  var style = c.lineStyle || 'solid';
  var spacing = c.lineSpacing || 'standard';
  var curHeight = c.lineHeight || (spacing === 'compact' ? '20px' : (spacing === 'wide' ? '38px' : '28px'));
  var numbered = !!c.numberedLines;
  var T = function (k, d) { return escapeHtml(i18n.t(k) || d); };

  return '<div class="exercise-card-item" id="card-' + ex.id + '" data-index="' + idx + '" data-id="' + ex.id + '">' +
    '  <div class="exercise-card-header">' +
    '    <div class="card-header-left">' +
    '      <span class="card-drag-handle" title="Drag to reorder"><img class="tc-ico" src="../assets/icons/grip.svg" alt=""></span>' +
    '      <span class="card-type-badge">' + T('tcBtnLineBlock', 'Line Block') + '</span>' +
    '    </div>' +
    '    <div class="card-header-title-wrap">' +
    '      <input type="text" id="exTitle_' + ex.id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title || '') + '" placeholder="' + T('tcLineBlockLabelPlaceholder', 'Optional header / prompt (leave blank for lines only)') + '" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value)">' +
    '    </div>' +
    '    <div class="card-header-right">' +
    tcCardActionsHtml(ex, idx, null) +
    '    </div>' +
    '  </div>' +
    '  <div class="card-body">' +
    '    <div class="tc-line-block-controls">' +
    '      <label class="tc-lb-field">' +
    '        <span>' + T('tcLineModeLabel', 'Mode:') + '</span>' +
    '        <select class="meta-select sm" onchange="tcUpdateLinesSectionField(\'' + ex.id + '\', \'lineMode\', this.value)">' +
    '          <option value="lines"' + (mode === 'lines' ? ' selected' : '') + '>' + T('tcLineModeLines', 'Number of lines') + '</option>' +
    '          <option value="pages"' + (mode === 'pages' ? ' selected' : '') + '>' + T('tcLineModePages', 'Complete pages') + '</option>' +
    '        </select>' +
    '      </label>' +
    (mode === 'pages'
      ? ('      <label class="tc-lb-field"><span>' + T('tcPageCountLabel', 'Pages:') + '</span>' +
         '        <input type="number" class="meta-input sm" min="1" max="20" value="' + pageCount + '" style="width:68px;" onchange="tcUpdateLinesSectionField(\'' + ex.id + '\', \'pageCount\', Math.max(1, Math.min(20, Number(this.value) || 1)))">' +
         '      </label>')
      : ('      <label class="tc-lb-field"><span>' + T('tcLineCountLabel', 'Lines:') + '</span>' +
         '        <input type="number" class="meta-input sm" min="1" max="500" value="' + count + '" style="width:68px;" onchange="tcUpdateLinesSectionField(\'' + ex.id + '\', \'lineCount\', Math.max(1, Math.min(500, Number(this.value) || 1)))">' +
         '      </label>')) +
    '      <label class="tc-lb-field">' +
    '        <span>' + T('tcLineStyleLabel', 'Style:') + '</span>' +
    '        <select class="meta-select sm" onchange="tcUpdateLinesSectionField(\'' + ex.id + '\', \'lineStyle\', this.value)">' +
    '          <option value="solid"' + (style === 'solid' ? ' selected' : '') + '>' + T('tcLineSolid', 'Solid') + '</option>' +
    '          <option value="dashed"' + (style === 'dashed' ? ' selected' : '') + '>' + T('tcLineDashed', 'Dashed') + '</option>' +
    '          <option value="dotted"' + (style === 'dotted' ? ' selected' : '') + '>' + T('tcLineDotted', 'Dotted') + '</option>' +
    '          <option value="grid"' + (style === 'grid' ? ' selected' : '') + '>' + T('tcLineGrid', 'Grid') + '</option>' +
    '        </select>' +
    '      </label>' +
    '      <div class="tc-lb-field">' +
    '        <span>' + T('tcLineSizeLabel', 'Size:') + '</span>' +
    tcBuildUnitInputHtml(curHeight, 'px', ['px', 'pt', 'cm'], 'tcUpdateLinesSectionField(\'' + ex.id + '\', \'lineHeight\', __VAL__)') +
    '      </div>' +
    '      <div class="tc-lb-field">' +
    '        <span>' + T('tcLineThicknessLabel', 'Thickness:') + '</span>' +
    tcBuildUnitInputHtml(c.lineThickness || '1px', 'px', ['px', 'pt', 'mm'], 'tcUpdateLinesSectionField(\'' + ex.id + '\', \'lineThickness\', __VAL__)') +
    '      </div>' +
    '      <label class="tc-lb-field">' +
    '        <span>' + T('tcLineColorLabel', 'Colour:') + '</span>' +
    '        <input type="color" data-color-css="' + escapeAttr(c.lineColor || '#94a3b8') + '" value="' + escapeAttr(c.lineColor || '#94a3b8') + '" style="width:28px;height:24px;padding:1px;border:1.5px solid #333;border-radius:4px;cursor:pointer;" onchange="tcUpdateLinesSectionField(\'' + ex.id + '\', \'lineColor\', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value)">' +
    '      </label>' +
    '      <label class="card-checkbox-label">' +
    '        <input type="checkbox"' + (numbered ? ' checked' : '') + ' onchange="tcUpdateLinesSectionField(\'' + ex.id + '\', \'numberedLines\', this.checked)">' +
    '        <span>' + T('tcLineNumbersToggle', 'Line numbers') + '</span>' +
    '      </label>' +
    '      <label class="card-checkbox-label">' +
    '        <input type="checkbox"' + (ex.forcePageBreak ? ' checked' : '') + ' onchange="tcUpdateExField(\'' + ex.id + '\', \'forcePageBreak\', this.checked)">' +
    '        <span>' + T('tcForcePageBreak', 'Page break before') + '</span>' +
    '      </label>' +
    '      <div class="tc-lb-field">' +
    '        <span>' + T('tcCardMarginTopShort', 'Margin Top:') + '</span>' +
    tcBuildUnitInputHtml((ex.exportStyle && ex.exportStyle.marginTop) || '', 'px', ['px', 'pt', 'cm'], 'tcUpdateExExportMargin(\'' + ex.id + '\', \'marginTop\', __VAL__)') +
    '      </div>' +
    '      <div class="tc-lb-field">' +
    '        <span>' + T('tcCardMarginRightShort', 'Margin Right:') + '</span>' +
    tcBuildUnitInputHtml((ex.exportStyle && ex.exportStyle.marginRight) || '', 'px', ['px', 'pt', 'cm'], 'tcUpdateExExportMargin(\'' + ex.id + '\', \'marginRight\', __VAL__)') +
    '      </div>' +
    '      <div class="tc-lb-field">' +
    '        <span>' + T('tcCardMarginBottomShort', 'Margin Bottom:') + '</span>' +
    tcBuildUnitInputHtml((ex.exportStyle && ex.exportStyle.marginBottom) || '', 'px', ['px', 'pt', 'cm'], 'tcUpdateExExportMargin(\'' + ex.id + '\', \'marginBottom\', __VAL__)') +
    '      </div>' +
    '      <div class="tc-lb-field">' +
    '        <span>' + T('tcCardMarginLeftShort', 'Margin Left:') + '</span>' +
    tcBuildUnitInputHtml((ex.exportStyle && ex.exportStyle.marginLeft) || '', 'px', ['px', 'pt', 'cm'], 'tcUpdateExExportMargin(\'' + ex.id + '\', \'marginLeft\', __VAL__)') +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

window.tcUpdateExExportMargin = function (exId, prop, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.exportStyle) ex.exportStyle = {};
  if (val === '' || val === null || val === undefined || /^(px|pt|cm)$/i.test(String(val).trim())) {
    delete ex.exportStyle[prop];
    if (!Object.keys(ex.exportStyle).length) delete ex.exportStyle;
  } else {
    ex.exportStyle[prop] = val;
  }
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

window.tcUpdateLinesSectionField = function (exId, field, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.content) ex.content = {};
  ex.content[field] = value;
  if (field === 'lineMode') renderExerciseCards();
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

function buildCustomSectionCardHtml(ex, idx) {
  var isOpen = window._openOptionsExerciseIds && window._openOptionsExerciseIds.has(ex.id);
  var opts = ex.options || {};
  var content = ex.content || {};
  var mode = content.mode || 'wysiwyg';
  var htmlContent = content.html || '';
  var isWysiwyg = (mode === 'wysiwyg');

  return '<div class="exercise-card-item section-card-purple" id="card-' + ex.id + '" data-index="' + idx + '" data-id="' + ex.id + '">' +
    '  <div class="exercise-card-header">' +
    '    <div class="card-header-left">' +
    '      <span class="card-drag-handle" title="Drag to reorder"><img class="tc-ico" src="../assets/icons/grip.svg" alt=""></span>' +
    '      <span class="card-type-badge badge-purple">' + (i18n.t('tcTypeSectionCustom') || 'Custom Block') + '</span>' +
    '    </div>' +
    '    <div class="card-header-title-wrap">' +
    '      <input type="text" id="exTitle_' + ex.id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title || 'Custom Block') + '" placeholder="Custom Block Title" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value)">' +
    '    </div>' +
    '    <div class="card-header-right">' +
    '      <div class="card-points-wrap">' +
    '        <span class="card-pts-label">PTS:</span>' +
    '        <input type="number" class="card-points-input" value="' + (ex.points || 0) + '" step="0.5" min="0" onchange="tcUpdateExField(\'' + ex.id + '\', \'points\', Number(this.value)); updatePointsBadge();">' +
    '      </div>' +
    tcCardActionsHtml(ex, idx, isOpen) +
    '    </div>' +
    '  </div>' +
    '  <div class="card-body">' +
    '      <input type="text" id="exInstr_' + ex.id + '" class="instructions-input tc-fmt-field" value="' + escapeAttr(ex.instructions || '') + '" placeholder="Optional instructions or subtitle for this block" onchange="tcUpdateExField(\'' + ex.id + '\', \'instructions\', this.value)">' +
    '    <!-- Mode Selector: WYSIWYG vs Pure HTML -->' +
    '    <div class="tc-custom-mode-bar">' +
    '      <div class="tc-custom-mode-pills">' +
    '        <button type="button" class="tc-mode-btn' + (isWysiwyg ? ' active' : '') + '" id="modeBtnWysiwyg_' + ex.id + '" onclick="tcSetCustomBlockMode(\'' + ex.id + '\', \'wysiwyg\')">' +
    '          <img src="../assets/icons/layout.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /> <span data-i18n="tcCustomModeWysiwyg">' + (i18n.t('tcCustomModeWysiwyg') || 'WYSIWYG') + '</span>' +
    '        </button>' +
    '        <button type="button" class="tc-mode-btn' + (!isWysiwyg ? ' active' : '') + '" id="modeBtnHtml_' + ex.id + '" onclick="tcSetCustomBlockMode(\'' + ex.id + '\', \'html\')">' +
    '          <img src="../assets/icons/document-editor.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /> <span data-i18n="tcCustomModeHtml">' + (i18n.t('tcCustomModeHtml') || 'Pure HTML') + '</span>' +
    '        </button>' +
    '      </div>' +
    '      <span class="tc-custom-mode-hint" id="modeHint_' + ex.id + '">' + (isWysiwyg ? (i18n.t('tcCustomModeWysiwyg') || 'WYSIWYG Visual Editor') : (i18n.t('tcCustomModeHtml') || 'Pure HTML Code Editor')) + '</span>' +
    '    </div>' +
    '    <!-- WYSIWYG Editor View -->' +
    '    <div class="tc-wysiwyg-container" id="wysiwygWrap_' + ex.id + '" style="display:' + (isWysiwyg ? 'block' : 'none') + ';">' +
    '      <div class="tc-wysiwyg-toolbar">' +
    '        <div class="tc-wysiwyg-toolbar-grp">' +
    '          <select class="tc-wysiwyg-select" onchange="tcCustomWysiwygFormatBlock(\'' + ex.id + '\', this.value); this.value=\'\';" title="Paragraph Style">' +
    '            <option value="">Style…</option>' +
    '            <option value="p">Paragraph (&lt;p&gt;)</option>' +
    '            <option value="h2">Heading 2 (&lt;h2&gt;)</option>' +
    '            <option value="h3">Heading 3 (&lt;h3&gt;)</option>' +
    '            <option value="h4">Heading 4 (&lt;h4&gt;)</option>' +
    '            <option value="blockquote">Quote (&lt;blockquote&gt;)</option>' +
    '            <option value="pre">Code / Monospace (&lt;pre&gt;)</option>' +
    '          </select>' +
    '        </div>' +
    '        <div class="tc-wysiwyg-toolbar-grp">' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Bold (Ctrl+B)" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'bold\');"><strong>B</strong></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Italic (Ctrl+I)" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'italic\');"><em>I</em></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Underline (Ctrl+U)" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'underline\');"><u>U</u></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Strikethrough" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'strikeThrough\');"><s>S</s></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Superscript" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'superscript\');">x²</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Subscript" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'subscript\');">x₂</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Clear Formatting" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'removeFormat\');">🧹</button>' +
    '        </div>' +
    '        <div class="tc-wysiwyg-toolbar-grp">' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Align Left" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'justifyLeft\');">⇤</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Align Center" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'justifyCenter\');">≡</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Align Right" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'justifyRight\');">⇥</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Justify" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'justifyFull\');">≣</button>' +
    '        </div>' +
    '        <div class="tc-wysiwyg-toolbar-grp">' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Bullet List" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'insertUnorderedList\');">• List</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Numbered List" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'insertOrderedList\');">1. List</button>' +
    '        </div>' +
    '        <div style="display:inline-flex;align-items:center;gap:3px;">' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Insert Table" onmousedown="event.preventDefault(); tcCustomWysiwygInsertTable(\'' + ex.id + '\');">⊞ <span data-i18n="tcInsertTable">' + (i18n.t('tcInsertTable') || 'Table') + '</span></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Insert Callout Box" onmousedown="event.preventDefault(); tcCustomWysiwygInsertCallout(\'' + ex.id + '\');">💬 <span data-i18n="tcInsertCallout">' + (i18n.t('tcInsertCallout') || 'Callout') + '</span></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Insert Writing Lines" onmousedown="event.preventDefault(); tcCustomWysiwygInsertLines(\'' + ex.id + '\');">📝 <span data-i18n="tcInsertLines">' + (i18n.t('tcInsertLines') || 'Lines') + '</span></button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Insert Horizontal Rule" onmousedown="event.preventDefault(); tcCustomWysiwygExec(\'' + ex.id + '\', \'insertHorizontalRule\');">―</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Insert Link" onmousedown="event.preventDefault(); tcCustomWysiwygInsertLink(\'' + ex.id + '\');">🔗</button>' +
    '          <button type="button" class="tc-wysiwyg-btn" title="Insert Image" onmousedown="event.preventDefault(); tcCustomWysiwygInsertImage(\'' + ex.id + '\');">🖼️</button>' +
    '        </div>' +
    '      </div>' +
    '      <div class="tc-custom-wysiwyg-area" id="wysiwyg_' + ex.id + '" contenteditable="true" spellcheck="true" oninput="tcOnCustomWysiwygInput(\'' + ex.id + '\')" onblur="tcOnCustomWysiwygBlur(\'' + ex.id + '\')">' + htmlContent + '</div>' +
    '    </div>' +
    '    <!-- Pure HTML Editor View -->' +
    '    <div class="tc-html-container" id="htmlWrap_' + ex.id + '" style="display:' + (!isWysiwyg ? 'block' : 'none') + ';">' +
    '      <div class="tc-snippets-bar">' +
    '        <span style="font-size:0.75rem;font-weight:900;text-transform:uppercase;color:#7c3aed;margin-right:4px;">HTML Snippets:</span>' +
    '        <button type="button" class="neo-btn sm" onclick="tcInsertCustomHtmlSnippet(\'' + ex.id + '\', \'table\')">+ Table</button>' +
    '        <button type="button" class="neo-btn sm" onclick="tcInsertCustomHtmlSnippet(\'' + ex.id + '\', \'callout\')">+ Callout Box</button>' +
    '        <button type="button" class="neo-btn sm" onclick="tcInsertCustomHtmlSnippet(\'' + ex.id + '\', \'two_cols\')">+ 2 Columns</button>' +
    '        <button type="button" class="neo-btn sm" onclick="tcInsertCustomHtmlSnippet(\'' + ex.id + '\', \'ruled_lines\')">+ Writing Lines</button>' +
    '        <button type="button" class="neo-btn sm" onclick="tcInsertCustomHtmlSnippet(\'' + ex.id + '\', \'badge\')">+ Badge</button>' +
    '        <button type="button" class="neo-btn sm" onclick="tcInsertCustomHtmlSnippet(\'' + ex.id + '\', \'image\')">+ Image Tag</button>' +
    '      </div>' +
    '      <textarea class="tc-custom-html-textarea" id="htmlTextarea_' + ex.id + '" spellcheck="false" placeholder="Write pure HTML code..." oninput="tcOnCustomHtmlInput(\'' + ex.id + '\', this.value)">' + escapeHtml(htmlContent) + '</textarea>' +
    '      <div class="tc-custom-html-preview-wrap">' +
    '        <div class="tc-preview-hdr"><span data-i18n="tcLivePreview">' + (i18n.t('tcLivePreview') || 'Live HTML Preview') + '</span></div>' +
    '        <div class="tc-custom-html-preview" id="htmlPreview_' + ex.id + '">' + htmlContent + '</div>' +
    '      </div>' +
    '    </div>' +
    '    <!-- Options Panel -->' +
    '    <div class="exercise-options-panel" id="optionsPanel_' + ex.id + '" style="display:' + (isOpen ? 'block' : 'none') + ';">' +
    tcStyleRowHtml(ex) +
    '      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;padding:8px 0;">' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">Background Tint:</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'background\', this.value)">' +
    '            <option value="default"' + (opts.background === 'default' ? ' selected' : '') + '>Default (White)</option>' +
    '            <option value="bordered"' + (opts.background === 'bordered' ? ' selected' : '') + '>Light Slate (#fafafa)</option>' +
    '            <option value="highlight"' + (opts.background === 'highlight' ? ' selected' : '') + '>Soft Amber / Highlight</option>' +
    '            <option value="callout"' + (opts.background === 'callout' ? ' selected' : '') + '>Soft Blue / Notice</option>' +
    '            <option value="soft_purple"' + (opts.background === 'soft_purple' ? ' selected' : '') + '>Soft Purple</option>' +
    '            <option value="none"' + (opts.background === 'none' ? ' selected' : '') + '>Transparent / None</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">Border Style:</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'border\', this.value)">' +
    '            <option value="solid"' + (opts.border === 'solid' ? ' selected' : '') + '>Solid Charcoal Border (2px)</option>' +
    '            <option value="dashed"' + (opts.border === 'dashed' ? ' selected' : '') + '>Dashed Border (2px)</option>' +
    '            <option value="double"' + (opts.border === 'double' ? ' selected' : '') + '>Double Border (3px)</option>' +
    '            <option value="neobrutalist"' + (opts.border === 'neobrutalist' ? ' selected' : '') + '>Neobrutalist Solid Shadow</option>' +
    '            <option value="minimal"' + (opts.border === 'minimal' ? ' selected' : '') + '>Minimal (Top & Bottom rules)</option>' +
    '            <option value="none"' + (opts.border === 'none' ? ' selected' : '') + '>No Border</option>' +
    '          </select>' +
    '        </div>' +
    '        <div>' +
    '          <label style="display:block;font-size:0.75rem;font-weight:800;margin-bottom:3px;">Padding Spacing:</label>' +
    '          <select class="meta-input sm" style="width:100%;" onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'padding\', this.value)">' +
    '            <option value="compact"' + (opts.padding === 'compact' ? ' selected' : '') + '>Compact (4px 8px)</option>' +
    '            <option value="standard"' + (opts.padding === 'standard' || !opts.padding ? ' selected' : '') + '>Standard (10px 14px)</option>' +
    '            <option value="spacious"' + (opts.padding === 'spacious' ? ' selected' : '') + '>Spacious (16px 20px)</option>' +
    '          </select>' +
    '        </div>' +
    '        <div style="display:flex;flex-direction:column;justify-content:center;gap:6px;">' +
    '          <label class="card-checkbox-label" style="font-size:0.78rem;">' +
    '            <input type="checkbox" ' + (opts.showTitle !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showTitle\', this.checked)">' +
    '            <span data-i18n="tcCustomShowTitle">' + (i18n.t('tcCustomShowTitle') || 'Display Title in Exam Output') + '</span>' +
    '          </label>' +
    '          <label class="card-checkbox-label" style="font-size:0.78rem;">' +
    '            <input type="checkbox" ' + (opts.showInstructions !== false ? 'checked' : '') + ' onchange="tcUpdateExOptionField(\'' + ex.id + '\', \'showInstructions\', this.checked)">' +
    '            <span data-i18n="tcCustomShowInstructions">' + (i18n.t('tcCustomShowInstructions') || 'Display Subtitle / Instructions in Exam Output') + '</span>' +
    '          </label>' +
    '        </div>' +
    '      </div>' +
    '    </div>' +
    renderExerciseTagsHtml(ex) +
    '  </div>' +
    '  <div class="card-footer">' +
    '    <div class="card-toggles">' +
    '      <label class="card-checkbox-label">' +
    '        <input type="checkbox" ' + (ex.forcePageBreak ? 'checked' : '') + ' onchange="tcUpdateExField(\'' + ex.id + '\', \'forcePageBreak\', this.checked)">' +
    '        <span>Force Page Break before this section</span>' +
    '      </label>' +
    '    </div>' +
    '    <div style="display:flex;align-items:center;gap:6px;">' +
    '      <button class="neo-btn sm" onclick="tcAttachCriteriaToEx(\'' + ex.id + '\')">+ Rubric Criteria</button>' +
    '      <button class="neo-btn sm" onclick="tcAttachCompetenceToEx(\'' + ex.id + '\')">+ Competence</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

function buildMiniFormatToolbar(inputId) {
  return '<span class="tc-mini-fmt-toolbar">' +
    '<button type="button" class="tc-fmt-btn" title="Bold (**text** or Ctrl+B)" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'bold\')">B</button>' +
    '<button type="button" class="tc-fmt-btn" title="Italic (*text* or Ctrl+I)" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'italic\')"><em>I</em></button>' +
    '<button type="button" class="tc-fmt-btn" title="Underline (<u>text</u> or Ctrl+U)" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'underline\')"><u>U</u></button>' +
    '<button type="button" class="tc-fmt-btn" title="Strikethrough (~~text~~ or <s>text</s>)" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'strike\')"><s>S</s></button>' +
    '<button type="button" class="tc-fmt-btn" title="Superscript (<sup>text</sup> or ^text^)" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'sup\')">x²</button>' +
    '<button type="button" class="tc-fmt-btn" title="Subscript (<sub>text</sub> or ~text~)" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'sub\')">x₂</button>' +
    '<button type="button" class="tc-fmt-btn" title="' + escapeAttr(i18n.t('tcFmtCodeTooltip') || 'Inline Code (`code`)') + '" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'code\')">&lt;/&gt;</button>' +
    '<button type="button" class="tc-fmt-btn" title="' + escapeAttr(i18n.t('tcFmtMarkTooltip') || 'Highlight (==text== or <mark>)') + '" onmousedown="event.preventDefault(); tcInsertFormat(\'' + inputId + '\', \'mark\')"><mark style="background:#fef08a;padding:0 2px;">M</mark></button>' +
    '<button type="button" class="tc-fmt-btn tc-fmt-preview-btn" title="' + escapeAttr(i18n.t('tcFmtTogglePreviewTooltip') || 'Toggle Markdown & HTML Preview') + '" onmousedown="event.preventDefault(); tcToggleFieldPreview(\'' + inputId + '\')">👁️</button>' +
    '</span>';
}

function tcHasRichFormatting(str) {
  if (!str || typeof str !== 'string') return false;
  if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.hasRichFormatting === 'function') {
    return TestCreatorService.hasRichFormatting(str);
  }
  return /(\*\*|__|\*|_|~~|==|\^|~|`|\[.+\]\(.+\)|<[a-z\/][\s\S]*>)/i.test(str);
}
window.tcHasRichFormatting = tcHasRichFormatting;

function buildSubitemPreviewHtml(inputId, text) {
  var val = text || '';
  var hasFmt = tcHasRichFormatting(val);
  var rendered = '';
  if (hasFmt) {
    if (/\[[^\]]+\]/.test(val)) {
      var previewStr = val.replace(/\[([^\]]+)\]/g, '<span class="tc-preview-blank">[$1]</span>');
      rendered = TestCreatorService.formatRichText(previewStr);
    } else {
      rendered = TestCreatorService.formatRichText(val);
    }
  }
  return '<div class="tc-subitem-preview" id="prev_' + inputId + '" style="' + (hasFmt ? 'display:flex;' : 'display:none;') + '">' +
    '<span class="tc-subitem-preview-badge">' + (i18n.t('tcLivePreview') || 'Preview') + '</span>' +
    '<div class="tc-subitem-preview-content">' + (rendered || '') + '</div>' +
    '</div>';
}
window.buildSubitemPreviewHtml = buildSubitemPreviewHtml;

window.tcUpdateLivePreview = function (inputId, text) {
  var prevEl = document.getElementById('prev_' + inputId);
  if (!prevEl) return;
  var val = text !== undefined ? text : (document.getElementById(inputId) ? document.getElementById(inputId).value : '');
  var contentEl = prevEl.querySelector('.tc-subitem-preview-content') || prevEl;
  var manualState = prevEl.getAttribute('data-manual-toggle');
  if (!val || !val.trim()) {
    prevEl.style.display = 'none';
    contentEl.innerHTML = '';
    return;
  }
  var hasFmt = tcHasRichFormatting(val);
  if (manualState === 'hide') {
    prevEl.style.display = 'none';
    return;
  }
  if (hasFmt || manualState === 'show') {
    prevEl.style.display = 'flex';
    var rendered = '';
    if (/\[[^\]]+\]/.test(val)) {
      var previewStr = val.replace(/\[([^\]]+)\]/g, '<span class="tc-preview-blank">[$1]</span>');
      rendered = TestCreatorService.formatRichText(previewStr);
    } else {
      rendered = TestCreatorService.formatRichText(val);
    }
    contentEl.innerHTML = rendered || '<span style="color:#94a3b8;font-style:italic;">(empty)</span>';
  } else {
    prevEl.style.display = 'none';
  }
};

window.tcToggleFieldPreview = function (inputId) {
  var prevEl = document.getElementById('prev_' + inputId);
  if (!prevEl) return;
  var isVis = prevEl.style.display !== 'none';
  if (isVis) {
    prevEl.style.display = 'none';
    prevEl.setAttribute('data-manual-toggle', 'hide');
  } else {
    prevEl.setAttribute('data-manual-toggle', 'show');
    tcUpdateLivePreview(inputId);
  }
};

window.tcInsertFormat = function (elemOrId, fmt, extraArg) {
  var el = (typeof elemOrId === 'string') ? document.getElementById(elemOrId) : elemOrId;
  if (!el) return;
  var start = el.selectionStart !== undefined ? el.selectionStart : 0;
  var end = el.selectionEnd !== undefined ? el.selectionEnd : 0;
  var val = el.value || '';
  var selected = val.substring(start, end);
  var before = val.substring(0, start);
  var after = val.substring(end);
  var wrapped = '';
  var inner = selected || '';

  switch (fmt) {
    case 'bold':
      if (inner.startsWith('**') && inner.endsWith('**') && inner.length >= 4) {
        wrapped = inner.slice(2, -2);
      } else if (inner.startsWith('__') && inner.endsWith('__') && inner.length >= 4) {
        wrapped = inner.slice(2, -2);
      } else {
        wrapped = '**' + (inner || 'bold text') + '**';
      }
      break;
    case 'italic':
      if (inner.startsWith('*') && inner.endsWith('*') && inner.length >= 2) {
        wrapped = inner.slice(1, -1);
      } else if (inner.startsWith('_') && inner.endsWith('_') && inner.length >= 2) {
        wrapped = inner.slice(1, -1);
      } else {
        wrapped = '*' + (inner || 'italic text') + '*';
      }
      break;
    case 'underline':
      if (inner.startsWith('<u>') && inner.endsWith('</u>') && inner.length >= 7) {
        wrapped = inner.slice(3, -4);
      } else {
        wrapped = '<u>' + (inner || 'underlined text') + '</u>';
      }
      break;
    case 'strike':
      if (inner.startsWith('<s>') && inner.endsWith('</s>') && inner.length >= 7) {
        wrapped = inner.slice(3, -4);
      } else if (inner.startsWith('~~') && inner.endsWith('~~') && inner.length >= 4) {
        wrapped = inner.slice(2, -2);
      } else {
        wrapped = '<s>' + (inner || 'strike text') + '</s>';
      }
      break;
    case 'sup':
      if (inner.startsWith('<sup>') && inner.endsWith('</sup>') && inner.length >= 11) {
        wrapped = inner.slice(5, -6);
      } else if (inner.startsWith('^') && inner.endsWith('^') && inner.length >= 2) {
        wrapped = inner.slice(1, -1);
      } else {
        wrapped = '<sup>' + (inner || '2') + '</sup>';
      }
      break;
    case 'sub':
      if (inner.startsWith('<sub>') && inner.endsWith('</sub>') && inner.length >= 11) {
        wrapped = inner.slice(5, -6);
      } else if (inner.startsWith('~') && inner.endsWith('~') && inner.length >= 2) {
        wrapped = inner.slice(1, -1);
      } else {
        wrapped = '<sub>' + (inner || '2') + '</sub>';
      }
      break;
    case 'code':
      if (inner.startsWith('`') && inner.endsWith('`') && inner.length >= 2) {
        wrapped = inner.slice(1, -1);
      } else {
        wrapped = '`' + (inner || 'code') + '`';
      }
      break;
    case 'mark':
      if (inner.startsWith('==') && inner.endsWith('==') && inner.length >= 4) {
        wrapped = inner.slice(2, -2);
      } else if (inner.startsWith('<mark>') && inner.endsWith('</mark>') && inner.length >= 13) {
        wrapped = inner.slice(6, -7);
      } else {
        wrapped = '==' + (inner || 'highlight') + '==';
      }
      break;
    case 'color':
      var col = extraArg || '#dc2626';
      wrapped = '<span style="color:' + col + '">' + (inner || 'color text') + '</span>';
      break;
    default:
      wrapped = inner;
  }

  el.value = before + wrapped + after;
  var newPos = start + wrapped.length;
  el.selectionStart = start;
  el.selectionEnd = newPos;
  el.focus();
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  var targetId = (typeof elemOrId === 'string') ? elemOrId : (elemOrId ? elemOrId.id : null);
  if (targetId && typeof tcUpdateLivePreview === 'function') {
    tcUpdateLivePreview(targetId, el.value);
  }
  if (typeof tcOnDirty === 'function') tcOnDirty();
};

function buildPdfSectionCardHtml(ex, idx) {
  var opts = TestCreatorService.ensureExerciseOptions(ex);
  var content = ex.content || {};
  var pdfName = content.pdfName || '';
  var pdfPages = content.totalPdfPages || 0;
  var selectedPages = Array.isArray(content.selectedPageNumbers) && content.selectedPageNumbers.length > 0
    ? content.selectedPageNumbers
    : TestCreatorService.parsePageRange(content.pageRangeString, pdfPages || 1);
  var cache = content.renderedPagesCache || {};
  var curOrient = opts.pageOrientation || 'portrait';
  var curFit = opts.fitMode || 'fit_page';
  var isSepPage = !!(ex.forcePageBreak || opts.separatePage);

  // Build thumbnail items
  var thumbsHtml = '';
  if (pdfPages > 0 && selectedPages.length > 0) {
    thumbsHtml = selectedPages.map(function (pNum) {
      var cachedImg = cache[String(pNum)] || cache[pNum] || '';
      var innerContent = cachedImg
        ? '<img src="' + cachedImg + '" class="tc-pdf-thumb-canvas" alt="Page ' + pNum + '" />'
        : '<div class="tc-pdf-thumb-canvas" style="display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#94a3b8;font-weight:700;">Page ' + pNum + '</div>';
      return '<div class="tc-pdf-thumb-card" onclick="tcOpenPdfPageZoomModal(\'' + ex.id + '\', ' + pNum + ')" title="' + escapeAttr(i18n.t('tcPdfZoomTitle') || 'Click to zoom page') + '">' +
        innerContent +
        '<div class="tc-pdf-thumb-footer">' +
        '  <span>Page ' + pNum + '</span>' +
        '  <img src="../assets/icons/search.svg" class="tc-pdf-thumb-zoom-icon" alt="" />' +
        '</div>' +
        '</div>';
    }).join('');
  }

  var fileAreaHtml = '';
  if (!pdfName && !pdfPages) {
    fileAreaHtml = '<div class="tc-pdf-dropzone" onclick="document.getElementById(\'pdfFileInput_' + ex.id + '\').click()" ondragover="event.preventDefault(); this.classList.add(\'drag-active\');" ondragleave="this.classList.remove(\'drag-active\');" ondrop="tcHandlePdfDrop(\'' + ex.id + '\', event)">' +
      '<div class="tc-pdf-dropzone-inner">' +
      '  <img src="../assets/icons/file-text.svg" class="tc-pdf-dropzone-icon" alt="">' +
      '  <span class="tc-pdf-dropzone-text">' + escapeHtml(i18n.t('tcPdfDropHint') || 'Click to browse or drag & drop a PDF file here') + '</span>' +
      '  <span class="tc-pdf-dropzone-sub">Supports any classroom reading text, article, or source document</span>' +
      '</div>' +
      '</div>';
  } else {
    var sizeStr = content.pdfSize ? (content.pdfSize > 1048576 ? (content.pdfSize / 1048576).toFixed(1) + ' MB' : Math.round(content.pdfSize / 1024) + ' KB') : '';
    fileAreaHtml = '<div class="tc-pdf-file-card">' +
      '<div class="tc-pdf-file-details">' +
      '  <img src="../assets/icons/file-text.svg" class="tc-pdf-file-icon" alt="">' +
      '  <div>' +
      '    <div class="tc-pdf-file-name" title="' + escapeAttr(pdfName) + '">' + escapeHtml(pdfName) + '</div>' +
      '    <div class="tc-pdf-file-meta">' +
      '      <span class="tc-pdf-badge-pages">' + pdfPages + ' page' + (pdfPages === 1 ? '' : 's') + '</span>' +
      (sizeStr ? '      <span>' + sizeStr + '</span>' : '') +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
      '  <button type="button" class="neo-btn sm" onclick="document.getElementById(\'pdfFileInput_' + ex.id + '\').click()">' + escapeHtml(i18n.t('tcPdfBrowseBtn') || 'Browse PDF…') + '</button>' +
      '  <button type="button" class="neo-btn sm" style="color:#ef4444;border-color:#ef4444;" onclick="tcClearPdfSectionFile(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcPdfClearFile') || 'Clear file') + '">' + escapeHtml(i18n.t('tcPdfClearFile') || 'Clear') + '</button>' +
      '</div>' +
      '</div>';
  }

  var isAllMode = (content.pageSelectionMode !== 'range');
  var rangeValidText = (selectedPages.length)
    ? (i18n.tFmt ? i18n.tFmt('tcPdfRangeValid', { 0: selectedPages.length, 1: selectedPages.join(', ') }) : (selectedPages.length + ' page(s) selected: ' + selectedPages.join(', ')))
    : (i18n.t('tcPdfRangeInvalid') || 'Invalid page range');

  return '<div class="exercise-card-item section-card-red" id="card-' + ex.id + '" data-index="' + idx + '" data-id="' + ex.id + '">' +
    '  <input type="file" id="pdfFileInput_' + ex.id + '" accept="application/pdf" style="display:none;" onchange="tcHandlePdfFileSelected(\'' + ex.id + '\', this)">' +
    '  <div class="exercise-card-header">' +
    '    <div class="card-header-left">' +
    '      <span class="card-drag-handle" title="Drag to reorder"><img class="tc-ico" src="../assets/icons/grip.svg" alt=""></span>' +
    '      <span class="card-type-badge badge-red">' + escapeHtml(i18n.t('tcPdfCardTitle') || 'PDF Document') + '</span>' +
    '    </div>' +
    '    <div class="card-header-title-wrap">' +
    '      <input type="text" id="exTitle_' + ex.id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title || 'Document: Reading Passage') + '" placeholder="Document Title" onchange="tcUpdateExField(\'' + ex.id + '\', \'title\', this.value)">' +
    '    </div>' +
    '    <div class="card-header-right">' +
    tcCardActionsHtml(ex, idx, null) +
    '    </div>' +
    '  </div>' +
    '  <div class="card-body">' +
    '      <input type="text" id="exInstr_' + ex.id + '" class="instructions-input tc-fmt-field" value="' + escapeAttr(ex.instructions || '') + '" placeholder="Optional instructions or subtitle (e.g. Read the document before answering Questions 1 to 5)" onchange="tcUpdateExField(\'' + ex.id + '\', \'instructions\', this.value)">' +
    fileAreaHtml +
    (pdfPages > 0 ? (
      '    <div class="tc-pdf-settings-grid">' +
      '      <div>' +
      '        <label>' + escapeHtml(i18n.t('tcPdfPageRange') || 'Page Selection:') + '</label>' +
      '        <div class="tc-pdf-range-box">' +
      '          <label style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:3px;cursor:pointer;">' +
      '            <input type="radio" name="pdfMode_' + ex.id + '" value="all"' + (isAllMode ? ' checked' : '') + ' onchange="tcSetPdfPageMode(\'' + ex.id + '\', \'all\')"> ' +
      '            ' + escapeHtml(i18n.t('tcPdfAllPages') || 'All Pages') +
      '          </label>' +
      '          <label style="font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:3px;cursor:pointer;">' +
      '            <input type="radio" name="pdfMode_' + ex.id + '" value="range"' + (!isAllMode ? ' checked' : '') + ' onchange="tcSetPdfPageMode(\'' + ex.id + '\', \'range\')"> ' +
      '            ' + escapeHtml(i18n.t('tcPdfCustomRange') || 'Range:') +
      '          </label>' +
      '          <input type="text" id="pdfRangeInput_' + ex.id + '" class="meta-input sm tc-pdf-range-input"' + (isAllMode ? ' disabled style="opacity:0.5;"' : '') + ' value="' + escapeAttr(content.pageRangeString || '1') + '" placeholder="1-2, 4" oninput="tcOnPdfRangeInput(\'' + ex.id + '\', this.value)">' +
      '        </div>' +
      '        <div id="pdfRangeStatus_' + ex.id + '" class="tc-pdf-range-status valid" style="margin-top:3px;">' + escapeHtml(rangeValidText) + '</div>' +
      '      </div>' +
      '      <div>' +
      '        <label>' + escapeHtml(i18n.t('tcPdfOrientation') || 'Orientation:') + '</label>' +
      '        <select class="meta-input sm" style="width:100%;" onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'pageOrientation\', this.value)">' +
      '          <option value="portrait"' + (curOrient === 'portrait' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcPdfOrientPortrait') || 'Portrait') + '</option>' +
      '          <option value="landscape"' + (curOrient === 'landscape' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcPdfOrientLandscape') || 'Landscape') + '</option>' +
      '        </select>' +
      '      </div>' +
      '      <div>' +
      '        <label>' + escapeHtml(i18n.t('tcPdfFitMode') || 'Page Scaling:') + '</label>' +
      '        <select class="meta-input sm" style="width:100%;" onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'fitMode\', this.value)">' +
      '          <option value="fit_page"' + (curFit === 'fit_page' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcPdfFitPage') || 'Fit Page (A4)') + '</option>' +
      '          <option value="fit_width"' + (curFit === 'fit_width' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcPdfFitWidth') || 'Fit Width (100%)') + '</option>' +
      '          <option value="custom_scale"' + (curFit === 'custom_scale' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcPdfCustomScale') || 'Custom Scale %') + '</option>' +
      '        </select>' +
      '      </div>' +
      '    </div>' +
      '    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px;font-size:0.75rem;font-weight:700;color:#334155;">' +
      '      <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;">' +
      '        <input type="checkbox"' + (isSepPage ? ' checked' : '') + ' onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'separatePage\', this.checked)"> ' +
      '        ' + escapeHtml(i18n.t('tcPdfSeparatePage') || 'Dedicated Separate Page(s)') +
      '      </label>' +
      '      <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;">' +
      '        <input type="checkbox"' + (opts.showTitle !== false ? ' checked' : '') + ' onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'showTitle\', this.checked)"> ' +
      '        ' + escapeHtml(i18n.t('tcPdfShowTitle') || 'Show Title in Output') +
      '      </label>' +
      '      <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;">' +
      '        <input type="checkbox"' + (opts.showInstructions !== false ? ' checked' : '') + ' onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'showInstructions\', this.checked)"> ' +
      '        ' + escapeHtml(i18n.t('tcPdfShowInstructions') || 'Show Instructions in Output') +
      '      </label>' +
      '      <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;">' +
      '        <input type="checkbox"' + (opts.showPageNumbers !== false ? ' checked' : '') + ' onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'showPageNumbers\', this.checked)"> ' +
      '        ' + escapeHtml(i18n.t('tcPdfShowPageNumbers') || 'Show Page Numbers') +
      '      </label>' +
      '      <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;">' +
      '        <input type="checkbox"' + (opts.includeInStudentTest !== false ? ' checked' : '') + ' onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'includeInStudentTest\', this.checked)"> ' +
      '        ' + escapeHtml(i18n.t('tcPdfIncludeInStudent') || 'Include in Student Exam') +
      '      </label>' +
      '      <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;">' +
      '        <input type="checkbox"' + (opts.includeInTeacherKey !== false ? ' checked' : '') + ' onchange="tcUpdatePdfExOption(\'' + ex.id + '\', \'includeInTeacherKey\', this.checked)"> ' +
      '        ' + escapeHtml(i18n.t('tcPdfIncludeInKey') || 'Include in Solution Key') +
      '      </label>' +
      '    </div>' +
      '    <div class="tc-pdf-thumbnails-strip" id="pdfThumbStrip_' + ex.id + '">' +
      thumbsHtml +
      '    </div>'
    ) : '') +
    '  </div>' +
    '</div>';
}

window.tcHandlePdfFileSelected = async function (exId, inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
  var file = inputEl.files[0];
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;

  var arrayBuffer = await file.arrayBuffer();
  var fileName = file.name || 'Document.pdf';
  var filePath = file.path || '';
  var fileSize = file.size || 0;
  await tcLoadPdfBufferIntoSection(ex, arrayBuffer, fileName, filePath, fileSize);
};

window.tcHandlePdfDrop = async function (exId, ev) {
  ev.preventDefault();
  var dropzone = ev.currentTarget;
  if (dropzone) dropzone.classList.remove('drag-active');
  var files = ev.dataTransfer && ev.dataTransfer.files;
  if (!files || !files.length) return;
  var file = files[0];
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    if (window.showToast) showToast('Please select a valid PDF document', true);
    return;
  }
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;

  var arrayBuffer = await file.arrayBuffer();
  var fileName = file.name || 'Document.pdf';
  var filePath = file.path || '';
  var fileSize = file.size || 0;
  await tcLoadPdfBufferIntoSection(ex, arrayBuffer, fileName, filePath, fileSize);
};

window.tcLoadPdfBufferIntoSection = async function (ex, arrayBuffer, fileName, filePath, fileSize) {
  try {
    var pdfjsLib = await tcEnsurePdfjsLib();
    var pdfDoc = await pdfjsLib.getDocument({
      data: arrayBuffer,
      standardFontDataUrl: new URL('../modules/standard_fonts/', location.href).href,
      wasmUrl: new URL('../modules/wasm/', location.href).href,
      disableFontFace: false
    }).promise;

    if (!ex.content) ex.content = {};
    ex.content.pdfName = fileName;
    ex.content.pdfPath = filePath;
    ex.content.pdfSize = fileSize;
    ex.content.totalPdfPages = pdfDoc.numPages;
    ex.content.rawPdfBuffer = arrayBuffer;
    if (!ex.content.pageSelectionMode) ex.content.pageSelectionMode = 'all';
    if (!ex.content.pageRangeString || ex.content.pageRangeString === 'all') {
      ex.content.pageRangeString = 'all';
      ex.content.selectedPageNumbers = TestCreatorService.parsePageRange('all', pdfDoc.numPages);
    } else {
      ex.content.selectedPageNumbers = TestCreatorService.parsePageRange(ex.content.pageRangeString, pdfDoc.numPages);
    }
    ex.content.renderedPagesCache = ex.content.renderedPagesCache || {};

    // Render selected pages to cache
    await tcRenderSelectedPdfPages(ex, pdfDoc);

    renderExerciseCards();
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate(100);
    tcOnDirty();
    if (window.showToast) {
      showToast((i18n.t('tcPdfPagesCount') || '{0} page(s)').replace('{0}', pdfDoc.numPages) + ' loaded: ' + fileName);
    }
  } catch (err) {
    console.error('Failed to load PDF into section:', err);
    if (window.showToast) showToast('Failed to open PDF document: ' + (err.message || err), true);
  }
};

window.tcRenderSelectedPdfPages = async function (ex, pdfDoc) {
  if (!ex || !ex.content) return;
  var pdfjsLib = await tcEnsurePdfjsLib();
  if (!pdfDoc && ex.content.rawPdfBuffer) {
    try {
      pdfDoc = await pdfjsLib.getDocument({
        data: ex.content.rawPdfBuffer,
        standardFontDataUrl: new URL('../modules/standard_fonts/', location.href).href,
        wasmUrl: new URL('../modules/wasm/', location.href).href,
        disableFontFace: false
      }).promise;
    } catch (e) {
      console.warn('Could not re-parse PDF buffer:', e);
    }
  }
  if (!pdfDoc) return;

  var selected = ex.content.selectedPageNumbers || [];
  ex.content.renderedPagesCache = ex.content.renderedPagesCache || {};

  for (var i = 0; i < selected.length; i++) {
    var pNum = selected[i];
    if (ex.content.renderedPagesCache[String(pNum)]) continue;
    try {
      var page = await pdfDoc.getPage(pNum);
      var viewport = page.getViewport({ scale: 1.5 });
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      var ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      ex.content.renderedPagesCache[String(pNum)] = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Error rendering page ' + pNum + ':', e);
    }
  }
};

window.tcSetPdfPageMode = async function (exId, mode) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  ex.content.pageSelectionMode = mode;
  if (mode === 'all') {
    ex.content.selectedPageNumbers = TestCreatorService.parsePageRange('all', ex.content.totalPdfPages || 1);
  } else {
    ex.content.selectedPageNumbers = TestCreatorService.parsePageRange(ex.content.pageRangeString || '1', ex.content.totalPdfPages || 1);
  }
  await tcRenderSelectedPdfPages(ex);
  renderExerciseCards();
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate(100);
  tcOnDirty();
};

window.tcOnPdfRangeInput = function (exId, rangeStr) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  ex.content.pageRangeString = rangeStr;
  var parsed = TestCreatorService.parsePageRange(rangeStr, ex.content.totalPdfPages || 1);
  ex.content.selectedPageNumbers = parsed;

  var statusEl = document.getElementById('pdfRangeStatus_' + exId);
  if (statusEl) {
    if (parsed.length) {
      statusEl.className = 'tc-pdf-range-status valid';
      statusEl.textContent = (i18n.tFmt ? i18n.tFmt('tcPdfRangeValid', { 0: parsed.length, 1: parsed.join(', ') }) : (parsed.length + ' page(s) selected: ' + parsed.join(', ')));
    } else {
      statusEl.className = 'tc-pdf-range-status invalid';
      statusEl.textContent = i18n.t('tcPdfRangeInvalid') || 'Invalid page range';
    }
  }

  clearTimeout(window._tcPdfRangeDebounce);
  window._tcPdfRangeDebounce = setTimeout(async function () {
    await tcRenderSelectedPdfPages(ex);
    var strip = document.getElementById('pdfThumbStrip_' + exId);
    if (strip) {
      strip.innerHTML = (ex.content.selectedPageNumbers || []).map(function (pNum) {
        var cachedImg = (ex.content.renderedPagesCache && ex.content.renderedPagesCache[String(pNum)]) || '';
        var inner = cachedImg
          ? '<img src="' + cachedImg + '" class="tc-pdf-thumb-canvas" alt="Page ' + pNum + '" />'
          : '<div class="tc-pdf-thumb-canvas" style="display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#94a3b8;font-weight:700;">Page ' + pNum + '</div>';
        return '<div class="tc-pdf-thumb-card" onclick="tcOpenPdfPageZoomModal(\'' + ex.id + '\', ' + pNum + ')">' +
          inner +
          '<div class="tc-pdf-thumb-footer"><span>Page ' + pNum + '</span><img src="../assets/icons/search.svg" class="tc-pdf-thumb-zoom-icon" alt="" /></div>' +
          '</div>';
      }).join('');
    }
    if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate(100);
    tcOnDirty();
  }, 300);
};

window.tcUpdatePdfExOption = function (exId, optKey, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var opts = TestCreatorService.ensureExerciseOptions(ex);
  opts[optKey] = value;
  if (optKey === 'separatePage') {
    ex.forcePageBreak = !!value;
  }
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate(100);
  tcOnDirty();
};

window.tcClearPdfSectionFile = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  ex.content.pdfName = '';
  ex.content.pdfPath = '';
  ex.content.pdfSize = 0;
  ex.content.totalPdfPages = 0;
  ex.content.selectedPageNumbers = [];
  ex.content.rawPdfBuffer = null;
  ex.content.renderedPagesCache = {};
  renderExerciseCards();
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate(100);
  tcOnDirty();
};

window.tcOpenPdfPageZoomModal = function (exId, pageNum) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !ex.content.renderedPagesCache) return;
  var modal = document.getElementById('tcPdfZoomModal');
  var img = document.getElementById('tcPdfZoomModalImg');
  var title = document.getElementById('tcPdfZoomModalTitle');
  if (!modal || !img) return;
  var src = ex.content.renderedPagesCache[String(pageNum)] || '';
  img.src = src;
  if (title) {
    title.innerHTML = '<img src="../assets/icons/file-text.svg" style="width:20px;height:20px;" alt=""> <span>' + escapeHtml(ex.content.pdfName || 'Document') + ' — Page ' + pageNum + '</span>';
  }
  modal.style.display = 'flex';
};

window.tcClosePdfZoomModal = function () {
  var modal = document.getElementById('tcPdfZoomModal');
  if (modal) modal.style.display = 'none';
};

function buildExerciseCardHtml(ex, idx, exerciseNumber) {
  var num = exerciseNumber || (idx + 1);
  var typeObj = TestCreatorService.EXERCISE_TYPES.find(function (t) { return t.id === ex.type; }) || { name: ex.type };
  var isOpen = window._openOptionsExerciseIds && window._openOptionsExerciseIds.has(ex.id);

  return tcBuildCardShell(ex, idx, {
    badgeText: typeObj.name,
    titlePlaceholder: 'Exercise Title',
    instrPlaceholder: 'Instructions for students (optional)',
    bodyHtml: buildSpecificEditorHtml(ex),
    optionsHtml: buildExerciseOptionsHtml(ex),
    isOpen: isOpen
  });
}

// ── Shared card shell (header, instructions, one Settings panel) ──
function tcCardIcon(name) {
  return '<img class="tc-ico" src="../assets/icons/' + name + '.svg" alt="">';
}

function tcHasExStyle(ex) {
  var es = ex.exportStyle || {};
  return !!(es.fontSize || es.lineHeight || es.padding || es.cardBorderStyle || es.marginTop || es.marginRight || es.marginBottom || es.marginLeft || (es.numberedLines !== null && es.numberedLines !== undefined));
}

// Settings toggle + overflow menu (isOpen === null hides the Settings button)
function tcCardActionsHtml(ex, idx, isOpen) {
  var id = ex.id;
  var T = function (k, d) { return escapeHtml(i18n.t(k) || d); };
  var A = function (k, d) { return escapeAttr(i18n.t(k) || d); };
  return (isOpen === null ? '' :
    '<button type="button" id="optionsBtn_' + id + '" class="card-settings-btn tc-options-btn' + (isOpen ? ' yellow' : '') + (tcHasExStyle(ex) ? ' has-style' : '') + '" onclick="tcToggleExerciseOptions(\'' + id + '\')">' + tcCardIcon('settings') + '<span>' + T('tcSettings', 'Settings') + '</span></button>') +
    '<div class="card-menu-wrap">' +
      '<button type="button" class="card-btn-icon" onclick="tcToggleCardMenu(\'' + id + '\', event)" title="' + A('tcMoreActions', 'More actions') + '">' + tcCardIcon('dots') + '</button>' +
      '<div class="card-menu" id="cardMenu_' + id + '">' +
        '<button type="button" onclick="tcMoveExercise(' + idx + ', -1)">' + T('tcMoveUp', 'Move up') + '</button>' +
        '<button type="button" onclick="tcMoveExercise(' + idx + ', 1)">' + T('tcMoveDown', 'Move down') + '</button>' +
        '<button type="button" onclick="tcDuplicateExercise(\'' + id + '\')">' + T('tcDuplicate', 'Duplicate') + '</button>' +
        '<button type="button" onclick="tcOpenBlockHtmlEditor(\'' + id + '\')">' + T('tcEditHtmlWysiwyg', 'Edit HTML / WYSIWYG') + (ex.customHtmlMode ? ' *' : '') + '</button>' +
        '<button type="button" onclick="tcSaveBlockToDb(\'' + id + '\')">' + T('tcSaveToTestBank', 'Save to Test Bank') + '</button>' +
        '<button type="button" class="danger" onclick="tcDeleteExercise(\'' + id + '\')">' + T('tcDelete', 'Delete') + '</button>' +
      '</div>' +
    '</div>';
}

// Style shortcut shown at the top of a section card's Settings panel
function tcStyleRowHtml(ex) {
  return '<div class="tc-settings-row"><button type="button" class="neo-btn sm' + (tcHasExStyle(ex) ? ' primary' : '') + '" onclick="tcOpenExerciseStyleModal(\'' + ex.id + '\')">' + tcCardIcon('palette') + ' ' + escapeHtml(i18n.t('tcTabStyle') || 'Style') + ': ' + escapeHtml(i18n.t('tcEditExportStyle') || 'Font, spacing, padding, numbered lines...') + '</button></div>';
}

function tcRenderExLineBlocksHtml(ex) {
  var blocks = Array.isArray(ex.lineBlocks) ? ex.lineBlocks : [];
  if (!blocks.length) return '';
  var T = function (k, d) { return escapeHtml(i18n.t(k) || d); };
  return '<div class="tc-ex-lineblocks-list">' +
    blocks.map(function (lb, lbIdx) {
      var mode = lb.lineMode || 'lines';
      var count = Math.max(1, Math.min(500, parseInt(lb.lineCount, 10) || 4));
      var pageCount = Math.max(1, Math.min(20, parseInt(lb.pageCount, 10) || 1));
      var style = lb.lineStyle || 'solid';
      var spacing = lb.lineSpacing || 'standard';
      var curHeight = lb.lineHeight || (spacing === 'compact' ? '20px' : (spacing === 'wide' ? '38px' : '28px'));
      var pos = lb.position || 'after';
      var numbered = !!lb.numberedLines;
      return '<div class="tc-ex-lineblock-item">' +
        '<div class="tc-ex-lineblock-head">' +
          '<span class="subitem-badge">' + T('tcBtnLineBlock', 'Line Block') + ' #' + (lbIdx + 1) + '</span>' +
          '<input type="text" class="meta-input sm" style="flex:1;min-width:140px;" value="' + escapeAttr(lb.label || '') + '" placeholder="' + T('tcLineBlockLabelPlaceholder', 'Optional header / prompt') + '" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'label\', this.value)">' +
          (lbIdx > 0 ? '<button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', -1)">▲</button>' : '') +
          (lbIdx < blocks.length - 1 ? '<button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', 1)">▼</button>' : '') +
          '<button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete" onclick="tcDeleteExLineBlock(\'' + ex.id + '\', ' + lbIdx + ')">&times;</button>' +
        '</div>' +
        '<div class="tc-line-block-controls">' +
          '<label class="tc-lb-field"><span>' + T('tcLineModeLabel', 'Mode:') + '</span>' +
            '<select class="meta-select sm" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'lineMode\', this.value)">' +
              '<option value="lines"' + (mode === 'lines' ? ' selected' : '') + '>' + T('tcLineModeLines', 'Number of lines') + '</option>' +
              '<option value="pages"' + (mode === 'pages' ? ' selected' : '') + '>' + T('tcLineModePages', 'Complete pages') + '</option>' +
            '</select>' +
          '</label>' +
          (mode === 'pages'
            ? ('<label class="tc-lb-field"><span>' + T('tcPageCountLabel', 'Pages:') + '</span>' +
               '<input type="number" class="meta-input sm" min="1" max="20" value="' + pageCount + '" style="width:62px;" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'pageCount\', Math.max(1, Math.min(20, Number(this.value) || 1)))">' +
               '</label>')
            : ('<label class="tc-lb-field"><span>' + T('tcLineCountLabel', 'Lines:') + '</span>' +
               '<input type="number" class="meta-input sm" min="1" max="500" value="' + count + '" style="width:62px;" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'lineCount\', Math.max(1, Math.min(500, Number(this.value) || 1)))">' +
               '</label>')) +
          '<label class="tc-lb-field"><span>' + T('tcLineStyleLabel', 'Style:') + '</span>' +
            '<select class="meta-select sm" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'lineStyle\', this.value)">' +
              '<option value="solid"' + (style === 'solid' ? ' selected' : '') + '>' + T('tcLineSolid', 'Solid') + '</option>' +
              '<option value="dashed"' + (style === 'dashed' ? ' selected' : '') + '>' + T('tcLineDashed', 'Dashed') + '</option>' +
              '<option value="dotted"' + (style === 'dotted' ? ' selected' : '') + '>' + T('tcLineDotted', 'Dotted') + '</option>' +
              '<option value="grid"' + (style === 'grid' ? ' selected' : '') + '>' + T('tcLineGrid', 'Grid') + '</option>' +
            '</select>' +
          '</label>' +
          '<div class="tc-lb-field"><span>' + T('tcLineSizeLabel', 'Size:') + '</span>' +
            tcBuildUnitInputHtml(curHeight, 'px', ['px', 'pt', 'cm'], 'tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'lineHeight\', __VAL__)') +
          '</div>' +
          '<div class="tc-lb-field"><span>' + T('tcLineThicknessLabel', 'Thickness:') + '</span>' +
            tcBuildUnitInputHtml(lb.lineThickness || '1px', 'px', ['px', 'pt', 'mm'], 'tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'lineThickness\', __VAL__)') +
          '</div>' +
          '<label class="tc-lb-field"><span>' + T('tcLineColorLabel', 'Colour:') + '</span>' +
            '<input type="color" data-color-css="' + escapeAttr(lb.lineColor || '#94a3b8') + '" value="' + escapeAttr(lb.lineColor || '#94a3b8') + '" style="width:28px;height:24px;padding:1px;border:1.5px solid #333;border-radius:4px;cursor:pointer;" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'lineColor\', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value)">' +
          '</label>' +
          '<label class="tc-lb-field"><span>' + T('tcLinePosLabel', 'Position:') + '</span>' +
            '<select class="meta-select sm" onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'position\', this.value)">' +
              '<option value="after"' + (pos === 'after' ? ' selected' : '') + '>' + T('tcLinePosBottom', 'Bottom of exercise') + '</option>' +
              '<option value="before"' + (pos === 'before' ? ' selected' : '') + '>' + T('tcLinePosTop', 'Top of exercise') + '</option>' +
            '</select>' +
          '</label>' +
          '<label class="card-checkbox-label">' +
            '<input type="checkbox"' + (numbered ? ' checked' : '') + ' onchange="tcUpdateExLineBlock(\'' + ex.id + '\', ' + lbIdx + ', \'numberedLines\', this.checked)">' +
            '<span>' + T('tcLineNumbersToggle', 'Line numbers') + '</span>' +
          '</label>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

window.tcAddExLineBlock = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!Array.isArray(ex.lineBlocks)) ex.lineBlocks = [];
  ex.lineBlocks.push({
    id: 'lb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    label: '',
    lineCount: 4,
    lineStyle: 'solid',
    lineSpacing: 'standard',
    numberedLines: false,
    position: 'after'
  });
  renderExerciseCards();
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

window.tcUpdateExLineBlock = function (exId, lbIdx, field, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !Array.isArray(ex.lineBlocks) || !ex.lineBlocks[lbIdx]) return;
  ex.lineBlocks[lbIdx][field] = value;
  if (field === 'lineMode') renderExerciseCards();
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

window.tcMoveExLineBlock = function (exId, lbIdx, dir) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !Array.isArray(ex.lineBlocks)) return;
  var target = lbIdx + dir;
  if (target < 0 || target >= ex.lineBlocks.length) return;
  var tmp = ex.lineBlocks[lbIdx];
  ex.lineBlocks[lbIdx] = ex.lineBlocks[target];
  ex.lineBlocks[target] = tmp;
  renderExerciseCards();
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

window.tcDeleteExLineBlock = function (exId, lbIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !Array.isArray(ex.lineBlocks)) return;
  ex.lineBlocks.splice(lbIdx, 1);
  renderExerciseCards();
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

function tcBuildCardShell(ex, idx, cfg) {
  var id = ex.id;
  var es = ex.exportStyle || {};
  var hasStyle = !!(es.fontSize || es.lineHeight || es.padding || (es.numberedLines !== null && es.numberedLines !== undefined));
  var T = function (k, d) { return escapeHtml(i18n.t(k) || d); };
  var A = function (k, d) { return escapeAttr(i18n.t(k) || d); };
  var isOpen = !!cfg.isOpen;
  var fromRubric = TestCreatorService.isPointsFromRubric(ex);
  if (fromRubric) TestCreatorService.calculateExercisePoints(ex, currentTest);
  return '<div class="exercise-card-item ' + (cfg.cardClass || '') + '" id="card-' + id + '" data-index="' + idx + '" data-id="' + id + '">' +
    '<div class="exercise-card-header">' +
      '<span class="card-drag-handle" title="' + A('tcDragReorder', 'Drag to reorder') + '">' + tcCardIcon('grip') + '</span>' +
      '<span class="card-type-badge ' + (cfg.badgeClass || '') + '">' + escapeHtml(cfg.badgeText || '') + '</span>' +
      '<input type="text" id="exTitle_' + id + '" class="card-title-input tc-fmt-field" value="' + escapeAttr(ex.title) + '" placeholder="' + escapeAttr(cfg.titlePlaceholder || '') + '" onchange="tcUpdateExField(\'' + id + '\', \'title\', this.value)">' +
      '<label class="card-points-wrap' + (fromRubric ? ' from-rubric' : '') + '"' + (fromRubric ? ' title="' + A('tcPointsFromRubric', 'Points come from the attached rubric') + '"' : '') + '><input type="number" class="card-points-input" value="' + (ex.points || 1) + '" step="0.5"' + (fromRubric ? ' readonly tabindex="-1"' : '') + ' onchange="tcUpdateExField(\'' + id + '\', \'points\', Number(this.value))"><span class="card-pts-label">' + (fromRubric ? T('tcPtsFromRubric', 'pts (rubric)') : T('tcPtsShort', 'pts')) + '</span></label>' +
      tcCardActionsHtml(ex, idx, isOpen) +
    '</div>' +
    '<div class="card-body">' +
      '<input type="text" id="exInstr_' + id + '" class="instructions-input tc-fmt-field" value="' + escapeAttr(ex.instructions || '') + '" placeholder="' + escapeAttr(cfg.instrPlaceholder || '') + '" onchange="tcUpdateExField(\'' + id + '\', \'instructions\', this.value)">' +
      (cfg.bodyHtml || '') +
      tcRenderExLineBlocksHtml(ex) +
      '<div class="tc-ex-lineblock-bar">' +
        '<button type="button" class="neo-btn sm" onclick="tcAddExLineBlock(\'' + id + '\')">' + tcCardIcon('align-left') + ' + ' + T('tcAddLineBlockBtn', 'Add Line Block') + '</button>' +
      '</div>' +
      '<div class="exercise-options-panel tc-settings-panel" id="optionsPanel_' + id + '" style="display:' + (isOpen ? 'block' : 'none') + ';">' +
        '<div class="tc-settings-tabs">' +
          '<button type="button" class="active" data-tab="options" onclick="tcSetSettingsTab(\'' + id + '\', \'options\')">' + T('tcTabOptions', 'Options') + '</button>' +
          '<button type="button" data-tab="style" onclick="tcSetSettingsTab(\'' + id + '\', \'style\')">' + T('tcTabStyle', 'Style') + '</button>' +
        '</div>' +
        '<div class="tc-settings-pane" data-pane="options">' +
          (cfg.optionsHtml || '') +
          '<div class="tc-settings-row">' +
            '<label class="card-checkbox-label"><input type="checkbox" ' + (ex.forcePageBreak ? 'checked' : '') + ' onchange="tcUpdateExField(\'' + id + '\', \'forcePageBreak\', this.checked)"><span>' + T('tcForcePageBreak', 'Page break before') + '</span></label>' +
            '<label class="card-checkbox-label"><input type="checkbox" ' + (ex.exportStyle && ex.exportStyle.cardBorderStyle === 'none' ? 'checked' : '') + ' onchange="tcToggleExNoBorder(\'' + id + '\', this.checked)"><span>' + T('tcHideExBorder', 'Hide border') + '</span></label>' +
            '<label class="card-checkbox-label"><input type="checkbox" ' + (ex.hideExercisePrefix ? 'checked' : '') + ' onchange="tcUpdateExField(\'' + id + '\', \'hideExercisePrefix\', this.checked)"><span>' + T('tcHideExPrefix', 'Hide "Exercise #"') + '</span></label>' +
            '<label class="card-checkbox-label"><input type="checkbox" ' + (ex.autoSaveToDb === true ? 'checked' : '') + ' onchange="tcToggleExAutoSave(\'' + id + '\', this.checked)"><span>' + T('tcSaveToDb', 'Save to Database') + '</span></label>' +
          '</div>' +
          '<div class="tc-settings-row">' +
            '<button type="button" class="neo-btn sm" onclick="tcAttachCriteriaToEx(\'' + id + '\')">' + T('tcAttachRubric', '+ Rubric Criteria') + '</button>' +
            '<button type="button" class="neo-btn sm" onclick="tcAttachCompetenceToEx(\'' + id + '\')">' + T('tcAttachCompetence', '+ Competence') + '</button>' +
            '<button type="button" class="neo-btn sm" onclick="tcAttachScaleToEx(\'' + id + '\')">' + T('tcAttachScale', '+ Grading Scale') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="tc-settings-pane" data-pane="style" hidden>' +
          '<div class="tc-settings-row"><button type="button" class="neo-btn sm' + (hasStyle ? ' primary' : '') + '" onclick="tcOpenExerciseStyleModal(\'' + id + '\')">' + tcCardIcon('palette') + ' ' + T('tcEditExportStyle', 'Font, spacing, padding, numbered lines...') + '</button></div>' +
        '</div>' +
      '</div>' +
      renderExerciseTagsHtml(ex) +
    '</div>' +
  '</div>';
}

window.tcSetSettingsTab = function (exId, tab) {
  var panel = document.getElementById('optionsPanel_' + exId);
  if (!panel) return;
  panel.querySelectorAll('.tc-settings-tabs button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
  panel.querySelectorAll('.tc-settings-pane').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== tab; });
};

window.tcToggleExNoBorder = function (exId, hide) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.exportStyle) ex.exportStyle = {};
  if (hide) {
    ex.exportStyle.cardBorderStyle = 'none';
  } else {
    delete ex.exportStyle.cardBorderStyle;
    if (!Object.keys(ex.exportStyle).length) delete ex.exportStyle;
  }
  tcOnDirty();
  tcScheduleLivePreviewUpdate();
};

window.tcToggleCardMenu = function (exId, ev) {
  if (ev) ev.stopPropagation();
  var m = document.getElementById('cardMenu_' + exId);
  var wasOpen = m && m.classList.contains('open');
  document.querySelectorAll('.card-menu.open').forEach(function (x) { x.classList.remove('open'); });
  if (m && !wasOpen) m.classList.add('open');
};
document.addEventListener('click', function () {
  document.querySelectorAll('.card-menu.open').forEach(function (x) { x.classList.remove('open'); });
});

// ── One shared floating format toolbar for .tc-fmt-field inputs ──
(function () {
  var bar = null, active = null;
  var BTNS = [['bold', '<b>B</b>', 'Bold'], ['italic', '<em>I</em>', 'Italic'], ['underline', '<u>U</u>', 'Underline'], ['strike', '<s>S</s>', 'Strikethrough'], ['sup', 'x&sup2;', 'Superscript'], ['sub', 'x&#8322;', 'Subscript'], ['code', '&lt;/&gt;', 'Code'], ['mark', '<mark>M</mark>', 'Highlight']];
  function ensure() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'tc-float-fmt';
    bar.innerHTML = BTNS.map(function (b) { return '<button type="button" class="tc-fmt-btn" data-fmt="' + b[0] + '" title="' + b[2] + '">' + b[1] + '</button>'; }).join('') +
      '<button type="button" class="tc-fmt-btn" data-fmt="preview" title="Preview"><img class="tc-ico" src="../assets/icons/eye.svg" alt=""></button>';
    bar.addEventListener('mousedown', function (e) {
      var b = e.target.closest('button[data-fmt]');
      if (!b || !active) return;
      e.preventDefault();
      if (b.getAttribute('data-fmt') === 'preview') tcToggleFieldPreview(active.id);
      else tcInsertFormat(active, b.getAttribute('data-fmt'));
    });
    document.body.appendChild(bar);
    return bar;
  }
  function place() {
    if (!active || !bar) return;
    var r = active.getBoundingClientRect();
    bar.style.transform = 'translate(' + Math.round(Math.max(4, r.left)) + 'px,' + Math.round(Math.max(4, r.top - 34)) + 'px)';
  }
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('tc-fmt-field')) { active = t; ensure().classList.add('show'); place(); }
  });
  document.addEventListener('focusout', function (e) {
    if (e.target === active) setTimeout(function () { if (document.activeElement !== active && bar) { bar.classList.remove('show'); active = null; } }, 120);
  });
  window.addEventListener('scroll', function () { requestAnimationFrame(place); }, true);
})();

function renderExerciseTagsHtml(ex) {
  var html = '';
  var comps = Array.isArray(ex.linkedCompetenceIds) ? ex.linkedCompetenceIds : [];
  var rubrics = (Array.isArray(ex.criteria) && ex.criteria.length)
    ? ex.criteria
    : (Array.isArray(ex.markingRubric) ? ex.markingRubric : []);
  var scale = ex.scaleModel || (ex.scaleModelId ? { name: ex.scaleModelId } : null);
  if (comps.length > 0 || rubrics.length > 0 || scale) {
    html += '<div style="margin-top:10px;padding-top:8px;border-top:1.5px dashed #ccc;display:flex;flex-wrap:wrap;align-items:center;gap:6px;">';
    comps.forEach(function (c, cIdx) {
      html += '<span style="background:#eff6ff;border:1.5px solid #2563eb;color:#1e40af;font-size:0.75rem;padding:2px 8px;border-radius:4px;font-weight:800;display:inline-flex;align-items:center;gap:6px;">' +
        escapeHtml(c) + ' <button type="button" style="background:none;border:none;cursor:pointer;color:#1e40af;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveCompFromEx(\'' + ex.id + '\',' + cIdx + ')">&times;</button></span>';
    });
    rubrics.forEach(function (r, rIdx) {
      var levelCount = (r.comments && typeof r.comments === 'object') ? Object.keys(r.comments).length : (Array.isArray(r.grades) ? r.grades.length : 0);
      var levelBadge = levelCount > 0 ? ' <span style="font-size:0.68rem;font-weight:700;color:#047857;background:#d1fae5;padding:1px 4px;border-radius:3px;">[' + levelCount + ' lvls]</span>' : '';
      html += '<span style="background:#f0fdf4;border:1.5px solid #16a34a;color:#15803d;font-size:0.75rem;padding:2px 8px;border-radius:4px;font-weight:800;display:inline-flex;align-items:center;gap:6px;">' +
        escapeHtml(r.title) + ' (/' + (r.maxPoints || 0) + ' pts)' + levelBadge +
        ' <button type="button" class="card-btn-icon" style="padding:1px 5px;font-size:0.72rem;background:#d1fae5;color:#065f46;border:1px solid #10b981;cursor:pointer;margin-left:2px;display:inline-flex;align-items:center;gap:3px;" onclick="tcOpenRubricMatrixModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcViewRubricMatrix') || 'View Rubric Matrix') + '"><img src="../assets/icons/eye.svg" style="width:12px;height:12px;" alt="">' + escapeHtml(i18n.t('tcMatrixBtn') || 'Matrix') + '</button>' +
        ' <button type="button" class="card-btn-icon" style="padding:1px 5px;font-size:0.72rem;background:#ecfdf5;color:#065f46;border:1px solid #059669;cursor:pointer;margin-left:2px;display:inline-flex;align-items:center;gap:3px;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcRubricLayoutTooltip') || 'Rubric Layout & Appearance') + '"><img src="../assets/icons/layout.svg" style="width:12px;height:12px;" alt="">' + escapeHtml(i18n.t('tcLayoutAppearance') || 'Layout') + '</button>' +
        ' <button type="button" style="background:none;border:none;cursor:pointer;color:#15803d;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveRubricFromEx(\'' + ex.id + '\',' + rIdx + ')">&times;</button></span>';
    });
    if (scale) {
      var sLabel = scale.label || scale.name || scale.title || scale.key || scale.id || ex.scaleModelId;
      html += '<span style="background:#fffbeb;border:1.5px solid #d97706;color:#92400e;font-size:0.75rem;padding:2px 8px;border-radius:4px;font-weight:800;display:inline-flex;align-items:center;gap:6px;">' +
        'Scale: ' + escapeHtml(sLabel) +
        ' <button type="button" style="background:none;border:none;cursor:pointer;color:#92400e;font-weight:900;font-size:0.85rem;padding:0;line-height:1;" onclick="tcRemoveScaleFromEx(\'' + ex.id + '\')">&times;</button></span>';
    }
    html += '</div>';
  }
  return html;
}

// ── Subitem WYSIWYG Text Input Builder & Handlers ───────────────────────
function buildSubitemWysiwygHtml(opts) {
  opts = opts || {};
  var id = opts.id || ('subWysiwyg_' + Math.random().toString(36).substring(2, 9));
  var rawContent = opts.content !== undefined && opts.content !== null ? String(opts.content) : '';
  // Normalize any prior corrupted &nbsp; or &amp;nbsp; in stored subitem content to standard spaces
  var cleanRaw = rawContent.replace(/&amp;nbsp;/gi, ' ').replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
  var placeholder = opts.placeholder || 'Type here (accepts markdown and HTML)...';
  var isCloze = !!opts.isCloze;
  var onInputJs = opts.onInputJs || '';
  var minHeight = opts.minHeight || (isCloze ? '50px' : '56px');

  var formattedHtml = '';
  if (cleanRaw) {
    if (isCloze && /\[[^\]]+\]/.test(cleanRaw)) {
      var blankStyled = cleanRaw.replace(/\[([^\]]+)\]/g, '<span class="tc-blank-chip">[$1]</span>');
      formattedHtml = (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.formatRichText === 'function')
        ? TestCreatorService.formatRichText(blankStyled)
        : blankStyled;
    } else {
      formattedHtml = (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.formatRichText === 'function')
        ? TestCreatorService.formatRichText(cleanRaw)
        : cleanRaw;
    }
  }

  var escapedPlaceholder = escapeAttr(placeholder);
  var escapedRaw = escapeHtml(cleanRaw);

  return '<div class="tc-subitem-wysiwyg-wrap" id="wysiwygWrap_' + id + '" data-input-js="' + escapeAttr(onInputJs) + '" data-is-cloze="' + (isCloze ? '1' : '0') + '">' +
    '  <div class="tc-subitem-wysiwyg-toolbar">' +
    '    <div class="tc-subitem-wysiwyg-tools">' +
    '      <button type="button" class="tc-sub-tool-btn" title="Bold (Ctrl+B)" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'bold\');"><strong>B</strong></button>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Italic (Ctrl+I)" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'italic\');"><em>I</em></button>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Underline (Ctrl+U)" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'underline\');"><u>U</u></button>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Strikethrough" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'strikeThrough\');"><s>S</s></button>' +
    '      <span class="tc-sub-tool-sep"></span>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Superscript" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'superscript\');">x²</button>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Subscript" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'subscript\');">x₂</button>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Inline Code (`code`)" onmousedown="event.preventDefault(); tcSubitemWysiwygInsertCode(\'' + id + '\');">&lt;/&gt;</button>' +
    '      <button type="button" class="tc-sub-tool-btn" title="Highlight (==mark==)" onmousedown="event.preventDefault(); tcSubitemWysiwygHighlight(\'' + id + '\');"><mark style="background:#fef08a;padding:0 2px;">M</mark></button>' +
    (isCloze ? '      <button type="button" class="tc-sub-tool-btn tc-blank-btn" title="' + escapeAttr(i18n.t('tcWysiwygBlankTooltip') || 'Insert [blank] answer') + '" onmousedown="event.preventDefault(); tcSubitemWysiwygInsertBlank(\'' + id + '\');"><strong>[ + ]</strong> ' + escapeHtml(i18n.t('tcWysiwygInsertBlank') || '+ Blank') + '</button>' : '') +
    '      <button type="button" class="tc-sub-tool-btn" title="Clear Formatting" onmousedown="event.preventDefault(); tcSubitemWysiwygCmd(\'' + id + '\', \'removeFormat\');">🧹</button>' +
    '    </div>' +
    '    <div class="tc-subitem-wysiwyg-mode-toggle">' +
    '      <button type="button" class="tc-sub-tool-btn tc-source-toggle-btn" id="srcToggle_' + id + '" title="' + escapeAttr(i18n.t('tcWysiwygSourceTooltip') || 'Toggle between Visual WYSIWYG and Raw Markdown / HTML code') + '" onclick="tcToggleSubitemSourceMode(\'' + id + '\')">&lt;/&gt; ' + escapeHtml(i18n.t('tcWysiwygCodeMd') || 'Code / MD') + '</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="tc-subitem-wysiwyg-editor" id="' + id + '" contenteditable="true" spellcheck="true" style="min-height:' + minHeight + ';" data-placeholder="' + escapedPlaceholder + '" oninput="tcOnSubitemWysiwygInput(\'' + id + '\')" onblur="tcOnSubitemWysiwygBlur(\'' + id + '\')" onpaste="tcOnSubitemWysiwygPaste(event, \'' + id + '\')" onkeydown="tcOnSubitemWysiwygKeydown(event, \'' + id + '\')">' + formattedHtml + '</div>' +
    '  <textarea class="tc-subitem-wysiwyg-source" id="raw_' + id + '" style="display:none;min-height:' + minHeight + ';" placeholder="' + escapedPlaceholder + '" oninput="tcOnSubitemRawInput(\'' + id + '\')" onblur="tcOnSubitemRawBlur(\'' + id + '\')">' + escapedRaw + '</textarea>' +
    '</div>';
}
window.buildSubitemWysiwygHtml = buildSubitemWysiwygHtml;

window.tcSubitemWysiwygCmd = function (targetId, cmd, val) {
  var editor = document.getElementById(targetId);
  if (editor) editor.focus();
  try {
    document.execCommand(cmd, false, val || null);
  } catch (e) {
    console.warn('WYSIWYG exec error:', cmd, e);
  }
  window.tcOnSubitemWysiwygInput(targetId);
};

window.tcSubitemWysiwygInsertCode = function (targetId) {
  var editor = document.getElementById(targetId);
  if (editor) editor.focus();
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    var range = sel.getRangeAt(0);
    var selectedText = range.toString();
    if (selectedText) {
      var codeNode = document.createElement('code');
      codeNode.textContent = selectedText;
      range.deleteContents();
      range.insertNode(codeNode);
      range.setStartAfter(codeNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      var codeNode = document.createElement('code');
      codeNode.textContent = 'code';
      range.insertNode(codeNode);
    }
  }
  window.tcOnSubitemWysiwygInput(targetId);
};

window.tcSubitemWysiwygHighlight = function (targetId) {
  var editor = document.getElementById(targetId);
  if (editor) editor.focus();
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    var range = sel.getRangeAt(0);
    var selectedText = range.toString();
    if (selectedText) {
      var markNode = document.createElement('mark');
      markNode.style.background = '#fef08a';
      markNode.style.padding = '0 3px';
      markNode.style.borderRadius = '2px';
      markNode.textContent = selectedText;
      range.deleteContents();
      range.insertNode(markNode);
      range.setStartAfter(markNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  window.tcOnSubitemWysiwygInput(targetId);
};

window.tcSubitemWysiwygInsertBlank = function (targetId) {
  var editor = document.getElementById(targetId);
  if (editor) editor.focus();
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    var range = sel.getRangeAt(0);
    var selectedText = range.toString() || 'answer';
    var cleanWord = selectedText.replace(/^\[|\]$/g, '');
    var blankText = '[' + cleanWord + ']';
    var chip = document.createElement('span');
    chip.className = 'tc-blank-chip';
    chip.textContent = blankText;
    range.deleteContents();
    range.insertNode(chip);
    range.setStartAfter(chip);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  window.tcOnSubitemWysiwygInput(targetId);
};

window.tcToggleSubitemSourceMode = function (targetId) {
  var editor = document.getElementById(targetId);
  var rawTa = document.getElementById('raw_' + targetId);
  var toggleBtn = document.getElementById('srcToggle_' + targetId);
  if (!editor || !rawTa) return;

  var isRaw = rawTa.style.display !== 'none';
  if (isRaw) {
    var rawVal = rawTa.value || '';
    var wrap = document.getElementById('wysiwygWrap_' + targetId);
    var isCloze = wrap && wrap.getAttribute('data-is-cloze') === '1';
    var rendered = rawVal;
    if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.formatRichText === 'function') {
      if (isCloze && /\[[^\]]+\]/.test(rawVal)) {
        var blankStyled = rawVal.replace(/\[([^\]]+)\]/g, '<span class="tc-blank-chip">[$1]</span>');
        rendered = TestCreatorService.formatRichText(blankStyled);
      } else {
        rendered = TestCreatorService.formatRichText(rawVal);
      }
    }
    editor.innerHTML = rendered;
    rawTa.style.display = 'none';
    editor.style.display = 'block';
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.innerHTML = '&lt;/&gt; ' + escapeHtml(i18n.t('tcWysiwygCodeMd') || 'Code / MD');
    }
    editor.focus();
  } else {
    rawTa.value = window.tcGetSubitemWysiwygCleanValue(targetId);
    editor.style.display = 'none';
    rawTa.style.display = 'block';
    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.innerHTML = '👁️ ' + escapeHtml(i18n.t('tcWysiwygVisual') || 'Visual');
    }
    rawTa.focus();
  }
};

window.tcGetSubitemWysiwygCleanValue = function (targetId) {
  var rawTa = document.getElementById('raw_' + targetId);
  var editor = document.getElementById(targetId);
  if (rawTa && rawTa.style.display !== 'none') {
    return (rawTa.value || '').replace(/&amp;nbsp;/gi, ' ').replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
  }
  if (!editor) return '';

  var clone = editor.cloneNode(true);
  var chips = clone.querySelectorAll('.tc-blank-chip');
  chips.forEach(function (c) {
    var t = c.textContent.trim();
    if (!t.startsWith('[')) t = '[' + t + ']';
    c.replaceWith(document.createTextNode(t));
  });

  var html = clone.innerHTML;
  html = html.replace(/<p><br\/?><\/p>$/i, '').trim();

  // Convert non-breaking spaces and &nbsp; entities created by contenteditable into standard spaces
  html = html.replace(/&amp;nbsp;/gi, ' ').replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');

  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return clone.textContent.replace(/&amp;nbsp;/gi, ' ').replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
  }
  return html;
};

window.tcOnSubitemWysiwygInput = function (targetId) {
  var val = window.tcGetSubitemWysiwygCleanValue(targetId);
  var rawTa = document.getElementById('raw_' + targetId);
  if (rawTa && rawTa.style.display === 'none') {
    rawTa.value = val;
  }

  var wrap = document.getElementById('wysiwygWrap_' + targetId);
  if (wrap) {
    var inputJs = wrap.getAttribute('data-input-js');
    if (inputJs) {
      try {
        var fn = new Function('__VAL__', inputJs);
        fn(val);
      } catch (err) {
        console.warn('Error executing subitem inputJs:', err);
      }
    }
  }
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate(300);
  }
};

window.tcOnSubitemWysiwygBlur = function (targetId) {
  window.tcOnSubitemWysiwygInput(targetId);
};

window.tcOnSubitemRawInput = function (targetId) {
  var rawTa = document.getElementById('raw_' + targetId);
  var val = rawTa ? rawTa.value : '';
  var wrap = document.getElementById('wysiwygWrap_' + targetId);
  if (wrap) {
    var inputJs = wrap.getAttribute('data-input-js');
    if (inputJs) {
      try {
        var fn = new Function('__VAL__', inputJs);
        fn(val);
      } catch (err) {
        console.warn('Error executing raw inputJs:', err);
      }
    }
  }
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate(300);
  }
};

window.tcOnSubitemRawBlur = function (targetId) {
  window.tcOnSubitemRawInput(targetId);
};

window.tcOnSubitemWysiwygPaste = function (e, targetId) {
  if (!e || !e.clipboardData) return;
  var text = e.clipboardData.getData('text/plain');
  if (!text) return;
  var hasMarkdown = /(\*\*|__|\*|_|~~|==|\^|~|`|\[.+\]\(.+\)|\[[^\]]+\])/.test(text);
  var hasHtml = /<[a-z\/][\s\S]*>/i.test(text);

  if (hasMarkdown || hasHtml) {
    e.preventDefault();
    var formatted = text;
    if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.formatRichText === 'function') {
      formatted = TestCreatorService.formatRichText(text);
    }
    var wrap = document.getElementById('wysiwygWrap_' + targetId);
    if (wrap && wrap.getAttribute('data-is-cloze') === '1') {
      formatted = formatted.replace(/\[([^\]]+)\]/g, '<span class="tc-blank-chip">[$1]</span>');
    }
    try {
      document.execCommand('insertHTML', false, formatted);
    } catch (err) {
      var editor = document.getElementById(targetId);
      if (editor) editor.innerHTML += formatted;
    }
    window.tcOnSubitemWysiwygInput(targetId);
  }
};

window.tcOnSubitemWysiwygKeydown = function (e, targetId) {
  if (!e) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      tcSubitemWysiwygCmd(targetId, 'bold');
      return;
    }
    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      tcSubitemWysiwygCmd(targetId, 'italic');
      return;
    }
    if (e.key === 'u' || e.key === 'U') {
      e.preventDefault();
      tcSubitemWysiwygCmd(targetId, 'underline');
      return;
    }
  }

  if (e.key === ' ' || e.key === 'Enter') {
    try {
      var sel = window.getSelection();
      if (sel && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE) {
        var nodeText = sel.anchorNode.nodeValue || '';
        var caretOffset = sel.anchorOffset;
        var textBeforeCaret = nodeText.substring(0, caretOffset);

        var mBold = textBeforeCaret.match(/\*\*([^\*\n]+)\*\*$/);
        var mItalic = !mBold ? textBeforeCaret.match(/(?:^|[^\*])\*([^\*\n]+)\*$/) : null;
        var mStrike = (!mBold && !mItalic) ? textBeforeCaret.match(/~~([^~\n]+)~~$/) : null;
        var mMark = (!mBold && !mItalic && !mStrike) ? textBeforeCaret.match(/==([^=\n]+)==$/) : null;
        var mCode = (!mBold && !mItalic && !mStrike && !mMark) ? textBeforeCaret.match(/`([^`\n]+)`$/) : null;

        var matchObj = mBold ? { tag: 'strong', text: mBold[1], fullLen: mBold[0].length } :
          (mItalic ? { tag: 'em', text: mItalic[1], fullLen: mItalic[1].length + 2 } :
          (mStrike ? { tag: 'del', text: mStrike[1], fullLen: mStrike[0].length } :
          (mMark ? { tag: 'mark', text: mMark[1], fullLen: mMark[0].length, style: 'background:#fef08a;padding:0 2px;' } :
          (mCode ? { tag: 'code', text: mCode[1], fullLen: mCode[0].length } : null))));

        if (matchObj) {
          e.preventDefault();
          var startPos = caretOffset - matchObj.fullLen;
          var range = sel.getRangeAt(0);
          range.setStart(sel.anchorNode, startPos);
          range.setEnd(sel.anchorNode, caretOffset);
          range.deleteContents();

          var el = document.createElement(matchObj.tag);
          el.textContent = matchObj.text;
          if (matchObj.style) el.setAttribute('style', matchObj.style);
          range.insertNode(el);

          var spaceNode = document.createTextNode(' ');
          range.setStartAfter(el);
          range.insertNode(spaceNode);
          range.setStartAfter(spaceNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);

          window.tcOnSubitemWysiwygInput(targetId);
        }
      }
    } catch (keyErr) {
      // Ignore keystroke parser error
    }
  }
};

window.tcDuplicateSubItem = function (exId, arrayProp, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !Array.isArray(ex.content[arrayProp])) return;
  var source = ex.content[arrayProp][idx];
  if (source) {
    var dup = JSON.parse(JSON.stringify(source));
    dup.id = TestCreatorService.createEmptyExercise('cloze').id;
    if (dup.prompt) dup.prompt = (dup.prompt || '') + ' (Copy)';
    if (dup.label) dup.label = (dup.label || '') + ' (Copy)';
    ex.content[arrayProp].splice(idx + 1, 0, dup);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
    tcOnDirty();
  }
};

